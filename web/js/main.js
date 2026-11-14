// Application bootstrap: state, rendering pipeline, actions and export flows.

import { h, downloadBlob, clamp } from './util.js';
import { createProject, normalizeProject, newCategory, newEntry, newPage, getText } from './model.js';
import { createStore } from './store.js';
import { buildExport, buildLangFile, serializeBook, serializeCategory, serializeEntry } from './serialize.js';
import { validateProject, countBySeverity } from './validate.js';
import { buildZip } from './zip.js';
import * as io from './io.js';
import { importBookFiles } from './import.js';
import { LANGUAGE_OPTIONS, LOADER_PROFILES, PROFILE_IDS, getProfile, shortLang } from './profiles.js';
import { PAGE_TYPE_KEYS } from './schema.js';
import { renderTree } from './ui/tree.js';
import { renderEditor } from './ui/editor.js';
import { renderBookPreview, renderJsonPreview, previewPageCount } from './ui/preview.js';
import { toast, modal, confirmModal, promptModal, problemsModal, filesModal } from './ui/modals.js';
import { deepClone } from './util.js';

const AUTOSAVE_KEY = 'patchouli-helper:project';
const LAST_PATH_KEY = 'patchouli-helper:lastPath';

const $ = (id) => document.getElementById(id);

const store = createStore(loadInitialProject());

function loadInitialProject() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (raw) return normalizeProject(JSON.parse(raw));
  } catch (error) {
    console.warn('autosave 读取失败', error);
  }
  return createProject();
}

const autosave = () => {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(store.state.project));
  } catch {
    /* storage full: ignore */
  }
};

/* --------------------------------------------------------------- rendering */

let lastEditorKind = null;
let lastEditorSelection = '';

function render(kind = 'all') {
  if (kind === 'all' || kind === 'structure' || kind === 'selection' || kind === 'lang') {
    renderChrome();
    renderTreePanel();
    renderEditorPanel();
    renderPreviewPanel();
    return;
  }
  // field edits: keep the editor (and the focused input) alive
  renderChrome();
  renderTreePanel();
  renderPreviewPanel();
}

function selectionKey(state) {
  const { kind, id } = state.ui.selection;
  return `${kind}:${id}`;
}

function renderTreePanel() {
  renderTree($('tree'), {
    project: store.state.project,
    state: store.state,
    onSelect: (selection) => {
      store.setUi({ selection, previewPage: 0 }, 'selection');
    },
  });
  const project = store.state.project;
  $('tree-count').textContent = `${project.categories.length} 分类 / ${project.entries.length} 条目`;
}

function renderEditorPanel() {
  const state = store.state;
  const container = $('editor');
  renderEditor(container, {
    project: state.project,
    state,
    store,
    actions,
  });
  // one undo snapshot per editing focus, so Ctrl+Z restores the pre-edit state
  container.onfocusin = (event) => {
    const control = event.target.closest('input, textarea, select');
    if (!control) return;
    const field = control.closest('[data-field-key]')?.dataset.fieldKey || control.type || control.tagName;
    store.beginEdit(`${selectionKey(state)}:${field}`);
  };
  lastEditorKind = state.ui.selection.kind;
  lastEditorSelection = selectionKey(state);
}

function renderPreviewPanel() {
  const container = $('preview-body');
  container.textContent = '';
  const state = store.state;
  const ctx = {
    project: state.project,
    state,
    profile: getProfile(state.project.profileId),
    onSelect: (selection) => store.setUi({ selection, previewPage: 0 }, 'selection'),
  };
  if (state.ui.previewMode === 'json') {
    renderJsonPreview(container, ctx);
  } else {
    renderBookPreview(container, ctx);
  }

  for (const tab of document.querySelectorAll('#preview-tabs .tab')) {
    tab.classList.toggle('active', tab.dataset.preview === state.ui.previewMode);
  }
  const spreads = previewPageCount(state.project, state);
  const current = Math.min(spreads, Math.floor((state.ui.previewPage || 0) / 2) + 1);
  $('page-indicator').textContent = `${current} / ${spreads}`;
}

function renderChrome() {
  const state = store.state;
  const project = state.project;

  // language switch
  const switchEl = $('lang-switch');
  switchEl.textContent = '';
  for (const code of project.languages) {
    const option = LANGUAGE_OPTIONS.find((l) => l.code === code);
    const translated = hasTranslation(project, code);
    switchEl.appendChild(
      h(
        'button',
        {
          class: `${state.ui.lang === code ? 'active' : ''}${translated ? ' translated' : ''}`,
          title: `${option?.label || code} · 点击切换编辑语言`,
          onclick: () => store.setUi({ lang: code }, 'lang'),
        },
        h('span', { class: 'dotmark' }),
        option?.short || code,
      ),
    );
  }

  // problem badge
  const problems = validateProject(project);
  const counts = countBySeverity(problems);
  state.ui.problems = problems;
  const badge = $('problem-count');
  badge.textContent = String(counts.error + counts.warning);
  badge.className = `badge ${counts.error ? 'err' : counts.warning ? 'warn' : 'ok'}`;

  // status bar
  $('status-project').textContent = `${project.modid}:${project.bookId}`;
  $('status-profile').textContent = getProfile(project.profileId).label;
  const dirty = $('status-dirty');
  dirty.textContent = state.ui.dirty ? '未保存' : '已保存';
  dirty.className = state.ui.dirty ? 'dirty' : 'saved';
  $('status-lang').textContent = state.ui.lang;
  const pages = project.entries.reduce((sum, entry) => sum + (entry.pages?.length || 0), 0);
  $('status-counts').textContent = `${project.categories.length} 分类 · ${project.entries.length} 条目 · ${pages} 页`;
  $('brand-sub').textContent = project.meta?.name || '帕秋莉手册可视化编辑器';
}

function hasTranslation(project, lang) {
  const sample = project.entries.slice(0, 40);
  if (!sample.length) return true;
  return sample.some((entry) => {
    const raw = entry.data?.name;
    return typeof raw === 'object' && String(raw[lang] ?? '').trim() !== '';
  });
}

/* ----------------------------------------------------------------- actions */

const actions = {
  toast,
  refreshChrome: () => renderChrome(),
  select: (selection) => store.setUi({ selection, previewPage: 0 }, 'selection'),
  selectPageForPreview: (index) => store.setUi({ previewPage: index, previewMode: 'book' }, 'preview'),
  addEntry: (categoryId) => {
    const project = store.state.project;
    const existing = new Set(project.entries.map((entry) => entry.id));
    let id = `${categoryId}/new_entry`;
    let i = 2;
    while (existing.has(id)) id = `${categoryId}/new_entry_${i++}`;
    const entry = newEntry(id, categoryId, {
      name: { en_us: 'New Entry', [project.primaryLanguage]: '新条目' },
      icon: 'minecraft:paper',
    });
    entry.pages.push(newPage('patchouli:text', { text: { en_us: '', [project.primaryLanguage]: '' } }));
    store.apply((p) => p.entries.push(entry), { kind: 'structure' });
    store.setUi({ selection: { kind: 'entry', id }, previewPage: 0 }, 'selection');
  },
  deleteCategory: async (category) => {
    const count = store.state.project.entries.filter((entry) => entry.category === category.id).length;
    const ok = await confirmModal({
      title: '删除分类',
      message: `确定删除分类「${category.id}」吗？${count ? `它下面的 ${count} 个条目也会被删除。` : ''}`,
      confirmText: '删除',
      danger: true,
    });
    if (!ok) return;
    store.apply((p) => {
      p.categories = p.categories.filter((c) => c.id !== category.id);
      p.entries = p.entries.filter((entry) => entry.category !== category.id);
    }, { kind: 'structure' });
    store.setUi({ selection: { kind: 'book', id: null } }, 'selection');
  },
  deleteEntry: async (entry) => {
    const ok = await confirmModal({ title: '删除条目', message: `确定删除条目「${entry.id}」吗？`, confirmText: '删除', danger: true });
    if (!ok) return;
    store.apply((p) => {
      p.entries = p.entries.filter((e) => e.id !== entry.id);
    }, { kind: 'structure' });
    store.setUi({ selection: { kind: 'book', id: null } }, 'selection');
  },
  moveEntry: (entry, delta) => {
    const project = store.state.project;
    const siblings = project.entries.filter((e) => e.category === entry.category).sort((a, b) => (a.data.sortnum || 0) - (b.data.sortnum || 0));
    const index = siblings.findIndex((e) => e.id === entry.id);
    const target = siblings[index + delta];
    if (!target) return;
    store.apply(() => {
      const a = entry.data.sortnum || 0;
      const b = target.data.sortnum || 0;
      if (a === b) {
        entry.data.sortnum = a + delta;
        target.data.sortnum = b;
      } else {
        entry.data.sortnum = b;
        target.data.sortnum = a;
      }
    }, { kind: 'structure' });
  },
  movePage: (index, delta) => {
    const selection = store.state.ui.selection;
    if (selection.kind !== 'entry') return;
    store.apply((p) => {
      const entry = p.entries.find((e) => e.id === selection.id);
      const target = index + delta;
      if (!entry || target < 0 || target >= entry.pages.length) return;
      const [page] = entry.pages.splice(index, 1);
      entry.pages.splice(target, 0, page);
    }, { kind: 'structure' });
  },
  duplicatePage: (index) => {
    const selection = store.state.ui.selection;
    if (selection.kind !== 'entry') return;
    store.apply((p) => {
      const entry = p.entries.find((e) => e.id === selection.id);
      if (!entry) return;
      entry.pages.splice(index + 1, 0, deepClone(entry.pages[index]));
    }, { kind: 'structure' });
  },
  deletePage: async (index) => {
    const selection = store.state.ui.selection;
    if (selection.kind !== 'entry') return;
    store.apply((p) => {
      const entry = p.entries.find((e) => e.id === selection.id);
      entry?.pages.splice(index, 1);
    }, { kind: 'structure' });
  },
  addAsset: async () => {
    if (io.isDesktop()) {
      const file = await io.pickFile({ title: '选择图片（PNG）', filters: [{ name: 'PNG 图片', extensions: ['png'] }] });
      if (!file) return;
      const suggested = `${store.state.project.modid}:textures/gui/entries/${io.splitPath(file).name}`;
      const resPath = await promptModal({ title: '资源路径', label: '导出时写入 assets/<命名空间>/… 的路径（必须带 textures/）', value: suggested });
      if (!resPath) return;
      const base64 = await io.readBase64File(file);
      store.apply((p) => {
        p.assets = p.assets.filter((asset) => asset.path !== resPath);
        p.assets.push({ path: resPath, base64 });
      }, { kind: 'structure' });
      toast('已加入工程资源', 'ok');
      return;
    }
    // browser fallback
    const input = h('input', { type: 'file', accept: 'image/png' });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const buffer = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let i = 0; i < buffer.length; i += 0x8000) binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
      const suggested = `${store.state.project.modid}:textures/gui/entries/${file.name}`;
      const resPath = await promptModal({ title: '资源路径', label: '导出时写入 assets/<命名空间>/… 的路径', value: suggested });
      if (!resPath) return;
      store.apply((p) => p.assets.push({ path: resPath, base64: btoa(binary) }), { kind: 'structure' });
      toast('已加入工程资源', 'ok');
    });
    input.click();
  },
  exportWholeBook: () => exportWholeBookModal(),
};

/* -------------------------------------------------------------- export core */

const zipEntries = (files) =>
  files.map((file) => ({ path: file.path, data: file.base64 ? io.decodeBase64(file.data) : file.data }));

function readmeText(project, { folder = true } = {}) {
  const profile = getProfile(project.profileId);
  const bookId = `${project.modid}:${project.bookId}`;
  return [
    `# ${project.meta?.name || project.bookId} — Patchouli 手册导出包`,
    '',
    `目标版本：${profile.label}（资源包 pack_format ${profile.resourcePackFormat}，数据包 pack_format ${profile.dataPackFormat}）`,
    `书 id：${bookId}`,
    '',
    '## 为什么有两个包？',
    'Patchouli 的书声明 book.json 位于 **data/** 侧，资源包只能提供 assets/** 内容。',
    '所以「新增一本新书」必须同时安装：',
    '',
    '1. resourcepack（资源包）→ 放进 .minecraft/resourcepacks/，在「选项 → 资源包」里启用；',
    '2. datapack（数据包）→ 放进存档的 datapacks/ 目录（或全局世界数据包目录），用 /datapack list 确认已启用。',
    '',
    '只覆盖别人模组里已有的书时，只需要资源包。',
    '',
    '## 获取这本书',
    `- 命令：${profile.giveSyntax.replace('%book%', bookId)}`,
    `- 直接打开：${profile.openCommand.replace('%book%', bookId)}（需要权限等级 2）`,
    `- 创造模式：把 book.json 里的 creative_tab 设成 minecraft:tools_and_utilities 之类的标签页`,
    '',
    '## 目录结构',
    'resourcepack/',
    '  pack.mcmeta',
    '  assets/<modid>/patchouli_books/<book>/<lang>/{categories,entries}/…',
    '  assets/<modid>/lang/<lang>.json        （仅 i18n / lang key 模式）',
    'datapack/',
    '  pack.mcmeta',
    '  data/<modid>/patchouli_books/<book>/book.json',
    '',
  ].join('\n');
}

async function exportResourcePackZip() {
  const project = store.state.project;
  const plan = buildExport(project, { mode: 'resourcepack' });
  const baseName = `${project.modid}-${project.bookId}`;
  const resourceZip = await buildZip(zipEntries(plan.resourcePackFiles));
  const dataZip = await buildZip(zipEntries(plan.dataPackFiles));

  io.downloadBytes(resourceZip, `${baseName}-resourcepack.zip`);
  io.downloadBytes(dataZip, `${baseName}-datapack.zip`);
  io.downloadBytes(readmeText(project), `${baseName}-INSTALL.txt`, 'text/plain');
  toast('已下载资源包、数据包与安装说明', 'ok', 4200);
}

async function exportWholeBookModal() {
  const project = store.state.project;
  const plan = buildExport(project, { mode: 'mod' });
  filesModal({
    title: '整书导出内容',
    files: plan.files.map((file) => ({ path: file.path, data: file.base64 ? '（二进制图片）' : file.data })),
    note: `共 ${plan.files.length} 个文件；这是整本书会生成的全部 JSON 与资源文件。`,
  });
}

async function exportCurrentJson() {
  const state = store.state;
  const project = state.project;
  const i18nKeys = project.localization === 'keys' || Boolean(project.book?.i18n);
  let data;
  if (state.ui.selection.kind === 'entry') {
    const entry = project.entries.find((e) => e.id === state.ui.selection.id);
    if (!entry) return;
    data = serializeEntry(project, entry, state.ui.lang, { i18nKeys });
  } else if (state.ui.selection.kind === 'category') {
    const category = project.categories.find((c) => c.id === state.ui.selection.id);
    if (!category) return;
    data = serializeCategory(project, category, state.ui.lang, { i18nKeys });
  } else {
    data = serializeBook(project, project.primaryLanguage, { i18nKeys });
  }
  const text = JSON.stringify(data, null, 2);
  await navigator.clipboard?.writeText(text).catch(() => {});
  filesModal({ title: '当前 JSON（已复制到剪贴板）', files: [{ path: state.ui.selection.kind, data: text }] });
}

/* -------------------------------------------------------------- import/save */

async function importFromDisk() {
  let files = [];
  if (io.isDesktop()) {
    const dir = await io.pickFolder({ title: '选择包含 assets/ 或 data/ 的目录（模组资源目录、资源包或存档数据包）' });
    if (!dir) return;
    const list = await io.listFiles(dir);
    for (const relPath of list) {
      if (!/\.(json|mcmeta)$/i.test(relPath)) continue;
      files.push({ path: relPath, data: await io.readTextFile(`${dir}/${relPath}`) });
    }
  } else {
    const input = h('input', { type: 'file', webkitdirectory: 'true', multiple: 'true' });
    const picked = await new Promise((resolve) => {
      input.addEventListener('change', () => resolve(input.files));
      input.click();
    });
    if (!picked?.length) return;
    const read = await io.readBrowserFolder(picked);
    files = read.filter((file) => /\.json$/i.test(file.path));
  }

  const { project, warnings } = importBookFiles(files, { profileId: store.state.project.profileId });
  if (!project) {
    toast(warnings[0] || '导入失败', 'err', 5000);
    return;
  }
  const ok = await confirmModal({
    title: '导入书籍',
    message: h('div', {},
      h('p', {}, `识别到书：${project.modid}:${project.bookId}`),
      h('p', {}, `分类 ${project.categories.length} 个，条目 ${project.entries.length} 个，语言 ${project.languages.join(', ')}`),
      warnings.length ? h('ul', {}, ...warnings.map((w) => h('li', { class: 'faint' }, w))) : null,
      h('p', { class: 'faint' }, '当前工程会被替换（可用 Ctrl+Z 撤销）。'),
    ),
    confirmText: '导入',
  });
  if (!ok) return;
  store.replaceProject(project);
  toast('导入完成', 'ok');
}

async function saveProject() {
  const project = store.state.project;
  const text = JSON.stringify(project, null, 2);
  const baseName = `${project.modid}-${project.bookId}.phbook`;
  if (!io.isDesktop()) {
    downloadBlob(text, baseName, 'application/json');
    store.markSaved();
    toast('已下载工程文件', 'ok');
    return;
  }
  const target = await io.pickSaveFile({
    title: '保存工程',
    defaultPath: baseName,
    filters: [{ name: 'Patchouli Helper 工程', extensions: ['phbook', 'json'] }],
  });
  if (!target) return;
  await io.writeTextFile(target, text);
  store.markSaved(target);
  localStorage.setItem(LAST_PATH_KEY, target);
  toast('工程已保存', 'ok');
}

async function openProject() {
  if (!io.isDesktop()) {
    const input = h('input', { type: 'file', accept: '.phbook,.json' });
    const file = await new Promise((resolve) => {
      input.addEventListener('change', () => resolve(input.files?.[0] || null));
      input.click();
    });
    if (!file) return;
    store.replaceProject(normalizeProject(JSON.parse(await file.text())));
    toast('工程已载入', 'ok');
    return;
  }
  const file = await io.pickFile({
    title: '打开工程',
    filters: [{ name: 'Patchouli Helper 工程', extensions: ['phbook', 'json'] }],
  });
  if (!file) return;
  try {
    const text = await io.readTextFile(file);
    store.replaceProject(normalizeProject(JSON.parse(text)), { savedPath: file });
    localStorage.setItem(LAST_PATH_KEY, file);
    toast('工程已载入', 'ok');
  } catch (error) {
    toast(`打开失败：${error.message || error}`, 'err');
  }
}

function newProjectDialog() {
  const modid = h('input', { type: 'text', placeholder: 'mymod' });
  modid.value = 'mymod';
  const bookId = h('input', { type: 'text', placeholder: 'guide' });
  bookId.value = 'guide';
  const profile = h('select', {});
  for (const id of PROFILE_IDS) profile.appendChild(h('option', { value: id }, LOADER_PROFILES[id].label));
  const withZh = h('input', { type: 'checkbox', checked: true });
  const body = h('div', {},
    h('div', { class: 'field' }, h('label', {}, '模组 ID'), modid),
    h('div', { class: 'field' }, h('label', {}, '书 ID'), bookId),
    h('div', { class: 'field' }, h('label', {}, '目标版本'), profile),
    h('label', { class: 'switch' }, withZh, h('span', { class: 'track' }), h('span', {}, '同时创建简体中文内容')),
  );
  const footer = [
    h('button', { class: 'btn', type: 'button', onclick: () => instance.close() }, '取消'),
    h(
      'button',
      {
        class: 'btn primary',
        type: 'button',
        onclick: () => {
          const project = createProject();
          project.modid = modid.value.trim() || 'mymod';
          project.bookId = bookId.value.trim() || 'guide';
          project.profileId = profile.value;
          project.languages = withZh.checked ? ['en_us', 'zh_cn'] : ['en_us'];
          project.primaryLanguage = 'en_us';
          project.meta.name = `${project.modid} 手册`;
          instance.close();
          store.replaceProject(project);
          toast('已创建新工程', 'ok');
        },
      },
      '创建',
    ),
  ];
  const instance = modal({ title: '新建书籍工程', body, footer });
}

function problemsDialog() {
  const problems = validateProject(store.state.project);
  problemsModal({
    problems,
    onJump: (target) => {
      store.setUi({
        selection: { kind: target.kind, id: target.id ?? null },
        previewPage: (target.pageIndex ?? 0) * 1,
      }, 'selection');
    },
  });
}

/* ------------------------------------------------------------------- events */

document.addEventListener('click', (event) => {
  const origin = event.target instanceof Element ? event.target : null;
  const target = origin?.closest('[data-action]');
  if (!target) {
    document.querySelectorAll('.dropdown.open').forEach((el) => {
      if (!origin?.closest('.dropdown')) el.classList.remove('open');
    });
    return;
  }
  // menu entries close their dropdown once used
  if (origin?.closest('.dropdown-menu')) {
    document.querySelectorAll('.dropdown.open').forEach((el) => el.classList.remove('open'));
  }
  const action = target.dataset.action;
  switch (action) {
    case 'new-project': newProjectDialog(); break;
    case 'open-project': openProject(); break;
    case 'save-project': saveProject(); break;
    case 'import-book': importFromDisk(); break;
    case 'validate': problemsDialog(); break;
    case 'toggle-export': target.closest('.dropdown')?.classList.toggle('open'); break;
    case 'export-resourcepack': exportResourcePackZip(); break;
    case 'export-json': exportCurrentJson(); break;
    case 'export-snapshot': exportWholeBookModal(); break;
    case 'add-category': {
      const project = store.state.project;
      let i = 1;
      let id = 'new_category';
      while (project.categories.some((c) => c.id === id)) id = `new_category_${i++}`;
      const category = newCategory(id, { name: { en_us: 'New Category', [project.primaryLanguage]: '新分类' } });
      store.apply((p) => p.categories.push(category), { kind: 'structure' });
      store.setUi({ selection: { kind: 'category', id } }, 'selection');
      break;
    }
    case 'add-entry': {
      const project = store.state.project;
      const categoryId = store.state.ui.selection.kind === 'category'
        ? store.state.ui.selection.id
        : project.categories[0]?.id;
      if (!categoryId) {
        toast('先创建一个分类', 'err');
        break;
      }
      actions.addEntry(categoryId);
      break;
    }
    case 'preview-prev': {
      const next = Math.max(0, (store.state.ui.previewPage || 0) - 2);
      store.setUi({ previewPage: next, previewMode: 'book' }, 'preview');
      break;
    }
    case 'preview-next': {
      const spreads = previewPageCount(store.state.project, store.state);
      const next = Math.min((spreads - 1) * 2, (store.state.ui.previewPage || 0) + 2);
      store.setUi({ previewPage: next, previewMode: 'book' }, 'preview');
      break;
    }
    case 'preview-zoom': store.setUi({ zoom: !store.state.ui.zoom }, 'preview'); break;
    default: break;
  }
});

document.addEventListener('click', (event) => {
  const tab = event.target.closest('#preview-tabs .tab');
  if (!tab) return;
  store.setUi({ previewMode: tab.dataset.preview }, 'preview');
});

document.addEventListener('keydown', (event) => {
  const mod = event.ctrlKey || event.metaKey;
  if (mod && event.key.toLowerCase() === 's') {
    event.preventDefault();
    saveProject();
    return;
  }
  if (mod && event.key.toLowerCase() === 'z' && !event.shiftKey) {
    const active = document.activeElement;
    if (active && /INPUT|TEXTAREA/.test(active.tagName)) return;
    event.preventDefault();
    if (store.undo()) toast('已撤销', 'info', 1200);
    return;
  }
  if (mod && (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))) {
    event.preventDefault();
    if (store.redo()) toast('已重做', 'info', 1200);
    return;
  }
  if (mod && event.key.toLowerCase() === 'e') {
    event.preventDefault();
    exportResourcePackZip();
  }
});

/* ------------------------------------------------------------ column splitting */

const LAYOUT_KEY = 'patchouli-helper:layout';

function setupSplitters() {
  const layout = document.querySelector('.layout');
  if (!layout) return;

  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
    } catch {
      return {};
    }
  })();
  if (saved.sidebar) layout.style.setProperty('--sidebar-w', `${saved.sidebar}px`);
  if (saved.preview) layout.style.setProperty('--preview-w', `${saved.preview}px`);

  const persist = () => {
    const sidebar = parseFloat(getComputedStyle(layout).getPropertyValue('--sidebar-w')) || 272;
    const previewRaw = getComputedStyle(layout).getPropertyValue('--preview-w').trim();
    const preview = previewRaw.endsWith('%')
      ? previewRaw
      : `${Math.round(parseFloat(previewRaw) || 0)}px`;
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify({ sidebar: Math.round(sidebar), preview }));
    } catch {
      /* ignore */
    }
  };

  for (const splitter of document.querySelectorAll('.splitter')) {
    const mode = splitter.dataset.split;

    splitter.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      splitter.setPointerCapture(event.pointerId);
      splitter.classList.add('dragging');
      document.body.classList.add('col-resizing');
    });

    splitter.addEventListener('pointermove', (event) => {
      if (!splitter.classList.contains('dragging')) return;
      const rect = layout.getBoundingClientRect();
      if (mode === 'sidebar') {
        const width = clamp(event.clientX - rect.left, 180, Math.min(480, rect.width * 0.4));
        layout.style.setProperty('--sidebar-w', `${Math.round(width)}px`);
      } else {
        const width = clamp(rect.right - event.clientX, 220, Math.max(260, rect.width * 0.72));
        layout.style.setProperty('--preview-w', `${Math.round(width)}px`);
      }
    });

    const finish = () => {
      if (!splitter.classList.contains('dragging')) return;
      splitter.classList.remove('dragging');
      document.body.classList.remove('col-resizing');
      persist();
    };
    splitter.addEventListener('pointerup', finish);
    splitter.addEventListener('pointercancel', finish);

    splitter.addEventListener('dblclick', () => {
      layout.style.removeProperty('--sidebar-w');
      layout.style.removeProperty('--preview-w');
      localStorage.removeItem(LAYOUT_KEY);
      toast('分栏已复位', 'info', 1400);
    });
  }

  // keep columns usable when the window is resized very small
  window.addEventListener('resize', () => {
    const rect = layout.getBoundingClientRect();
    const sidebar = parseFloat(getComputedStyle(layout).getPropertyValue('--sidebar-w')) || 272;
    if (sidebar > rect.width * 0.45) layout.style.setProperty('--sidebar-w', '200px');
  });
}

/* --------------------------------------------------------------------- boot */

store.subscribe((state, kind) => {
  render(kind);
  if (kind !== 'status') autosave();
});

// drag & drop a .phbook file onto the window
window.addEventListener('dragover', (event) => {
  event.preventDefault();
});
window.addEventListener('drop', async (event) => {
  event.preventDefault();
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  if (!/\.(phbook|json)$/i.test(file.name)) {
    toast('只支持拖入 .phbook 工程文件', 'err');
    return;
  }
  try {
    store.replaceProject(normalizeProject(JSON.parse(await file.text())));
    toast('工程已载入', 'ok');
  } catch (error) {
    toast(`载入失败：${error.message}`, 'err');
  }
});

setupSplitters();
render('all');

// expose for debugging in the webview console (and for scripts/app-check.mjs)
globalThis.__PATCHOULI_HELPER__ = {
  store,
  actions,
  buildExport,
  buildLangFile,
  buildZip,
  getText,
  io,
  pageTypes: PAGE_TYPE_KEYS,
  newPage,
};

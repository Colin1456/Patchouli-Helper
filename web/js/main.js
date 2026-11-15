// Application bootstrap: state, rendering pipeline, actions and export flows.

import { h, downloadBlob, clamp, bytesToBase64 } from './util.js';
import {
  createProject,
  normalizeProject,
  newCategory,
  newEntry,
  newPage,
  getText,
  isTranslatedFor,
  textSlots,
} from './model.js';
import { createStore } from './store.js';
import {
  buildExport,
  buildLangFile,
  serializeBook,
  serializeCategory,
  serializeEntry,
  langKeySlots,
  categoryHasText,
  entryHasText,
  categoryFileName,
  entryFileName,
} from './serialize.js';
import { validateProject, countBySeverity } from './validate.js';
import { buildZip } from './zip.js';
import * as io from './io.js';
import { importBookFiles } from './import.js';
import { listZipEntries, readZipEntry, findBooks } from './zip-reader.js';
import { LANGUAGE_OPTIONS, LOADER_PROFILES, PROFILE_IDS, getProfile, shortLang } from './profiles.js';
import { PAGE_TYPE_KEYS } from './schema.js';
import { renderTree } from './ui/tree.js';
import { renderEditor } from './ui/editor.js';
import { renderBookPreview, renderJsonPreview, previewPageCount } from './ui/preview.js';
import { toast, modal, confirmModal, promptModal, problemsModal, filesModal } from './ui/modals.js';
import { deepClone } from './util.js';

const AUTOSAVE_KEY = 'patchouli-helper:project';

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
  const coverage = langCoverage(project);
  for (const code of project.languages) {
    const option = LANGUAGE_OPTIONS.find((l) => l.code === code);
    const ratio = coverage[code] || { done: 0, total: 0 };
    const percent = ratio.total ? Math.round((ratio.done / ratio.total) * 100) : 100;
    const level = percent === 100 ? 'full' : percent > 0 ? 'part' : 'none';
    switchEl.appendChild(
      h(
        'button',
        {
          class: `${state.ui.lang === code ? 'active' : ''}${level === 'full' ? ' translated' : ''}${level === 'none' ? ' blank' : ''}`,
          title:
            level === 'none'
              ? `${option?.label || code} · 还没有任何译文，编辑时会显示 en_us 回退文本`
              : `${option?.label || code} · 已翻译 ${ratio.done}/${ratio.total} 处（${percent}%）`,
          onclick: () => store.setUi({ lang: code }, 'lang'),
        },
        h('span', { class: 'dotmark' }),
        option?.short || code,
      ),
    );
  }
  // 切换语言后给一次性提示，避免「切到简中还是英文」的困惑
  const lastLang = renderChrome.__lastLang;
  if (lastLang && lastLang !== state.ui.lang) {
    const ratio = coverage[state.ui.lang] || { done: 0, total: 0 };
    const label = LANGUAGE_OPTIONS.find((l) => l.code === state.ui.lang)?.label || state.ui.lang;
    if (!ratio.done) {
      toast(`${label} 还没有译文，先显示 en_us 的回退文本；输入后即保存为 ${state.ui.lang}`, 'warn');
    } else if (ratio.done < ratio.total) {
      toast(`${label} 已翻译 ${ratio.done}/${ratio.total} 处，其余显示回退文本`, 'warn');
    }
  }
  renderChrome.__lastLang = state.ui.lang;
  renderI18nNotice(project, coverage);

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
  const currentRatio = coverage[state.ui.lang];
  $('status-lang').textContent =
    currentRatio && currentRatio.total
      ? `${state.ui.lang} ${Math.round((currentRatio.done / currentRatio.total) * 100)}%`
      : state.ui.lang;
  const pages = project.entries.reduce((sum, entry) => sum + (entry.pages?.length || 0), 0);
  $('status-counts').textContent = `${project.categories.length} 分类 · ${project.entries.length} 条目 · ${pages} 页`;
  const buildEl = $('status-build');
  if (buildEl) buildEl.textContent = globalThis.__BUILD__ ? `build ${globalThis.__BUILD__}` : 'dev';
  const versionEl = $('brand-version');
  if (versionEl) versionEl.textContent = `v${globalThis.__VERSION__ || 'dev'}`;
  const viewportEl = $('status-viewport');
  if (viewportEl) viewportEl.textContent = `${Math.round(window.innerWidth)}×${Math.round(window.innerHeight)}`;
  $('brand-sub').textContent = project.meta?.name || '帕秋莉手册可视化编辑器';
}

/**
 * 每种语言的真实译文覆盖率。以前用 getText() 取样判断，而 getText 会回退到 en_us，
 * 于是「切到简中还是英文」时界面给不出任何提示。这里改用 isTranslatedFor 逐槽统计。
 */
function isKeyMode(project) {
  return project.localization === 'keys' || Boolean(project.book?.i18n);
}

/**
 * 每种语言的翻译完成度。
 *
 * 关键点：Patchouli 的回退粒度是「整份文件」——zh_cn 里缺某个条目就整份用 en_us，
 * 而 book.json 只有一个、书名/首页文本按语言无关。所以按「字段槽位」算覆盖率会
 * 冤枉用户（标题留空、book.json 里的书名都算缺翻译），数字对不上「我明明都翻好了」。
 * 这里改成按 /导出时会真的生成哪个文件/ 来统计，与 serializeContent 的判定完全一致。
 */
function langCoverage(project) {
  const result = {};
  const base = 'en_us';
  const keyMode = isKeyMode(project);
  for (const code of project.languages) {
    result[code] = { done: 0, total: 0, missing: [], mode: keyMode ? 'keys' : 'files' };
  }

  if (keyMode) {
    // i18n lang key 模式：每一条 lang key 就是一行译文，按槽位统计（书名也算）
    const slots = [...langKeySlots(project)];
    for (const slot of slots) {
      const rawBase = slot.holder?.[slot.field];
      const baseText = typeof rawBase === 'string' ? rawBase : String(rawBase?.[base] ?? '');
      if (!String(baseText).trim()) continue; // 基准语言本来就没写的，不算缺翻译
      for (const code of project.languages) {
        if (code === base) continue;
        result[code].total += 1;
        if (isTranslatedFor(rawBase, code)) result[code].done += 1;
        else result[code].missing.push({ label: slot.label, where: slot.key, target: null });
      }
    }
  } else {
    // 文件夹模式：统计「会生成几个 zh_cn 文件」……
    const items = [];
    for (const category of project.categories) {
      items.push({
        label: `分类「${category.id}」`,
        where: `assets/<modid>/patchouli_books/<book>/${'{}'}/${categoryFileName(category)}`,
        has: (lang) => categoryHasText(category, lang),
        target: { kind: 'category', id: category.id },
      });
    }
    for (const entry of project.entries) {
      items.push({
        label: `条目「${entry.id}」`,
        where: `assets/<modid>/patchouli_books/<book>/${'{}'}/${entryFileName(entry)}`,
        has: (lang) => entryHasText(entry, lang),
        target: { kind: 'entry', id: entry.id },
      });
    }
    for (const item of items) {
      if (!item.has(base)) continue; // en_us 都没内容，中文翻译无从谈起
      for (const code of project.languages) {
        if (code === base) continue;
        result[code].total += 1;
        if (item.has(code)) result[code].done += 1;
        else result[code].missing.push({ label: item.label, where: item.where.replace('{}', code), target: item.target });
      }
    }
  }

  for (const code of project.languages) {
    if (code === base) {
      const total = Math.max(result[code].total, 0);
      result[code] = { done: total || 1, total: total || 1, missing: [], mode: result[code].mode };
    }
  }
  return result;
}

function missingDetailModal(project, coverage, lang) {
  const ratio = coverage[lang] || { done: 0, total: 0, missing: [] };
  const label = LANGUAGE_OPTIONS.find((l) => l.code === lang)?.label || lang;
  const problems = (ratio.missing || []).map((item) => ({
    severity: 'warning',
    message: `${item.label} 在 ${lang} 里没有内容`,
    where: item.where,
    target: item.target || undefined,
  }));
  const note =
    (ratio.mode === 'keys'
      ? `${label}：已翻译 ${ratio.done}/${ratio.total || 0} 条 lang key，下面列出还没写的键。`
      : `${label}：${ratio.done}/${ratio.total || 0} 个分类/条目有译文。Patchouli 的回退粒度是整份文件，下面这些条目在游戏里会整份显示 en_us。`) +
    ' 点一条可以直接跳过去编辑。';
  return problemsModal({
    problems,
    note,
    title: `${lang} 未翻译清单（${problems.length}）`,
    onJump: (target) => store.setUi({ selection: target, previewPage: 0 }, 'selection'),
  });
}

function renderI18nNotice(project, coverage) {
  const host = document.querySelector('.layout') || $('app');
  let bar = document.getElementById('i18n-notice');
  const lang = store.state.ui.lang;
  const base = 'en_us';
  const ratio = coverage[lang] || { done: 0, total: 0 };
  const label = LANGUAGE_OPTIONS.find((l) => l.code === lang)?.label || lang;
  const percent = ratio.total ? Math.round((ratio.done / ratio.total) * 100) : 100;

  if (!ratio.total || percent === 100) {
    if (bar) bar.remove();
    return;
  }
  if (!bar) {
    bar = h('div', { class: 'compat-bar notice-bar', id: 'i18n-notice' });
    host.prepend(bar);
  }
  bar.textContent = '';
  bar.appendChild(h('strong', {}, `🌐 ${label}（${lang}）`));
  bar.appendChild(
    document.createTextNode(
      ratio.done === 0
        ? ` 还没有译文，下面显示的是 ${base} 的回退文本；改动会保存到 ${lang}，不会动 ${base}。`
        : ratio.mode === 'keys'
          ? ` 已翻译 ${ratio.done}/${ratio.total} 条 lang key（${percent}%），其余回退 ${base}。`
          : ` ${ratio.done}/${ratio.total} 个分类/条目有译文（${percent}%），标「未译」的在游戏里会整份回退 ${base}。`,
    ),
  );
  const missingCount = (ratio.missing || []).length;
  if (missingCount) {
    bar.appendChild(
      h(
        'button',
        {
          class: 'btn tiny',
          type: 'button',
          onclick: () => missingDetailModal(project, coverage, lang),
        },
        `查看明细（${missingCount}）`,
      ),
    );
  }
  bar.appendChild(
    h(
      'button',
      {
        class: 'btn tiny',
        type: 'button',
        onclick: () => bar.remove(),
      },
      '知道了',
    ),
  );
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
    const file = await io.pickBrowserFile({ accept: 'image/png' });
    if (!file) return;
    const suggested = `${store.state.project.modid}:textures/gui/entries/${file.name}`;
    const resPath = await promptModal({
      title: '资源路径',
      label: '导出时写入 assets/<命名空间>/… 的路径（必须带 textures/）',
      value: suggested,
    });
    if (!resPath) return;
    const base64 = await io.readFileBase64(file);
    store.apply((p) => {
      p.assets = (p.assets || []).filter((asset) => asset.path !== resPath);
      p.assets.push({ path: resPath, base64 });
    }, { kind: 'structure' });
    toast('已加入工程资源', 'ok');
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
  const picked = await io.pickBrowserFolder();
  if (!picked.length) return;
  const read = await io.readBrowserFolder(picked);
  const files = read.filter((file) => /\.(json|mcmeta)$/i.test(file.path));
  await applyImportedFiles(files);
}

/** 从 .jar / .zip（模组 jar、资源包、数据包）一键导入。 */
async function importFromJar() {
  const file = await io.pickBrowserFile({ accept: '.jar,.zip' });
  if (!file) return;
  toast(`正在读取 ${file.name} …`, 'info', 1800);

  let entries;
  let bytes;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
    entries = listZipEntries(bytes);
  } catch (error) {
    toast(`读取失败：${error.message || error}`, 'err', 5000);
    return;
  }

  const books = findBooks(entries);
  if (!books.length) {
    toast('这个 jar / zip 里没有 patchouli_books，不是 Patchouli 书籍', 'err', 5000);
    return;
  }
  const chosen = books.length === 1 ? books[0] : await chooseBookFromJar(books);
  if (!chosen) return;

  const prefix = new RegExp(
    `(^|/)(assets|data)/${escapeRegExp(chosen.modid)}/patchouli_books/${escapeRegExp(chosen.bookId)}/`,
  );
  const files = [];
  for (const entry of entries) {
    if (entry.name.endsWith('/')) continue;
    if (!prefix.test(entry.name)) continue;
    const isJson = /\.(json|mcmeta)$/i.test(entry.name);
    const isImage = /\/textures\/.+\.(png|jpe?g)$/i.test(entry.name);
    if (!isJson && !isImage) continue;
    try {
      const data = await readZipEntry(bytes, entry);
      files.push(
        isJson
          ? { path: entry.name, data: new TextDecoder('utf-8').decode(data) }
          : { path: entry.name, data: bytesToBase64(data), base64: true },
      );
    } catch (error) {
      console.warn('[import-jar] 跳过', entry.name, error);
    }
  }

  await applyImportedFiles(files);
}

const escapeRegExp = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function chooseBookFromJar(books) {
  return new Promise((resolve) => {
    const list = h('div', { class: 'problem-list' });
    for (const book of books) {
      list.appendChild(
        h(
          'div',
          {
            class: 'problem',
            onclick: () => {
              instance.close();
              resolve(book);
            },
          },
          h('span', { class: 'sev' }),
          h('div', { class: 'grow' }, h('div', {}, `${book.modid}:${book.bookId}`), h('div', { class: 'where' }, '点击导入这本')),
        ),
      );
    }
    const instance = modal({
      title: `这个包里有 ${books.length} 本书，选一本`,
      body: list,
      footer: [h('button', { class: 'btn', type: 'button', onclick: () => { instance.close(); resolve(null); } }, '取消')],
    });
  });
}

async function applyImportedFiles(files) {
  const { project, warnings } = importBookFiles(files, { profileId: store.state.project.profileId });
  if (!project) {
    toast(warnings[0] || '导入失败', 'err', 5000);
    return;
  }
  const imageCount = (project.assets || []).length;
  const ok = await confirmModal({
    title: '导入书籍',
    message: h('div', {},
      h('p', {}, `识别到书：${project.modid}:${project.bookId}`),
      h('p', {}, `分类 ${project.categories.length} 个，条目 ${project.entries.length} 个，语言 ${project.languages.join(', ')}`),
      imageCount ? h('p', {}, `图片资源 ${imageCount} 个（已一并导入）`) : null,
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
  downloadBlob(text, baseName, 'application/json');
  store.markSaved();
  toast('已下载工程文件', 'ok');
}

async function openProject() {
  const file = await io.pickBrowserFile({ accept: '.phbook,.json' });
  if (!file) return;
  try {
    store.replaceProject(normalizeProject(JSON.parse(await file.text())));
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

/* ------------------------------------------------------------ 下拉菜单定位 */

/**
 * 顶栏有 overflow-x + backdrop-filter，二者都会把 position:fixed 的子元素
 * 拽回顶栏自己的坐标系（只露出半条菜单）。所以打开时把菜单搬到 body 下，
 * 变成真正的视口级浮层，再按触发按钮的位置摆好。
 */
function openDropdown(dropdown) {
  const trigger = dropdown.querySelector('[data-action^="toggle-"]');
  const menu = dropdown.querySelector('.dropdown-menu');
  if (!trigger || !menu) return;
  if (menu.parentElement !== document.body) document.body.appendChild(menu);
  menu.__trigger = trigger;
  menu.classList.add('open');
  positionMenu(trigger, menu);
}

function positionMenu(trigger, menu) {
  const rect = trigger.getBoundingClientRect();
  const width = menu.offsetWidth || 240;
  const height = menu.offsetHeight || 0;
  const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
  let top = rect.bottom + 6;
  if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6);
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
}

function closeDropdowns() {
  document.querySelectorAll('.dropdown-menu.open').forEach((menu) => menu.classList.remove('open'));
  document.querySelectorAll('.dropdown.open').forEach((el) => el.classList.remove('open'));
}

/* ------------------------------------------------------------------- events */


document.addEventListener('click', (event) => {
  const origin = event.target instanceof Element ? event.target : null;
  const target = origin?.closest('[data-action]');
  if (!target) {
    if (!origin?.closest('.dropdown')) closeDropdowns();
    return;
  }
  // menu entries close their dropdown once used
  if (origin?.closest('.dropdown-menu')) closeDropdowns();
  const action = target.dataset.action;
  switch (action) {
    case 'new-project': newProjectDialog(); break;
    case 'open-project': openProject(); break;
    case 'save-project': saveProject(); break;
    case 'import-book': importFromDisk(); break;
    case 'import-jar': importFromJar(); break;
    case 'validate': problemsDialog(); break;
    case 'toggle-export':
    case 'toggle-import': {
      const dropdown = target.closest('.dropdown');
      if (!dropdown) break;
      const trigger = dropdown.querySelector('[data-action^="toggle-"]');
      const menu = dropdown.querySelector('.dropdown-menu');
      const willOpen = !(menu && menu.classList.contains('open'));
      closeDropdowns();
      if (willOpen) {
        dropdown.classList.add('open');
        openDropdown(dropdown);
      }
      break;
    }
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
        const width = clamp(event.clientX - rect.left, 150, Math.min(420, rect.width * 0.4));
        layout.style.setProperty('--sidebar-w', `${Math.round(width)}px`);
      } else {
        const width = clamp(rect.right - event.clientX, 180, Math.max(220, rect.width * 0.72));
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

  // 窗口过窄时靠 .layout 的横向滚动兜底，不改用户拖出来的列宽
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

/* ------------------------------------------------------- 兼容性自检提示 */

function checkBrowserSupport() {
  const supports = (prop, value) => Boolean(globalThis.CSS?.supports?.(prop, value));
  const missing = [];
  if (!supports('display', 'grid')) missing.push('CSS Grid');
  if (!supports('aspect-ratio', '1 / 1')) missing.push('aspect-ratio');
  if (!supports('width', 'clamp(1px, 2vw, 3px)')) missing.push('clamp()');
  if (!missing.length) return;

  const bar = h(
    'div',
    { class: 'compat-bar' },
    h('strong', {}, '⚠️ 浏览器内核较旧'),
    ` 缺少 ${missing.join(' / ')}，界面可能被排成竖排或比例异常。建议用最新版 Edge / Chrome 打开这个文件。`,
    h(
      'button',
      {
        class: 'btn tiny',
        type: 'button',
        onclick: () => bar.remove(),
      },
      '知道了',
    ),
  );
  $('app').prepend(bar);
  console.warn('[patchouli-helper] 缺少特性:', missing, '| UA:', navigator.userAgent);
}

checkBrowserSupport();
setupSplitters();
window.addEventListener('resize', () => {
  document.querySelectorAll('.dropdown-menu.open').forEach((menu) => {
    if (menu.__trigger) positionMenu(menu.__trigger, menu);
  });
  const el = $('status-viewport');
  if (el) el.textContent = `${Math.round(window.innerWidth)}×${Math.round(window.innerHeight)}`;
});
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
  zipReader: { listZipEntries, readZipEntry, findBooks },
  importBookFiles,
  // 供诊断脚本 / 控制台使用
  langCoverage: () => langCoverage(store.state.project),
  showMissing: (lang = store.state.ui.lang) => missingDetailModal(store.state.project, langCoverage(store.state.project), lang),
};

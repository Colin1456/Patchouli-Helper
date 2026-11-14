// Center column: every editing form (book / category / entry / pages).

import { h } from '../util.js';
import { getText, newEntry, newPage, entryResourceId, categoryResourceId, sortBySortnumThenName } from '../model.js';
import { BOOK_FIELDS, CATEGORY_FIELDS, ENTRY_FIELDS, PAGE_TYPES, PAGE_TYPE_KEYS, pageFieldsOf, pageTypeInfo } from '../schema.js';
import { renderField, renderFields, itemTile } from './fields.js';
import { getProfile, LANGUAGE_OPTIONS, PROFILE_IDS, LOADER_PROFILES } from '../profiles.js';
import { stripCodes } from '../richtext.js';

const card = (title, sub, body, extra = null) =>
  h(
    'section',
    { class: 'card' },
    h('div', { class: 'card-head' }, h('h3', {}, title), sub ? h('span', { class: 'sub' }, sub) : null, extra ? h('div', { class: 'grow' }) : null, extra),
    body,
  );

const sectionTitle = (text) => h('div', { class: 'section-title' }, text);

export function renderEditor(container, ctx) {
  const { project, state } = ctx;
  container.textContent = '';
  const inner = h('div', { class: 'editor-inner' });
  container.appendChild(inner);

  const { kind, id } = state.ui.selection;
  if (kind === 'category') {
    const category = project.categories.find((c) => c.id === id);
    if (category) return renderCategoryEditor(inner, { ...ctx, category });
  }
  if (kind === 'entry') {
    const entry = project.entries.find((e) => e.id === id);
    if (entry) return renderEntryEditor(inner, { ...ctx, entry });
  }
  renderBookEditor(inner, ctx);
}

/* ------------------------------------------------------------------- book */

function renderBookEditor(inner, ctx) {
  const { project, store, state, actions } = ctx;
  const lang = state.ui.lang;

  // --- project identity ---------------------------------------------------
  const projectCard = h('div', { class: 'card-body' });

  const modidInput = h('input', { type: 'text', placeholder: 'mymod' });
  modidInput.value = project.modid;
  modidInput.addEventListener('input', () => {
    store.apply((p) => {
      p.modid = modidInput.value.trim();
    }, { kind: 'field', coalesce: 'modid' });
  });

  const bookIdInput = h('input', { type: 'text', placeholder: 'guide' });
  bookIdInput.value = project.bookId;
  bookIdInput.addEventListener('input', () => {
    store.apply((p) => {
      p.bookId = bookIdInput.value.trim();
    }, { kind: 'field', coalesce: 'bookid' });
  });

  const profileSelect = h('select', {});
  for (const id of PROFILE_IDS) {
    const option = h('option', { value: id }, LOADER_PROFILES[id].label);
    option.selected = project.profileId === id;
    profileSelect.appendChild(option);
  }
  profileSelect.addEventListener('change', () => {
    store.apply((p) => {
      p.profileId = profileSelect.value;
    }, { kind: 'structure' });
    actions.toast(`已切换到 ${LOADER_PROFILES[profileSelect.value].label}`, 'ok');
  });

  const nameInput = h('input', { type: 'text' });
  nameInput.value = project.meta?.name || '';
  nameInput.addEventListener('input', () => {
    store.apply((p) => {
      p.meta.name = nameInput.value;
    }, { kind: 'field', coalesce: 'metaname' });
  });

  projectCard.append(
    h(
      'div',
      { class: 'field-grid' },
      h('div', { class: 'field' }, h('label', {}, '模组 ID modid'), modidInput,
        h('div', { class: 'help' }, '决定导出路径 assets/<modid>/… 与书 id 的命名空间')),
      h('div', { class: 'field' }, h('label', {}, '书 ID bookId'), bookIdInput,
        h('div', { class: 'help' }, '书 id 为 <modid>:<bookId>，路径里不能有斜杠')),
      h('div', { class: 'field' }, h('label', {}, '目标版本 Profile'), profileSelect,
        h('div', { class: 'help' }, `资源包 pack_format ${getProfile(project.profileId).resourcePackFormat} / 数据包 ${getProfile(project.profileId).dataPackFormat}`)),
      h('div', { class: 'field' }, h('label', {}, '工程名（仅本地展示）'), nameInput),
    ),
  );
  inner.appendChild(card('工程信息', `${project.modid}:${project.bookId}`, projectCard));

  // --- localisation -------------------------------------------------------
  const localBody = h('div', { class: 'card-body' });
  const modeSelect = h('select', {});
  for (const [value, label] of [
    ['folders', '文件夹模式：每种语言一套 JSON（推荐）'],
    ['keys', 'i18n 模式：文本改成 lang key，语言文件统一管理'],
  ]) {
    const option = h('option', { value }, label);
    option.selected = project.localization === value;
    modeSelect.appendChild(option);
  }
  modeSelect.addEventListener('change', () => {
    store.apply((p) => {
      p.localization = modeSelect.value;
      p.book.i18n = modeSelect.value === 'keys';
    }, { kind: 'structure' });
    actions.toast('本地化模式已切换，导出结果会随之变化', 'ok');
  });

  const langChips = h('div', { class: 'chips' });
  for (const code of project.languages) {
    const option = LANGUAGE_OPTIONS.find((l) => l.code === code);
    const isPrimary = project.primaryLanguage === code;
    langChips.appendChild(
      h(
        'span',
        { class: 'chip', title: isPrimary ? '主语言：book.json 里的书名/首页文本用它的文字' : '点击设为默认编辑语言' },
        h(
          'span',
          {
            style: { cursor: 'pointer' },
            onclick: () => {
              store.apply((p) => {
                p.primaryLanguage = code;
              }, { kind: 'structure' });
              store.setUi({ lang: code }, 'lang');
            },
          },
          `${option?.short || code} ${isPrimary ? '★' : ''}`,
        ),
        project.languages.length > 1
          ? h(
              'span',
              {
                class: 'x',
                title: '移除该语言',
                onclick: () => {
                  store.apply((p) => {
                    p.languages = p.languages.filter((l) => l !== code);
                    if (p.primaryLanguage === code) p.primaryLanguage = p.languages[0] || 'en_us';
                  }, { kind: 'structure' });
                  if (state.ui.lang === code) store.setUi({ lang: project.languages[0] }, 'lang');
                },
              },
              '×',
            )
          : null,
      ),
    );
  }
  const addLangSelect = h('select', { style: { width: '170px' } }, h('option', { value: '' }, '+ 添加语言'));
  for (const option of LANGUAGE_OPTIONS) {
    if (project.languages.includes(option.code)) continue;
    addLangSelect.appendChild(h('option', { value: option.code }, `${option.label} (${option.code})`));
  }
  addLangSelect.addEventListener('change', () => {
    const code = addLangSelect.value;
    if (!code) return;
    store.apply((p) => {
      p.languages = [...p.languages, code];
    }, { kind: 'structure' });
    actions.toast(`已添加 ${code}，切换过去即可开始翻译`, 'ok');
  });

  localBody.append(
    h('div', { class: 'field' }, h('label', {}, '本地化模式'), modeSelect,
      h('div', { class: 'help' },
        project.localization === 'keys'
          ? '导出时正文写入 lang 文件（assets/<modid>/lang/<lang>.json），内容 JSON 只有一份。'
          : '每种语言各生成一套 categories/entries JSON；en_us 是兜底，其它语言只导出已翻译的文件。')),
    h('div', { class: 'field' }, h('label', {}, '语言列表（★ = 主语言）'), h('div', { class: 'row wrap' }, langChips, addLangSelect)),
  );
  inner.appendChild(card('语言与本地化', `${project.languages.length} 种语言`, localBody));

  // --- book.json fields ---------------------------------------------------
  const bookBody = h('div', { class: 'card-body' });
  bookBody.appendChild(sectionTitle('基础'));
  bookBody.appendChild(renderFields(BOOK_FIELDS.identity, { holder: project.book, lang, project, onChange: () => store.notifyEdit() }));
  bookBody.appendChild(sectionTitle('外观'));
  bookBody.appendChild(renderFields(BOOK_FIELDS.appearance, { holder: project.book, lang, project, onChange: () => store.notifyEdit() }));
  bookBody.appendChild(sectionTitle('行为'));
  bookBody.appendChild(renderFields(BOOK_FIELDS.behaviour, { holder: project.book, lang, project, onChange: () => store.notifyEdit() }));
  inner.appendChild(card('book.json', '导出到 data/<modid>/patchouli_books/<book>/book.json', bookBody));

  // --- macros -------------------------------------------------------------
  const macroBody = h('div', { class: 'card-body' });
  if (!project.macros.length) {
    macroBody.appendChild(h('div', { class: 'help' }, '还没有宏。宏写在 book.json 的 macros 对象里，例如 $(potato) → $(#F00)土豆$()。'));
  }
  project.macros.forEach((macro, index) => {
    const keyInput = h('input', { type: 'text', placeholder: '宏名，如 potato' });
    keyInput.value = macro.key || '';
    keyInput.addEventListener('input', () => store.apply((p) => {
      p.macros[index].key = keyInput.value;
    }, { kind: 'field', coalesce: `macro-${index}` }));
    const valueInput = h('input', { type: 'text', placeholder: '替换内容，可用富文本' });
    valueInput.value = macro.value || '';
    valueInput.addEventListener('input', () => store.apply((p) => {
      p.macros[index].value = valueInput.value;
    }, { kind: 'field', coalesce: `macrovalue-${index}` }));
    macroBody.appendChild(
      h(
        'div',
        { class: 'row' },
        keyInput,
        valueInput,
        h('button', {
          class: 'btn tiny danger',
          type: 'button',
          onclick: () => store.apply((p) => p.macros.splice(index, 1), { kind: 'structure' }),
        }, '删除'),
      ),
    );
  });
  macroBody.appendChild(
    h('button', {
      class: 'btn tiny',
      type: 'button',
      onclick: () => store.apply((p) => p.macros.push({ key: '', value: '' }), { kind: 'structure' }),
    }, '+ 添加宏'),
  );
  inner.appendChild(card('文本宏 macros', 'book.json 的 macros 字段', macroBody));

  // --- assets -------------------------------------------------------------
  const assetBody = h('div', { class: 'card-body' });
  assetBody.appendChild(
    h('div', { class: 'help' },
      '把图片/贴图加入工程后，导出时会写到 assets/<命名空间>/…。图片字段必须写完整路径，例如 mymod:textures/gui/entries/step1.png。'),
  );
  const assetList = h('div', { class: 'asset-list' });
  for (const [index, asset] of (project.assets || []).entries()) {
    assetList.appendChild(
      h(
        'div',
        { class: 'asset-row' },
        asset.base64
          ? h('img', { class: 'asset-thumb', src: `data:image/png;base64,${asset.base64}`, alt: asset.path })
          : h('span', { class: 'asset-thumb placeholder' }, '?'),
        h('span', { class: 'mono grow' }, asset.path),
        h('button', {
          class: 'btn tiny',
          type: 'button',
          onclick: () => {
            navigator.clipboard?.writeText(asset.path);
            actions.toast('资源路径已复制', 'ok');
          },
        }, '复制路径'),
        h('button', {
          class: 'btn tiny danger',
          type: 'button',
          onclick: () => store.apply((p) => p.assets.splice(index, 1), { kind: 'structure' }),
        }, '移除'),
      ),
    );
  }
  if (!project.assets?.length) assetList.appendChild(h('div', { class: 'help' }, '还没有资源文件'));
  assetBody.append(
    assetList,
    h(
      'div',
      { class: 'row' },
      h('button', { class: 'btn tiny', type: 'button', onclick: () => actions.addAsset() }, '+ 添加图片'),
      h('button', { class: 'btn tiny', type: 'button', onclick: () => actions.exportWholeBook() }, '查看整书导出内容'),
    ),
  );
  inner.appendChild(card('资源文件', `${project.assets?.length || 0} 个`, assetBody));
}

/* --------------------------------------------------------------- category */

function renderCategoryEditor(inner, ctx) {
  const { project, store, state, category, actions } = ctx;
  const lang = state.ui.lang;

  const head = h('div', { class: 'card-head' });
  head.append(
    itemTile(category.data?.icon || '?', 26),
    h('h3', {}, stripCodes(getText(category.data, 'name', lang)) || category.id),
    h('span', { class: 'sub mono' }, categoryResourceId(project, category)),
    h('div', { class: 'grow' }),
    h('button', {
      class: 'btn tiny danger',
      type: 'button',
      onclick: () => actions.deleteCategory(category),
    }, '删除分类'),
  );
  inner.appendChild(h('section', { class: 'card' }, head));

  const body = h('div', { class: 'card-body' });
  const idInput = h('input', { type: 'text' });
  idInput.value = category.id;
  idInput.addEventListener('change', () => {
    const next = idInput.value.trim();
    if (!next || next === category.id) return;
    store.apply((p) => {
      const target = p.categories.find((c) => c.id === category.id);
      if (target) target.id = next;
      for (const entry of p.entries) {
        if (entry.category === category.id) entry.category = next;
      }
      const selection = state.ui.selection;
      if (selection.kind === 'category' && selection.id === category.id) selection.id = next;
    }, { kind: 'structure' });
  });
  body.append(
    h('div', { class: 'field' }, h('label', {}, '分类 id（即文件路径）'), idInput,
      h('div', { class: 'help' }, `文件位置：assets/<modid>/patchouli_books/<book>/<lang>/categories/${category.id}.json`)),
    renderFields(CATEGORY_FIELDS, { holder: category.data, lang, project, onChange: () => store.notifyEdit() }),
  );
  inner.appendChild(card('分类属性', '分类 JSON 字段', body));

  const entries = sortBySortnumThenName(project.entries.filter((entry) => entry.category === category.id), lang);
  const listBody = h('div', { class: 'card-body tight' });
  if (!entries.length) listBody.appendChild(h('div', { class: 'help' }, '这个分类下还没有条目'));
  for (const [index, entry] of entries.entries()) {
    listBody.appendChild(
      h(
        'div',
        { class: 'row entry-row' },
        itemTile(entry.data?.icon || '?', 22),
        h('span', { class: 'grow' }, stripCodes(getText(entry.data, 'name', lang)) || entry.id),
        h('span', { class: 'faint mono' }, `${entry.pages?.length || 0} 页`),
        h('button', {
          class: 'btn tiny',
          type: 'button',
          onclick: () => actions.select({ kind: 'entry', id: entry.id }),
        }, '编辑'),
        h('button', {
          class: 'btn tiny',
          type: 'button',
          disabled: index === 0,
          onclick: () => actions.moveEntry(entry, -1),
        }, '↑'),
        h('button', {
          class: 'btn tiny',
          type: 'button',
          disabled: index === entries.length - 1,
          onclick: () => actions.moveEntry(entry, 1),
        }, '↓'),
      ),
    );
  }
  listBody.appendChild(h('button', {
    class: 'btn tiny',
    type: 'button',
    onclick: () => actions.addEntry(category.id),
  }, '+ 在此分类新建条目'));
  inner.appendChild(card('该分类的条目', `${entries.length} 个`, listBody));
}

/* ------------------------------------------------------------------ entry */

function renderEntryEditor(inner, ctx) {
  const { project, store, state, entry, actions } = ctx;
  const lang = state.ui.lang;

  const head = h('div', { class: 'card-head' });
  head.append(
    itemTile(entry.data?.icon || '?', 26),
    h('h3', {}, stripCodes(getText(entry.data, 'name', lang)) || entry.id),
    h('span', { class: 'sub mono' }, entryResourceId(project, entry)),
    h('div', { class: 'grow' }),
    h('button', {
      class: 'btn tiny danger',
      type: 'button',
      onclick: () => actions.deleteEntry(entry),
    }, '删除条目'),
  );
  inner.appendChild(h('section', { class: 'card' }, head));

  const body = h('div', { class: 'card-body' });

  const idInput = h('input', { type: 'text' });
  idInput.value = entry.id;
  idInput.addEventListener('change', () => {
    const next = idInput.value.trim().replace(/^\/+/, '');
    if (!next || next === entry.id) return;
    store.apply((p) => {
      const target = p.entries.find((e) => e.id === entry.id);
      if (target) target.id = next;
      if (state.ui.selection.kind === 'entry' && state.ui.selection.id === entry.id) state.ui.selection.id = next;
    }, { kind: 'structure' });
  });

  const categorySelect = h('select', {});
  for (const category of project.categories) {
    const option = h('option', { value: category.id }, `${category.id} — ${stripCodes(getText(category.data, 'name', lang))}`);
    option.selected = entry.category === category.id;
    categorySelect.appendChild(option);
  }
  categorySelect.addEventListener('change', () => {
    store.apply((p) => {
      const target = p.entries.find((e) => e.id === entry.id);
      if (!target) return;
      const oldPrefix = `${target.category}/`;
      const oldId = target.id;
      target.category = categorySelect.value;
      // keep the "category/entry" path convention when it matches the old one
      if (target.id.startsWith(oldPrefix)) {
        target.id = `${categorySelect.value}/${target.id.slice(oldPrefix.length)}`;
        if (state.ui.selection.kind === 'entry' && state.ui.selection.id === oldId) state.ui.selection.id = target.id;
      }
    }, { kind: 'structure' });
  });

  body.append(
    h('div', { class: 'field-grid' },
      h('div', { class: 'field' }, h('label', {}, '条目 id（即文件路径）'), idInput,
        h('div', { class: 'help' }, `assets/<modid>/patchouli_books/<book>/<lang>/entries/${entry.id}.json`)),
      h('div', { class: 'field' }, h('label', {}, '所属分类 category'), categorySelect),
    ),
    renderFields(ENTRY_FIELDS, { holder: entry.data, lang, project, onChange: () => store.notifyEdit() }),
  );
  inner.appendChild(card('条目属性', '条目 JSON 字段', body));

  inner.appendChild(renderPages(entry, ctx));
}

function renderPages(entry, ctx) {
  const { project, store, state, actions } = ctx;
  const lang = state.ui.lang;

  const body = h('div', { class: 'card-body' });
  const typePicker = h('select', { style: { width: 'auto', minWidth: '200px' } });
  for (const type of PAGE_TYPE_KEYS) {
    typePicker.appendChild(h('option', { value: type }, PAGE_TYPES[type].label));
  }
  const addRow = h(
    'div',
    { class: 'row wrap' },
    typePicker,
    h('button', {
      class: 'btn primary',
      type: 'button',
      onclick: () => {
        store.apply((p) => {
          const target = p.entries.find((e) => e.id === entry.id);
          target.pages.push(newPage(typePicker.value));
        }, { kind: 'structure' });
        actions.toast('已添加一页', 'ok');
      },
    }, '+ 添加页'),
    h('button', {
      class: 'btn tiny',
      type: 'button',
      onclick: () => actions.selectPageForPreview(0),
    }, '预览第 1 页'),
  );
  body.appendChild(addRow);

  if (!entry.pages.length) {
    body.appendChild(h('div', { class: 'page-list-empty' }, '还没有页面，从上方选一个页型添加'));
  }

  entry.pages.forEach((page, index) => {
    const info = pageTypeInfo(page.type);
    const typeSelect = h('select', {});
    for (const type of PAGE_TYPE_KEYS) {
      const option = h('option', { value: type }, PAGE_TYPES[type].label);
      option.selected = page.type === type;
      typeSelect.appendChild(option);
    }
    if (!PAGE_TYPES[page.type]) {
      const option = h('option', { value: page.type }, `${page.type}（模板页）`);
      option.selected = true;
      typeSelect.appendChild(option);
    }
    typeSelect.addEventListener('change', () => {
      store.apply(() => {
        page.type = typeSelect.value;
      }, { kind: 'structure' });
    });

    const headEl = h(
      'div',
      { class: 'page-card-head' },
      h('span', { class: 'page-index' }, String(index + 1)),
      typeSelect,
      h('div', { class: 'page-actions' },
        h('button', { class: 'icon-btn', title: '上移', type: 'button', disabled: index === 0, onclick: () => actions.movePage(index, -1) }, '↑'),
        h('button', { class: 'icon-btn', title: '下移', type: 'button', disabled: index === entry.pages.length - 1, onclick: () => actions.movePage(index, 1) }, '↓'),
        h('button', { class: 'icon-btn', title: '复制', type: 'button', onclick: () => actions.duplicatePage(index) }, '⧉'),
        h('button', { class: 'icon-btn', title: '删除', type: 'button', onclick: () => actions.deletePage(index) }, '🗑'),
      ),
    );

    const fields = h('div', { class: 'page-card-body' },
      renderFields(pageFieldsOf(page.type), {
        holder: page.data,
        lang,
        project,
        onChange: () => store.notifyEdit(),
      }),
    );
    if (!info.fields.length && !PAGE_TYPES[page.type]) {
      fields.appendChild(h('div', { class: 'help' }, '这是一页模板页型，页面其它键会作为模板变量传入。'));
    }

    body.appendChild(h('div', { class: 'page-card' }, headEl, fields));
  });

  return card('页面 pages', `${entry.pages.length} 页`, body);
}

export { card, sectionTitle };

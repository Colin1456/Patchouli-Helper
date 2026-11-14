// Right column: a book-like two page spread preview, plus a JSON inspector.

import { h } from '../util.js';
import { getText, sortBySortnumThenName } from '../model.js';
import { coverColorsFor, getProfile } from '../profiles.js';
import { renderRichText, stripCodes } from '../richtext.js';
import { serializeBook, serializeCategory, serializeEntry, bookJsonPath, entryFileName, categoryFileName } from '../serialize.js';
import { itemTile } from './fields.js';

/* ------------------------------------------------------------------ helpers */

const pageTitle = (text) => (text ? h('div', { class: 'page-title' }, stripCodes(text)) : null);

function richBlock(source, macros) {
  const div = h('div', { class: 'rich' });
  div.innerHTML = renderRichText(source, { macros });
  return div;
}

function macrosObject(project) {
  const out = {};
  for (const macro of project.macros || []) {
    if (!macro?.key) continue;
    out[macro.key] = macro.value ?? '';
  }
  return out;
}

function findAsset(project, path) {
  return (project.assets || []).find((asset) => asset.path === path) || null;
}

function block(label, ...children) {
  return h('div', { class: 'book-block' }, label ? h('div', { class: 'block-label' }, label) : null, ...children);
}

function namesOfEntries(project, lang) {
  return new Map(project.entries.map((entry) => [entry.id, stripCodes(getText(entry.data, 'name', lang)) || entry.id]));
}

/* -------------------------------------------------------------- page render */

function renderPage(project, entry, page, lang) {
  const macros = macrosObject(project);
  const data = page.data || {};
  const parts = [];
  const info = page.type;

  const title = getText(data, 'title', lang) || getText(data, 'name', lang);
  if (title && info !== 'patchouli:multiblock') parts.push(pageTitle(title));

  if (info === 'patchouli:text') {
    parts.push(richBlock(getText(data, 'text', lang), macros));
  } else if (info?.startsWith('patchouli:') && /crafting|smelting|blasting|smoking|campfire|stonecutting|smithing/.test(info)) {
    const recipe = data.recipe || '未设置配方';
    const grid = h('div', { class: 'recipe-grid' });
    for (let i = 0; i < 9; i++) grid.appendChild(h('div', { class: 'recipe-slot' }));
    parts.push(block('recipe', grid, h('div', { class: 'mono', style: { fontSize: '10px', color: '#7a6a4c', marginTop: '4px' } }, recipe)));
    if (data.recipe2) parts.push(block('recipe2', h('div', { class: 'mono', style: { fontSize: '10px', color: '#7a6a4c' } }, data.recipe2)));
    if (getText(data, 'text', lang)) parts.push(richBlock(getText(data, 'text', lang), macros));
  } else if (info === 'patchouli:spotlight') {
    const items = String(data.item || '').split(',').map((s) => s.trim()).filter(Boolean);
    const row = h(
      'div',
      { class: 'spotlight-item' },
      ...items.slice(0, 3).map((item) => h('span', { class: 'slot' }, itemTile(item, 26))),
      h('span', { style: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#7a6a4c' } }, items.join(', ') || '未设置物品'),
    );
    parts.push(block('item', row));
    if (getText(data, 'text', lang)) parts.push(richBlock(getText(data, 'text', lang), macros));
  } else if (info === 'patchouli:image') {
    const images = Array.isArray(data.images) ? data.images : [];
    const strip = h('div', { class: 'image-strip' });
    if (!images.length) strip.appendChild(h('div', { class: 'ph' }, '没有图片'));
    for (const path of images) {
      const asset = findAsset(project, path);
      if (asset?.base64) {
        strip.appendChild(h('img', { src: `data:image/png;base64,${asset.base64}`, alt: path, title: path }));
      } else {
        strip.appendChild(h('div', { class: 'ph', title: path }, `缺资源\n${path.split('/').pop()}`));
      }
    }
    parts.push(block(data.border ? 'image (border)' : 'image', strip));
    if (getText(data, 'text', lang)) parts.push(richBlock(getText(data, 'text', lang), macros));
  } else if (info === 'patchouli:entity') {
    parts.push(
      block('entity',
        h('div', { class: 'spotlight-item' },
          h('span', { class: 'slot', style: { width: '52px', height: '52px', fontSize: '20px' } }, '☃'),
          h('div', {},
            h('div', { style: { fontSize: '12px', color: '#4a3520' } }, getText(data, 'name', lang) || data.entity || '未设置实体'),
            h('div', { class: 'mono', style: { fontSize: '10px', color: '#7a6a4c' } },
              `${data.entity || ''} · scale ${data.scale ?? 1}`),
          )),
      ),
    );
    if (getText(data, 'text', lang)) parts.push(richBlock(getText(data, 'text', lang), macros));
  } else if (info === 'patchouli:multiblock') {
    const structure = data.multiblock;
    if (structure && Array.isArray(structure.pattern)) {
      const layers = structure.pattern;
      const wrapper = h('div', { class: 'mb-wrap' });
      layers.forEach((layer, layerIndex) => {
        const grid = h('div', { class: 'mb-layer' });
        for (const row of layer) {
          const rowEl = h('div', { class: 'mb-row' });
          String(row).split('').forEach((char) => {
            const mapping = structure.mapping?.[char];
            const colour = char === ' ' ? '#e8dcbd' : char === '_' ? '#cbb995' : itemColorFor(mapping || char);
            rowEl.appendChild(h('div', { class: 'mb-cell', style: { background: colour }, title: mapping || char }));
          });
          grid.appendChild(rowEl);
        }
        wrapper.appendChild(h('div', { class: 'mb-layer-wrap' }, h('div', { class: 'mb-layer-label' }, `层 ${layerIndex + 1}`), grid));
      });
      parts.push(block('multiblock', wrapper));
    } else {
      parts.push(block('multiblock', h('div', { class: 'ph', style: { width: '100%' } }, '还没有结构 JSON 或 multiblock_id')));
    }
    if (getText(data, 'text', lang)) parts.push(richBlock(getText(data, 'text', lang), macros));
  } else if (info === 'patchouli:link') {
    parts.push(
      block('link',
        h('div', { class: 'mono', style: { fontSize: '11px', color: '#2b6bb5', wordBreak: 'break-all' } }, data.url || '未设置链接'),
        h('div', { style: { marginTop: '4px' } }, richBlock(getText(data, 'link_text', lang) || data.url || '', macros)),
      ),
    );
    if (getText(data, 'text', lang)) parts.push(richBlock(getText(data, 'text', lang), macros));
  } else if (info === 'patchouli:relations') {
    const names = namesOfEntries(project, lang);
    const chips = h('div', { class: 'chips' });
    const list = Array.isArray(data.entries) ? data.entries : [];
    if (!list.length) chips.appendChild(h('span', { class: 'chip' }, '未设置关联条目'));
    for (const ref of list) {
      const plain = String(ref).split(':').pop();
      chips.appendChild(h('span', { class: 'chip' }, names.get(plain || '') || ref));
    }
    parts.push(block('relations', chips));
    if (getText(data, 'text', lang)) parts.push(richBlock(getText(data, 'text', lang), macros));
  } else if (info === 'patchouli:quest') {
    parts.push(block('quest', h('div', { class: 'mono', style: { fontSize: '10px', color: '#7a6a4c' } }, data.trigger || '手动完成')));
    if (getText(data, 'text', lang)) parts.push(richBlock(getText(data, 'text', lang), macros));
  } else if (info === 'patchouli:empty') {
    parts.push(h('div', { class: 'index-empty' }, data.draw_filler === false ? '' : '（填充页）'));
  } else {
    // unknown / template page
    parts.push(block(`模板页 ${info}`, h('div', { class: 'ph', style: { width: '100%' } }, '该页型由模板渲染，编辑器无法还原内容')));
  }

  return parts;
}

function itemColorFor(value) {
  let hash = 0;
  const text = String(value || '?');
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 360;
  return `hsl(${hash}, 38%, 58%)`;
}

function emptyPage(text = '') {
  return h('div', { class: 'page-body' }, h('div', { class: 'index-empty' }, text));
}

/* ------------------------------------------------------------ book preview */

export function renderBookPreview(container, ctx) {
  const { project, state, profile } = ctx;
  const lang = state.ui.lang;
  const macros = macrosObject(project);
  const [cover, coverDark] = coverColorsFor(project.book?.bookTexture);

  const book = h('div', { class: `book${state.ui.zoom ? ' zoomed' : ''}` });
  book.style.setProperty('--cover', cover);
  book.style.setProperty('--cover-dark', coverDark);

  const selection = state.ui.selection;
  let leftPage = null;
  let rightPage = null;

  if (selection.kind === 'entry') {
    const entry = project.entries.find((e) => e.id === selection.id);
    if (entry) {
      const spread = Math.floor((state.ui.previewPage || 0) / 2);
      const pages = entry.pages || [];
      const leftIndex = spread * 2;
      const rightIndex = leftIndex + 1;
      leftPage = pageShell(lang, project, 'left');
      if (pages[leftIndex]) {
        leftPage.append(...renderPageInto(lang, project, entry, pages[leftIndex]));
      } else {
        leftPage.appendChild(h('div', { class: 'page-title' }, stripCodes(getText(entry.data, 'name', lang))));
        leftPage.appendChild(emptyPage('这一页是空白的'));
      }
      leftPage.appendChild(h('div', { class: 'page-footer' }, `${entry.id} · ${leftIndex + 1}`));

      rightPage = pageShell(lang, project, 'right', true);
      if (pages[rightIndex]) {
        rightPage.append(...renderPageInto(lang, project, entry, pages[rightIndex]));
        rightPage.appendChild(h('div', { class: 'page-footer' }, `${entry.id} · ${rightIndex + 1}`));
      } else {
        rightPage.appendChild(h('div', { class: 'page-body' }, h('div', { class: 'index-empty' }, '（本条目在这里结束）')));
      }
    }
  } else if (selection.kind === 'category') {
    const category = project.categories.find((c) => c.id === selection.id);
    if (category) {
      const entries = sortBySortnumThenName(project.entries.filter((e) => e.category === category.id), lang);
      leftPage = pageShell(lang, project, 'left');
      leftPage.append(
        h('div', { class: 'page-title' }, stripCodes(getText(category.data, 'name', lang))),
        h('div', { class: 'page-body' }, richBlock(getText(category.data, 'description', lang), macros)),
      );
      rightPage = pageShell(lang, project, 'right', true);
      const grid = h('div', { class: 'index-grid' });
      for (const entry of entries) {
        grid.appendChild(
          h(
            'div',
            { class: 'index-entry', onclick: () => ctx.onSelect({ kind: 'entry', id: entry.id }) },
            h('span', { class: 'slot' }, itemTile(entry.data?.icon || '?', 22)),
            h('span', { class: 'name' }, stripCodes(getText(entry.data, 'name', lang)) || entry.id),
          ),
        );
      }
      if (!entries.length) grid.appendChild(h('div', { class: 'index-empty' }, '这个分类还没有条目'));
      rightPage.append(h('div', { class: 'page-title' }, '目录'), h('div', { class: 'page-body' }, grid));
    }
  }

  if (!leftPage) {
    // book landing page + category index
    leftPage = pageShell(lang, project, 'left');
    leftPage.append(
      h('div', { class: 'page-title' }, stripCodes(getText(project.book, 'name', lang)) || '未命名书籍'),
      h('div', { class: 'page-body' }, richBlock(getText(project.book, 'landingText', lang), macros)),
    );
    const version = String(project.book?.version || '');
    if (version) {
      leftPage.appendChild(h('div', { class: 'page-footer' }, version === '0' ? '' : `${version} Edition`));
    }
    rightPage = pageShell(lang, project, 'right', true);
    const grid = h('div', { class: 'index-grid' });
    for (const category of sortBySortnumThenName(project.categories, lang)) {
      grid.appendChild(
        h(
          'div',
          { class: 'index-entry', onclick: () => ctx.onSelect({ kind: 'category', id: category.id }) },
          h('span', { class: 'slot' }, itemTile(category.data?.icon || '?', 22)),
          h('span', { class: 'name' }, stripCodes(getText(category.data, 'name', lang)) || category.id),
        ),
      );
    }
    if (!grid.children.length) grid.appendChild(h('div', { class: 'index-empty' }, '还没有分类'));
    rightPage.append(h('div', { class: 'page-title' }, '分类'), h('div', { class: 'page-body' }, grid));
  }

  book.append(leftPage, rightPage);
  container.appendChild(book);

  const note = h(
    'div',
    { class: 'preview-note' },
    `${getProfile(project.profileId).label} · ${lang} · book_texture ${project.book?.bookTexture || '默认'}`,
  );
  container.appendChild(note);

  fitBookToContainer(container, book, { zoom: Boolean(state.ui.zoom) });
  void profile;
}

/**
 * Scales the spread so it always fits the preview column (important on small /
 * low resolution screens where the book would otherwise be cut off).
 */
let fitObserver = null;
function fitBookToContainer(container, book, { zoom = false } = {}) {
  if (fitObserver) {
    fitObserver.disconnect();
    fitObserver = null;
  }
  if (zoom) {
    book.classList.add('zoomed');
    book.style.width = '100%';
    return;
  }
  book.classList.remove('zoomed');

  const apply = () => {
    const style = getComputedStyle(container);
    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const noteEl = container.querySelector('.preview-note');
    const noteHeight = noteEl ? noteEl.offsetHeight + 10 : 0;
    const availW = container.clientWidth - padX;
    const availH = container.clientHeight - padY - noteHeight;
    if (availW <= 40 || availH <= 40) return;
    // the spread is 1 : 0.72 (w : h), so height limits the width at 1/0.72
    const byHeight = availH / 0.72;
    const width = Math.max(220, Math.min(760, availW, byHeight));
    book.style.width = `${Math.round(width)}px`;
  };

  fitObserver = new ResizeObserver(apply);
  fitObserver.observe(container);
  apply();
}

function pageShell(lang, project, side, muted = false) {
  const page = h('div', { class: `book-page ${side}${muted ? '' : ''}` });
  if (project.book?.textColor) page.style.color = `#${String(project.book.textColor).replace('#', '')}`;
  void lang;
  return page;
}

function renderPageInto(lang, project, entry, page) {
  return renderPage(project, entry, page, lang);
}

export function previewPageCount(project, state) {
  const selection = state.ui.selection;
  if (selection.kind !== 'entry') return 1;
  const entry = project.entries.find((e) => e.id === selection.id);
  if (!entry) return 1;
  return Math.max(1, Math.ceil((entry.pages?.length || 1) / 2));
}

/* ------------------------------------------------------------ JSON inspector */

export function renderJsonPreview(container, ctx) {
  const { project, state } = ctx;
  const lang = state.ui.lang;
  const selection = state.ui.selection;
  const i18nKeys = project.localization === 'keys' || Boolean(project.book?.i18n);

  const items = [];
  if (selection.kind === 'entry') {
    const entry = project.entries.find((e) => e.id === selection.id);
    if (entry) {
      const data = serializeEntry(project, entry, lang, { i18nKeys });
      const path = `assets/${project.modid}/patchouli_books/${project.bookId}/${lang}/${entryFileName(entry)}`;
      items.push({ label: '条目 JSON', path, data });
    }
  } else if (selection.kind === 'category') {
    const category = project.categories.find((c) => c.id === selection.id);
    if (category) {
      const data = serializeCategory(project, category, lang, { i18nKeys });
      const path = `assets/${project.modid}/patchouli_books/${project.bookId}/${lang}/${categoryFileName(category)}`;
      items.push({ label: '分类 JSON', path, data });
    }
  } else {
    const data = serializeBook(project, project.primaryLanguage, { i18nKeys });
    items.push({ label: 'book.json', path: bookJsonPath(project), data });
  }

  for (const item of items) {
    container.appendChild(
      h('div', { class: 'json-view' },
        h('div', { class: 'row', style: { marginBottom: '6px' } },
          h('span', { class: 'tag accent' }, item.label),
          h('span', { class: 'mono faint', style: { fontSize: '11px', wordBreak: 'break-all' } }, item.path),
        ),
        h('div', { class: 'json-file', html: highlightJson(JSON.stringify(item.data, null, 2)) }),
      ),
    );
  }
}

export function highlightJson(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'n';
      if (/^"/.test(match)) cls = /:$/.test(match) ? 'k' : 's';
      else if (/true|false|null/.test(match)) cls = 'b';
      return `<span class="${cls}">${match}</span>`;
    });
}

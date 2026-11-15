// Left sidebar: book → categories → entries.

import { h } from '../util.js';
import { getText, sortBySortnumThenName } from '../model.js';
import { categoryHasText, entryHasText } from '../serialize.js';
import { itemTile } from './fields.js';
import { stripCodes } from '../richtext.js';

// 与导出/游戏一致：整份文件没有任何该语言的内容才算「未译」。
// （以前用字段判断，条目正文翻了但标题留空就挂「未译」，用户会觉得数字和事实对不上。）
const untranslatedEntry = (entry, lang) => !entryHasText(entry, lang);
const untranslatedCategory = (category, lang) => !categoryHasText(category, lang);
function entryNode(project, entry, state, onSelect) {
  const { lang, selection } = state.ui;
  const name = stripCodes(getText(entry.data, 'name', lang)) || entry.id;
  const selected = selection.kind === 'entry' && selection.id === entry.id;
  const untranslated = untranslatedEntry(entry, lang);
  return h(
    'div',
    {
      class: `tree-node tree-entry${selected ? ' selected' : ''}`,
      onclick: () => onSelect({ kind: 'entry', id: entry.id }),
      title: entry.id,
    },
    h('span', { class: 'node-icon' }, itemTile(entry.data?.icon || '?', 20)),
    h(
      'div',
      { class: 'node-body' },
      h(
        'div',
        { class: 'node-title' },
        h('span', { class: 'label' }, name),
        entry.data?.secret ? h('span', { class: 'tag' }, '隐') : null,
        untranslated ? h('span', { class: 'tag warn', title: `${lang} 整条未翻译，游戏里会整份显示 en_us` }, '未译') : null,
      ),
      h('div', { class: 'node-sub' }, `${entry.pages?.length || 0} 页`),
    ),
  );
}

export function renderTree(container, { project, state, onSelect }) {
  container.textContent = '';
  const { lang, selection } = state.ui;

  const bookTitle = stripCodes(getText(project.book, 'name', lang)) || project.meta?.name || '未命名书籍';
  container.appendChild(
    h(
      'div',
      {
        class: `tree-book${selection.kind === 'book' ? ' selected' : ''}`,
        onclick: () => onSelect({ kind: 'book', id: null }),
        title: '书籍设置',
      },
      h('div', { class: 'book-cover' }, '📖'),
      h(
        'div',
        { class: 'meta' },
        h('strong', {}, bookTitle),
        h('span', {}, `${project.modid}:${project.bookId}`),
      ),
    ),
  );

  const categories = sortBySortnumThenName(project.categories, lang);
  const known = new Set(categories.map((c) => c.id));
  const orphans = project.entries.filter((entry) => !known.has(entry.category));

  if (!categories.length) {
    container.appendChild(h('div', { class: 'tree-empty' }, '还没有分类，点下方「+ 分类」新建'));
  }

  for (const category of categories) {
    const entries = sortBySortnumThenName(
      project.entries.filter((entry) => entry.category === category.id),
      lang,
    );
    const selected = selection.kind === 'category' && selection.id === category.id;
    container.appendChild(
      h(
        'div',
        {
          class: `tree-node tree-category${selected ? ' selected' : ''}`,
          onclick: () => onSelect({ kind: 'category', id: category.id }),
          title: category.id,
        },
        h('span', { class: 'node-icon' }, itemTile(category.data?.icon || '?', 20)),
        h(
          'div',
          { class: 'node-body' },
          h(
            'div',
            { class: 'node-title' },
            h('span', { class: 'label' }, stripCodes(getText(category.data, 'name', lang)) || category.id),
            untranslatedCategory(category, lang) ? h('span', { class: 'tag warn', title: `${lang} 整条未翻译` }, '未译') : null,
          ),
          h('div', { class: 'node-sub' }, `${entries.length} 条目`),
        ),
      ),
    );
    if (entries.length) {
      const children = h('div', { class: 'tree-children' });
      for (const entry of entries) children.appendChild(entryNode(project, entry, state, onSelect));
      container.appendChild(children);
    }
  }

  if (orphans.length) {
    container.appendChild(h('div', { class: 'tree-group' }, h('span', {}, '未归类条目')));
    for (const entry of orphans) {
      container.appendChild(entryNode(project, entry, state, onSelect));
    }
  }
}

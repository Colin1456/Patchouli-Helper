// Generic form fields generated from schema.js definitions.

import { h, uid } from '../util.js';
import { getText, setText } from '../model.js';
import { richTextEditor } from './rte.js';

/** Small deterministic colour for an item id tile. */
export function itemColor(id) {
  const text = String(id || '?');
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) % 360;
  return `hsl(${hash}, 42%, 42%)`;
}

/** Item icon stand-in (MC textures are not available to the editor). */
export function itemTile(id, size = 20) {
  const text = String(id || '?');
  const short = text.replace(/^[a-z0-9_]+:/, '').replace(/_/g, ' ');
  return h(
    'span',
    {
      class: 'item-tile',
      title: text,
      style: {
        width: `${size}px`,
        height: `${size}px`,
        background: `linear-gradient(145deg, ${itemColor(text)}, #1d1828)`,
        fontSize: `${Math.max(9, Math.round(size * 0.5))}px`,
      },
    },
    (short[0] || '?').toUpperCase(),
  );
}

const labelOf = (field) =>
  h(
    'label',
    {},
    field.label,
    field.required ? h('span', { class: 'req' }, '*') : null,
    field.i18n ? h('span', { class: 'tag accent', title: '可翻译字段：每种语言各存一份' }, 'i18n') : null,
  );

function onChangeHandler(ctx) {
  return (kind = 'field') => {
    ctx.onChange?.(kind);
  };
}

/**
 * Builds the DOM for one schema field bound to `holder`.
 * @param {object} field schema field definition
 * @param {{holder: object, lang: string, project: object, onChange?: (kind?: string) => void}} ctx
 */
export function renderField(field, ctx) {
  const { holder, lang } = ctx;
  const wrapper = h('div', {
    class: `field${field.width === 'half' ? ' half' : ''}`,
    dataset: { fieldKey: field.key },
  });

  const fire = onChangeHandler(ctx);

  if (field.i18n) {
    const current = getText(holder, field.key, lang);
    if (field.type === 'richtext') {
      wrapper.appendChild(labelOf(field));
      wrapper.appendChild(
        richTextEditor({
          value: current,
          rows: field.rows || 8,
          placeholder: field.placeholder || '',
          onChange: (value) => {
            setText(holder, field.key, lang, value);
            fire('field');
          },
        }),
      );
      if (!current.trim()) {
        wrapper.appendChild(h('div', { class: 'help' }, `当前语言 ${lang} 还没有内容，导出时会回退到 en_us`));
      }
      if (field.help) wrapper.appendChild(h('div', { class: 'help' }, field.help));
      return wrapper;
    }
    wrapper.appendChild(labelOf(field));
    const input = h('input', { type: 'text', placeholder: field.placeholder || '' });
    input.value = current;
    input.addEventListener('input', () => {
      setText(holder, field.key, lang, input.value);
      fire('field');
    });
    wrapper.appendChild(input);
    if (field.help) wrapper.appendChild(h('div', { class: 'help' }, field.help));
    return wrapper;
  }

  switch (field.type) {
    case 'bool': {
      const input = h('input', { type: 'checkbox' });
      input.checked = Boolean(holder[field.key] ?? field.default ?? false);
      input.addEventListener('change', () => {
        holder[field.key] = input.checked;
        fire('field');
      });
      wrapper.appendChild(
        h(
          'label',
          { class: 'switch' },
          input,
          h('span', { class: 'track' }),
          h('span', {}, field.label),
        ),
      );
      if (field.help) wrapper.appendChild(h('div', { class: 'help' }, field.help));
      return wrapper;
    }
    case 'int':
    case 'float': {
      wrapper.appendChild(labelOf(field));
      const input = h('input', {
        type: 'number',
        step: field.type === 'float' ? '0.01' : '1',
        placeholder: field.placeholder || '',
      });
      input.value = holder[field.key] ?? field.default ?? '';
      input.addEventListener('input', () => {
        holder[field.key] = input.value === '' ? '' : Number(input.value);
        fire('field');
      });
      wrapper.appendChild(input);
      if (field.help) wrapper.appendChild(h('div', { class: 'help' }, field.help));
      return wrapper;
    }
    case 'stringlist':
    case 'entrylist': {
      wrapper.appendChild(labelOf(field));
      wrapper.appendChild(chipList(field, holder, ctx, fire));
      if (field.help) wrapper.appendChild(h('div', { class: 'help' }, field.help));
      return wrapper;
    }
    case 'json': {
      wrapper.appendChild(labelOf(field));
      wrapper.appendChild(jsonEditor(field, holder, fire));
      if (field.help) wrapper.appendChild(h('div', { class: 'help' }, field.help));
      return wrapper;
    }
    default: {
      wrapper.appendChild(labelOf(field));
      const input = h('input', { type: 'text', placeholder: field.placeholder || '' });
      input.value = holder[field.key] ?? '';
      input.addEventListener('input', () => {
        holder[field.key] = input.value;
        fire('field');
      });
      wrapper.appendChild(input);
      if (field.help) wrapper.appendChild(h('div', { class: 'help' }, field.help));
      return wrapper;
    }
  }
}

function chipList(field, holder, ctx, fire) {
  const container = h('div', { class: 'chips' });
  const list = Array.isArray(holder[field.key]) ? holder[field.key] : (holder[field.key] = []);

  const rerender = () => {
    container.textContent = '';
    list.forEach((value, index) => {
      container.appendChild(
        h(
          'span',
          { class: 'chip removable', title: '点击删除' },
          field.type === 'entrylist' ? h('span', { class: 'mono' }, String(value)) : String(value),
          h(
            'span',
            {
              class: 'x',
              onclick: () => {
                list.splice(index, 1);
                fire('field');
                rerender();
              },
            },
            '×',
          ),
        ),
      );
    });
    const input = h('input', {
      type: 'text',
      placeholder: field.type === 'entrylist' ? '条目 id，回车添加' : '路径，回车添加',
      style: { display: 'none' },
    });
    const addButton = h(
      'span',
      {
        class: 'chip add',
        onclick: () => {
          input.style.display = 'block';
          input.focus();
        },
      },
      '+ 添加',
    );
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && input.value.trim()) {
        list.push(input.value.trim());
        input.value = '';
        input.style.display = 'none';
        fire('field');
        rerender();
      }
      if (event.key === 'Escape') {
        input.value = '';
        input.style.display = 'none';
      }
    });
    container.append(addButton, input);
  };

  rerender();
  return container;
}

function jsonEditor(field, holder, fire) {
  const textarea = h('textarea', { rows: field.rows || 8, placeholder: field.placeholder || '', spellcheck: 'false' });
  const status = h('div', { class: 'help' }, '');
  const value = holder[field.key];
  textarea.value = value === undefined || value === null || value === '' ? '' : JSON.stringify(value, null, 2);

  const formatButton = h(
    'button',
    {
      class: 'btn tiny',
      type: 'button',
      onclick: () => {
        try {
          const parsed = JSON.parse(textarea.value);
          textarea.value = JSON.stringify(parsed, null, 2);
          holder[field.key] = parsed;
          status.textContent = 'JSON 合法 ✓';
          status.style.color = 'var(--ok)';
          fire('field');
        } catch (error) {
          status.textContent = `JSON 解析失败：${error.message}`;
          status.style.color = 'var(--err)';
        }
      },
    },
    '格式化 / 校验',
  );

  textarea.addEventListener('input', () => {
    if (!textarea.value.trim()) {
      holder[field.key] = '';
      status.textContent = '';
      fire('field');
      return;
    }
    try {
      holder[field.key] = JSON.parse(textarea.value);
      status.textContent = '';
      textarea.classList.remove('invalid');
      fire('field', );
    } catch {
      textarea.classList.add('invalid');
      status.textContent = 'JSON 尚未合法，导出前请修正';
      status.style.color = 'var(--warn)';
    }
  });

  const box = h('div', { class: 'field' }, textarea, h('div', { class: 'row' }, formatButton, status));
  void uid;
  return box;
}

/** Renders a list of fields into a fragment. */
export function renderFields(fields, ctx) {
  const grid = h('div', { class: 'field-grid' });
  for (const field of fields) {
    grid.appendChild(renderField(field, ctx));
  }
  return grid;
}

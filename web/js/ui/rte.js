// Rich text editor: textarea + Patchouli formatting toolbar + live render.

import { h } from '../util.js';
import { applyFormat, renderRichText } from '../richtext.js';
import { FORMAT_SHORTCUTS, COLOR_PRESETS } from '../schema.js';

/**
 * @param {{value: string, onChange: (value: string) => void, rows?: number, placeholder?: string}} options
 */
export function richTextEditor({ value = '', onChange, rows = 8, placeholder = '' }) {
  const textarea = h('textarea', {
    rows,
    placeholder,
    spellcheck: 'false',
  });
  textarea.value = value;

  const preview = h('div', { class: 'rte-preview rich' });
  const updatePreview = () => {
    preview.innerHTML = renderRichText(textarea.value, {});
  };

  const wrapper = h('div', { class: 'rte' });
  const toolbar = h('div', { class: 'rte-toolbar' });

  const insert = (shortcut) => {
    const { next, caret } = applyFormat(textarea, shortcut);
    textarea.value = next;
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
    onChange(textarea.value);
    updatePreview();
  };

  for (const shortcut of FORMAT_SHORTCUTS) {
    toolbar.appendChild(
      h(
        'button',
        {
          type: 'button',
          title: shortcut.title,
          onclick: () => insert(shortcut),
        },
        shortcut.label,
      ),
    );
  }

  toolbar.appendChild(h('span', { class: 'sep' }));
  for (const [hex, code] of COLOR_PRESETS) {
    toolbar.appendChild(
      h(
        'button',
        {
          type: 'button',
          title: `颜色 $(${code}) ${hex}`,
          onclick: () => insert({ open: `$(${code})`, close: '$()', placeholder: '文字' }),
        },
        h('span', { class: 'color-swatch', style: { background: hex } }),
      ),
    );
  }

  toolbar.appendChild(h('span', { class: 'sep' }));
  toolbar.appendChild(
    h(
      'button',
      {
        type: 'button',
        title: '显示/隐藏实时预览',
        onclick: () => {
          preview.hidden = !preview.hidden;
        },
      },
      '预览',
    ),
  );

  textarea.addEventListener('input', () => {
    onChange(textarea.value);
    updatePreview();
  });
  textarea.addEventListener('focus', () => wrapper.classList.add('focused'));
  textarea.addEventListener('blur', () => wrapper.classList.remove('focused'));
  textarea.addEventListener('keydown', (event) => {
    // Tab inserts two spaces instead of moving focus
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = `${textarea.value.slice(0, start)}  ${textarea.value.slice(end)}`;
      textarea.setSelectionRange(start + 2, start + 2);
      onChange(textarea.value);
      updatePreview();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      insert(FORMAT_SHORTCUTS[0]);
    }
  });

  updatePreview();
  wrapper.append(toolbar, textarea, preview);
  return wrapper;
}

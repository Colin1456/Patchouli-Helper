// Toasts and modal dialogs.

import { h } from '../util.js';

const toastRoot = () => document.getElementById('toast-root');
const modalRoot = () => document.getElementById('modal-root');

export function toast(message, kind = 'info', timeout = 2800) {
  const el = h('div', { class: `toast ${kind}` }, message);
  toastRoot().appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    el.style.transition = 'opacity .18s ease, transform .18s ease';
    setTimeout(() => el.remove(), 200);
  }, timeout);
}

/**
 * Opens a modal. Returns { close }.
 */
export function modal({ title, body, footer = null, wide = false }) {
  const root = modalRoot();
  const backdrop = h('div', { class: 'modal-backdrop' });
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  };
  const dialog = h(
    'div',
    { class: 'modal', style: wide ? { width: 'min(980px, 100%)' } : {} },
    h(
      'div',
      { class: 'modal-head' },
      h('h3', {}, title),
      h('div', { class: 'grow' }),
      h('button', { class: 'icon-btn', type: 'button', onclick: close, title: '关闭' }, '×'),
    ),
    h('div', { class: 'modal-body' }, body),
    footer ? h('div', { class: 'modal-foot' }, footer) : null,
  );
  backdrop.appendChild(dialog);
  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);
  root.appendChild(backdrop);
  return { close, dialog };
}

export function confirmModal({ title = '请确认', message, confirmText = '确定', danger = false }) {
  return new Promise((resolve) => {
    const footer = [
      h('button', { class: 'btn', type: 'button', onclick: () => { instance.close(); resolve(false); } }, '取消'),
      h(
        'button',
        {
          class: `btn ${danger ? 'danger' : 'primary'}`,
          type: 'button',
          onclick: () => {
            instance.close();
            resolve(true);
          },
        },
        confirmText,
      ),
    ];
    const instance = modal({ title, body: h('div', {}, message), footer });
  });
}

export function promptModal({ title = '输入', label = '', value = '', placeholder = '' }) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'text', placeholder });
    input.value = value;
    const footer = [
      h('button', { class: 'btn', type: 'button', onclick: () => { instance.close(); resolve(null); } }, '取消'),
      h(
        'button',
        {
          class: 'btn primary',
          type: 'button',
          onclick: () => {
            instance.close();
            resolve(input.value.trim());
          },
        },
        '确定',
      ),
    ];
    const instance = modal({ title, body: h('div', { class: 'field' }, h('label', {}, label), input), footer });
    setTimeout(() => input.focus(), 30);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        instance.close();
        resolve(input.value.trim());
      }
    });
  });
}

export function problemsModal({ problems, onJump }) {
  const list = h('div', { class: 'problem-list' });
  if (!problems.length) {
    list.appendChild(h('div', { class: 'help' }, '没有发现问题 ✓'));
  }
  for (const problem of problems) {
    list.appendChild(
      h(
        'div',
        {
          class: `problem ${problem.severity}`,
          onclick: () => {
            if (problem.target && onJump) onJump(problem.target);
          },
        },
        h('span', { class: 'sev' }),
        h(
          'div',
          { class: 'grow' },
          h('div', {}, problem.message),
          problem.where ? h('div', { class: 'where' }, problem.where) : null,
        ),
        h('span', { class: 'tag' }, { error: '错误', warning: '警告', info: '提示' }[problem.severity] || problem.severity),
      ),
    );
  }
  const instance = modal({ title: `校验结果（${problems.length}）`, body: list, wide: true });
  instance.dialog.querySelector('.modal-body').style.maxHeight = '62vh';
  return instance;
}

export function filesModal({ title, files, note }) {
  const rows = h('div', { class: 'json-view' });
  if (note) rows.appendChild(h('div', { class: 'help', style: { marginBottom: '8px' } }, note));
  for (const file of files) {
    rows.appendChild(
      h(
        'div',
        { style: { marginBottom: '10px' } },
        h('div', { class: 'row', style: { marginBottom: '4px' } },
          h('span', { class: 'tag accent' }, file.path),
          h('div', { class: 'grow' }),
          h(
            'button',
            {
              class: 'btn tiny',
              type: 'button',
              onclick: () => {
                navigator.clipboard?.writeText(typeof file.data === 'string' ? file.data : '（二进制文件）');
              },
            },
            '复制',
          ),
        ),
        typeof file.data === 'string'
          ? h('div', { class: 'json-file', html: highlight(file.data) })
          : h('div', { class: 'help' }, '二进制文件（图片）'),
      ),
    );
  }
  return modal({ title, body: rows, wide: true });
}

function highlight(text) {
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

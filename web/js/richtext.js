// Patchouli text formatting (`BookTextParser` semantics).
//
// Codes (verified against the 1.20.1 / 1.21.x sources):
//   $() $(reset) $(clear)   reset every style
//   $(br) <br>              line break
//   $(br2) $(2br) $(p)      empty line
//   $(li1)..$(li9)          bullet list item, number = indent
//   $(#rrggbb) $(#rgb)      hex colour, $(0)..$(9) $(a)..$(f) vanilla palette
//   $(nocolor)              back to the book base colour
//   $(k) $(obf)             obfuscated   $(l) $(bold)   bold   $(m) $(strike) strikethrough
//   $(n) $(underline)       underline     $(o) $(italic) italic
//   $(l:entry)text$(/l)     internal link (entry or category), $(l:https://..) external
//   $(t:tip)text$(/t)       tooltip
//   $(c:/cmd) $(command:/cmd) clickable command
//   $(playername)           player name    $(k:key.jump) keybind glyph
//   $(macroname)            book.json macros
//
// Unknown codes are echoed verbatim, like the game does.

const VANILLA_COLORS = {
  0: '#000000', 1: '#0000AA', 2: '#00AA00', 3: '#00AAAA', 4: '#AA0000', 5: '#AA00AA', 6: '#FFAA00', 7: '#AAAAAA',
  8: '#555555', 9: '#5555FF', a: '#55FF55', b: '#55FFFF', c: '#FF5555', d: '#FF55FF', e: '#FFFF55', f: '#FFFFFF',
};

const STYLES = {
  l: 'bold', bold: 'bold',
  o: 'italic', italic: 'italic', italics: 'italic',
  n: 'underline', underline: 'underline', u: 'underline',
  m: 'strike', strike: 'strike',
  k: 'obf', obf: 'obf',
};

function openTag(style) {
  const classes = { bold: 'bold', italic: 'it', underline: 'uline', strike: 'strike', obf: 'obf' };
  if (style.type === 'color') {
    // keep the semantic look of $(item) / $(thing) next to the raw colour
    const semantic = style.value === '#bb00bb' ? ' item' : style.value === '#440099' ? ' thing' : '';
    return `<span class="color${semantic}" style="color:${style.value}">`;
  }
  if (style.type === 'link') {
    const target = style.value;
    if (/^https?:\/\//i.test(target)) {
      return `<a class="ext" href="${escapeAttr(target)}" target="_blank" rel="noreferrer">`;
    }
    return `<a class="inlink" href="#" data-link="${escapeAttr(target)}">`;
  }
  if (style.type === 'tooltip') {
    return `<span class="tooltip-term" title="${escapeAttr(style.value)}">`;
  }
  if (style.type === 'command') {
    return `<span class="cmdlink" title="执行 ${escapeAttr(style.value)}">`;
  }
  return `<span class="${classes[style.value] || 'bold'}">`;
}

function closeTag(style) {
  return style.type === 'link' ? '</a>' : '</span>';
}

/**
 * Renders Patchouli text into HTML.
 * @param {string} source
 * @param {{macros?: Record<string,string>}} options
 */
export function renderRichText(source, options = {}) {
  const { macros = {} } = options;
  const text = expandMacros(String(source ?? ''), macros);
  const stack = [];
  let out = '';
  let buffer = '';
  let colorBase = null;

  const flush = () => {
    if (!buffer) return;
    out += escapeHtml(buffer);
    buffer = '';
  };
  const open = (style) => {
    out += openTag(style);
    stack.push(style);
  };
  const close = () => {
    const style = stack.pop();
    if (style) out += closeTag(style);
  };
  const closeAll = () => {
    while (stack.length) close();
    colorBase = null;
  };

  let i = 0;
  while (i < text.length) {
    // literal "<br>" is accepted by the game as a line break
    if (text.startsWith('<br>', i)) {
      flush();
      out += '<br class="br">';
      i += 4;
      continue;
    }
    const start = text.indexOf('$(', i);
    if (start === -1) {
      buffer += text.slice(i);
      break;
    }
    buffer += text.slice(i, start);
    const end = text.indexOf(')', start + 2);
    if (end === -1) {
      // unterminated code: the game prints it verbatim
      buffer += text.slice(start);
      break;
    }
    const code = text.slice(start + 2, end);
    i = end + 1;

    if (code === '' || code === 'reset' || code === 'clear' || code === '/') {
      flush();
      closeAll();
      continue;
    }
    if (code === 'br') {
      flush();
      out += '<br class="br">';
      continue;
    }
    if (code === 'br2' || code === '2br' || code === 'p') {
      flush();
      out += '<br class="br2">';
      continue;
    }
    if (/^li[1-9]$/.test(code) || code === 'li') {
      flush();
      const level = code === 'li' ? 1 : Number(code[2]);
      out += `<br class="br"><span class="li l${level}">${level % 2 === 1 ? '•' : '◦'}</span>`;
      continue;
    }
    if (code === 'nocolor') {
      flush();
      colorBase = null;
      continue;
    }
    if (code === 'playername') {
      flush();
      out += '<span class="item">Player</span>';
      continue;
    }
    if (STYLES[code]) {
      flush();
      open({ type: 'style', value: STYLES[code] });
      continue;
    }
    if (/^#[0-9a-fA-F]{6}$/.test(code) || /^#[0-9a-fA-F]{3}$/.test(code)) {
      flush();
      const hex = code.length === 4
        ? '#' + code.slice(1).split('').map((c) => c + c).join('')
        : code;
      colorBase = hex.toLowerCase();
      open({ type: 'color', value: colorBase });
      continue;
    }
    if (VANILLA_COLORS[code]) {
      flush();
      colorBase = VANILLA_COLORS[code];
      open({ type: 'color', value: colorBase });
      continue;
    }
    if (code.startsWith('l:')) {
      flush();
      open({ type: 'link', value: code.slice(2) });
      continue;
    }
    if (code.startsWith('c:') || code.startsWith('command:')) {
      flush();
      const cmd = code.startsWith('c:') ? code.slice(2) : code.slice(8);
      open({ type: 'command', value: cmd });
      continue;
    }
    if (code.startsWith('t:') || code.startsWith('tooltip:')) {
      flush();
      open({ type: 'tooltip', value: code.startsWith('t:') ? code.slice(2) : code.slice(8) });
      continue;
    }
    if (code.startsWith('k:')) {
      flush();
      out += `<span class="key">${escapeHtml(code.slice(2))}</span>`;
      continue;
    }

    // macros: keys may be written with or without the leading '+'
    const macroKey = Object.prototype.hasOwnProperty.call(macros, code)
      ? code
      : Object.prototype.hasOwnProperty.call(macros, `+${code}`)
        ? `+${code}`
        : null;
    if (macroKey) {
      flush();
      out += renderRichText(macros[macroKey], options);
      continue;
    }

    // "/x" closes the innermost span, like $(/l) $(/t)
    if (code.startsWith('/')) {
      flush();
      close();
      continue;
    }

    flush();
    out += `<span class="macro-missing">$(${escapeHtml(code)})</span>`;
  }

  flush();
  while (stack.length) close();
  void colorBase;
  return out;
}

/** Macros the game always defines (book.json macros override them). */
const BUILTIN_MACROS = {
  item: '$(#b0b)',
  thing: '$(#490)',
};

/** Expands book macros (max 10 rounds, like the game). */
function expandMacros(text, macros) {
  const all = { ...BUILTIN_MACROS, ...(macros || {}) };
  const entries = Object.entries(all).filter(([key]) => key);
  let current = text;
  for (let round = 0; round < 10; round++) {
    let next = current;
    for (const [key, value] of entries) {
      const token = key.startsWith('$(') ? key : `$(${key})`;
      if (next.includes(token)) next = next.split(token).join(String(value ?? ''));
    }
    if (next === current) break;
    current = next;
  }
  return current;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const escapeAttr = escapeHtml;

/** Plain text version, for trees and page titles. */
export function stripCodes(source) {
  return expandMacros(String(source ?? ''), {})
    .replace(/<br>/g, ' ')
    .replace(/\$\(br2?\)/g, ' ')
    .replace(/\$\(2br\)/g, ' ')
    .replace(/\$\(li[1-9]?\)/g, ' ')
    .replace(/\$\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Wraps the current textarea selection with a formatting code and returns the
 * new value + caret position.
 */
export function applyFormat(textarea, shortcut) {
  const { open, close, placeholder = '', raw = false } = shortcut;
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end) || (raw ? placeholder : placeholder);
  const insert = `${open}${selected}${close ?? ''}`;
  const next = value.slice(0, start) + insert + value.slice(end);
  const caret = start + open.length + selected.length;
  return { next, caret };
}

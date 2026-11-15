// Headless UI smoke test: drives Microsoft Edge / Chrome over CDP, checks that
// the editor renders, no console errors were produced, and saves a screenshot.
//
// Usage: node scripts/ui-check.mjs [url] [screenshot-path]

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const URL_TARGET = process.argv[2] || 'http://127.0.0.1:4173/';
const SHOT = process.argv[3] || 'ui-check.png';
const PORT = 9333;

const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const browser = CANDIDATES.find((path) => existsSync(path));
if (!browser) {
  console.error('no Chromium browser found');
  process.exit(2);
}

const child = spawn(browser, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--allow-file-access-from-files',
  `--remote-debugging-port=${PORT}`,
  '--window-size=1500,940',
  'about:blank',
], { stdio: 'ignore' });

const cleanup = () => {
  try {
    child.kill();
  } catch {
    /* ignore */
  }
};
process.on('exit', cleanup);

async function targetInfo() {
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await response.json();
      const page = list.find((item) => item.type === 'page');
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  throw new Error('devtools endpoint never came up');
}

const page = await targetInfo();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const consoleErrors = [];
const exceptions = [];

ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
    else resolve(message.result);
    return;
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? arg.type).join(' '));
  }
  if (message.method === 'Runtime.exceptionThrown') {
    const details = message.params.exceptionDetails;
    exceptions.push(details.exception?.description || details.text);
  }
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

const evaluate = async (expression, { awaitPromise = true } = {}) => {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise,
    userGesture: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result?.value;
};

await send('Runtime.enable');
await send('Page.enable');
await send('Log.enable');
await send('Page.navigate', { url: URL_TARGET });
await sleep(2500);

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

/** evaluate + never throw: returns { ok, value, error } */
const safeEval = async (expression) => {
  try {
    return { ok: true, value: await evaluate(expression) };
  } catch (error) {
    return { ok: false, value: null, error: String(error.message || error) };
  }
};

const layout = await evaluate(`(() => {
  const tree = document.querySelectorAll('#tree .tree-node').length;
  const editor = document.getElementById('editor');
  const book = document.querySelector('#preview-body .book');
  return {
    title: document.title,
    treeNodes: tree,
    editorCards: editor.querySelectorAll('.card').length,
    bookPages: book ? book.querySelectorAll('.book-page').length : 0,
    bookText: book ? book.innerText.slice(0, 120) : '',
    bookRect: book ? (() => { const r = book.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })() : null,
    pageBg: book ? getComputedStyle(book.querySelector('.book-page')).backgroundColor : '',
    pageTextLen: book ? book.querySelector('.book-page .page-body')?.innerText.length : 0,
    langButtons: document.querySelectorAll('#lang-switch button').length,
    problemBadge: document.getElementById('problem-count')?.textContent,
    status: document.getElementById('status-project')?.textContent,
  };
})()`);

check('页面标题', layout.title.includes('Patchouli'), layout.title);
check('侧栏渲染分类/条目', layout.treeNodes >= 2, `nodes=${layout.treeNodes}`);
check('编辑器渲染卡片', layout.editorCards >= 3, `cards=${layout.editorCards}`);
check('预览渲染双页', layout.bookPages === 2, `pages=${layout.bookPages}`);
check('书页尺寸合理', (layout.bookRect?.w || 0) > 380 && (layout.bookRect?.h || 0) > 250, JSON.stringify(layout.bookRect));
check('书页为羊皮纸底色', /246,\s*233,\s*201/.test(layout.pageBg || ''), layout.pageBg);
check('首页有正文', (layout.pageTextLen || 0) > 10, `chars=${layout.pageTextLen}`);
check('语言切换按钮', layout.langButtons >= 2, `buttons=${layout.langButtons}`);
check('状态栏显示书 id', Boolean(layout.status), layout.status);

// click the first entry in the tree and make sure the page editor appears
const entryState = await evaluate(`(async () => {
  const nodes = document.querySelectorAll('#tree .tree-entry');
  if (!nodes.length) return { clicked: false };
  nodes[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  return {
    clicked: true,
    pageCards: document.querySelectorAll('.page-card').length,
    fields: document.querySelectorAll('.page-card .field').length,
    rteToolbar: document.querySelectorAll('.rte-toolbar button').length,
  };
})()`);

check('点击条目打开页面编辑器', entryState.clicked && entryState.pageCards >= 1, JSON.stringify(entryState));
check('富文本工具栏', (entryState.rteToolbar || 0) >= 8, `buttons=${entryState.rteToolbar}`);

// screenshot in book mode (before switching the right panel to JSON)
const shotBook = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(SHOT, Buffer.from(shotBook.data, 'base64'));

// JSON tab
const jsonState = await evaluate(`(async () => {
  const tab = document.querySelector('#preview-tabs .tab[data-preview="json"]');
  tab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  const file = document.querySelector('.json-file');
  return { hasJson: Boolean(file), length: file ? file.innerText.length : 0 };
})()`);
check('JSON 预览', jsonState.hasJson && jsonState.length > 40, JSON.stringify(jsonState));

// switch language
const langState = await evaluate(`(async () => {
  const buttons = [...document.querySelectorAll('#lang-switch button')];
  const target = buttons[buttons.length - 1];
  if (!target) return { ok: false };
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  return { ok: true, lang: document.getElementById('status-lang')?.textContent };
})()`);
check('切换语言', langState.ok, JSON.stringify(langState));

// validation dialog opens
const validateState = await evaluate(`(async () => {
  document.querySelector('[data-action="validate"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  const dialog = document.querySelector('.modal');
  const backdrop = document.querySelector('.modal-backdrop');
  const closed = Boolean(dialog);
  let geometry = null;
  if (dialog && backdrop) {
    const d = dialog.getBoundingClientRect();
    const b = backdrop.getBoundingClientRect();
    geometry = {
      modal: { left: Math.round(d.left), top: Math.round(d.top), right: Math.round(d.right), bottom: Math.round(d.bottom) },
      backdrop: { width: Math.round(b.width), height: Math.round(b.height) },
      viewport: { width: innerWidth, height: innerHeight },
    };
  }
  dialog?.querySelector('.icon-btn')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return { opened: closed, problems: dialog ? dialog.querySelectorAll('.problem').length : -1, geometry };
})()`);
check('校验弹窗', validateState.opened, JSON.stringify(validateState.problems));
const geo = validateState.geometry || {};
const back = geo.backdrop || {};
const modalBox = geo.modal || {};
const vp = geo.viewport || {};
check(
  '弹窗居中且完整可见（未被顶栏遮挡）',
  back.width >= (vp.width || 1) - 2 &&
    back.height >= (vp.height || 1) - 2 &&
    modalBox.top >= 0 &&
    modalBox.bottom <= (vp.height || 0) + 1 &&
    Math.abs((modalBox.left + modalBox.right) / 2 - (vp.width || 0) / 2) < 60,
  JSON.stringify(geo),
);

// render every page type without exploding
const allTypesResult = await safeEval(`(async () => {
  const helper = window.__PATCHOULI_HELPER__;
  const store = helper.store;
  const entry = store.state.project.entries[0];
  const types = helper.pageTypes;
  store.apply(() => {
    entry.pages = types.map((type) => helper.newPage(type, {
      recipe: 'minecraft:crafting_table',
      item: 'minecraft:iron_ingot',
      entity: 'minecraft:cow',
      images: ['mymod:textures/gui/entries/a.png'],
      url: 'https://example.com',
      link_text: 'Example',
      entries: [entry.id],
      multiblock: { pattern: [['_ 0 _']], mapping: { '0': 'minecraft:furnace' } },
    }));
  }, { kind: 'structure' });
  // go back to the book tab and show a structured page (recipe) in the spread
  document.querySelector('#preview-tabs .tab[data-preview="book"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 200));
  const spreads = document.querySelectorAll('#preview-body .book-page').length;
  await new Promise((r) => setTimeout(r, 300));
  return {
    types: types.length,
    blocks: document.querySelectorAll('#preview-body .book-block').length,
    pageCards: document.querySelectorAll('.page-card').length,
    pageTitle: document.querySelector('#preview-body .page-title')?.innerText || '',
    spreads,
  };
})()`);
const allTypes = allTypesResult.value || {};
check(
  '全部 16 种页型都能渲染',
  allTypesResult.ok && allTypes.types === 16 && allTypes.pageCards === 16,
  allTypesResult.ok ? JSON.stringify(allTypes) : allTypesResult.error,
);
check('结构化页型有预览块', (allTypes.blocks || 0) >= 1, `blocks=${allTypes.blocks}`);

// column splitter: drag the preview divider and make sure the spread follows
const splitterInfo = await evaluate(`(() => {
  const list = [...document.querySelectorAll('.splitter')];
  const target = list[1];
  if (!target) return { count: list.length };
  const r = target.getBoundingClientRect();
  return {
    count: list.length,
    x: Math.round(r.x + r.width / 2),
    y: Math.round(r.y + 60),
    previewWidth: document.querySelector('.preview').getBoundingClientRect().width,
    bookWidth: document.querySelector('.book')?.getBoundingClientRect().width || 0,
  };
})()`);

let splitterAfter = null;
if (splitterInfo.count === 2) {
  const { x, y } = splitterInfo;
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 140, y, button: 'left', buttons: 1 });
  await sleep(120);
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x - 140, y, button: 'left', buttons: 0 });
  await sleep(350);
  splitterAfter = await evaluate(`(() => ({
    previewWidth: document.querySelector('.preview').getBoundingClientRect().width,
    bookWidth: document.querySelector('.book')?.getBoundingClientRect().width || 0,
    stored: localStorage.getItem('patchouli-helper:layout'),
  }))()`);
  // reset the layout again
  await evaluate(`(() => { document.querySelectorAll('.splitter').forEach((s) => s.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))); })()`);
  await sleep(200);
}

check('存在两条分栏拖拽条', splitterInfo.count === 2, `count=${splitterInfo.count}`);
check(
  '拖动分隔条可调整预览宽度',
  Boolean(splitterAfter) && splitterAfter.previewWidth > splitterInfo.previewWidth + 60,
  `${splitterInfo.previewWidth?.toFixed?.(0)} → ${splitterAfter?.previewWidth?.toFixed?.(0)}`,
);
check(
  '预览书页跟随列宽自适应',
  Boolean(splitterAfter) && Math.abs(splitterAfter.bookWidth - splitterInfo.bookWidth) > 20,
  `${splitterInfo.bookWidth?.toFixed?.(0)} → ${splitterAfter?.bookWidth?.toFixed?.(0)}`,
);
check('分栏位置会记住', Boolean(splitterAfter?.stored) || splitterAfter === null, String(splitterAfter?.stored || ''));

// small screen: the spread must still fit inside the viewport
await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 600, deviceScaleFactor: 1, mobile: false });
await sleep(450);
const smallScreen = await evaluate(`(() => {
  const r = document.querySelector('#preview-body .book')?.getBoundingClientRect();
  return r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight } : null;
})()`);
await send('Emulation.clearDeviceMetricsOverride');
await sleep(200);

// very narrow window: three columns stay side by side and become horizontally scrollable
await send('Emulation.setDeviceMetricsOverride', { width: 600, height: 800, deviceScaleFactor: 1, mobile: false });
await sleep(400);
const narrow = await evaluate(`(() => {
  const layout = document.querySelector('.layout');
  const cs = getComputedStyle(layout);
  const preview = document.querySelector('.preview').getBoundingClientRect();
  return {
    overflowX: cs.overflowX,
    scrollWidth: layout.scrollWidth,
    clientWidth: layout.clientWidth,
    previewRight: Math.round(preview.right),
    cols: cs.gridTemplateColumns.split(' ').length,
  };
})()`);
await send('Emulation.clearDeviceMetricsOverride');
await sleep(300);
check(
  '窄窗口仍横向三栏（可横向滚动）',
  narrow.cols === 5 && narrow.overflowX === 'auto' && narrow.previewRight <= narrow.scrollWidth + 1,
  JSON.stringify(narrow),
);
check(
  '1024×600 下书页不超出屏幕',
  Boolean(smallScreen)
    && smallScreen.w > 240
    && smallScreen.x >= 0
    && smallScreen.x + smallScreen.w <= smallScreen.vw + 1
    && smallScreen.y + smallScreen.h <= smallScreen.vh + 1,
  JSON.stringify(smallScreen),
);

// 菜单项点击后仍能正常触发（portal 后事件委托不能丢）
const menuClick = await evaluate(`(async () => {
  closeAll();
  function closeAll() {
    document.querySelectorAll('.dropdown-menu.open').forEach((m) => m.classList.remove('open'));
  }
  document.querySelector('[data-action="toggle-export"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 150));
  const item = document.querySelector('#export-menu [data-action="export-json"]');
  const before = document.querySelectorAll('.dropdown-menu.open').length;
  item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 350));
  const dialog = document.querySelector('.modal');
  const after = document.querySelectorAll('.dropdown-menu.open').length;
  dialog?.querySelector('.icon-btn')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return { before, after, opened: Boolean(dialog) };
})()`);
check('菜单项可点击并关闭菜单', menuClick.before === 1 && menuClick.opened && menuClick.after === 0, JSON.stringify(menuClick));

// Jar 导入：菜单项 + 页面内 zip 解析（含 deflate 解压）
const jarCheck = await evaluate(`(async () => {
  document.querySelector('[data-action="toggle-import"]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 150));
  const items = [...document.querySelectorAll('#import-menu button')].map((b) => b.dataset.action);
  const menu = document.querySelector('#import-menu');
  const menuRect = menu.getBoundingClientRect();
  const menuStyle = getComputedStyle(menu);
  const menuBox = {
    top: Math.round(menuRect.top),
    bottom: Math.round(menuRect.bottom),
    left: Math.round(menuRect.left),
    right: Math.round(menuRect.right),
    height: Math.round(menuRect.height),
    position: menuStyle.position,
    display: menuStyle.display,
    zIndex: menuStyle.zIndex,
    parent: menu.parentElement ? menu.parentElement.tagName : 'none',
    vw: innerWidth,
    vh: innerHeight,
  };
  // 菜单中心点上最顶层的元素必须属于菜单本身，否则说明被下面的内容盖住了
  const cx = Math.round(menuRect.left + menuRect.width / 2);
  const cy = Math.round(menuRect.top + menuRect.height / 2);
  const topEl = document.elementFromPoint(cx, cy);
  menuBox.hit = topEl ? (topEl.closest('.dropdown-menu') ? 'menu' : topEl.className || topEl.tagName) : 'none';
  const helper = window.__PATCHOULI_HELPER__;
  const bytes = await helper.buildZip([
    { path: 'data/xmod/patchouli_books/b/book.json', data: '{"name":"X Book","landing_text":"hi"}' },
    { path: 'assets/xmod/patchouli_books/b/en_us/entries/a.json', data: '{"name":"A","icon":"minecraft:paper","category":"xmod:c","pages":[]}' },
  ]);
  const entries = helper.zipReader.listZipEntries(bytes);
  const books = helper.zipReader.findBooks(entries);
  const first = await helper.zipReader.readZipEntry(bytes, entries[0]);
  return { items, books, firstText: new TextDecoder().decode(first), menuBox };
})()`);
const mb = jarCheck.menuBox || {};
check(
  '下拉菜单浮在最上层（不被编辑区/预览盖住）',
  (jarCheck.menuBox || {}).hit === 'menu' && (jarCheck.menuBox || {}).parent === 'BODY',
  JSON.stringify({ hit: (jarCheck.menuBox || {}).hit, parent: (jarCheck.menuBox || {}).parent, z: (jarCheck.menuBox || {}).zIndex }),
);
check(
  '导入下拉菜单完整可见（不被顶栏裁切）',
  mb.position === 'fixed' &&
    mb.display !== 'none' &&
    mb.height > 40 &&
    mb.top >= 0 &&
    mb.bottom <= (mb.vh || 0) + 1 &&
    mb.right <= (mb.vw || 0) + 1,
  JSON.stringify(mb),
);
check(
  'Jar 导入菜单存在',
  jarCheck.items.includes('import-jar') && jarCheck.items.includes('import-book'),
  JSON.stringify(jarCheck.items),
);
check(
  '页面内可解析 jar（deflate 解压正常）',
  jarCheck.books.length === 1 && /name/.test(jarCheck.firstText),
  JSON.stringify(jarCheck.books),
);

const shot = await send('Page.captureScreenshot', { format: 'png' });
await writeFile(SHOT.replace(/\.png$/, '-json.png'), Buffer.from(shot.data, 'base64'));

// 端到端：导入含中英双语的 jar → 切到简体中文 → 预览应显示中文
const multiLang = await evaluate(`(async () => {
  const helper = window.__PATCHOULI_HELPER__;
  const files = [
    { path: 'data/ml/patchouli_books/guide/book.json', data: JSON.stringify({ name: 'Guide', landing_text: 'Hi', use_resource_pack: true }) },
    { path: 'assets/ml/patchouli_books/guide/en_us/categories/basics.json', data: JSON.stringify({ name: 'Basics', description: 'en', icon: 'minecraft:book' }) },
    { path: 'assets/ml/patchouli_books/guide/zh_cn/categories/basics.json', data: JSON.stringify({ name: '基础', description: '中文', icon: 'minecraft:book' }) },
    { path: 'assets/ml/patchouli_books/guide/en_us/entries/intro.json', data: JSON.stringify({ name: 'Intro', icon: 'minecraft:paper', category: 'ml:basics', pages: [{ type: 'patchouli:text', title: 'Start', text: 'English body' }] }) },
    { path: 'assets/ml/patchouli_books/guide/zh_cn/entries/intro.json', data: JSON.stringify({ name: '简介', icon: 'minecraft:paper', category: 'ml:basics', pages: [{ type: 'patchouli:text', title: '开始', text: '中文正文' }] }) },
  ];
  const { project } = helper.importBookFiles(files);
  helper.store.replaceProject(project);
  await new Promise((r) => setTimeout(r, 300));
  const zhBtn = [...document.querySelectorAll('#lang-switch button')].find((b) => b.textContent.includes('简中'));
  if (!zhBtn) return { error: '没有简体中文按钮', langs: [...document.querySelectorAll('#lang-switch button')].map((b) => b.textContent) };
  zhBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  const firstEntry = document.querySelector('#tree .tree-entry');
  firstEntry?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 350));
  const bookText = document.querySelector('#preview-body .book')?.innerText || '';
  return { lang: document.getElementById('status-lang')?.textContent, bookText: bookText.replace(/\\s+/g, ' ').slice(0, 120) };
})()`);
check(
  '导入双语书籍后切简体中文，预览显示中文',
  String(multiLang.lang || '').startsWith('zh_cn') && multiLang.bookText.includes('中文正文'),
  JSON.stringify(multiLang),
);

// 翻译完成度：全译的书必须是 100%（用户会说「我中文明明全做了」），
// 缺一条时要能点出「未翻译清单」，且编辑框不能把 en_us 冒充成译文。
const coverageCheck = await evaluate(`(async () => {
  const helper = window.__PATCHOULI_HELPER__;
  const B = 'assets/cv/patchouli_books/guide';
  const files = [{ path: 'data/cv/patchouli_books/guide/book.json', data: JSON.stringify({ name: 'Guide', landing_text: 'Hi', use_resource_pack: true }) }];
  const push = (path, data) => files.push({ path, data: JSON.stringify(data) });
  for (const lang of ['en_us', 'zh_cn']) {
    const zh = lang === 'zh_cn';
    push(B + '/' + lang + '/categories/machines.json', { name: zh ? '机器' : 'Machines', description: zh ? '各种机器' : 'All machines', icon: 'minecraft:furnace' });
    for (const [id, cn, en] of [['press', '压机', 'Presser'], ['mixer', '搅拌机', 'Mixer']]) {
      push(B + '/' + lang + '/entries/' + id + '.json', {
        name: zh ? cn : en,
        icon: 'minecraft:iron_block',
        category: 'cv:machines',
        pages: [{ type: 'patchouli:text', text: zh ? cn + '的正文' : en + ' body' }],
      });
    }
  }
  const full = helper.importBookFiles(files).project;
  helper.store.replaceProject(full);
  await new Promise((r) => setTimeout(r, 300));
  [...document.querySelectorAll('#lang-switch button')].find((b) => b.textContent.includes('简中'))?.click();
  await new Promise((r) => setTimeout(r, 300));
  const fullState = {
    status: document.getElementById('status-lang')?.textContent,
    notice: Boolean(document.getElementById('i18n-notice')),
    tags: [...document.querySelectorAll('.tree-node .tag')].map((t) => t.textContent),
    coverage: helper.langCoverage().zh_cn,
  };

  // 抽掉一条中文译文 → 应出现提示条 + 未译标签 + 明细弹窗
  const proj = helper.store.state.project;
  const mixer = proj.entries.find((e) => e.id === 'mixer');
  mixer.data.name.zh_cn = '';
  mixer.pages[0].data.text.zh_cn = '';
  helper.store.setUi({ selection: { kind: 'entry', id: 'press' }, previewPage: 0 }, 'selection');
  await new Promise((r) => setTimeout(r, 300));
  const partial = {
    status: document.getElementById('status-lang')?.textContent,
    noticeText: document.getElementById('i18n-notice')?.innerText.replace(/\\s+/g, ' ').trim() || null,
    tags: [...document.querySelectorAll('.tree-node .tag')].map((t) => t.textContent),
  };
  [...document.querySelectorAll('#i18n-notice .btn')].find((b) => b.textContent.includes('明细'))?.click();
  await new Promise((r) => setTimeout(r, 200));
  const modalState = {
    title: document.querySelector('.modal-head h3')?.textContent || null,
    rows: [...document.querySelectorAll('.problem-list .problem')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim()),
  };
  document.querySelector('.modal-head .icon-btn')?.click();
  await new Promise((r) => setTimeout(r, 150));

  // 只缺「名称」：仍算已译，但编辑框留空并提示 en_us
  const press = proj.entries.find((e) => e.id === 'press');
  press.data.name.zh_cn = '';
  helper.store.setUi({ selection: { kind: 'entry', id: 'press' }, previewPage: 0 }, 'selection');
  await new Promise((r) => setTimeout(r, 300));
  const nameInput = [...document.querySelectorAll('.editor .field')].find((f) => f.dataset.fieldKey === 'name')?.querySelector('input');
  const half = {
    status: document.getElementById('status-lang')?.textContent,
    value: nameInput?.value,
    placeholder: nameInput?.getAttribute('placeholder'),
  };
  return { fullState, partial, modalState, half };
})()`);

check(
  '全译书籍覆盖率为 100%（不误报缺翻译）',
  coverageCheck.fullState?.coverage?.done === coverageCheck.fullState?.coverage?.total &&
    coverageCheck.fullState.coverage.total > 0 &&
    String(coverageCheck.fullState.status || '').includes('100%') &&
    coverageCheck.fullState.notice === false &&
    (coverageCheck.fullState.tags || []).length === 0,
  JSON.stringify(coverageCheck.fullState),
);
check(
  '缺一条译文后出现提示条与「未译」标签',
  Boolean(coverageCheck.partial?.noticeText) &&
    (coverageCheck.partial.tags || []).includes('未译') &&
    /%/.test(coverageCheck.partial.status || '') && !String(coverageCheck.partial.status).includes('100%'),
  JSON.stringify(coverageCheck.partial),
);
check(
  '「查看明细」列出未翻译条目',
  /未翻译清单/.test(coverageCheck.modalState?.title || '') &&
    (coverageCheck.modalState.rows || []).some((r) => r.includes('mixer')),
  JSON.stringify(coverageCheck.modalState),
);
check(
  '未翻译字段的输入框留空并提示 en_us（不冒充译文）',
  coverageCheck.half?.value === '' && /en_us/.test(coverageCheck.half?.placeholder || ''),
  JSON.stringify(coverageCheck.half),
);

check('无未捕获异常', exceptions.length === 0, exceptions.slice(0, 3).join(' | '));
check('无 console.error', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? '  — ' + item.detail : ''}`);
}
console.log(`\n截图：${SHOT}`);
if (failed.length) {
  console.log(`\n${failed.length} 项失败`);
  process.exitCode = 1;
} else {
  console.log('\n全部通过');
}

ws.close();
cleanup();
process.exit(process.exitCode || 0);

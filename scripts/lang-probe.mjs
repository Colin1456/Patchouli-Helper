// 临时诊断脚本：导入多语言书籍并切到 zh_cn，导出界面各处实际显示的语言情况。
// 用法：node scripts/lang-probe.mjs [url]
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2] || 'file:///C:/Users/Colin/Desktop/Patchouli-Helper/dist/Patchouli-Helper.html';
const PORT = 9388;
const browser = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

const child = spawn(browser, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });
let page = null;
for (let i = 0; i < 40 && !page; i++) {
  try {
    page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page');
  } catch {
    /* retry */
  }
  if (!page) await sleep(250);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 1;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = id++;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const evaluate = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true })).result?.result?.value;

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url });
await sleep(2500);

const result = await evaluate(`(async () => {
  window.__err = [];
  window.addEventListener('error', (e) => window.__err.push(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => window.__err.push('rej:' + String(e.reason)));
  const helper = window.__PATCHOULI_HELPER__;
  const B = 'assets/ml/patchouli_books/guide';
  const D = 'data/ml/patchouli_books/guide';
  const files = [
    { path: D + '/book.json', data: JSON.stringify({ name: 'Guide', landing_text: 'Hi', use_resource_pack: true }) },
    { path: B + '/en_us/categories/basics.json', data: JSON.stringify({ name: 'Basics', description: 'en desc', icon: 'minecraft:book' }) },
    { path: B + '/zh_cn/categories/basics.json', data: JSON.stringify({ name: '基础', description: '中文描述', icon: 'minecraft:book' }) },
    { path: B + '/zh_tw/categories/basics.json', data: JSON.stringify({ name: '基礎', description: '繁體描述', icon: 'minecraft:book' }) },
    { path: B + '/en_us/entries/intro.json', data: JSON.stringify({ name: 'Intro', icon: 'minecraft:paper', category: 'ml:basics', pages: [{ type: 'patchouli:text', title: 'Start', text: 'English body' }] }) },
    { path: B + '/zh_cn/entries/intro.json', data: JSON.stringify({ name: '简介', icon: 'minecraft:paper', category: 'ml:basics', pages: [{ type: 'patchouli:text', title: '开始', text: '中文正文' }] }) },
    { path: B + '/en_us/entries/second.json', data: JSON.stringify({ name: 'Second', icon: 'minecraft:stone', category: 'ml:basics', pages: [{ type: 'patchouli:text', text: 'English only entry' }] }) },
  ];
  const { project } = helper.importBookFiles(files);
  helper.store.replaceProject(project);
  await new Promise((r) => setTimeout(r, 350));

  const snap = () => ({
    chips: [...document.querySelectorAll('#lang-switch button')].map((b) => ({ text: b.textContent.trim(), cls: b.className })),
    statusLang: document.getElementById('status-lang')?.textContent,
    brandSub: document.getElementById('brand-sub')?.textContent,
    treeBook: document.querySelector('.tree-book .meta strong')?.textContent,
    treeNodes: [...document.querySelectorAll('.tree-node .node-title')].map((n) => n.innerText.replace(/\\s+/g, ' ').trim()),
    treeTags: [...document.querySelectorAll('.tree-node .tag')].map((t) => t.textContent),
    notice: document.getElementById('i18n-notice')?.innerText.replace(/\\s+/g, ' ').trim() || null,
    toasts: [...document.querySelectorAll('.toast')].map((t) => t.innerText.replace(/\\s+/g, ' ').trim()),
  });

  const before = snap();
  const chips = [...document.querySelectorAll('#lang-switch button')];
  const zh = chips.find((b) => b.textContent.includes('简中'));
  zh?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  const afterSwitch = snap();

  document.querySelectorAll('.tree-node.tree-entry')[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 350));
  const entryView = {
    editorHeader: document.querySelector('.editor .card-head h3')?.textContent,
    fields: [...document.querySelectorAll('.editor .field > label')].slice(0, 4).map((l) => l.innerText.replace(/\\s+/g, ' ').trim()),
    inputValues: [...document.querySelectorAll('.editor input[type="text"], .editor textarea')].slice(0, 6).map((el) => (el.value || '').slice(0, 30)),
    preview: document.querySelector('#preview-body .book')?.innerText.replace(/\\s+/g, ' ').slice(0, 80),
  };

  // 第二本书（只有英文）在 zh_cn 下是什么样
  document.querySelectorAll('.tree-node.tree-entry')[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 300));
  const secondEntry = {
    header: document.querySelector('.editor .card-head h3')?.textContent,
    hints: [...document.querySelectorAll('.editor .field .help')].map((el) => el.innerText.replace(/\\s+/g, ' ').trim()),
    preview: document.querySelector('#preview-body .book')?.innerText.replace(/\\s+/g, ' ').slice(0, 80),
  };

  // 零译文的语言：繁中
  const tw = [...document.querySelectorAll('#lang-switch button')].find((b) => b.textContent.includes('繁中'));
  tw?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 350));
  const zeroLang = {
    ...snap(),
    entryHints: [...document.querySelectorAll('.editor .field .help')].map((el) => el.innerText.replace(/\\s+/g, ' ').trim()),
  };

  // 明细弹窗
  const detailBtn = [...document.querySelectorAll('#i18n-notice .btn')].find((b) => b.textContent.includes('明细'));
  detailBtn?.click();
  await new Promise((r) => setTimeout(r, 250));
  const detailModal = {
    buttons: [...document.querySelectorAll('#i18n-notice .btn')].map((b) => b.textContent),
    title: document.querySelector('.modal-head h3')?.textContent || null,
    note: document.querySelector('.problem-list .help')?.innerText.replace(/\\s+/g, ' ').trim() || null,
    rows: [...document.querySelectorAll('.problem-list .problem')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim()),
    backdrops: document.querySelectorAll('.modal-backdrop').length,
  };
  document.querySelector('.modal-head .icon-btn')?.click();
  await new Promise((r) => setTimeout(r, 200));

  // 全译场景：模拟「我中文明明全做了」的模组
  const fullFiles = [];
  const push = (path, data) => fullFiles.push({ path, data: JSON.stringify(data) });
  push(D + '/book.json', { name: 'Guide', landing_text: 'Hi', use_resource_pack: true });
  for (const lang of ['en_us', 'zh_cn']) {
    const zh = lang === 'zh_cn';
    push(B + '/' + lang + '/categories/machines.json', {
      name: zh ? '机器' : 'Machines',
      description: zh ? '各种机器' : 'All machines',
      icon: 'minecraft:furnace',
    });
    for (const [id, cn, en] of [['press', '压机', 'Presser'], ['mixer', '搅拌机', 'Mixer']]) {
      push(B + '/' + lang + '/entries/' + id + '.json', {
        name: zh ? cn : en,
        icon: 'minecraft:iron_block',
        category: 'ml:machines',
        pages: [{ type: 'patchouli:text', text: zh ? cn + '的正文' : en + ' body' }],
      });
    }
  }
  const full = helper.importBookFiles(fullFiles).project;
  helper.store.replaceProject(full);
  await new Promise((r) => setTimeout(r, 350));
  const fullZoom = {};
  [...document.querySelectorAll('#lang-switch button')].find((b) => b.textContent.includes('简中'))?.click();
  await new Promise((r) => setTimeout(r, 350));
  const fullZhSnap = {
    statusLang: document.getElementById('status-lang')?.textContent,
    notice: document.getElementById('i18n-notice')?.innerText.replace(/\\s+/g, ' ').trim() || null,
    treeTags: [...document.querySelectorAll('.tree-node .tag')].map((t) => t.textContent),
    chipClasses: [...document.querySelectorAll('#lang-switch button')].map((b) => b.textContent.trim() + ':' + b.className),
    coverage: helper.langCoverage(),
  };

  // 半翻译：整条有译文但缺「名称」——仍算已译，编辑框空着 + en_us 占位
  const proj = helper.store.state.project;
  const press = proj.entries.find((e) => e.id === 'press');
  press.data.name.zh_cn = '';
  helper.store.setUi({ selection: { kind: 'entry', id: 'press' }, previewPage: 0 }, 'selection');
  await new Promise((r) => setTimeout(r, 300));
  const nameInput = [...document.querySelectorAll('.editor .field')]
    .find((f) => f.dataset.fieldKey === 'name')
    ?.querySelector('input');
  const halfDone = {
    statusLang: document.getElementById('status-lang')?.textContent,
    notice: document.getElementById('i18n-notice')?.innerText.replace(/\\s+/g, ' ').trim() || null,
    treeTags: [...document.querySelectorAll('.tree-node .tag')].map((t) => t.textContent),
    nameValue: nameInput?.value,
    namePlaceholder: nameInput?.getAttribute('placeholder'),
    preview: document.querySelector('#preview-body .book')?.innerText.replace(/\\s+/g, ' ').slice(0, 60),
    errors: window.__err.slice(0, 4),
  };

  return { before, afterSwitch, entryView, secondEntry, zeroLang, detailModal, fullZhSnap, halfDone };
})()`);

console.log(JSON.stringify(result, null, 2));
child.kill();
process.exit(0);

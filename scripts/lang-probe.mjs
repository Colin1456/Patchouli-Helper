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
  const zeroLang = { ...snap(), entryHints: [...document.querySelectorAll('.editor .field .help')].map((el) => el.innerText.replace(/\\s+/g, ' ').trim()) };

  return { before, afterSwitch, entryView, secondEntry, zeroLang };
})()`);

console.log(JSON.stringify(result, null, 2));
child.kill();
process.exit(0);

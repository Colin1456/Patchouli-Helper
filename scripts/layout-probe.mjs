// 检查不同视口宽度下 .layout 的实际分栏情况（是否横排、是否溢出/被裁切）
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2] || 'file:///C:/Users/Colin/Desktop/Patchouli-Helper/dist/Patchouli-Helper.html';
const PORT = 9370;
const browser = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

const child = spawn(browser, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });
let page = null;
for (let i = 0; i < 40 && !page; i++) {
  try {
    page = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((t) => t.type === 'page');
  } catch { /* retry */ }
  if (!page) await sleep(250);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 1;
const pending = new Map();
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((res) => { const i = id++; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result?.result?.value;

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url });
await sleep(2200);

const probe = `JSON.stringify((() => {
  const layout = document.querySelector('.layout');
  const kids = [...layout.children].map((el) => ({
    cls: el.className,
    x: Math.round(el.getBoundingClientRect().x),
    w: Math.round(el.getBoundingClientRect().width),
    h: Math.round(el.getBoundingClientRect().height),
  }));
  const cs = getComputedStyle(layout);
  return {
    vw: innerWidth,
    layoutW: Math.round(layout.getBoundingClientRect().width),
    cols: cs.gridTemplateColumns,
    scrollW: layout.scrollWidth,
    overflowX: cs.overflowX,
    kids,
  };
})())`;

for (const [w, h] of [[1500, 900], [1200, 760], [1000, 700], [900, 600], [760, 600], [600, 800], [420, 800]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await sleep(320);
  const data = JSON.parse(await evaluate(probe));
  const scrollable = data.scrollW > data.layoutW + 1;
  const last = data.kids[data.kids.length - 1];
  const reachable = last.x + last.w <= data.scrollW + 1;
  console.log(`\n--- viewport ${w}x${h} ---`);
  console.log(`grid: ${data.cols}`);
  console.log(
    `layout ${data.layoutW}px, scrollWidth ${data.scrollW}px, overflowX ${data.overflowX} ` +
      (scrollable ? `→ 横向滚动可用${reachable ? '，三栏都能滚到 ✓' : '，但有一栏滚不到 ✗'}` : '→ 一屏放得下 ✓'),
  );
  console.log('children:', data.kids.map((k) => `${k.cls.split(' ')[0]}(${k.w}px@${k.x})`).join('  '));
}
await send('Emulation.clearDeviceMetricsOverride');
child.kill();
process.exit(0);

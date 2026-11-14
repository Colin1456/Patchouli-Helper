// Debug helper: loads a URL in headless Edge, prints console output, uncaught
// exceptions (with location) and a few DOM facts. Usage: node scripts/debug-page.mjs <url>

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.argv[2];
const PORT = 9355;
const CANDIDATES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
];
const browser = CANDIDATES.find((p) => existsSync(p));
const child = spawn(browser, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', `--remote-debugging-port=${PORT}`, 'about:blank'], { stdio: 'ignore' });

let page = null;
for (let i = 0; i < 40 && !page; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    page = list.find((t) => t.type === 'page');
  } catch {
    /* retry */
  }
  if (!page) await sleep(250);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let id = 1;
const pending = new Map();
const events = [];
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    events.push(`EXC ${d.text} ${d.exception?.description || ''} @ line ${d.lineNumber}:${d.columnNumber} ${d.url || ''}`);
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    events.push(`CONSOLE ${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  }
});

const send = (method, params = {}) =>
  new Promise((resolve) => {
    const msgId = id++;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url });
await sleep(3000);

const state = await send('Runtime.evaluate', {
  expression: `JSON.stringify({
    helper: typeof window.__PATCHOULI_HELPER__,
    tree: document.querySelectorAll('#tree .tree-node').length,
    cards: document.querySelectorAll('#editor .card').length,
    pages: document.querySelectorAll('.book-page').length,
    scripts: [...document.scripts].map((s) => ({ src: s.src || '(inline)', len: s.textContent.length })),
    styles: document.querySelectorAll('style').length,
  })`,
  returnByValue: true,
});
console.log('STATE', state.result?.result?.value);
console.log(events.slice(0, 6).join('\n'));

child.kill();
process.exit(0);

// Verifies the *real* Tauri app: launches the built binary with WebView2 remote
// debugging enabled, then checks rendering + native IPC (file write, read, zip).
//
// Usage: node scripts/app-check.mjs <path-to-exe> [out-file]

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const exe = process.argv[2];
const outFile = process.argv[3] || 'app-check.json';
const PORT = 9224;

if (!exe || !existsSync(exe)) {
  console.error('usage: node scripts/app-check.mjs <path-to-exe>');
  process.exit(2);
}

const child = spawn(exe, [], {
  env: {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}`,
    // Inside restricted sandboxes WebView2 cannot create %LOCALAPPDATA%\<id>, so
    // keep its profile next to the project instead.
    WEBVIEW2_USER_DATA_FOLDER: process.env.WEBVIEW2_USER_DATA_FOLDER || join(process.cwd(), '.webview-data'),
  },
  stdio: 'ignore',
  detached: false,
});
const cleanup = () => {
  try {
    child.kill();
  } catch {
    /* ignore */
  }
};
process.on('exit', cleanup);

async function pageTarget() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((item) => item.type === 'page' && /tauri|localhost/.test(item.url));
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  throw new Error('WebView2 remote debugging endpoint never came up');
}

const target = await pageTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});

let id = 1;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
    return;
  }
  if (message.method === 'Runtime.exceptionThrown') {
    errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    errors.push(message.params.args.map((a) => a.value ?? a.description).join(' '));
  }
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const messageId = id++;
    pending.set(messageId, { resolve, reject });
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result?.value;
};

await send('Runtime.enable');
await send('Page.enable');
await sleep(2500);

const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const env = await evaluate(`(() => {
  const book = document.querySelector('#preview-body .book');
  const rect = book?.getBoundingClientRect();
  return {
    tauri: typeof window.__TAURI__,
    invoke: typeof window.__TAURI__?.core?.invoke,
    dialog: typeof window.__TAURI__?.dialog?.open,
    app: typeof window.__PATCHOULI_HELPER__,
    treeNodes: document.querySelectorAll('#tree .tree-node').length,
    cards: document.querySelectorAll('#editor .card').length,
    pages: document.querySelectorAll('#preview-body .book-page').length,
    status: document.getElementById('status-project')?.textContent,
    splitters: document.querySelectorAll('.splitter').length,
    viewport: { w: innerWidth, h: innerHeight },
    bookRect: rect ? { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } : null,
  };
})()`);

check('Tauri IPC 可用', env.invoke === 'function', `__TAURI__=${env.tauri}`);
check('原生对话框插件已注册', env.dialog === 'function', `dialog.open=${env.dialog}`);
check('界面已渲染', env.treeNodes >= 2 && env.cards >= 3 && env.pages === 2, JSON.stringify({ tree: env.treeNodes, cards: env.cards, pages: env.pages }));
check('分栏拖拽条存在', env.splitters === 2, `splitters=${env.splitters}`);
check(
  '默认窗口内书页完整可见',
  Boolean(env.bookRect)
    && env.bookRect.w > 300
    && env.bookRect.x >= 0
    && env.bookRect.x + env.bookRect.w <= env.viewport.w + 1
    && env.bookRect.y + env.bookRect.h <= env.viewport.h + 1,
  JSON.stringify({ book: env.bookRect, viewport: env.viewport }),
);

// --- native file IO round trip --------------------------------------------
// keep the probe inside the project so confined sandboxes allow the write
const tempDir = join(process.cwd(), '.app-check');
await mkdir(tempDir, { recursive: true }).catch(() => {});
const probePath = join(tempDir, 'probe.txt');

const writeOk = await evaluate(`(async () => {
  try {
    await window.__TAURI__.core.invoke('write_text_file', { path: ${JSON.stringify(probePath)}, contents: 'hello 帕秋莉' });
    return true;
  } catch (error) { return String(error); }
})()`);
check('写入文件（自定义命令）', writeOk === true, String(writeOk));

const readBack = await evaluate(`(async () => {
  try { return await window.__TAURI__.core.invoke('read_text_file', { path: ${JSON.stringify(probePath)} }); }
  catch (error) { return 'ERR ' + String(error); }
})()`);
check('读回文件内容', readBack === 'hello 帕秋莉', String(readBack));

// --- zip export through the real backend ----------------------------------
const zipResult = await evaluate(`(async () => {
  try {
    const helper = window.__PATCHOULI_HELPER__;
    const plan = helper.buildExport(helper.store.state.project, { mode: 'resourcepack' });
    const entries = plan.resourcePackFiles.map((file) => ({
      path: file.path,
      data: file.base64 ? Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0)) : file.data,
    }));
    const bytes = await helper.buildZip(entries);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    const b64 = btoa(binary);
    await window.__TAURI__.core.invoke('write_files', {
      root: ${JSON.stringify(tempDir)},
      files: [{ path: 'export-resourcepack.zip', data: b64, base64: true }],
    });
    return { size: bytes.length, files: plan.resourcePackFiles.length };
  } catch (error) {
    return { error: String(error), stack: (error && error.stack) || '' };
  }
})()`);

check('在桌面端生成 zip', zipResult?.size > 200, JSON.stringify({ size: zipResult?.size, files: zipResult?.files }));

const zipPath = join(tempDir, 'export-resourcepack.zip');
let zipOnDisk = [];
try {
  const bytes = await readFile(zipPath);
  zipOnDisk = ['zip 文件已落盘 ' + bytes.length + ' 字节'];
} catch (error) {
  zipOnDisk = ['zip 缺失: ' + error.message];
}
check('zip 存在于磁盘', zipOnDisk[0].includes('已落盘'), zipOnDisk[0]);

check('无运行期异常', errors.length === 0, errors.slice(0, 3).join(' | '));

// screenshot of the real window for the docs
const shot = await send('Page.captureScreenshot', { format: 'png' });
const shotPath = join(process.cwd(), 'docs', 'screenshot.png');
await writeFile(shotPath, Buffer.from(shot.data, 'base64')).catch(() => {});
console.log(`截图：${shotPath}`);

for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? '  — ' + item.detail : ''}`);
}

const report = { checks, errors, tempDir, zipPath };
await writeFile(outFile, JSON.stringify(report, null, 2));
console.log(`\n报告：${outFile}`);
console.log(`临时目录：${tempDir}`);

ws.close();
cleanup();
process.exit(checks.every((item) => item.ok) ? 0 : 1);

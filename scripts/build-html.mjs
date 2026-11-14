// Bundles the whole editor into ONE self-contained .html file.
// Double-click it in any modern browser - no server, no install, no Node.
//
//   node scripts/build-html.mjs [outFile]
//
// Everything (CSS, JS, icon) is inlined; the page works from file:// as well.

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outFile = process.argv[2] || join(root, 'dist', 'Patchouli-Helper.html');

const read = (rel) => readFile(join(root, rel), 'utf8');

const [html, css] = await Promise.all([read('web/index.html'), read('web/css/app.css')]);

// --- JS: bundle ES modules into one classic script ---------------------------
const bundle = await build({
  entryPoints: [join(root, 'web/js/main.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome100', 'firefox110', 'safari15'],
  minify: true,
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
});
const js = bundle.outputFiles[0].text;

// --- icon as data URI --------------------------------------------------------
let favicon = '';
const iconPath = join(root, 'web/assets/icon-128.png');
if (existsSync(iconPath)) {
  const icon = await readFile(iconPath);
  favicon = `data:image/png;base64,${icon.toString('base64')}`;
}

// --- assemble ---------------------------------------------------------------
let out = html
  .replace(/[ \t]*<link rel="stylesheet"[^>]*>\s*\n/, '')
  .replace(/[ \t]*<link rel="icon"[^>]*>\s*\n/, '')
  .replace(/[ \t]*<script type="module"[^>]*><\/script>\s*\n/, '');

const head = [
  favicon ? `    <link rel="icon" href="${favicon}" />` : '',
  '    <style>',
  css,
  '    </style>',
].filter(Boolean).join('\n');

const script = [
  '    <script>',
  '    /*! Patchouli Helper - 单文件版（由 scripts/build-html.mjs 生成，请勿手改） */',
  js,
  '    </script>',
].join('\n');

// NOTE: replacements must be functions - the minified JS is full of `$&`/`$'`
// sequences that String.replace would otherwise expand into the match text.
out = out.replace('</head>', () => `${head}\n  </head>`);
out = out.replace('  </body>', () => `${script}\n  </body>`);

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, out, 'utf8');

const sizeKb = (Buffer.byteLength(out) / 1024).toFixed(0);
console.log(`[ok] ${outFile}  (${sizeKb} KB, 单文件，双击即可用)`);

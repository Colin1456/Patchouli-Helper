// 浏览器文件读写：全部走标准 File / Blob API，不依赖任何原生桥接。
// 因此 http:// 与 file://（双击打开单文件）两种场景行为一致。

import { base64ToBytes } from './util.js';

export const decodeBase64 = base64ToBytes;

/** 触发浏览器下载。bytes 可以是 Uint8Array / ArrayBuffer / 字符串。 */
export function downloadBytes(bytes, filename, mime = 'application/octet-stream') {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export const downloadText = (text, filename, mime = 'text/plain;charset=utf-8') =>
  downloadBytes(text, filename, mime);

/** 打开系统文件选择框，返回 File（multiple=false）或 File[]。取消时返回 null / []。 */
export function pickBrowserFile({ accept = '', multiple = false } = {}) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (accept) input.accept = accept;
    input.multiple = multiple;
    input.addEventListener('change', () => {
      const files = input.files;
      if (!files || !files.length) return resolve(multiple ? [] : null);
      return resolve(multiple ? [...files] : files[0]);
    });
    input.addEventListener('cancel', () => resolve(multiple ? [] : null));
    input.click();
  });
}

/** 打开目录选择框（webkitdirectory），返回 File[]。 */
export function pickBrowserFolder() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.addEventListener('change', () => resolve([...(input.files || [])]));
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}

/** File → base64（不带 data: 前缀）。 */
export async function readFileBase64(file) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buffer.length; i += 0x8000) {
    binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** 目录选择结果 → [{path, data, base64}]，文本文件直接给字符串。 */
export async function readBrowserFolder(fileList) {
  const files = [];
  for (const file of fileList) {
    const path = file.webkitRelativePath || file.name;
    const isBinary = !/\.(json|mcmeta|txt|md|toml|lang)$/i.test(path);
    if (isBinary) {
      files.push({ path, data: await readFileBase64(file), base64: true });
    } else {
      files.push({ path, data: await file.text() });
    }
  }
  return files;
}

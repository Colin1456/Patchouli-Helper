// File system + dialog access.
//
// Desktop (Tauri): native dialogs + real file IO through the Rust commands.
// Browser: everything degrades to import/export through ordinary file inputs,
// which keeps `npm run dev` usable for UI work.

import { base64ToBytes } from './util.js';

const tauri = () => globalThis.__TAURI__;

export const isDesktop = () => Boolean(tauri()?.core?.invoke);

const invoke = async (cmd, args) => {
  const api = tauri();
  if (!api?.core?.invoke) throw new Error('此操作需要在桌面版中运行');
  return api.core.invoke(cmd, args);
};

export async function pickFolder({ title = '选择文件夹', defaultPath } = {}) {
  const api = tauri();
  if (!api?.dialog?.open) return null;
  const selected = await api.dialog.open({ directory: true, multiple: false, title, defaultPath });
  return typeof selected === 'string' ? selected : null;
}

export async function pickFile({ title = '选择文件', filters = [], defaultPath } = {}) {
  const api = tauri();
  if (!api?.dialog?.open) return null;
  const selected = await api.dialog.open({
    directory: false,
    multiple: false,
    title,
    defaultPath,
    filters: filters.map((f) => ({ name: f.name, extensions: f.extensions })),
  });
  return typeof selected === 'string' ? selected : null;
}

export async function pickSaveFile({ title = '保存', defaultPath, filters = [] } = {}) {
  const api = tauri();
  if (!api?.dialog?.save) return null;
  return api.dialog.save({
    title,
    defaultPath,
    filters: filters.map((f) => ({ name: f.name, extensions: f.extensions })),
  });
}

export async function messageDialog(text, { title = 'Patchouli Helper', kind = 'info' } = {}) {
  const api = tauri();
  if (api?.dialog?.message) return api.dialog.message(text, { title, kind });
  console.log(`[${title}] ${text}`);
}

export async function confirmDialog(text, { title = '确认' } = {}) {
  const api = tauri();
  if (api?.dialog?.ask) return api.dialog.ask(text, { title });
  return globalThis.confirm(text);
}

/* --------------------------------------------------------------- file IO */

export const readTextFile = (path) => invoke('read_text_file', { path });
export const readBase64File = (path) => invoke('read_file_base64', { path });
export const writeTextFile = (path, contents) => invoke('write_text_file', { path, contents });
export const listFiles = (root) => invoke('list_files', { root });
export const pathExists = (path) => invoke('path_exists', { path });
export const ensureDir = (path) => invoke('ensure_dir', { path });
export const revealPath = (path) => invoke('reveal_path', { path });

/** Writes many files below `root`. entries: [{path, data, base64?}] */
export async function writeFiles(root, files) {
  const payload = files.map((file) => ({
    path: file.path,
    data: file.data,
    base64: Boolean(file.base64),
  }));
  return invoke('write_files', { root, files: payload });
}

export function splitPath(fullPath) {
  const normalized = String(fullPath).replace(/\\/g, '/');
  const index = normalized.lastIndexOf('/');
  if (index === -1) return { dir: '.', name: normalized };
  return { dir: normalized.slice(0, index) || '/', name: normalized.slice(index + 1) };
}

/** Writes raw bytes to an absolute file path. */
export async function writeBinaryFile(fullPath, bytes) {
  const { dir, name } = splitPath(fullPath);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  await writeFiles(dir, [{ path: name, data: btoa(binary), base64: true }]);
  return fullPath;
}

/* ------------------------------------------------------- browser fallbacks */

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

export const decodeBase64 = base64ToBytes;

/** Reads a folder picked through <input webkitdirectory> into {path, data} pairs. */
export async function readBrowserFolder(fileList) {
  const files = [];
  for (const file of fileList) {
    const path = file.webkitRelativePath || file.name;
    const isBinary = !/\.(json|mcmeta|txt|md|toml|lang)$/i.test(path);
    if (isBinary) {
      const buffer = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let i = 0; i < buffer.length; i += 0x8000) {
        binary += String.fromCharCode(...buffer.subarray(i, i + 0x8000));
      }
      files.push({ path, data: btoa(binary), base64: true });
    } else {
      files.push({ path, data: await file.text() });
    }
  }
  return files;
}

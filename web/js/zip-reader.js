// 最小 ZIP 读取器：只解析中央目录 + 支持 STORED / DEFLATE，够读 .jar / .zip 资源包。
// 依赖浏览器内置 DecompressionStream('deflate-raw')（Chromium 80+ / Firefox 113+ / Safari 16.4+）。

const utf8 = new TextDecoder('utf-8');
const u16 = (view, offset) => view.getUint16(offset, true);
const u32 = (view, offset) => view.getUint32(offset, true);

/** 找到 EOCD（End Of Central Directory）记录的位置。 */
function findEocd(view) {
  const maxBack = Math.min(view.byteLength, 0xffff + 22);
  for (let i = view.byteLength - 22; i >= view.byteLength - maxBack; i--) {
    if (u32(view, i) === 0x06054b50) return i;
  }
  return -1;
}

/** 列出压缩包里的条目（不解析内容）。 */
export function listZipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEocd(view);
  if (eocd < 0) throw new Error('不是有效的 zip / jar 文件（找不到中央目录）');

  const total = u16(view, eocd + 10);
  let offset = u32(view, eocd + 16);
  const entries = [];

  for (let i = 0; i < total; i++) {
    if (u32(view, offset) !== 0x02014b50) throw new Error('zip 中央目录已损坏');
    const flags = u16(view, offset + 8);
    const method = u16(view, offset + 10);
    const compressedSize = u32(view, offset + 20);
    const size = u32(view, offset + 24);
    const nameLen = u16(view, offset + 28);
    const extraLen = u16(view, offset + 30);
    const commentLen = u16(view, offset + 32);
    const localOffset = u32(view, offset + 42);
    const name = utf8.decode(bytes.subarray(offset + 46, offset + 46 + nameLen));

    entries.push({ name, method, compressedSize, size, localOffset, flags });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('当前浏览器不支持解压（缺少 DecompressionStream），请用最新版 Edge / Chrome');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** 读取单个条目的原始字节。 */
export async function readZipEntry(bytes, entry) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (u32(view, entry.localOffset) !== 0x04034b50) throw new Error(`条目已损坏：${entry.name}`);
  const nameLen = u16(view, entry.localOffset + 26);
  const extraLen = u16(view, entry.localOffset + 28);
  const start = entry.localOffset + 30 + nameLen + extraLen;
  const raw = bytes.subarray(start, start + entry.compressedSize);

  if (entry.method === 0) return raw; // stored
  if (entry.method === 8) return inflateRaw(raw); // deflate
  throw new Error(`不支持的压缩方式 ${entry.method}：${entry.name}`);
}

/**
 * 读取整个压缩包。
 * @param {Uint8Array} bytes
 * @param {(name: string) => boolean} [filter] 只解析需要的条目
 * @returns {Promise<Map<string, Uint8Array>>}
 */
export async function readZip(bytes, filter = null) {
  const entries = listZipEntries(bytes);
  const out = new Map();
  for (const entry of entries) {
    if (entry.name.endsWith('/')) continue; // 目录
    if (filter && !filter(entry.name)) continue;
    out.set(entry.name, await readZipEntry(bytes, entry));
  }
  return out;
}

/** 判断一个压缩包内是否包含 Patchouli 书籍，返回 [{modid, bookId, root}]。 */
export function findBooks(entries) {
  const books = new Map();
  for (const { name } of entries) {
    const match = name.match(/^(?:.*\/)?(assets|data)\/([^/]+)\/patchouli_books\/([^/]+)\//);
    if (!match) continue;
    const [, , modid, bookId] = match;
    const key = `${modid}:${bookId}`;
    if (!books.has(key)) books.set(key, { modid, bookId, key });
  }
  return [...books.values()];
}

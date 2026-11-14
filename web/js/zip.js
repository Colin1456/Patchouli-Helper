// Minimal, dependency-free ZIP writer (deflate via CompressionStream when available).
// Used for exporting a Patchouli resource pack. Works in the Tauri WebView, in the
// browser, and in Node (for tests).

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const encoder = new TextEncoder();
export const utf8 = (str) => encoder.encode(str);

function dosDateTime(date) {
  const d = date instanceof Date ? date : new Date();
  const year = Math.max(1980, d.getFullYear());
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | (d.getSeconds() >> 1 & 0x1f);
  const day = (((year - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0x0f) << 5) | (d.getDate() & 0x1f);
  return { time, date: day };
}

class ByteWriter {
  constructor(size = 1 << 16) {
    this.buf = new Uint8Array(size);
    this.len = 0;
  }
  _grow(extra) {
    if (this.len + extra <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.len + extra) size *= 2;
    const next = new Uint8Array(size);
    next.set(this.buf.subarray(0, this.len));
    this.buf = next;
  }
  u16(v) {
    this._grow(2);
    this.buf[this.len++] = v & 0xff;
    this.buf[this.len++] = (v >>> 8) & 0xff;
  }
  u32(v) {
    this._grow(4);
    this.buf[this.len++] = v & 0xff;
    this.buf[this.len++] = (v >>> 8) & 0xff;
    this.buf[this.len++] = (v >>> 16) & 0xff;
    this.buf[this.len++] = (v >>> 24) & 0xff;
  }
  bytes(arr) {
    this._grow(arr.length);
    this.buf.set(arr, this.len);
    this.len += arr.length;
  }
  result() {
    return this.buf.subarray(0, this.len);
  }
}

async function deflateRaw(bytes) {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

/**
 * Builds a zip archive.
 * @param {{path: string, data: string|Uint8Array}[]} entries paths use forward slashes.
 * @returns {Promise<Uint8Array>}
 */
export async function buildZip(entries, { date = new Date() } = {}) {
  const { time, date: dosDate } = dosDateTime(date);
  const local = new ByteWriter(1 << 16);
  const central = new ByteWriter(1 << 14);
  let offset = 0;
  let used = 0;

  for (const entry of entries) {
    const name = entry.path.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!name || name.endsWith('/')) continue;
    const raw = typeof entry.data === 'string' ? utf8(entry.data) : entry.data;
    const crc = crc32(raw);
    const deflated = raw.length > 64 ? await deflateRaw(raw) : null;
    const useDeflate = deflated && deflated.length < raw.length;
    const payload = useDeflate ? deflated : raw;
    const method = useDeflate ? 8 : 0;
    const nameBytes = utf8(name);

    const headerStart = local.len;
    local.u32(0x04034b50);
    local.u16(20); // version needed
    local.u16(0x0800); // UTF-8 flag
    local.u16(method);
    local.u16(time);
    local.u16(dosDate);
    local.u32(crc);
    local.u32(payload.length);
    local.u32(raw.length);
    local.u16(nameBytes.length);
    local.u16(0);
    local.bytes(nameBytes);
    local.bytes(payload);

    central.u32(0x02014b50);
    central.u16(20); // version made by
    central.u16(20); // version needed
    central.u16(0x0800);
    central.u16(method);
    central.u16(time);
    central.u16(dosDate);
    central.u32(crc);
    central.u32(payload.length);
    central.u32(raw.length);
    central.u16(nameBytes.length);
    central.u16(0); // extra len
    central.u16(0); // comment len
    central.u16(0); // disk number
    central.u16(0); // internal attrs
    central.u32(0); // external attrs
    central.u32(offset);
    central.bytes(nameBytes);

    offset = local.len;
    used += 1;
    void headerStart;
  }

  const centralBytes = central.result();
  const localBytes = local.result();
  const end = new ByteWriter(32);
  end.u32(0x06054b50);
  end.u16(0);
  end.u16(0);
  end.u16(used);
  end.u16(used);
  end.u32(centralBytes.length);
  end.u32(localBytes.length);
  end.u16(0);

  const out = new Uint8Array(localBytes.length + centralBytes.length + end.len);
  out.set(localBytes, 0);
  out.set(centralBytes, localBytes.length);
  out.set(end.result(), localBytes.length + centralBytes.length);
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function u16(view, offset, value) { view.setUint16(offset, value, true); }
function u32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

export function buildStoredZip(entries) {
  const encoder = new TextEncoder();
  const normalized = entries.map(({ name, bytes }) => {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const filename = encoder.encode(name);
    return { filename, data, crc: crc32(data), offset: 0 };
  });
  let localSize = 0;
  for (const entry of normalized) localSize += 30 + entry.filename.length + entry.data.length;
  let centralSize = 0;
  for (const entry of normalized) centralSize += 46 + entry.filename.length;
  const output = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(output.buffer);
  let cursor = 0;
  for (const entry of normalized) {
    entry.offset = cursor;
    u32(view,cursor,0x04034b50); cursor+=4; u16(view,cursor,20); cursor+=2; u16(view,cursor,0x0800); cursor+=2;
    u16(view,cursor,0); cursor+=2; u16(view,cursor,0); cursor+=2; u16(view,cursor,33); cursor+=2;
    u32(view,cursor,entry.crc); cursor+=4; u32(view,cursor,entry.data.length); cursor+=4; u32(view,cursor,entry.data.length); cursor+=4;
    u16(view,cursor,entry.filename.length); cursor+=2; u16(view,cursor,0); cursor+=2;
    output.set(entry.filename,cursor); cursor+=entry.filename.length; output.set(entry.data,cursor); cursor+=entry.data.length;
  }
  const centralOffset = cursor;
  for (const entry of normalized) {
    u32(view,cursor,0x02014b50); cursor+=4; u16(view,cursor,20); cursor+=2; u16(view,cursor,20); cursor+=2; u16(view,cursor,0x0800); cursor+=2;
    u16(view,cursor,0); cursor+=2; u16(view,cursor,0); cursor+=2; u16(view,cursor,33); cursor+=2;
    u32(view,cursor,entry.crc); cursor+=4; u32(view,cursor,entry.data.length); cursor+=4; u32(view,cursor,entry.data.length); cursor+=4;
    u16(view,cursor,entry.filename.length); cursor+=2; u16(view,cursor,0); cursor+=2; u16(view,cursor,0); cursor+=2; u16(view,cursor,0); cursor+=2; u16(view,cursor,0); cursor+=2;
    u32(view,cursor,0); cursor+=4; u32(view,cursor,entry.offset); cursor+=4; output.set(entry.filename,cursor); cursor+=entry.filename.length;
  }
  const endOffset = cursor;
  u32(view,cursor,0x06054b50); cursor+=4; u16(view,cursor,0); cursor+=2; u16(view,cursor,0); cursor+=2;
  u16(view,cursor,normalized.length); cursor+=2; u16(view,cursor,normalized.length); cursor+=2;
  u32(view,cursor,endOffset-centralOffset); cursor+=4; u32(view,cursor,centralOffset); cursor+=4; u16(view,cursor,0);
  return output;
}

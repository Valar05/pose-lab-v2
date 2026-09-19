// Browser-local GIF89a encoder for Sprite Lab contact-sheet frames.
function word(value) { return [value & 255, (value >> 8) & 255]; }
function bytes(text) { return [...new TextEncoder().encode(text)]; }
function subBlocks(data) { const out = []; for (let offset = 0; offset < data.length; offset += 255) { const part = data.slice(offset, offset + 255); out.push(part.length, ...part); } return [...out, 0]; }
function palette() { const out = new Uint8Array(768); let index = 1; for (let r = 0; r < 5; r += 1) for (let g = 0; g < 7; g += 1) for (let b = 0; b < 7; b += 1) { out[index * 3] = Math.round(r * 255 / 4); out[index * 3 + 1] = Math.round(g * 255 / 6); out[index * 3 + 2] = Math.round(b * 255 / 6); index += 1; } return out; }
function indexed(canvas) { const { width, height } = canvas; const pixels = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, width, height).data; const out = new Uint8Array(width * height); for (let pixel = 0, offset = 0; pixel < out.length; pixel += 1, offset += 4) { if (pixels[offset + 3] < 128) continue; const r = Math.round(pixels[offset] * 4 / 255); const g = Math.round(pixels[offset + 1] * 6 / 255); const b = Math.round(pixels[offset + 2] * 6 / 255); out[pixel] = 1 + r * 49 + g * 7 + b; } return out; }
function lzw(input) {
  // Reliability-first GIF stream. Keep the code width fixed at 9 bits by
  // resetting before the decoder dictionary reaches the 10-bit boundary.
  // This is intentionally less compressed than a growing LZW dictionary,
  // but it is deterministic for full 512x512 Sprite Lab frames.
  const clear = 256, end = 257, codeSize = 9;
  let bitBuffer = 0, bitCount = 0;
  const output = [];
  const emit = (code) => {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(bitBuffer & 255);
      bitBuffer >>>= 8;
      bitCount -= 8;
    }
  };
  let offset = 0;
  while (offset < input.length) {
    emit(clear);
    const limit = Math.min(input.length, offset + 254);
    for (; offset < limit; offset += 1) emit(input[offset]);
  }
  emit(end);
  if (bitCount) output.push(bitBuffer & 255);
  return output;
}
function frameDelays(frames, delayMs) { const values = Array.isArray(delayMs) ? delayMs : frames.map(() => delayMs); if (values.length !== frames.length) throw new Error('Sprite Lab GIF timing must match the frame count.'); return values.map((value) => { const numeric = Number(value); return Math.max(1, Math.round((Number.isFinite(numeric) ? numeric : 100) / 10)); }); }
export function encodeGif(frames, delayMs) {
  if (!frames.length) throw new Error('Select at least one tile.');
  const width = frames[0].width, height = frames[0].height;
  if (!width || !height || frames.some((frame) => frame.width !== width || frame.height !== height)) {
    throw new Error('Sprite Lab needs same-size tiles.');
  }
  const delays = frameDelays(frames, delayMs);
  const out = [];
  const append = (values) => { for (const value of values) out.push(value); };
  append(bytes('GIF89a'));
  append(word(width));
  append(word(height));
  append([247, 0, 0]);
  append(palette());
  append([33, 255, 11]);
  append(bytes('NETSCAPE2.0'));
  append([3, 1, 0, 0, 0]);
  frames.forEach((frame, index) => {
    append([33, 249, 4, 9]);
    append(word(delays[index]));
    append([0, 0, 44, 0, 0, 0, 0]);
    append(word(width));
    append(word(height));
    append([0, 8]);
    append(subBlocks(lzw(indexed(frame))));
  });
  out.push(59);
  return new Blob([Uint8Array.from(out)], { type: 'image/gif' });
}

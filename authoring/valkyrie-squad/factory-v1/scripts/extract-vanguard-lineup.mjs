import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = path.join(root, 'source-masters', 'vanguard-squad-lineup.png');
const outputDir = path.join(root, 'factory-candidates');
const output = path.join(outputDir, 'vanguard-center-source-cut-v2.png');
const crop = { left: 535, top: 0, width: 500, height: 864 };
const polygon = [
  [185, 0], [285, 0], [330, 55], [370, 80], [395, 125], [405, 190],
  [410, 285], [405, 390], [425, 470], [455, 610], [480, 760], [410, 735],
  [395, 850], [255, 864], [55, 864], [40, 810], [50, 690], [75, 565],
  [60, 430], [50, 300], [55, 190], [75, 105], [125, 65]
];

function pointInPolygon(x, y) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const { data, info } = await sharp(input).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const rgba = Buffer.from(data);
const count = info.width * info.height;
const exterior = new Uint8Array(count);
const queue = new Int32Array(count);
let head = 0, tail = 0;
const backgroundLike = (index) => {
  const offset = index * 4, r = rgba[offset], g = rgba[offset + 1], b = rgba[offset + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma < 158 && max - min < 76;
};
const add = (x, y) => {
  const index = y * info.width + x;
  if (!exterior[index] && backgroundLike(index)) { exterior[index] = 1; queue[tail++] = index; }
};
for (let x = 0; x < info.width; x++) { add(x, 0); add(x, info.height - 1); }
for (let y = 0; y < info.height; y++) { add(0, y); add(info.width - 1, y); }
while (head < tail) {
  const index = queue[head++], x = index % info.width, y = Math.floor(index / info.width);
  if (x) add(x - 1, y); if (x + 1 < info.width) add(x + 1, y); if (y) add(x, y - 1); if (y + 1 < info.height) add(x, y + 1);
}
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const index = y * info.width + x;
  if (exterior[index] || !pointInPolygon(x + 0.5, y + 0.5)) rgba[index * 4 + 3] = 0;
}
await mkdir(outputDir, { recursive: true });
await writeFile(output, await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: 12, bottom: 12, left: 12, right: 12, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer());
console.log(output);

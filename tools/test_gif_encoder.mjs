#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { encodeGif } from '../src/gif-encoder.js';

function frame(color) { const width = 8, height = 8, data = new Uint8ClampedArray(width * height * 4); for (let i = 0; i < data.length; i += 4) data.set([...color, 255], i); return { width, height, getContext() { return { getImageData() { return { data }; } }; } }; }

const delays = [60, 120, 250];
const blob = encodeGif([frame([255, 0, 0]), frame([0, 255, 0]), frame([0, 0, 255])], delays);
const bytes = Buffer.from(await blob.arrayBuffer());
if (bytes.subarray(0, 6).toString() !== 'GIF89a' || bytes.at(-1) !== 59) throw new Error('GIF structure invalid');

const out = path.join(os.tmpdir(), 'pose-lab-sprite-lab-test.gif');
fs.writeFileSync(out, bytes);
const python = [
  'from PIL import Image',
  'import sys',
  'im=Image.open(sys.argv[1])',
  'assert im.size==(8,8)',
  'assert im.n_frames==3',
  'durations=[]',
  'for i in range(im.n_frames):',
  ' im.seek(i)',
  " durations.append(im.info.get('duration'))",
  'assert durations==[60,120,250], durations',
].join('\n');
const check = spawnSync('python3', ['-c', python, out], { encoding: 'utf8' });
try { fs.unlinkSync(out); } catch {}
if (check.status !== 0) throw new Error(check.stderr || check.stdout || 'Pillow rejected GIF timing');
console.log(JSON.stringify({ ok: true, frames: 3, size: [8, 8], delays, bytes: bytes.length }, null, 2));

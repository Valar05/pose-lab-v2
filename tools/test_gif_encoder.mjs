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


function patternedFrame(seed) {
  const width = 512, height = 512;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const offset = (y * width + x) * 4;
    data[offset] = (x * 7 + y * 3 + seed) & 255;
    data[offset + 1] = (x * 2 + y * 11 + seed * 3) & 255;
    data[offset + 2] = (x * 13 + y * 5 + seed * 7) & 255;
    data[offset + 3] = 255;
  }
  return { width, height, getContext() { return { getImageData() { return { data }; } }; } };
}
const largeDelays = [70, 130];
const largeBlob = encodeGif([patternedFrame(1), patternedFrame(2)], largeDelays);
const largeBytes = Buffer.from(await largeBlob.arrayBuffer());
const largeOut = path.join(os.tmpdir(), 'pose-lab-sprite-lab-large-test.gif');
fs.writeFileSync(largeOut, largeBytes);
const largePython = [
  'from PIL import Image',
  'import sys',
  'im=Image.open(sys.argv[1])',
  'assert im.size==(512,512), im.size',
  'assert im.n_frames==2, im.n_frames',
  'd=[]',
  'for i in range(im.n_frames):',
  ' im.seek(i)',
  " d.append(im.info.get('duration'))",
  'assert d==[70,130], d',
  'im.seek(1); im.convert("RGBA").load()',
].join('\n');
const largeCheck = spawnSync('python3', ['-c', largePython, largeOut], { encoding: 'utf8' });
try { fs.unlinkSync(largeOut); } catch {}
if (largeCheck.status !== 0) throw new Error(largeCheck.stderr || largeCheck.stdout || 'Pillow rejected large GIF');
console.log(JSON.stringify({ ok: true, largeFrames: 2, largeSize: [512, 512], largeDelays, largeBytes: largeBytes.length }, null, 2));

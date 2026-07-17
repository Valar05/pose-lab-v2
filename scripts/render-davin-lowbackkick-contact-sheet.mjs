#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = 'generated/davin-lowbackkick/contact-sheet/ares-transfer-1';
const steps = [
  ['node', ['scripts/bake-davin-lowbackkick-candidate.mjs']],
  ['node', ['scripts/run-blender-tool.mjs', 'tools/render_davin_lowbackkick_blender.py', '--', '--out-dir', outDir]],
  ['python3', ['tools/stitch_davin_lowbackkick_contact_sheet.py', '--manifest', `${outDir}/manifest.json`]],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.signal) {
    console.error(`${command} terminated by signal ${result.signal}`);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

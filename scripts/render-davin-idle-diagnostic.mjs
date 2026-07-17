#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = 'generated/davin-idle/screenshot-1/render';
const steps = [
  ['node', ['scripts/run-blender-tool.mjs', 'tools/author_davin_idle_screenshot_blender.py', '--']],
  ['node', ['scripts/run-blender-tool.mjs', 'tools/render_davin_lowbackkick_blender.py', '--', '--candidate', 'generated/davin-idle/screenshot-1/davin-idle-screenshot-1.json', '--out-dir', outDir, '--width', '960', '--height', '720', '--camera-direction', '1.45,-0.38,0.20', '--ortho-padding', '1.18']],
  ['python3', ['tools/stitch_davin_idle_diagnostic.py', '--manifest', `${outDir}/manifest.json`]],
  ['node', ['scripts/run-blender-tool.mjs', 'tools/project_davin_idle_landmarks_blender.py', '--', '--candidate', 'generated/davin-idle/screenshot-1/davin-idle-screenshot-1.json', '--out', 'generated/davin-idle/screenshot-1/projection/landmarks.json', '--width', '960', '--height', '720', '--camera-direction', '1.45,-0.38,0.20', '--ortho-padding', '1.18']],
  ['python3', ['tools/stitch_davin_idle_projection.py', '--projection', 'generated/davin-idle/screenshot-1/projection/landmarks.json', '--render-manifest', `${outDir}/manifest.json`]],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.signal) {
    console.error(`${command} terminated by signal ${result.signal}`);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

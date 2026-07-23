#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = 'generated/vanguard/idle';

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) {
    console.error(`${command} failed to start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.signal) {
    console.error(`${command} terminated by signal ${result.signal}`);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

run('node', [
  'scripts/run-blender-tool.mjs',
  'tools/export_vanguard_idle_game_blender.py',
  '--',
  '--asset',
  'public/assets/vanguard/vanguard_rigged_animations.glb',
  '--out-dir',
  outDir,
  '--action',
  'Idle',
  '--frame-count',
  '12',
  '--output-fps',
  '12',
  '--source-fps',
  '60',
  '--camera-side',
  'right',
  '--width',
  '512',
  '--height',
  '512',
  '--foot-anchor-tolerance-px',
  '2',
]);

run('python3', [
  'tools/finalize_vanguard_idle_export.py',
  '--root',
  outDir,
]);

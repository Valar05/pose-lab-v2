#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = 'generated/swarmling/idle';
const publishRoot = 'public/assets/swarmling/fleshpunk';

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
  'tools/export_swarmling_idle_game_blender.py',
  '--',
  '--blend',
  'authoring/swarmling/Swarmling.blend',
  '--out-dir',
  outDir,
  '--action',
  'Idle',
  '--frame-count',
  '6',
  '--width',
  '512',
  '--height',
  '512',
]);

run('python3', [
  'tools/finalize_swarmling_idle_export.py',
  '--root',
  outDir,
  '--publish-root',
  publishRoot,
]);

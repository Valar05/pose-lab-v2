#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

const root = path.resolve(import.meta.dirname, '..');
const [toolPath, separator, ...toolArgs] = process.argv.slice(2);

if (!toolPath) {
  console.error('usage: node scripts/run-blender-tool.mjs TOOL.py -- [args]');
  process.exit(1);
}
if (separator !== '--') {
  console.error('missing -- separator before Blender tool args');
  process.exit(1);
}

const absoluteTool = path.resolve(root, toolPath);
const configuredBlender = process.env.BLENDER_BIN?.trim();
const command = configuredBlender || 'proot-distro';
const termuxHome = os.homedir();
const sharedStorage = '/storage/emulated/0';
const commandArgs = configuredBlender
  ? ['--background', '--python-exit-code', '1', '--python', absoluteTool, '--', ...toolArgs]
  : [
      'login',
      'debian',
      '--bind',
      `${root}:${root}`,
      '--bind',
      `${termuxHome}:${termuxHome}`,
      '--bind',
      `${sharedStorage}:${sharedStorage}`,
      '--',
      'env',
      '-u',
      'PYTHONHOME',
      'PYTHONPATH=/usr/lib/python3/dist-packages:/usr/local/lib/python3.13/dist-packages',
      'blender',
      '--background',
      '--python-exit-code',
      '1',
      '--python',
      absoluteTool,
      '--',
      ...toolArgs,
    ];

const result = spawnSync(
  command,
  commandArgs,
  { cwd: root, stdio: 'inherit' }
);

if (result.signal) {
  console.error(`blender tool terminated by signal ${result.signal}`);
  process.exit(1);
}
process.exit(result.status ?? 1);

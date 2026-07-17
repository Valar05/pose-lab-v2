#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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
const result = spawnSync(
  'proot-distro',
  ['login', 'debian', '--', 'blender', '--background', '--python', absoluteTool, '--', ...toolArgs],
  { cwd: root, stdio: 'inherit' }
);

if (result.signal) {
  console.error(`blender tool terminated by signal ${result.signal}`);
  process.exit(1);
}
process.exit(result.status ?? 1);

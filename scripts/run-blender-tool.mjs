#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
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
if (!fs.existsSync(absoluteTool)) {
  console.error(`missing host Blender tool: ${absoluteTool}`);
  process.exit(1);
}

const configuredBlender = process.env.BLENDER_BIN?.trim();
if (configuredBlender) {
  const result = spawnSync(
    configuredBlender,
    ['--background', '--python-exit-code', '1', '--python', absoluteTool, '--', ...toolArgs],
    { cwd: root, stdio: 'inherit' },
  );
  if (result.signal) {
    console.error(`blender tool terminated by signal ${result.signal}`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

const termuxHome = os.homedir();
const sharedStorage = '/storage/emulated/0';
const guestRepo = '/mnt/pose-lab-host';
const guestTermuxHome = '/mnt/termux-home-host';
const guestStorage = '/mnt/shared-storage-host';

function translateArg(value) {
  const replacements = [
    [root, guestRepo],
    [termuxHome, guestTermuxHome],
    [sharedStorage, guestStorage],
  ];
  for (const [hostPrefix, guestPrefix] of replacements) {
    if (value === hostPrefix) return guestPrefix;
    if (value.startsWith(hostPrefix + '/')) {
      return guestPrefix + value.slice(hostPrefix.length);
    }
  }
  return value;
}

const guestTool = translateArg(absoluteTool);
const guestArgs = toolArgs.map(translateArg);

const commandArgs = [
  'login',
  '--bind', `${root}:${guestRepo}`,
  '--bind', `${termuxHome}:${guestTermuxHome}`,
  '--bind', `${sharedStorage}:${guestStorage}`,
  'debian',
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
  guestTool,
  '--',
  ...guestArgs,
];

const result = spawnSync('proot-distro', commandArgs, { cwd: root, stdio: 'inherit' });

if (result.signal) {
  console.error(`blender tool terminated by signal ${result.signal}`);
  process.exit(1);
}
process.exit(result.status ?? 1);

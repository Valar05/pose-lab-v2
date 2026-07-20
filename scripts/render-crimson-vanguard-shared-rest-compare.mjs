#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = 'generated/crimson-vanguard-shared-rest-compare/latest';
const blender = spawnSync('node', ['scripts/run-blender-tool.mjs', 'tools/render_crimson_vanguard_shared_rest_compare_blender.py', '--', '--out-dir', outDir], { cwd: root, stdio: 'inherit' });
const blenderStatus = blender.status ?? 1;
const stitch = spawnSync('python3', ['tools/stitch_crimson_vanguard_attack1_compare.py', '--manifest', `${outDir}/manifest.json`], { cwd: root, stdio: 'inherit' });
if ((stitch.status ?? 1) !== 0 && blenderStatus === 0) process.exit(stitch.status ?? 1);
process.exit(blenderStatus);

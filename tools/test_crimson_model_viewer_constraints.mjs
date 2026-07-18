#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function run(args) {
  return spawnSync('node', ['tools/validate_crimson_model_viewer_constraints.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

function expectFail(label, contract, pattern) {
  const result = run(['--contract', contract]);
  const output = `${result.stdout}\n${result.stderr}`;
  assert(result.status !== 0, `${label} should fail`);
  assert(pattern.test(output), `${label} failure should mention ${pattern}, got ${output}`);
}

const source = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/crimson/crimson_model_viewer_constraints.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crimson-model-viewer-constraints-'));

const pass = run([]);
assert(pass.status === 0, `default contract should pass: ${pass.stderr || pass.stdout}`);

const badCamera = { ...source, camera: { ...source.camera, fov: 55 } };
const badCameraPath = path.join(tmp, 'bad-camera.json');
fs.writeFileSync(badCameraPath, `${JSON.stringify(badCamera, null, 2)}\n`);
expectFail('camera divergence', badCameraPath, /camera/);

const badGrip = {
  ...source,
  saberGripLocal: {
    ...source.saberGripLocal,
    scale: [0.82, 0.82, 0.82],
  },
};
const badGripPath = path.join(tmp, 'bad-grip.json');
fs.writeFileSync(badGripPath, `${JSON.stringify(badGrip, null, 2)}\n`);
expectFail('sword scale divergence', badGripPath, /saberGripLocal/);

const badRoute = {
  ...source,
  route: {
    ...source.route,
    origin: 'http://127.0.0.1:8804',
  },
};
const badRoutePath = path.join(tmp, 'bad-route.json');
fs.writeFileSync(badRoutePath, `${JSON.stringify(badRoute, null, 2)}\n`);
expectFail('local route divergence', badRoutePath, /hosted model viewer/);

if (failures.length) throw new Error(failures.join('\n'));
console.log(JSON.stringify({ ok: true, checked: ['default-pass', 'camera-divergence', 'sword-scale-divergence', 'local-route-divergence'] }, null, 2));

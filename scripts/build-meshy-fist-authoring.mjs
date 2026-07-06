import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const blenderScript = path.join(root, 'authoring', 'meshy_fist', 'blender_build_meshy_fist_authoring.py');
const manifestPath = path.join(root, 'generated', 'meshy-fist-authoring', 'manifest.json');
const runtimeGlbPath = path.join(root, 'public', 'assets', 'meshy', 'meshy_fist_hands.glb');

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.signal) {
    console.error(`${command} terminated by signal ${result.signal}`);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

run('proot-distro', ['login', 'debian', '--', 'blender', '--background', '--python', blenderScript]);
if (!existsSync(manifestPath)) {
  console.error(`missing Meshy fist authoring manifest: ${manifestPath}`);
  process.exit(1);
}
if (!existsSync(runtimeGlbPath)) {
  console.error(`missing Meshy fist runtime GLB: ${runtimeGlbPath}`);
  process.exit(1);
}
console.log(`Meshy fist authoring artifact written to ${runtimeGlbPath}`);

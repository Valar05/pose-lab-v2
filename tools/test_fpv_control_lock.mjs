import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const mainPath = path.join(root, 'src/main.js');
const source = fs.readFileSync(mainPath, 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

execFileSync(process.execPath, ['--check', mainPath], { stdio: 'inherit' });

for (const needle of [
  'data-fpv-control-mode',
  "let fpvControlMode = 'camera';",
  "fpvControlMode = next === 'bones' ? 'bones' : 'camera';",
  "firstPersonForwardSpace: 'world'",
  'firstPersonHeadForwardOffset: 0',
  'firstPersonHeadCameraYOffset: 0',
  'firstPersonNear: 0.035',
  "firstPersonCameraConfig.forwardSpace !== 'world'",
  'captureFpvCameraOffsets();',
  "viewMode === 'firstPerson' && fpvControlMode === 'camera'",
  "viewMode !== 'firstPerson' || fpvControlMode === 'bones'",
  "fpvCameraPositionOffset.set(0, 0, 0);",
  "fpvCameraTargetOffset.set(0, 0, 0);",
]) assert(source.includes(needle), `missing FPV lock contract: ${needle}`);

const touchStart = source.indexOf('function handleTouchStart(event)');
const cameraPriority = source.indexOf("viewMode === 'firstPerson' && fpvControlMode === 'camera'", touchStart);
const poseTouch = source.indexOf("points.length >= 2 && toolMode === 'pose'", touchStart);
assert(touchStart >= 0 && cameraPriority > touchStart && cameraPriority < poseTouch, 'FPV camera lock must claim touch before pose editing');

const cameraFrame = source.slice(source.indexOf('function firstPersonCameraFrame()'), source.indexOf('function captureFpvCameraOffsets()'));
assert(cameraFrame.includes("forwardSpace !== 'world'"), 'world-forward ARIES framing must bypass imported camera-bone rotation');
assert(cameraFrame.includes('headForwardOffset'), 'camera reset frame must preserve configured positional offset');

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, defaultControl: 'camera', alternateControl: 'bones', ariesForwardSpace: 'world', ariesFov: 105 }, null, 2));

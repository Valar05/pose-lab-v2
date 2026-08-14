#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ATTACK1_REVIEW_CANDIDATES } from '../src/review-constants.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE = path.resolve(ROOT, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'embodied-kinesis-canary.json');
const OUT_DIR = path.join(ROOT, 'generated', 'embodied-kinesis');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

function candidateModulePath(key) {
  const entry = ATTACK1_REVIEW_CANDIDATES[key];
  if (!entry) throw new Error(`candidate not registered: ${key}`);
  return path.join(ROOT, 'src', entry.module.replace(/^\.\//, ''));
}

function norm4(values) {
  return Math.hypot(...values);
}

function finiteQuaternion(values) {
  return Array.isArray(values) && values.length === 4 && values.every(Number.isFinite) && Math.abs(norm4(values) - 1) <= 0.01;
}

const modulePath = candidateModulePath(config.candidate);
const registryEntry = ATTACK1_REVIEW_CANDIDATES[config.candidate];
const candidateModule = await import(pathToFileURL(modulePath).href + `?t=${Date.now()}`);
const sequence = candidateModule[registryEntry.exportName];
if (!sequence) throw new Error(`missing export ${registryEntry.exportName}`);

const sourcePath = path.join(WORKSPACE, 'pose-lab', config.source.path.replace(/^assets\//, 'assets/'));
const targetPath = path.join(ROOT, config.target.path);
const frames = Array.isArray(sequence.frames) ? sequence.frames : [];
const labels = frames.map((frame) => frame.label);
const times = frames.map((frame) => Number(frame.time));
const jointErrors = frames.flatMap((frame) => {
  const pin = frame.source?.jointPinned;
  return [pin?.elbowWorldError, pin?.wristWorldError].filter(Number.isFinite);
});
const maxJointError = jointErrors.length ? Math.max(...jointErrors) : null;
const chronologyStrict = times.every((time, index) => index === 0 || time > times[index - 1]);
const quaternionFailures = [];
for (const frame of frames) {
  for (const [bone, q] of Object.entries(frame.bones || {})) {
    if (!finiteQuaternion(q)) quaternionFailures.push(`${frame.label}:${bone}`);
  }
}

const checks = {
  sourceExists: fs.existsSync(sourcePath),
  targetExists: fs.existsSync(targetPath),
  sourceIdentityPreserved: sequence.source?.fps?.includes('FPSPlayer.glb') === true && sequence.source?.clip === config.source.clip,
  targetIdentityPreserved: targetPath.endsWith('meshy_apose_walking_with_skin.glb'),
  weaponlessActionRemainsWeaponless: sequence.source?.weaponless === true,
  requiredPhasesPresent: config.requiredPhases.every((phase) => labels.includes(phase)),
  validEntry: labels[0] === 'start' && times[0] === 0,
  validExit: labels.at(-1) === 'end' && times.at(-1) > times[0],
  chronologyStrict,
  finiteNormalizedRigKeys: quaternionFailures.length === 0,
  jointPinnedEvidencePresent: jointErrors.length >= Math.max(2, frames.length * 2 - 2),
  jointPinnedWithinTolerance: Number.isFinite(maxJointError) && maxJointError <= config.acceptance.maxJointError,
  noNeutralSubstitution: sequence.source?.clip === 'FistAttack1' && labels.includes('contact') && labels.includes('recoil'),
  targetCameraExplicit: config.target.cameraMode === 'firstPerson' && config.source.fov === 112,
};

let verdict = 'PASS';
if (!checks.sourceExists || !checks.targetExists || !checks.jointPinnedEvidencePresent) verdict = 'INVALID_EVIDENCE';
else if (!Object.values(checks).every(Boolean)) verdict = 'REVISE_REQUIRED';

const receipt = {
  schema: 'embodied-kinesis-regnet-v1',
  candidate: config.candidate,
  stage: config.stage,
  source: { path: sourcePath, clip: config.source.clip, camera: config.source.camera, fov: config.source.fov },
  target: { path: targetPath, rig: config.target.rig, cameraMode: config.target.cameraMode },
  checks,
  metrics: {
    frameCount: frames.length,
    labels,
    times,
    maxJointError,
    quaternionFailures,
  },
  verdict,
  note: 'Structural QA only. PASS is not visual acceptance and cannot make a candidate presentable to Drew.'
};
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, `regnet-${config.stage}-${config.candidate}.json`), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
if (verdict !== 'PASS') process.exitCode = 2;

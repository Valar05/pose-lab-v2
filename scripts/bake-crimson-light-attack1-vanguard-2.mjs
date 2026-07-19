#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  CRIMSON_SABER_GRIP_LOCAL,
  CRIMSON_SWORD_LOCAL,
  CRIMSON_SWORD_REVIEW_LOCAL_AXIS,
} from '../src/review-constants.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(projectRoot, 'src', 'review-candidates', 'crimson-light-attack1-vanguard-2.js');
const crimsonPath = path.join(projectRoot, 'public', 'assets', 'crimson', 'crimson_plume_knight_rigged_pbr.glb');
const swordPath = path.join(projectRoot, 'public', 'assets', 'crimson', 'arborblade_sword.glb');
const referencePath = path.join(projectRoot, 'public', 'assets', 'crimson', 'vanguard_swordattack1_reference.json');
const baselinePath = path.join(projectRoot, 'public', 'assets', 'crimson', 'crimson_light_attack1_weapon_baseline.json');
const candidateId = 'crimson-light-attack1-vanguard-2';
const exportName = 'CRIMSON_LIGHT_ATTACK1_VANGUARD_2_SEQUENCE';
const primeKeys = { start: 0, anticipation: 0.183333, contact: 0.383333, contactHold: 0.5, followThrough: 0.633333 };
const boneNames = [
  'Hips', 'Spine02', 'Spine01', 'Spine',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
];
const framePlans = {
  start: {
    note: 'Saved user weapon/pose baseline. This is not raw Crimson rest.',
    blade: null,
    deltas: {},
  },
  anticipation: {
    note: 'Full-body windup from saved baseline: weight shifts, hips coil, off hand counterbalances, blade draws back.',
    blade: [-0.55, 0.1, 0.83],
    deltas: {
      Hips: [-2, -16, -3], Spine02: [-8, -20, 4], Spine01: [-5, -15, 3], Spine: [-3, -10, 2],
      LeftUpLeg: [3, -2, -2], LeftLeg: [-4, 0, 1], LeftFoot: [2, 0, -1],
      RightUpLeg: [-4, 3, 2], RightLeg: [5, 0, -1], RightFoot: [-2, 0, 1],
      LeftShoulder: [0, -12, 5], LeftArm: [24, -30, 18], LeftForeArm: [16, -10, -8], LeftHand: [0, 6, 12],
      RightShoulder: [7, 10, -5], RightArm: [-34, 30, -18], RightForeArm: [-42, 10, 12], RightHand: [0, -12, -18],
    },
  },
  contact: {
    note: 'Whole-body cut: hips and spine unwind, legs brace, right hand carries the saved Arborblade forward.',
    blade: [0, 0, 1],
    deltas: {
      Hips: [3, 18, 4], Spine02: [-16, 21, -5], Spine01: [-10, 15, -4], Spine: [-6, 10, -3],
      LeftUpLeg: [-2, 2, 2], LeftLeg: [3, 0, -1], LeftFoot: [-1, 0, 1],
      RightUpLeg: [3, -2, -2], RightLeg: [-4, 0, 1], RightFoot: [1, 0, -1],
      LeftShoulder: [0, 16, -7], LeftArm: [9, 40, -24], LeftForeArm: [10, 12, 8], LeftHand: [0, -8, -10],
      RightShoulder: [-6, -10, 5], RightArm: [-14, -50, 28], RightForeArm: [-22, -20, -10], RightHand: [0, 10, 16],
    },
  },
  contactHold: {
    note: 'Impact hold: same weapon truth, body still loaded through hips and legs.',
    blade: [0.07, -0.02, 0.997],
    deltas: {
      Hips: [4, 21, 5], Spine02: [-17, 24, -6], Spine01: [-11, 17, -4], Spine: [-6, 12, -3],
      LeftUpLeg: [-2, 2, 2], LeftLeg: [3, 0, -1], LeftFoot: [-1, 0, 1],
      RightUpLeg: [3, -2, -2], RightLeg: [-4, 0, 1], RightFoot: [1, 0, -1],
      LeftShoulder: [0, 18, -7], LeftArm: [8, 42, -25], LeftForeArm: [10, 13, 9], LeftHand: [0, -9, -10],
      RightShoulder: [-6, -12, 5], RightArm: [-12, -54, 28], RightForeArm: [-20, -22, -11], RightHand: [0, 12, 17],
    },
  },
  followThrough: {
    note: 'Follow-through: weight and torso continue past contact instead of snapping back to rest.',
    blade: [0.34, -0.04, 0.94],
    deltas: {
      Hips: [2, 26, 4], Spine02: [-11, 30, -7], Spine01: [-8, 22, -5], Spine: [-4, 16, -4],
      LeftUpLeg: [-1, 3, 1], LeftLeg: [2, 0, 0], LeftFoot: [-1, 0, 1],
      RightUpLeg: [2, -3, -1], RightLeg: [-3, 0, 1], RightFoot: [1, 0, -1],
      LeftShoulder: [0, 20, -9], LeftArm: [4, 45, -26], LeftForeArm: [8, 14, 10], LeftHand: [0, -10, -12],
      RightShoulder: [-8, -14, 6], RightArm: [-5, -60, 25], RightForeArm: [-12, -24, -10], RightHand: [0, 15, 14],
    },
  },
};
const thresholds = {
  baselineSwordLocalExact: true,
  contactBladeForwardAngleDeg: 7,
  weaponLocalInvariant: true,
  bodyTravelDeg: { Hips: 14, Spine02: 22, RightArm: 40, RightForeArm: 30, RightHand: 20, LeftArm: 28, LeftUpLeg: 3, RightUpLeg: 3 },
};

function ensureBrowserShim() {
  globalThis.ProgressEvent ||= class ProgressEvent { constructor(type, init = {}) { this.type = type; Object.assign(this, init); } };
  globalThis.window ||= { innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1 };
  globalThis.self ||= globalThis;
  globalThis.document ||= { createElementNS() { const listeners = new Map(); return { style: {}, width: 1, height: 1, addEventListener(t, f) { listeners.set(t, f); }, removeEventListener(t) { listeners.delete(t); }, set src(v) { this._src = v; setTimeout(() => listeners.get('load')?.({ type: 'load' }), 0); }, get src() { return this._src || ''; } }; } };
  globalThis.createImageBitmap ||= async () => ({ width: 1, height: 1, close() {} });
}
function ensureThreeSandbox() {
  const sandbox = path.join(os.tmpdir(), 'pose-lab-v2-three-node');
  const threeDir = path.join(sandbox, 'node_modules', 'three');
  if (!fs.existsSync(path.join(threeDir, 'build', 'three.module.js'))) {
    fs.rmSync(sandbox, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(threeDir), { recursive: true });
    execFileSync('cp', ['-R', path.join(projectRoot, 'vendor', 'three'), threeDir]);
  }
  return sandbox;
}
function sameJson(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function arrayBuffer(file) { const buffer = fs.readFileSync(file); return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength); }
async function loadGltf(GLTFLoader, file) { return new Promise((resolve, reject) => new GLTFLoader().parse(arrayBuffer(file), path.dirname(file) + '/', resolve, reject)); }
function canon(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function find(root, name) { const wanted = canon(name); let found = null; root.traverse((node) => { if (!found && canon(node.name) === wanted) found = node; }); return found; }
function requireNode(root, name) { const node = find(root, name); if (!node) throw new Error(`missing node ${name}`); return node; }
function normalizeCharacter(THREE, object) { const box = new THREE.Box3().setFromObject(object); const center = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3()); object.position.sub(center); object.position.y += size.y * 0.5; object.scale.multiplyScalar(1.75 / Math.max(0.001, size.y)); object.traverse((node) => { if (node.isMesh) node.frustumCulled = false; }); object.updateMatrixWorld(true); return object; }
function roundedQuaternion(q) { return q.toArray().map((value) => Number(value.toFixed(6))); }
function vectorArray(v) { return v.toArray().map((value) => Number(value.toFixed(5))); }
function degToQuat(THREE, values) { return new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(values[0]), THREE.MathUtils.degToRad(values[1]), THREE.MathUtils.degToRad(values[2]), 'XYZ')).normalize(); }
function angleDeg(THREE, a, b) { return Number(THREE.MathUtils.radToDeg(a.clone().normalize().angleTo(b.clone().normalize())).toFixed(3)); }
function quatTravelDeg(THREE, a, b) { return Number(THREE.MathUtils.radToDeg(a.angleTo(b)).toFixed(3)); }
function applyPoseBones(root, bones) { for (const [name, values] of Object.entries(bones || {})) { const bone = find(root, name); if (bone) bone.quaternion.fromArray(values).normalize(); } root.updateMatrixWorld(true); }
function restBones(root, names) { return Object.fromEntries(names.map((name) => [name, roundedQuaternion(requireNode(root, name).quaternion)])); }
function attachCrimsonSword(THREE, crimsonRoot, swordRoot) {
  const rightHand = requireNode(crimsonRoot, 'RightHand');
  const grip = new THREE.Bone();
  grip.name = 'SaberGrip';
  grip.position.fromArray(CRIMSON_SABER_GRIP_LOCAL.position);
  grip.rotation.set(THREE.MathUtils.degToRad(CRIMSON_SABER_GRIP_LOCAL.rotationDeg[0]), THREE.MathUtils.degToRad(CRIMSON_SABER_GRIP_LOCAL.rotationDeg[1]), THREE.MathUtils.degToRad(CRIMSON_SABER_GRIP_LOCAL.rotationDeg[2]));
  grip.scale.fromArray(CRIMSON_SABER_GRIP_LOCAL.scale);
  rightHand.add(grip);
  swordRoot.name = 'ArborbladeSword';
  swordRoot.position.fromArray(CRIMSON_SWORD_LOCAL.position);
  swordRoot.rotation.set(THREE.MathUtils.degToRad(CRIMSON_SWORD_LOCAL.rotationDeg[0]), THREE.MathUtils.degToRad(CRIMSON_SWORD_LOCAL.rotationDeg[1]), THREE.MathUtils.degToRad(CRIMSON_SWORD_LOCAL.rotationDeg[2]));
  swordRoot.scale.fromArray(CRIMSON_SWORD_LOCAL.scale);
  grip.add(swordRoot);
  crimsonRoot.updateMatrixWorld(true);
  return grip;
}
function applyBaseline(THREE, root, baseline) {
  for (const [name, entry] of Object.entries(baseline.pose?.bones || {})) {
    const bone = requireNode(root, name);
    bone.quaternion.copy(degToQuat(THREE, entry.rotationDeg)).normalize();
  }
  root.updateMatrixWorld(true);
}
function applyFrame(THREE, root, baseBones, plan) {
  applyPoseBones(root, baseBones);
  for (const [name, delta] of Object.entries(plan.deltas || {})) {
    const bone = find(root, name);
    if (!bone) continue;
    bone.quaternion.multiply(degToQuat(THREE, delta)).normalize();
  }
  root.updateMatrixWorld(true);
}
function bladeDirectionWorld(THREE, grip, swordRoot) { const axis = new THREE.Vector3(...CRIMSON_SWORD_REVIEW_LOCAL_AXIS).normalize(); const hilt = grip.getWorldPosition(new THREE.Vector3()); const tip = hilt.clone().add(axis.applyQuaternion(swordRoot.getWorldQuaternion(new THREE.Quaternion())).multiplyScalar(1)); return tip.sub(hilt).normalize(); }
function scoreBlade(THREE, grip, swordRoot, desired) { return THREE.MathUtils.radToDeg(bladeDirectionWorld(THREE, grip, swordRoot).angleTo(desired)); }
function solveHandBladeForward(THREE, root, rightHand, grip, swordRoot, desired) {
  const start = rightHand.quaternion.clone();
  let best = start.clone();
  let bestScore = scoreBlade(THREE, grip, swordRoot, desired);
  const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  for (const step of [36, 18, 9, 4.5, 2, 1, 0.5, 0.2, 0.08]) {
    let improved = true;
    let guard = 0;
    while (improved && guard < 18) {
      improved = false; guard += 1;
      for (const axis of axes) for (const sign of [-1, 1]) {
        rightHand.quaternion.copy(best).multiply(new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(step * sign))).normalize();
        root.updateMatrixWorld(true);
        const score = scoreBlade(THREE, grip, swordRoot, desired);
        if (score + 0.0001 < bestScore) { best = rightHand.quaternion.clone(); bestScore = score; improved = true; }
      }
    }
  }
  rightHand.quaternion.copy(best).normalize(); root.updateMatrixWorld(true);
  return { rotationFromAuthoredDeg: quatTravelDeg(THREE, start, best), angleErrorDeg: Number(bestScore.toFixed(3)) };
}
function hiltBladeReport(THREE, root, grip, swordRoot, label, desired) {
  root.updateMatrixWorld(true);
  const hilt = grip.getWorldPosition(new THREE.Vector3());
  const hand = requireNode(root, 'RightHand').getWorldPosition(new THREE.Vector3());
  const actual = bladeDirectionWorld(THREE, grip, swordRoot);
  return { label, hiltWorld: vectorArray(hilt), rightHandWorld: vectorArray(hand), hiltToRightHandDistance: Number(hilt.distanceTo(hand).toFixed(5)), desiredBladeDirectionWorld: desired ? vectorArray(desired) : null, actualBladeDirectionWorld: vectorArray(actual), bladeAngleErrorDeg: desired ? angleDeg(THREE, actual, desired) : null };
}

async function main() {
  ensureBrowserShim();
  const reference = JSON.parse(fs.readFileSync(referencePath, 'utf8'));
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const failures = [];
  if (!sameJson(baseline.saberGripLocal.position, CRIMSON_SABER_GRIP_LOCAL.position)) failures.push('BASELINE_SABER_GRIP_POSITION_DRIFT');
  if (!sameJson(baseline.saberGripLocal.rotationDeg, CRIMSON_SABER_GRIP_LOCAL.rotationDeg)) failures.push('BASELINE_SABER_GRIP_ROTATION_DRIFT');
  if (!sameJson(baseline.sabreLocal, CRIMSON_SWORD_LOCAL)) failures.push('BASELINE_SWORD_LOCAL_DRIFT');
  if (!sameJson(baseline.bladeLocalAxis, CRIMSON_SWORD_REVIEW_LOCAL_AXIS)) failures.push('BASELINE_BLADE_AXIS_DRIFT');
  if (failures.length) throw new Error(`baseline drift: ${failures.join(', ')}`);
  const sandbox = ensureThreeSandbox();
  const THREE = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'build', 'three.module.js')).href);
  const { GLTFLoader } = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js')).href);
  const crimson = await loadGltf(GLTFLoader, crimsonPath);
  const sword = await loadGltf(GLTFLoader, swordPath);
  const crimsonRoot = normalizeCharacter(THREE, crimson.scene);
  const swordRoot = sword.scene;
  const grip = attachCrimsonSword(THREE, crimsonRoot, swordRoot);
  applyBaseline(THREE, crimsonRoot, baseline);
  const baseBones = restBones(crimsonRoot, boneNames);
  const rightHand = requireNode(crimsonRoot, 'RightHand');
  const frames = [];
  const report = [];
  for (const [label, time] of Object.entries(primeKeys)) {
    const plan = framePlans[label];
    applyFrame(THREE, crimsonRoot, baseBones, plan);
    let solve = { rotationFromAuthoredDeg: 0, angleErrorDeg: null };
    let desired = null;
    if (plan.blade) {
      desired = new THREE.Vector3(...plan.blade).normalize();
      solve = solveHandBladeForward(THREE, crimsonRoot, rightHand, grip, swordRoot, desired);
    }
    const bones = restBones(crimsonRoot, boneNames);
    const entry = { ...hiltBladeReport(THREE, crimsonRoot, grip, swordRoot, label, desired), time, rightHandSolveRotationDeg: solve.rotationFromAuthoredDeg };
    frames.push({ time, label, note: plan.note, bones });
    report.push(entry);
  }
  const startFrame = frames[0];
  const travel = {};
  for (const name of boneNames) {
    const start = new THREE.Quaternion().fromArray(startFrame.bones[name]);
    travel[name] = Number(Math.max(...frames.map((frame) => THREE.MathUtils.radToDeg(start.angleTo(new THREE.Quaternion().fromArray(frame.bones[name]))))).toFixed(3));
  }
  const guardFailures = [];
  for (const [name, min] of Object.entries(thresholds.bodyTravelDeg)) if ((travel[name] || 0) < min) guardFailures.push(`BODY_TRAVEL_TOO_SMALL:${name}:${travel[name]}<${min}`);
  const contact = report.find((entry) => entry.label === 'contact');
  if (!contact || contact.bladeAngleErrorDeg > thresholds.contactBladeForwardAngleDeg) guardFailures.push(`CONTACT_BLADE_NOT_FORWARD:${contact?.bladeAngleErrorDeg}`);
  if (JSON.stringify(frames[0].bones) !== JSON.stringify(baseBones)) guardFailures.push('START_FRAME_NOT_SAVED_BASELINE');
  if (guardFailures.length) {
    console.error(JSON.stringify({ ok: false, guardFailures, travel, report }, null, 2));
    process.exit(1);
  }
  const payload = {
    schema: 'pose-lab-v2-attack-candidate-v1',
    id: candidateId,
    label: 'Crimson light attack 1 from saved weapon baseline and Vanguard timing',
    primeKeys,
    source: {
      character: 'crimson', clip: 'SwordAttack1', duration: Number(reference.duration.toFixed(6)),
      vanguardReference: 'public/assets/crimson/vanguard_swordattack1_reference.json',
      savedWeaponBaseline: 'public/assets/crimson/crimson_light_attack1_weapon_baseline.json',
      previousFailedCandidate: 'crimson-light-attack1-vanguard-1',
      method: 'saved-weapon-baseline-full-body-authored-crimson-attack-with-vanguard-timing',
      policy: {
        role: 'quarantined review candidate, not accepted repo truth',
        forbiddenUse: 'Do not copy Vanguard Weapon.R transforms directly into Crimson as accepted sword orientation.',
        rootMotion: 'Vanguard root motion is preserved in sidecar data and not applied in Pose Lab.',
        weaponTruth: 'SaberGrip and Arborblade local transforms are copied from the saved user sabre-transform export and are invariant across frames.',
      },
      authoredBones: boneNames,
      savedWeapon: {
        saberRootWorld: baseline.saberRootWorld,
        saberGripLocal: baseline.saberGripLocal,
        sabreLocal: baseline.sabreLocal,
        bladeLocalAxis: baseline.bladeLocalAxis,
      },
    },
    guardReport: {
      crimsonLightAttack1V2: {
        status: 'PASS', thresholds, bodyTravelDeg: travel, report,
        note: 'Guardrail only: proves saved weapon baseline, invariant local weapon transforms, and minimum full-body bone travel before cloud visual review.',
      },
    },
    frames,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `export const ${exportName} = ${JSON.stringify(payload, null, 2)};\n`);
  console.log(JSON.stringify({ ok: true, wrote: path.relative(projectRoot, outputPath), candidate: candidateId, frames: frames.length, travel, contactBladeAngleDeg: contact.bladeAngleErrorDeg }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.stack : String(error)); process.exit(1); });

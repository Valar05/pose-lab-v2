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
const outputPath = path.join(projectRoot, 'src', 'review-candidates', 'crimson-light-attack1-vanguard-1.js');
const crimsonPath = path.join(projectRoot, 'public', 'assets', 'crimson', 'crimson_plume_knight_rigged_pbr.glb');
const swordPath = path.join(projectRoot, 'public', 'assets', 'crimson', 'arborblade_sword.glb');
const referencePath = path.join(projectRoot, 'public', 'assets', 'crimson', 'vanguard_swordattack1_reference.json');
const candidateId = 'crimson-light-attack1-vanguard-1';
const exportName = 'CRIMSON_LIGHT_ATTACK1_VANGUARD_SEQUENCE';
const sourceClipName = 'SwordAttack1';
const primeKeys = {
  start: 0,
  anticipation: 0.183333,
  contact: 0.383333,
  contactHold: 0.5,
  followThrough: 0.633333,
  end: 0.633333,
};
const framePlans = {
  start: { note: 'Crimson rest endpoint; Arborblade socket preserved.', blade: [0, 0, 1], deltas: {} },
  anticipation: {
    note: 'Vanguard-timed backswing: torso coils, elbow bends, blade trails before the cut.',
    blade: [-0.72, 0.18, 0.67],
    deltas: {
      Hips: [0, -7, 0], Spine02: [-8, -14, 2], Spine01: [-5, -10, 1], Spine: [-2, -8, 0],
      RightShoulder: [6, 8, -4], RightArm: [-36, 28, -18], RightForeArm: [-44, 12, 10],
      LeftShoulder: [0, -8, 4], LeftArm: [22, -22, 18], LeftForeArm: [18, -8, -8], LeftHand: [0, 0, 10],
    },
  },
  contact: {
    note: 'Contact frame: right wrist drives the accepted Arborblade hilt forward; blade axis points world +Z.',
    blade: [0, 0, 1],
    deltas: {
      Hips: [0, 4, 0], Spine02: [-15, 10, -3], Spine01: [-10, 7, -2], Spine: [-4, 4, -1],
      RightShoulder: [-4, -6, 4], RightArm: [-16, -42, 24], RightForeArm: [-22, -18, -8],
      LeftShoulder: [0, 8, -3], LeftArm: [8, 34, -18], LeftForeArm: [10, 8, 6], LeftHand: [0, 0, -8],
    },
  },
  contactHold: {
    note: 'Held impact: blade remains forward with slight follow-through pressure.',
    blade: [0.08, -0.03, 0.996],
    deltas: {
      Hips: [0, 6, 0], Spine02: [-17, 12, -4], Spine01: [-11, 8, -2], Spine: [-5, 5, -1],
      RightShoulder: [-4, -8, 4], RightArm: [-15, -46, 26], RightForeArm: [-20, -20, -10],
      LeftShoulder: [0, 9, -3], LeftArm: [8, 36, -19], LeftForeArm: [10, 9, 6], LeftHand: [0, 0, -8],
    },
  },
  followThrough: {
    note: 'Follow-through clamps at Vanguard clip end; no root motion is applied.',
    blade: [0.46, -0.08, 0.884],
    deltas: {
      Hips: [0, 10, 0], Spine02: [-12, 17, -5], Spine01: [-8, 13, -3], Spine: [-3, 9, -2],
      RightShoulder: [-6, -10, 6], RightArm: [-8, -54, 24], RightForeArm: [-12, -22, -10],
      LeftShoulder: [0, 12, -5], LeftArm: [4, 40, -20], LeftForeArm: [8, 12, 8], LeftHand: [0, 0, -10],
    },
  },
  end: { note: 'Endpoint returns to Crimson rest; game root motion remains sidecar-only.', blade: [0, 0, 1], deltas: {} },
};
const bladeThresholds = {
  contactBladeForwardAngleDeg: 7,
  allBladeTargetAngleDeg: 13,
  contactHiltTravelMin: 0.005,
  authoredRightHandTravelMinDeg: 8,
};

function ensureBrowserShim() {
  globalThis.ProgressEvent ||= class ProgressEvent { constructor(type, init = {}) { this.type = type; Object.assign(this, init); } };
  globalThis.window ||= { innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1 };
  globalThis.self ||= globalThis;
  globalThis.document ||= {
    createElementNS() {
      const listeners = new Map();
      return {
        style: {}, width: 1, height: 1,
        addEventListener(type, fn) { listeners.set(type, fn); },
        removeEventListener(type) { listeners.delete(type); },
        set src(value) { this._src = value; setTimeout(() => listeners.get('load')?.({ type: 'load' }), 0); },
        get src() { return this._src || ''; },
      };
    },
  };
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

function arrayBuffer(file) {
  const buffer = fs.readFileSync(file);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}
async function loadGltf(GLTFLoader, file) {
  return new Promise((resolve, reject) => new GLTFLoader().parse(arrayBuffer(file), path.dirname(file) + '/', resolve, reject));
}
function canon(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function find(root, name) {
  const wanted = canon(name);
  let found = null;
  root.traverse((node) => { if (!found && canon(node.name) === wanted) found = node; });
  return found;
}
function requireNode(root, name) {
  const node = find(root, name);
  if (!node) throw new Error(`missing node ${name}`);
  return node;
}
function normalizeCharacter(THREE, object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  object.position.sub(center);
  object.position.y += size.y * 0.5;
  object.scale.multiplyScalar(1.75 / Math.max(0.001, size.y));
  object.traverse((node) => { if (node.isMesh) node.frustumCulled = false; });
  object.updateMatrixWorld(true);
  return object;
}
function roundedQuaternion(quaternion) { return quaternion.toArray().map((value) => Number(value.toFixed(6))); }
function vectorArray(vector) { return vector.toArray().map((value) => Number(value.toFixed(5))); }
function angleDeg(THREE, a, b) { return Number(THREE.MathUtils.radToDeg(a.clone().normalize().angleTo(b.clone().normalize())).toFixed(3)); }
function eulerDelta(THREE, values) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(values[0]), THREE.MathUtils.degToRad(values[1]), THREE.MathUtils.degToRad(values[2]), 'XYZ'
  )).normalize();
}
function applyPoseBones(root, bones) {
  for (const [name, values] of Object.entries(bones || {})) {
    const bone = find(root, name);
    if (bone) bone.quaternion.fromArray(values).normalize();
  }
  root.updateMatrixWorld(true);
}
function restBones(root, names) { return Object.fromEntries(names.map((name) => [name, roundedQuaternion(requireNode(root, name).quaternion)])); }
function attachCrimsonSword(THREE, crimsonRoot, swordRoot) {
  const rightHand = requireNode(crimsonRoot, 'RightHand');
  const grip = new THREE.Bone();
  grip.name = 'SaberGrip';
  grip.position.fromArray(CRIMSON_SABER_GRIP_LOCAL.position);
  grip.rotation.set(
    THREE.MathUtils.degToRad(CRIMSON_SABER_GRIP_LOCAL.rotationDeg[0]),
    THREE.MathUtils.degToRad(CRIMSON_SABER_GRIP_LOCAL.rotationDeg[1]),
    THREE.MathUtils.degToRad(CRIMSON_SABER_GRIP_LOCAL.rotationDeg[2])
  );
  grip.scale.fromArray(CRIMSON_SABER_GRIP_LOCAL.scale);
  rightHand.add(grip);
  swordRoot.name = 'ArborbladeSword';
  swordRoot.position.fromArray(CRIMSON_SWORD_LOCAL.position);
  swordRoot.rotation.set(
    THREE.MathUtils.degToRad(CRIMSON_SWORD_LOCAL.rotationDeg[0]),
    THREE.MathUtils.degToRad(CRIMSON_SWORD_LOCAL.rotationDeg[1]),
    THREE.MathUtils.degToRad(CRIMSON_SWORD_LOCAL.rotationDeg[2])
  );
  swordRoot.scale.fromArray(CRIMSON_SWORD_LOCAL.scale);
  grip.add(swordRoot);
  crimsonRoot.updateMatrixWorld(true);
  return grip;
}
function applyAuthoredFrame(THREE, root, baseBones, plan) {
  applyPoseBones(root, baseBones);
  for (const [name, delta] of Object.entries(plan.deltas || {})) {
    const bone = find(root, name);
    if (!bone) continue;
    bone.quaternion.multiply(eulerDelta(THREE, delta)).normalize();
  }
  root.updateMatrixWorld(true);
}
function bladeDirectionWorld(THREE, grip, swordRoot) {
  const axis = new THREE.Vector3(...CRIMSON_SWORD_REVIEW_LOCAL_AXIS).normalize();
  const hilt = grip.getWorldPosition(new THREE.Vector3());
  const tip = hilt.clone().add(axis.applyQuaternion(swordRoot.getWorldQuaternion(new THREE.Quaternion())).multiplyScalar(1));
  return tip.sub(hilt).normalize();
}
function scoreBlade(THREE, grip, swordRoot, desired) {
  return THREE.MathUtils.radToDeg(bladeDirectionWorld(THREE, grip, swordRoot).angleTo(desired));
}
function solveHandBladeForward(THREE, root, rightHand, grip, swordRoot, desiredDirectionWorld) {
  const start = rightHand.quaternion.clone();
  let best = start.clone();
  let bestScore = scoreBlade(THREE, grip, swordRoot, desiredDirectionWorld);
  const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  for (const step of [48, 24, 12, 6, 3, 1.5, 0.75, 0.35, 0.18, 0.08]) {
    let improved = true;
    let guard = 0;
    while (improved && guard < 20) {
      improved = false;
      guard += 1;
      for (const axis of axes) {
        for (const sign of [-1, 1]) {
          rightHand.quaternion.copy(best).multiply(new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(step * sign))).normalize();
          root.updateMatrixWorld(true);
          const score = scoreBlade(THREE, grip, swordRoot, desiredDirectionWorld);
          if (score + 0.0001 < bestScore) {
            best = rightHand.quaternion.clone();
            bestScore = score;
            improved = true;
          }
        }
      }
    }
  }
  rightHand.quaternion.copy(best).normalize();
  root.updateMatrixWorld(true);
  return {
    quaternion: best.clone(),
    angleErrorDeg: Number(bestScore.toFixed(3)),
    rotationFromAuthoredDeg: Number(THREE.MathUtils.radToDeg(start.angleTo(best)).toFixed(3)),
  };
}
function hiltAndBladeReport(THREE, root, grip, swordRoot, label, desiredDirectionWorld) {
  root.updateMatrixWorld(true);
  const hilt = grip.getWorldPosition(new THREE.Vector3());
  const actualBlade = bladeDirectionWorld(THREE, grip, swordRoot);
  return {
    label,
    hiltWorld: vectorArray(hilt),
    desiredBladeDirectionWorld: vectorArray(desiredDirectionWorld),
    actualBladeDirectionWorld: vectorArray(actualBlade),
    bladeAngleErrorDeg: angleDeg(THREE, actualBlade, desiredDirectionWorld),
  };
}

async function main() {
  ensureBrowserShim();
  const reference = JSON.parse(fs.readFileSync(referencePath, 'utf8'));
  if (reference.sourceClip !== sourceClipName) throw new Error(`unexpected source clip ${reference.sourceClip}`);
  const sandbox = ensureThreeSandbox();
  const THREE = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'build', 'three.module.js')).href);
  const { GLTFLoader } = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js')).href);
  const crimson = await loadGltf(GLTFLoader, crimsonPath);
  const sword = await loadGltf(GLTFLoader, swordPath);
  const crimsonRoot = normalizeCharacter(THREE, crimson.scene);
  const swordRoot = sword.scene;
  attachCrimsonSword(THREE, crimsonRoot, swordRoot);
  const grip = requireNode(crimsonRoot, 'SaberGrip');
  const rightHand = requireNode(crimsonRoot, 'RightHand');
  const boneNames = ['Hips', 'Spine02', 'Spine01', 'Spine', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'];
  const baseBones = restBones(crimsonRoot, boneNames);
  const frames = [];
  const report = [];
  const startHilt = new THREE.Vector3();
  for (const [label, time] of Object.entries(primeKeys)) {
    const plan = framePlans[label];
    const desiredBlade = new THREE.Vector3(...plan.blade).normalize();
    applyAuthoredFrame(THREE, crimsonRoot, baseBones, plan);
    const solved = solveHandBladeForward(THREE, crimsonRoot, rightHand, grip, swordRoot, desiredBlade);
    const bones = restBones(crimsonRoot, boneNames);
    const entry = {
      ...hiltAndBladeReport(THREE, crimsonRoot, grip, swordRoot, label, desiredBlade),
      time,
      rightHandSolveRotationDeg: solved.rotationFromAuthoredDeg,
      rollRestoration: {
        method: 'bounded local-axis right-hand solve after body FK; restores blade roll against desired world direction while preserving SaberGrip and Arborblade local transforms',
        input: 'Vanguard SwordAttack1 timing plus frame intent; no direct Weapon.R quaternion copy',
      },
    };
    if (label === 'start') startHilt.fromArray(entry.hiltWorld);
    entry.hiltTravelFromStart = Number(new THREE.Vector3(...entry.hiltWorld).distanceTo(startHilt).toFixed(5));
    frames.push({ time, label, note: plan.note, bones });
    report.push(entry);
  }
  const failures = [];
  for (const entry of report) {
    if (entry.bladeAngleErrorDeg > bladeThresholds.allBladeTargetAngleDeg) failures.push(`BLADE_TARGET_ERROR:${entry.label}:${entry.bladeAngleErrorDeg}`);
    if ((entry.label === 'contact' || entry.label === 'contactHold') && entry.bladeAngleErrorDeg > bladeThresholds.contactBladeForwardAngleDeg) failures.push(`CONTACT_NOT_FORWARD:${entry.label}:${entry.bladeAngleErrorDeg}`);
  }
  const contact = report.find((entry) => entry.label === 'contact');
  if (!contact || contact.hiltTravelFromStart < bladeThresholds.contactHiltTravelMin) failures.push(`CONTACT_HILT_TRAVEL_TOO_SMALL:${contact?.hiltTravelFromStart ?? 'missing'}`);
  const startHand = new THREE.Quaternion().fromArray(frames[0].bones.RightHand);
  const handTravel = Math.max(...frames.map((frame) => THREE.MathUtils.radToDeg(startHand.angleTo(new THREE.Quaternion().fromArray(frame.bones.RightHand)))));
  if (handTravel < bladeThresholds.authoredRightHandTravelMinDeg) failures.push(`RIGHT_HAND_TRAVEL_TOO_SMALL:${handTravel.toFixed(3)}`);
  if (failures.length) {
    console.error(JSON.stringify({ ok: false, reason: 'CRIMSON_LIGHT_ATTACK1_GUARD_FAILED', failures, report }, null, 2));
    process.exit(1);
  }
  const payload = {
    schema: 'pose-lab-v2-attack-candidate-v1',
    id: candidateId,
    label: 'Crimson light attack 1 from Vanguard SwordAttack1',
    primeKeys,
    source: {
      character: 'crimson',
      clip: sourceClipName,
      duration: Number(reference.duration.toFixed(6)),
      vanguardReference: 'public/assets/crimson/vanguard_swordattack1_reference.json',
      sourceGlb: reference.sourceGlb,
      crimson: './assets/crimson/crimson_plume_knight_rigged_pbr.glb',
      sabre: './assets/crimson/arborblade_sword.glb',
      method: 'vanguard-timed-crimson-authored-fk-with-bounded-blade-roll-restoration',
      policy: {
        role: 'quarantined review candidate, not accepted repo truth',
        forbiddenUse: reference.policy?.forbiddenUse || 'Do not copy Vanguard Weapon.R transforms directly into Crimson as accepted sword orientation.',
        rootMotion: 'Vanguard root motion is preserved in sidecar data and not applied in Pose Lab.',
      },
      authoredBones: boneNames,
      preservedSocket: { saberGripLocal: CRIMSON_SABER_GRIP_LOCAL, swordLocal: CRIMSON_SWORD_LOCAL, bladeLocalAxis: CRIMSON_SWORD_REVIEW_LOCAL_AXIS },
    },
    guardReport: {
      crimsonLightAttack1: {
        status: 'PASS',
        thresholds: bladeThresholds,
        report,
        note: 'This guard checks generated Crimson pose data and real Arborblade blade axis. It is a diagnostic guardrail, not cloud visual acceptance.',
      },
    },
    frames,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `export const ${exportName} = ${JSON.stringify(payload, null, 2)};\n`);
  console.log(JSON.stringify({ ok: true, wrote: path.relative(projectRoot, outputPath), candidate: candidateId, exportName, frames: frames.length, report }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

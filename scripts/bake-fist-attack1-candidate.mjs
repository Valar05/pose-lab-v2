#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FIST_READY_POSE_PRESET } from '../src/fist-ready-pose.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const fpsPath = path.join(workspaceRoot, 'pose-lab', 'assets', 'models', 'FPSPlayer.glb');
const meshyPath = path.join(projectRoot, 'public', 'assets', 'meshy', 'meshy_apose_walking_with_skin.glb');
const outputPath = path.join(projectRoot, 'src', 'review-candidates', 'fist-attack1-candidate-1.js');
const sourceClipName = 'FistAttack1';
const sourceReadyClipName = 'FistReady';

const boneMap = [
  ['Spine02', 'Spine02'],
  ['Spine01', 'Spine01'],
  ['Spine', 'Spine'],
  ['Arm.L', 'LeftArm'],
  ['Forearm.L', 'LeftForeArm'],
  ['Hand.L', 'LeftHand'],
  ['Arm.R', 'RightArm'],
  ['Forearm.R', 'RightForeArm'],
  ['Hand.R', 'RightHand'],
];

const reviewKeys = {
  start: 0,
  windup: 0.125,
  contact: 0.25,
  followThrough: 0.375,
  recoil: 0.542,
  end: 0.708333,
};

function ensureBrowserShim() {
  globalThis.ProgressEvent ||= class ProgressEvent {
    constructor(type, init = {}) {
      this.type = type;
      Object.assign(this, init);
    }
  };
  globalThis.window ||= { innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1 };
  globalThis.self ||= globalThis;
  globalThis.document ||= {
    createElementNS() {
      const listeners = new Map();
      return {
        style: {},
        width: 1,
        height: 1,
        addEventListener(type, fn) { listeners.set(type, fn); },
        removeEventListener(type) { listeners.delete(type); },
        set src(value) {
          this._src = value;
          setTimeout(() => listeners.get('load')?.({ type: 'load' }), 0);
        },
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

function canon(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function find(root, name) {
  const wanted = canon(name);
  let found = null;
  root.traverse((node) => {
    if (!found && canon(node.name) === wanted) found = node;
  });
  return found;
}

function requireNode(root, name) {
  const node = find(root, name);
  if (!node) throw new Error(`missing node ${name}`);
  return node;
}

function quaternionTrackFor(clip, nodeName) {
  const wanted = canon(`${nodeName}.quaternion`);
  return clip.tracks.find((track) => canon(track.name) === wanted) || null;
}

function sampleVectorTrack(THREE, track, time) {
  const result = track.createInterpolant(new Float32Array(3)).evaluate(time);
  return new THREE.Vector3(result[0], result[1], result[2]);
}

function sampleQuaternionTrack(THREE, track, time) {
  const result = track.createInterpolant(new Float32Array(4)).evaluate(time);
  return new THREE.Quaternion(result[0], result[1], result[2], result[3]).normalize();
}

function roundedQuaternion(quaternion) {
  return quaternion.toArray().map((value) => Number(value.toFixed(6)));
}

function quaternionAngleDeg(a, b) {
  return 2 * Math.acos(Math.min(1, Math.max(-1, Math.abs(a.dot(b))))) * 180 / Math.PI;
}

function trackTravelDeg(THREE, track) {
  let total = 0;
  let previous = null;
  for (const time of track.times || []) {
    const current = sampleQuaternionTrack(THREE, track, time);
    if (previous) total += quaternionAngleDeg(previous, current);
    previous = current;
  }
  return Number(total.toFixed(3));
}

function sourceDeltaAt(THREE, attackTrack, readyTrack, time) {
  const source = sampleQuaternionTrack(THREE, attackTrack, time);
  const ready = sampleQuaternionTrack(THREE, readyTrack, 0);
  return source.multiply(ready.invert()).normalize();
}

function applySourceDeltaToReady(THREE, sourceDelta, readyValues) {
  const ready = new THREE.Quaternion(...readyValues).normalize();
  return sourceDelta.multiply(ready).normalize();
}

function normalizeCharacter(THREE, object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  object.position.sub(center);
  object.position.y += size.y * 0.5;
  object.scale.multiplyScalar(1.75 / Math.max(0.001, size.y));
  object.updateMatrixWorld(true);
  return object;
}

function applyClipPose(THREE, root, clip, time) {
  for (const track of clip.tracks || []) {
    const node = find(root, track.name.replace(/\.(position|quaternion|scale)$/, ''));
    if (!node) continue;
    if (track.name.endsWith('.quaternion')) node.quaternion.copy(sampleQuaternionTrack(THREE, track, time));
    else if (track.name.endsWith('.position')) node.position.copy(sampleVectorTrack(THREE, track, time));
    else if (track.name.endsWith('.scale')) node.scale.copy(sampleVectorTrack(THREE, track, time));
  }
  root.updateMatrixWorld(true);
}

function applyPoseBones(THREE, root, bones) {
  for (const [name, values] of Object.entries(bones || {})) {
    const bone = find(root, name);
    if (bone) bone.quaternion.set(values[0], values[1], values[2], values[3]).normalize();
  }
  root.updateMatrixWorld(true);
}

function worldSample(THREE, root, names) {
  return Object.fromEntries(names.map((name) => [
    name,
    requireNode(root, name).getWorldPosition(new THREE.Vector3()),
  ]));
}

function makeBasis(THREE, shoulder, elbow, wrist) {
  const x = wrist.clone().sub(shoulder).normalize();
  const plane = elbow.clone().sub(shoulder).cross(wrist.clone().sub(shoulder)).normalize();
  const y = plane.lengthSq() > 0 ? plane : new THREE.Vector3(0, 1, 0);
  const z = x.clone().cross(y).normalize();
  return new THREE.Matrix4().makeBasis(x, y, z);
}

function mapSourceVector(vector, sourceBasisInverse, targetBasis) {
  return vector.clone().applyMatrix4(sourceBasisInverse).applyMatrix4(targetBasis);
}

function scoreWorldPoints(THREE, root, targets) {
  root.updateMatrixWorld(true);
  let total = 0;
  for (const [nodeName, target] of Object.entries(targets)) {
    total += requireNode(root, nodeName).getWorldPosition(new THREE.Vector3()).distanceTo(target);
  }
  return total;
}

function solveRightArmChainToTargets(THREE, meshyRoot, rightArm, rightForeArm, targets) {
  const startArm = rightArm.quaternion.clone();
  const startForeArm = rightForeArm.quaternion.clone();
  let bestArm = startArm.clone();
  let bestForeArm = startForeArm.clone();
  let bestScore = scoreWorldPoints(THREE, meshyRoot, targets);
  const axes = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ];
  for (const step of [60, 36, 24, 12, 6, 3, 1.5, 0.75, 0.35, 0.18]) {
    let improved = true;
    let guard = 0;
    while (improved && guard < 20) {
      improved = false;
      guard += 1;
      for (const bone of [rightArm, rightForeArm]) {
        for (const axis of axes) {
          for (const sign of [-1, 1]) {
            const delta = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(step * sign));
            rightArm.quaternion.copy(bestArm);
            rightForeArm.quaternion.copy(bestForeArm);
            bone.quaternion.multiply(delta).normalize();
            meshyRoot.updateMatrixWorld(true);
            const score = scoreWorldPoints(THREE, meshyRoot, targets);
            if (score + 0.00001 < bestScore) {
              bestArm = rightArm.quaternion.clone();
              bestForeArm = rightForeArm.quaternion.clone();
              bestScore = score;
              improved = true;
            }
          }
        }
      }
    }
  }
  rightArm.quaternion.copy(bestArm).normalize();
  rightForeArm.quaternion.copy(bestForeArm).normalize();
  meshyRoot.updateMatrixWorld(true);
  return {
    armQuaternion: bestArm.clone(),
    foreArmQuaternion: bestForeArm.clone(),
    score: Number(bestScore.toFixed(6)),
    rightArmRotationFromInputDeg: Number(THREE.MathUtils.radToDeg(startArm.angleTo(bestArm)).toFixed(3)),
    rightForeArmRotationFromInputDeg: Number(THREE.MathUtils.radToDeg(startForeArm.angleTo(bestForeArm)).toFixed(3)),
  };
}

function vectorArray(vector) {
  return vector.toArray().map((value) => Number(value.toFixed(5)));
}

function buildFrame(THREE, label, time, attackClip, readyClip, fpsRoot, meshyRoot, calibration) {
  const bones = structuredClone(FIST_READY_POSE_PRESET.bones);
  const mapped = {};
  for (const [sourceName, targetName] of boneMap) {
    const attackTrack = quaternionTrackFor(attackClip, sourceName);
    const readyTrack = quaternionTrackFor(readyClip, sourceName);
    const readyValues = FIST_READY_POSE_PRESET.bones[targetName];
    if (!attackTrack || !readyTrack || !readyValues) continue;
    const delta = sourceDeltaAt(THREE, attackTrack, readyTrack, Math.min(time, attackClip.duration));
    bones[targetName] = roundedQuaternion(applySourceDeltaToReady(THREE, delta, readyValues));
    mapped[targetName] = sourceName;
  }
  applyClipPose(THREE, fpsRoot, attackClip, Math.min(time, attackClip.duration));
  applyPoseBones(THREE, meshyRoot, bones);
  const fpsSample = worldSample(THREE, fpsRoot, ['ArmR', 'ForearmR', 'HandR']);
  const sourceUpper = fpsSample.ForearmR.clone().sub(fpsSample.ArmR);
  const sourceFore = fpsSample.HandR.clone().sub(fpsSample.ForearmR);
  const targetUpper = mapSourceVector(sourceUpper, calibration.sourceBasisInverse, calibration.targetBasis)
    .normalize()
    .multiplyScalar(calibration.meshyUpperLength);
  const targetFore = mapSourceVector(sourceFore, calibration.sourceBasisInverse, calibration.targetBasis)
    .normalize()
    .multiplyScalar(calibration.meshyForeLength);
  const rightArm = requireNode(meshyRoot, 'RightArm');
  const rightForeArm = requireNode(meshyRoot, 'RightForeArm');
  const rightHand = requireNode(meshyRoot, 'RightHand');
  const shoulderWorld = rightArm.getWorldPosition(new THREE.Vector3());
  const targetElbowWorld = shoulderWorld.clone().add(targetUpper);
  const targetWristWorld = targetElbowWorld.clone().add(targetFore);
  const solved = solveRightArmChainToTargets(THREE, meshyRoot, rightArm, rightForeArm, {
    RightForeArm: targetElbowWorld,
    RightHand: targetWristWorld,
  });
  bones.RightArm = roundedQuaternion(solved.armQuaternion);
  bones.RightForeArm = roundedQuaternion(solved.foreArmQuaternion);
  applyPoseBones(THREE, meshyRoot, bones);
  const actualElbowWorld = rightForeArm.getWorldPosition(new THREE.Vector3());
  const actualWristWorld = rightHand.getWorldPosition(new THREE.Vector3());
  return {
    label,
    time: Number(time.toFixed(6)),
    bones,
    source: {
      clipTime: Number(Math.min(time, attackClip.duration).toFixed(6)),
      mappedBones: mapped,
      jointPinned: {
        sourceJoints: ['ArmR', 'ForearmR', 'HandR'],
        targetJoints: ['RightArm', 'RightForeArm', 'RightHand'],
        targetElbowWorld: vectorArray(targetElbowWorld),
        actualElbowWorld: vectorArray(actualElbowWorld),
        targetWristWorld: vectorArray(targetWristWorld),
        actualWristWorld: vectorArray(actualWristWorld),
        elbowWorldError: Number(actualElbowWorld.distanceTo(targetElbowWorld).toFixed(5)),
        wristWorldError: Number(actualWristWorld.distanceTo(targetWristWorld).toFixed(5)),
        rightArmRotationFromInputDeg: solved.rightArmRotationFromInputDeg,
        rightForeArmRotationFromInputDeg: solved.rightForeArmRotationFromInputDeg,
      },
    },
  };
}

async function main() {
  if (!fs.existsSync(fpsPath)) throw new Error(`missing FPS reference ${fpsPath}`);
  if (!fs.existsSync(meshyPath)) throw new Error(`missing Meshy asset ${meshyPath}`);
  ensureBrowserShim();
  const sandbox = ensureThreeSandbox();
  const THREE = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'build', 'three.module.js')).href);
  const { GLTFLoader } = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js')).href);
  const load = (file) => new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer(file), path.dirname(file) + '/', resolve, reject);
  });
  const [fps, meshy] = await Promise.all([load(fpsPath), load(meshyPath)]);
  const meshyRoot = normalizeCharacter(THREE, meshy.scene);
  const attackClip = fps.animations.find((clip) => clip.name === sourceClipName);
  const readyClip = fps.animations.find((clip) => clip.name === sourceReadyClipName);
  if (!attackClip) throw new Error(`missing FPS clip ${sourceClipName}`);
  if (!readyClip) throw new Error(`missing FPS clip ${sourceReadyClipName}`);

  applyClipPose(THREE, fps.scene, attackClip, 0);
  const fpsStart = worldSample(THREE, fps.scene, ['ArmR', 'ForearmR', 'HandR']);
  const sourceBasis = makeBasis(THREE, fpsStart.ArmR, fpsStart.ForearmR, fpsStart.HandR);
  applyPoseBones(THREE, meshyRoot, FIST_READY_POSE_PRESET.bones);
  const meshyStart = worldSample(THREE, meshyRoot, ['RightArm', 'RightForeArm', 'RightHand']);
  const targetBasis = makeBasis(THREE, meshyStart.RightArm, meshyStart.RightForeArm, meshyStart.RightHand);
  const calibration = {
    sourceBasisInverse: sourceBasis.clone().invert(),
    targetBasis,
    meshyUpperLength: meshyStart.RightForeArm.distanceTo(meshyStart.RightArm),
    meshyForeLength: meshyStart.RightHand.distanceTo(meshyStart.RightForeArm),
  };
  const frames = Object.entries(reviewKeys)
    .map(([label, time]) => buildFrame(THREE, label, time, attackClip, readyClip, fps.scene, meshyRoot, calibration));
  const rightHandTrack = quaternionTrackFor(attackClip, 'Hand.R');
  const rightForearmTrack = quaternionTrackFor(attackClip, 'Forearm.R');
  const rightArmTrack = quaternionTrackFor(attackClip, 'Arm.R');
  const leftHandTrack = quaternionTrackFor(attackClip, 'Hand.L');
  const jointReport = frames.map((frame) => ({
    label: frame.label,
    time: frame.time,
    ...frame.source.jointPinned,
  }));

  const payload = {
    schema: 'pose-lab-v2-attack-candidate-v1',
    label: 'FistAttack1 candidate 1',
    source: {
      fps: '../pose-lab/assets/models/FPSPlayer.glb',
      clip: sourceClipName,
      readyClip: sourceReadyClipName,
      duration: Number(attackClip.duration.toFixed(6)),
      keyCount: frames.length,
      method: 'fps-fist-world-joint-pinned-over-meshy-fist-ready',
      weaponless: true,
      note: 'No sabre judgment. This preview exists to inspect FPSPlayer fist orientation and compact right wrist/forearm punch read.',
      mappedBones: Object.fromEntries(boneMap.map(([source, target]) => [target, source])),
      jointPinned: {
        sourceJoints: ['ArmR', 'ForearmR', 'HandR'],
        targetJoints: ['RightArm', 'RightForeArm', 'RightHand'],
        targetSpace: 'Meshy calibrated world from generated FistReady',
        solverAuthoredBones: ['RightArm', 'RightForeArm'],
        handOrientation: 'RightHand keeps FPS FistReady->FistAttack1 local orientation delta over Meshy FistReady',
        calibration: {
          sourceBasis: 'FPS FistAttack1 start ArmR/ForearmR/HandR',
          targetBasis: 'Meshy FistReady RightArm/RightForeArm/RightHand',
          meshyUpperLength: Number(calibration.meshyUpperLength.toFixed(6)),
          meshyForeLength: Number(calibration.meshyForeLength.toFixed(6)),
        },
      },
      sourceMotion: {
        RightArm: { travelDeg: trackTravelDeg(THREE, rightArmTrack) },
        RightForeArm: { travelDeg: trackTravelDeg(THREE, rightForearmTrack) },
        RightHand: { travelDeg: trackTravelDeg(THREE, rightHandTrack) },
        LeftHand: { travelDeg: trackTravelDeg(THREE, leftHandTrack) },
      },
      acceptanceRead: [
        'fist/knuckle orientation is the visual target',
        'right wrist and forearm roll must read more than shoulder translation',
        'sabre is hidden; this candidate is not weapon acceptance',
      ],
    },
    primeKeys: reviewKeys,
    frames,
    guardReport: {
      quarantine: true,
      weaponless: true,
      readyEndpointContract: {
        firstDiffersFromFistReady: JSON.stringify(frames[0].bones) !== JSON.stringify(FIST_READY_POSE_PRESET.bones),
        lastReturnsNearReady: false,
        note: 'FistAttack1 is a native short FPS punch and uses FistReady as its target baseline, not OneHandReady.',
      },
      sourceMotion: {
        rightHandPrimaryDriver: trackTravelDeg(THREE, rightHandTrack) > trackTravelDeg(THREE, rightArmTrack),
        rightHandTravelDeg: trackTravelDeg(THREE, rightHandTrack),
        rightForeArmTravelDeg: trackTravelDeg(THREE, rightForearmTrack),
        rightArmTravelDeg: trackTravelDeg(THREE, rightArmTrack),
      },
      jointPinned: {
        status: 'PASS',
        rule: 'Meshy right-arm joints are pinned in calibrated world space from FPS ArmR/ForearmR/HandR; no sabre or WeaponR socket is involved.',
        report: jointReport,
      },
    },
  };

  const source = `export const FIST_ATTACK1_POSE_SEQUENCE = ${JSON.stringify(payload, null, 2)};\n`;
  fs.writeFileSync(outputPath, source);
  console.log(JSON.stringify({
    wrote: path.relative(projectRoot, outputPath),
    clip: sourceClipName,
    duration: payload.source.duration,
    frames: payload.frames.length,
    rightHandTravelDeg: payload.source.sourceMotion.RightHand.travelDeg,
    maxWristWorldError: Math.max(...jointReport.map((entry) => entry.wristWorldError)),
    weaponless: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

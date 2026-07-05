#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  REVIEW_CAMERA_CONTRACT,
  SABER_GRIP_LOCAL,
  SABRE_REVIEW_LOCAL_AXIS,
} from '../src/review-constants.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const fpsPath = path.join(workspaceRoot, 'pose-lab', 'assets', 'models', 'FPSPlayer.glb');
const meshyPath = path.join(projectRoot, 'public', 'assets', 'meshy', 'meshy_apose_walking_with_skin.glb');
const readyPosePath = path.join(projectRoot, 'src', 'ready-pose.js');
const outputPath = path.join(projectRoot, 'src', 'review-candidates', 'attack1-candidate-1.js');
const sourceClipName = 'OneHandAttack1';
const readyClipName = 'OneHandReady';
const restClipName = '0T-Pose';
const sourceFrameName = 'ShoulderCenter';
const targetFrameName = 'Spine02';
const bladeGuardTolerancePx = 2;
const bladeAxisLength = 0.62;

const primeKeys = {
  start: 0,
  anticipation: 0.25,
  contact: 0.458333,
  followThrough: 0.75,
  recoil: 1.0,
  end: 1.25,
};

const chains = [
  {
    label: 'right',
    source: ['Arm.R', 'Forearm.R', 'Hand.R'],
    target: ['RightArm', 'RightForeArm', 'RightHand'],
    targetLocalAxis: [0, -1, 0],
    sourceLocalAxis: [0, 0, 1],
  },
  {
    label: 'left',
    source: ['Arm.L', 'Forearm.L', 'Hand.L'],
    target: ['LeftArm', 'LeftForeArm', 'LeftHand'],
    targetLocalAxis: [0, -1, 0],
    sourceLocalAxis: [0, 0, 1],
  },
];

const exportBones = [
  'Spine02',
  'Spine01',
  'Spine',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand',
  'neck',
  'Head',
];

const sourceSignatureNodes = ['Arm.R', 'Forearm.R', 'Hand.R', 'Weapon.R'];
const anticipationGraphShape = {
  centerTime: primeKeys.anticipation,
  startTime: primeKeys.start,
  releaseTime: primeKeys.contact,
  endTime: primeKeys.followThrough,
  // Authored graph-wide wind-up: the right hand travels to the character's
  // right side in the front/orbit view while the blade trails back across the body.
  boneLocalEulerDeg: {
    RightArm: [-18, -36, 46],
    RightForeArm: [10, -18, 24],
    RightHand: [0, 0, 0],
  },
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

function worldPosition(THREE, node) {
  return node.getWorldPosition(new THREE.Vector3());
}

function worldQuaternion(THREE, node) {
  return node.getWorldQuaternion(new THREE.Quaternion()).normalize();
}

function setWorldQuaternion(THREE, bone, targetWorld) {
  const parentWorld = bone.parent ? worldQuaternion(THREE, bone.parent).invert() : new THREE.Quaternion();
  bone.quaternion.copy(parentWorld.multiply(targetWorld).normalize());
}

function captureWorldQuaternions(THREE, root) {
  const out = new Map();
  root.updateMatrixWorld(true);
  root.traverse((node) => {
    if (node.isBone || node.isObject3D) out.set(canon(node.name), node.getWorldQuaternion(new THREE.Quaternion()).normalize());
  });
  return out;
}

function captureLocalQuaternions(root) {
  const out = new Map();
  root.traverse((node) => {
    if (node.isBone || node.isObject3D) out.set(canon(node.name), node.quaternion.clone().normalize());
  });
  return out;
}

function applyLocalQuaternions(root, map) {
  root.traverse((node) => {
    const quaternion = map.get(canon(node.name));
    if (quaternion) node.quaternion.copy(quaternion).normalize();
  });
  root.updateMatrixWorld(true);
}

function segmentDirection(THREE, a, b) {
  const direction = worldPosition(THREE, b).sub(worldPosition(THREE, a));
  return direction.lengthSq() > 1e-8 ? direction.normalize() : null;
}

function worldDirection(THREE, node, axis) {
  return new THREE.Vector3(...axis).normalize().applyQuaternion(worldQuaternion(THREE, node)).normalize();
}

function projectedAroundAxis(THREE, direction, axis) {
  const normal = axis.clone().normalize();
  const projected = direction.clone().sub(normal.multiplyScalar(direction.dot(normal)));
  return projected.lengthSq() > 1e-8 ? projected.normalize() : null;
}

function mapDirectionBetweenFrames(THREE, direction, sourceFrame, targetFrame) {
  const sourceLocal = direction.clone().normalize().applyQuaternion(worldQuaternion(THREE, sourceFrame).invert()).normalize();
  return sourceLocal.applyQuaternion(worldQuaternion(THREE, targetFrame)).normalize();
}

function rotateHandRoll(THREE, sceneRoot, fpsRoot, meshyRoot, chain) {
  const sourceFrame = requireNode(fpsRoot, sourceFrameName);
  const targetFrame = requireNode(meshyRoot, targetFrameName);
  const sourceHand = requireNode(fpsRoot, chain.source[2]);
  const lower = requireNode(meshyRoot, chain.target[1]);
  const hand = requireNode(meshyRoot, chain.target[2]);
  const axis = segmentDirection(THREE, lower, hand);
  if (!axis) return;
  const desired = projectedAroundAxis(
    THREE,
    mapDirectionBetweenFrames(THREE, worldDirection(THREE, sourceHand, chain.sourceLocalAxis), sourceFrame, targetFrame),
    axis
  );
  const current = projectedAroundAxis(THREE, worldDirection(THREE, hand, chain.targetLocalAxis), axis);
  if (!desired || !current) return;
  const signed = Math.atan2(new THREE.Vector3().crossVectors(current, desired).dot(axis), current.dot(desired));
  const turn = new THREE.Quaternion().setFromAxisAngle(axis, signed).normalize();
  setWorldQuaternion(THREE, hand, turn.multiply(worldQuaternion(THREE, hand)).normalize());
  sceneRoot.updateMatrixWorld(true);
}

function mapSourceDeltaToTargetFrame(THREE, sourceDelta, sourceFrameRestWorld, targetFrameRestWorld) {
  const sourceFrameToTargetFrame = targetFrameRestWorld.clone().multiply(sourceFrameRestWorld.clone().invert()).normalize();
  return sourceFrameToTargetFrame
    .clone()
    .multiply(sourceDelta)
    .multiply(sourceFrameToTargetFrame.clone().invert())
    .normalize();
}

function applyOrientationBake(THREE, fpsRoot, meshyRoot, sourceRestWorld, targetRestWorld) {
  const sourceFrameRestWorld = sourceRestWorld.get(canon(sourceFrameName));
  const targetFrameRestWorld = targetRestWorld.get(canon(targetFrameName));
  const baked = [];
  for (const chain of chains) {
    for (let i = 0; i < chain.source.length; i += 1) {
      const sourceName = chain.source[i];
      const targetName = chain.target[i];
      const sourceRest = sourceRestWorld.get(canon(sourceName));
      const sourceNow = worldQuaternion(THREE, requireNode(fpsRoot, sourceName));
      const targetRest = targetRestWorld.get(canon(targetName));
      const targetBone = requireNode(meshyRoot, targetName);
      if (!sourceRest || !sourceNow || !targetRest || !sourceFrameRestWorld || !targetFrameRestWorld) continue;
      const sourceDelta = sourceNow.clone().multiply(sourceRest.clone().invert()).normalize();
      const mappedDelta = mapSourceDeltaToTargetFrame(THREE, sourceDelta, sourceFrameRestWorld, targetFrameRestWorld);
      setWorldQuaternion(THREE, targetBone, mappedDelta.multiply(targetRest).normalize());
      meshyRoot.updateMatrixWorld(true);
      baked.push(targetName);
    }
  }
  return baked;
}

function sampleQuaternionTrack(THREE, track, time) {
  const result = track.createInterpolant(new Float32Array(4)).evaluate(time);
  return new THREE.Quaternion(result[0], result[1], result[2], result[3]).normalize();
}

function applyClipPose(THREE, root, clip, time) {
  for (const track of clip.tracks || []) {
    if (!track.name.endsWith('.quaternion')) continue;
    const node = find(root, track.name.replace(/\.quaternion$/, ''));
    if (node) node.quaternion.copy(sampleQuaternionTrack(THREE, track, time));
  }
  root.updateMatrixWorld(true);
}

function roundedQuaternion(quaternion) {
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w].map((value) => Number(value.toFixed(6)));
}

function quaternionFromArray(THREE, values) {
  return new THREE.Quaternion(values[0], values[1], values[2], values[3]).normalize();
}

function quaternionAngleDeg(THREE, a, b) {
  return Number((quaternionFromArray(THREE, a).angleTo(quaternionFromArray(THREE, b)) * 180 / Math.PI).toFixed(3));
}

function posePayload(meshyRoot) {
  const bones = {};
  for (const name of exportBones) {
    const bone = find(meshyRoot, name);
    if (bone) bones[name] = roundedQuaternion(bone.quaternion);
  }
  return bones;
}

function sourceKeyTimes(clip) {
  const times = new Set();
  for (const track of clip.tracks || []) {
    if (!track.name.endsWith('.quaternion')) continue;
    const name = track.name.replace(/\.quaternion$/, '');
    const key = canon(name);
    if (!sourceSignatureNodes.some((sourceName) => canon(sourceName) === key)
      && !chains.some((chain) => chain.source.some((sourceName) => canon(sourceName) === key))) continue;
    for (const time of track.times || []) times.add(Number(time.toFixed(6)));
  }
  return [...times].sort((a, b) => a - b);
}

function trackFor(clip, nodeName) {
  const wanted = canon(nodeName);
  return (clip.tracks || []).find((track) => (
    track.name.endsWith('.quaternion') && canon(track.name.replace(/\.quaternion$/, '')) === wanted
  )) || null;
}

function quaternionTravelDeg(quaternions) {
  let total = 0;
  for (let i = 1; i < quaternions.length; i += 1) total += quaternions[i - 1].angleTo(quaternions[i]);
  return Number((total * 180 / Math.PI).toFixed(3));
}

function sourceTrackTravelDeg(THREE, clip, nodeName, times) {
  const track = trackFor(clip, nodeName);
  if (!track) return null;
  return quaternionTravelDeg(times.map((time) => sampleQuaternionTrack(THREE, track, time)));
}

function targetFrameTravelDeg(THREE, frames, boneName) {
  return quaternionTravelDeg(frames
    .map((frame) => frame.bones[boneName])
    .filter(Boolean)
    .map((values) => quaternionFromArray(THREE, values)));
}

async function loadReadyBaseline() {
  const module = await import(`${pathToFileURL(readyPosePath).href}?t=${Date.now()}`);
  return module.READY_POSE_PRESET?.bones || {};
}

function applyPoseFrame(THREE, meshyRoot, frame) {
  for (const [name, values] of Object.entries(frame.bones || {})) {
    const bone = find(meshyRoot, name);
    if (bone) bone.quaternion.copy(quaternionFromArray(THREE, values));
  }
  meshyRoot.updateMatrixWorld(true);
}

function bakeCurrentFpsPoseToMeshy(THREE, fpsRoot, meshyRoot, context, retargetedBones = null) {
  applyLocalQuaternions(meshyRoot, context.targetRestLocal);
  meshyRoot.updateMatrixWorld(true);
  for (const name of applyOrientationBake(THREE, fpsRoot, meshyRoot, context.sourceRestWorld, context.targetRestWorld)) {
    retargetedBones?.add(name);
  }
  for (const chain of chains) rotateHandRoll(THREE, meshyRoot, fpsRoot, meshyRoot, chain);
  return posePayload(meshyRoot);
}

function applyReadyGraphOffsets(THREE, frames, acceptedReadyBones, rawReadyBones) {
  const adjustedBones = exportBones.filter((name) => acceptedReadyBones[name] && rawReadyBones[name]);
  const offsets = new Map();
  for (const name of adjustedBones) {
    offsets.set(name, quaternionFromArray(THREE, acceptedReadyBones[name])
      .multiply(quaternionFromArray(THREE, rawReadyBones[name]).invert())
      .normalize());
  }
  for (const frame of frames) {
    for (const name of adjustedBones) {
      const raw = quaternionFromArray(THREE, frame.bones[name]);
      frame.bones[name] = roundedQuaternion(offsets.get(name).clone().multiply(raw).normalize());
    }
  }
  return {
    adjustedBones,
    sourceReadyClip: readyClipName,
    offsetSpace: 'local-quaternion-ready-roll-offset',
  };
}

function eulerDeltaQuaternion(THREE, values) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(values[0]),
    THREE.MathUtils.degToRad(values[1]),
    THREE.MathUtils.degToRad(values[2]),
    'XYZ'
  )).normalize();
}

function anticipationEnvelope(time) {
  const { startTime, centerTime, releaseTime, endTime } = anticipationGraphShape;
  if (time <= startTime || time >= endTime) return 0;
  if (time <= centerTime) return (time - startTime) / Math.max(0.0001, centerTime - startTime);
  if (time <= releaseTime) return 1 - 0.25 * ((time - centerTime) / Math.max(0.0001, releaseTime - centerTime));
  return 0.75 * (1 - ((time - releaseTime) / Math.max(0.0001, endTime - releaseTime)));
}

function applyAnticipationGraphShape(THREE, frames) {
  const adjustedBones = Object.keys(anticipationGraphShape.boneLocalEulerDeg);
  const deltas = Object.fromEntries(Object.entries(anticipationGraphShape.boneLocalEulerDeg)
    .map(([name, values]) => [name, eulerDeltaQuaternion(THREE, values)]));
  for (const frame of frames) {
    const weight = anticipationEnvelope(frame.time);
    if (weight <= 0) continue;
    for (const name of adjustedBones) {
      if (!frame.bones[name]) continue;
      const base = quaternionFromArray(THREE, frame.bones[name]);
      const delta = new THREE.Quaternion().identity().slerp(deltas[name], weight).normalize();
      frame.bones[name] = roundedQuaternion(base.multiply(delta).normalize());
    }
  }
  return {
    adjustedBones,
    centerTime: anticipationGraphShape.centerTime,
    releaseTime: anticipationGraphShape.releaseTime,
    endTime: anticipationGraphShape.endTime,
    boneLocalEulerDeg: anticipationGraphShape.boneLocalEulerDeg,
    envelope: 'smooth wind-up across start->anticipation->contact->followThrough keys',
  };
}

function enforceReadyEndpointContract(frames, acceptedReadyBones) {
  const endpointBones = exportBones.filter((name) => acceptedReadyBones[name]);
  const first = frames[0]?.bones || {};
  const last = frames[frames.length - 1]?.bones || {};
  for (const name of endpointBones) {
    first[name] = acceptedReadyBones[name];
    last[name] = acceptedReadyBones[name];
  }
  return {
    endpointBones,
    firstMatchesReady: endpointBones.every((name) => first[name].every((value, index) => value === acceptedReadyBones[name][index])),
    lastMatchesReady: endpointBones.every((name) => last[name].every((value, index) => value === acceptedReadyBones[name][index])),
  };
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

function gripLocalQuaternion(THREE) {
  return new THREE.Quaternion().setFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(SABER_GRIP_LOCAL.rotationDeg[0]),
    THREE.MathUtils.degToRad(SABER_GRIP_LOCAL.rotationDeg[1]),
    THREE.MathUtils.degToRad(SABER_GRIP_LOCAL.rotationDeg[2]),
    'XYZ'
  )).normalize();
}

function virtualSaberGrip(THREE, meshyRoot) {
  const rightHand = requireNode(meshyRoot, 'RightHand');
  const handMatrix = rightHand.matrixWorld.clone();
  const local = new THREE.Matrix4().compose(
    new THREE.Vector3(...SABER_GRIP_LOCAL.position),
    gripLocalQuaternion(THREE),
    new THREE.Vector3(...SABER_GRIP_LOCAL.scale)
  );
  return handMatrix.multiply(local);
}

function projectWorld(THREE, camera, world, width, height) {
  const ndc = world.clone().project(camera);
  return new THREE.Vector2((ndc.x + 1) * width * 0.5, (-ndc.y + 1) * height * 0.5);
}

function bladeProbe(THREE, camera, meshyRoot) {
  meshyRoot.updateMatrixWorld(true);
  const matrix = virtualSaberGrip(THREE, meshyRoot);
  const hilt = new THREE.Vector3().setFromMatrixPosition(matrix);
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(matrix);
  const tip = hilt.clone().add(new THREE.Vector3(...SABRE_REVIEW_LOCAL_AXIS)
    .normalize()
    .applyQuaternion(quaternion)
    .multiplyScalar(bladeAxisLength));
  const [width, height] = REVIEW_CAMERA_CONTRACT.viewport;
  return {
    hilt,
    tip,
    hiltScreen: projectWorld(THREE, camera, hilt, width, height),
    tipScreen: projectWorld(THREE, camera, tip, width, height),
  };
}

function yOnInitialAxis(initial, x) {
  const dx = initial.tipScreen.x - initial.hiltScreen.x;
  if (Math.abs(dx) < 0.001) return Math.min(initial.tipScreen.y, initial.hiltScreen.y);
  const t = (x - initial.hiltScreen.x) / dx;
  return initial.hiltScreen.y + t * (initial.tipScreen.y - initial.hiltScreen.y);
}

function primeRegion(time) {
  const entries = Object.entries(primeKeys).sort((a, b) => a[1] - b[1]);
  let current = entries[0][0];
  for (const [label, value] of entries) {
    if (time >= value) current = label;
  }
  return current;
}

function evaluateBladeGuard(THREE, camera, meshyRoot, frames, acceptedReadyBones, sourceClip, fpsRoot) {
  applyPoseFrame(THREE, meshyRoot, { bones: acceptedReadyBones });
  const initial = bladeProbe(THREE, camera, meshyRoot);
  let worstDipPx = -Infinity;
  let firstFailure = null;
  const samples = [];
  for (const frame of frames) {
    applyPoseFrame(THREE, meshyRoot, frame);
    const probe = bladeProbe(THREE, camera, meshyRoot);
    const baselineY = yOnInitialAxis(initial, probe.tipScreen.x);
    const dipPx = Number((probe.tipScreen.y - baselineY).toFixed(3));
    worstDipPx = Math.max(worstDipPx, dipPx);
    const sample = {
      time: frame.time,
      primeRegion: primeRegion(frame.time),
      tipScreen: [Number(probe.tipScreen.x.toFixed(3)), Number(probe.tipScreen.y.toFixed(3))],
      hiltScreen: [Number(probe.hiltScreen.x.toFixed(3)), Number(probe.hiltScreen.y.toFixed(3))],
      initialAxisYAtTipX: Number(baselineY.toFixed(3)),
      signedDipPx: dipPx,
    };
    samples.push(sample);
    if (!firstFailure && dipPx > bladeGuardTolerancePx) {
      const weaponTrack = trackFor(sourceClip, 'Weapon.R');
      const sourceWeaponQuaternion = weaponTrack ? roundedQuaternion(sampleQuaternionTrack(THREE, weaponTrack, frame.time)) : null;
      applyClipPose(THREE, fpsRoot, sourceClip, frame.time);
      firstFailure = {
        ...sample,
        rightHandQuaternion: frame.bones.RightHand,
        rightForeArmQuaternion: frame.bones.RightForeArm,
        sourceWeaponRQuaternion: sourceWeaponQuaternion,
        sourceWeaponRDirection: worldDirection(THREE, requireNode(fpsRoot, 'Weapon.R'), SABRE_REVIEW_LOCAL_AXIS)
          .toArray()
          .map((value) => Number(value.toFixed(6))),
      };
    }
  }
  return {
    status: firstFailure ? 'FAIL' : 'PASS',
    rule: 'projected sabre +X tip must not dip below the frame-0 projected sabre +X axis',
    tolerancePx: bladeGuardTolerancePx,
    viewport: REVIEW_CAMERA_CONTRACT.viewport,
    initial: {
      hiltScreen: [Number(initial.hiltScreen.x.toFixed(3)), Number(initial.hiltScreen.y.toFixed(3))],
      tipScreen: [Number(initial.tipScreen.x.toFixed(3)), Number(initial.tipScreen.y.toFixed(3))],
    },
    worstDipPx: Number(worstDipPx.toFixed(3)),
    firstFailure,
    primeSamples: Object.fromEntries(Object.entries(primeKeys).map(([label, time]) => [
      label,
      samples.find((sample) => Math.abs(sample.time - time) < 0.00001) || null,
    ])),
  };
}

function evaluateAnticipationReadGuard(bladeGuard) {
  const start = bladeGuard.primeSamples.start;
  const anticipation = bladeGuard.primeSamples.anticipation;
  const hiltMovesCharacterRightPx = start.hiltScreen[0] - anticipation.hiltScreen[0];
  const bladeTrailsAcrossBodyPx = anticipation.tipScreen[0] - anticipation.hiltScreen[0];
  const failures = [];
  if (hiltMovesCharacterRightPx < 35) failures.push('ANTICIPATION_HILT_NOT_CHARACTER_RIGHT');
  if (bladeTrailsAcrossBodyPx < 60) failures.push('ANTICIPATION_BLADE_NOT_TRAILING_ACROSS_BODY');
  return {
    status: failures.length ? 'FAIL' : 'PASS',
    rule: 'at anticipation the right-hand hilt must move to character-right in front/orbit view while the sabre blade trails back across the body',
    thresholds: {
      hiltMovesCharacterRightPx: 35,
      bladeTrailsAcrossBodyPx: 60,
    },
    hiltMovesCharacterRightPx: Number(hiltMovesCharacterRightPx.toFixed(3)),
    bladeTrailsAcrossBodyPx: Number(bladeTrailsAcrossBodyPx.toFixed(3)),
    start,
    anticipation,
    failures,
  };
}

function setupReviewCamera(THREE) {
  const [width, height] = REVIEW_CAMERA_CONTRACT.viewport;
  const camera = new THREE.PerspectiveCamera(
    REVIEW_CAMERA_CONTRACT.fov,
    width / height,
    REVIEW_CAMERA_CONTRACT.near,
    REVIEW_CAMERA_CONTRACT.far
  );
  camera.position.fromArray(REVIEW_CAMERA_CONTRACT.position);
  camera.lookAt(new THREE.Vector3(...REVIEW_CAMERA_CONTRACT.target));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

async function main() {
  if (!fs.existsSync(fpsPath)) throw new Error(`missing FPS reference ${fpsPath}`);
  if (!fs.existsSync(meshyPath)) throw new Error(`missing Meshy asset ${meshyPath}`);
  ensureBrowserShim();
  const sandbox = ensureThreeSandbox();
  const THREE = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'build', 'three.module.js')).href);
  const { GLTFLoader } = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js')).href);
  const loadGlb = (file) => new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer(file), path.dirname(file) + '/', resolve, reject);
  });
  const [fps, meshy] = await Promise.all([loadGlb(fpsPath), loadGlb(meshyPath)]);
  const fpsRoot = fps.scene;
  const meshyRoot = normalizeCharacter(THREE, meshy.scene);
  const sourceClip = fps.animations.find((clip) => clip.name === sourceClipName);
  const readyClip = fps.animations.find((clip) => clip.name === readyClipName);
  const restClip = fps.animations.find((clip) => clip.name === restClipName);
  const readyBaseline = await loadReadyBaseline();
  if (!sourceClip) throw new Error(`missing FPS clip ${sourceClipName}`);
  if (!readyClip) throw new Error(`missing FPS clip ${readyClipName}`);
  if (restClip) applyClipPose(THREE, fpsRoot, restClip, 0);
  const sourceRestWorld = captureWorldQuaternions(THREE, fpsRoot);
  const targetRestWorld = captureWorldQuaternions(THREE, meshyRoot);
  const targetRestLocal = captureLocalQuaternions(meshyRoot);
  const times = sourceKeyTimes(sourceClip);
  if (times.length !== 31) throw new Error(`expected 31 source keys for ${sourceClipName}, found ${times.length}`);

  const context = { targetRestLocal, sourceRestWorld, targetRestWorld };
  applyClipPose(THREE, fpsRoot, readyClip, readyClip.duration);
  const rawReadyBones = bakeCurrentFpsPoseToMeshy(THREE, fpsRoot, meshyRoot, context);
  const retargetedBones = new Set();
  const frames = [];
  for (const time of times) {
    applyClipPose(THREE, fpsRoot, sourceClip, time);
    frames.push({
      time: Number(time.toFixed(6)),
      bones: bakeCurrentFpsPoseToMeshy(THREE, fpsRoot, meshyRoot, context, retargetedBones),
    });
  }
  const readyGraphOffset = applyReadyGraphOffsets(THREE, frames, readyBaseline, rawReadyBones);
  const anticipationGraphWindup = applyAnticipationGraphShape(THREE, frames);
  const readyEndpointContract = enforceReadyEndpointContract(frames, readyBaseline);
  const reviewCamera = setupReviewCamera(THREE);
  const bladeGuard = evaluateBladeGuard(THREE, reviewCamera, meshyRoot, frames, readyBaseline, sourceClip, fpsRoot);
  const anticipationReadGuard = evaluateAnticipationReadGuard(bladeGuard);
  if (bladeGuard.status !== 'PASS') {
    console.error(JSON.stringify({
      ok: false,
      reason: 'BLADE_GUARD_FAILED',
      bladeGuard,
    }, null, 2));
    process.exit(1);
  }
  if (anticipationReadGuard.status !== 'PASS') {
    console.error(JSON.stringify({
      ok: false,
      reason: 'ANTICIPATION_READ_GUARD_FAILED',
      anticipationReadGuard,
    }, null, 2));
    process.exit(1);
  }

  const payload = {
    schema: 'pose-lab-v2-attack-candidate-v1',
    label: 'Attack1 candidate 1',
    source: {
      fps: '../pose-lab/assets/models/FPSPlayer.glb',
      meshy: './public/assets/meshy/meshy_apose_walking_with_skin.glb',
      clip: sourceClipName,
      duration: Number(sourceClip.duration.toFixed(6)),
      keyCount: times.length,
      projectionFrame: `${sourceFrameName}->${targetFrameName}`,
      method: 'orientation-key-bake-with-ready-offsets-prime-key-review-and-screen-blade-guard',
      retargetedBones: [...retargetedBones],
      readyGraphOffset,
      anticipationGraphWindup,
      readyEndpointContract,
      signatureWristTwist: {
        sourceHandRotationTravelDeg: sourceTrackTravelDeg(THREE, sourceClip, 'Hand.R', times),
        sourceForearmRotationTravelDeg: sourceTrackTravelDeg(THREE, sourceClip, 'Forearm.R', times),
        sourceWeaponSocketRotationTravelDeg: sourceTrackTravelDeg(THREE, sourceClip, 'Weapon.R', times),
        bakedRightHandRotationTravelDeg: targetFrameTravelDeg(THREE, frames, 'RightHand'),
        bakedRightForeArmRotationTravelDeg: targetFrameTravelDeg(THREE, frames, 'RightForeArm'),
      },
    },
    primeKeys,
    guardReport: {
      bladeGuard,
      anticipationReadGuard,
      readyEndpointContract,
      startReadyAngleDeg: Object.fromEntries(exportBones
        .filter((name) => readyBaseline[name] && frames[0]?.bones?.[name])
        .map((name) => [name, quaternionAngleDeg(THREE, frames[0].bones[name], readyBaseline[name])])),
      endReadyAngleDeg: Object.fromEntries(exportBones
        .filter((name) => readyBaseline[name] && frames.at(-1)?.bones?.[name])
        .map((name) => [name, quaternionAngleDeg(THREE, frames.at(-1).bones[name], readyBaseline[name])])),
    },
    frames,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `export const ATTACK1_POSE_SEQUENCE = ${JSON.stringify(payload, null, 2)};\n`);
  console.log(JSON.stringify({
    ok: true,
    wrote: path.relative(projectRoot, outputPath),
    duration: payload.source.duration,
    frames: frames.length,
    primeKeys,
    signatureWristTwist: payload.source.signatureWristTwist,
    bladeGuard: payload.guardReport.bladeGuard,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

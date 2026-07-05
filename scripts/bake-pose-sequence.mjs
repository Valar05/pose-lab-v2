#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const fpsPath = path.join(workspaceRoot, 'pose-lab', 'assets', 'models', 'FPSPlayer.glb');
const meshyPath = path.join(projectRoot, 'public', 'assets', 'meshy', 'meshy_apose_walking_with_skin.glb');
const restClipName = '0T-Pose';
const readyClipName = 'OneHandReady';
const sourceFrameName = 'ShoulderCenter';
const targetFrameName = 'Spine02';

const args = parseArgs(process.argv);
const sourceClipName = args.clip;
const outputPath = path.join(projectRoot, args.out);
const readyPosePath = path.join(projectRoot, 'src', 'ready-pose.js');

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
const signatureSourceNodes = ['Arm.R', 'Forearm.R', 'Hand.R', 'Weapon.R'];
const signatureTargetBones = ['RightArm', 'RightForeArm', 'RightHand'];

function parseArgs(argv) {
  const parsed = {
    clip: 'OneHandAttack1',
    out: 'src/attack1-pose.js',
    exportName: 'ATTACK1_POSE_SEQUENCE',
    label: 'OneHandAttack1 sequence baked from FPSPlayer',
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const read = () => argv[++i];
    if (arg === '--clip') parsed.clip = read();
    else if (arg === '--out') parsed.out = read();
    else if (arg === '--export-name') parsed.exportName = read();
    else if (arg === '--label') parsed.label = read();
    else throw new Error(`unknown argument: ${arg}`);
  }
  return parsed;
}

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

function worldDirection(THREE, node, axis) {
  return new THREE.Vector3(...axis).normalize().applyQuaternion(worldQuaternion(THREE, node)).normalize();
}

function segmentDirection(THREE, a, b) {
  const direction = worldPosition(THREE, b).sub(worldPosition(THREE, a));
  return direction.lengthSq() > 1e-8 ? direction.normalize() : null;
}

function chainLength(THREE, root, names) {
  const [upper, lower, hand] = names.map((name) => requireNode(root, name));
  return worldPosition(THREE, upper).distanceTo(worldPosition(THREE, lower))
    + worldPosition(THREE, lower).distanceTo(worldPosition(THREE, hand));
}

function setWorldQuaternion(THREE, bone, targetWorld) {
  const parentWorld = bone.parent ? worldQuaternion(THREE, bone.parent).invert() : new THREE.Quaternion();
  bone.quaternion.copy(parentWorld.multiply(targetWorld).normalize());
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

function mapPointBetweenFrames(THREE, sourceFrame, targetFrame, sourceWorld, scale) {
  const local = sourceWorld.clone().sub(worldPosition(THREE, sourceFrame)).applyQuaternion(worldQuaternion(THREE, sourceFrame).invert());
  return local.multiplyScalar(scale).applyQuaternion(worldQuaternion(THREE, targetFrame)).add(worldPosition(THREE, targetFrame));
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
    if (!signatureSourceNodes.some((sourceName) => canon(sourceName) === key)
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

function targetFrameTravelDeg(frames, boneName) {
  const quaternions = frames
    .map((frame) => frame.bones[boneName])
    .filter(Boolean)
    .map((values) => ({ angleTo(other) {
      const dot = Math.abs(values[0] * other.values[0] + values[1] * other.values[1] + values[2] * other.values[2] + values[3] * other.values[3]);
      return 2 * Math.acos(Math.min(1, dot));
    }, values }));
  let total = 0;
  for (let i = 1; i < quaternions.length; i += 1) total += quaternions[i - 1].angleTo(quaternions[i]);
  return Number((total * 180 / Math.PI).toFixed(3));
}

async function loadReadyBaseline() {
  const module = await import(`${pathToFileURL(readyPosePath).href}?t=${Date.now()}`);
  return module.READY_POSE_PRESET?.bones || {};
}

function quaternionFromArray(THREE, values) {
  return new THREE.Quaternion(values[0], values[1], values[2], values[3]).normalize();
}

function quaternionAngleDeg(THREE, a, b) {
  return Number((quaternionFromArray(THREE, a).angleTo(quaternionFromArray(THREE, b)) * 180 / Math.PI).toFixed(3));
}

function bakeCurrentFpsPoseToMeshy(THREE, fpsRoot, meshyRoot, context, retargetedBones = null) {
  const {
    targetRestLocal,
    sourceRestWorld,
    targetRestWorld,
  } = context;
  applyLocalQuaternions(meshyRoot, targetRestLocal);
  meshyRoot.updateMatrixWorld(true);
  for (const name of applyOrientationBake(THREE, fpsRoot, meshyRoot, sourceRestWorld, targetRestWorld)) {
    retargetedBones?.add(name);
  }
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
  const first = frames[0]?.bones || {};
  const last = frames[frames.length - 1]?.bones || {};
  return {
    adjustedBones,
    sourceReadyClip: readyClipName,
    offsetSpace: 'local-quaternion-ready-roll-offset',
    firstReadyAngleDeg: Object.fromEntries(adjustedBones.map((name) => [name, quaternionAngleDeg(THREE, first[name], acceptedReadyBones[name])])),
    lastReadyAngleDeg: Object.fromEntries(adjustedBones.map((name) => [name, quaternionAngleDeg(THREE, last[name], acceptedReadyBones[name])])),
  };
}

function enforceReadyEndpointContract(THREE, frames, acceptedReadyBones) {
  const endpointBones = exportBones.filter((name) => acceptedReadyBones[name]);
  const first = frames[0]?.bones || {};
  const last = frames[frames.length - 1]?.bones || {};
  const beforeFirstAngleDeg = Object.fromEntries(endpointBones.map((name) => [name, quaternionAngleDeg(THREE, first[name], acceptedReadyBones[name])]));
  const beforeLastAngleDeg = Object.fromEntries(endpointBones.map((name) => [name, quaternionAngleDeg(THREE, last[name], acceptedReadyBones[name])]));
  for (const name of endpointBones) {
    first[name] = acceptedReadyBones[name];
    last[name] = acceptedReadyBones[name];
  }
  return {
    endpointBones,
    firstMatchesReady: endpointBones.every((name) => first[name].every((value, index) => value === acceptedReadyBones[name][index])),
    lastMatchesReady: endpointBones.every((name) => last[name].every((value, index) => value === acceptedReadyBones[name][index])),
    beforeFirstAngleDeg,
    beforeLastAngleDeg,
  };
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
  const meshyRoot = meshy.scene;
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
  if (times.length < 2) throw new Error(`not enough source keys for ${sourceClipName}`);

  const scale = chains.reduce((sum, chain) => (
    sum + chainLength(THREE, meshyRoot, chain.target) / Math.max(0.0001, chainLength(THREE, fpsRoot, chain.source))
  ), 0) / chains.length;
  const sourceFrame = requireNode(fpsRoot, sourceFrameName);
  const targetFrame = requireNode(meshyRoot, targetFrameName);
  const bakeContext = {
    targetRestLocal,
    sourceRestWorld,
    targetRestWorld,
    sourceFrame,
    targetFrame,
    scale,
  };
  applyClipPose(THREE, fpsRoot, readyClip, readyClip.duration);
  const rawReadyBones = bakeCurrentFpsPoseToMeshy(THREE, fpsRoot, meshyRoot, bakeContext);
  const retargetedBones = new Set();
  const frames = [];
  for (const time of times) {
    applyClipPose(THREE, fpsRoot, sourceClip, time);
    frames.push({
      time: Number(time.toFixed(6)),
      bones: bakeCurrentFpsPoseToMeshy(THREE, fpsRoot, meshyRoot, bakeContext, retargetedBones),
    });
  }
  const readyGraphOffset = applyReadyGraphOffsets(THREE, frames, readyBaseline, rawReadyBones);
  const readyEndpointContract = enforceReadyEndpointContract(THREE, frames, readyBaseline);

  const payload = {
    schema: 'pose-lab-v2-pose-sequence-v1',
    label: args.label,
    source: {
      fps: '../pose-lab/assets/models/FPSPlayer.glb',
      meshy: './public/assets/meshy/meshy_apose_walking_with_skin.glb',
      clip: sourceClipName,
      duration: Number(sourceClip.duration.toFixed(6)),
      keyCount: times.length,
      projectionFrame: `${sourceFrameName}->${targetFrameName}`,
      method: 'orientation-key-bake-with-ready-roll-offsets',
      readyGraphOffset,
      readyEndpointContract,
      retargetedBones: [...retargetedBones],
      signatureWristTwist: {
        sourceHandRotationTravelDeg: sourceTrackTravelDeg(THREE, sourceClip, 'Hand.R', times),
        sourceForearmRotationTravelDeg: sourceTrackTravelDeg(THREE, sourceClip, 'Forearm.R', times),
        sourceWeaponSocketRotationTravelDeg: sourceTrackTravelDeg(THREE, sourceClip, 'Weapon.R', times),
        bakedRightHandRotationTravelDeg: targetFrameTravelDeg(frames, 'RightHand'),
        bakedRightForeArmRotationTravelDeg: targetFrameTravelDeg(frames, 'RightForeArm'),
      },
    },
    frames,
  };
  const source = `export const ${args.exportName} = ${JSON.stringify(payload, null, 2)};\n`;
  fs.writeFileSync(outputPath, source);
  console.log(JSON.stringify({
    wrote: path.relative(projectRoot, outputPath),
    clip: sourceClipName,
    duration: payload.source.duration,
    frames: frames.length,
    method: payload.source.method,
    signatureWristTwist: payload.source.signatureWristTwist,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

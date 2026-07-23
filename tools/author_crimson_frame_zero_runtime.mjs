#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  CRIMSON_SABER_GRIP_LOCAL,
} from '../src/review-constants.js';
import {
  CRIMSON_COMBAT_READY_VANGUARD_FRAME0_4_SEQUENCE as committedCandidate,
} from '../src/review-candidates/crimson-combat-ready-vanguard-frame0-4.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const characterPath = path.join(
  projectRoot,
  'public/assets/crimson/crimson_plume_knight_rigged_pbr.glb',
);
const swordPath = path.join(
  projectRoot,
  'public/assets/crimson/arborblade_sword.glb',
);
const candidatePath = path.join(
  projectRoot,
  'src/review-candidates/crimson-combat-ready-vanguard-frame0-4.js',
);
const reportPath = path.join(
  projectRoot,
  'generated/pose-candidates/crimson-combat-ready-vanguard-frame0-4.runtime-report.json',
);
const authoredGlbPath = path.join(
  projectRoot,
  'generated/pose-candidates/crimson-combat-ready-vanguard-frame0-4.authored.glb',
);
const exportName = 'CRIMSON_COMBAT_READY_VANGUARD_FRAME0_4_SEQUENCE';
const candidateId = 'crimson-combat-ready-vanguard-frame0-4';
const authoredAnimationName = 'CrimsonRuntimeCombatReadyFrameZero';
const headWeightMinimum = 0.75;
const handWeightMinimum = 0.75;
const bladeLocalMinimumZ = 0.03;
const crossguardLocalMinimumZ = -0.10;
const crossguardLocalMaximumZ = 0.03;
const centerCanvas = Object.freeze({ width: 986, height: 900 });
const minimumBladeHeadPixels = 12;
const minimumGuardHeadPixels = 8;
const minimumArmHeadPixels = 0;
const recommendedArmFacePixels = 8;
const minimumHandHeadPixels = 8;
const faceHullUpperFraction = 0.62;
const faceApertureScale = 0.66;
const minimumElbowDropTorso = 0.05;
const minimumDominantHandAboveNeckTorso = 0.20;
const minimumSupportHandAboveNeckTorso = 0.03;
const minimumHandClusterBesideHeadShoulders = 0.08;
const minimumGripStepTorso = 0.12;
const maximumSupportPalmErrorTorso = 0.008;
const minimumSupportReachReserveTorso = 0.03;
const minimumDominantReachReserveTorso = 0.018;
const maximumSupportElbowAngleDeg = 165;
const highGuardTarget = Object.freeze({
  lateralShoulders: Number(process.env.CRIMSON_GUARD_LATERAL ?? 0.33),
  heightTorso: Number(process.env.CRIMSON_GUARD_HEIGHT ?? 0.93),
  depthTorso: Number(process.env.CRIMSON_GUARD_DEPTH ?? -0.18),
  elbowSpreadShoulders: Number(process.env.CRIMSON_ELBOW_SPREAD ?? -0.72),
  elbowPoleDropTorso: Number(process.env.CRIMSON_ELBOW_DROP ?? 0.80),
});
const authoredAnglesDeg = [
  -48, -46, -44, -42, -40, -38, -36, -34, -32, -30, -28, -26, -24,
  -22, -20, -18, -16, -14, -12, -10, -8, -6, -4, -2,
  0,
  2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34,
  36, 38, 40, 42, 44, 46, 48,
];
const runtimeAuthoredBones = [
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightArm',
  'RightForeArm',
  'RightHand',
];

function parseArgs(argv) {
  const args = {
    write: false,
    check: false,
    sweep: false,
    angleDeg: null,
    report: reportPath,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--write') args.write = true;
    else if (argument === '--check') args.check = true;
    else if (argument === '--sweep') args.sweep = true;
    else if (argument === '--angle-deg') args.angleDeg = Number(argv[++index]);
    else if (argument.startsWith('--angle-deg=')) {
      args.angleDeg = Number(argument.slice('--angle-deg='.length));
    } else if (argument === '--report') args.report = path.resolve(argv[++index]);
    else if (argument.startsWith('--report=')) {
      args.report = path.resolve(argument.slice('--report='.length));
    } else if (argument === '--help' || argument === '-h') {
      console.log('usage: node tools/author_crimson_frame_zero_runtime.mjs [--angle-deg N | --sweep] [--write | --check] [--report PATH]');
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }
  if (args.angleDeg !== null && !Number.isFinite(args.angleDeg)) {
    throw new Error('--angle-deg must be finite');
  }
  return args;
}

function ensureBrowserShim() {
  globalThis.ProgressEvent ||= class ProgressEvent {
    constructor(type, init = {}) {
      this.type = type;
      Object.assign(this, init);
    }
  };
  globalThis.window ||= {
    innerWidth: centerCanvas.width,
    innerHeight: centerCanvas.height,
    devicePixelRatio: 1,
  };
  globalThis.self ||= globalThis;
  globalThis.document ||= {
    createElementNS() {
      const listeners = new Map();
      return {
        style: {},
        width: 1,
        height: 1,
        addEventListener(type, listener) { listeners.set(type, listener); },
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
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'pose-lab-v2-runtime-author-'));
  const threeDir = path.join(sandbox, 'node_modules', 'three');
  fs.mkdirSync(path.dirname(threeDir), { recursive: true });
  execFileSync('cp', ['-R', path.join(projectRoot, 'vendor', 'three'), threeDir]);
  return sandbox;
}

function arrayBuffer(file) {
  const buffer = fs.readFileSync(file);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
  );
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function canonicalFrame(frame) {
  return {
    label: frame.label,
    time: frame.time,
    positions: frame.positions || {},
    sabreLocal: frame.sabreLocal || {},
    bones: frame.bones || {},
  };
}

function canon(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function requireNode(root, name) {
  const wanted = canon(name);
  let found = null;
  root.traverse((node) => {
    if (!found && canon(node.name) === wanted) found = node;
  });
  if (!found) throw new Error(`missing node ${name}`);
  return found;
}

function normalizeCharacter(THREE, object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  object.position.sub(center);
  object.position.y += size.y * 0.5;
  object.scale.multiplyScalar(1.75 / Math.max(0.001, size.y));
  object.traverse((node) => {
    if (node.isMesh) node.frustumCulled = false;
  });
  object.updateMatrixWorld(true);
  return object;
}

function worldPosition(THREE, node) {
  return node.getWorldPosition(new THREE.Vector3());
}

function worldQuaternion(THREE, node) {
  return node.getWorldQuaternion(new THREE.Quaternion()).normalize();
}

function setWorldQuaternion(THREE, root, node, desiredWorld) {
  const parentWorld = node.parent
    ? worldQuaternion(THREE, node.parent)
    : new THREE.Quaternion();
  node.quaternion.copy(parentWorld.invert().multiply(desiredWorld).normalize());
  root.updateMatrixWorld(true);
}

function applyWorldRotation(THREE, root, node, worldDelta) {
  setWorldQuaternion(
    THREE,
    root,
    node,
    worldDelta.clone().multiply(worldQuaternion(THREE, node)).normalize(),
  );
}

function applyCandidateFrame(root, frame) {
  for (const [name, values] of Object.entries(frame.bones || {})) {
    requireNode(root, name).quaternion.fromArray(values).normalize();
  }
  for (const [name, values] of Object.entries(frame.positions || {})) {
    requireNode(root, name).position.fromArray(values);
  }
  root.updateMatrixWorld(true);
}

function attachSword(THREE, root, swordRoot, frame) {
  const rightHand = requireNode(root, 'RightHand');
  const grip = new THREE.Bone();
  grip.name = 'SaberGrip';
  grip.position.fromArray(CRIMSON_SABER_GRIP_LOCAL.position);
  grip.rotation.set(
    ...CRIMSON_SABER_GRIP_LOCAL.rotationDeg.map(THREE.MathUtils.degToRad),
    'XYZ',
  );
  grip.scale.fromArray(CRIMSON_SABER_GRIP_LOCAL.scale);
  rightHand.add(grip);
  swordRoot.position.fromArray(frame.sabreLocal.position);
  swordRoot.quaternion.fromArray(frame.sabreLocal.quaternion).normalize();
  swordRoot.scale.fromArray(frame.sabreLocal.scale);
  grip.add(swordRoot);
  root.updateMatrixWorld(true);
  return grip;
}

function weightedSkinPoints(THREE, root, boneName, minimumWeight) {
  const wanted = canon(boneName);
  const points = [];
  root.traverse((node) => {
    if (!node.isSkinnedMesh) return;
    const boneIndices = new Set();
    node.skeleton.bones.forEach((bone, index) => {
      if (canon(bone.name) === wanted) boneIndices.add(index);
    });
    if (!boneIndices.size) return;
    const position = node.geometry?.attributes?.position;
    const skinIndex = node.geometry?.attributes?.skinIndex;
    const skinWeight = node.geometry?.attributes?.skinWeight;
    if (!position || !skinIndex || !skinWeight) return;
    for (let index = 0; index < position.count; index += 1) {
      let weight = 0;
      for (let slot = 0; slot < 4; slot += 1) {
        if (boneIndices.has(skinIndex.getComponent(index, slot))) {
          weight += skinWeight.getComponent(index, slot);
        }
      }
      if (weight < minimumWeight) continue;
      const point = new THREE.Vector3().fromBufferAttribute(position, index);
      node.applyBoneTransform(index, point);
      point.applyMatrix4(node.matrixWorld);
      points.push(point);
    }
  });
  if (points.length < 50) {
    throw new Error(`${boneName} weighted point cloud is too small: ${points.length}`);
  }
  return points;
}

function centroid(THREE, points) {
  const result = new THREE.Vector3();
  for (const point of points) result.add(point);
  return result.multiplyScalar(1 / points.length);
}

function swordPointClouds(THREE, swordRoot) {
  const blade = [];
  const crossguard = [];
  const inverseSword = swordRoot.matrixWorld.clone().invert();
  swordRoot.traverse((node) => {
    if (!node.isMesh) return;
    const position = node.geometry?.attributes?.position;
    if (!position) return;
    for (let index = 0; index < position.count; index += 1) {
      const world = new THREE.Vector3()
        .fromBufferAttribute(position, index)
        .applyMatrix4(node.matrixWorld);
      const local = world.clone().applyMatrix4(inverseSword);
      if (local.z >= bladeLocalMinimumZ) blade.push(world);
      if (
        local.z >= crossguardLocalMinimumZ
        && local.z <= crossguardLocalMaximumZ
        && Math.hypot(local.x, local.y) >= 0.035
      ) {
        crossguard.push(world);
      }
    }
  });
  if (blade.length < 20 || crossguard.length < 20) {
    throw new Error(
      `sword point selection is too small: blade=${blade.length} crossguard=${crossguard.length}`,
    );
  }
  return { blade, crossguard };
}

function weaponAxes(THREE, swordRoot) {
  const hilt = swordRoot.localToWorld(new THREE.Vector3(0, 0, 0));
  const tip = swordRoot.localToWorld(new THREE.Vector3(0, 0, 0.618789));
  const pommel = swordRoot.localToWorld(new THREE.Vector3(0, 0, -0.379258));
  return {
    hilt,
    tip,
    pommel,
    bladeDirection: tip.clone().sub(hilt).normalize(),
    handleDirection: pommel.clone().sub(hilt).normalize(),
  };
}

function pointSegment3d(THREE, point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSquared = segment.lengthSq();
  const parameter = lengthSquared > 0
    ? THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSquared, 0, 1)
    : 0;
  const closest = start.clone().addScaledVector(segment, parameter);
  return { distance: point.distanceTo(closest), parameter, closest };
}

function projectElbowToCircle(
  THREE,
  shoulder,
  requestedWrist,
  pole,
  upperLength,
  lowerLength,
) {
  const shoulderToWrist = requestedWrist.clone().sub(shoulder);
  const requestedDistance = shoulderToWrist.length();
  const minimumReach = Math.abs(upperLength - lowerLength) + 0.000001;
  const maximumReach = upperLength + lowerLength - 0.000001;
  const distance = THREE.MathUtils.clamp(
    requestedDistance,
    minimumReach,
    maximumReach,
  );
  const axis = requestedDistance > 0.000001
    ? shoulderToWrist.clone().normalize()
    : new THREE.Vector3(0, -1, 0);
  const wrist = shoulder.clone().addScaledVector(axis, distance);
  const centerDistance = (
    upperLength * upperLength
    - lowerLength * lowerLength
    + distance * distance
  ) / (2 * distance);
  const radius = Math.sqrt(Math.max(
    0,
    upperLength * upperLength - centerDistance * centerDistance,
  ));
  const circleCenter = shoulder.clone().addScaledVector(axis, centerDistance);
  let poleDirection = pole.clone().sub(circleCenter);
  poleDirection.addScaledVector(axis, -poleDirection.dot(axis));
  if (poleDirection.lengthSq() < 0.00000001) {
    poleDirection = new THREE.Vector3(0, -1, 0);
    poleDirection.addScaledVector(axis, -poleDirection.dot(axis));
  }
  poleDirection.normalize();
  return {
    wrist,
    elbow: circleCenter.addScaledVector(poleDirection, radius),
    requestedDistance,
    clampedDistance: distance,
  };
}

function alignWorldSegment(THREE, root, bone, current, desired) {
  if (current.lengthSq() < 0.00000001 || desired.lengthSq() < 0.00000001) return;
  const delta = new THREE.Quaternion().setFromUnitVectors(
    current.clone().normalize(),
    desired.clone().normalize(),
  );
  applyWorldRotation(THREE, root, bone, delta);
}

function solveTwoBonePin(THREE, root, names, requestedWrist, pole) {
  const [upper, lower, hand] = names.map((name) => requireNode(root, name));
  const shoulder = worldPosition(THREE, upper);
  const elbowBefore = worldPosition(THREE, lower);
  const wristBefore = worldPosition(THREE, hand);
  const upperLength = shoulder.distanceTo(elbowBefore);
  const lowerLength = elbowBefore.distanceTo(wristBefore);
  const projection = projectElbowToCircle(
    THREE,
    shoulder,
    requestedWrist,
    pole,
    upperLength,
    lowerLength,
  );
  alignWorldSegment(
    THREE,
    root,
    upper,
    worldPosition(THREE, lower).sub(worldPosition(THREE, upper)),
    projection.elbow.clone().sub(shoulder),
  );
  alignWorldSegment(
    THREE,
    root,
    lower,
    worldPosition(THREE, hand).sub(worldPosition(THREE, lower)),
    projection.wrist.clone().sub(projection.elbow),
  );
  root.updateMatrixWorld(true);
  return {
    projection,
    actualElbow: worldPosition(THREE, lower),
    actualWrist: worldPosition(THREE, hand),
    upperLength,
    lowerLength,
  };
}

function roundArray(values, digits = 8) {
  return values.map((value) => Number(value.toFixed(digits)));
}

function roundFloat32Array(values, digits = 8) {
  return values.map((value) => Number(Math.fround(value).toFixed(digits)));
}

function pad4(buffer, byte = 0) {
  const padding = (4 - (buffer.length % 4)) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, byte)]) : buffer;
}

function parseGlb(file) {
  const raw = fs.readFileSync(file);
  if (raw.toString('ascii', 0, 4) !== 'glTF' || raw.readUInt32LE(4) !== 2) {
    throw new Error(`unsupported GLB header: ${file}`);
  }
  let offset = 12;
  let gltf = null;
  let bin = Buffer.alloc(0);
  while (offset < raw.length) {
    const length = raw.readUInt32LE(offset);
    const type = raw.toString('ascii', offset + 4, offset + 8);
    offset += 8;
    const chunk = raw.subarray(offset, offset + length);
    offset += length;
    if (type === 'JSON') {
      gltf = JSON.parse(chunk.toString('utf8').replace(/[\u0000\u0020\t\r\n]+$/g, ''));
    } else if (type === 'BIN\u0000') {
      bin = Buffer.from(chunk);
    }
  }
  if (!gltf) throw new Error(`GLB has no JSON chunk: ${file}`);
  return { gltf, bin };
}

function float32Buffer(values) {
  const buffer = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => buffer.writeFloatLE(Number(value), index * 4));
  return buffer;
}

function appendAccessor(gltf, bin, payload, accessor) {
  const offset = bin.length;
  const nextBin = pad4(Buffer.concat([bin, payload]));
  gltf.bufferViews ||= [];
  gltf.bufferViews.push({
    buffer: 0,
    byteOffset: offset,
    byteLength: payload.length,
  });
  gltf.accessors ||= [];
  gltf.accessors.push({
    bufferView: gltf.bufferViews.length - 1,
    ...accessor,
  });
  return { bin: nextBin, accessor: gltf.accessors.length - 1 };
}

function writeGlb(gltf, bin) {
  const json = pad4(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20);
  const binary = pad4(bin);
  const totalLength = 12 + 8 + json.length + 8 + binary.length;
  const header = Buffer.alloc(12);
  header.write('glTF', 0, 4, 'ascii');
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(json.length, 0);
  jsonHeader.write('JSON', 4, 4, 'ascii');
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binary.length, 0);
  binHeader.write('BIN\u0000', 4, 4, 'ascii');
  return Buffer.concat([header, jsonHeader, json, binHeader, binary]);
}

function injectAuthoredGlb(frame) {
  const { gltf, bin: sourceBin } = parseGlb(characterPath);
  let bin = sourceBin;
  const byName = new Map(
    (gltf.nodes || []).map((node, index) => [node.name, index]),
  );
  let appended = appendAccessor(
    gltf,
    bin,
    float32Buffer([0]),
    {
      componentType: 5126,
      type: 'SCALAR',
      count: 1,
      min: [0],
      max: [0],
    },
  );
  bin = appended.bin;
  const timeAccessor = appended.accessor;
  const samplers = [];
  const channels = [];
  const addedChannels = [];
  for (const name of Object.keys(frame.bones || {}).sort()) {
    const node = byName.get(name);
    if (node === undefined) throw new Error(`authored GLB is missing bone node ${name}`);
    appended = appendAccessor(
      gltf,
      bin,
      float32Buffer(frame.bones[name]),
      { componentType: 5126, type: 'VEC4', count: 1 },
    );
    bin = appended.bin;
    const sampler = samplers.length;
    samplers.push({
      input: timeAccessor,
      output: appended.accessor,
      interpolation: 'LINEAR',
    });
    channels.push({ sampler, target: { node, path: 'rotation' } });
    addedChannels.push(`${name}.rotation`);
  }
  for (const name of Object.keys(frame.positions || {}).sort()) {
    const node = byName.get(name);
    if (node === undefined) throw new Error(`authored GLB is missing position node ${name}`);
    appended = appendAccessor(
      gltf,
      bin,
      float32Buffer(frame.positions[name]),
      { componentType: 5126, type: 'VEC3', count: 1 },
    );
    bin = appended.bin;
    const sampler = samplers.length;
    samplers.push({
      input: timeAccessor,
      output: appended.accessor,
      interpolation: 'LINEAR',
    });
    channels.push({ sampler, target: { node, path: 'translation' } });
    addedChannels.push(`${name}.translation`);
  }
  gltf.animations ||= [];
  gltf.animations.push({
    name: authoredAnimationName,
    samplers,
    channels,
  });
  gltf.buffers ||= [{ byteLength: 0 }];
  gltf.buffers[0].byteLength = bin.length;
  const bytes = writeGlb(gltf, bin);
  fs.mkdirSync(path.dirname(authoredGlbPath), { recursive: true });
  fs.writeFileSync(authoredGlbPath, bytes);
  return {
    path: authoredGlbPath,
    sha256: sha256Buffer(bytes),
    byteLength: bytes.length,
    animation: authoredAnimationName,
    channels: addedChannels,
  };
}

async function verifyAuthoredGlbRoundTrip(loadGlb, file, frame, expectedPoseSha256) {
  const loaded = await loadGlb(file);
  const matchingClips = (loaded.animations || []).filter(
    (clip) => clip.name === authoredAnimationName,
  );
  if (matchingClips.length !== 1) {
    throw new Error(
      `authored GLB round-trip expected one ${authoredAnimationName} clip, got ${matchingClips.length}`,
    );
  }
  const clip = matchingClips[0];
  if (clip.duration !== 0) {
    throw new Error(`authored GLB round-trip expected duration 0, got ${clip.duration}`);
  }
  const expectedChannels = [
    ...Object.keys(frame.bones || {}).map((name) => `${name}.quaternion`),
    ...Object.keys(frame.positions || {}).map((name) => `${name}.position`),
  ].sort();
  const actualChannels = clip.tracks.map((track) => track.name).sort();
  if (actualChannels.length !== expectedChannels.length
    || new Set(actualChannels).size !== actualChannels.length
    || actualChannels.some((name, index) => name !== expectedChannels[index])) {
    throw new Error(
      `authored GLB round-trip channel mismatch: expected=${expectedChannels.join(',')} actual=${actualChannels.join(',')}`,
    );
  }
  const reconstructed = {
    label: frame.label,
    time: frame.time,
    positions: {},
    sabreLocal: structuredClone(frame.sabreLocal || {}),
    bones: {},
  };
  for (const track of clip.tracks) {
    if (track.times.length !== 1 || track.times[0] !== 0) {
      throw new Error(
        `authored GLB round-trip track ${track.name} must contain exactly one t=0 sample`,
      );
    }
    const separator = track.name.lastIndexOf('.');
    const nodeName = track.name.slice(0, separator);
    const property = track.name.slice(separator + 1);
    const expectedValueCount = property === 'quaternion' ? 4 : property === 'position' ? 3 : 0;
    if (!expectedValueCount || track.values.length !== expectedValueCount) {
      throw new Error(
        `authored GLB round-trip track ${track.name} has ${track.values.length} values`,
      );
    }
    const values = roundArray(Array.from(track.values), 8);
    if (property === 'quaternion') reconstructed.bones[nodeName] = values;
    else reconstructed.positions[nodeName] = values;
  }
  const reconstructedPoseSha256 = sha256Text(stableStringify(canonicalFrame(reconstructed)));
  if (reconstructedPoseSha256 !== expectedPoseSha256) {
    throw new Error(
      `authored GLB round-trip pose SHA mismatch: expected=${expectedPoseSha256} reconstructed=${reconstructedPoseSha256}`,
    );
  }
  return {
    status: 'PASS',
    animation: clip.name,
    duration: clip.duration,
    channelCount: actualChannels.length,
    uniqueChannelCount: new Set(actualChannels).size,
    channels: actualChannels,
    reconstructedPoseSha256,
  };
}

function captureLocalState(root, swordRoot) {
  return {
    bones: Object.fromEntries(runtimeAuthoredBones.map((name) => {
      const node = requireNode(root, name);
      return [name, {
        position: node.position.clone(),
        quaternion: node.quaternion.clone(),
        scale: node.scale.clone(),
      }];
    })),
    sword: {
      position: swordRoot.position.clone(),
      quaternion: swordRoot.quaternion.clone(),
      scale: swordRoot.scale.clone(),
    },
  };
}

function restoreLocalState(root, swordRoot, state) {
  for (const [name, transform] of Object.entries(state.bones)) {
    const node = requireNode(root, name);
    node.position.copy(transform.position);
    node.quaternion.copy(transform.quaternion);
    node.scale.copy(transform.scale);
  }
  swordRoot.position.copy(state.sword.position);
  swordRoot.quaternion.copy(state.sword.quaternion);
  swordRoot.scale.copy(state.sword.scale);
  root.updateMatrixWorld(true);
}

function cameraForward(THREE) {
  return new THREE.Vector3(2.8, 1.75, 4.2)
    .sub(new THREE.Vector3(0, 0.95, 0))
    .multiplyScalar(-1)
    .normalize();
}

function cameraRight(THREE) {
  return cameraForward(THREE)
    .cross(new THREE.Vector3(0, 1, 0))
    .normalize();
}

function authorAtAngle(THREE, root, swordRoot, seed, angleDeg) {
  restoreLocalState(root, swordRoot, seed.localState);
  const neck = worldPosition(THREE, requireNode(root, 'neck'));
  const head = worldPosition(THREE, requireNode(root, 'Head'));
  const hips = worldPosition(THREE, requireNode(root, 'Hips'));
  const torsoHeight = neck.distanceTo(hips);
  const rightShoulder = worldPosition(THREE, requireNode(root, 'RightArm'));
  const leftShoulder = worldPosition(THREE, requireNode(root, 'LeftArm'));
  const shoulderSpan = rightShoulder.distanceTo(leftShoulder);
  const rightWristTarget = neck.clone().add(new THREE.Vector3(
    highGuardTarget.lateralShoulders * shoulderSpan,
    highGuardTarget.heightTorso * torsoHeight,
    highGuardTarget.depthTorso * torsoHeight,
  ));
  const leftWristTarget = rightWristTarget.clone().add(new THREE.Vector3(
    -0.24 * shoulderSpan,
    -0.24 * torsoHeight,
    -0.02 * torsoHeight,
  ));
  const elbowScreenAxis = cameraRight(THREE).multiplyScalar(
    highGuardTarget.elbowSpreadShoulders * shoulderSpan,
  );
  const rightPole = rightShoulder.clone()
    .add(elbowScreenAxis)
    .add(new THREE.Vector3(0, -highGuardTarget.elbowPoleDropTorso * torsoHeight, 0));
  const leftPole = leftShoulder.clone()
    .sub(elbowScreenAxis)
    .add(new THREE.Vector3(0, -highGuardTarget.elbowPoleDropTorso * torsoHeight, 0));
  const rightHighPin = solveTwoBonePin(
    THREE,
    root,
    ['RightArm', 'RightForeArm', 'RightHand'],
    rightWristTarget,
    rightPole,
  );
  const leftHighPin = solveTwoBonePin(
    THREE,
    root,
    ['LeftArm', 'LeftForeArm', 'LeftHand'],
    leftWristTarget,
    leftPole,
  );
  root.updateMatrixWorld(true);

  // Positional projection establishes the recognisable roof guard first.
  // Weapon roll and the visible support-palm pin are deliberately downstream.
  const rightHand = requireNode(root, 'RightHand');
  const leftHand = requireNode(root, 'LeftHand');
  const beforeAxes = weaponAxes(THREE, swordRoot);
  const beforeLeftHandWorld = worldQuaternion(THREE, leftHand);
  const beforeLeftPalm = centroid(
    THREE,
    weightedSkinPoints(THREE, root, 'LeftHand', handWeightMinimum),
  );
  const beforeSupport = pointSegment3d(
    THREE,
    beforeLeftPalm,
    beforeAxes.hilt,
    beforeAxes.pommel,
  );
  const desiredBlade = beforeAxes.bladeDirection.clone().applyAxisAngle(
    cameraForward(THREE),
    THREE.MathUtils.degToRad(angleDeg),
  ).normalize();
  const bladeDelta = new THREE.Quaternion().setFromUnitVectors(
    beforeAxes.bladeDirection,
    desiredBlade,
  ).normalize();
  applyWorldRotation(THREE, root, rightHand, bladeDelta);
  const desiredLeftHandWorld = bladeDelta.clone()
    .multiply(beforeLeftHandWorld)
    .normalize();
  const afterAxes = weaponAxes(THREE, swordRoot);
  const rotatedSurfaceOffset = beforeLeftPalm.clone()
    .sub(beforeSupport.closest)
    .applyQuaternion(bladeDelta);
  const desiredLeftPalm = afterAxes.hilt.clone()
    .lerp(afterAxes.pommel, beforeSupport.parameter)
    .add(rotatedSurfaceOffset);
  let pin = null;
  for (let iteration = 0; iteration < 8; iteration += 1) {
    setWorldQuaternion(THREE, root, leftHand, desiredLeftHandWorld);
    const palm = centroid(
      THREE,
      weightedSkinPoints(THREE, root, 'LeftHand', handWeightMinimum),
    );
    const wrist = worldPosition(THREE, leftHand);
    const requestedWrist = wrist.clone().add(desiredLeftPalm).sub(palm);
    pin = solveTwoBonePin(
      THREE,
      root,
      ['LeftArm', 'LeftForeArm', 'LeftHand'],
      requestedWrist,
      leftPole,
    );
  }
  setWorldQuaternion(THREE, root, leftHand, desiredLeftHandWorld);
  root.updateMatrixWorld(true);
  const finalAxes = weaponAxes(THREE, swordRoot);
  const leftPalm = centroid(
    THREE,
    weightedSkinPoints(THREE, root, 'LeftHand', handWeightMinimum),
  );
  const support = pointSegment3d(
    THREE,
    leftPalm,
    finalAxes.hilt,
    finalAxes.pommel,
  );
  const leftShoulderFinal = worldPosition(THREE, requireNode(root, 'LeftArm'));
  const rightShoulderFinal = worldPosition(THREE, requireNode(root, 'RightArm'));
  const leftElbow = worldPosition(THREE, requireNode(root, 'LeftForeArm'));
  const leftWrist = worldPosition(THREE, leftHand);
  const rightElbow = worldPosition(THREE, requireNode(root, 'RightForeArm'));
  const rightWrist = worldPosition(THREE, requireNode(root, 'RightHand'));
  const upper = leftShoulderFinal.distanceTo(leftElbow);
  const lower = leftElbow.distanceTo(leftWrist);
  const reach = leftShoulderFinal.distanceTo(leftWrist);
  const rightUpper = rightShoulderFinal.distanceTo(rightElbow);
  const rightLower = rightElbow.distanceTo(rightWrist);
  const rightReach = rightShoulderFinal.distanceTo(rightWrist);
  const elbowAngleDeg = THREE.MathUtils.radToDeg(
    leftShoulderFinal.clone().sub(leftElbow).angleTo(leftWrist.clone().sub(leftElbow)),
  );
  const rightElbowAngleDeg = THREE.MathUtils.radToDeg(
    rightShoulderFinal.clone().sub(rightElbow).angleTo(rightWrist.clone().sub(rightElbow)),
  );
  const handCenter = rightWrist.clone().add(leftWrist).multiplyScalar(0.5);
  const boneTravelDeg = Object.fromEntries(runtimeAuthoredBones.map((name) => [
    name,
    Number(THREE.MathUtils.radToDeg(
      requireNode(root, name).quaternion.angleTo(seed.localState.bones[name].quaternion),
    ).toFixed(4)),
  ]));
  return {
    angleDeg,
    desiredBlade,
    actualBlade: finalAxes.bladeDirection,
    leftPalm,
    desiredLeftPalm,
    support,
    supportPinError: leftPalm.distanceTo(desiredLeftPalm),
    torsoHeight,
    shoulderSpan,
    neck,
    head,
    handCenter,
    leftElbow,
    leftWrist,
    rightElbow,
    rightWrist,
    leftElbowDropTorso: (leftWrist.y - leftElbow.y) / torsoHeight,
    rightElbowDropTorso: (rightWrist.y - rightElbow.y) / torsoHeight,
    leftReachReserveTorso: (upper + lower - reach) / torsoHeight,
    rightReachReserveTorso: (rightUpper + rightLower - rightReach) / torsoHeight,
    leftElbowAngleDeg: elbowAngleDeg,
    rightElbowAngleDeg,
    dominantHandAboveNeckTorso: (rightWrist.y - neck.y) / torsoHeight,
    supportHandAboveNeckTorso: (leftWrist.y - neck.y) / torsoHeight,
    handClusterBesideHeadShoulders: (handCenter.x - head.x) / shoulderSpan,
    gripStepTorso: Math.abs(rightWrist.y - leftWrist.y) / torsoHeight,
    boneTravelDeg,
    landmarkDeltaWorld: {
      leftElbow: leftElbow.distanceTo(seed.leftElbow),
      leftWrist: leftWrist.distanceTo(seed.leftWrist),
      rightElbow: rightElbow.distanceTo(seed.rightElbow),
      rightWrist: rightWrist.distanceTo(seed.rightWrist),
    },
    highGuardTargets: {
      rightWrist: rightWristTarget,
      leftWrist: leftWristTarget,
      rightPole,
      leftPole,
    },
    highGuardPins: {
      right: rightHighPin,
      left: leftHighPin,
    },
    pin,
  };
}

function makeCamera(THREE, position, target) {
  const camera = new THREE.PerspectiveCamera(
    36,
    centerCanvas.width / centerCanvas.height,
    0.01,
    80,
  );
  camera.position.copy(position);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

function runtimeCameras(THREE, swordRoot) {
  const centerPosition = new THREE.Vector3(2.8, 1.75, 4.2);
  const centerTarget = new THREE.Vector3(0, 0.95, 0);
  const distance = centerPosition.distanceTo(centerTarget);
  const focus = worldPosition(THREE, swordRoot);
  return {
    center: makeCamera(THREE, centerPosition, centerTarget),
    left: makeCamera(
      THREE,
      focus.clone().add(new THREE.Vector3(-distance, 0.7, 0)),
      focus,
    ),
    right: makeCamera(
      THREE,
      focus.clone().add(new THREE.Vector3(distance, 0.7, 0)),
      focus,
    ),
  };
}

function projectPoint(point, camera) {
  const projected = point.clone().project(camera);
  return [
    (projected.x * 0.5 + 0.5) * centerCanvas.width,
    (-projected.y * 0.5 + 0.5) * centerCanvas.height,
  ];
}

function cross2d(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function convexHull(points) {
  const unique = [...new Map(points.map((point) => [
    `${point[0].toFixed(8)},${point[1].toFixed(8)}`,
    point,
  ])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (unique.length <= 2) return unique;
  const lower = [];
  for (const point of unique) {
    while (lower.length >= 2 && cross2d(lower.at(-2), lower.at(-1), point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }
  const upper = [];
  for (const point of [...unique].reverse()) {
    while (upper.length >= 2 && cross2d(upper.at(-2), upper.at(-1), point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function polygonBounds(polygon) {
  return {
    left: Number(Math.min(...polygon.map((point) => point[0])).toFixed(2)),
    right: Number(Math.max(...polygon.map((point) => point[0])).toFixed(2)),
    top: Number(Math.min(...polygon.map((point) => point[1])).toFixed(2)),
    bottom: Number(Math.max(...polygon.map((point) => point[1])).toFixed(2)),
  };
}

function scaledPolygon(polygon, scale) {
  const center = polygon.reduce(
    (total, point) => [total[0] + point[0], total[1] + point[1]],
    [0, 0],
  ).map((value) => value / polygon.length);
  return polygon.map((point) => [
    center[0] + (point[0] - center[0]) * scale,
    center[1] + (point[1] - center[1]) * scale,
  ]);
}

function pointSegment2d(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  const parameter = lengthSquared > 0
    ? Math.max(0, Math.min(1, (
      (point[0] - start[0]) * dx + (point[1] - start[1]) * dy
    ) / lengthSquared))
    : 0;
  return Math.hypot(
    point[0] - (start[0] + parameter * dx),
    point[1] - (start[1] + parameter * dy),
  );
}

function onSegment2d(point, start, end, epsilon = 0.000001) {
  return Math.abs(cross2d(start, end, point)) <= epsilon
    && point[0] >= Math.min(start[0], end[0]) - epsilon
    && point[0] <= Math.max(start[0], end[0]) + epsilon
    && point[1] >= Math.min(start[1], end[1]) - epsilon
    && point[1] <= Math.max(start[1], end[1]) + epsilon;
}

function segmentsIntersect2d(a, b, c, d) {
  const abC = cross2d(a, b, c);
  const abD = cross2d(a, b, d);
  const cdA = cross2d(c, d, a);
  const cdB = cross2d(c, d, b);
  if ((abC > 0) !== (abD > 0) && (cdA > 0) !== (cdB > 0)) return true;
  return onSegment2d(c, a, b)
    || onSegment2d(d, a, b)
    || onSegment2d(a, c, d)
    || onSegment2d(b, c, d);
}

function segmentSegment2d(a, b, c, d) {
  if (segmentsIntersect2d(a, b, c, d)) return 0;
  return Math.min(
    pointSegment2d(a, c, d),
    pointSegment2d(b, c, d),
    pointSegment2d(c, a, b),
    pointSegment2d(d, a, b),
  );
}

function pointInConvexPolygon(point, polygon) {
  if (polygon.length < 3) return false;
  let sign = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const value = cross2d(
      polygon[index],
      polygon[(index + 1) % polygon.length],
      point,
    );
    if (Math.abs(value) < 0.000001) continue;
    const next = Math.sign(value);
    if (sign && next !== sign) return false;
    sign = next;
  }
  return true;
}

function polygonDistance(first, second) {
  if (first.some((point) => pointInConvexPolygon(point, second))) return 0;
  if (second.some((point) => pointInConvexPolygon(point, first))) return 0;
  let minimum = Infinity;
  for (let firstIndex = 0; firstIndex < first.length; firstIndex += 1) {
    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      minimum = Math.min(
        minimum,
        segmentSegment2d(
          first[firstIndex],
          first[(firstIndex + 1) % first.length],
          second[secondIndex],
          second[(secondIndex + 1) % second.length],
        ),
      );
    }
  }
  return minimum;
}

function segmentPolygonDistance(start, end, polygon) {
  if (pointInConvexPolygon(start, polygon) || pointInConvexPolygon(end, polygon)) {
    return 0;
  }
  let minimum = Infinity;
  for (let index = 0; index < polygon.length; index += 1) {
    minimum = Math.min(
      minimum,
      segmentSegment2d(
        start,
        end,
        polygon[index],
        polygon[(index + 1) % polygon.length],
      ),
    );
  }
  return minimum;
}

function silhouetteReport(THREE, root, swordRoot) {
  const headPoints = weightedSkinPoints(
    THREE,
    root,
    'Head',
    headWeightMinimum,
  );
  const minimumHeadY = Math.min(...headPoints.map((point) => point.y));
  const maximumHeadY = Math.max(...headPoints.map((point) => point.y));
  const faceCeilingY = minimumHeadY
    + (maximumHeadY - minimumHeadY) * faceHullUpperFraction;
  const facePoints = headPoints.filter((point) => point.y <= faceCeilingY);
  if (facePoints.length < 50) {
    throw new Error(`visible face point cloud is too small: ${facePoints.length}`);
  }
  const handPoints = Object.fromEntries(['Left', 'Right'].map((side) => [
    side,
    weightedSkinPoints(THREE, root, `${side}Hand`, handWeightMinimum),
  ]));
  const swordPoints = swordPointClouds(THREE, swordRoot);
  const views = {};
  for (const [name, camera] of Object.entries(runtimeCameras(THREE, swordRoot))) {
    const headHull = convexHull(headPoints.map((point) => projectPoint(point, camera)));
    const faceHull = convexHull(facePoints.map((point) => projectPoint(point, camera)));
    const faceApertureHull = scaledPolygon(faceHull, faceApertureScale);
    const bladeHull = convexHull(
      swordPoints.blade.map((point) => projectPoint(point, camera)),
    );
    const guardHull = convexHull(
      swordPoints.crossguard.map((point) => projectPoint(point, camera)),
    );
    const hands = {};
    let minimumArmClearance = Infinity;
    let minimumHandClearance = Infinity;
    for (const side of ['Left', 'Right']) {
      const elbow = projectPoint(
        worldPosition(THREE, requireNode(root, `${side}ForeArm`)),
        camera,
      );
      const wrist = projectPoint(
        worldPosition(THREE, requireNode(root, `${side}Hand`)),
        camera,
      );
      const handHull = convexHull(
        handPoints[side].map((point) => projectPoint(point, camera)),
      );
      const armClearance = segmentPolygonDistance(elbow, wrist, faceApertureHull);
      const handClearance = polygonDistance(handHull, faceApertureHull);
      minimumArmClearance = Math.min(minimumArmClearance, armClearance);
      minimumHandClearance = Math.min(minimumHandClearance, handClearance);
      hands[side.toLowerCase()] = {
        armHeadPixels: Number(armClearance.toFixed(3)),
        handHeadPixels: Number(handClearance.toFixed(3)),
        elbow: roundArray(elbow, 2),
        wrist: roundArray(wrist, 2),
        bounds: polygonBounds(handHull),
      };
    }
    const bladeHeadPixels = polygonDistance(bladeHull, headHull);
    const guardHeadPixels = polygonDistance(guardHull, faceHull);
    const passed = bladeHeadPixels >= minimumBladeHeadPixels
      && guardHeadPixels >= minimumGuardHeadPixels
      && minimumArmClearance >= minimumArmHeadPixels
      && minimumHandClearance >= minimumHandHeadPixels;
    views[name] = {
      status: passed ? 'PASS' : 'FAIL',
      bladeHeadPixels: Number(bladeHeadPixels.toFixed(3)),
      guardHeadPixels: Number(guardHeadPixels.toFixed(3)),
      minimumArmHeadPixels: Number(minimumArmClearance.toFixed(3)),
      minimumHandHeadPixels: Number(minimumHandClearance.toFixed(3)),
      hands,
      headBounds: polygonBounds(headHull),
      faceBounds: polygonBounds(faceHull),
      faceApertureBounds: polygonBounds(faceApertureHull),
      bladeBounds: polygonBounds(bladeHull),
      guardBounds: polygonBounds(guardHull),
      bladeScreen: {
        hilt: roundArray(projectPoint(weaponAxes(THREE, swordRoot).hilt, camera), 2),
        tip: roundArray(projectPoint(weaponAxes(THREE, swordRoot).tip, camera), 2),
      },
    };
  }
  return {
    status: Object.values(views).every((view) => view.status === 'PASS')
      ? 'PASS'
      : 'FAIL',
    thresholds: {
      bladeHeadPixels: minimumBladeHeadPixels,
      guardHeadPixels: minimumGuardHeadPixels,
      armHeadPixels: minimumArmHeadPixels,
      armFaceAdvisoryPixels: recommendedArmFacePixels,
      handHeadPixels: minimumHandHeadPixels,
      bladeAuthority: 'full weighted helmet and plume hull',
      guardAuthority: `lower visible face hull through ${faceHullUpperFraction} of Head-skinned world height`,
      armHandAuthority: `${faceApertureScale} central aperture of the lower visible face hull`,
      armFaceDisposition: 'advisory because Vanguard frame zero intentionally frames the head with opposed forearms; browser pixels remain decisive',
    },
    views,
  };
}

function evaluationReport(THREE, authored, silhouette) {
  const supportPalmErrorTorso = authored.supportPinError / authored.torsoHeight;
  const checks = {
    silhouette: silhouette.status === 'PASS',
    supportPalmPin: supportPalmErrorTorso <= maximumSupportPalmErrorTorso,
    vanguardHighGuard: authored.dominantHandAboveNeckTorso
        >= minimumDominantHandAboveNeckTorso
      && authored.supportHandAboveNeckTorso >= minimumSupportHandAboveNeckTorso
      && authored.handClusterBesideHeadShoulders
        >= minimumHandClusterBesideHeadShoulders
      && authored.gripStepTorso >= minimumGripStepTorso,
    leftLowElbow: authored.leftElbowDropTorso >= minimumElbowDropTorso,
    rightLowElbow: authored.rightElbowDropTorso >= minimumElbowDropTorso,
    supportReachReserve: authored.leftReachReserveTorso >= minimumSupportReachReserveTorso,
    supportElbowBend: authored.leftElbowAngleDeg <= maximumSupportElbowAngleDeg,
    dominantReachReserve: authored.rightReachReserveTorso
      >= minimumDominantReachReserveTorso,
    dominantElbowBend: authored.rightElbowAngleDeg <= maximumSupportElbowAngleDeg,
  };
  return {
    status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
    angleDeg: authored.angleDeg,
    checks,
    blade: {
      desiredWorldDirection: roundArray(authored.desiredBlade.toArray(), 6),
      actualWorldDirection: roundArray(authored.actualBlade.toArray(), 6),
      residualAngleDeg: Number(THREE.MathUtils.radToDeg(
        authored.desiredBlade.angleTo(authored.actualBlade),
      ).toFixed(6)),
    },
    supportHand: {
      palmPinErrorWorld: Number(authored.supportPinError.toFixed(8)),
      palmPinErrorTorso: Number(supportPalmErrorTorso.toFixed(6)),
      palmToHandleWorld: Number(authored.support.distance.toFixed(8)),
      handleParameter: Number(authored.support.parameter.toFixed(6)),
      reachReserveTorso: Number(authored.leftReachReserveTorso.toFixed(6)),
      elbowAngleDeg: Number(authored.leftElbowAngleDeg.toFixed(4)),
    },
    lowElbows: {
      leftDropTorso: Number(authored.leftElbowDropTorso.toFixed(6)),
      rightDropTorso: Number(authored.rightElbowDropTorso.toFixed(6)),
    },
    vanguardHighGuard: {
      intent: 'high loaded roof guard beside the helmet with vertically stepped hands',
      authoredTarget: highGuardTarget,
      dominantHandAboveNeckTorso: Number(
        authored.dominantHandAboveNeckTorso.toFixed(6),
      ),
      minimumDominantHandAboveNeckTorso,
      supportHandAboveNeckTorso: Number(
        authored.supportHandAboveNeckTorso.toFixed(6),
      ),
      minimumSupportHandAboveNeckTorso,
      handClusterBesideHeadShoulders: Number(
        authored.handClusterBesideHeadShoulders.toFixed(6),
      ),
      minimumHandClusterBesideHeadShoulders,
      gripStepTorso: Number(authored.gripStepTorso.toFixed(6)),
      minimumGripStepTorso,
      rightWristWorld: roundArray(authored.rightWrist.toArray(), 6),
      leftWristWorld: roundArray(authored.leftWrist.toArray(), 6),
      handCenterWorld: roundArray(authored.handCenter.toArray(), 6),
    },
    reachAndBend: {
      leftReachReserveTorso: Number(authored.leftReachReserveTorso.toFixed(6)),
      rightReachReserveTorso: Number(authored.rightReachReserveTorso.toFixed(6)),
      minimumDominantReachReserveTorso,
      leftElbowAngleDeg: Number(authored.leftElbowAngleDeg.toFixed(4)),
      rightElbowAngleDeg: Number(authored.rightElbowAngleDeg.toFixed(4)),
    },
    authoredTravel: {
      boneLocalDegrees: authored.boneTravelDeg,
      leftElbowWorld: Number(authored.landmarkDeltaWorld.leftElbow.toFixed(6)),
      leftWristWorld: Number(authored.landmarkDeltaWorld.leftWrist.toFixed(6)),
      rightElbowWorld: Number(authored.landmarkDeltaWorld.rightElbow.toFixed(6)),
      rightWristWorld: Number(authored.landmarkDeltaWorld.rightWrist.toFixed(6)),
    },
    silhouette,
  };
}

function seedFrame(candidate) {
  const frame = structuredClone(candidate.frames[0]);
  const preserved = candidate.source?.runtimeAuthoring?.seedBones;
  if (preserved) {
    for (const [name, quaternion] of Object.entries(preserved)) {
      frame.bones[name] = structuredClone(quaternion);
    }
  }
  return frame;
}

function buildCandidate(THREE, root, frame, chosen, seed) {
  const generated = structuredClone(committedCandidate);
  const authoredFrame = structuredClone(frame);
  for (const name of runtimeAuthoredBones) {
    authoredFrame.bones[name] = roundFloat32Array(
      requireNode(root, name).quaternion.toArray(),
      8,
    );
  }
  const canonical = canonicalFrame(authoredFrame);
  const authoredGlb = injectAuthoredGlb(canonical);
  const poseSha256 = sha256Text(stableStringify(canonical));
  generated.frames = [canonical];
  generated.primeKeys = { start: 0 };
  generated.source = {
    ...generated.source,
    method: 'Three.js model-local bilateral roof-guard projection, then Pin First, Roll Last correction from the exact 3d6a57a9 browser seed',
    exactAuthoredGlb: true,
    exactAuthoredBodyGlb: true,
    authoredGlbSha256: authoredGlb.sha256,
    poseSha256,
    status: 'generated-visual-pending-candidate-parity',
    authorEligibleBeforeCandidateParity: true,
    runtimeAuthoring: {
      schema: 'pose-lab-v2-crimson-runtime-frame-zero-authoring-v1',
      coordinateSpace: 'Three.js normalized character world; exact cloud center camera is 986x900',
      viewport: [centerCanvas.width, centerCanvas.height],
      seedCommit: '3d6a57a97843',
      seedPoseSha256: committedCandidate.source?.runtimeAuthoring?.seedPoseSha256
        || committedCandidate.source?.poseSha256,
      seedBones: Object.fromEntries(runtimeAuthoredBones.map((name) => [
        name,
        roundArray(seed.localState.bones[name].quaternion.toArray(), 8),
      ])),
      authoredBones: runtimeAuthoredBones,
      authoredGlb: {
        animation: authoredGlb.animation,
        sha256: authoredGlb.sha256,
        byteLength: authoredGlb.byteLength,
        channels: authoredGlb.channels,
      },
      bladeScreenRotationDeg: chosen.angleDeg,
      highGuardTarget,
      bladeWorldDirection: chosen.blade.actualWorldDirection,
      supportHandMethod: 'bilateral high-guard wrist projection with explicit low poles, then exact elbow-circle projection and iterative visible-palm pin',
      gates: chosen,
    },
    poseProvenance: {
      bonesAndHips: 'protected center, head, shoulders, legs, and Hips remain exact to 3d6a57a9; both arm chains are authored in the measured browser bone-child basis',
      sabreLocal: 'unchanged mesh-seated 3d6a57a9 transform; sword direction comes from runtime-basis RightHand rotation',
    },
  };
  return { generated, poseSha256, authoredGlb };
}

async function main() {
  const args = parseArgs(process.argv);
  ensureBrowserShim();
  const sandbox = ensureThreeSandbox();
  const THREE = await import(pathToFileURL(
    path.join(sandbox, 'node_modules/three/build/three.module.js'),
  ).href);
  const { GLTFLoader } = await import(pathToFileURL(
    path.join(sandbox, 'node_modules/three/examples/jsm/loaders/GLTFLoader.js'),
  ).href);
  const loadGlb = (file) => new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer(file), path.dirname(file) + '/', resolve, reject);
  });
  const [character, sword] = await Promise.all([
    loadGlb(characterPath),
    loadGlb(swordPath),
  ]);
  const root = normalizeCharacter(THREE, character.scene);
  const frame = seedFrame(committedCandidate);
  applyCandidateFrame(root, frame);
  const swordRoot = sword.scene;
  attachSword(THREE, root, swordRoot, frame);
  const seed = {
    localState: captureLocalState(root, swordRoot),
    leftElbow: worldPosition(THREE, requireNode(root, 'LeftForeArm')),
    leftWrist: worldPosition(THREE, requireNode(root, 'LeftHand')),
    rightElbow: worldPosition(THREE, requireNode(root, 'RightForeArm')),
    rightWrist: worldPosition(THREE, requireNode(root, 'RightHand')),
  };
  const angles = args.angleDeg !== null
    ? [args.angleDeg]
    : args.sweep
      ? authoredAnglesDeg
      : [-30];
  const trials = [];
  let chosenState = null;
  for (const angleDeg of angles) {
    const authored = authorAtAngle(THREE, root, swordRoot, seed, angleDeg);
    const silhouette = silhouetteReport(THREE, root, swordRoot);
    const trial = evaluationReport(THREE, authored, silhouette);
    trials.push(trial);
    if (!chosenState && trial.status === 'PASS') {
      chosenState = {
        trial,
        bones: Object.fromEntries(runtimeAuthoredBones.map((name) => [
          name,
          requireNode(root, name).quaternion.clone(),
        ])),
      };
    }
  }
  if (!chosenState) {
    const summary = {
      ok: false,
      candidate: candidateId,
      testedAnglesDeg: angles,
      trials,
    };
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
    return;
  }
  restoreLocalState(root, swordRoot, seed.localState);
  for (const [name, quaternion] of Object.entries(chosenState.bones)) {
    requireNode(root, name).quaternion.copy(quaternion);
  }
  root.updateMatrixWorld(true);
  const built = buildCandidate(
    THREE,
    root,
    frame,
    chosenState.trial,
    seed,
  );
  const authoredGlbRoundTrip = await verifyAuthoredGlbRoundTrip(
    loadGlb,
    built.authoredGlb.path,
    built.generated.frames[0],
    built.poseSha256,
  );
  const moduleText = `export const ${exportName} = ${JSON.stringify(built.generated, null, 2)};\n`;
  const moduleSha256 = sha256Text(moduleText);
  const committedText = fs.readFileSync(candidatePath, 'utf8');
  const committedModuleSha256 = sha256Text(committedText);
  const committedModuleParity = {
    enforced: args.check,
    status: committedText === moduleText ? 'PASS' : args.check ? 'FAIL' : 'NOT_ENFORCED',
    exactBytes: committedText === moduleText,
    committedSha256: committedModuleSha256,
    generatedSha256: moduleSha256,
  };
  if (args.check) {
    if (committedText !== moduleText) {
      throw new Error(
        `committed runtime candidate differs from deterministic authoring output: `
        + `committed=${committedModuleSha256} generated=${moduleSha256}`,
      );
    }
  }
  const report = {
    schema: 'pose-lab-v2-crimson-runtime-frame-zero-authoring-report-v1',
    status: chosenState.trial.status,
    candidate: candidateId,
    poseSha256: built.poseSha256,
    candidateModuleSha256: moduleSha256,
    committedModuleParity,
    authoredGlb: {
      path: path.relative(projectRoot, built.authoredGlb.path),
      sha256: built.authoredGlb.sha256,
      byteLength: built.authoredGlb.byteLength,
      animation: built.authoredGlb.animation,
      channelCount: built.authoredGlb.channels.length,
      roundTrip: authoredGlbRoundTrip,
    },
    selected: chosenState.trial,
    testedAnglesDeg: angles,
    trials,
  };
  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  fs.writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`);
  if (args.write) {
    fs.writeFileSync(candidatePath, moduleText);
  }
  console.log(JSON.stringify({
    ok: true,
    wroteCandidate: args.write ? path.relative(projectRoot, candidatePath) : null,
    report: path.relative(projectRoot, args.report),
    selectedAngleDeg: chosenState.trial.angleDeg,
    poseSha256: built.poseSha256,
    candidateModuleSha256: moduleSha256,
    authoredGlbSha256: built.authoredGlb.sha256,
    selected: chosenState.trial,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

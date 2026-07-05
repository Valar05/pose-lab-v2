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
const sabrePath = path.join(projectRoot, 'public', 'assets', 'meshy', 'meshy_real_sabre.glb');
const outputPath = path.join(projectRoot, 'src', 'ready-pose.js');
const sourceClipName = 'OneHandReady';
const restClipName = '0T-Pose';
const sourceFrameName = 'ShoulderCenter';
const targetFrameName = 'Spine02';
const weaponSocketName = 'Weapon.R';
const sourceBladeAxis = [0, -1, 0];
const sourceRollAxis = [1, 0, 0];
const sabreRollAxis = [0, 1, 0];
const saberGripLocal = {
  position: [8.52296, 28.41254, -24.44467],
  rotationDeg: [32.35, 74.24, -174.11],
  scale: [46.62859, 46.62859, 46.62856],
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

function rotateJointToward(THREE, sceneRoot, joint, end, targetWorld, strength) {
  const jointPos = worldPosition(THREE, joint);
  const current = worldPosition(THREE, end).sub(jointPos);
  const desired = targetWorld.clone().sub(jointPos);
  if (current.lengthSq() < 1e-8 || desired.lengthSq() < 1e-8) return;
  const turn = new THREE.Quaternion().setFromUnitVectors(current.normalize(), desired.normalize());
  if (strength < 1) turn.slerp(new THREE.Quaternion(), 1 - strength).normalize();
  setWorldQuaternion(THREE, joint, turn.multiply(worldQuaternion(THREE, joint)).normalize());
  sceneRoot.updateMatrixWorld(true);
}

function alignSegment(THREE, sceneRoot, joint, end, desiredStart, desiredEnd) {
  const current = segmentDirection(THREE, joint, end);
  const desired = desiredEnd.clone().sub(desiredStart);
  if (!current || desired.lengthSq() < 1e-8) return;
  const turn = new THREE.Quaternion().setFromUnitVectors(current, desired.normalize()).normalize();
  setWorldQuaternion(THREE, joint, turn.multiply(worldQuaternion(THREE, joint)).normalize());
  sceneRoot.updateMatrixWorld(true);
}

function clampToReach(THREE, shoulder, targetWorld, length, reachScale = 0.98) {
  const shoulderWorld = worldPosition(THREE, shoulder);
  const offset = targetWorld.clone().sub(shoulderWorld);
  const maxReach = Math.max(0.001, length * reachScale);
  if (offset.length() > maxReach) offset.setLength(maxReach);
  return shoulderWorld.add(offset);
}

function applyTwoBonePin(THREE, sceneRoot, upper, lower, hand, targetWorld) {
  const length = worldPosition(THREE, upper).distanceTo(worldPosition(THREE, lower))
    + worldPosition(THREE, lower).distanceTo(worldPosition(THREE, hand));
  const pinnedTarget = clampToReach(THREE, upper, targetWorld, length);
  for (let i = 0; i < 8; i += 1) {
    rotateJointToward(THREE, sceneRoot, lower, hand, pinnedTarget, 0.95);
    rotateJointToward(THREE, sceneRoot, upper, hand, pinnedTarget, 0.85);
  }
}

function projectedAroundAxis(THREE, direction, axis) {
  const projected = direction.clone().sub(axis.clone().normalize().multiplyScalar(direction.dot(axis.clone().normalize())));
  return projected.lengthSq() > 1e-8 ? projected.normalize() : null;
}

function mapDirectionBetweenFrames(THREE, direction, sourceFrame, targetFrame) {
  const sourceLocal = direction.clone().normalize().applyQuaternion(worldQuaternion(THREE, sourceFrame).invert()).normalize();
  return sourceLocal.applyQuaternion(worldQuaternion(THREE, targetFrame)).normalize();
}

function localBoundsForObject(THREE, object) {
  object.updateMatrixWorld(true);
  const inverseRoot = object.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();
  object.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    const geometryBox = node.geometry.boundingBox;
    for (const x of [geometryBox.min.x, geometryBox.max.x]) {
      for (const y of [geometryBox.min.y, geometryBox.max.y]) {
        for (const z of [geometryBox.min.z, geometryBox.max.z]) {
          corner.set(x, y, z).applyMatrix4(node.matrixWorld).applyMatrix4(inverseRoot);
          box.expandByPoint(corner);
        }
      }
    }
  });
  return box;
}

function dominantLocalAxis(THREE, object) {
  const size = localBoundsForObject(THREE, object).getSize(new THREE.Vector3());
  if (size.x >= size.y && size.x >= size.z) return new THREE.Vector3(1, 0, 0);
  if (size.y >= size.x && size.y >= size.z) return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

function basisQuaternion(THREE, primary, secondary) {
  const x = primary.clone().normalize();
  const y = secondary.clone().sub(x.clone().multiplyScalar(secondary.dot(x)));
  if (y.lengthSq() < 1e-8) return new THREE.Quaternion();
  y.normalize();
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)).normalize();
}

function attachDiagnosticSabre(THREE, meshyRoot, sabreRoot) {
  const rightHand = requireNode(meshyRoot, 'RightHand');
  const grip = new THREE.Bone();
  grip.name = 'SaberGripBake';
  grip.position.fromArray(saberGripLocal.position);
  grip.rotation.set(
    THREE.MathUtils.degToRad(saberGripLocal.rotationDeg[0]),
    THREE.MathUtils.degToRad(saberGripLocal.rotationDeg[1]),
    THREE.MathUtils.degToRad(saberGripLocal.rotationDeg[2])
  );
  grip.scale.fromArray(saberGripLocal.scale);
  rightHand.add(grip);
  sabreRoot.position.set(0, 0, 0);
  sabreRoot.quaternion.identity();
  sabreRoot.scale.set(1, 1, 1);
  grip.add(sabreRoot);
  meshyRoot.updateMatrixWorld(true);
  return grip;
}

function applyBladeBasisCorrection(THREE, fpsRoot, meshyRoot, sabreRoot) {
  const sourceFrame = requireNode(fpsRoot, sourceFrameName);
  const targetFrame = requireNode(meshyRoot, targetFrameName);
  const weaponSocket = requireNode(fpsRoot, weaponSocketName);
  const rightHand = requireNode(meshyRoot, 'RightHand');
  const sabreBladeAxis = dominantLocalAxis(THREE, sabreRoot);
  const expectedBlade = mapDirectionBetweenFrames(THREE, worldDirection(THREE, weaponSocket, sourceBladeAxis), sourceFrame, targetFrame);
  const expectedRoll = mapDirectionBetweenFrames(THREE, worldDirection(THREE, weaponSocket, sourceRollAxis), sourceFrame, targetFrame);
  const actualBlade = sabreBladeAxis.applyQuaternion(worldQuaternion(THREE, sabreRoot)).normalize();
  const actualRoll = new THREE.Vector3(...sabreRollAxis).normalize().applyQuaternion(worldQuaternion(THREE, sabreRoot)).normalize();
  const expectedBasis = basisQuaternion(THREE, expectedBlade, expectedRoll);
  const actualBasis = basisQuaternion(THREE, actualBlade, actualRoll);
  const correction = expectedBasis.multiply(actualBasis.invert()).normalize();
  setWorldQuaternion(THREE, rightHand, correction.multiply(worldQuaternion(THREE, rightHand)).normalize());
  meshyRoot.updateMatrixWorld(true);
  return Number((actualBlade.angleTo(expectedBlade) * 180 / Math.PI).toFixed(3));
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
  const turn = new THREE.Quaternion()
    .setFromAxisAngle(axis, signed)
    .normalize();
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

function applyOrientationRetarget(THREE, fpsRoot, meshyRoot, sourceRestWorld, targetRestWorld) {
  const sourceFrameRestWorld = sourceRestWorld.get(canon(sourceFrameName));
  const targetFrameRestWorld = targetRestWorld.get(canon(targetFrameName));
  const retargeted = [];
  for (const chain of chains) {
    for (let i = 0; i < chain.source.length; i += 1) {
      const sourceName = chain.source[i];
      const targetName = chain.target[i];
      const sourceRest = sourceRestWorld.get(canon(sourceName));
      const sourceReady = worldQuaternion(THREE, requireNode(fpsRoot, sourceName));
      const targetRest = targetRestWorld.get(canon(targetName));
      const targetBone = requireNode(meshyRoot, targetName);
      if (!sourceRest || !sourceReady || !targetRest || !sourceFrameRestWorld || !targetFrameRestWorld) continue;
      const sourceDelta = sourceReady.clone().multiply(sourceRest.clone().invert()).normalize();
      const mappedDelta = mapSourceDeltaToTargetFrame(THREE, sourceDelta, sourceFrameRestWorld, targetFrameRestWorld);
      setWorldQuaternion(THREE, targetBone, mappedDelta.multiply(targetRest).normalize());
      meshyRoot.updateMatrixWorld(true);
      retargeted.push(targetName);
    }
  }
  return retargeted;
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

function posePayload(THREE, meshyRoot) {
  const bones = {};
  for (const name of exportBones) {
    const bone = find(meshyRoot, name);
    if (bone) bones[name] = roundedQuaternion(bone.quaternion);
  }
  return bones;
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
  const [fps, meshy, sabre] = await Promise.all([loadGlb(fpsPath), loadGlb(meshyPath), loadGlb(sabrePath)]);
  const fpsRoot = fps.scene;
  const meshyRoot = meshy.scene;
  const sabreRoot = sabre.scene;
  attachDiagnosticSabre(THREE, meshyRoot, sabreRoot);
  const readyClip = fps.animations.find((clip) => clip.name === sourceClipName);
  const restClip = fps.animations.find((clip) => clip.name === restClipName);
  if (!readyClip) throw new Error(`missing FPS clip ${sourceClipName}`);
  if (restClip) applyClipPose(THREE, fpsRoot, restClip, 0);
  const sourceRestWorld = captureWorldQuaternions(THREE, fpsRoot);
  const targetRestWorld = captureWorldQuaternions(THREE, meshyRoot);
  const targetRestLocal = captureLocalQuaternions(meshyRoot);
  applyClipPose(THREE, fpsRoot, readyClip, readyClip.duration);
  applyLocalQuaternions(meshyRoot, targetRestLocal);
  meshyRoot.updateMatrixWorld(true);

  const scale = chains.reduce((sum, chain) => (
    sum + chainLength(THREE, meshyRoot, chain.target) / Math.max(0.0001, chainLength(THREE, fpsRoot, chain.source))
  ), 0) / chains.length;
  const sourceFrame = requireNode(fpsRoot, sourceFrameName);
  const targetFrame = requireNode(meshyRoot, targetFrameName);
  const projected = new Map();
  for (const chain of chains) {
    for (const sourceName of chain.source) {
      projected.set(sourceName, mapPointBetweenFrames(
        THREE,
        sourceFrame,
        targetFrame,
        worldPosition(THREE, requireNode(fpsRoot, sourceName)),
        scale
      ));
    }
  }

  const retargetedBones = applyOrientationRetarget(THREE, fpsRoot, meshyRoot, sourceRestWorld, targetRestWorld);
  for (const chain of chains) {
    const [upper, lower, hand] = chain.target.map((name) => requireNode(meshyRoot, name));
    applyTwoBonePin(THREE, meshyRoot, upper, lower, hand, projected.get(chain.source[2]));
    rotateHandRoll(THREE, meshyRoot, fpsRoot, meshyRoot, chain);
  }
  const bladeBasisCorrectionAngleDeg = applyBladeBasisCorrection(THREE, fpsRoot, meshyRoot, sabreRoot);

  const payload = {
    schema: 'pose-lab-v2-ready-pose-v1',
    label: 'OneHandReady orientation retargeted from FPSPlayer',
    source: {
      fps: '../pose-lab/assets/models/FPSPlayer.glb',
      meshy: './public/assets/meshy/meshy_apose_walking_with_skin.glb',
      clip: sourceClipName,
      sampleTime: Number(readyClip.duration.toFixed(6)),
      projectionFrame: `${sourceFrameName}->${targetFrameName}`,
      method: 'orientation-first-retarget-with-pins',
      bladeBasis: {
        weaponSocket: weaponSocketName,
        sourceBladeAxis,
        sourceRollAxis,
        sabreBladeAxis: dominantLocalAxis(THREE, sabreRoot).toArray(),
        sabreRollAxis,
        correction: 'baked-RightHand-world-quaternion',
        beforeAngleDeg: bladeBasisCorrectionAngleDeg,
      },
      retargetedBones,
    },
    bones: posePayload(THREE, meshyRoot),
  };
  const source = `export const READY_POSE_PRESET = ${JSON.stringify(payload, null, 2)};\n`;
  fs.writeFileSync(outputPath, source);
  console.log(JSON.stringify({
    wrote: path.relative(projectRoot, outputPath),
    clip: sourceClipName,
    time: payload.source.sampleTime,
    bones: Object.keys(payload.bones).length,
    method: payload.source.method,
    retargetedBones,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

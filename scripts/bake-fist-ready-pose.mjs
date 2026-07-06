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
const outputPath = path.join(projectRoot, 'src', 'fist-ready-pose.js');
const candidateOutputPath = path.join(projectRoot, 'src', 'review-candidates', 'fist-ready-candidate-1.js');
const sourceClipName = 'FistReady';
const restClipName = '0T-Pose';
const sourceFrameName = 'ShoulderCenter';
const targetFrameName = 'Spine02';
const viewport = [390, 844];
const fpsCameraFov = 112;
const meshyFpvCamera = {
  anchor: 'Head',
  fallbackAnchor: 'Spine02',
  forwardAxis: 'z',
  headForwardOffset: 0.15,
  headCameraYOffset: -0.07,
  lookForward: 1.35,
  lookVertical: 0,
  fov: 112,
  near: 0.055,
  far: 80,
};

const chains = [
  {
    label: 'right',
    source: ['Arm.R', 'Forearm.R', 'Hand.R'],
    targetDriver: 'RightShoulder',
    target: ['RightArm', 'RightForeArm', 'RightHand'],
    targetLocalAxis: [0, -1, 0],
    sourceLocalAxis: [0, 0, 1],
  },
  {
    label: 'left',
    source: ['Arm.L', 'Forearm.L', 'Hand.L'],
    targetDriver: 'LeftShoulder',
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

function scoreWorldPoints(THREE, root, targets) {
  root.updateMatrixWorld(true);
  let total = 0;
  for (const [nodeName, target] of Object.entries(targets)) {
    total += requireNode(root, nodeName).getWorldPosition(new THREE.Vector3()).distanceTo(target);
  }
  return total;
}

function solveChainToWorldTargets(THREE, meshyRoot, upperName, lowerName, handName, targets) {
  const upper = requireNode(meshyRoot, upperName);
  const lower = requireNode(meshyRoot, lowerName);
  const hand = requireNode(meshyRoot, handName);
  const startUpper = upper.quaternion.clone();
  const startLower = lower.quaternion.clone();
  let bestUpper = startUpper.clone();
  let bestLower = startLower.clone();
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
      for (const bone of [upper, lower]) {
        for (const axis of axes) {
          for (const sign of [-1, 1]) {
            const delta = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(step * sign));
            upper.quaternion.copy(bestUpper);
            lower.quaternion.copy(bestLower);
            bone.quaternion.multiply(delta).normalize();
            meshyRoot.updateMatrixWorld(true);
            const score = scoreWorldPoints(THREE, meshyRoot, targets);
            if (score + 0.00001 < bestScore) {
              bestUpper = upper.quaternion.clone();
              bestLower = lower.quaternion.clone();
              bestScore = score;
              improved = true;
            }
          }
        }
      }
    }
  }
  upper.quaternion.copy(bestUpper).normalize();
  lower.quaternion.copy(bestLower).normalize();
  meshyRoot.updateMatrixWorld(true);
  const actualElbowWorld = lower.getWorldPosition(new THREE.Vector3());
  const actualWristWorld = hand.getWorldPosition(new THREE.Vector3());
  return {
    upper: roundedQuaternion(bestUpper),
    lower: roundedQuaternion(bestLower),
    score: Number(bestScore.toFixed(6)),
    targetElbowWorld: vectorArray(targets[lowerName]),
    actualElbowWorld: vectorArray(actualElbowWorld),
    targetWristWorld: vectorArray(targets[handName]),
    actualWristWorld: vectorArray(actualWristWorld),
    elbowWorldError: Number(actualElbowWorld.distanceTo(targets[lowerName]).toFixed(5)),
    wristWorldError: Number(actualWristWorld.distanceTo(targets[handName]).toFixed(5)),
    upperRotationFromInputDeg: Number(THREE.MathUtils.radToDeg(startUpper.angleTo(bestUpper)).toFixed(3)),
    lowerRotationFromInputDeg: Number(THREE.MathUtils.radToDeg(startLower.angleTo(bestLower)).toFixed(3)),
  };
}

function solveShoulderChainToWorldTargets(THREE, meshyRoot, shoulderName, upperName, lowerName, handName, targets) {
  const shoulder = requireNode(meshyRoot, shoulderName);
  const upper = requireNode(meshyRoot, upperName);
  const lower = requireNode(meshyRoot, lowerName);
  const startShoulder = shoulder.quaternion.clone();
  const startUpper = upper.quaternion.clone();
  const startLower = lower.quaternion.clone();
  let bestShoulder = startShoulder.clone();
  let bestUpper = startUpper.clone();
  let bestLower = startLower.clone();
  let bestScore = scoreWorldPoints(THREE, meshyRoot, targets);
  const axes = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ];
  for (const step of [60, 36, 24, 12, 6, 3, 1.5, 0.75, 0.35, 0.18]) {
    let improved = true;
    let guard = 0;
    while (improved && guard < 24) {
      improved = false;
      guard += 1;
      for (const bone of [shoulder, upper, lower]) {
        for (const axis of axes) {
          for (const sign of [-1, 1]) {
            const delta = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(step * sign));
            shoulder.quaternion.copy(bestShoulder);
            upper.quaternion.copy(bestUpper);
            lower.quaternion.copy(bestLower);
            bone.quaternion.multiply(delta).normalize();
            meshyRoot.updateMatrixWorld(true);
            const score = scoreWorldPoints(THREE, meshyRoot, targets);
            if (score + 0.00001 < bestScore) {
              bestShoulder = shoulder.quaternion.clone();
              bestUpper = upper.quaternion.clone();
              bestLower = lower.quaternion.clone();
              bestScore = score;
              improved = true;
            }
          }
        }
      }
    }
  }
  shoulder.quaternion.copy(bestShoulder).normalize();
  upper.quaternion.copy(bestUpper).normalize();
  lower.quaternion.copy(bestLower).normalize();
  meshyRoot.updateMatrixWorld(true);
  const actualUpperWorld = requireNode(meshyRoot, upperName).getWorldPosition(new THREE.Vector3());
  const actualElbowWorld = requireNode(meshyRoot, lowerName).getWorldPosition(new THREE.Vector3());
  const actualWristWorld = requireNode(meshyRoot, handName).getWorldPosition(new THREE.Vector3());
  return {
    shoulder: roundedQuaternion(bestShoulder),
    upper: roundedQuaternion(bestUpper),
    lower: roundedQuaternion(bestLower),
    score: Number(bestScore.toFixed(6)),
    targetUpperWorld: vectorArray(targets[upperName]),
    actualUpperWorld: vectorArray(actualUpperWorld),
    upperWorldError: Number(actualUpperWorld.distanceTo(targets[upperName]).toFixed(5)),
    targetElbowWorld: vectorArray(targets[lowerName]),
    actualElbowWorld: vectorArray(actualElbowWorld),
    elbowWorldError: Number(actualElbowWorld.distanceTo(targets[lowerName]).toFixed(5)),
    targetWristWorld: vectorArray(targets[handName]),
    actualWristWorld: vectorArray(actualWristWorld),
    wristWorldError: Number(actualWristWorld.distanceTo(targets[handName]).toFixed(5)),
    shoulderRotationFromInputDeg: Number(THREE.MathUtils.radToDeg(startShoulder.angleTo(bestShoulder)).toFixed(3)),
    upperRotationFromInputDeg: Number(THREE.MathUtils.radToDeg(startUpper.angleTo(bestUpper)).toFixed(3)),
    lowerRotationFromInputDeg: Number(THREE.MathUtils.radToDeg(startLower.angleTo(bestLower)).toFixed(3)),
  };
}

function projectedAroundAxis(THREE, direction, axis) {
  const projected = direction.clone().sub(axis.clone().normalize().multiplyScalar(direction.dot(axis.clone().normalize())));
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

function mapPointBetweenCameras(THREE, sourceCamera, targetCamera, sourceWorld, scale) {
  const sourceLocal = sourceWorld.clone()
    .sub(sourceCamera.position)
    .applyQuaternion(sourceCamera.quaternion.clone().invert());
  return sourceLocal
    .multiplyScalar(scale)
    .applyQuaternion(targetCamera.quaternion)
    .add(targetCamera.position);
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

function sampleVectorTrack(THREE, track, time) {
  const result = track.createInterpolant(new Float32Array(3)).evaluate(time);
  return new THREE.Vector3(result[0], result[1], result[2]);
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

function localAxisVector(THREE, axisName) {
  if (axisName === 'x') return new THREE.Vector3(1, 0, 0);
  if (axisName === '-x') return new THREE.Vector3(-1, 0, 0);
  if (axisName === 'y') return new THREE.Vector3(0, 1, 0);
  if (axisName === '-y') return new THREE.Vector3(0, -1, 0);
  if (axisName === '-z') return new THREE.Vector3(0, 0, -1);
  return new THREE.Vector3(0, 0, 1);
}

function setupFpsCamera(THREE, fpsRoot) {
  const [width, height] = viewport;
  const cameraBone = requireNode(fpsRoot, 'Camera');
  const camera = new THREE.PerspectiveCamera(fpsCameraFov, width / height, 0.055, 80);
  camera.position.copy(worldPosition(THREE, cameraBone));
  camera.quaternion.copy(worldQuaternion(THREE, cameraBone));
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

function setupMeshyFpvCamera(THREE, meshyRoot) {
  const [width, height] = viewport;
  const anchor = find(meshyRoot, meshyFpvCamera.anchor) || requireNode(meshyRoot, meshyFpvCamera.fallbackAnchor);
  meshyRoot.updateMatrixWorld(true);
  const anchorPosition = worldPosition(THREE, anchor);
  const anchorQuaternion = worldQuaternion(THREE, anchor);
  const forward = localAxisVector(THREE, meshyFpvCamera.forwardAxis)
    .applyQuaternion(anchorQuaternion)
    .normalize();
  const position = anchorPosition.clone()
    .add(forward.clone().multiplyScalar(meshyFpvCamera.headForwardOffset))
    .add(new THREE.Vector3(0, meshyFpvCamera.headCameraYOffset, 0));
  const target = anchorPosition.clone()
    .add(forward.clone().multiplyScalar(meshyFpvCamera.lookForward))
    .add(new THREE.Vector3(0, meshyFpvCamera.lookVertical, 0));
  const camera = new THREE.PerspectiveCamera(meshyFpvCamera.fov, width / height, meshyFpvCamera.near, meshyFpvCamera.far);
  camera.position.copy(position);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

function projectPoint(THREE, camera, point) {
  const [width, height] = viewport;
  const ndc = point.clone().project(camera);
  return new THREE.Vector2(
    (ndc.x + 1) * width * 0.5,
    (-ndc.y + 1) * height * 0.5
  );
}

function scoreScreenTargets(THREE, meshyRoot, targets) {
  const camera = setupMeshyFpvCamera(THREE, meshyRoot);
  let total = 0;
  for (const [nodeName, target] of Object.entries(targets)) {
    total += projectPoint(THREE, camera, worldPosition(THREE, requireNode(meshyRoot, nodeName))).distanceTo(target);
  }
  return total;
}

function solveChainToScreenTargets(THREE, meshyRoot, upperName, lowerName, handName, targets) {
  const upper = requireNode(meshyRoot, upperName);
  const lower = requireNode(meshyRoot, lowerName);
  const hand = requireNode(meshyRoot, handName);
  const startUpper = upper.quaternion.clone();
  const startLower = lower.quaternion.clone();
  const startHand = hand.quaternion.clone();
  let bestUpper = startUpper.clone();
  let bestLower = startLower.clone();
  let bestHand = startHand.clone();
  let bestScore = scoreScreenTargets(THREE, meshyRoot, targets);
  const axes = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ];
  for (const step of [55, 34, 21, 13, 8, 5, 3, 1.5, 0.75, 0.35, 0.18]) {
    let improved = true;
    let guard = 0;
    while (improved && guard < 18) {
      improved = false;
      guard += 1;
      for (const bone of [upper, lower, hand]) {
        for (const axis of axes) {
          for (const sign of [-1, 1]) {
            const delta = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(step * sign));
            upper.quaternion.copy(bestUpper);
            lower.quaternion.copy(bestLower);
            hand.quaternion.copy(bestHand);
            bone.quaternion.multiply(delta).normalize();
            meshyRoot.updateMatrixWorld(true);
            const score = scoreScreenTargets(THREE, meshyRoot, targets);
            if (score + 0.001 < bestScore) {
              bestUpper = upper.quaternion.clone();
              bestLower = lower.quaternion.clone();
              bestHand = hand.quaternion.clone();
              bestScore = score;
              improved = true;
            }
          }
        }
      }
    }
  }
  upper.quaternion.copy(bestUpper).normalize();
  lower.quaternion.copy(bestLower).normalize();
  hand.quaternion.copy(bestHand).normalize();
  meshyRoot.updateMatrixWorld(true);
  const camera = setupMeshyFpvCamera(THREE, meshyRoot);
  return {
    upper: roundedQuaternion(bestUpper),
    lower: roundedQuaternion(bestLower),
    hand: roundedQuaternion(bestHand),
    scorePx: Number(bestScore.toFixed(3)),
    screen: Object.fromEntries(Object.keys(targets).map((name) => [
      name,
      projectPoint(THREE, camera, worldPosition(THREE, requireNode(meshyRoot, name))).toArray().map((value) => Number(value.toFixed(3))),
    ])),
  };
}

function screenReport(THREE, meshyRoot, targets) {
  const camera = setupMeshyFpvCamera(THREE, meshyRoot);
  const screen = Object.fromEntries(Object.keys(targets).map((name) => [
    name,
    projectPoint(THREE, camera, worldPosition(THREE, requireNode(meshyRoot, name))).toArray().map((value) => Number(value.toFixed(3))),
  ]));
  let score = 0;
  for (const [name, target] of Object.entries(targets)) {
    score += new THREE.Vector2(...screen[name]).distanceTo(target);
  }
  return {
    scorePx: Number(score.toFixed(3)),
    screen,
  };
}

function sourceScreenTargets(THREE, fpsRoot) {
  const camera = setupFpsCamera(THREE, fpsRoot);
  const targetFor = (name) => projectPoint(THREE, camera, worldPosition(THREE, requireNode(fpsRoot, name)));
  return {
    right: {
      RightForeArm: targetFor('ForearmR'),
      RightHand: targetFor('HandR'),
    },
    left: {
      LeftForeArm: targetFor('ForearmL'),
      LeftHand: targetFor('HandL'),
    },
  };
}

function roundedQuaternion(quaternion) {
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w].map((value) => Number(value.toFixed(6)));
}

function vectorArray(vector) {
  return vector.toArray().map((value) => Number(value.toFixed(5)));
}

function posePayload(THREE, meshyRoot) {
  const bones = {};
  for (const name of exportBones) {
    const bone = find(meshyRoot, name);
    if (bone) bones[name] = roundedQuaternion(bone.quaternion);
  }
  return bones;
}

function normalizeCharacter(THREE, object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const height = Math.max(0.001, size.y);
  object.position.sub(center);
  object.position.y += height * 0.5;
  object.scale.multiplyScalar(1.75 / height);
  object.updateMatrixWorld(true);
  return object;
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
  const retargetedBones = applyOrientationRetarget(THREE, fpsRoot, meshyRoot, sourceRestWorld, targetRestWorld);
  const fpsCamera = setupFpsCamera(THREE, fpsRoot);
  const meshyCamera = setupMeshyFpvCamera(THREE, meshyRoot);
  const projected = new Map();
  for (const chain of chains) {
    for (const sourceName of chain.source) {
      projected.set(sourceName, mapPointBetweenCameras(
        THREE,
        fpsCamera,
        meshyCamera,
        worldPosition(THREE, requireNode(fpsRoot, sourceName)),
        scale
      ));
    }
  }
  const jointPinned = {};
  for (const chain of chains) {
    const solved = solveShoulderChainToWorldTargets(THREE, meshyRoot, chain.targetDriver, chain.target[0], chain.target[1], chain.target[2], {
      [chain.target[0]]: projected.get(chain.source[0]),
      [chain.target[1]]: projected.get(chain.source[1]),
      [chain.target[2]]: projected.get(chain.source[2]),
    });
    rotateHandRoll(THREE, meshyRoot, fpsRoot, meshyRoot, chain);
    jointPinned[chain.label] = solved;
  }
  const screenTargets = sourceScreenTargets(THREE, fpsRoot);
  const rightScreenSolve = screenReport(THREE, meshyRoot, screenTargets.right);
  const leftScreenSolve = screenReport(THREE, meshyRoot, screenTargets.left);
  const screenPinnedBones = posePayload(THREE, meshyRoot);

  const payload = {
    schema: 'pose-lab-v2-fist-ready-pose-v1',
    label: 'FistReady orientation retargeted from FPSPlayer',
    source: {
      fps: '../pose-lab/assets/models/FPSPlayer.glb',
      meshy: './public/assets/meshy/meshy_apose_walking_with_skin.glb',
      clip: sourceClipName,
      sampleTime: Number(readyClip.duration.toFixed(6)),
      projectionFrame: 'FPSPlayer.Camera->Meshy FPV camera',
      method: 'orientation-first-retarget-with-world-joint-pins',
      retargetedBones,
      jointPinned: {
        sourceJoints: Object.fromEntries(chains.map((chain) => [chain.label, chain.source])),
        targetJoints: Object.fromEntries(chains.map((chain) => [chain.label, chain.target])),
        targetSpace: 'runtime-normalized Meshy world mapped from FPS FistReady camera space',
        solverAuthoredBones: Object.fromEntries(chains.map((chain) => [chain.label, [chain.targetDriver, chain.target[0], chain.target[1]]])),
        report: jointPinned,
      },
      fpvScreenPinned: {
        sourceCamera: 'FPSPlayer.Camera',
        targetCamera: 'Meshy head-forward FPV',
        right: {
          target: Object.fromEntries(Object.entries(screenTargets.right).map(([name, value]) => [name, value.toArray().map((entry) => Number(entry.toFixed(3)))])),
          actual: rightScreenSolve.screen,
          scorePx: rightScreenSolve.scorePx,
        },
        left: {
          target: Object.fromEntries(Object.entries(screenTargets.left).map(([name, value]) => [name, value.toArray().map((entry) => Number(entry.toFixed(3)))])),
          actual: leftScreenSolve.screen,
          scorePx: leftScreenSolve.scorePx,
        },
      },
    },
    bones: screenPinnedBones,
  };
  const source = `export const FIST_READY_POSE_PRESET = ${JSON.stringify(payload, null, 2)};\n`;
  fs.writeFileSync(outputPath, source);
  const candidatePayload = {
    schema: 'pose-lab-v2-attack-candidate-v1',
    label: 'FistReady candidate 1',
    source: {
      fps: payload.source.fps,
      meshy: payload.source.meshy,
      clip: sourceClipName,
      duration: payload.source.sampleTime,
      keyCount: 1,
      method: payload.source.method,
      weaponless: true,
      note: 'Weaponless FistReady baseline for reviewing FPSPlayer fist-family pose before FistAttack1.',
      fpvScreenPinned: payload.source.fpvScreenPinned,
    },
    primeKeys: {
      ready: 0,
    },
    frames: [{
      label: 'ready',
      time: 0,
      bones: payload.bones,
    }],
    guardReport: {
      quarantine: true,
      weaponless: true,
      fistReadyBaseline: {
        status: 'REVIEW',
        rule: 'FistAttack1 must use this FistReady target basis, not OneHandReady. FistReady is additionally pinned toward FPS FPV forearm/hand screen positions.',
      },
    },
  };
  fs.writeFileSync(candidateOutputPath, `export const FIST_READY_POSE_SEQUENCE = ${JSON.stringify(candidatePayload, null, 2)};\n`);
  console.log(JSON.stringify({
    wrote: path.relative(projectRoot, outputPath),
    candidate: path.relative(projectRoot, candidateOutputPath),
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

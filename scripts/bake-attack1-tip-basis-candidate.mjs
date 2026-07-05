#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ATTACK1_POSE_SEQUENCE as BASE_ATTACK1 } from '../src/review-candidates/attack1-candidate-1.js';
import { SABER_GRIP_LOCAL, SABRE_REVIEW_LOCAL_AXIS } from '../src/review-constants.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const outputPath = path.join(projectRoot, 'src', 'review-candidates', 'attack1-tip-basis-2.js');
const meshyPath = path.join(projectRoot, 'public', 'assets', 'meshy', 'meshy_apose_walking_with_skin.glb');
const sabrePath = path.join(projectRoot, 'public', 'assets', 'meshy', 'meshy_real_sabre.glb');
const fpsPath = path.join(workspaceRoot, 'pose-lab', 'assets', 'models', 'FPSPlayer.glb');
const sourceClipName = 'OneHandAttack1';
const viewport = [390, 844];
const fpsCameraFov = 112;
const choreographyTargets = {
  anticipation: [-92, -18],
  contact: [92, -18],
};
const choreographyKeys = {
  start: { deltas: {}, rightHandTwistDeg: 0 },
  anticipation: {
    deltas: {
      RightArm: [0, 28, 22],
      RightForeArm: [0, 10, 7],
      LeftArm: [0, 18, 18],
      LeftForeArm: [0, 4, 3],
      LeftHand: [0, 0, 5],
    },
    rightHandTwistDeg: -24,
  },
  contact: {
    deltas: {
      RightArm: [0, -18, -15],
      RightForeArm: [0, -7, -5],
      LeftArm: [0, -42, -34],
      LeftForeArm: [0, -12, -8],
      LeftHand: [0, 0, -10],
    },
    rightHandTwistDeg: 24,
  },
  followThrough: {
    deltas: {
      RightArm: [0, -18, -15],
      RightForeArm: [0, -7, -5],
      LeftArm: [0, -28, -22],
      LeftForeArm: [0, -8, -5],
      LeftHand: [0, 0, -7],
    },
    rightHandTwistDeg: 12,
  },
  recoil: {
    deltas: {
      RightArm: [0, -6, -4],
      RightForeArm: [0, -2, -2],
      LeftArm: [0, -8, -6],
      LeftForeArm: [0, -2, -1],
    },
    rightHandTwistDeg: 8,
  },
  end: { deltas: {}, rightHandTwistDeg: 0 },
};
const predicateThresholds = {
  anticipationHandRightPx: 35,
  anticipationShoulderRightPx: 20,
  horizontalMotionRatio: 1.25,
  bladeHorizontalRatio: 1.4,
  bladeSidePx: 40,
  contactReversePx: 90,
  contactHandLeftPx: 35,
  contactShoulderLeftPx: 20,
  tipBelowTolerancePx: 0,
  extremeRotationDeg: 145,
};
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

async function loadGltf(THREE, GLTFLoader, file) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer(file), path.dirname(file) + '/', resolve, reject);
  });
}

async function loadGlbScene(THREE, GLTFLoader, file) {
  const gltf = await loadGltf(THREE, GLTFLoader, file);
  return gltf.scene;
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

function quaternionFromArray(THREE, values) {
  return new THREE.Quaternion(values[0], values[1], values[2], values[3]).normalize();
}

function quaternionToArray(quaternion) {
  return quaternion.toArray().map((value) => Number(value.toFixed(6)));
}

function vectorLength(axis) {
  return Math.hypot(axis[0], axis[1], axis[2]) || 1;
}

function normalizeVector(axis) {
  const length = vectorLength(axis);
  return [axis[0] / length, axis[1] / length, axis[2] / length];
}

function normalizeQuaternion(q) {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}

function multiplyQuaternion(a, b) {
  return normalizeQuaternion({
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  });
}

function axisAngle(axis, degrees) {
  const unit = normalizeVector(axis);
  const radians = degrees * Math.PI / 180;
  const half = radians / 2;
  const scale = Math.sin(half);
  return normalizeQuaternion({ x: unit[0] * scale, y: unit[1] * scale, z: unit[2] * scale, w: Math.cos(half) });
}

function eulerDelta(values) {
  const [x, y, z] = values;
  return multiplyQuaternion(multiplyQuaternion(axisAngle([1, 0, 0], x), axisAngle([0, 1, 0], y)), axisAngle([0, 0, 1], z));
}

function roundedQuaternion(q) {
  const next = normalizeQuaternion(q);
  return [next.x, next.y, next.z, next.w].map((value) => Number(value.toFixed(6)));
}

function rotateVectorByQuaternion(axis, q) {
  const vector = { x: axis[0], y: axis[1], z: axis[2] };
  const qVector = { x: q.x, y: q.y, z: q.z };
  const uv = {
    x: qVector.y * vector.z - qVector.z * vector.y,
    y: qVector.z * vector.x - qVector.x * vector.z,
    z: qVector.x * vector.y - qVector.y * vector.x,
  };
  const uuv = {
    x: qVector.y * uv.z - qVector.z * uv.y,
    y: qVector.z * uv.x - qVector.x * uv.z,
    z: qVector.x * uv.y - qVector.y * uv.x,
  };
  return normalizeVector([
    vector.x + 2 * (q.w * uv.x + uuv.x),
    vector.y + 2 * (q.w * uv.y + uuv.y),
    vector.z + 2 * (q.w * uv.z + uuv.z),
  ]);
}

const saberGripQuaternion = eulerDelta(SABER_GRIP_LOCAL.rotationDeg);
const rightHandSaberAxisLocal = rotateVectorByQuaternion(SABRE_REVIEW_LOCAL_AXIS, saberGripQuaternion);

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
    const name = track.name.replace(/\.(position|quaternion|scale)$/, '');
    const node = find(root, name);
    if (!node) continue;
    if (track.name.endsWith('.quaternion')) node.quaternion.copy(sampleQuaternionTrack(THREE, track, time));
    else if (track.name.endsWith('.position')) node.position.copy(sampleVectorTrack(THREE, track, time));
    else if (track.name.endsWith('.scale')) node.scale.copy(sampleVectorTrack(THREE, track, time));
  }
  root.updateMatrixWorld(true);
}

function applyPoseBones(THREE, root, bones) {
  for (const [name, values] of Object.entries(bones || {})) {
    const bone = root.getObjectByName(name);
    if (bone) bone.quaternion.copy(quaternionFromArray(THREE, values));
  }
  root.updateMatrixWorld(true);
}

function localAxisVector(THREE, axisName) {
  if (axisName === 'x') return new THREE.Vector3(1, 0, 0);
  if (axisName === 'y') return new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3(0, 0, 1);
}

function setupMeshyFpvCamera(THREE, meshyRoot) {
  const [width, height] = viewport;
  const camera = new THREE.PerspectiveCamera(meshyFpvCamera.fov, width / height, meshyFpvCamera.near, meshyFpvCamera.far);
  const anchor = find(meshyRoot, meshyFpvCamera.anchor) || find(meshyRoot, meshyFpvCamera.fallbackAnchor);
  if (!anchor) throw new Error('missing Meshy FPV camera anchor');
  meshyRoot.updateMatrixWorld(true);
  const anchorPosition = anchor.getWorldPosition(new THREE.Vector3());
  const anchorQuaternion = anchor.getWorldQuaternion(new THREE.Quaternion());
  const forward = localAxisVector(THREE, meshyFpvCamera.forwardAxis).applyQuaternion(anchorQuaternion).normalize();
  const position = anchorPosition.clone()
    .add(forward.clone().multiplyScalar(meshyFpvCamera.headForwardOffset))
    .add(new THREE.Vector3(0, meshyFpvCamera.headCameraYOffset, 0));
  const target = anchorPosition.clone()
    .add(forward.clone().multiplyScalar(meshyFpvCamera.lookForward))
    .add(new THREE.Vector3(0, meshyFpvCamera.lookVertical, 0));
  camera.position.copy(position);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

function setupFpsCamera(THREE, fpsScene) {
  const [width, height] = viewport;
  const cameraBone = requireNode(fpsScene, 'Camera');
  const camera = new THREE.PerspectiveCamera(fpsCameraFov, width / height, 0.055, 80);
  camera.position.copy(cameraBone.getWorldPosition(new THREE.Vector3()));
  camera.quaternion.copy(cameraBone.getWorldQuaternion(new THREE.Quaternion()));
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

function sabreTipLocal(THREE, sabreRoot) {
  const axis = new THREE.Vector3(...SABRE_REVIEW_LOCAL_AXIS).normalize();
  const box = localBoundsForObject(THREE, sabreRoot);
  const corners = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    }
  }
  corners.sort((a, b) => a.dot(axis) - b.dot(axis));
  return corners[0].clone();
}

function attachSabre(THREE, meshyRoot, sabreRoot) {
  const rightHand = requireNode(meshyRoot, 'RightHand');
  const grip = new THREE.Bone();
  grip.name = 'SaberGrip';
  grip.position.fromArray(SABER_GRIP_LOCAL.position);
  grip.rotation.set(
    THREE.MathUtils.degToRad(SABER_GRIP_LOCAL.rotationDeg[0]),
    THREE.MathUtils.degToRad(SABER_GRIP_LOCAL.rotationDeg[1]),
    THREE.MathUtils.degToRad(SABER_GRIP_LOCAL.rotationDeg[2])
  );
  grip.scale.fromArray(SABER_GRIP_LOCAL.scale);
  rightHand.add(grip);
  sabreRoot.position.set(0, 0, 0);
  sabreRoot.quaternion.identity();
  sabreRoot.scale.set(1, 1, 1);
  grip.add(sabreRoot);
  meshyRoot.updateMatrixWorld(true);
  return grip;
}

function screenArray(vector) {
  return [Number(vector.x.toFixed(3)), Number(vector.y.toFixed(3))];
}

function deltaArray(a, b) {
  return [Number((a.x - b.x).toFixed(3)), Number((a.y - b.y).toFixed(3))];
}

function midpoint(THREE, a, b) {
  return a.clone().add(b).multiplyScalar(0.5);
}

function applyChoreographyFrame(frame) {
  const key = choreographyKeys[frame.label];
  if (!key) return cloneFrame(frame);
  const next = cloneFrame(frame);
  const readyBones = BASE_ATTACK1.frames[0].bones;
  next.bones = JSON.parse(JSON.stringify(readyBones));
  for (const [name, values] of Object.entries(key.deltas || {})) {
    if (!next.bones[name]) throw new Error(`choreography delta targets missing Ready bone ${name}`);
    const base = {
      x: next.bones[name][0],
      y: next.bones[name][1],
      z: next.bones[name][2],
      w: next.bones[name][3],
    };
    next.bones[name] = roundedQuaternion(multiplyQuaternion(base, eulerDelta(values)));
  }
  if (Number.isFinite(key.rightHandTwistDeg) && key.rightHandTwistDeg !== 0) {
    const base = {
      x: next.bones.RightHand[0],
      y: next.bones.RightHand[1],
      z: next.bones.RightHand[2],
      w: next.bones.RightHand[3],
    };
    next.bones.RightHand = roundedQuaternion(multiplyQuaternion(base, axisAngle(rightHandSaberAxisLocal, key.rightHandTwistDeg)));
  }
  return next;
}

function makeMeshyProbe(THREE, meshyRoot, grip, sabreRoot, tipLocal) {
  return () => {
    meshyRoot.updateMatrixWorld(true);
    const camera = setupMeshyFpvCamera(THREE, meshyRoot);
    const rightShoulderJointWorld = requireNode(meshyRoot, 'RightArm').getWorldPosition(new THREE.Vector3());
    const rightForeArmWorld = requireNode(meshyRoot, 'RightForeArm').getWorldPosition(new THREE.Vector3());
    const rightShoulderWorld = midpoint(THREE, rightShoulderJointWorld, rightForeArmWorld);
    const rightHandWorld = requireNode(meshyRoot, 'RightHand').getWorldPosition(new THREE.Vector3());
    const hiltWorld = grip.getWorldPosition(new THREE.Vector3());
    const tipWorld = sabreRoot.localToWorld(tipLocal.clone());
    const rightShoulderScreen = projectPoint(THREE, camera, rightShoulderWorld);
    const rightHandScreen = projectPoint(THREE, camera, rightHandWorld);
    const hiltScreen = projectPoint(THREE, camera, hiltWorld);
    const tipScreen = projectPoint(THREE, camera, tipWorld);
    return {
      camera,
      rightShoulderScreen,
      rightHandScreen,
      hiltScreen,
      tipScreen,
      tipMinusHilt: tipScreen.clone().sub(hiltScreen),
    };
  };
}

function scoreBladeVector(result, desiredTipMinusHilt) {
  const desired = new result.tipMinusHilt.constructor(desiredTipMinusHilt[0], desiredTipMinusHilt[1]);
  const vectorError = result.tipMinusHilt.distanceTo(desired);
  const belowHiltPenalty = Math.max(0, result.tipMinusHilt.y) * 14;
  return vectorError + belowHiltPenalty;
}

function solveRightHandToBladeVector(THREE, rightHand, probe, desiredTipMinusHilt) {
  const start = rightHand.quaternion.clone();
  let best = start.clone();
  let bestScore = scoreBladeVector(probe(), desiredTipMinusHilt);
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
      for (const axis of axes) {
        for (const sign of [-1, 1]) {
          const delta = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(step * sign));
          rightHand.quaternion.copy(best).multiply(delta).normalize();
          rightHand.updateMatrixWorld(true);
          const score = scoreBladeVector(probe(), desiredTipMinusHilt);
          if (score + 0.001 < bestScore) {
            best = rightHand.quaternion.clone();
            bestScore = score;
            improved = true;
          }
        }
      }
    }
  }
  rightHand.quaternion.copy(best).normalize();
  rightHand.updateMatrixWorld(true);
  return {
    quaternion: best.clone(),
    score: Number(bestScore.toFixed(3)),
    rotationFromInputDeg: Number(THREE.MathUtils.radToDeg(start.angleTo(best)).toFixed(3)),
  };
}

function cloneFrame(frame) {
  return JSON.parse(JSON.stringify(frame));
}

function fpsWeaponSample(THREE, fpsScene, clip, label, time) {
  applyClipPose(THREE, fpsScene, clip, time);
  const camera = setupFpsCamera(THREE, fpsScene);
  const weapon = requireNode(fpsScene, 'WeaponR');
  const hiltWorld = weapon.getWorldPosition(new THREE.Vector3());
  const tipWorld = hiltWorld.clone().add(new THREE.Vector3(...SABRE_REVIEW_LOCAL_AXIS)
    .normalize()
    .applyQuaternion(weapon.getWorldQuaternion(new THREE.Quaternion()))
    .multiplyScalar(0.62));
  const hiltScreen = projectPoint(THREE, camera, hiltWorld);
  const tipScreen = projectPoint(THREE, camera, tipWorld);
  return {
    label,
    time,
    sourceCamera: 'FPSPlayer.Camera',
    hiltScreen: screenArray(hiltScreen),
    tipScreen: screenArray(tipScreen),
    tipMinusHilt: screenArray(tipScreen.clone().sub(hiltScreen)),
  };
}

function buildPredicateReport(entries) {
  const start = entries.find((entry) => entry.label === 'start');
  const anticipation = entries.find((entry) => entry.label === 'anticipation');
  const contact = entries.find((entry) => entry.label === 'contact');
  const failures = [];
  const add = (ok, code) => {
    if (!ok) failures.push(code);
  };
  if (!start || !anticipation || !contact) return { status: 'FAIL', failures: ['MISSING_PRIME_KEY_REPORT'] };
  add(anticipation.rightHandDeltaFromStart[0] >= predicateThresholds.anticipationHandRightPx, `ANTICIPATION_HAND_NOT_RIGHT:${anticipation.rightHandDeltaFromStart[0]}px`);
  add(anticipation.rightShoulderDeltaFromStart[0] >= predicateThresholds.anticipationShoulderRightPx, `ANTICIPATION_SHOULDER_NOT_RIGHT:${anticipation.rightShoulderDeltaFromStart[0]}px`);
  add(anticipation.rightHandDeltaFromStart[0] > Math.abs(anticipation.rightHandDeltaFromStart[1]) * predicateThresholds.horizontalMotionRatio, `ANTICIPATION_HAND_NOT_HORIZONTAL:${anticipation.rightHandDeltaFromStart}`);
  add(anticipation.tipMinusHilt[0] <= -predicateThresholds.bladeSidePx, `ANTICIPATION_BLADE_NOT_LEFT:${anticipation.tipMinusHilt[0]}px`);
  add(Math.abs(anticipation.tipMinusHilt[0]) >= Math.abs(anticipation.tipMinusHilt[1]) * predicateThresholds.bladeHorizontalRatio, `ANTICIPATION_BLADE_NOT_HORIZONTAL:${anticipation.tipMinusHilt}`);
  add(contact.tipMinusHilt[0] >= predicateThresholds.bladeSidePx, `CONTACT_BLADE_NOT_RIGHT:${contact.tipMinusHilt[0]}px`);
  add(Math.abs(contact.tipMinusHilt[0]) >= Math.abs(contact.tipMinusHilt[1]) * predicateThresholds.bladeHorizontalRatio, `CONTACT_BLADE_NOT_HORIZONTAL:${contact.tipMinusHilt}`);
  add(contact.tipMinusHilt[0] - anticipation.tipMinusHilt[0] >= predicateThresholds.contactReversePx, `CONTACT_DID_NOT_REVERSE:${contact.tipMinusHilt[0] - anticipation.tipMinusHilt[0]}px`);
  add(anticipation.rightHandScreen[0] - contact.rightHandScreen[0] >= predicateThresholds.contactHandLeftPx, `CONTACT_HAND_NOT_LEFT_FROM_ANTICIPATION:${anticipation.rightHandScreen[0] - contact.rightHandScreen[0]}px`);
  add(anticipation.rightShoulderScreen[0] - contact.rightShoulderScreen[0] >= predicateThresholds.contactShoulderLeftPx, `CONTACT_SHOULDER_NOT_LEFT_FROM_ANTICIPATION:${anticipation.rightShoulderScreen[0] - contact.rightShoulderScreen[0]}px`);
  add(anticipation.tipMinusHilt[1] <= predicateThresholds.tipBelowTolerancePx, `ANTICIPATION_TIP_BELOW_HILT:${anticipation.tipMinusHilt[1]}px`);
  add(contact.tipMinusHilt[1] <= predicateThresholds.tipBelowTolerancePx, `CONTACT_TIP_BELOW_HILT:${contact.tipMinusHilt[1]}px`);
  for (const entry of entries) {
    if ((entry.label === 'anticipation' || entry.label === 'contact') && entry.rightHandRotationFromInputDeg > predicateThresholds.extremeRotationDeg) {
      failures.push(`EXTREME_RIGHT_HAND_ROTATION:${entry.label}:${entry.rightHandRotationFromInputDeg}deg`);
    }
  }
  return {
    status: failures.length ? 'FAIL' : 'PASS',
    failures,
    thresholds: predicateThresholds,
  };
}

async function main() {
  ensureBrowserShim();
  const sandbox = ensureThreeSandbox();
  const THREE = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'build', 'three.module.js')).href);
  const { GLTFLoader } = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js')).href);
  const fps = await loadGltf(THREE, GLTFLoader, fpsPath);
  const clip = fps.animations.find((candidate) => candidate.name === sourceClipName);
  if (!clip) throw new Error(`missing FPS clip ${sourceClipName}`);
  const meshyRoot = normalizeCharacter(THREE, await loadGlbScene(THREE, GLTFLoader, meshyPath));
  const sabreRoot = await loadGlbScene(THREE, GLTFLoader, sabrePath);
  const sceneRoot = new THREE.Group();
  sceneRoot.add(meshyRoot);
  const grip = attachSabre(THREE, meshyRoot, sabreRoot);
  const rightHand = requireNode(meshyRoot, 'RightHand');
  const tipLocal = sabreTipLocal(THREE, sabreRoot);
  const probe = makeMeshyProbe(THREE, meshyRoot, grip, sabreRoot, tipLocal);
  const frames = [];
  const report = [];
  const preSolveFrames = [];
  for (const inputFrame of BASE_ATTACK1.frames) {
    const preSolveFrame = applyChoreographyFrame(inputFrame);
    const frame = cloneFrame(preSolveFrame);
    preSolveFrames.push(preSolveFrame);
    applyPoseBones(THREE, meshyRoot, frame.bones);
    const before = probe();
    const desiredTipMinusHilt = choreographyTargets[frame.label] || screenArray(before.tipMinusHilt);
    const solved = choreographyTargets[frame.label]
      ? solveRightHandToBladeVector(THREE, rightHand, probe, desiredTipMinusHilt)
      : { quaternion: quaternionFromArray(THREE, frame.bones.RightHand), score: 0, rotationFromInputDeg: 0 };
    if (choreographyTargets[frame.label]) frame.bones.RightHand = quaternionToArray(solved.quaternion);
    applyPoseBones(THREE, meshyRoot, frame.bones);
    const after = probe();
    const source = fpsWeaponSample(THREE, fps.scene, clip, frame.label, frame.time);
    const startEntry = report.find((entry) => entry.label === 'start');
    const anticipationEntry = report.find((entry) => entry.label === 'anticipation');
    const entry = {
      label: frame.label,
      time: frame.time,
      source,
      targetCamera: 'Meshy runtime FPV',
      desiredTipMinusHilt: desiredTipMinusHilt.map((value) => Number(value.toFixed(3))),
      rightShoulderScreen: screenArray(after.rightShoulderScreen),
      rightHandScreen: screenArray(after.rightHandScreen),
      hiltScreen: screenArray(after.hiltScreen),
      tipScreen: screenArray(after.tipScreen),
      tipMinusHilt: screenArray(after.tipMinusHilt),
      rightShoulderDeltaFromStart: startEntry ? deltaArray(after.rightShoulderScreen, new THREE.Vector2(...startEntry.rightShoulderScreen)) : [0, 0],
      rightHandDeltaFromStart: startEntry ? deltaArray(after.rightHandScreen, new THREE.Vector2(...startEntry.rightHandScreen)) : [0, 0],
      rightShoulderDeltaFromAnticipation: anticipationEntry ? deltaArray(after.rightShoulderScreen, new THREE.Vector2(...anticipationEntry.rightShoulderScreen)) : [0, 0],
      rightHandDeltaFromAnticipation: anticipationEntry ? deltaArray(after.rightHandScreen, new THREE.Vector2(...anticipationEntry.rightHandScreen)) : [0, 0],
      bladeVectorErrorPx: Number(after.tipMinusHilt.distanceTo(new THREE.Vector2(...desiredTipMinusHilt)).toFixed(3)),
      rightHandRotationFromInputDeg: solved.rotationFromInputDeg,
    };
    report.push(entry);
    frames.push(frame);
  }
  const failures = [];
  if (JSON.stringify(frames[0].bones) !== JSON.stringify(BASE_ATTACK1.frames[0].bones)) failures.push('START_CHANGED');
  if (JSON.stringify(frames.at(-1).bones) !== JSON.stringify(BASE_ATTACK1.frames.at(-1).bones)) failures.push('END_CHANGED');
  for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
    for (const [boneName, values] of Object.entries(frames[frameIndex].bones)) {
      if (boneName === 'RightHand') continue;
      if (JSON.stringify(values) !== JSON.stringify(preSolveFrames[frameIndex].bones[boneName])) {
        failures.push(`NON_RIGHT_HAND_SOLVER_OUTPUT:${frames[frameIndex].label}:${boneName}`);
      }
    }
  }
  const predicates = buildPredicateReport(report);
  failures.push(...predicates.failures);
  if (failures.length) {
    console.error(JSON.stringify({ ok: false, reason: 'TIP_BASIS_CHOREOGRAPHY_FAILED', failures, report }, null, 2));
    process.exit(1);
  }
  const payload = {
    ...BASE_ATTACK1,
    label: 'Attack1 tip-basis candidate 2',
    source: {
      ...BASE_ATTACK1.source,
      keyCount: frames.length,
      method: 'meshy-authored-fpv-tip-basis',
      baseCandidate: 'attack1-candidate-1',
      retargetedBones: [],
      authoredBones: ['RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm', 'LeftHand'],
      tipBasis: {
        sourceCamera: 'FPSPlayer.Camera',
        sourceSocket: 'WeaponR',
        targetCamera: 'Meshy runtime FPV',
        viewport,
        allowedOutput: 'RightHand quaternion only',
        solverAuthoredBones: ['RightHand'],
        armPathSource: 'Ready plus explicit prime-key choreography deltas; RightHand solver runs after that path is authored.',
        tipLocalPoint: tipLocal.toArray().map((value) => Number(value.toFixed(6))),
        choreographyTargets,
      },
    },
    guardReport: {
      ...BASE_ATTACK1.guardReport,
      tipBasis: {
        status: 'PASS',
        rule: 'Projected Meshy FPV choreography must read as rightward anticipation with left horizontal blade and reversed right-pointing contact. Metrics are a write gate only, not visual acceptance.',
        predicates,
        report,
      },
    },
    frames,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `export const ATTACK1_TIP_BASIS_SEQUENCE = ${JSON.stringify(payload, null, 2)};\n`);
  console.log(JSON.stringify({
    ok: true,
    wrote: path.relative(projectRoot, outputPath),
    candidate: 'attack1-tip-basis-2',
    report,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

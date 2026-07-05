globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });

import fs from 'node:fs/promises';
import * as THREE from '../vendor/three/build/three.module.js';
import { GLTFLoader } from '../vendor/three/examples/jsm/loaders/GLTFLoader.js';
import { READY_POSE_PRESET } from '../src/ready-pose.js';

const ASSETS = {
  meshy: './public/assets/meshy/meshy_apose_walking_with_skin.glb',
  sabre: './public/assets/meshy/meshy_real_sabre.glb',
};
const SABER_GRIP_LOCAL = {
  position: [8.52296, 28.41254, -24.44467],
  rotationDeg: [32.35, 74.24, -174.11],
  scale: [46.62859, 46.62859, 46.62856],
};
const SABRE_MODEL_REST = {
  position: [-0.39454, 0.71404, 0.32817],
  rotationDeg: [160.077, 83.685, -135.981],
  scale: 0.48,
};
const ASPECTS = [
  { name: 'portrait', value: 9 / 16 },
  { name: 'landscape', value: 16 / 9 },
];

const loader = new GLTFLoader();

async function loadGlb(file) {
  const buffer = await fs.readFile(file);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, '', (gltf) => resolve(gltf.scene), reject);
  });
}

function normalizeCharacter(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  object.position.sub(center);
  object.position.y += size.y * 0.5;
  object.scale.multiplyScalar(1.75 / Math.max(0.001, size.y));
  object.updateMatrixWorld(true);
  return object;
}

function prepareSabre(object) {
  object.position.fromArray(SABRE_MODEL_REST.position);
  object.rotation.set(
    THREE.MathUtils.degToRad(SABRE_MODEL_REST.rotationDeg[0]),
    THREE.MathUtils.degToRad(SABRE_MODEL_REST.rotationDeg[1]),
    THREE.MathUtils.degToRad(SABRE_MODEL_REST.rotationDeg[2])
  );
  object.scale.setScalar(SABRE_MODEL_REST.scale);
  object.updateMatrixWorld(true);
  return object;
}

function findBone(object, name) {
  const bone = object?.getObjectByName(name);
  if (!bone) throw new Error(`missing bone: ${name}`);
  return bone;
}

function quaternionFromArray(values) {
  return new THREE.Quaternion(values[0], values[1], values[2], values[3]).normalize();
}

function applyReadyPose(meshyRoot) {
  for (const [name, values] of Object.entries(READY_POSE_PRESET.bones || {})) {
    const bone = meshyRoot.getObjectByName(name);
    if (bone) bone.quaternion.copy(quaternionFromArray(values));
  }
  meshyRoot.updateMatrixWorld(true);
}

function attachSabre(meshyRoot, sabreRoot) {
  const rightHand = findBone(meshyRoot, 'RightHand');
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

function worldPosition(object) {
  return object.getWorldPosition(new THREE.Vector3());
}

function worldQuaternion(object) {
  return object.getWorldQuaternion(new THREE.Quaternion());
}

function axisVector(axis) {
  if (axis === '-z') return new THREE.Vector3(0, 0, -1);
  if (axis === 'x') return new THREE.Vector3(1, 0, 0);
  if (axis === '-x') return new THREE.Vector3(-1, 0, 0);
  return new THREE.Vector3(0, 0, 1);
}

function boxCorners(box) {
  const points = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) points.push(new THREE.Vector3(x, y, z));
    }
  }
  return points;
}

function projected(camera, point) {
  const ndc = point.clone().project(camera);
  return {
    x: ndc.x,
    y: ndc.y,
    z: ndc.z,
    inside: Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z >= -1 && ndc.z <= 1,
    central: Math.abs(ndc.x) <= 0.42 && Math.abs(ndc.y) <= 0.52 && ndc.z >= -1 && ndc.z <= 1,
  };
}

function frameCandidate({ anchorPosition, anchorQuaternion, config, targetMode, handCenter, aspect }) {
  const forward = axisVector(config.forwardAxis).applyQuaternion(anchorQuaternion).normalize();
  const camera = new THREE.PerspectiveCamera(config.fov, aspect.value, config.near, 80);
  camera.position.copy(anchorPosition)
    .add(forward.clone().multiplyScalar(config.headForwardOffset))
    .add(new THREE.Vector3(0, config.headCameraYOffset, 0));
  const target = targetMode === 'hands'
    ? handCenter.clone().add(forward.clone().multiplyScalar(config.lookForward * 0.2))
    : anchorPosition.clone()
      .add(forward.clone().multiplyScalar(config.lookForward))
      .add(new THREE.Vector3(0, config.lookVertical, 0));
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return camera;
}

function scoreCandidate(camera, points) {
  const hand = points.hands.map((point) => projected(camera, point));
  const sabre = points.sabre.map((point) => projected(camera, point));
  const chest = points.chest.map((point) => projected(camera, point));
  const handsInside = hand.filter((point) => point.inside).length;
  const sabreInside = sabre.filter((point) => point.inside).length;
  const chestCentral = chest.filter((point) => point.central).length;
  const chestInside = chest.filter((point) => point.inside).length;
  return {
    handsInside,
    sabreInside,
    chestCentral,
    chestInside,
    pass: handsInside >= 2 && sabreInside >= 2 && chestCentral === 0,
  };
}

function configFromCandidate(forwardAxis, headForwardOffset, headCameraYOffset, lookForward, lookVertical, fov, near) {
  return { forwardAxis, headForwardOffset, headCameraYOffset, lookForward, lookVertical, fov, near };
}

function fixed(value, places = 5) {
  return Number(value.toFixed(places));
}

const root = new THREE.Group();
const [meshy, sabre] = await Promise.all([loadGlb(ASSETS.meshy), loadGlb(ASSETS.sabre)]);
const meshyRoot = normalizeCharacter(meshy);
const sabreRoot = prepareSabre(sabre);
root.add(meshyRoot, sabreRoot);
applyReadyPose(meshyRoot);
const saberGrip = attachSabre(meshyRoot, sabreRoot);
root.updateMatrixWorld(true);

const head = findBone(meshyRoot, 'Head');
const rightHand = findBone(meshyRoot, 'RightHand');
const leftHand = findBone(meshyRoot, 'LeftHand');
const anchorPosition = worldPosition(head);
const anchorQuaternion = worldQuaternion(head);
const handCenter = worldPosition(rightHand).add(worldPosition(leftHand)).multiplyScalar(0.5);
const sabreBox = new THREE.Box3().setFromObject(sabreRoot);
const points = {
  hands: [worldPosition(rightHand), worldPosition(leftHand), worldPosition(saberGrip)],
  sabre: [sabreBox.getCenter(new THREE.Vector3()), ...boxCorners(sabreBox)],
  chest: ['Hips', 'Spine', 'Spine01', 'Spine02', 'neck'].map((name) => worldPosition(findBone(meshyRoot, name))),
};
const torsoBox = new THREE.Box3().setFromObject(meshyRoot);

let best = null;
for (const forwardAxis of ['z', '-z']) {
  for (const targetMode of ['head-forward', 'hands']) {
    for (const headForwardOffset of [0.08, 0.14, 0.2, 0.28, 0.36, 0.46, 0.58, 0.72, 0.9]) {
      for (const headCameraYOffset of [-0.16, -0.08, 0, 0.08, 0.16, 0.24]) {
        for (const lookForward of [0.4, 0.7, 1.0, 1.35, 1.7, 2.1]) {
          for (const lookVertical of [-0.25, -0.12, 0, 0.12]) {
            for (const fov of [72, 82, 92, 102, 112]) {
              const config = configFromCandidate(forwardAxis, headForwardOffset, headCameraYOffset, lookForward, lookVertical, fov, 0.035);
              const aspectReports = ASPECTS.map((aspect) => {
                const camera = frameCandidate({ anchorPosition, anchorQuaternion, config, targetMode, handCenter, aspect });
                return { aspect: aspect.name, ...scoreCandidate(camera, points) };
              });
              const pass = aspectReports.every((report) => report.pass);
              const score = aspectReports.reduce((sum, report) => (
                sum + report.handsInside * 20 + report.sabreInside * 3 - report.chestCentral * 60 - report.chestInside * 6
              ), 0) - Math.abs(fov - 92) * 0.2 - headForwardOffset * 2;
              const entry = { config, targetMode, pass, score, aspectReports };
              if (!best || (entry.pass && !best.pass) || (entry.pass === best.pass && entry.score > best.score)) best = entry;
            }
          }
        }
      }
    }
  }
}

const solved = best.config;
const report = {
  schema: 'pose-lab-v2-fpv-camera-solver-v1',
  pass: best.pass,
  targetMode: best.targetMode,
  config: {
    cameraMode: 'head-forward',
    anchor: 'Head',
    fallbackAnchor: 'Spine02',
    forwardAxis: solved.forwardAxis,
    headForwardOffset: fixed(solved.headForwardOffset, 3),
    headCameraYOffset: fixed(solved.headCameraYOffset, 3),
    lookForward: fixed(solved.lookForward, 3),
    lookVertical: fixed(solved.lookVertical, 3),
    fov: solved.fov,
    near: solved.near,
  },
  aspectReports: best.aspectReports,
  geometry: {
    headWorld: anchorPosition.toArray().map((value) => fixed(value)),
    rightHandWorld: points.hands[0].toArray().map((value) => fixed(value)),
    leftHandWorld: points.hands[1].toArray().map((value) => fixed(value)),
    saberGripWorld: points.hands[2].toArray().map((value) => fixed(value)),
    torsoBounds: {
      min: torsoBox.min.toArray().map((value) => fixed(value)),
      max: torsoBox.max.toArray().map((value) => fixed(value)),
    },
  },
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(1);

#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ATTACK1_POSE_SEQUENCE as BASE_ATTACK1 } from '../src/review-candidates/attack1-candidate-1.js';
import { SABER_GRIP_LOCAL, SABRE_REVIEW_LOCAL_AXIS, REVIEW_CAMERA_CONTRACT } from '../src/review-constants.js';
import { buildFpsAttack1Reference } from './fps-attack1-reference.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(projectRoot, 'src', 'review-candidates', 'attack1-tip-match-1.js');
const meshyPath = path.join(projectRoot, 'public', 'assets', 'meshy', 'meshy_apose_walking_with_skin.glb');
const sabrePath = path.join(projectRoot, 'public', 'assets', 'meshy', 'meshy_real_sabre.glb');
const pixelThreshold = 22;
const extremeRotationDeg = 145;

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
  fs.rmSync(sandbox, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(threeDir), { recursive: true });
  execFileSync('cp', ['-R', path.join(projectRoot, 'vendor', 'three'), threeDir]);
  return sandbox;
}

function arrayBuffer(file) {
  const buffer = fs.readFileSync(file);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function loadGlb(THREE, GLTFLoader, file) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer(file), path.dirname(file) + '/', (gltf) => resolve(gltf.scene), reject);
  });
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
  return object;
}

function quaternionFromArray(THREE, values) {
  return new THREE.Quaternion(values[0], values[1], values[2], values[3]).normalize();
}

function quaternionToArray(quaternion) {
  return quaternion.toArray().map((value) => Number(value.toFixed(6)));
}

function applyPoseBones(THREE, root, bones) {
  for (const [name, values] of Object.entries(bones || {})) {
    const bone = root.getObjectByName(name);
    if (bone) bone.quaternion.copy(quaternionFromArray(THREE, values));
  }
  root.updateMatrixWorld(true);
}

function setupCamera(THREE) {
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

function projectPoint(THREE, camera, point) {
  const [width, height] = REVIEW_CAMERA_CONTRACT.viewport;
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

function sabreTipLocalCandidates(THREE, sabreRoot) {
  const axis = new THREE.Vector3(...SABRE_REVIEW_LOCAL_AXIS).normalize();
  const box = localBoundsForObject(THREE, sabreRoot);
  const values = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];
  values.sort((a, b) => b.dot(axis) - a.dot(axis));
  return [
    axis.clone().multiplyScalar(values[0].dot(axis)),
    axis.clone().multiplyScalar(values.at(-1).dot(axis)),
  ];
}

function attachSabre(THREE, meshyRoot, sabreRoot) {
  const rightHand = meshyRoot.getObjectByName('RightHand');
  if (!rightHand) throw new Error('missing Meshy RightHand');
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

function makeProbe(THREE, camera, meshyRoot, grip, sabreRoot, tipLocal) {
  return () => {
    meshyRoot.updateMatrixWorld(true);
    const hiltWorld = grip.getWorldPosition(new THREE.Vector3());
    const tipWorld = sabreRoot.localToWorld(tipLocal.clone());
    const hiltScreen = projectPoint(THREE, camera, hiltWorld);
    const tipScreen = projectPoint(THREE, camera, tipWorld);
    return {
      hiltWorld,
      tipWorld,
      hiltScreen,
      tipScreen,
      tipMinusHilt: tipScreen.clone().sub(hiltScreen),
    };
  };
}

function screenArray(vector) {
  return [Number(vector.x.toFixed(3)), Number(vector.y.toFixed(3))];
}

function solveRightHandToTip(THREE, rightHand, probe, targetScreen) {
  const start = rightHand.quaternion.clone();
  let best = start.clone();
  let bestScore = scoreProbe(probe(), targetScreen);
  const axes = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ];
  for (const step of [48, 24, 12, 6, 3, 1.5, 0.75, 0.35]) {
    let improved = true;
    let guard = 0;
    while (improved && guard < 16) {
      improved = false;
      guard += 1;
      for (const axis of axes) {
        for (const sign of [-1, 1]) {
          const delta = new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(step * sign));
          rightHand.quaternion.copy(best).multiply(delta).normalize();
          rightHand.updateMatrixWorld(true);
          const score = scoreProbe(probe(), targetScreen);
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
    score: bestScore,
    rotationFromInputDeg: Number(THREE.MathUtils.radToDeg(start.angleTo(best)).toFixed(3)),
  };
}

function scoreProbe(result, targetScreen) {
  const distance = result.tipScreen.distanceTo(targetScreen);
  const belowHiltPenalty = Math.max(0, result.tipScreen.y - result.hiltScreen.y) * 12;
  return distance + belowHiltPenalty;
}

function cloneFrame(frame) {
  return JSON.parse(JSON.stringify(frame));
}

async function main() {
  ensureBrowserShim();
  const sandbox = ensureThreeSandbox();
  const THREE = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'build', 'three.module.js')).href);
  const { GLTFLoader } = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js')).href);
  const fpsReference = await buildFpsAttack1Reference({ writeFiles: true });
  const camera = setupCamera(THREE);
  const meshyRoot = normalizeCharacter(THREE, await loadGlb(THREE, GLTFLoader, meshyPath));
  const sabreRoot = await loadGlb(THREE, GLTFLoader, sabrePath);
  const sceneRoot = new THREE.Group();
  sceneRoot.add(meshyRoot);
  const grip = attachSabre(THREE, meshyRoot, sabreRoot);
  const rightHand = meshyRoot.getObjectByName('RightHand');
  const tipCandidates = sabreTipLocalCandidates(THREE, sabreRoot);
  applyPoseBones(THREE, meshyRoot, BASE_ATTACK1.frames[0].bones);
  const candidateProbes = tipCandidates.map((candidate) => makeProbe(THREE, camera, meshyRoot, grip, sabreRoot, candidate)());
  const tipLocal = tipCandidates[candidateProbes[1].tipScreen.y < candidateProbes[0].tipScreen.y ? 1 : 0];
  const probe = makeProbe(THREE, camera, meshyRoot, grip, sabreRoot, tipLocal);
  const referenceByLabel = Object.fromEntries(fpsReference.samples.map((sample) => [sample.label, sample]));
  const frames = [];
  const report = [];
  const failures = [];
  for (const inputFrame of BASE_ATTACK1.frames) {
    const frame = cloneFrame(inputFrame);
    applyPoseBones(THREE, meshyRoot, frame.bones);
    const before = probe();
    const reference = referenceByLabel[frame.label];
    if (!reference) throw new Error(`missing FPS reference sample for ${frame.label}`);
    const targetScreen = before.hiltScreen.clone().add(new THREE.Vector2(
      reference.weapon.tipMinusHilt[0],
      reference.weapon.tipMinusHilt[1]
    ));
    const solved = frame.label === 'start' || frame.label === 'end'
      ? { quaternion: quaternionFromArray(THREE, frame.bones.RightHand), score: before.tipScreen.distanceTo(targetScreen), rotationFromInputDeg: 0 }
      : solveRightHandToTip(THREE, rightHand, probe, targetScreen);
    if (frame.label !== 'start' && frame.label !== 'end') {
      frame.bones.RightHand = quaternionToArray(solved.quaternion);
    }
    applyPoseBones(THREE, meshyRoot, frame.bones);
    const after = probe();
    const errorPx = after.tipScreen.distanceTo(targetScreen);
    const entry = {
      label: frame.label,
      time: frame.time,
      targetTipScreen: screenArray(targetScreen),
      actualHiltScreen: screenArray(after.hiltScreen),
      actualTipScreen: screenArray(after.tipScreen),
      actualTipMinusHilt: screenArray(after.tipMinusHilt),
      errorPx: Number(errorPx.toFixed(3)),
      tipAboveOrLevelWithHilt: after.tipScreen.y <= after.hiltScreen.y + 0.5,
      rightHandRotationFromInputDeg: solved.rotationFromInputDeg,
    };
    if (frame.label !== 'start' && frame.label !== 'end' && errorPx > pixelThreshold) failures.push(`TIP_TARGET_MISS:${frame.label}:${entry.errorPx}px`);
    if (frame.label !== 'start' && frame.label !== 'end' && !entry.tipAboveOrLevelWithHilt) failures.push(`TIP_BELOW_HILT:${frame.label}`);
    if (frame.label !== 'start' && frame.label !== 'end' && solved.rotationFromInputDeg > extremeRotationDeg) failures.push(`EXTREME_RIGHT_HAND_ROTATION:${frame.label}:${solved.rotationFromInputDeg}deg`);
    report.push(entry);
    frames.push(frame);
  }
  if (JSON.stringify(frames[0].bones) !== JSON.stringify(BASE_ATTACK1.frames[0].bones)) failures.push('START_CHANGED');
  if (JSON.stringify(frames.at(-1).bones) !== JSON.stringify(BASE_ATTACK1.frames.at(-1).bones)) failures.push('END_CHANGED');
  for (let frameIndex = 0; frameIndex < frames.length; frameIndex += 1) {
    for (const [boneName, values] of Object.entries(frames[frameIndex].bones)) {
      if (boneName === 'RightHand') continue;
      if (JSON.stringify(values) !== JSON.stringify(BASE_ATTACK1.frames[frameIndex].bones[boneName])) {
        failures.push(`NON_RIGHT_HAND_CHANGED:${frames[frameIndex].label}:${boneName}`);
      }
    }
  }
  if (failures.length) {
    console.error(JSON.stringify({ ok: false, reason: 'TIP_MATCH_FAILED', failures, report }, null, 2));
    process.exit(1);
  }
  const payload = {
    ...BASE_ATTACK1,
    label: 'Attack1 tip-match candidate 1',
    source: {
      ...BASE_ATTACK1.source,
      keyCount: frames.length,
      method: 'meshy-authored-right-hand-tip-match',
      baseCandidate: 'attack1-candidate-1',
      retargetedBones: [],
      authoredBones: ['RightHand'],
      tipMatch: {
        targetSource: 'FPS WeaponR tipMinusHilt mapped onto Meshy SaberGrip hilt',
        allowedOutput: 'RightHand quaternion only',
        pixelThreshold,
        extremeRotationDeg,
        tipLocalPoint: tipLocal.toArray().map((value) => Number(value.toFixed(6))),
      },
    },
    guardReport: {
      ...BASE_ATTACK1.guardReport,
      tipMatch: {
        status: 'PASS',
        rule: 'Only Meshy RightHand rotates so the real sabre projected tip approaches FPS reference tipMinusHilt at each prime key.',
        report,
      },
    },
    frames,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `export const ATTACK1_TIP_MATCH_SEQUENCE = ${JSON.stringify(payload, null, 2)};\n`);
  console.log(JSON.stringify({
    ok: true,
    wrote: path.relative(projectRoot, outputPath),
    candidate: 'attack1-tip-match-1',
    report,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

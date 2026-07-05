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
const sourceFrameName = 'ShoulderCenter';
const targetFrameName = 'Spine02';
const weaponSocketName = 'Weapon.R';
const readyClipName = 'OneHandReady';
const attackClipName = 'OneHandAttack1';
const saberGripLocal = {
  position: [8.52296, 28.41254, -24.44467],
  rotationDeg: [32.35, 74.24, -174.11],
  scale: [46.62859, 46.62859, 46.62856],
};
const sourceAxisCandidates = {
  '+x': [1, 0, 0],
  '-x': [-1, 0, 0],
  '+y': [0, 1, 0],
  '-y': [0, -1, 0],
  '+z': [0, 0, 1],
  '-z': [0, 0, -1],
};

function ensureBrowserShim() {
  globalThis.ProgressEvent ||= class ProgressEvent {
    constructor(type, init = {}) {
      this.type = type;
      Object.assign(this, init);
    }
  };
  globalThis.window ||= { innerWidth: 1, innerHeight: 1, devicePixelRatio: 1 };
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

function mapDirectionBetweenFrames(THREE, direction, sourceFrame, targetFrame) {
  const sourceLocal = direction.clone().normalize().applyQuaternion(worldQuaternion(THREE, sourceFrame).invert()).normalize();
  return sourceLocal.applyQuaternion(worldQuaternion(THREE, targetFrame)).normalize();
}

function directionFromLocalAxis(THREE, node, axis) {
  return new THREE.Vector3(...axis).normalize().applyQuaternion(worldQuaternion(THREE, node)).normalize();
}

function angleDeg(THREE, a, b) {
  return Number((a.angleTo(b) * 180 / Math.PI).toFixed(3));
}

function vectorArray(vector) {
  return vector.toArray().map((value) => Number(value.toFixed(5)));
}

function eulerDegFromQuaternion(THREE, quaternion) {
  return new THREE.Euler().setFromQuaternion(quaternion.normalize(), 'XYZ')
    .toArray()
    .slice(0, 3)
    .map((value) => Number(THREE.MathUtils.radToDeg(value).toFixed(3)));
}

function quaternionFromArray(THREE, values) {
  return new THREE.Quaternion(values[0], values[1], values[2], values[3]).normalize();
}

function applyPoseFrame(THREE, meshyRoot, frame) {
  for (const [name, values] of Object.entries(frame.bones || {})) {
    const bone = find(meshyRoot, name);
    if (bone) bone.quaternion.copy(quaternionFromArray(THREE, values));
  }
  meshyRoot.updateMatrixWorld(true);
}

function attachSaberToRightHand(THREE, meshyRoot, sabreRoot) {
  const rightHand = requireNode(meshyRoot, 'RightHand');
  const grip = new THREE.Bone();
  grip.name = 'SaberGripDiagnostic';
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

function keyTimes(clip) {
  const track = clip.tracks.find((item) => item.name.endsWith('.quaternion') && canon(item.name.replace(/\.quaternion$/, '')) === canon(weaponSocketName));
  if (!track) throw new Error(`missing ${weaponSocketName} quaternion track in ${clip.name}`);
  return [...track.times].map((time) => Number(time.toFixed(6)));
}

async function main() {
  ensureBrowserShim();
  const sandbox = ensureThreeSandbox();
  const THREE = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'build', 'three.module.js')).href);
  const { GLTFLoader } = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js')).href);
  const loadGlb = (file) => new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer(file), path.dirname(file) + '/', resolve, reject);
  });
  const [{ ATTACK1_POSE_SEQUENCE }, { READY_POSE_PRESET }, fps, meshy, sabre] = await Promise.all([
    import(pathToFileURL(path.join(projectRoot, 'src', 'attack1-pose.js')).href + `?t=${Date.now()}`),
    import(pathToFileURL(path.join(projectRoot, 'src', 'ready-pose.js')).href + `?t=${Date.now()}`),
    loadGlb(fpsPath),
    loadGlb(meshyPath),
    loadGlb(sabrePath),
  ]);
  const fpsRoot = fps.scene;
  const meshyRoot = meshy.scene;
  const sabreRoot = sabre.scene;
  const readyClip = fps.animations.find((clip) => clip.name === readyClipName);
  const attackClip = fps.animations.find((clip) => clip.name === attackClipName);
  if (!readyClip || !attackClip) throw new Error('missing required FPS clips');
  attachSaberToRightHand(THREE, meshyRoot, sabreRoot);
  const sourceFrame = requireNode(fpsRoot, sourceFrameName);
  const targetFrame = requireNode(meshyRoot, targetFrameName);
  const weaponSocket = requireNode(fpsRoot, weaponSocketName);
  const sabreAxis = dominantLocalAxis(THREE, sabreRoot);

  const readyFrame = { bones: READY_POSE_PRESET.bones };
  applyPoseFrame(THREE, meshyRoot, readyFrame);
  applyClipPose(THREE, fpsRoot, readyClip, readyClip.duration);
  const readySabreDirection = sabreAxis.clone().applyQuaternion(worldQuaternion(THREE, sabreRoot)).normalize();
  const axisCalibration = Object.entries(sourceAxisCandidates)
    .map(([name, axis]) => {
      const sourceDirection = directionFromLocalAxis(THREE, weaponSocket, axis);
      const mappedDirection = mapDirectionBetweenFrames(THREE, sourceDirection, sourceFrame, targetFrame);
      return {
        axis: name,
        readyAngleDeg: angleDeg(THREE, mappedDirection, readySabreDirection),
      };
    })
    .sort((a, b) => a.readyAngleDeg - b.readyAngleDeg);
  const sourceAxisName = axisCalibration[0].axis;
  const sourceAxis = sourceAxisCandidates[sourceAxisName];
  const readyMappedSourceDirection = mapDirectionBetweenFrames(
    THREE,
    directionFromLocalAxis(THREE, weaponSocket, sourceAxis),
    sourceFrame,
    targetFrame
  );
  const times = keyTimes(attackClip);
  const samples = [];
  for (let index = 0; index < times.length; index += 1) {
    const time = times[index];
    const frame = ATTACK1_POSE_SEQUENCE.frames.reduce((best, candidate) => (
      Math.abs(candidate.time - time) < Math.abs(best.time - time) ? candidate : best
    ), ATTACK1_POSE_SEQUENCE.frames[0]);
    applyClipPose(THREE, fpsRoot, attackClip, time);
    applyPoseFrame(THREE, meshyRoot, frame);
    const sourceDirection = directionFromLocalAxis(THREE, weaponSocket, sourceAxis);
    const mappedSourceDirection = mapDirectionBetweenFrames(THREE, sourceDirection, sourceFrame, targetFrame);
    const endpointReadyAnchor = index === 0 || index === times.length - 1;
    const expectedDirection = endpointReadyAnchor
      ? readySabreDirection.clone()
      : readySabreDirection.clone()
        .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(readyMappedSourceDirection, mappedSourceDirection).normalize())
        .normalize();
    const actualDirection = sabreAxis.clone().applyQuaternion(worldQuaternion(THREE, sabreRoot)).normalize();
    const diagnosticPinQuaternion = new THREE.Quaternion().setFromUnitVectors(actualDirection, expectedDirection).normalize();
    samples.push({
      time,
      frameTime: frame.time,
      angleDeg: angleDeg(THREE, expectedDirection, actualDirection),
      expectedDirection: vectorArray(expectedDirection),
      actualDirection: vectorArray(actualDirection),
      diagnosticPinCorrectionEulerDeg: eulerDegFromQuaternion(THREE, diagnosticPinQuaternion),
      endpointReadyAnchor,
    });
  }
  const sortedByError = [...samples].sort((a, b) => b.angleDeg - a.angleDeg);
  const readyBestAngleDeg = axisCalibration[0]?.readyAngleDeg ?? null;
  const report = {
    schema: 'pose-lab-v2-blade-transform-diagnostic-v1',
    diagnosticOnly: true,
    fixPolicy: 'do not IK-correct runtime; use this to fix animation import/bake transform',
    source: {
      fps: path.relative(projectRoot, fpsPath),
      meshy: path.relative(projectRoot, meshyPath),
      sabre: path.relative(projectRoot, sabrePath),
      readyClip: readyClipName,
      attackClip: attackClipName,
      weaponSocket: weaponSocketName,
    },
    runtimeTransformUnderTest: {
      parent: 'RightHand -> SaberGrip -> sabre mesh',
      saberGripLocal,
      sabreLocal: { position: [0, 0, 0], rotationDeg: [0, 0, 0], scale: [1, 1, 1] },
      sabreDominantLocalAxis: vectorArray(sabreAxis),
    },
    sourceAxisCalibration: axisCalibration,
    selectedSourceAxis: sourceAxisName,
    summary: {
      sampleCount: samples.length,
      readyBestAngleDeg,
      deprecatedWeaponDirectionCheck: {
        pass: (sortedByError[0]?.angleDeg || 0) <= 12,
        maxAngleDeg: sortedByError[0]?.angleDeg,
        meanAngleDeg: Number((samples.reduce((sum, sample) => sum + sample.angleDeg, 0) / samples.length).toFixed(3)),
        diagnosis: 'deprecated: this check compared Attack1 to the old single-bone Weapon.R direction override and could be false-green while the screenshot was human-red',
      },
      holisticImportPass: ATTACK1_POSE_SEQUENCE.source?.readyAnchoredWeaponWristInterpretation?.skipped === true
        && ATTACK1_POSE_SEQUENCE.source?.readyEndpointContract?.firstMatchesReady === true
        && ATTACK1_POSE_SEQUENCE.source?.readyEndpointContract?.lastMatchesReady === true
        && (ATTACK1_POSE_SEQUENCE.source?.signatureWristTwist?.bakedRightHandRotationTravelDeg || 0) > 120
        && (ATTACK1_POSE_SEQUENCE.source?.signatureWristTwist?.bakedRightForeArmRotationTravelDeg || 0) > 120,
      holisticImportDiagnosis: 'Attack1 must be judged by whole-arm projected landmark motion, baked wrist/forearm roll, and cloud visual read, not by matching the deprecated Weapon.R direction override',
      method: ATTACK1_POSE_SEQUENCE.source?.method || null,
      signatureWristTwist: ATTACK1_POSE_SEQUENCE.source?.signatureWristTwist || null,
      firstAngleDeg: samples[0]?.angleDeg,
      lastAngleDeg: samples[samples.length - 1]?.angleDeg,
      worstSamples: sortedByError.slice(0, 6),
    },
    samples,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.summary.holisticImportPass) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

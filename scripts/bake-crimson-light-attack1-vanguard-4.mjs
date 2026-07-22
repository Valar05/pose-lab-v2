#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CRIMSON_SABER_GRIP_LOCAL, CRIMSON_SWORD_LOCAL, CRIMSON_SWORD_REVIEW_LOCAL_AXIS } from '../src/review-constants.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const crimsonPath = path.join(projectRoot, 'public/assets/crimson/crimson_plume_knight_rigged_pbr.glb');
const swordPath = path.join(projectRoot, 'public/assets/crimson/arborblade_sword.glb');
const vanguardPath = path.join(projectRoot, 'public/assets/vanguard/vanguard_rigged_animations.glb');
const referencePath = path.join(projectRoot, 'public/assets/crimson/vanguard_swordattack1_reference.json');
const baselinePath = path.join(projectRoot, 'public/assets/crimson/crimson_light_attack1_weapon_baseline.json');
const sharedRestPath = path.join(projectRoot, 'public/assets/crimson/crimson_shared_rest_baseline.json');
const outputPath = path.join(projectRoot, 'src', 'review-candidates', 'crimson-combat-ready-vanguard-frame0-1.js');
const candidateId = 'crimson-combat-ready-vanguard-frame0-1';
const exportName = 'CRIMSON_COMBAT_READY_VANGUARD_FRAME0_1_SEQUENCE';
const frameLabels = ['start'];
const primeKeys = { start: 0 };
const boneNames = [
  'Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
];
const sourceDeltaWeights = {
  Hips: 0.55, Spine02: 0.7, Spine01: 0.6, Spine: 0.55, neck: 0.35, Head: 0.35,
  LeftShoulder: 0.45, RightShoulder: 0.45,
  LeftArm: 0.45, LeftForeArm: 0.55, LeftHand: 0.55,
  RightArm: 0.45, RightForeArm: 0.6, RightHand: 0.65,
  LeftUpLeg: 0.48, LeftLeg: 0.58,
  RightUpLeg: 0.48, RightLeg: 0.58,
};
const chains = [
  { name: 'rightArm', bones: ['RightArm', 'RightForeArm', 'RightHand'], sourceLimb: 'rightArm', maxError: 0.18 },
  { name: 'leftArm', bones: ['LeftArm', 'LeftForeArm', 'LeftHand'], sourceLimb: 'leftArm', maxError: 0.2 },
  { name: 'rightLeg', bones: ['RightUpLeg', 'RightLeg', 'RightFoot'], sourceLimb: 'rightLeg', maxError: 0.22 },
  { name: 'leftLeg', bones: ['LeftUpLeg', 'LeftLeg', 'LeftFoot'], sourceLimb: 'leftLeg', maxError: 0.22 },
];
const thresholds = {
  maxContactBladeAngleDeg: 9,
  maxChainError: 0.24,
  maxFootOrientationErrorDeg: 0.25,
  maxContactHeightError: 0.015,
  minSoleUpDot: 0.999,
  bodyTravelDeg: {
    Hips: 18, Spine02: 24, Spine: 12,
    LeftArm: 32, LeftForeArm: 22, LeftHand: 16,
    RightArm: 48, RightForeArm: 40, RightHand: 42,
    LeftUpLeg: 7, LeftLeg: 5,
    RightUpLeg: 7, RightLeg: 5,
  },
};

function ensureBrowserShim() {
  globalThis.ProgressEvent ||= class ProgressEvent { constructor(type, init = {}) { this.type = type; Object.assign(this, init); } };
  globalThis.window ||= { innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1 };
  globalThis.self ||= globalThis;
  globalThis.document ||= { createElementNS() { const listeners = new Map(); return { style: {}, width: 1, height: 1, addEventListener(t, f) { listeners.set(t, f); }, removeEventListener(t) { listeners.delete(t); }, set src(v) { this._src = v; setTimeout(() => listeners.get('load')?.({ type: 'load' }), 0); }, get src() { return this._src || ''; } }; } };
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
function arrayBuffer(file) { const buffer = fs.readFileSync(file); return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength); }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
async function loadGltf(GLTFLoader, file) { return new Promise((resolve, reject) => new GLTFLoader().parse(arrayBuffer(file), path.dirname(file) + '/', resolve, reject)); }
function canon(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function find(root, name) { const wanted = canon(name); let found = null; root.traverse((node) => { if (!found && canon(node.name) === wanted) found = node; }); return found; }
function requireNode(root, name) { const node = find(root, name); if (!node) throw new Error(`missing node ${name}`); return node; }
function normalizeCharacter(THREE, object) { const box = new THREE.Box3().setFromObject(object); const center = box.getCenter(new THREE.Vector3()); const size = box.getSize(new THREE.Vector3()); object.position.sub(center); object.position.y += size.y * 0.5; object.scale.multiplyScalar(1.75 / Math.max(0.001, size.y)); object.traverse((node) => { if (node.isMesh) node.frustumCulled = false; }); object.updateMatrixWorld(true); return object; }
function isFiniteNumber(value) { return Number.isFinite(value); }
function isFiniteArray(values) { return Array.isArray(values) && values.every(isFiniteNumber); }
function isFiniteVector3(v) { return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z); }
function assertFiniteVector3(v, label) { if (!isFiniteVector3(v)) throw new Error(`${label} is not finite: ${v.toArray().join(',')}`); return v; }
function assertFiniteQuaternion(q, label) { const values = q.toArray(); if (!values.every(isFiniteNumber)) throw new Error(`${label} quaternion is not finite: ${values.join(',')}`); return q; }
function roundedQuaternion(q) { assertFiniteQuaternion(q, 'roundedQuaternion'); return q.toArray().map((value) => Number(value.toFixed(6))); }
function vectorArray(v) { assertFiniteVector3(v, 'vectorArray'); return v.toArray().map((value) => Number(value.toFixed(5))); }
function quaternionFromArray(THREE, values) { return new THREE.Quaternion(values[0], values[1], values[2], values[3]).normalize(); }
function degToQuat(THREE, values) { return new THREE.Quaternion().setFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(values[0]), THREE.MathUtils.degToRad(values[1]), THREE.MathUtils.degToRad(values[2]), 'XYZ')).normalize(); }
function angleDeg(THREE, a, b) { return Number(THREE.MathUtils.radToDeg(a.clone().normalize().angleTo(b.clone().normalize())).toFixed(3)); }
function quatTravelDeg(THREE, a, b) { return Number(THREE.MathUtils.radToDeg(a.angleTo(b)).toFixed(3)); }
function clampQuaternionAngle(THREE, q, maxDeg) {
  const angle = 2 * Math.acos(Math.min(1, Math.max(-1, q.w)));
  if (angle <= THREE.MathUtils.degToRad(maxDeg)) return { quaternion: q, clamped: false, angleDeg: THREE.MathUtils.radToDeg(angle) };
  const axis = new THREE.Vector3(q.x, q.y, q.z);
  if (axis.lengthSq() < 1e-8) return { quaternion: new THREE.Quaternion(), clamped: false, angleDeg: 0 };
  axis.normalize();
  return { quaternion: new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(maxDeg)), clamped: true, angleDeg: THREE.MathUtils.radToDeg(angle) };
}
function slerpIdentity(THREE, q, weight) { return new THREE.Quaternion().slerp(q.clone().normalize(), Math.max(0, Math.min(1, weight))); }
function safeDirection(THREE, vector, label) {
  if (!isFiniteVector3(vector) || vector.lengthSq() < 1e-10) throw new Error(`${label} is not a usable direction`);
  return vector.clone().normalize();
}
function basisMatrix(THREE, basis, label = 'basis') {
  if (!basis || !isFiniteArray(basis.right) || !isFiniteArray(basis.up) || !isFiniteArray(basis.forward)) throw new Error(`${label} has non-finite axes`);
  const right = safeDirection(THREE, new THREE.Vector3(...basis.right), `${label}.right`);
  const up = safeDirection(THREE, new THREE.Vector3(...basis.up), `${label}.up`);
  const forward = safeDirection(THREE, new THREE.Vector3(...basis.forward), `${label}.forward`);
  return new THREE.Matrix4().makeBasis(right, up, forward);
}
function mapSourceVector(THREE, vector, sourceBasisInverse, targetBasis) {
  assertFiniteVector3(vector, 'source vector before map');
  const mapped = vector.clone().applyMatrix4(sourceBasisInverse).applyMatrix4(targetBasis);
  return assertFiniteVector3(mapped, 'mapped source vector');
}
function quaternionFromBasisMatrix(THREE, matrix, label) {
  const q = new THREE.Quaternion().setFromRotationMatrix(matrix).normalize();
  return assertFiniteQuaternion(q, label);
}
function applyWorldDeltaToBone(THREE, root, bone, worldDelta, weight, maxStepDeg) {
  const weighted = slerpIdentity(THREE, worldDelta.clone().normalize(), weight);
  const limited = clampQuaternionAngle(THREE, weighted, maxStepDeg).quaternion;
  const parentWorld = bone.parent?.getWorldQuaternion(new THREE.Quaternion()) || new THREE.Quaternion();
  const localDelta = parentWorld.clone().invert().multiply(limited).multiply(parentWorld).normalize();
  bone.quaternion.premultiply(localDelta).normalize();
  assertFiniteQuaternion(bone.quaternion, `${bone.name} after body basis delta`);
  root.updateMatrixWorld(true);
}
function attachCrimsonSword(THREE, crimsonRoot, swordRoot) {
  const rightHand = requireNode(crimsonRoot, 'RightHand');
  const grip = new THREE.Bone();
  grip.name = 'SaberGrip';
  grip.position.fromArray(CRIMSON_SABER_GRIP_LOCAL.position);
  grip.rotation.set(THREE.MathUtils.degToRad(CRIMSON_SABER_GRIP_LOCAL.rotationDeg[0]), THREE.MathUtils.degToRad(CRIMSON_SABER_GRIP_LOCAL.rotationDeg[1]), THREE.MathUtils.degToRad(CRIMSON_SABER_GRIP_LOCAL.rotationDeg[2]));
  grip.scale.fromArray(CRIMSON_SABER_GRIP_LOCAL.scale);
  rightHand.add(grip);
  swordRoot.name = 'ArborbladeSword';
  swordRoot.position.fromArray(CRIMSON_SWORD_LOCAL.position);
  swordRoot.rotation.set(THREE.MathUtils.degToRad(CRIMSON_SWORD_LOCAL.rotationDeg[0]), THREE.MathUtils.degToRad(CRIMSON_SWORD_LOCAL.rotationDeg[1]), THREE.MathUtils.degToRad(CRIMSON_SWORD_LOCAL.rotationDeg[2]));
  swordRoot.scale.fromArray(CRIMSON_SWORD_LOCAL.scale);
  grip.add(swordRoot);
  crimsonRoot.updateMatrixWorld(true);
  return grip;
}
function applyBaseline(THREE, root, baseline) {
  for (const [name, entry] of Object.entries(baseline.pose?.bones || {})) {
    const bone = find(root, name);
    if (bone && isFiniteArray(entry.quaternion)) bone.quaternion.fromArray(entry.quaternion).normalize();
    else if (bone && isFiniteArray(entry.rotationDeg)) bone.quaternion.copy(degToQuat(THREE, entry.rotationDeg)).normalize();
  }
  root.updateMatrixWorld(true);
}
function applyPoseBones(root, bones) { for (const [name, values] of Object.entries(bones || {})) { const bone = find(root, name); if (bone) bone.quaternion.fromArray(values).normalize(); } root.updateMatrixWorld(true); }
function restBones(root, names) { return Object.fromEntries(names.map((name) => [name, roundedQuaternion(requireNode(root, name).quaternion)])); }
function worldPosition(THREE, node) { return node.getWorldPosition(new THREE.Vector3()); }
function worldQuaternion(THREE, node) { return node.getWorldQuaternion(new THREE.Quaternion()).normalize(); }
function localPointFromWorld(node, point) { return node.worldToLocal(point.clone()); }
function buildSharedRestBaseline(THREE, root, weaponBaseline) {
  root.updateMatrixWorld(true);
  const groundY = new THREE.Box3().setFromObject(root).min.y;
  const poseBones = Object.fromEntries(boneNames.map((name) => [name, { quaternion: roundedQuaternion(requireNode(root, name).quaternion) }]));
  const feet = {};
  for (const side of ['Left', 'Right']) {
    const foot = requireNode(root, `${side}Foot`);
    const toe = requireNode(root, `${side}ToeBase`);
    const ankleWorld = worldPosition(THREE, foot);
    const toeWorld = worldPosition(THREE, toe);
    const forward = toeWorld.clone().sub(ankleWorld);
    forward.y = 0;
    safeDirection(THREE, forward, `${side} foot forward`);
    const footLength = Math.max(0.04, forward.length());
    forward.normalize();
    const heelWorld = ankleWorld.clone().addScaledVector(forward, -footLength * 0.22);
    heelWorld.y = groundY;
    const toeContactWorld = toeWorld.clone();
    toeContactWorld.y = groundY;
    const footWorldQ = worldQuaternion(THREE, foot);
    const soleNormalLocal = new THREE.Vector3(0, 1, 0).applyQuaternion(footWorldQ.clone().invert()).normalize();
    feet[side.toLowerCase()] = {
      footBone: `${side}Foot`,
      toeBone: `${side}ToeBase`,
      ankleWorld: vectorArray(ankleWorld),
      expectedWorldQuaternion: roundedQuaternion(footWorldQ),
      heelLocal: vectorArray(localPointFromWorld(foot, heelWorld)),
      toeLocal: vectorArray(localPointFromWorld(foot, toeContactWorld)),
      soleNormalLocal: vectorArray(soleNormalLocal),
    };
  }
  return {
    schema: 'pose-lab-v2-crimson-shared-rest-baseline-v2',
    id: 'crimson-shared-rest-runtime-bind-1',
    role: 'independent Crimson rest pose and calibrated foot contact contract; never sourced from an attack frame',
    source: {
      characterAsset: 'public/assets/crimson/crimson_plume_knight_rigged_pbr.glb',
      characterAssetSha256: sha256(crimsonPath),
      authoredPose: 'public/assets/crimson/crimson_light_attack1_weapon_baseline.json',
      authoredPoseSha256: sha256(baselinePath),
      derivation: 'runtime GLB bind pose plus the user-authored pre-retarget Crimson rest export',
      notDerivedFromCandidate: true,
      notDerivedFromVanguardAttackFrameZero: true,
    },
    assets: {
      character: './assets/crimson/crimson_plume_knight_rigged_pbr.glb',
      characterKey: 'crimson',
      characterLabel: 'Crimson Knight',
      sabre: './assets/crimson/arborblade_sword.glb',
      activeAnimation: null,
      rootMotion: null,
    },
    saberGripLocal: weaponBaseline.saberGripLocal,
    sabreLocal: weaponBaseline.sabreLocal,
    bladeLocalAxis: weaponBaseline.bladeLocalAxis,
    pose: { state: 'rest', readyPreset: null, attackPreset: null, bones: poseBones },
    footTruth: {
      status: 'calibrated',
      coordinateSystem: 'Three.js normalized character world; +Y is ground-up',
      groundY: Number(groundY.toFixed(5)),
      feet,
      contract: 'heel and toe contact points stay on the calibrated ground plane while the sole normal stays world-up',
    },
    acceptance: { geometryAccepted: true, visualAccepted: false, cloudAccepted: false, candidateAccepted: false },
  };
}
function setWorldQuaternion(THREE, root, node, desiredWorld) {
  const parentWorld = node.parent?.getWorldQuaternion(new THREE.Quaternion()) || new THREE.Quaternion();
  node.quaternion.copy(parentWorld.invert().multiply(desiredWorld)).normalize();
  root.updateMatrixWorld(true);
}
function enforceFootContract(THREE, root, contract) {
  const foot = requireNode(root, contract.footBone);
  const desiredWorld = quaternionFromArray(THREE, contract.expectedWorldQuaternion);
  setWorldQuaternion(THREE, root, foot, desiredWorld);
  const heel = foot.localToWorld(new THREE.Vector3(...contract.heelLocal));
  const toe = foot.localToWorld(new THREE.Vector3(...contract.toeLocal));
  const sole = new THREE.Vector3(...contract.soleNormalLocal).applyQuaternion(worldQuaternion(THREE, foot)).normalize();
  return {
    heelWorld: vectorArray(heel),
    toeWorld: vectorArray(toe),
    heelGroundError: Number(Math.abs(heel.y - contract.groundY).toFixed(5)),
    toeGroundError: Number(Math.abs(toe.y - contract.groundY).toFixed(5)),
    minGroundClearance: Number((Math.min(heel.y, toe.y) - contract.groundY).toFixed(5)),
    soleNormalWorld: vectorArray(sole),
    soleUpDot: Number(sole.dot(new THREE.Vector3(0, 1, 0)).toFixed(6)),
    orientationErrorDeg: angleDeg(THREE, worldQuaternion(THREE, foot), desiredWorld),
  };
}
function rotateBoneToAlignWorld(THREE, root, bone, fromWorld, toWorld, maxStepDeg = 45) {
  if (!isFiniteVector3(fromWorld) || !isFiniteVector3(toWorld) || fromWorld.lengthSq() < 1e-8 || toWorld.lengthSq() < 1e-8) return 0;
  const from = fromWorld.clone().normalize();
  const to = toWorld.clone().normalize();
  const worldDelta = new THREE.Quaternion().setFromUnitVectors(from, to);
  const limited = clampQuaternionAngle(THREE, worldDelta, maxStepDeg).quaternion;
  const parentWorld = bone.parent?.getWorldQuaternion(new THREE.Quaternion()) || new THREE.Quaternion();
  const localDelta = parentWorld.clone().invert().multiply(limited).multiply(parentWorld).normalize();
  const before = bone.quaternion.clone();
  bone.quaternion.premultiply(localDelta).normalize();
  root.updateMatrixWorld(true);
  assertFiniteQuaternion(bone.quaternion, `${bone.name} after rotateBoneToAlignWorld`);
  return quatTravelDeg(THREE, before, bone.quaternion);
}
function solveChainToTargets(THREE, root, chainBones, targetMid, targetEnd, iterations = 6, prioritizeEnd = false) {
  const [upperName, lowerName, endName] = chainBones;
  const upper = requireNode(root, upperName);
  const lower = requireNode(root, lowerName);
  const end = requireNode(root, endName);
  const beforeUpper = upper.quaternion.clone();
  const beforeLower = lower.quaternion.clone();
  for (let i = 0; i < iterations; i += 1) {
    root.updateMatrixWorld(true);
    rotateBoneToAlignWorld(THREE, root, upper, worldPosition(THREE, lower).sub(worldPosition(THREE, upper)), targetMid.clone().sub(worldPosition(THREE, upper)), 38);
    rotateBoneToAlignWorld(THREE, root, lower, worldPosition(THREE, end).sub(worldPosition(THREE, lower)), targetEnd.clone().sub(worldPosition(THREE, lower)), 38);
    rotateBoneToAlignWorld(THREE, root, upper, worldPosition(THREE, end).sub(worldPosition(THREE, upper)), targetEnd.clone().sub(worldPosition(THREE, upper)), 18);
  }
  if (prioritizeEnd) {
    for (let i = 0; i < 24; i += 1) {
      root.updateMatrixWorld(true);
      rotateBoneToAlignWorld(THREE, root, lower, worldPosition(THREE, end).sub(worldPosition(THREE, lower)), targetEnd.clone().sub(worldPosition(THREE, lower)), 8);
      rotateBoneToAlignWorld(THREE, root, upper, worldPosition(THREE, end).sub(worldPosition(THREE, upper)), targetEnd.clone().sub(worldPosition(THREE, upper)), 8);
    }
  }
  root.updateMatrixWorld(true);
  return {
    upperQuaternion: upper.quaternion.clone(),
    lowerQuaternion: lower.quaternion.clone(),
    upperRotationDeg: quatTravelDeg(THREE, beforeUpper, upper.quaternion),
    lowerRotationDeg: quatTravelDeg(THREE, beforeLower, lower.quaternion),
    midError: Number(worldPosition(THREE, lower).distanceTo(targetMid).toFixed(5)),
    endError: Number(worldPosition(THREE, end).distanceTo(targetEnd).toFixed(5)),
  };
}
function reachableLegTarget(THREE, root, chainBones, requested) {
  const [upperName, lowerName, endName] = chainBones;
  const upper = requireNode(root, upperName);
  const lower = requireNode(root, lowerName);
  const end = requireNode(root, endName);
  const hip = worldPosition(THREE, upper);
  const upperLength = worldPosition(THREE, lower).distanceTo(hip);
  const lowerLength = worldPosition(THREE, end).distanceTo(worldPosition(THREE, lower));
  const maxReach = (upperLength + lowerLength) * 0.995;
  const delta = requested.clone().sub(hip);
  const vertical = delta.y;
  const horizontal = new THREE.Vector3(delta.x, 0, delta.z);
  const maxHorizontal = Math.sqrt(Math.max(0, maxReach * maxReach - vertical * vertical));
  if (horizontal.length() > maxHorizontal) horizontal.setLength(maxHorizontal);
  return hip.clone().add(horizontal).add(new THREE.Vector3(0, vertical, 0));
}
function solveTwoBoneLegToGround(THREE, root, chainBones, kneeHint, requestedEnd) {
  const [upperName, lowerName, endName] = chainBones;
  const upper = requireNode(root, upperName);
  const lower = requireNode(root, lowerName);
  const end = requireNode(root, endName);
  const beforeUpper = upper.quaternion.clone();
  const beforeLower = lower.quaternion.clone();
  const targetEnd = reachableLegTarget(THREE, root, chainBones, requestedEnd);
  for (let iteration = 0; iteration < 3; iteration += 1) {
    root.updateMatrixWorld(true);
    const hip = worldPosition(THREE, upper);
    const knee = worldPosition(THREE, lower);
    const ankle = worldPosition(THREE, end);
    const a = knee.distanceTo(hip);
    const b = ankle.distanceTo(knee);
    const toEnd = targetEnd.clone().sub(hip);
    const c = Math.max(0.00001, Math.min(toEnd.length(), (a + b) * 0.999));
    const direction = toEnd.normalize();
    let bend = kneeHint.clone().sub(hip).sub(direction.clone().multiplyScalar(kneeHint.clone().sub(hip).dot(direction)));
    if (bend.lengthSq() < 1e-8) bend = knee.clone().sub(hip).sub(direction.clone().multiplyScalar(knee.clone().sub(hip).dot(direction)));
    if (bend.lengthSq() < 1e-8) bend = new THREE.Vector3(0, 0, 1).cross(direction);
    bend.normalize();
    const along = (a * a + c * c - b * b) / (2 * c);
    const height = Math.sqrt(Math.max(0, a * a - along * along));
    const targetKnee = hip.clone().addScaledVector(direction, along).addScaledVector(bend, height);
    rotateBoneToAlignWorld(THREE, root, upper, knee.clone().sub(hip), targetKnee.sub(hip), 180);
    root.updateMatrixWorld(true);
    const solvedKnee = worldPosition(THREE, lower);
    rotateBoneToAlignWorld(THREE, root, lower, worldPosition(THREE, end).sub(solvedKnee), targetEnd.clone().sub(solvedKnee), 180);
  }
  root.updateMatrixWorld(true);
  return {
    targetEnd,
    upperRotationDeg: quatTravelDeg(THREE, beforeUpper, upper.quaternion),
    lowerRotationDeg: quatTravelDeg(THREE, beforeLower, lower.quaternion),
    midError: Number(worldPosition(THREE, lower).distanceTo(kneeHint).toFixed(5)),
    endError: Number(worldPosition(THREE, end).distanceTo(targetEnd).toFixed(5)),
  };
}
function bladeDirectionWorld(THREE, grip, swordRoot) { const axis = new THREE.Vector3(...CRIMSON_SWORD_REVIEW_LOCAL_AXIS).normalize(); const hilt = grip.getWorldPosition(new THREE.Vector3()); const tip = hilt.clone().add(axis.applyQuaternion(swordRoot.getWorldQuaternion(new THREE.Quaternion())).multiplyScalar(1)); return tip.sub(hilt).normalize(); }
function scoreBlade(THREE, grip, swordRoot, desired) { return THREE.MathUtils.radToDeg(bladeDirectionWorld(THREE, grip, swordRoot).angleTo(desired)); }
function solveArmBladeForward(THREE, root, armBones, grip, swordRoot, desired) {
  const starts = new Map(armBones.map((bone) => [bone.name, bone.quaternion.clone()]));
  const best = new Map(armBones.map((bone) => [bone.name, bone.quaternion.clone()]));
  let bestScore = scoreBlade(THREE, grip, swordRoot, desired);
  const axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  const boneWeights = new Map([
    [armBones[0]?.name, 1.0],
    [armBones[1]?.name, 0.55],
    [armBones[2]?.name, 0.32],
  ]);
  const restoreBest = () => {
    for (const bone of armBones) bone.quaternion.copy(best.get(bone.name)).normalize();
    root.updateMatrixWorld(true);
  };
  for (const step of [24, 12, 6, 3, 1.5, 0.7, 0.3, 0.12]) {
    let improved = true;
    let guard = 0;
    while (improved && guard < 16) {
      improved = false; guard += 1;
      for (const bone of armBones) {
        const weightedStep = step * (boneWeights.get(bone.name) ?? 0.5);
        for (const axis of axes) for (const sign of [-1, 1]) {
          restoreBest();
          bone.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(weightedStep * sign))).normalize();
          root.updateMatrixWorld(true);
          const score = scoreBlade(THREE, grip, swordRoot, desired);
          if (score + 0.0001 < bestScore) {
            for (const candidateBone of armBones) best.set(candidateBone.name, candidateBone.quaternion.clone());
            bestScore = score;
            improved = true;
          }
        }
      }
    }
  }
  restoreBest();
  return {
    rotationFromInputDeg: Object.fromEntries(armBones.map((bone) => [bone.name, quatTravelDeg(THREE, starts.get(bone.name), bone.quaternion)])),
    angleErrorDeg: Number(bestScore.toFixed(3)),
  };
}
function targetForChain(THREE, root, sourceSample, sourceStartBasisInverse, targetStartBasis, chain) {
  const [upperName] = chain.bones;
  const upper = requireNode(root, upperName);
  const sourceLimb = sourceSample.limbs[chain.sourceLimb];
  const sourceUpper = new THREE.Vector3(...sourceLimb.parentToMid);
  const sourceLower = new THREE.Vector3(...sourceLimb.midToEnd);
  const targetUpperLength = requireNode(root, chain.bones[1]).getWorldPosition(new THREE.Vector3()).distanceTo(upper.getWorldPosition(new THREE.Vector3()));
  const targetLowerLength = requireNode(root, chain.bones[2]).getWorldPosition(new THREE.Vector3()).distanceTo(requireNode(root, chain.bones[1]).getWorldPosition(new THREE.Vector3()));
  const targetUpper = safeDirection(THREE, mapSourceVector(THREE, sourceUpper, sourceStartBasisInverse, targetStartBasis), `${chain.name} mapped upper`).multiplyScalar(targetUpperLength);
  const targetLower = safeDirection(THREE, mapSourceVector(THREE, sourceLower, sourceStartBasisInverse, targetStartBasis), `${chain.name} mapped lower`).multiplyScalar(targetLowerLength);
  const parentWorld = upper.getWorldPosition(new THREE.Vector3());
  const targetMid = parentWorld.clone().add(targetUpper);
  const targetEnd = targetMid.clone().add(targetLower);
  return { targetMid, targetEnd };
}

function bodyBasisFromRig(THREE, root, names, label) {
  const hips = requireNode(root, names.Hips).getWorldPosition(new THREE.Vector3());
  const chest = requireNode(root, names.Spine02).getWorldPosition(new THREE.Vector3());
  const leftShoulder = requireNode(root, names.LeftShoulder).getWorldPosition(new THREE.Vector3());
  const rightShoulder = requireNode(root, names.RightShoulder).getWorldPosition(new THREE.Vector3());
  const up = safeDirection(THREE, chest.clone().sub(hips), `${label} up`);
  let right = safeDirection(THREE, rightShoulder.clone().sub(leftShoulder), `${label} right`);
  right = safeDirection(THREE, right.sub(up.clone().multiplyScalar(right.dot(up))), `${label} orthogonal right`);
  let forward = safeDirection(THREE, new THREE.Vector3().crossVectors(right, up), `${label} forward`);
  right = safeDirection(THREE, new THREE.Vector3().crossVectors(up, forward), `${label} reorthogonalized right`);
  forward = safeDirection(THREE, new THREE.Vector3().crossVectors(right, up), `${label} reorthogonalized forward`);
  return new THREE.Matrix4().makeBasis(right, up, forward);
}

function captureWorldQuaternions(THREE, root, names) {
  return Object.fromEntries(names.map((name) => [name, worldQuaternion(THREE, requireNode(root, name))]));
}

function applyAbsoluteSourceFrameZero(THREE, targetRoot, targetRestWorld, sourceRoot, reference, targetBodyBasis) {
  const sourceNames = reference.logicalBones;
  const sourceBodyBasis = basisMatrix(THREE, reference.samples.start.bodyBasis, 'Vanguard frame-zero body basis');
  const sourceBodyQ = quaternionFromBasisMatrix(THREE, sourceBodyBasis, 'Vanguard frame-zero body basis');
  const targetBodyQ = quaternionFromBasisMatrix(THREE, targetBodyBasis, 'Crimson bind basis');
  const sourceToTarget = targetBodyQ.clone().multiply(sourceBodyQ.clone().invert()).normalize();
  const sourceToTargetInverse = sourceToTarget.clone().invert();
  const splitWeights = { Spine: 0.5, Spine01: 0.5 };
  const applied = [];
  for (const name of boneNames) {
    const sourceName = sourceNames[name];
    const sample = reference.samples.start.bones[name];
    const targetBone = find(targetRoot, name);
    const sourceBone = sourceName ? find(sourceRoot, sourceName) : null;
    if (!sample?.worldQuaternion || !targetBone || !sourceBone || !targetRestWorld[name]) continue;
    const sourceBindWorld = worldQuaternion(THREE, sourceBone);
    const sourceFrameWorld = quaternionFromArray(THREE, sample.worldQuaternion);
    const sourceWorldDelta = sourceFrameWorld.clone().multiply(sourceBindWorld.clone().invert()).normalize();
    const mappedWorldDelta = sourceToTarget.clone().multiply(sourceWorldDelta).multiply(sourceToTargetInverse).normalize();
    const weightedDelta = slerpIdentity(THREE, mappedWorldDelta, splitWeights[name] ?? 1);
    const desiredTargetWorld = weightedDelta.multiply(targetRestWorld[name].clone()).normalize();
    setWorldQuaternion(THREE, targetRoot, targetBone, desiredTargetWorld);
    applied.push({ name, sourceName, worldDeltaDeg: Number(THREE.MathUtils.radToDeg(new THREE.Quaternion().angleTo(mappedWorldDelta)).toFixed(3)) });
  }
  return applied;
}

const blenderGateVanguardScreenAnglesDeg = {
  // These are Blender-gate compensated targets. The raw Vanguard screen angles
  // are still measured in the compare manifest; these values account for the
  // glTF/Blender armature import basis so the rendered Arborblade line matches
  // Vanguard instead of solving to a camera-axis sliver.
  start: 80.0,
  earlyWindup: 3.0,
  anticipation: -92.0,
  snapPrep: -47.9,
  contact: -46.5,
  contactHold: 65.2,
  settle: -25.1,
  followThrough: 86.0,
};
function blenderGateScreenPlaneDirection(THREE, label) {
  const angle = THREE.MathUtils.degToRad(blenderGateVanguardScreenAnglesDeg[label] ?? 0);
  const right = new THREE.Vector3(1, 0, 0);
  const up = new THREE.Vector3(0, 1, 0);
  return right.multiplyScalar(Math.cos(angle)).add(up.multiplyScalar(Math.sin(angle))).normalize();
}
function screenReadableBladeDirection(THREE, desired, label) {
  const screenTarget = blenderGateScreenPlaneDirection(THREE, label);
  const weightByLabel = {
    start: 1,
    earlyWindup: 1,
    anticipation: 1,
    snapPrep: 1,
    contact: 1,
    contactHold: 1,
    settle: 1,
    followThrough: 1,
  };
  const weight = weightByLabel[label] ?? 0.9;
  return desired.clone().normalize().lerp(screenTarget, weight).normalize();
}

function applyBodyBasisDeltas(THREE, root, sourceStartBasis, sourceCurrentBasis, targetStartBasis) {
  const sourceStartQ = quaternionFromBasisMatrix(THREE, sourceStartBasis, 'source start basis quaternion');
  const sourceCurrentQ = quaternionFromBasisMatrix(THREE, sourceCurrentBasis, 'source current basis quaternion');
  const targetStartQ = quaternionFromBasisMatrix(THREE, targetStartBasis, 'target start basis quaternion');
  const localDelta = sourceStartQ.clone().invert().multiply(sourceCurrentQ).normalize();
  const targetWorldDelta = targetStartQ.clone().multiply(localDelta).multiply(targetStartQ.clone().invert()).normalize();
  const targets = [
    ['Hips', 0.42, 30],
    ['Spine', 0.24, 24],
    ['Spine01', 0.3, 28],
    ['Spine02', 0.36, 34],
    ['Head', 0.12, 14],
  ];
  for (const [name, weight, maxDeg] of targets) {
    const bone = find(root, name);
    if (bone) applyWorldDeltaToBone(THREE, root, bone, targetWorldDelta, weight, maxDeg);
  }
}
function applySourceLocalDeltas(THREE, root, baseBones, reference, label) {
  applyPoseBones(root, baseBones);
  const start = reference.samples.start.bones;
  const current = reference.samples[label].bones;
  const clampReport = [];
  for (const name of boneNames) {
    const bone = find(root, name);
    const sourceStart = start[name]?.localQuaternion;
    const sourceCurrent = current[name]?.localQuaternion;
    if (!bone || !sourceStart || !sourceCurrent) continue;
    const delta = quaternionFromArray(THREE, sourceStart).invert().multiply(quaternionFromArray(THREE, sourceCurrent)).normalize();
    const weighted = slerpIdentity(THREE, delta, sourceDeltaWeights[name] ?? 0.5);
    const clamped = clampQuaternionAngle(THREE, weighted, ['RightHand', 'LeftHand'].includes(name) ? 65 : 50);
    bone.quaternion.fromArray(baseBones[name]).multiply(clamped.quaternion).normalize();
    if (clamped.clamped) clampReport.push({ bone: name, sourceDeltaDeg: Number(clamped.angleDeg.toFixed(3)) });
  }
  root.updateMatrixWorld(true);
  return clampReport;
}
function chainReport(THREE, root, chain, targets, solved) {
  const mid = requireNode(root, chain.bones[1]).getWorldPosition(new THREE.Vector3());
  const end = requireNode(root, chain.bones[2]).getWorldPosition(new THREE.Vector3());
  return { chain: chain.name, targetMid: vectorArray(targets.targetMid), actualMid: vectorArray(mid), targetEnd: vectorArray(targets.targetEnd), actualEnd: vectorArray(end), midError: solved.midError, endError: solved.endError, upperRotationDeg: solved.upperRotationDeg, lowerRotationDeg: solved.lowerRotationDeg };
}
function frameReport(THREE, root, grip, swordRoot, label, sourceSample, desiredBlade, chainReports, clampReport) {
  root.updateMatrixWorld(true);
  const hilt = grip.getWorldPosition(new THREE.Vector3());
  const hand = requireNode(root, 'RightHand').getWorldPosition(new THREE.Vector3());
  const actualBlade = bladeDirectionWorld(THREE, grip, swordRoot);
  return { label, sourceTime: sourceSample.sourceTime, hiltWorld: vectorArray(hilt), rightHandWorld: vectorArray(hand), hiltToRightHandDistance: Number(hilt.distanceTo(hand).toFixed(5)), desiredBladeDirectionWorld: vectorArray(desiredBlade), actualBladeDirectionWorld: vectorArray(actualBlade), bladeAngleErrorDeg: angleDeg(THREE, actualBlade, desiredBlade), chains: chainReports, rollClampReport: clampReport };
}

async function main() {
  ensureBrowserShim();
  const reference = JSON.parse(fs.readFileSync(referencePath, 'utf8'));
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  if (reference.schema !== 'pose-lab-v2-crimson-vanguard-swordattack1-reference-v2') throw new Error('run npm run reference:crimson:swordattack1 to refresh full-body v2 reference');
  const baselineFailures = [];
  if (JSON.stringify(baseline.saberGripLocal.position) !== JSON.stringify(CRIMSON_SABER_GRIP_LOCAL.position)) baselineFailures.push('SABER_GRIP_POSITION');
  if (JSON.stringify(baseline.saberGripLocal.rotationDeg) !== JSON.stringify(CRIMSON_SABER_GRIP_LOCAL.rotationDeg)) baselineFailures.push('SABER_GRIP_ROTATION');
  if (JSON.stringify(baseline.sabreLocal) !== JSON.stringify(CRIMSON_SWORD_LOCAL)) baselineFailures.push('SWORD_LOCAL');
  if (baselineFailures.length) throw new Error(`saved weapon baseline drift: ${baselineFailures.join(', ')}`);
  const sandbox = ensureThreeSandbox();
  const THREE = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'build', 'three.module.js')).href);
  const { GLTFLoader } = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js')).href);
  const crimson = await loadGltf(GLTFLoader, crimsonPath);
  const sword = await loadGltf(GLTFLoader, swordPath);
  const vanguard = await loadGltf(GLTFLoader, vanguardPath);
  const crimsonRoot = normalizeCharacter(THREE, crimson.scene);
  const vanguardRoot = normalizeCharacter(THREE, vanguard.scene);
  const swordRoot = sword.scene;
  const grip = attachCrimsonSword(THREE, crimsonRoot, swordRoot);
  applyBaseline(THREE, crimsonRoot, baseline);
  const sharedRest = buildSharedRestBaseline(THREE, crimsonRoot, baseline);
  fs.writeFileSync(sharedRestPath, `${JSON.stringify(sharedRest, null, 2)}\n`);
  applyBaseline(THREE, crimsonRoot, sharedRest);
  const baseBones = restBones(crimsonRoot, boneNames);
  const targetRestWorld = captureWorldQuaternions(THREE, crimsonRoot, boneNames);
  const sourceStartBasisInverse = basisMatrix(THREE, reference.samples.start.bodyBasis, 'Vanguard start body basis').invert();
  const hips = requireNode(crimsonRoot, 'Hips').getWorldPosition(new THREE.Vector3());
  const chest = requireNode(crimsonRoot, 'Spine02').getWorldPosition(new THREE.Vector3());
  const leftShoulder = requireNode(crimsonRoot, 'LeftShoulder').getWorldPosition(new THREE.Vector3());
  const rightShoulder = requireNode(crimsonRoot, 'RightShoulder').getWorldPosition(new THREE.Vector3());
  const up = safeDirection(THREE, chest.clone().sub(hips), 'Crimson body up');
  let right = safeDirection(THREE, rightShoulder.clone().sub(leftShoulder), 'Crimson shoulder right');
  right = safeDirection(THREE, right.sub(up.clone().multiplyScalar(right.dot(up))), 'Crimson orthogonal right');
  let forward = safeDirection(THREE, new THREE.Vector3().crossVectors(right, up), 'Crimson forward');
  right = safeDirection(THREE, new THREE.Vector3().crossVectors(up, forward), 'Crimson reorthogonalized right');
  forward = safeDirection(THREE, new THREE.Vector3().crossVectors(right, up), 'Crimson reorthogonalized forward');
  const targetStartBasis = new THREE.Matrix4().makeBasis(right, up, forward);
  const frames = [];
  const report = [];
  for (const label of frameLabels) {
    const sourceSample = reference.samples[label];
    applyPoseBones(crimsonRoot, baseBones);
    const absoluteSourcePose = applyAbsoluteSourceFrameZero(THREE, crimsonRoot, targetRestWorld, vanguardRoot, reference, targetStartBasis);
    const clampReport = [];
    const chainReports = [];
    for (const chain of chains) {
      const targets = targetForChain(THREE, crimsonRoot, sourceSample, sourceStartBasisInverse, targetStartBasis, chain);
      if (chain.name === 'leftLeg' || chain.name === 'rightLeg') {
        const side = chain.name === 'leftLeg' ? 'left' : 'right';
        targets.targetEnd.y = sharedRest.footTruth.feet[side].ankleWorld[1];
      }
      const isLeg = chain.name.endsWith('Leg');
      const solved = isLeg
        ? solveTwoBoneLegToGround(THREE, crimsonRoot, chain.bones, targets.targetMid, targets.targetEnd)
        : solveChainToTargets(THREE, crimsonRoot, chain.bones, targets.targetMid, targets.targetEnd);
      if (isLeg) targets.targetEnd.copy(solved.targetEnd);
      chainReports.push(chainReport(THREE, crimsonRoot, chain, targets, solved));
    }
    const desiredBlade = safeDirection(THREE, mapSourceVector(THREE, new THREE.Vector3(...sourceSample.weapon.bladeDirectionWorld), sourceStartBasisInverse, targetStartBasis), `${label} desired blade`);
    const rightHand = requireNode(crimsonRoot, 'RightHand');
    const rightHandBeforeBlade = rightHand.quaternion.clone();
    const bladeCorrectionDeg = rotateBoneToAlignWorld(THREE, crimsonRoot, rightHand, bladeDirectionWorld(THREE, grip, swordRoot), desiredBlade, 55);
    const footReport = Object.fromEntries(['left', 'right'].map((side) => [side, enforceFootContract(THREE, crimsonRoot, { ...sharedRest.footTruth.feet[side], groundY: sharedRest.footTruth.groundY })]));
    const entry = frameReport(THREE, crimsonRoot, grip, swordRoot, label, sourceSample, desiredBlade, chainReports, clampReport);
    entry.absoluteSourcePose = absoluteSourcePose;
    entry.rightHandBladeCorrectionDeg = bladeCorrectionDeg;
    entry.rightHandBladeCorrectionFromAbsoluteDeg = quatTravelDeg(THREE, rightHandBeforeBlade, rightHand.quaternion);
    entry.feet = footReport;
    report.push(entry);
    const bones = restBones(crimsonRoot, boneNames);
    frames.push({ time: primeKeys[label], label, note: `${label}: full-body Vanguard SwordAttack1 relationship baked to Crimson; Arborblade socket remains invariant`, sourceTime: sourceSample.sourceTime, bones });
  }
  const startFrame = frames[0];
  const travel = {};
  const startFromSavedBaselineTravel = Object.fromEntries(['Hips', 'Spine02', 'Spine', 'RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm', 'LeftHand'].map((name) => {
    const baselineQ = new THREE.Quaternion().fromArray(baseBones[name]);
    const startQ = new THREE.Quaternion().fromArray(startFrame.bones[name]);
    return [name, Number(THREE.MathUtils.radToDeg(baselineQ.angleTo(startQ)).toFixed(3))];
  }));
  const guardFailures = [];
  if (startFromSavedBaselineTravel.Hips < 5 || startFromSavedBaselineTravel.Spine02 < 5 || startFromSavedBaselineTravel.RightArm < 10 || startFromSavedBaselineTravel.LeftArm < 10) {
    guardFailures.push(`START_FRAME_IS_SAVED_BASELINE_OR_REST:${JSON.stringify(startFromSavedBaselineTravel)}`);
  }
  const maxChainError = Math.max(...report.flatMap((entry) => entry.chains.flatMap((chain) => [chain.midError, chain.endError])));
  if (maxChainError > thresholds.maxChainError) guardFailures.push(`CHAIN_ERROR_TOO_HIGH:${maxChainError}`);
  const contact = report[0];
  if (!contact || contact.bladeAngleErrorDeg > 12) guardFailures.push(`FRAME_ZERO_BLADE_NOT_ALIGNED:${contact?.bladeAngleErrorDeg}`);
  for (const frame of frames) for (const [bone, values] of Object.entries(frame.bones)) if (!isFiniteArray(values)) guardFailures.push(`NONFINITE_BONE:${frame.label}:${bone}`);
  for (const entry of report) {
    if (!isFiniteArray(entry.actualBladeDirectionWorld) || !isFiniteArray(entry.desiredBladeDirectionWorld)) guardFailures.push(`NONFINITE_BLADE:${entry.label}`);
    if (!Number.isFinite(entry.bladeAngleErrorDeg)) guardFailures.push(`NONFINITE_BLADE_ANGLE:${entry.label}`);
    for (const [side, foot] of Object.entries(entry.feet)) {
      if (foot.orientationErrorDeg > thresholds.maxFootOrientationErrorDeg) guardFailures.push(`FOOT_ORIENTATION_DRIFT:${entry.label}:${side}:${foot.orientationErrorDeg}`);
      if (foot.heelGroundError > thresholds.maxContactHeightError || foot.toeGroundError > thresholds.maxContactHeightError) guardFailures.push(`FOOT_CONTACT_OFF_GROUND:${entry.label}:${side}:${foot.heelGroundError}:${foot.toeGroundError}`);
      if (foot.minGroundClearance < -thresholds.maxContactHeightError) guardFailures.push(`FOOT_PENETRATES_GROUND:${entry.label}:${side}:${foot.minGroundClearance}`);
      if (foot.soleUpDot < thresholds.minSoleUpDot) guardFailures.push(`SOLE_NOT_UP:${entry.label}:${side}:${foot.soleUpDot}`);
    }
  }
  if (guardFailures.some((failure) => failure.startsWith('NONFINITE'))) {
    fs.rmSync(outputPath, { force: true });
    console.error(JSON.stringify({ ok: false, wrote: null, guardFailures, travel, maxChainError, contactBladeAngleDeg: contact?.bladeAngleErrorDeg }, null, 2));
    process.exit(1);
  }
  const payload = {
    schema: 'pose-lab-v2-attack-candidate-v1',
    id: candidateId,
    label: 'Crimson combat-ready frame zero from Vanguard bind-to-frame transfer',
    primeKeys,
    source: {
      character: 'crimson',
      sourceCharacter: 'vanguard',
      clip: 'SwordAttack1',
      duration: 0,
      vanguardReference: 'public/assets/crimson/vanguard_swordattack1_reference.json',
      savedWeaponBaseline: 'public/assets/crimson/crimson_light_attack1_weapon_baseline.json',
      sharedRestBaseline: 'public/assets/crimson/crimson_shared_rest_baseline.json',
      sharedRestBaselineSha256: sha256(sharedRestPath),
      previousReviewCandidate: 'crimson-light-attack1-vanguard-4',
      method: 'Vanguard-bind-to-authored-frame-zero-world-delta transfer plus limb-chain reconciliation',
      policy: {
        role: 'frame-zero-only visual candidate; never animation acceptance',
        noRuntimeRetargeting: true,
        forbiddenUse: 'Do not copy Vanguard Weapon.R transforms directly into Crimson as accepted sword orientation.',
        rootMotion: 'Vanguard root motion is preserved in sidecar data and not applied in Pose Lab.',
        weaponTruth: 'SaberGrip and Arborblade local transforms are copied from the saved user sabre-transform export and are invariant across frames.',
      },
      retarget: {
        sourceLogicalBones: reference.logicalBones,
        targetBones: boneNames,
        chainSolves: chains.map((chain) => ({ name: chain.name, targetBones: chain.bones, sourceLimb: chain.sourceLimb })),
        rollRestoration: 'absolute Vanguard bind-to-frame-zero world deltas mapped through source and target body bases before chain solve',
        footPlanting: 'leg IK pins each ankle to calibrated rest height; foot world orientation is restored after every solve; heel, toe, penetration, and sole-up metrics are recorded per frame',
        bladeReadability: 'Vanguard frame-zero blade direction is mapped without a hard-coded screen-angle substitute; only RightHand receives bounded alignment',
      },
      savedWeapon: { saberGripLocal: baseline.saberGripLocal, sabreLocal: baseline.sabreLocal, bladeLocalAxis: baseline.bladeLocalAxis },
    },
    guardReport: {
      crimsonCombatReadyFrameZero1: { status: guardFailures.length ? 'FAIL' : 'REVIEW_REQUIRED', thresholds, startFromSavedBaselineTravel, maxChainError: Number(maxChainError.toFixed(5)), report, guardFailures, note: 'Frame zero is reject-only until Blender and runtime pixels visibly reproduce Vanguard combat readiness. Metrics cannot promote it.' },
    },
    frames,
  };
  fs.writeFileSync(outputPath, `export const ${exportName} = ${JSON.stringify(payload, null, 2)};\n`);
  console.log(JSON.stringify({ ok: !guardFailures.length, wrote: path.relative(projectRoot, outputPath), candidate: candidateId, frames: frames.length, guardFailures, maxChainError: Number(maxChainError.toFixed(5)), frameZeroBladeAngleDeg: contact.bladeAngleErrorDeg }, null, 2));
}
main().catch((error) => { console.error(error instanceof Error ? error.stack : String(error)); process.exit(1); });

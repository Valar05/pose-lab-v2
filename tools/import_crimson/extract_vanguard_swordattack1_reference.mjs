import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceGlb = path.join(root, 'public/assets/vanguard/vanguard_rigged_animations.glb');
const outPath = path.join(root, 'public/assets/crimson/vanguard_swordattack1_reference.json');
const sourceClip = 'SwordAttack1';
const logicalBones = {
  Hips: 'hips',
  Spine02: 'chest',
  Spine01: 'spine',
  Spine: 'spine',
  neck: 'neck',
  Head: 'head',
  LeftShoulder: 'shoulder.L',
  LeftArm: 'upper_arm.fk.L',
  LeftForeArm: 'forearm.fk.L',
  LeftHand: 'hand.fk.L',
  RightShoulder: 'shoulder.R',
  RightArm: 'upper_arm.fk.R',
  RightForeArm: 'forearm.fk.R',
  RightHand: 'hand.fk.R',
  LeftUpLeg: 'thigh.fk.L',
  LeftLeg: 'shin.fk.L',
  LeftFoot: 'foot.fk.L',
  RightUpLeg: 'thigh.fk.R',
  RightLeg: 'shin.fk.R',
  RightFoot: 'foot.fk.R',
};
const propNodes = ['root', 'Weapon.R', 'Long_Sword'];
const sampleTimes = {
  start: 0,
  earlyWindup: 0.1,
  anticipation: 0.183333,
  snapPrep: 0.283333,
  contact: 0.383333,
  contactHold: 0.5,
  settle: 0.566667,
  followThrough: 0.62,
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
  if (!fs.existsSync(path.join(threeDir, 'build', 'three.module.js'))) {
    fs.rmSync(sandbox, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(threeDir), { recursive: true });
    execFileSync('cp', ['-R', path.join(root, 'vendor', 'three'), threeDir]);
  }
  return sandbox;
}
function arrayBuffer(file) { const buffer = fs.readFileSync(file); return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength); }
async function loadGltf(GLTFLoader, file) { return new Promise((resolve, reject) => new GLTFLoader().parse(arrayBuffer(file), path.dirname(file) + '/', resolve, reject)); }
function canon(name) { return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
function find(rootNode, name) { const wanted = canon(name); let found = null; rootNode.traverse((node) => { if (!found && canon(node.name) === wanted) found = node; }); return found; }
function requireNode(rootNode, name) { const node = find(rootNode, name); if (!node) throw new Error(`missing Vanguard node ${name}`); return node; }
function vec(v) { return v.toArray().map((n) => Number(n.toFixed(6))); }
function quat(q) { return q.toArray().map((n) => Number(n.toFixed(6))); }
function objectSample(THREE, scene, name) {
  const node = requireNode(scene, name);
  scene.updateMatrixWorld(true);
  return {
    worldPosition: vec(node.getWorldPosition(new THREE.Vector3())),
    worldQuaternion: quat(node.getWorldQuaternion(new THREE.Quaternion())),
    localPosition: vec(node.position),
    localQuaternion: quat(node.quaternion),
  };
}
function finiteVector(v) { return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z); }
function safeDirection(THREE, primary, fallbacks, label) {
  for (const candidate of [primary, ...fallbacks]) {
    if (!candidate || !finiteVector(candidate) || candidate.lengthSq() < 1e-10) continue;
    return candidate.clone().normalize();
  }
  throw new Error(`cannot build Vanguard body basis ${label}`);
}
function projectOff(vector, normal) {
  return vector.clone().sub(normal.clone().multiplyScalar(vector.dot(normal)));
}
function basisFromPoints(THREE, samples) {
  const hips = new THREE.Vector3(...samples.Hips.worldPosition);
  const neck = new THREE.Vector3(...samples.neck.worldPosition);
  const head = new THREE.Vector3(...samples.Head.worldPosition);
  const leftShoulder = new THREE.Vector3(...samples.LeftShoulder.worldPosition);
  const rightShoulder = new THREE.Vector3(...samples.RightShoulder.worldPosition);
  const shoulderCenter = leftShoulder.clone().add(rightShoulder).multiplyScalar(0.5);
  const up = safeDirection(THREE, shoulderCenter.clone().sub(hips), [neck.clone().sub(hips), head.clone().sub(hips), new THREE.Vector3(0, 1, 0)], 'up');
  let right = safeDirection(THREE, rightShoulder.clone().sub(leftShoulder), [new THREE.Vector3(1, 0, 0)], 'right');
  right = safeDirection(THREE, projectOff(right, up), [projectOff(new THREE.Vector3(1, 0, 0), up), projectOff(new THREE.Vector3(0, 0, 1), up)], 'orthogonal right');
  let forward = new THREE.Vector3().crossVectors(right, up);
  forward = safeDirection(THREE, forward, [projectOff(head.clone().sub(shoulderCenter), up), new THREE.Vector3(0, 0, 1)], 'forward');
  right = safeDirection(THREE, new THREE.Vector3().crossVectors(up, forward), [right], 'reorthogonalized right');
  forward = safeDirection(THREE, new THREE.Vector3().crossVectors(right, up), [forward], 'reorthogonalized forward');
  return { origin: vec(hips), right: vec(right), up: vec(up), forward: vec(forward) };
}
function subtract(a, b) { return a.map((value, index) => Number((value - b[index]).toFixed(6))); }
function length(v) { return Math.sqrt(v.reduce((sum, value) => sum + value * value, 0)); }
function limbSample(samples, a, b, c) {
  const ab = subtract(samples[b].worldPosition, samples[a].worldPosition);
  const bc = subtract(samples[c].worldPosition, samples[b].worldPosition);
  const ac = subtract(samples[c].worldPosition, samples[a].worldPosition);
  return { chain: [a, b, c], parentToMid: ab, midToEnd: bc, parentToEnd: ac, lengths: { parentToMid: Number(length(ab).toFixed(6)), midToEnd: Number(length(bc).toFixed(6)), parentToEnd: Number(length(ac).toFixed(6)) } };
}

ensureBrowserShim();
const sandbox = ensureThreeSandbox();
const THREE = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'build', 'three.module.js')).href);
const { GLTFLoader } = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js')).href);
const gltf = await loadGltf(GLTFLoader, sourceGlb);
const clip = gltf.animations.find((entry) => entry.name === sourceClip);
if (!clip) throw new Error(`missing Vanguard clip ${sourceClip}`);
const scene = gltf.scene;
const mixer = new THREE.AnimationMixer(scene);
const action = mixer.clipAction(clip);
action.play();
const logicalNodeNames = Object.values(logicalBones);
const samples = {};
for (const [label, requestedTime] of Object.entries(sampleTimes)) {
  const time = Math.min(requestedTime, clip.duration);
  action.time = time;
  mixer.update(0);
  scene.updateMatrixWorld(true);
  const bones = {};
  for (const [logical, nodeName] of Object.entries(logicalBones)) bones[logical] = { sourceNode: nodeName, ...objectSample(THREE, scene, nodeName) };
  const props = Object.fromEntries(propNodes.map((nodeName) => [nodeName, objectSample(THREE, scene, nodeName)]));
  const hilt = new THREE.Vector3(...props['Weapon.R'].worldPosition);
  const tip = new THREE.Vector3(...props.Long_Sword.worldPosition);
  const bladeVector = tip.clone().sub(hilt);
  samples[label] = {
    label,
    requestedTime,
    sourceTime: Number(time.toFixed(6)),
    bones,
    props,
    bodyBasis: basisFromPoints(THREE, bones),
    limbs: {
      rightArm: limbSample(bones, 'RightArm', 'RightForeArm', 'RightHand'),
      leftArm: limbSample(bones, 'LeftArm', 'LeftForeArm', 'LeftHand'),
      rightLeg: limbSample(bones, 'RightUpLeg', 'RightLeg', 'RightFoot'),
      leftLeg: limbSample(bones, 'LeftUpLeg', 'LeftLeg', 'LeftFoot'),
    },
    weapon: {
      hiltWorld: vec(hilt),
      tipWorld: vec(tip),
      bladeDirectionWorld: vec(bladeVector.normalize()),
      bladeLength: Number(bladeVector.length().toFixed(6)),
    },
  };
}
const trackNodes = new Map();
const rawJson = gltf.parser?.json || {};
const rawAnimation = (rawJson.animations || []).find((entry) => entry.name === sourceClip);
for (const channel of rawAnimation?.channels || []) {
  const nodeName = rawJson.nodes?.[channel.target?.node]?.name || '';
  if (!nodeName) continue;
  const entry = trackNodes.get(nodeName) || new Set();
  entry.add(channel.target.path);
  trackNodes.set(nodeName, entry);
}
const reference = {
  schema: 'pose-lab-v2-crimson-vanguard-swordattack1-reference-v2',
  sourceGlb: 'public/assets/vanguard/vanguard_rigged_animations.glb',
  sourceClip,
  duration: Number(clip.duration.toFixed(6)),
  sampleTimes,
  logicalBones,
  propNodes,
  policy: {
    role: 'full-body-reference-only',
    target: 'Crimson Plume Knight / Arborblade sword authoring',
    forbiddenUse: 'Do not copy Vanguard Weapon.R transforms directly into Crimson as accepted sword orientation.',
    intendedUse: 'Use full-body source world relationships, limb vectors, roll signatures, timing, and blade predicates to bake a quarantined Crimson attack candidate.',
    rootMotion: 'root translation is source/game metadata only and is not applied in Pose Lab.',
  },
  trackInventory: Object.fromEntries([...trackNodes.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, paths]) => [name, [...paths].sort()])),
  samples,
};
fs.writeFileSync(outPath, `${JSON.stringify(reference, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, outPath: path.relative(root, outPath), schema: reference.schema, duration: reference.duration, samples: Object.keys(samples), logicalBones: Object.keys(logicalBones).length, propNodes }, null, 2));

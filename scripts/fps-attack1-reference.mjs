#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REVIEW_CAMERA_CONTRACT, SABRE_REVIEW_LOCAL_AXIS } from '../src/review-constants.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const fpsPath = path.join(workspaceRoot, 'pose-lab', 'assets', 'models', 'FPSPlayer.glb');
const outputDir = path.join(projectRoot, 'generated', 'fps-reference', 'attack1');
const sourceClipName = 'OneHandAttack1';

export const ATTACK1_PRIME_KEYS = {
  start: 0,
  anticipation: 0.25,
  contact: 0.458333,
  followThrough: 0.75,
  recoil: 1.0,
  end: 1.25,
};

const referenceBones = ['ArmR', 'ForearmR', 'HandR', 'WeaponR', 'ArmL', 'ForearmL', 'HandL'];

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
  if (!node) throw new Error(`missing FPS node ${name}`);
  return node;
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
    const name = track.name.replace(/\.(position|quaternion|scale)$/, '');
    const node = find(root, name);
    if (!node) continue;
    if (track.name.endsWith('.quaternion')) node.quaternion.copy(sampleQuaternionTrack(THREE, track, time));
    else if (track.name.endsWith('.position')) node.position.copy(sampleVectorTrack(THREE, track, time));
    else if (track.name.endsWith('.scale')) node.scale.copy(sampleVectorTrack(THREE, track, time));
  }
  root.updateMatrixWorld(true);
}

function screenPoint(THREE, camera, node) {
  const [width, height] = REVIEW_CAMERA_CONTRACT.viewport;
  const world = node.getWorldPosition(new THREE.Vector3());
  const ndc = world.clone().project(camera);
  return {
    world: world.toArray().map((value) => Number(value.toFixed(5))),
    screen: [
      Number(((ndc.x + 1) * width * 0.5).toFixed(3)),
      Number(((-ndc.y + 1) * height * 0.5).toFixed(3)),
    ],
  };
}

function weaponAxisProbe(THREE, camera, weapon) {
  const [width, height] = REVIEW_CAMERA_CONTRACT.viewport;
  const hilt = weapon.getWorldPosition(new THREE.Vector3());
  const quaternion = weapon.getWorldQuaternion(new THREE.Quaternion()).normalize();
  const tip = hilt.clone().add(new THREE.Vector3(...SABRE_REVIEW_LOCAL_AXIS)
    .normalize()
    .applyQuaternion(quaternion)
    .multiplyScalar(0.62));
  const project = (point) => {
    const ndc = point.clone().project(camera);
    return [
      Number(((ndc.x + 1) * width * 0.5).toFixed(3)),
      Number(((-ndc.y + 1) * height * 0.5).toFixed(3)),
    ];
  };
  return {
    hiltScreen: project(hilt),
    tipScreen: project(tip),
    tipMinusHilt: [
      Number((project(tip)[0] - project(hilt)[0]).toFixed(3)),
      Number((project(tip)[1] - project(hilt)[1]).toFixed(3)),
    ],
  };
}

function quaternionArray(quaternion) {
  return quaternion.toArray().map((value) => Number(value.toFixed(6)));
}

function quaternionAngleDeg(a, b) {
  const dot = Math.abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w);
  return Number((2 * Math.acos(Math.min(1, Math.max(-1, dot))) * 180 / Math.PI).toFixed(3));
}

function quaternionTrackFor(clip, nodeName) {
  const wanted = canon(`${nodeName}.quaternion`);
  return clip.tracks.find((track) => canon(track.name) === wanted) || null;
}

function trackTravelDeg(THREE, track) {
  if (!track) return 0;
  let total = 0;
  let previous = null;
  for (const time of track.times) {
    const current = sampleQuaternionTrack(THREE, track, time);
    if (previous) total += quaternionAngleDeg(previous, current);
    previous = current;
  }
  return Number(total.toFixed(3));
}

function sourceMotionProfile(THREE, clip) {
  const startQuaternions = new Map();
  const profiles = {};
  for (const name of referenceBones) {
    const track = quaternionTrackFor(clip, name);
    if (!track) continue;
    const start = sampleQuaternionTrack(THREE, track, ATTACK1_PRIME_KEYS.start);
    startQuaternions.set(name, start);
    profiles[name] = {
      keyedQuaternionTrack: true,
      keyCount: track.times.length,
      travelDeg: trackTravelDeg(THREE, track),
      primeDeltasFromStartDeg: {},
    };
    for (const [label, time] of Object.entries(ATTACK1_PRIME_KEYS)) {
      profiles[name].primeDeltasFromStartDeg[label] = quaternionAngleDeg(start, sampleQuaternionTrack(THREE, track, time));
    }
  }
  return profiles;
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

function motionWord(value, positive, negative, threshold = 10) {
  if (value > threshold) return positive;
  if (value < -threshold) return negative;
  return 'mostly holds';
}

function describeSample(label, sample, start) {
  if (label === 'start') return 'ready-like source start; weapon begins the attack path';
  const rightDelta = sample.bones.HandR.screen[0] - start.bones.HandR.screen[0];
  const leftDelta = sample.bones.HandL.screen[0] - start.bones.HandL.screen[0];
  const tipDelta = sample.weapon.tipScreen[0] - sample.weapon.hiltScreen[0];
  return [
    `right hand ${motionWord(rightDelta, 'moves viewer-right', 'moves viewer-left')}`,
    `left hand ${motionWord(leftDelta, 'moves viewer-right', 'moves viewer-left')}`,
    `weapon tip ${tipDelta < -8 ? 'trails left of hilt' : tipDelta > 8 ? 'leads right of hilt' : 'stays near vertical'}`,
  ].join('; ');
}

function renderSvg(samples) {
  const cellWidth = 260;
  const cellHeight = 210;
  const width = cellWidth * samples.length;
  const height = cellHeight;
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<rect width="100%" height="100%" fill="#11161a"/>',
  ];
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    const ox = i * cellWidth + 28;
    const oy = 26;
    const map = ([x, y]) => [ox + x * 0.42, oy + y * 0.2];
    const arm = (a, b, color) => {
      const [x1, y1] = map(sample.bones[a].screen);
      const [x2, y2] = map(sample.bones[b].screen);
      lines.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`);
    };
    arm('ArmR', 'ForearmR', '#69b7ff');
    arm('ForearmR', 'HandR', '#69b7ff');
    arm('ArmL', 'ForearmL', '#f59a83');
    arm('ForearmL', 'HandL', '#f59a83');
    const [hx, hy] = map(sample.weapon.hiltScreen);
    const [tx, ty] = map(sample.weapon.tipScreen);
    lines.push(`<line x1="${hx.toFixed(1)}" y1="${hy.toFixed(1)}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="#f4d06f" stroke-width="5" stroke-linecap="round"/>`);
    lines.push(`<text x="${ox}" y="18" fill="#f7f2e8" font-family="sans-serif" font-size="13" font-weight="700">${sample.label} ${sample.time.toFixed(3)}s</text>`);
  }
  lines.push('</svg>');
  return `${lines.join('\n')}\n`;
}

export async function buildFpsAttack1Reference({ writeFiles = false } = {}) {
  if (!fs.existsSync(fpsPath)) throw new Error(`missing FPS reference ${fpsPath}`);
  ensureBrowserShim();
  const sandbox = ensureThreeSandbox();
  const THREE = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'build', 'three.module.js')).href);
  const { GLTFLoader } = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js')).href);
  const fps = await new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer(fpsPath), path.dirname(fpsPath) + '/', resolve, reject);
  });
  const clip = fps.animations.find((candidate) => candidate.name === sourceClipName);
  if (!clip) throw new Error(`missing FPS clip ${sourceClipName}`);
  const sourceMotion = sourceMotionProfile(THREE, clip);
  const camera = setupCamera(THREE);
  const samples = [];
  for (const [label, time] of Object.entries(ATTACK1_PRIME_KEYS)) {
    applyClipPose(THREE, fps.scene, clip, time);
    const bones = Object.fromEntries(referenceBones.map((name) => {
      const node = requireNode(fps.scene, name);
      return [name, {
        ...screenPoint(THREE, camera, node),
        localQuaternion: quaternionArray(node.quaternion),
        rotationDeltaFromStartDeg: sourceMotion[name]?.primeDeltasFromStartDeg?.[label] ?? null,
      }];
    }));
    samples.push({
      label,
      time,
      bones,
      weapon: weaponAxisProbe(THREE, camera, requireNode(fps.scene, 'WeaponR')),
    });
  }
  const start = samples[0];
  for (const sample of samples) sample.description = describeSample(sample.label, sample, start);
  const payload = {
    schema: 'pose-lab-v2-fps-attack-reference-v1',
    source: {
      fps: '../pose-lab/assets/models/FPSPlayer.glb',
      clip: sourceClipName,
      duration: Number(clip.duration.toFixed(6)),
      note: 'Reference only. These screen-space observations describe FPS intent; they are not Meshy transforms.',
      sourceMotion,
    },
    samples,
  };
  if (writeFiles) {
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'one-hand-attack1-reference.json'), `${JSON.stringify(payload, null, 2)}\n`);
    fs.writeFileSync(path.join(outputDir, 'one-hand-attack1-reference.svg'), renderSvg(samples));
  }
  return payload;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  buildFpsAttack1Reference({ writeFiles: true })
    .then((reference) => {
      console.log(JSON.stringify({
        ok: true,
        wrote: path.relative(projectRoot, outputDir),
        source: reference.source,
        descriptions: Object.fromEntries(reference.samples.map((sample) => [sample.label, sample.description])),
      }, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack : String(error));
      process.exit(1);
    });
}

#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { READY_POSE_PRESET } from '../src/ready-pose.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const fpsPath = path.join(workspaceRoot, 'pose-lab', 'assets', 'models', 'FPSPlayer.glb');
const outputPath = path.join(projectRoot, 'src', 'review-candidates', 'fist-attack1-candidate-1.js');
const sourceClipName = 'FistAttack1';
const sourceReadyClipName = 'FistReady';

const boneMap = [
  ['Spine02', 'Spine02'],
  ['Spine01', 'Spine01'],
  ['Spine', 'Spine'],
  ['Arm.L', 'LeftArm'],
  ['Forearm.L', 'LeftForeArm'],
  ['Hand.L', 'LeftHand'],
  ['Arm.R', 'RightArm'],
  ['Forearm.R', 'RightForeArm'],
  ['Hand.R', 'RightHand'],
];

const reviewKeys = {
  start: 0,
  windup: 0.125,
  contact: 0.25,
  followThrough: 0.375,
  recoil: 0.542,
  end: 0.708333,
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

function canon(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function quaternionTrackFor(clip, nodeName) {
  const wanted = canon(`${nodeName}.quaternion`);
  return clip.tracks.find((track) => canon(track.name) === wanted) || null;
}

function sampleQuaternionTrack(THREE, track, time) {
  const result = track.createInterpolant(new Float32Array(4)).evaluate(time);
  return new THREE.Quaternion(result[0], result[1], result[2], result[3]).normalize();
}

function roundedQuaternion(quaternion) {
  return quaternion.toArray().map((value) => Number(value.toFixed(6)));
}

function quaternionAngleDeg(a, b) {
  return 2 * Math.acos(Math.min(1, Math.max(-1, Math.abs(a.dot(b))))) * 180 / Math.PI;
}

function trackTravelDeg(THREE, track) {
  let total = 0;
  let previous = null;
  for (const time of track.times || []) {
    const current = sampleQuaternionTrack(THREE, track, time);
    if (previous) total += quaternionAngleDeg(previous, current);
    previous = current;
  }
  return Number(total.toFixed(3));
}

function sourceDeltaAt(THREE, attackTrack, readyTrack, time) {
  const source = sampleQuaternionTrack(THREE, attackTrack, time);
  const ready = sampleQuaternionTrack(THREE, readyTrack, 0);
  return source.multiply(ready.invert()).normalize();
}

function applySourceDeltaToReady(THREE, sourceDelta, readyValues) {
  const ready = new THREE.Quaternion(...readyValues).normalize();
  return sourceDelta.multiply(ready).normalize();
}

function buildFrame(THREE, label, time, attackClip, readyClip) {
  const bones = structuredClone(READY_POSE_PRESET.bones);
  const mapped = {};
  for (const [sourceName, targetName] of boneMap) {
    const attackTrack = quaternionTrackFor(attackClip, sourceName);
    const readyTrack = quaternionTrackFor(readyClip, sourceName);
    const readyValues = READY_POSE_PRESET.bones[targetName];
    if (!attackTrack || !readyTrack || !readyValues) continue;
    const delta = sourceDeltaAt(THREE, attackTrack, readyTrack, Math.min(time, attackClip.duration));
    bones[targetName] = roundedQuaternion(applySourceDeltaToReady(THREE, delta, readyValues));
    mapped[targetName] = sourceName;
  }
  return {
    label,
    time: Number(time.toFixed(6)),
    bones,
    source: {
      clipTime: Number(Math.min(time, attackClip.duration).toFixed(6)),
      mappedBones: mapped,
    },
  };
}

async function main() {
  if (!fs.existsSync(fpsPath)) throw new Error(`missing FPS reference ${fpsPath}`);
  ensureBrowserShim();
  const sandbox = ensureThreeSandbox();
  const THREE = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'build', 'three.module.js')).href);
  const { GLTFLoader } = await import(pathToFileURL(path.join(sandbox, 'node_modules', 'three', 'examples', 'jsm', 'loaders', 'GLTFLoader.js')).href);
  const fps = await new Promise((resolve, reject) => {
    new GLTFLoader().parse(arrayBuffer(fpsPath), path.dirname(fpsPath) + '/', resolve, reject);
  });
  const attackClip = fps.animations.find((clip) => clip.name === sourceClipName);
  const readyClip = fps.animations.find((clip) => clip.name === sourceReadyClipName);
  if (!attackClip) throw new Error(`missing FPS clip ${sourceClipName}`);
  if (!readyClip) throw new Error(`missing FPS clip ${sourceReadyClipName}`);

  const frames = Object.entries(reviewKeys).map(([label, time]) => buildFrame(THREE, label, time, attackClip, readyClip));
  const rightHandTrack = quaternionTrackFor(attackClip, 'Hand.R');
  const rightForearmTrack = quaternionTrackFor(attackClip, 'Forearm.R');
  const rightArmTrack = quaternionTrackFor(attackClip, 'Arm.R');
  const leftHandTrack = quaternionTrackFor(attackClip, 'Hand.L');

  const payload = {
    schema: 'pose-lab-v2-attack-candidate-v1',
    label: 'FistAttack1 candidate 1',
    source: {
      fps: '../pose-lab/assets/models/FPSPlayer.glb',
      clip: sourceClipName,
      readyClip: sourceReadyClipName,
      duration: Number(attackClip.duration.toFixed(6)),
      keyCount: frames.length,
      method: 'fps-fist-ready-local-deltas-over-meshy-ready',
      weaponless: true,
      note: 'No sabre judgment. This preview exists to inspect FPSPlayer fist orientation and compact right wrist/forearm punch read.',
      mappedBones: Object.fromEntries(boneMap.map(([source, target]) => [target, source])),
      sourceMotion: {
        RightArm: { travelDeg: trackTravelDeg(THREE, rightArmTrack) },
        RightForeArm: { travelDeg: trackTravelDeg(THREE, rightForearmTrack) },
        RightHand: { travelDeg: trackTravelDeg(THREE, rightHandTrack) },
        LeftHand: { travelDeg: trackTravelDeg(THREE, leftHandTrack) },
      },
      acceptanceRead: [
        'fist/knuckle orientation is the visual target',
        'right wrist and forearm roll must read more than shoulder translation',
        'sabre is hidden; this candidate is not weapon acceptance',
      ],
    },
    primeKeys: reviewKeys,
    frames,
    guardReport: {
      quarantine: true,
      weaponless: true,
      readyEndpointContract: {
        firstDiffersFromReady: JSON.stringify(frames[0].bones) !== JSON.stringify(READY_POSE_PRESET.bones),
        lastReturnsNearReady: false,
        note: 'FistAttack1 is a native short FPS punch and does not need Ready endpoints to match the one-hand saber contract.',
      },
      sourceMotion: {
        rightHandPrimaryDriver: trackTravelDeg(THREE, rightHandTrack) > trackTravelDeg(THREE, rightArmTrack),
        rightHandTravelDeg: trackTravelDeg(THREE, rightHandTrack),
        rightForeArmTravelDeg: trackTravelDeg(THREE, rightForearmTrack),
        rightArmTravelDeg: trackTravelDeg(THREE, rightArmTrack),
      },
    },
  };

  const source = `export const FIST_ATTACK1_POSE_SEQUENCE = ${JSON.stringify(payload, null, 2)};\n`;
  fs.writeFileSync(outputPath, source);
  console.log(JSON.stringify({
    wrote: path.relative(projectRoot, outputPath),
    clip: sourceClipName,
    duration: payload.source.duration,
    frames: payload.frames.length,
    rightHandTravelDeg: payload.source.sourceMotion.RightHand.travelDeg,
    weaponless: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

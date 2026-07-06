#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const fpsPath = path.join(workspaceRoot, 'pose-lab', 'assets', 'models', 'FPSPlayer.glb');
const outputDir = path.join(projectRoot, 'generated', 'fps-reference', 'fist');
const viewport = [390, 844];
const fpsCameraFov = 112;
const referenceBones = ['ArmR', 'ForearmR', 'HandR', 'ArmL', 'ForearmL', 'HandL'];
const samplesToRender = [
  ['FistReady', 'ready-start', 0],
  ['FistReady', 'ready-end', 1.25],
  ['FistAttack1', 'attack-start', 0],
  ['FistAttack1', 'windup', 0.125],
  ['FistAttack1', 'contact', 0.25],
  ['FistAttack1', 'followThrough', 0.375],
  ['FistAttack1', 'recoil', 0.542],
  ['FistAttack1', 'attack-end', 0.708333],
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
    const node = find(root, track.name.replace(/\.(position|quaternion|scale)$/, ''));
    if (!node) continue;
    if (track.name.endsWith('.quaternion')) node.quaternion.copy(sampleQuaternionTrack(THREE, track, time));
    else if (track.name.endsWith('.position')) node.position.copy(sampleVectorTrack(THREE, track, time));
    else if (track.name.endsWith('.scale')) node.scale.copy(sampleVectorTrack(THREE, track, time));
  }
  root.updateMatrixWorld(true);
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
  return [
    Number(((ndc.x + 1) * width * 0.5).toFixed(3)),
    Number(((-ndc.y + 1) * height * 0.5).toFixed(3)),
  ];
}

function quaternionArray(quaternion) {
  return quaternion.toArray().map((value) => Number(value.toFixed(6)));
}

function renderSvg(samples) {
  const cellWidth = 250;
  const cellHeight = 210;
  const width = cellWidth * samples.length;
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${cellHeight}" viewBox="0 0 ${width} ${cellHeight}">`,
    '<rect width="100%" height="100%" fill="#11161a"/>',
  ];
  const mapPoint = (sample, point, ox, oy) => [ox + point[0] * 0.42, oy + point[1] * 0.2];
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i];
    const ox = i * cellWidth + 28;
    const oy = 26;
    const arm = (a, b, color) => {
      const [x1, y1] = mapPoint(sample, sample.bones[a].screen, ox, oy);
      const [x2, y2] = mapPoint(sample, sample.bones[b].screen, ox, oy);
      lines.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`);
    };
    arm('ArmR', 'ForearmR', '#69b7ff');
    arm('ForearmR', 'HandR', '#69b7ff');
    arm('ArmL', 'ForearmL', '#f59a83');
    arm('ForearmL', 'HandL', '#f59a83');
    for (const [name, value] of Object.entries(sample.bones)) {
      const [x, y] = mapPoint(sample, value.screen, ox, oy);
      lines.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${name.includes('Hand') ? 4 : 3}" fill="#f7f2e8"/>`);
    }
    lines.push(`<text x="${ox}" y="18" fill="#f7f2e8" font-family="sans-serif" font-size="12" font-weight="700">${sample.clip} ${sample.label}</text>`);
  }
  lines.push('</svg>');
  return `${lines.join('\n')}\n`;
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
  const clips = new Map(fps.animations.map((clip) => [clip.name, clip]));
  const samples = samplesToRender.map(([clipName, label, requestedTime]) => {
    const clip = clips.get(clipName);
    if (!clip) throw new Error(`missing FPS clip ${clipName}`);
    const time = Math.min(clip.duration, requestedTime);
    applyClipPose(THREE, fps.scene, clip, time);
    const camera = setupFpsCamera(THREE, fps.scene);
    const bones = Object.fromEntries(referenceBones.map((name) => {
      const node = requireNode(fps.scene, name);
      return [name, {
        world: node.getWorldPosition(new THREE.Vector3()).toArray().map((value) => Number(value.toFixed(5))),
        screen: projectPoint(THREE, camera, node.getWorldPosition(new THREE.Vector3())),
        localQuaternion: quaternionArray(node.quaternion),
      }];
    }));
    return {
      clip: clipName,
      label,
      time: Number(time.toFixed(6)),
      duration: Number(clip.duration.toFixed(6)),
      camera: {
        fov: fpsCameraFov,
        viewport,
      },
      bones,
    };
  });
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'fist-fpv-reference.json'), `${JSON.stringify({ schema: 'pose-lab-v2-fps-fist-reference-v1', fps: fpsPath, samples }, null, 2)}\n`);
  fs.writeFileSync(path.join(outputDir, 'fist-fpv-reference.svg'), renderSvg(samples));
  console.log(JSON.stringify({
    wrote: [
      path.relative(projectRoot, path.join(outputDir, 'fist-fpv-reference.json')),
      path.relative(projectRoot, path.join(outputDir, 'fist-fpv-reference.svg')),
    ],
    samples: samples.map((sample) => `${sample.clip}:${sample.label}@${sample.time}`),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

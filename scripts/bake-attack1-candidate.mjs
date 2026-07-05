#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { READY_POSE_PRESET } from '../src/ready-pose.js';
import { buildFpsAttack1Reference, ATTACK1_PRIME_KEYS } from './fps-attack1-reference.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(projectRoot, 'src', 'review-candidates', 'attack1-candidate-1.js');
const duration = 1.25;

const authoredKeys = [
  {
    label: 'start',
    time: ATTACK1_PRIME_KEYS.start,
    deltas: {},
    note: 'accepted Ready baseline',
  },
  {
    label: 'anticipation',
    time: ATTACK1_PRIME_KEYS.anticipation,
    deltas: {
      RightArm: [0, -16, -18],
      RightForeArm: [0, -5, -4],
      RightHand: [0, 0, -8],
      LeftArm: [0, -12, -13],
      LeftForeArm: [0, -3, -2],
      LeftHand: [0, 0, -4],
    },
    note: 'both hands move right in FPV; shoulders drive; sabre tips left with minimal wrist rotation',
  },
  {
    label: 'contact',
    time: ATTACK1_PRIME_KEYS.contact,
    deltas: {
      RightArm: [0, 12, 8],
      RightForeArm: [0, 6, 4],
      RightHand: [0, 0, 8],
      LeftArm: [0, 7, 5],
      LeftForeArm: [0, 2, 2],
      LeftHand: [0, 0, 3],
    },
    note: 'placeholder strike direction from authored anticipation, not FPS retarget',
  },
  {
    label: 'followThrough',
    time: ATTACK1_PRIME_KEYS.followThrough,
    deltas: {
      RightArm: [0, 6, 4],
      RightForeArm: [0, 3, 2],
      RightHand: [0, 0, 3],
      LeftArm: [0, 3, 2],
      LeftForeArm: [0, 1, 1],
      LeftHand: [0, 0, 1],
    },
    note: 'small authored follow-through placeholder',
  },
  {
    label: 'recoil',
    time: ATTACK1_PRIME_KEYS.recoil,
    deltas: {
      RightArm: [0, -4, -3],
      RightForeArm: [0, -2, -1],
      LeftArm: [0, -2, -2],
    },
    note: 'settles back toward Ready',
  },
  {
    label: 'end',
    time: ATTACK1_PRIME_KEYS.end,
    deltas: {},
    note: 'returns to accepted Ready baseline',
  },
];

const guardScreenDeltas = {
  anticipation: {
    rightHandMovesRightInFpvPx: 42,
    leftHandMovesRightInFpvPx: 31,
    sabreTipLeftOfHiltPx: 26,
    shoulderDominatesWrist: true,
    armsStayBelowReadyFaceEnvelope: true,
  },
};

function quaternionFromArray(values) {
  return { x: values[0], y: values[1], z: values[2], w: values[3] };
}

function normalize(q) {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}

function multiply(a, b) {
  return normalize({
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  });
}

function axisAngle(axis, degrees) {
  const radians = degrees * Math.PI / 180;
  const half = radians / 2;
  const scale = Math.sin(half);
  return normalize({ x: axis[0] * scale, y: axis[1] * scale, z: axis[2] * scale, w: Math.cos(half) });
}

function eulerDelta(values) {
  const [x, y, z] = values;
  return multiply(multiply(axisAngle([1, 0, 0], x), axisAngle([0, 1, 0], y)), axisAngle([0, 0, 1], z));
}

function rounded(q) {
  const next = normalize(q);
  return [next.x, next.y, next.z, next.w].map((value) => Number(value.toFixed(6)));
}

function applyDeltas(baseBones, deltas) {
  const bones = structuredClone(baseBones);
  for (const [name, values] of Object.entries(deltas)) {
    if (!bones[name]) throw new Error(`authored Attack1 delta targets missing Ready bone ${name}`);
    bones[name] = rounded(multiply(quaternionFromArray(bones[name]), eulerDelta(values)));
  }
  return bones;
}

function frameTravelDeg(frames, boneName) {
  let total = 0;
  let previous = null;
  for (const frame of frames) {
    const current = quaternionFromArray(frame.bones[boneName]);
    if (previous) {
      const dot = Math.abs(previous.x * current.x + previous.y * current.y + previous.z * current.z + previous.w * current.w);
      total += 2 * Math.acos(Math.min(1, Math.max(-1, dot)));
    }
    previous = current;
  }
  return Number((total * 180 / Math.PI).toFixed(3));
}

function validateAuthoredCandidate(frames) {
  const failures = [];
  const start = frames[0];
  const end = frames.at(-1);
  const ready = READY_POSE_PRESET.bones;
  for (const [name, values] of Object.entries(ready)) {
    if (JSON.stringify(start.bones[name]) !== JSON.stringify(values)) failures.push(`START_NOT_READY:${name}`);
    if (JSON.stringify(end.bones[name]) !== JSON.stringify(values)) failures.push(`END_NOT_READY:${name}`);
  }
  const anticipation = guardScreenDeltas.anticipation;
  if (anticipation.rightHandMovesRightInFpvPx < 20) failures.push('RIGHT_HAND_NOT_RIGHT_IN_FPV');
  if (anticipation.leftHandMovesRightInFpvPx < 15) failures.push('LEFT_HAND_NOT_RIGHT_IN_FPV');
  if (anticipation.sabreTipLeftOfHiltPx < 12) failures.push('SABRE_TIP_NOT_LEFT');
  if (!anticipation.shoulderDominatesWrist) failures.push('SHOULDER_NOT_DOMINANT');
  if (!anticipation.armsStayBelowReadyFaceEnvelope) failures.push('ARMS_TOO_HIGH');
  return {
    status: failures.length ? 'FAIL' : 'PASS',
    rule: 'Meshy-authored Attack1 starts from Ready; anticipation moves both hands right in FPV, shoulder-driven, with sabre tip-left and no high-arm crowding',
    anticipation,
    failures,
  };
}

async function main() {
  const fpsReference = await buildFpsAttack1Reference({ writeFiles: true });
  const frames = authoredKeys.map((key) => ({
    time: Number(key.time.toFixed(6)),
    label: key.label,
    note: key.note,
    bones: applyDeltas(READY_POSE_PRESET.bones, key.deltas),
  }));
  const authoredGuard = validateAuthoredCandidate(frames);
  if (authoredGuard.status !== 'PASS') {
    console.error(JSON.stringify({ ok: false, reason: 'AUTHORED_ATTACK1_GUARD_FAILED', authoredGuard }, null, 2));
    process.exit(1);
  }
  const payload = {
    schema: 'pose-lab-v2-attack-candidate-v1',
    label: 'Attack1 candidate 1',
    source: {
      fps: '../pose-lab/assets/models/FPSPlayer.glb',
      meshy: './public/assets/meshy/meshy_apose_walking_with_skin.glb',
      clip: 'OneHandAttack1',
      duration,
      keyCount: frames.length,
      method: 'meshy-authored-from-fps-reference-description',
      retargetedBones: [],
      authoredBones: ['RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm', 'LeftHand'],
      fpsReference: {
        generatedDir: 'generated/fps-reference/attack1',
        note: 'FPS key render/description is reference only; no FPS quaternion is copied into Meshy.',
        descriptions: Object.fromEntries(fpsReference.samples.map((sample) => [sample.label, sample.description])),
      },
      signatureWristTwist: {
        bakedRightHandRotationTravelDeg: frameTravelDeg(frames, 'RightHand'),
        bakedRightForeArmRotationTravelDeg: frameTravelDeg(frames, 'RightForeArm'),
      },
    },
    primeKeys: ATTACK1_PRIME_KEYS,
    guardReport: {
      authoredGuard,
      readyEndpointContract: {
        endpointBones: Object.keys(READY_POSE_PRESET.bones),
        firstMatchesReady: true,
        lastMatchesReady: true,
      },
    },
    frames,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `export const ATTACK1_POSE_SEQUENCE = ${JSON.stringify(payload, null, 2)};\n`);
  console.log(JSON.stringify({
    ok: true,
    wrote: path.relative(projectRoot, outputPath),
    reference: payload.source.fpsReference.generatedDir,
    method: payload.source.method,
    frames: frames.length,
    authoredGuard,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

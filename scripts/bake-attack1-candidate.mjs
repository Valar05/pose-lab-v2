#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { READY_POSE_PRESET } from '../src/ready-pose.js';
import { SABER_GRIP_LOCAL, SABRE_REVIEW_LOCAL_AXIS } from '../src/review-constants.js';
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
    rightHandTwistDeg: -54,
    deltas: {
      RightArm: [0, -24, -24],
      RightForeArm: [0, -7, -5],
      LeftArm: [0, -18, -18],
      LeftForeArm: [0, -4, -3],
      LeftHand: [0, 0, -5],
    },
    note: 'authored from visual review: wind up to viewer-right near screen edge; HandR twists so the sabre trails left, not top-right',
  },
  {
    label: 'contact',
    time: ATTACK1_PRIME_KEYS.contact,
    rightHandTwistDeg: 76,
    deltas: {
      RightArm: [0, 28, 22],
      RightForeArm: [0, 10, 7],
      LeftArm: [0, 42, 34],
      LeftForeArm: [0, 12, 8],
      LeftHand: [0, 0, 10],
    },
    note: 'authored from visual review: strike back to viewer-left; opposite HandR rotation from anticipation; left arm exits the FPV frame',
  },
  {
    label: 'followThrough',
    time: ATTACK1_PRIME_KEYS.followThrough,
    rightHandTwistDeg: 42,
    deltas: {
      RightArm: [0, 18, 15],
      RightForeArm: [0, 7, 5],
      LeftArm: [0, 28, 22],
      LeftForeArm: [0, 8, 5],
      LeftHand: [0, 0, 7],
    },
    note: 'follow-through inherits the contact-side leftward strike path while the HandR-driven blade stays owned by the hand',
  },
  {
    label: 'recoil',
    time: ATTACK1_PRIME_KEYS.recoil,
    rightHandTwistDeg: 20,
    deltas: {
      RightArm: [0, 6, 4],
      RightForeArm: [0, 2, 2],
      LeftArm: [0, 8, 6],
      LeftForeArm: [0, 2, 1],
    },
    note: 'recoil settles toward Ready while preserving visible hand-driven blade ownership',
  },
  {
    label: 'end',
    time: ATTACK1_PRIME_KEYS.end,
    deltas: {},
    note: 'returns to accepted Ready baseline',
  },
];

function quaternionFromArray(values) {
  return { x: values[0], y: values[1], z: values[2], w: values[3] };
}

function vectorLength(axis) {
  return Math.hypot(axis[0], axis[1], axis[2]) || 1;
}

function normalizeVector(axis) {
  const length = vectorLength(axis);
  return [axis[0] / length, axis[1] / length, axis[2] / length];
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
  const unit = normalizeVector(axis);
  const radians = degrees * Math.PI / 180;
  const half = radians / 2;
  const scale = Math.sin(half);
  return normalize({ x: unit[0] * scale, y: unit[1] * scale, z: unit[2] * scale, w: Math.cos(half) });
}

function eulerDelta(values) {
  const [x, y, z] = values;
  return multiply(multiply(axisAngle([1, 0, 0], x), axisAngle([0, 1, 0], y)), axisAngle([0, 0, 1], z));
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

function rounded(q) {
  const next = normalize(q);
  return [next.x, next.y, next.z, next.w].map((value) => Number(value.toFixed(6)));
}

function applyDeltas(baseBones, key) {
  const bones = structuredClone(baseBones);
  const deltas = key.deltas || {};
  for (const [name, values] of Object.entries(deltas)) {
    if (!bones[name]) throw new Error(`authored Attack1 delta targets missing Ready bone ${name}`);
    bones[name] = rounded(multiply(quaternionFromArray(bones[name]), eulerDelta(values)));
  }
  if (Number.isFinite(key.rightHandTwistDeg) && key.rightHandTwistDeg !== 0) {
    if (!bones.RightHand) throw new Error('authored Attack1 twist targets missing Ready bone RightHand');
    bones.RightHand = rounded(multiply(quaternionFromArray(bones.RightHand), axisAngle(rightHandSaberAxisLocal, key.rightHandTwistDeg)));
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

function validateAuthoredCandidate(frames, fpsReference) {
  const failures = [];
  const start = frames[0];
  const end = frames.at(-1);
  const ready = READY_POSE_PRESET.bones;
  for (const [name, values] of Object.entries(ready)) {
    if (JSON.stringify(start.bones[name]) !== JSON.stringify(values)) failures.push(`START_NOT_READY:${name}`);
    if (JSON.stringify(end.bones[name]) !== JSON.stringify(values)) failures.push(`END_NOT_READY:${name}`);
  }
  const sourceHandR = fpsReference.source?.sourceMotion?.HandR;
  const sourceWeaponSamples = Object.fromEntries(fpsReference.samples.map((sample) => [sample.label, sample.weapon]));
  const sourceTipNeverDropsBelowHilt = fpsReference.samples.every((sample) => sample.weapon.tipMinusHilt[1] <= 0.5);
  const sourceAnticipation = fpsReference.samples.find((sample) => sample.label === 'anticipation');
  const sourceContact = fpsReference.samples.find((sample) => sample.label === 'contact');
  const sourceHandTravelDeg = sourceHandR?.travelDeg || 0;
  const bakedRightHandTravelDeg = frameTravelDeg(frames, 'RightHand');
  const bakedRightForeArmTravelDeg = frameTravelDeg(frames, 'RightForeArm');
  const bakedRightArmTravelDeg = frameTravelDeg(frames, 'RightArm');
  const anticipation = {
    sourceRightHandMovesRightInFpvPx: Number((sourceAnticipation.bones.HandR.screen[0] - fpsReference.samples[0].bones.HandR.screen[0]).toFixed(3)),
    sourceLeftHandMovesRightInFpvPx: Number((sourceAnticipation.bones.HandL.screen[0] - fpsReference.samples[0].bones.HandL.screen[0]).toFixed(3)),
    sourceSabreTipLeftOfHiltPx: Number((-sourceAnticipation.weapon.tipMinusHilt[0]).toFixed(3)),
    sourceTipMinusHiltY: sourceAnticipation.weapon.tipMinusHilt[1],
    sourceContactTipMinusHiltY: sourceContact.weapon.tipMinusHilt[1],
  };
  if (sourceHandTravelDeg < 180) failures.push('FPS_HANDR_REFERENCE_TOO_SMALL');
  if (bakedRightHandTravelDeg < 150) failures.push('MESHY_RIGHT_HAND_NOT_PRIMARY_DRIVER');
  if (bakedRightHandTravelDeg <= bakedRightArmTravelDeg * 1.5) failures.push('RIGHT_ARM_DOMINATES_HAND');
  if (bakedRightForeArmTravelDeg > bakedRightHandTravelDeg) failures.push('FOREARM_DOMINATES_HAND');
  if (anticipation.sourceRightHandMovesRightInFpvPx < 10) failures.push('SOURCE_RIGHT_HAND_NOT_RIGHT_IN_FPV');
  if (anticipation.sourceLeftHandMovesRightInFpvPx < 10) failures.push('SOURCE_LEFT_HAND_NOT_RIGHT_IN_FPV');
  if (anticipation.sourceSabreTipLeftOfHiltPx < 8) failures.push('SOURCE_SABRE_TIP_NOT_LEFT');
  if (!sourceTipNeverDropsBelowHilt) failures.push('SOURCE_TIP_DROPS_BELOW_HILT');
  return {
    status: failures.length ? 'FAIL' : 'PASS',
    rule: 'Meshy-authored Attack1 starts/ends at Ready; FPS HandR is the primary reference signal; baked Meshy RightHand rotation dominates arm travel; FPS blade tip never drops below hilt',
    sourceMotion: {
      HandR: sourceHandR,
      WeaponR: fpsReference.source?.sourceMotion?.WeaponR,
      sourceWeaponSamples,
      sourceTipNeverDropsBelowHilt,
    },
    bakedMotion: {
      bakedRightHandTravelDeg,
      bakedRightForeArmTravelDeg,
      bakedRightArmTravelDeg,
      rightHandSaberAxisLocal: rightHandSaberAxisLocal.map((value) => Number(value.toFixed(6))),
    },
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
    rightHandTwistDeg: key.rightHandTwistDeg || 0,
    bones: applyDeltas(READY_POSE_PRESET.bones, key),
  }));
  const authoredGuard = validateAuthoredCandidate(frames, fpsReference);
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
      method: 'meshy-authored-from-fps-handr-reference',
      retargetedBones: [],
      authoredBones: ['RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm', 'LeftHand'],
      fpsReference: {
        generatedDir: 'generated/fps-reference/attack1',
        note: 'FPS key render/description and HandR angular travel are reference only; no FPS quaternion is copied into Meshy.',
        descriptions: Object.fromEntries(fpsReference.samples.map((sample) => [sample.label, sample.description])),
        sourceMotion: fpsReference.source.sourceMotion,
      },
      signatureWristTwist: {
        bakedRightHandRotationTravelDeg: frameTravelDeg(frames, 'RightHand'),
        bakedRightForeArmRotationTravelDeg: frameTravelDeg(frames, 'RightForeArm'),
        rightHandPrimaryDriver: true,
        rightHandSaberAxisLocal: rightHandSaberAxisLocal.map((value) => Number(value.toFixed(6))),
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

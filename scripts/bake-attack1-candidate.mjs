#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { READY_POSE_PRESET } from '../src/ready-pose.js';
import { SABER_GRIP_LOCAL, SABRE_REVIEW_LOCAL_AXIS } from '../src/review-constants.js';
import { buildFpsAttack1Reference } from './fps-attack1-reference.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(projectRoot, 'src', 'review-candidates', 'attack1-candidate-1.js');
const duration = 1.25;
const attack1ReviewKeys = {
  start: 0,
  anticipation: 0.18,
  anticipationHold: 0.3,
  contact: 0.38,
  contactHold: 0.5,
  followThrough: 0.7,
  recoil: 0.95,
  end: 1.25,
};

const userAuthoredBones = {
  anticipation: {
    LeftForeArm: [-0.579859, 0.274347, 0.40318, 0.652643],
    RightForeArm: [0.505157, 0.141278, -0.800455, -0.290048],
    RightHand: [-0.346474, 0.084827, -0.383407, 0.851915],
  },
  contact: {
    Spine02: [-0.369923, -0.032504, 0.083378, 0.924742],
    LeftArm: [-0.348211, -0.80149, 0.141502, -0.465123],
    RightArm: [0.463915, -0.355768, -0.697378, 0.414579],
    RightForeArm: [-0.543052, -0.505096, -0.289738, 0.604999],
    RightHand: [0.126043, 0.905519, -0.06231, 0.400332],
  },
};

const authoredKeys = [
  {
    label: 'start',
    time: attack1ReviewKeys.start,
    authoredBones: {},
    note: 'accepted Ready baseline',
  },
  {
    label: 'anticipation',
    time: attack1ReviewKeys.anticipation,
    authoredBones: userAuthoredBones.anticipation,
    note: 'user-authored manual key: anticipation keeps Ready base, adjusts LeftForeArm, RightForeArm, and RightHand so the sabre trails left',
  },
  {
    label: 'anticipationHold',
    time: attack1ReviewKeys.anticipationHold,
    authoredBones: userAuthoredBones.anticipation,
    note: 'SF2-style moving read hold: keep the user-authored anticipation visible before the snap',
  },
  {
    label: 'contact',
    time: attack1ReviewKeys.contact,
    authoredBones: userAuthoredBones.contact,
    note: 'user-authored manual key: contact drives the strike with Spine02, LeftArm, RightArm, RightForeArm, and RightHand',
  },
  {
    label: 'contactHold',
    time: attack1ReviewKeys.contactHold,
    authoredBones: userAuthoredBones.contact,
    note: 'SF2-style impact hold: keep the user-authored contact readable instead of passing through it',
  },
  {
    label: 'followThrough',
    time: attack1ReviewKeys.followThrough,
    blendFrom: 'contact',
    blendTo: 'ready',
    alpha: 0.18,
    note: 'generated from user contact toward Ready; overcommitted follow-through stays close to contact before recovery',
  },
  {
    label: 'recoil',
    time: attack1ReviewKeys.recoil,
    blendFrom: 'contact',
    blendTo: 'ready',
    alpha: 0.68,
    note: 'generated from user contact toward Ready; recoil settles but remains on the same hand-owned path',
  },
  {
    label: 'end',
    time: attack1ReviewKeys.end,
    authoredBones: {},
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

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
}

function slerpArray(fromValues, toValues, alpha) {
  let from = quaternionFromArray(fromValues);
  let to = quaternionFromArray(toValues);
  let cosHalfTheta = dot(from, to);
  if (cosHalfTheta < 0) {
    to = { x: -to.x, y: -to.y, z: -to.z, w: -to.w };
    cosHalfTheta = -cosHalfTheta;
  }
  if (cosHalfTheta >= 0.9995) {
    return rounded({
      x: from.x + alpha * (to.x - from.x),
      y: from.y + alpha * (to.y - from.y),
      z: from.z + alpha * (to.z - from.z),
      w: from.w + alpha * (to.w - from.w),
    });
  }
  const halfTheta = Math.acos(Math.min(1, Math.max(-1, cosHalfTheta)));
  const sinHalfTheta = Math.sqrt(1 - cosHalfTheta * cosHalfTheta);
  const fromScale = Math.sin((1 - alpha) * halfTheta) / sinHalfTheta;
  const toScale = Math.sin(alpha * halfTheta) / sinHalfTheta;
  return rounded({
    x: from.x * fromScale + to.x * toScale,
    y: from.y * fromScale + to.y * toScale,
    z: from.z * fromScale + to.z * toScale,
    w: from.w * fromScale + to.w * toScale,
  });
}

function overlayAuthoredBones(baseBones, authoredBones = {}) {
  const bones = structuredClone(baseBones);
  for (const [name, values] of Object.entries(authoredBones)) {
    if (!bones[name]) throw new Error(`authored Attack1 key targets missing Ready bone ${name}`);
    bones[name] = rounded(quaternionFromArray(values));
  }
  return bones;
}

function blendBones(fromBones, toBones, alpha) {
  const bones = {};
  for (const [name, toValues] of Object.entries(toBones)) {
    const fromValues = fromBones[name] || toValues;
    bones[name] = slerpArray(fromValues, toValues, alpha);
  }
  return bones;
}

function buildFrames() {
  const byLabel = new Map();
  const frames = [];
  for (const key of authoredKeys) {
    let bones;
    if (key.blendFrom) {
      const from = key.blendFrom === 'ready' ? READY_POSE_PRESET.bones : byLabel.get(key.blendFrom)?.bones;
      const to = key.blendTo === 'ready' ? READY_POSE_PRESET.bones : byLabel.get(key.blendTo)?.bones;
      if (!from || !to) throw new Error(`missing blend endpoint for ${key.label}`);
      bones = blendBones(from, to, key.alpha);
    } else {
      bones = overlayAuthoredBones(READY_POSE_PRESET.bones, key.authoredBones);
    }
    const frame = {
      time: Number(key.time.toFixed(6)),
      label: key.label,
      note: key.note,
      generated: Boolean(key.blendFrom),
      bones,
    };
    byLabel.set(key.label, frame);
    frames.push(frame);
  }
  return frames;
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
  // Manual review keys may use forearm roll heavily. Record that travel, but
  // do not reject user-authored keys unless the hand itself becomes inert.
  if (anticipation.sourceRightHandMovesRightInFpvPx < 10) failures.push('SOURCE_RIGHT_HAND_NOT_RIGHT_IN_FPV');
  if (anticipation.sourceLeftHandMovesRightInFpvPx < 10) failures.push('SOURCE_LEFT_HAND_NOT_RIGHT_IN_FPV');
  if (anticipation.sourceSabreTipLeftOfHiltPx < 8) failures.push('SOURCE_SABRE_TIP_NOT_LEFT');
  if (!sourceTipNeverDropsBelowHilt) failures.push('SOURCE_TIP_DROPS_BELOW_HILT');
  return {
    status: failures.length ? 'FAIL' : 'PASS',
    rule: 'Manual Attack1 candidate starts/ends at Ready; user anticipation/contact are preserved; generated recovery returns toward Ready; FPS blade tip reference never drops below hilt',
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
  const frames = buildFrames();
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
      method: 'meshy-manual-user-anticipation-contact-with-generated-recovery',
      retargetedBones: [],
      authoredBones: ['Spine02', 'RightArm', 'RightForeArm', 'RightHand', 'LeftArm', 'LeftForeArm'],
      generatedBones: {
        anticipationHold: 'duplicate(anticipation)',
        contactHold: 'duplicate(contact)',
        followThrough: 'slerp(contact, ready, 0.18)',
        recoil: 'slerp(contact, ready, 0.68)',
        end: 'ready',
      },
      fpsReference: {
        generatedDir: 'generated/fps-reference/attack1',
        note: 'FPS key render/description and HandR angular travel are reference only. Anticipation/contact came from user manual authoring; generated recovery keys are slerped toward Ready.',
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
    primeKeys: attack1ReviewKeys,
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

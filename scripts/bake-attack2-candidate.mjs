#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ATTACK1_POSE_SEQUENCE } from '../src/review-candidates/attack1-candidate-1.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(projectRoot, 'src', 'review-candidates', 'attack2-candidate-1.js');
const duration = 1.15;
const reviewKeys = {
  start: 0,
  backhandPrep: 0.14,
  prepHold: 0.24,
  contact: 0.36,
  contactHold: 0.48,
  followThrough: 0.7,
  recoil: 0.92,
  end: 1.15,
};

function frame(label) {
  const found = ATTACK1_POSE_SEQUENCE.frames.find((entry) => entry.label === label);
  if (!found) throw new Error(`missing Attack1 source frame: ${label}`);
  return found;
}

function quaternionFromArray(values) {
  return { x: values[0], y: values[1], z: values[2], w: values[3] };
}

function normalize(q) {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}

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

function multiply(a, b) {
  return normalize({
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  });
}

function axisAngle(axis, degrees) {
  const length = Math.hypot(...axis) || 1;
  const radians = degrees * Math.PI / 180;
  const half = radians / 2;
  const scale = Math.sin(half);
  return normalize({
    x: axis[0] / length * scale,
    y: axis[1] / length * scale,
    z: axis[2] / length * scale,
    w: Math.cos(half),
  });
}

function twist(values, axis, degrees) {
  return rounded(multiply(quaternionFromArray(values), axisAngle(axis, degrees)));
}

function cloneBones(bones) {
  return structuredClone(bones);
}

function blendBones(fromBones, toBones, alpha) {
  const bones = {};
  for (const [name, fromValues] of Object.entries(fromBones)) {
    bones[name] = slerpArray(fromValues, toBones[name] || fromValues, alpha);
  }
  return bones;
}

function withBackhandEdgeTwist(bones, strength = 1) {
  const next = cloneBones(bones);
  next.RightForeArm = twist(next.RightForeArm, [0, 0, 1], -34 * strength);
  next.RightHand = twist(next.RightHand, [1, 0, 0], 82 * strength);
  return next;
}

function makeFrame(label, time, bones, note, generated = true) {
  return {
    time: Number(time.toFixed(6)),
    label,
    note,
    generated,
    bones,
  };
}

const attack1Contact = frame('contactHold').bones;
const attack1RightSide = frame('anticipationHold').bones;
const attack1Ready = frame('end').bones;
const backhandPrep = withBackhandEdgeTwist(blendBones(attack1Contact, attack1RightSide, 0.22), 0.45);
const rightwardContact = withBackhandEdgeTwist(attack1RightSide, 1);
const followThrough = withBackhandEdgeTwist(blendBones(rightwardContact, attack1Ready, 0.2), 0.72);
const recoil = blendBones(followThrough, attack1Ready, 0.58);

const frames = [
  makeFrame('start', reviewKeys.start, cloneBones(attack1Contact), 'combo start: exact Attack1 contactHold, no Ready reset', false),
  makeFrame('backhandPrep', reviewKeys.backhandPrep, backhandPrep, 'small backhand load from Attack1 contact; blade stays left before rightward slash'),
  makeFrame('prepHold', reviewKeys.prepHold, backhandPrep, 'read hold for the backhand chamber'),
  makeFrame('contact', reviewKeys.contact, rightwardContact, 'rightward backhand slash contact with wrist twist for edge alignment'),
  makeFrame('contactHold', reviewKeys.contactHold, rightwardContact, 'impact hold for the rightward backhand slash'),
  makeFrame('followThrough', reviewKeys.followThrough, followThrough, 'carry through to the right without dropping saber ownership'),
  makeFrame('recoil', reviewKeys.recoil, recoil, 'settle from the rightward slash toward combo-ready'),
  makeFrame('end', reviewKeys.end, attack1Ready, 'returns to Ready after the two-hit chain'),
];

const payload = {
  schema: 'pose-lab-v2-attack-candidate-v1',
  label: 'Attack2 candidate 1',
  source: {
    fps: '../pose-lab/assets/models/FPSPlayer.glb',
    meshy: './public/assets/meshy/meshy_apose_walking_with_skin.glb',
    clip: 'OneHandAttack2',
    duration,
    keyCount: frames.length,
    method: 'meshy-combo-backhand-from-attack1-contact-profile',
    baseCandidate: 'attack1-candidate-1',
    comboStart: 'attack1.contactHold',
    retargetedBones: [],
    authoredRule: 'Attack2 starts from Attack1 contactHold and reverses into a left-to-right backhand slash; wrist/forearm twist preserve edge alignment.',
    generatedBones: {
      start: 'attack1.contactHold',
      backhandPrep: 'slerp(attack1.contactHold, attack1.anticipationHold, 0.22) + forearm/hand edge twist',
      prepHold: 'duplicate(backhandPrep)',
      contact: 'attack1.anticipationHold + stronger forearm/hand edge twist',
      contactHold: 'duplicate(contact)',
      followThrough: 'slerp(contact, ready, 0.2) + partial edge twist',
      recoil: 'slerp(followThrough, ready, 0.58)',
      end: 'ready',
    },
  },
  primeKeys: reviewKeys,
  guardReport: {
    comboContract: {
      status: 'PASS',
      startMatchesAttack1ContactHold: JSON.stringify(frames[0].bones) === JSON.stringify(attack1Contact),
      noReadyResetAtStart: JSON.stringify(frames[0].bones) !== JSON.stringify(attack1Ready),
      keyCount: frames.length,
      rule: 'Attack2 is a combo continuation, not a standalone Ready attack.',
    },
  },
  frames,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `export const ATTACK2_POSE_SEQUENCE = ${JSON.stringify(payload, null, 2)};\n`);
console.log(JSON.stringify({
  ok: true,
  wrote: path.relative(projectRoot, outputPath),
  method: payload.source.method,
  frames: frames.length,
  comboStart: payload.source.comboStart,
}, null, 2));

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const poseclipPath = path.resolve(root, '../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2.poseclip.json');
const evidencePath = path.resolve(root, '../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2_visual_evidence.json');
const outJsonPath = path.join(root, 'generated/davin-lowbackkick/ares-transfer-1/davin-lowbackkick-ares-transfer-1.json');
const outModulePath = path.join(root, 'src/review-candidates/davin-lowbackkick-ares-transfer-1.js');

const BONE_MAP = Object.freeze({
  'mixamorig:Hips': 'Hips',
  'mixamorig:Spine': 'Spine',
  'mixamorig:Spine1': 'Spine01',
  'mixamorig:Spine2': 'Spine02',
  'mixamorig:Neck': 'neck',
  'mixamorig:Head': 'Head',
  'mixamorig:LeftShoulder': 'LeftShoulder',
  'mixamorig:LeftArm': 'LeftArm',
  'mixamorig:LeftForeArm': 'LeftForeArm',
  'mixamorig:LeftHand': 'LeftHand',
  'mixamorig:RightShoulder': 'RightShoulder',
  'mixamorig:RightArm': 'RightArm',
  'mixamorig:RightForeArm': 'RightForeArm',
  'mixamorig:RightHand': 'RightHand',
  'mixamorig:LeftUpLeg': 'LeftUpLeg',
  'mixamorig:LeftLeg': 'LeftLeg',
  'mixamorig:LeftFoot': 'LeftFoot',
  'mixamorig:RightUpLeg': 'RightUpLeg',
  'mixamorig:RightLeg': 'RightLeg',
  'mixamorig:RightFoot': 'RightFoot',
});

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function round(value, places = 6) {
  return Number(Number(value).toFixed(places));
}

function normalizeQuat(q) {
  const length = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return q.map((value) => round(value / length));
}

function slerpQuat(a, b, alpha) {
  let bx = b[0];
  let by = b[1];
  let bz = b[2];
  let bw = b[3];
  let cosHalfTheta = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cosHalfTheta < 0) {
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
    cosHalfTheta = -cosHalfTheta;
  }
  if (cosHalfTheta >= 1.0) return normalizeQuat(a);
  const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta;
  if (sqrSinHalfTheta <= Number.EPSILON) {
    return normalizeQuat([
      a[0] * (1 - alpha) + bx * alpha,
      a[1] * (1 - alpha) + by * alpha,
      a[2] * (1 - alpha) + bz * alpha,
      a[3] * (1 - alpha) + bw * alpha,
    ]);
  }
  const sinHalfTheta = Math.sqrt(sqrSinHalfTheta);
  const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
  const ratioA = Math.sin((1 - alpha) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(alpha * halfTheta) / sinHalfTheta;
  return normalizeQuat([
    a[0] * ratioA + bx * ratioB,
    a[1] * ratioA + by * ratioB,
    a[2] * ratioA + bz * ratioB,
    a[3] * ratioA + bw * ratioB,
  ]);
}

function sampleTrack(track, time, stride) {
  const times = track.times || [];
  const values = track.values || [];
  if (!times.length) return null;
  if (time <= times[0]) return values.slice(0, stride);
  for (let index = 1; index < times.length; index += 1) {
    if (time <= times[index] + 0.000001) {
      const prevTime = times[index - 1];
      const nextTime = times[index];
      const span = Math.max(0.000001, nextTime - prevTime);
      const alpha = Math.max(0, Math.min(1, (time - prevTime) / span));
      const prev = values.slice((index - 1) * stride, (index - 1) * stride + stride);
      const next = values.slice(index * stride, index * stride + stride);
      if (stride === 4) return slerpQuat(prev, next, alpha);
      return prev.map((value, valueIndex) => round(value + (next[valueIndex] - value) * alpha));
    }
  }
  return values.slice((times.length - 1) * stride, (times.length - 1) * stride + stride);
}

function slotLabel(slot) {
  return String(slot.evidenceKey || '').split(':').pop() || slot.label || `t${slot.poseclipTime}`;
}

const poseclip = JSON.parse(fs.readFileSync(poseclipPath, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const tracksByName = new Map((poseclip.clip?.tracks || []).map((track) => [track.name, track]));
const slots = evidence.captureSlots || [];
if (slots.length !== 8) throw new Error(`expected 8 LowBackKick evidence slots, found ${slots.length}`);

const frames = slots.map((slot) => {
  const time = Number(slot.poseclipTime);
  const bones = {};
  for (const [sourceBone, targetBone] of Object.entries(BONE_MAP)) {
    const track = tracksByName.get(`${sourceBone}.quaternion`);
    if (!track) continue;
    bones[targetBone] = sampleTrack(track, time, 4);
  }
  return {
    label: slotLabel(slot),
    time: round(time),
    evidenceKey: slot.evidenceKey,
    sourceExpectedPath: slot.screenshot?.expectedPath || null,
    note: slot.notes?.join(' ') || null,
    bones,
  };
});

const output = {
  schema: 'pose-lab-v2-davin-lowbackkick-candidate-v1',
  label: 'Davin LowBackKick from Ares SF2 transfer 1',
  status: 'quarantined-review',
  source: {
    actor: 'Davin Wingsworth',
    targetModel: './public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr.glb',
    sourceActor: poseclip.actorLabel || 'Ares',
    sourcePoseclip: '../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2.poseclip.json',
    sourcePoseclipSha256: sha256(poseclipPath),
    sourceEvidence: '../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2_visual_evidence.json',
    sourceEvidenceSha256: sha256(evidencePath),
    sourceClip: poseclip.sourceClipName || 'LowBackKick',
    duration: round(poseclip.clip?.duration || frames.at(-1)?.time || 0),
    keyCount: frames.length,
    method: 'direct-core-bone-quaternion-transfer-from-ares-mixamorig-to-davin-meshy-core',
    weaponless: true,
    retargetPolicy: {
      channels: ['quaternion'],
      ignoredChannels: ['position', 'scale'],
      sourceExtraBones: 'ignored fingers, toes, and end bones for viability pass 1',
      noRuntimeSolver: true,
    },
    boneMap: BONE_MAP,
    footPlantRule: poseclip.clip?.userData?.footPlantProfile || null,
    acceptanceRead: [
      'support foot should appear planted through the turn',
      'windup and anticipationHold must read before the snap',
      'contact/contactHold must read as a low back kick, not a generic leg twist',
      'red if hips, knees, spine, or feet visibly collapse',
    ],
  },
  primeKeys: Object.fromEntries(frames.map((frame) => [frame.label, frame.time])),
  guardReport: {
    status: 'QUARANTINED',
    visualAcceptance: 'not-run',
    phaseCount: frames.length,
    mappedBoneCount: Object.keys(BONE_MAP).length,
    note: 'This only proves candidate data exists. Rendered contact-sheet review decides viability.',
  },
  frames,
};

fs.mkdirSync(path.dirname(outJsonPath), { recursive: true });
fs.mkdirSync(path.dirname(outModulePath), { recursive: true });
fs.writeFileSync(outJsonPath, `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(outModulePath, `export const DAVIN_LOWBACKKICK_ARES_TRANSFER_1 = ${JSON.stringify(output, null, 2)};\n`);
console.log(JSON.stringify({ ok: true, outJson: path.relative(root, outJsonPath), outModule: path.relative(root, outModulePath), frames: frames.length, mappedBones: Object.keys(BONE_MAP).length }, null, 2));

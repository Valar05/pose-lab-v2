#!/usr/bin/env node
import fs from 'node:fs';
import { CRIMSON_LIGHT_ATTACK1_VANGUARD_2_SEQUENCE } from '../src/review-candidates/crimson-light-attack1-vanguard-2.js';
import { ATTACK1_REVIEW_CANDIDATES, CRIMSON_SABER_GRIP_LOCAL, CRIMSON_SWORD_LOCAL, CRIMSON_SWORD_REVIEW_LOCAL_AXIS } from '../src/review-constants.js';

const candidate = CRIMSON_LIGHT_ATTACK1_VANGUARD_2_SEQUENCE;
const baseline = JSON.parse(fs.readFileSync('public/assets/crimson/crimson_light_attack1_weapon_baseline.json', 'utf8'));
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const quatTravelDeg = (a, b) => {
  const dot = Math.min(1, Math.abs(a.reduce((sum, value, index) => sum + value * b[index], 0)));
  return Math.acos(dot) * 2 * 180 / Math.PI;
};
const frame = (label) => candidate.frames.find((entry) => entry.label === label);
const travel = (bone) => Math.max(...candidate.frames.map((entry) => quatTravelDeg(frame('start').bones[bone], entry.bones[bone])));

assert(baseline.schema === 'pose-lab-v2-crimson-light-attack1-weapon-baseline-v1', 'saved weapon baseline file must exist');
assert(sameJson(baseline.saberGripLocal.position, CRIMSON_SABER_GRIP_LOCAL.position), 'baseline SaberGrip position must match runtime constant');
assert(sameJson(baseline.saberGripLocal.rotationDeg, CRIMSON_SABER_GRIP_LOCAL.rotationDeg), 'baseline SaberGrip rotation must match runtime constant');
assert(sameJson(baseline.sabreLocal, CRIMSON_SWORD_LOCAL), 'baseline sabreLocal must match runtime sword constant');
assert(sameJson(baseline.bladeLocalAxis, CRIMSON_SWORD_REVIEW_LOCAL_AXIS), 'baseline blade axis must match runtime constant');
assert(candidate.schema === 'pose-lab-v2-attack-candidate-v1', 'candidate schema must be attack-candidate-v1');
assert(candidate.id === 'crimson-light-attack1-vanguard-2', 'candidate id must be v2');
assert(candidate.source?.savedWeaponBaseline === 'public/assets/crimson/crimson_light_attack1_weapon_baseline.json', 'candidate must cite saved weapon baseline');
assert(candidate.source?.previousFailedCandidate === 'crimson-light-attack1-vanguard-1', 'candidate must quarantine v1 as previous failed candidate');
assert(candidate.source?.policy?.weaponTruth?.includes('invariant across frames'), 'candidate must declare invariant weapon truth policy');
assert(candidate.source?.policy?.forbiddenUse?.includes('Do not copy Vanguard Weapon.R'), 'candidate must preserve no direct Weapon.R copy rule');
assert(sameJson(candidate.source?.savedWeapon?.saberGripLocal, baseline.saberGripLocal), 'candidate must embed saved SaberGrip local truth');
assert(sameJson(candidate.source?.savedWeapon?.sabreLocal, baseline.sabreLocal), 'candidate must embed saved sabreLocal truth');
assert(!ATTACK1_REVIEW_CANDIDATES['crimson-light-attack1-vanguard-1'], 'failed v1 must not remain active in Attack1 review registry');
assert(ATTACK1_REVIEW_CANDIDATES[candidate.id]?.characterKey === 'crimson', 'v2 must be registered as Crimson review candidate');
assert(candidate.frames?.length === 6, 'candidate must contain six review frames');
for (const label of ['start', 'anticipation', 'contact', 'contactHold', 'followThrough', 'end']) {
  const current = frame(label);
  assert(Boolean(current), `missing frame ${label}`);
  for (const bone of ['Hips', 'Spine02', 'LeftUpLeg', 'RightUpLeg', 'LeftArm', 'RightArm', 'RightForeArm', 'RightHand']) {
    assert(Boolean(current?.bones?.[bone]), `${label} must include full-body bone ${bone}`);
  }
}
for (const [bone, min] of Object.entries({ Hips: 14, Spine02: 22, LeftUpLeg: 6, RightUpLeg: 8, LeftArm: 28, RightArm: 40, RightForeArm: 30, RightHand: 20 })) {
  assert(travel(bone) >= min, `${bone} travel too small: ${travel(bone).toFixed(3)} < ${min}`);
}
const report = candidate.guardReport?.crimsonLightAttack1V2?.report || [];
const contact = report.find((entry) => entry.label === 'contact');
assert(candidate.guardReport?.crimsonLightAttack1V2?.status === 'PASS', 'v2 generator guard must pass');
assert(contact && contact.bladeAngleErrorDeg <= 7, `contact blade must point world +Z within 7 deg, got ${contact?.bladeAngleErrorDeg}`);
assert(candidate.guardReport?.crimsonLightAttack1V2?.bodyTravelDeg?.Hips >= 14, 'guard report must include hips travel');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, candidate: candidate.id, frames: candidate.frames.length, contactBladeAngleDeg: contact.bladeAngleErrorDeg, bodyTravelDeg: candidate.guardReport.crimsonLightAttack1V2.bodyTravelDeg }, null, 2));

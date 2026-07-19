#!/usr/bin/env node
import fs from 'node:fs';
import { CRIMSON_LIGHT_ATTACK1_VANGUARD_3_SEQUENCE } from '../src/review-candidates/crimson-light-attack1-vanguard-3.js';
import { ATTACK1_REVIEW_CANDIDATES, CRIMSON_SABER_GRIP_LOCAL, CRIMSON_SWORD_LOCAL, CRIMSON_SWORD_REVIEW_LOCAL_AXIS } from '../src/review-constants.js';

const candidate = CRIMSON_LIGHT_ATTACK1_VANGUARD_3_SEQUENCE;
const baseline = JSON.parse(fs.readFileSync('public/assets/crimson/crimson_light_attack1_weapon_baseline.json', 'utf8'));
const reference = JSON.parse(fs.readFileSync('public/assets/crimson/vanguard_swordattack1_reference.json', 'utf8'));
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
assert(reference.schema === 'pose-lab-v2-crimson-vanguard-swordattack1-reference-v2', 'Vanguard SwordAttack1 reference must be the full-body v2 schema');
assert(sameJson(baseline.saberGripLocal.position, CRIMSON_SABER_GRIP_LOCAL.position), 'baseline SaberGrip position must match runtime constant');
assert(sameJson(baseline.saberGripLocal.rotationDeg, CRIMSON_SABER_GRIP_LOCAL.rotationDeg), 'baseline SaberGrip rotation must match runtime constant');
assert(sameJson(baseline.sabreLocal, CRIMSON_SWORD_LOCAL), 'baseline sabreLocal must match runtime sword constant');
assert(sameJson(baseline.bladeLocalAxis, CRIMSON_SWORD_REVIEW_LOCAL_AXIS), 'baseline blade axis must match runtime constant');
assert(candidate.schema === 'pose-lab-v2-attack-candidate-v1', 'candidate schema must be attack-candidate-v1');
assert(candidate.id === 'crimson-light-attack1-vanguard-3', 'candidate id must be v3');
assert(candidate.source?.vanguardReference === 'public/assets/crimson/vanguard_swordattack1_reference.json', 'candidate must cite the full-body Vanguard reference');
assert(candidate.source?.savedWeaponBaseline === 'public/assets/crimson/crimson_light_attack1_weapon_baseline.json', 'candidate must cite saved weapon baseline');
assert(candidate.source?.previousReviewCandidate === 'crimson-light-attack1-vanguard-2', 'candidate must quarantine v2 as previous review candidate');
assert(candidate.source?.policy?.weaponTruth?.includes('invariant across frames'), 'candidate must declare invariant weapon truth policy');
assert(candidate.source?.policy?.forbiddenUse?.includes('Do not copy Vanguard Weapon.R'), 'candidate must preserve no direct Weapon.R copy rule');
assert(candidate.source?.method === 'source-local-roll-deltas-plus-body-frame-full-limb-chain-solve', 'candidate must use full-body source relationship transfer method');
assert(sameJson(candidate.source?.savedWeapon?.saberGripLocal, baseline.saberGripLocal), 'candidate must embed saved SaberGrip local truth');
assert(sameJson(candidate.source?.savedWeapon?.sabreLocal, baseline.sabreLocal), 'candidate must embed saved sabreLocal truth');
assert(!ATTACK1_REVIEW_CANDIDATES['crimson-light-attack1-vanguard-2'], 'v2 must not remain active in Attack1 review registry');
assert(ATTACK1_REVIEW_CANDIDATES[candidate.id]?.characterKey === 'crimson', 'v3 must be registered as Crimson review candidate');
assert(candidate.frames?.length === 8, 'candidate must contain eight Vanguard review frames');
for (const label of ['start', 'earlyWindup', 'anticipation', 'snapPrep', 'contact', 'contactHold', 'settle', 'followThrough']) {
  const current = frame(label);
  assert(Boolean(current), `missing frame ${label}`);
  for (const bone of ['Hips', 'Spine02', 'Spine', 'LeftUpLeg', 'RightUpLeg', 'LeftArm', 'RightArm', 'RightForeArm', 'RightHand']) {
    assert(Array.isArray(current?.bones?.[bone]) && current.bones[bone].every(Number.isFinite), `${label} must include finite full-body bone ${bone}`);
  }
}
assert(sameJson(frame('start')?.bones, Object.fromEntries(Object.entries(frame('start')?.bones || {}).map(([name, values]) => [name, values]))), 'start frame must be plain finite data');
for (const [bone, min] of Object.entries({ Hips: 18, Spine02: 24, Spine: 12, LeftUpLeg: 7, RightUpLeg: 7, LeftArm: 32, RightArm: 48, RightForeArm: 40, RightHand: 42 })) {
  assert(travel(bone) >= min, `${bone} travel too small: ${travel(bone).toFixed(3)} < ${min}`);
}
const guard = candidate.guardReport?.crimsonLightAttack1V3;
const report = guard?.report || [];
const contact = report.find((entry) => entry.label === 'contact');
assert(guard?.status === 'PASS', 'v3 generator guard must pass');
assert(contact && contact.bladeAngleErrorDeg <= 9, `contact blade must match mapped Vanguard blade within 9 deg, got ${contact?.bladeAngleErrorDeg}`);
assert(guard?.maxChainError <= 0.24, 'v3 chain solve error must stay bounded');
assert(guard?.bodyTravelDeg?.Hips >= 18 && guard?.bodyTravelDeg?.LeftUpLeg >= 7 && guard?.bodyTravelDeg?.RightArm >= 48, 'v3 must prove full-body movement, not upper-body-only wrap');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, candidate: candidate.id, frames: candidate.frames.length, contactBladeAngleDeg: contact.bladeAngleErrorDeg, bodyTravelDeg: guard.bodyTravelDeg }, null, 2));

#!/usr/bin/env node
import { CRIMSON_LIGHT_ATTACK1_VANGUARD_SEQUENCE } from '../src/review-candidates/crimson-light-attack1-vanguard-1.js';
import { ATTACK1_REVIEW_CANDIDATES } from '../src/review-constants.js';

const candidate = CRIMSON_LIGHT_ATTACK1_VANGUARD_SEQUENCE;
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const hasBone = (frame, bone) => Boolean(frame?.bones?.[bone]);
const quatTravelDeg = (a, b) => {
  const dot = Math.min(1, Math.abs(a.reduce((sum, value, index) => sum + value * b[index], 0)));
  return Math.acos(dot) * 2 * 180 / Math.PI;
};

assert(candidate.schema === 'pose-lab-v2-attack-candidate-v1', 'candidate schema must be attack-candidate-v1');
assert(candidate.id === 'crimson-light-attack1-vanguard-1', 'candidate id must be stable');
assert(candidate.source?.character === 'crimson', 'candidate must target Crimson');
assert(candidate.source?.clip === 'SwordAttack1', 'candidate must be sourced from Vanguard SwordAttack1 timing');
assert(candidate.source?.policy?.forbiddenUse?.includes('Do not copy Vanguard Weapon.R'), 'candidate must preserve the no direct Weapon.R copy rule');
assert(candidate.source?.preservedSocket?.saberGripLocal && candidate.source?.preservedSocket?.swordLocal, 'candidate must preserve Crimson SaberGrip and swordLocal socket data');
assert(candidate.source?.preservedSocket?.bladeLocalAxis?.join(',') === '0,0,1', 'candidate must preserve Arborblade +Z blade axis');
assert(ATTACK1_REVIEW_CANDIDATES[candidate.id]?.characterKey === 'crimson', 'candidate must be registered as Crimson review candidate');
assert(candidate.frames?.length === 6, 'candidate must contain the six light-attack prime frames');
for (const label of ['start', 'anticipation', 'contact', 'contactHold', 'followThrough', 'end']) {
  const frame = candidate.frames.find((entry) => entry.label === label);
  assert(Boolean(frame), `missing frame ${label}`);
  assert(hasBone(frame, 'RightArm') && hasBone(frame, 'RightForeArm') && hasBone(frame, 'RightHand'), `${label} must author Crimson right arm chain`);
  assert(hasBone(frame, 'LeftArm') && hasBone(frame, 'LeftForeArm'), `${label} must include left-arm counterbalance bones`);
}
const report = candidate.guardReport?.crimsonLightAttack1?.report || [];
assert(candidate.guardReport?.crimsonLightAttack1?.status === 'PASS', 'candidate generator guard must pass');
const contact = report.find((entry) => entry.label === 'contact');
assert(contact && contact.bladeAngleErrorDeg <= 7, `contact blade must point world +Z within 7 deg, got ${contact?.bladeAngleErrorDeg}`);
assert(contact && contact.hiltTravelFromStart >= 0.005, `contact hilt must visibly travel, got ${contact?.hiltTravelFromStart}`);
const start = candidate.frames.find((entry) => entry.label === 'start');
const maxRightHandTravel = Math.max(...candidate.frames.map((frame) => quatTravelDeg(start.bones.RightHand, frame.bones.RightHand)));
assert(maxRightHandTravel >= 8, `RightHand travel too small: ${maxRightHandTravel.toFixed(3)} deg`);
assert(!JSON.stringify(candidate).includes('Weapon.R transforms directly into Crimson as accepted sword orientation.') || candidate.source.policy.forbiddenUse, 'Weapon.R mention must only be policy/reference context');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, candidate: candidate.id, frames: candidate.frames.length, contactBladeAngleDeg: contact.bladeAngleErrorDeg, maxRightHandTravelDeg: Number(maxRightHandTravel.toFixed(3)) }, null, 2));

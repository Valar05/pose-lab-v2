#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import { CRIMSON_LIGHT_ATTACK1_VANGUARD_4_SEQUENCE as candidate } from '../src/review-candidates/crimson-light-attack1-vanguard-4.js';
import { ATTACK1_REVIEW_CANDIDATES } from '../src/review-constants.js';

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sharedRestPath = 'public/assets/crimson/crimson_shared_rest_baseline.json';
const sharedRest = JSON.parse(fs.readFileSync(sharedRestPath, 'utf8'));
const visualAcceptancePath = 'public/assets/crimson/crimson_light_attack1_v4_visual_acceptance.json';
const visualAcceptance = JSON.parse(fs.readFileSync(visualAcceptancePath, 'utf8'));
const guard = candidate.guardReport?.crimsonLightAttack1V4;

assert(candidate.id === 'crimson-light-attack1-vanguard-4', 'candidate id must be v4');
assert(candidate.source?.method === 'source-local-deltas-plus-limb-chain-solve-plus-world-planted-foot-contract', 'candidate must declare the planted-foot solve');
assert(candidate.source?.sharedRestBaseline === sharedRestPath, 'candidate must cite the independent SharedRest artifact');
assert(candidate.source?.sharedRestBaselineSha256 === sha256(sharedRestPath), 'candidate SharedRest hash must match the committed artifact');
assert(sharedRest.schema === 'pose-lab-v2-crimson-shared-rest-baseline-v2', 'SharedRest must use the calibrated v2 schema');
assert(sharedRest.source?.notDerivedFromCandidate === true && sharedRest.source?.notDerivedFromVanguardAttackFrameZero === true, 'SharedRest provenance must be independent from attack candidates');
for (const [pathKey, hashKey] of [['characterAsset', 'characterAssetSha256'], ['authoredPose', 'authoredPoseSha256']]) {
  const file = sharedRest.source?.[pathKey];
  assert(Boolean(file && fs.existsSync(file)), `SharedRest source ${pathKey} must exist`);
  if (file && fs.existsSync(file)) assert(sharedRest.source?.[hashKey] === sha256(file), `SharedRest source ${pathKey} hash mismatch`);
}
for (const side of ['left', 'right']) {
  const foot = sharedRest.footTruth?.feet?.[side];
  for (const field of ['footBone', 'toeBone', 'ankleWorld', 'expectedWorldQuaternion', 'heelLocal', 'toeLocal', 'soleNormalLocal']) {
    assert(Boolean(foot?.[field]), `${side} foot contract missing ${field}`);
  }
}
assert(guard?.status === 'PASS', 'v4 geometry guard must pass');
assert(candidate.frames?.length === 8, 'v4 must contain eight attack frames');
for (const entry of guard?.report || []) {
  for (const side of ['left', 'right']) {
    const foot = entry.feet?.[side];
    assert(foot?.orientationErrorDeg <= guard.thresholds.maxFootOrientationErrorDeg, `${entry.label} ${side} foot orientation drifted`);
    assert(foot?.heelGroundError <= guard.thresholds.maxContactHeightError, `${entry.label} ${side} heel left ground`);
    assert(foot?.toeGroundError <= guard.thresholds.maxContactHeightError, `${entry.label} ${side} toe left ground`);
    assert(foot?.minGroundClearance >= -guard.thresholds.maxContactHeightError, `${entry.label} ${side} foot penetrated ground`);
    assert(foot?.soleUpDot >= guard.thresholds.minSoleUpDot, `${entry.label} ${side} sole is not ground-up`);
  }
}
const registry = ATTACK1_REVIEW_CANDIDATES[candidate.id];
assert(registry?.characterKey === 'crimson', 'v4 must be registered for explicit Crimson visual review');
assert(registry?.status === 'accepted', 'v4 must be accepted only after rendered evidence is recorded');
assert(registry?.visualAcceptance === './assets/crimson/crimson_light_attack1_v4_visual_acceptance.json', 'v4 registry must cite its visual acceptance record');
assert(visualAcceptance.schema === 'pose-lab-v2-visual-acceptance-v1', 'v4 visual acceptance must use the committed acceptance schema');
assert(visualAcceptance.candidate === candidate.id && visualAcceptance.verdict === 'accepted', 'v4 visual acceptance must explicitly accept this candidate');
assert(visualAcceptance.evidence?.workflowRunId === 29933001051 && visualAcceptance.evidence?.captureCount === 14, 'v4 visual acceptance must cite the inspected 14-view workflow run');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, candidate: candidate.id, frames: candidate.frames.length, footFrames: guard.report.length, registryStatus: registry.status }, null, 2));

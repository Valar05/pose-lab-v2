#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ATTACK1_REVIEW_CANDIDATES, crimsonFrame04ReviewStatus } from '../src/review-constants.js';
import { CRIMSON_COMBAT_READY_VANGUARD_FRAME0_3_SEQUENCE as rejectedV3 } from '../src/review-candidates/crimson-combat-ready-vanguard-frame0-3.js';
import { CRIMSON_FRAME_ZERO_480EB888_REJECTED_SEQUENCE as rejected480 } from '../src/review-candidates/crimson-frame-zero-480eb888-rejected.js';
import { CRIMSON_COMBAT_READY_VANGUARD_FRAME0_4_SEQUENCE as candidateV4 } from '../src/review-candidates/crimson-combat-ready-vanguard-frame0-4.js';
import {
  assertExpectedReviewParity,
  assertRuntimeAuthoringProof,
  assertRuntimeAuthoringReportContract,
  parseArgs,
} from './github_crimson_visual_capture.mjs';

const candidateId = 'crimson-combat-ready-vanguard-frame0-4';
const poseSha = candidateV4.source.poseSha256;
const candidateModuleSha = 'b'.repeat(64);
const authoredGlbSha = candidateV4.source.authoredGlbSha256;
const appliedProof = {
  schema: 'pose-lab-v2-browser-candidate-apply-proof-v1',
  status: 'PASS',
  candidateId,
  poseSha,
  candidateModuleSha,
  exactAuthoredGlb: true,
  zeroMissingRequestedBones: true,
  allRequestedChannelsApplied: true,
  missingRequestedBones: [],
  invalidRequestedBones: [],
  bones: { requestedCount: 20, appliedCount: 20, appliedBones: [], missingBones: [], invalidBones: [] },
  positions: { requestedCount: 1, appliedCount: 1, appliedBones: ['Hips'], missingBones: [], invalidBones: [] },
  saber: { requestedCount: 1, appliedCount: 1, appliedObjects: ['sabreLocal'], missingObjects: [], invalidObjects: [] },
};
const dataset = {
  reviewCandidateId: candidateId,
  reviewPoseSha: poseSha,
  reviewCandidateModuleSha: candidateModuleSha,
  reviewAppliedProof: JSON.stringify(appliedProof),
};
const parsed = parseArgs([
  'node',
  'tools/github_crimson_visual_capture.mjs',
  '--url',
  `https://example.test/?candidate=${candidateId}`,
  '--expected-candidate-id',
  candidateId,
  '--expected-pose-sha',
  poseSha,
  '--expected-candidate-module-sha',
  candidateModuleSha,
]);

assert.equal(parsed.expectedCandidateId, candidateId);
assert.equal(parsed.expectedPoseSha, poseSha);
assert.equal(parsed.expectedCandidateModuleSha, candidateModuleSha);
assert.equal(assertExpectedReviewParity({ dataset }, parsed).status, 'PASS');
assert.throws(
  () => parseArgs(['node', 'capture', '--url', 'https://example.test', '--expected-candidate-id', candidateId]),
  /requires .* together/,
);
assert.throws(
  () => assertExpectedReviewParity({ dataset: { ...dataset, reviewCandidateId: 'stale-frame0-3' } }, parsed),
  /candidate id expected .* got stale-frame0-3/,
);
assert.throws(
  () => assertExpectedReviewParity({ dataset: { ...dataset, reviewPoseSha: 'c'.repeat(64) } }, parsed),
  /pose SHA expected .* got/,
);
assert.throws(
  () => assertExpectedReviewParity({ dataset: { ...dataset, reviewCandidateModuleSha: '' } }, parsed),
  /candidate module SHA expected .* got missing/,
);
assert.throws(
  () => assertExpectedReviewParity({ dataset: { ...dataset, reviewAppliedProof: '' } }, parsed),
  /applied proof is missing/,
);
assert.throws(
  () => assertExpectedReviewParity({
    dataset: {
      ...dataset,
      reviewAppliedProof: JSON.stringify({
        ...appliedProof,
        status: 'FAIL',
        zeroMissingRequestedBones: false,
        allRequestedChannelsApplied: false,
        missingRequestedBones: ['RightForeArm'],
        bones: { ...appliedProof.bones, appliedCount: 19, missingBones: ['RightForeArm'] },
      }),
    },
  }, parsed),
  /missing requested bones/,
);
assert.equal(assertExpectedReviewParity({ dataset: {} }, {}).status, 'NOT_ENFORCED');

const runtimeChannels = candidateV4.source.runtimeAuthoring.authoredGlb.channels
  .map((name) => name.replace(/\.rotation$/, '.quaternion').replace(/\.translation$/, '.position'))
  .sort();
const goodRuntimeReport = {
  schema: 'pose-lab-v2-crimson-runtime-frame-zero-authoring-report-v1',
  status: 'PASS',
  candidate: candidateId,
  poseSha256: poseSha,
  candidateModuleSha256: candidateModuleSha,
  committedModuleParity: {
    enforced: true,
    status: 'PASS',
    exactBytes: true,
    committedSha256: candidateModuleSha,
    generatedSha256: candidateModuleSha,
  },
  authoredGlb: {
    path: 'generated/pose-candidates/crimson-combat-ready-vanguard-frame0-4.authored.glb',
    sha256: authoredGlbSha,
    byteLength: candidateV4.source.runtimeAuthoring.authoredGlb.byteLength,
    animation: 'CrimsonRuntimeCombatReadyFrameZero',
    channelCount: 21,
    roundTrip: {
      status: 'PASS',
      animation: 'CrimsonRuntimeCombatReadyFrameZero',
      duration: 0,
      channelCount: 21,
      uniqueChannelCount: 21,
      channels: runtimeChannels,
      reconstructedPoseSha256: poseSha,
    },
  },
  selected: structuredClone(candidateV4.source.runtimeAuthoring.gates),
  testedAnglesDeg: [48],
  trials: [structuredClone(candidateV4.source.runtimeAuthoring.gates)],
};
assert.deepEqual(
  assertRuntimeAuthoringReportContract(goodRuntimeReport, candidateId, candidateV4),
  { candidateId, poseSha, candidateModuleSha, authoredGlbSha },
);
for (const [label, mutate] of [
  ['report status', (value) => { value.status = 'FAIL'; }],
  ['committed parity enforcement', (value) => { value.committedModuleParity.enforced = false; }],
  ['committed exact bytes', (value) => { value.committedModuleParity.exactBytes = false; }],
  ['module SHA', (value) => { value.candidateModuleSha256 = 'pending'; }],
  ['selected geometry', (value) => { value.selected.checks.supportPalmPin = false; }],
  ['center view', (value) => { value.selected.silhouette.views.center.status = 'FAIL'; }],
  ['bound angle', (value) => { value.selected.angleDeg = 46; }],
  ['tested angle', (value) => { value.testedAnglesDeg = [46]; }],
  ['trial parity', (value) => { value.trials = []; }],
  ['round-trip status', (value) => { value.authoredGlb.roundTrip.status = 'FAIL'; }],
  ['round-trip channels', (value) => { value.authoredGlb.roundTrip.uniqueChannelCount = 20; }],
  ['round-trip pose', (value) => { value.authoredGlb.roundTrip.reconstructedPoseSha256 = 'c'.repeat(64); }],
  ['finite geometry', (value) => { value.selected.silhouette.views.left.bladeHeadPixels = Number.NaN; }],
]) {
  const invalid = structuredClone(goodRuntimeReport);
  mutate(invalid);
  assert.throws(
    () => assertRuntimeAuthoringReportContract(invalid, candidateId, candidateV4),
    /Runtime authoring contract failed/,
    label,
  );
}

const goodRuntimeProof = {
  schema: 'pose-lab-v2-crimson-runtime-authoring-proof-v1',
  status: 'PASS',
  candidateId,
  view: 'center',
  expected: { viewport: [986, 900], bladeWorldDirection: [0.1, 0.9, 0.3], hiltScreen: [410.92, 423.94], tipScreen: [381.99, 187.68] },
  actual: { viewport: [986, 900], bladeWorldDirection: [0.1, 0.9, 0.3], hiltScreen: [410.93, 423.95], tipScreen: [382, 187.69] },
  errors: { bladeAngleDeg: 0.001, hiltScreenPixels: 0.02, tipScreenPixels: 0.02 },
  thresholds: { bladeAngleDeg: 0.05, screenPointPixels: 2, viewportPixels: 0.5 },
  checks: { candidate: true, authoringGate: true, viewGate: true, viewport: true, bladeDirection: true, hiltScreen: true, tipScreen: true },
};
assert.equal(assertRuntimeAuthoringProof({ dataset: { crimsonRuntimeAuthoringProof: JSON.stringify(goodRuntimeProof) } }, 'center', candidateId).status, 'PASS');
for (const [label, payload] of [
  ['invalid JSON', { dataset: { crimsonRuntimeAuthoringProof: '{' } }],
  ['stale view', { dataset: { crimsonRuntimeAuthoringProof: JSON.stringify({ ...goodRuntimeProof, view: 'left' }) } }],
  ['wrong candidate', { dataset: { crimsonRuntimeAuthoringProof: JSON.stringify({ ...goodRuntimeProof, candidateId: 'stale' }) } }],
  ['failed gate', { dataset: { crimsonRuntimeAuthoringProof: JSON.stringify({ ...goodRuntimeProof, status: 'FAIL', checks: { ...goodRuntimeProof.checks, viewGate: false } }) } }],
  ['direction error', { dataset: { crimsonRuntimeAuthoringProof: JSON.stringify({ ...goodRuntimeProof, errors: { ...goodRuntimeProof.errors, bladeAngleDeg: 1 } }) } }],
  ['endpoint error', { dataset: { crimsonRuntimeAuthoringProof: JSON.stringify({ ...goodRuntimeProof, errors: { ...goodRuntimeProof.errors, tipScreenPixels: 4 } }) } }],
]) {
  assert.throws(
    () => assertRuntimeAuthoringProof(payload, 'center', candidateId),
    /runtime-authoring browser parity failed/,
    label,
  );
}

assert.equal(ATTACK1_REVIEW_CANDIDATES['crimson-combat-ready-vanguard-frame0-3']?.status, 'rejected');
const rejectedPoseSha = 'b9ec44d3d17527779334e372a79894b07cbd535c4af54927e0cc638f3b1b6c2f';
const rejected480PoseSha = 'b5ef5555ba060546f4d6dd3921f09cf0e4251dfac8a346d4db7f4f30858bd554';
assert.equal(crimsonFrame04ReviewStatus(candidateV4), 'visual-pending');
for (const [label, mutate] of [
  ['pending pose SHA', (value) => { value.source.poseSha256 = 'pending'; }],
  ['rejected v3 pose SHA', (value) => { value.source.poseSha256 = rejectedPoseSha; }],
  ['rejected baseline pose SHA', (value) => { value.source.poseSha256 = rejected480PoseSha; }],
  ['body GLB flag', (value) => { value.source.exactAuthoredBodyGlb = false; }],
  ['runtime schema', (value) => { value.source.runtimeAuthoring.schema = 'wrong'; }],
  ['nested GLB hash', (value) => { value.source.runtimeAuthoring.authoredGlb.sha256 = 'c'.repeat(64); }],
  ['runtime gates', (value) => { value.source.runtimeAuthoring.gates.status = 'FAIL'; }],
  ['right view', (value) => { value.source.runtimeAuthoring.gates.silhouette.views.right.status = 'FAIL'; }],
  ['blade direction', (value) => { value.source.runtimeAuthoring.bladeWorldDirection = [0, 1, 0]; }],
]) {
  const invalid = structuredClone(candidateV4);
  mutate(invalid);
  assert.equal(crimsonFrame04ReviewStatus(invalid), 'authoring-red', label);
}

const hasGeneratedPose = crimsonFrame04ReviewStatus(candidateV4) === 'visual-pending';
assert.equal(ATTACK1_REVIEW_CANDIDATES[candidateId]?.status, 'visual-pending');
assert.notDeepEqual(candidateV4.frames?.[0], rejectedV3.frames?.[0], 'valid v4 must materially differ from rejected v3 payload');
assert.notDeepEqual(candidateV4.frames?.[0], rejected480.frames?.[0], 'valid v4 must materially differ from canonical rejected 480 payload');
assert.equal(ATTACK1_REVIEW_CANDIDATES[candidateId]?.exportName, 'CRIMSON_COMBAT_READY_VANGUARD_FRAME0_4_SEQUENCE');

const main = fs.readFileSync('src/main.js', 'utf8');
assert.match(main, /dataset\.reviewCandidateId = attackPoseSequence\.id \|\| REQUESTED_CANDIDATE/);
assert.match(main, /dataset\.reviewPoseSha = attackPoseSequence\.source\?\.poseSha256/);
assert.match(main, /dataset\.reviewCandidateModuleSha = candidateModuleSha/);
assert.match(main, /dataset\.reviewAppliedProof = JSON\.stringify\(proof\)/);
assert.match(main, /dataset\.crimsonRuntimeAuthoringProof = JSON\.stringify\(proof\)/);
assert.match(main, /const viewGate = runtimeAuthoring\.gates\?\.silhouette\?\.views\?\.\[reviewCameraView\]/);
assert.match(main, /!attackPoseSequence\.source\?\.exactAuthoredGlb \|\| document\.body\.dataset\.reviewApplied === '1'/);
assert.match(main, /if \(!attackPoseSequence\?\.source\?\.exactAuthoredGlb\) \{\s*alignSaberGripToWorldDirection[\s\S]*?seatSaberHiltTowardHand/);

const blenderAuthor = fs.readFileSync('tools/render_crimson_vanguard_attack1_compare_blender.py', 'utf8');
assert.match(blenderAuthor, /def vanguard_frame_zero_guard_contract\(/);
assert.match(blenderAuthor, /AUTHOR_VANGUARD_FRAME_ZERO_GUARD_FAILED/);
assert.match(blenderAuthor, /CRIMSON_FRAME_ZERO_BLADE_LINE_NOT_VANGUARD/);
assert.match(blenderAuthor, /aim_browser_center_review_camera/);
assert.match(blenderAuthor, /"browser-center"/);
assert.match(blenderAuthor, /0\.42 \* shoulder_span/);
assert.match(blenderAuthor, /0\.32 \* torso_height/);
assert.doesNotMatch(blenderAuthor, /-0\.38 \* torso_height/);

const workflow = fs.readFileSync('.github/workflows/crimson-pr-visual.yml', 'utf8');
assert.match(workflow, /runtime_frame_zero:/);
assert.match(workflow, /capture-frame-zero:\s*needs: runtime_frame_zero/);
assert.match(workflow, /author_crimson_frame_zero_runtime\.mjs[\s\S]*?--angle-deg 48[\s\S]*?--check/);
assert.match(workflow, /assertRuntimeAuthoringReportContract/);
assert.match(workflow, /--expected-candidate-id "\$EXPECTED_CANDIDATE_ID"/);
assert.match(workflow, /--expected-pose-sha "\$EXPECTED_POSE_SHA"/);
assert.match(workflow, /--expected-candidate-module-sha "\$EXPECTED_CANDIDATE_MODULE_SHA"/);
assert.doesNotMatch(workflow, /--author-frame-zero/);
assert.doesNotMatch(workflow, /assertBlenderManifestContract/);
assert.ok(workflow.includes(candidateId));
assert.ok(!workflow.includes('crimson-combat-ready-vanguard-frame0-3'));

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.match(packageJson.scripts['test:repo-guardrails'], /test:crimson-frame-zero-runtime-authoring/);
assert.match(packageJson.scripts['test:crimson-frame-zero-runtime-authoring'], /--angle-deg 48 --check/);

console.log(JSON.stringify({
  ok: true,
  check: 'crimson-frame-zero-runtime-authored-browser-parity',
  candidateId,
  candidateState: hasGeneratedPose ? 'visual-pending' : 'authoring-red',
  rejects: [
    'runtime-report-contract-failure',
    'runtime-glb-roundtrip-failure',
    'candidate-id-mismatch',
    'pose-sha-mismatch',
    'module-sha-mismatch',
    'missing-applied-proof',
    'runtime-view-proof-mismatch',
  ],
}, null, 2));

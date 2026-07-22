#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ATTACK1_REVIEW_CANDIDATES, crimsonFrame04ReviewStatus } from '../src/review-constants.js';
import { CRIMSON_COMBAT_READY_VANGUARD_FRAME0_3_SEQUENCE as rejectedV3 } from '../src/review-candidates/crimson-combat-ready-vanguard-frame0-3.js';
import { CRIMSON_FRAME_ZERO_480EB888_REJECTED_SEQUENCE as rejected480 } from '../src/review-candidates/crimson-frame-zero-480eb888-rejected.js';
import { CRIMSON_COMBAT_READY_VANGUARD_FRAME0_4_SEQUENCE as candidateV4 } from '../src/review-candidates/crimson-combat-ready-vanguard-frame0-4.js';
import { assertBlenderManifestContract, assertExpectedReviewParity, parseArgs } from './github_crimson_visual_capture.mjs';

const candidateId = 'crimson-combat-ready-vanguard-frame0-4';
const poseSha = 'a'.repeat(64);
const candidateModuleSha = 'b'.repeat(64);
const authoredGlbSha = 'd'.repeat(64);
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

const goodBlenderManifest = {
  status: 'PASS',
  candidate: candidateId,
  candidateParity: {
    status: 'PASS',
    exactFramePayloadMatch: true,
    authoredGlbShaMatch: true,
    committedStatusMatch: true,
    committedAuthorEligibleBeforeCandidateParity: true,
    committedPoseSha256: poseSha,
    generatedPoseSha256: poseSha,
    committedCandidateSha256: candidateModuleSha,
    committedDeclaredAuthoredGlbSha256: authoredGlbSha,
    generatedAuthoredGlbSha256: authoredGlbSha,
  },
  authoredFrameZero: { exactAuthoredGlb: true, poseSha256: poseSha, glb: { sha256: authoredGlbSha } },
  generatedCandidate: {
    candidateId,
    poseSha256: poseSha,
    source: { exactAuthoredGlb: true, poseSha256: poseSha, authoredGlbSha256: authoredGlbSha, status: 'generated-visual-pending-candidate-parity', authorEligibleBeforeCandidateParity: true },
  },
  sourceHashes: { requestedCandidate: { sha256: candidateModuleSha } },
};
assert.deepEqual(assertBlenderManifestContract(goodBlenderManifest, candidateId), { candidateId, poseSha, candidateModuleSha });
for (const [label, mutate] of [
  ['manifest status', (value) => { value.status = 'FAIL'; }],
  ['candidate parity status', (value) => { value.candidateParity.status = 'FAIL'; }],
  ['exact frame payload', (value) => { value.candidateParity.exactFramePayloadMatch = false; }],
  ['authored GLB parity', (value) => { value.candidateParity.authoredGlbShaMatch = false; }],
  ['committed status parity', (value) => { value.candidateParity.committedStatusMatch = false; }],
  ['committed author eligibility', (value) => { value.candidateParity.committedAuthorEligibleBeforeCandidateParity = false; }],
  ['exact authored GLB', (value) => { value.authoredFrameZero.exactAuthoredGlb = false; }],
  ['generated candidate id', (value) => { value.generatedCandidate.candidateId = 'wrong'; }],
  ['invalid authored pose SHA', (value) => { value.authoredFrameZero.poseSha256 = 'pending'; }],
  ['authored/generated pose SHA', (value) => { value.generatedCandidate.poseSha256 = 'c'.repeat(64); }],
  ['requested candidate module SHA', (value) => { value.sourceHashes.requestedCandidate.sha256 = ''; }],
]) {
  const invalid = structuredClone(goodBlenderManifest);
  mutate(invalid);
  assert.throws(() => assertBlenderManifestContract(invalid, candidateId), /Blender candidate contract failed/, label);
}

assert.equal(ATTACK1_REVIEW_CANDIDATES['crimson-combat-ready-vanguard-frame0-3']?.status, 'rejected');
const rejectedPoseSha = 'b9ec44d3d17527779334e372a79894b07cbd535c4af54927e0cc638f3b1b6c2f';
const rejected480PoseSha = 'b5ef5555ba060546f4d6dd3921f09cf0e4251dfac8a346d4db7f4f30858bd554';
assert.equal(crimsonFrame04ReviewStatus({ source: { exactAuthoredGlb: true, status: 'generated-visual-pending-candidate-parity', poseSha256: 'pending' } }), 'authoring-red');
assert.equal(crimsonFrame04ReviewStatus({ source: { exactAuthoredGlb: true, status: 'wrong', poseSha256: poseSha } }), 'authoring-red');
assert.equal(crimsonFrame04ReviewStatus({ source: { exactAuthoredGlb: true, status: 'generated-visual-pending-candidate-parity', poseSha256: rejectedPoseSha } }), 'authoring-red');
assert.equal(crimsonFrame04ReviewStatus({ source: { exactAuthoredGlb: true, status: 'generated-visual-pending-candidate-parity', poseSha256: rejected480PoseSha, authoredGlbSha256: authoredGlbSha } }), 'authoring-red');
assert.equal(crimsonFrame04ReviewStatus({ source: { exactAuthoredGlb: true, status: 'generated-visual-pending-candidate-parity', poseSha256: poseSha } }), 'authoring-red');
assert.equal(crimsonFrame04ReviewStatus({ source: { exactAuthoredGlb: true, status: 'generated-visual-pending-candidate-parity', poseSha256: poseSha, authoredGlbSha256: authoredGlbSha } }), 'visual-pending');
const hasGeneratedPose = candidateV4.source?.exactAuthoredGlb === true
  && candidateV4.source?.status === 'generated-visual-pending-candidate-parity'
  && /^[a-f0-9]{64}$/.test(candidateV4.source?.poseSha256 || '')
  && /^[a-f0-9]{64}$/.test(candidateV4.source?.authoredGlbSha256 || '')
  && candidateV4.source.poseSha256 !== rejectedPoseSha
  && candidateV4.source.poseSha256 !== rejected480PoseSha;
if (hasGeneratedPose) {
  assert.equal(ATTACK1_REVIEW_CANDIDATES[candidateId]?.status, 'visual-pending');
  assert.notDeepEqual(candidateV4.frames?.[0], rejectedV3.frames?.[0], 'valid v4 must materially differ from rejected v3 payload');
  assert.notDeepEqual(candidateV4.frames?.[0], rejected480.frames?.[0], 'valid v4 must materially differ from canonical rejected 480 payload');
} else {
  assert.equal(candidateV4.source?.poseSha256, 'pending');
  assert.equal(ATTACK1_REVIEW_CANDIDATES[candidateId]?.status, 'authoring-red');
}
assert.equal(ATTACK1_REVIEW_CANDIDATES[candidateId]?.exportName, 'CRIMSON_COMBAT_READY_VANGUARD_FRAME0_4_SEQUENCE');

const main = fs.readFileSync('src/main.js', 'utf8');
assert.match(main, /dataset\.reviewCandidateId = attackPoseSequence\.id \|\| REQUESTED_CANDIDATE/);
assert.match(main, /dataset\.reviewPoseSha = attackPoseSequence\.source\?\.poseSha256/);
assert.match(main, /dataset\.reviewCandidateModuleSha = candidateModuleSha/);
assert.match(main, /dataset\.reviewAppliedProof = JSON\.stringify\(proof\)/);
assert.match(main, /!attackPoseSequence\.source\?\.exactAuthoredGlb \|\| document\.body\.dataset\.reviewApplied === '1'/);
assert.match(main, /if \(!attackPoseSequence\?\.source\?\.exactAuthoredGlb\) \{\s*alignSaberGripToWorldDirection[\s\S]*?seatSaberHiltTowardHand/);

const workflow = fs.readFileSync('.github/workflows/crimson-pr-visual.yml', 'utf8');
assert.match(workflow, /capture-frame-zero:\s*needs: blender-frame-zero/);
assert.match(workflow, /actions\/download-artifact@v4/);
assert.match(workflow, /assertBlenderManifestContract\(manifest/);
assert.match(workflow, /--expected-candidate-id "\$EXPECTED_CANDIDATE_ID"/);
assert.match(workflow, /--expected-pose-sha "\$EXPECTED_POSE_SHA"/);
assert.match(workflow, /--expected-candidate-module-sha "\$EXPECTED_CANDIDATE_MODULE_SHA"/);
assert.ok(workflow.includes(candidateId));
assert.ok(!workflow.includes('crimson-combat-ready-vanguard-frame0-3'));

console.log(JSON.stringify({
  ok: true,
  check: 'crimson-frame-zero-rendered-candidate-parity',
  candidateId,
  candidateState: hasGeneratedPose ? 'visual-pending' : 'authoring-red',
  rejects: ['manifest-contract-failure', 'candidate-id-mismatch', 'pose-sha-mismatch', 'module-sha-mismatch', 'missing-applied-proof', 'missing-requested-bone'],
}, null, 2));

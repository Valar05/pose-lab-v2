#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const at = (...parts) => path.join(root, ...parts);
const json = (...parts) => JSON.parse(fs.readFileSync(at(...parts), 'utf8'));
const bytes = (...parts) => fs.readFileSync(at(...parts));
const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const size = (buffer) => ({ width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const initial = ['breastplate_turn_3q', 'overhead_two_hand_grip', 'rear_boot_foreshortened'];
const current = [...initial, 'rear_forearm_foreshortened'];
const base = ['public', 'assets', 'vanguard', 'fleshpunk', 'candidates', 'muramasa-canary-001'];
const manifest = json(...base, 'animations.json');
const provenance = json(...base, 'provenance.json');
const parts = json('authoring', 'vanguard_muramasa_canary', 'part-library.json');
const config = json('authoring', 'vanguard_muramasa_canary', 'canary-config.json');
const mapping = json(...base, 'evidence', 'mapping-manifest.json');
const validation = json(...base, 'evidence', 'validation-report.json');
const viewer = fs.readFileSync(at('src', 'sprite-viewer.js'), 'utf8');
const css = fs.readFileSync(at('src', 'styles.css'), 'utf8');
const capture = fs.readFileSync(at('tools', 'capture_sprite_review.mjs'), 'utf8');
const refine = fs.readFileSync(at('tools', 'refine_vanguard_muramasa_canary.py'), 'utf8');
const attempt1Cloud = json(...base, 'evidence', 'cloud-review', 'muramasa-canary-001-attempt-001', 'report.json');
const attempt1CloudImage = bytes(...base, 'evidence', 'cloud-review', 'muramasa-canary-001-attempt-001', 'synchronized-pose-lab-comparison.png');
const attempt2Cloud = json(...base, 'evidence', 'cloud-review', 'muramasa-canary-001-attempt-002', 'report.json');
const attempt2CloudImage = bytes(...base, 'evidence', 'cloud-review', 'muramasa-canary-001-attempt-002', 'synchronized-pose-lab-comparison.png');

assert(JSON.stringify(config.initialCorrectiveAttachments) === JSON.stringify(initial), 'initial three-attachment lock changed');
assert(JSON.stringify(parts.correctiveAttachments.map(({ id }) => id)) === JSON.stringify(current), 'current vocabulary must contain exactly three initial plus one synchronized-evidence correction');
assert(parts.additionPolicy.initialCorrectiveAttachmentCount === 3 && parts.additionPolicy.currentCorrectiveAttachmentCount === 4, 'attempt 2 must retain the initial count and record exactly one expansion');
assert(parts.additionPolicy.furtherAttachmentRequiresSynchronizedPoseLabFailure === true, 'expansion must require synchronized Pose Lab evidence');
assert(parts.additionPolicy.performanceMayChangeToMeetQuota === false, 'approved performance may not change to meet a quota');
assert(parts.correctiveAttachments.slice(0, 3).every((item) => item.attempts.length === 2 && item.attempts[0].state === 'synchronized-pose-lab-red'), 'the initial three must record the synchronized-red attempt and attempt-2 reuse');
const rearForearm = parts.correctiveAttachments[3];
assert(rearForearm.id === 'rear_forearm_foreshortened' && rearForearm.attempts.length === 1, 'only the evidence-justified rear forearm may be added in attempt 2');
assert(rearForearm.gateEvidence.runId === '30581078830' && rearForearm.gateEvidence.cloudCaptureSha256 === '462130acac6d229e6f73661a3cddd9b151874bf18757f07e56eabdf66a5e2a48', 'fourth attachment must cite the synchronized cloud comparison');
assert(parts.correctiveAttachments.every((item) => item.attempts.at(-1).reuseDisposition.includes('retain-in-vanguard-vocabulary')), 'every current correction must carry a later-reuse disposition');
assert(parts.correctiveAttachments.every((item) => item.attempts.at(-1).performanceChanged === false), 'attachment iteration must not alter approved performance');
assert(parts.correctiveAttachments.every((item) => item.attempts.at(-1).state === 'synchronized-pose-lab-red'), 'attempt 2 must close as synchronized RED for all four recorded attachments');
assert(parts.additionPolicy.latestSynchronizedComparison.runId === '30582812601' && parts.additionPolicy.latestSynchronizedComparison.attachmentAdded === false, 'attempt 2 must record the cloud failure without authorizing a fifth attachment');

assert(manifest.reviewState.startsWith('RED'), 'canary must remain visibly quarantined');
assert(manifest.attemptId === 'muramasa-canary-001-attempt-002', 'manifest must expose attempt 2');
assert(manifest.animations.length === 1, 'bounded canary must expose exactly one hardest key');
const animation = manifest.animations[0];
assert(animation.frames.length === 1 && animation.frames[0].sourceFrame === 42, 'canary must remain on approved source frame 42');
assert(animation.comparison?.synchronized === true, 'Pose Lab comparison must be synchronized');
assert(animation.comparison.frames.length === 1 && animation.comparison.frames[0].sourceFrame === 42, 'candidate and witness source frames must match');
assert(animation.frames[0].sourceTimestampSeconds === animation.comparison.frames[0].sourceTimestampSeconds, 'candidate and witness timestamps must match');

for (const frame of [animation.frames[0], animation.comparison.frames[0]]) {
  const file = bytes(...base, ...frame.src.split('/'));
  assert(file.subarray(0, 8).toString('hex') === '89504e470d0a1a0a', `${frame.src} is not PNG`);
  const dimensions = size(file);
  assert(dimensions.width === 512 && dimensions.height === 512, `${frame.src} must remain 512x512`);
  assert(hash(file) === frame.sha256, `${frame.src} hash changed`);
}
assert(provenance.humanAccepted === false && validation.humanAccepted === false, 'machine output may not claim human acceptance');
assert(validation.correctiveAttachmentCount === 4, 'attempt-2 Blender result must contain exactly four corrective attachments');
assert(mapping.timeline.sourceFrameCount === 254 && mapping.timeline.resampled === false, 'complete unresampled reviewed timeline must enter Blender');
assert(JSON.stringify(mapping.attachments) === JSON.stringify(current), 'mapping manifest must contain the three initial plus the evidence-justified rear forearm');
assert(mapping.coordinateTransform.outputPixels.perFrameRecentering === false, 'per-frame recentering is forbidden');
assert(mapping.coordinateTransform.outputPixels.perFrameScaleNormalization === false, 'per-frame scale normalization is forbidden');
assert(mapping.coordinateTransform.outputPixels.mirrored === false, 'mirroring is forbidden');
assert(mapping.synchronizedExpansionEvidence?.runId === '30581078830' && mapping.synchronizedExpansionEvidence?.performanceChanged === false, 'mapping must preserve the synchronized expansion evidence and unchanged performance');
assert(attempt1Cloud.captures[0].clean.sha256 === '462130acac6d229e6f73661a3cddd9b151874bf18757f07e56eabdf66a5e2a48', 'attempt-1 cloud report hash changed');
assert(attempt1Cloud.captures[0].clean.inspection.synchronizedComparison === true, 'attempt-1 cloud comparison must remain synchronized');
assert(size(attempt1CloudImage).width === 1366 && size(attempt1CloudImage).height === 900, 'cloud comparison must retain the captured review viewport');
assert(hash(attempt1CloudImage) === '462130acac6d229e6f73661a3cddd9b151874bf18757f07e56eabdf66a5e2a48', 'attempt-1 cloud image bytes changed');
assert(attempt2Cloud.captures[0].clean.sha256 === '2c45cfce48e12477885cb0d17e5a1d62259b1b827029a80ecd888703c8a93c49', 'attempt-2 cloud report hash changed');
assert(attempt2Cloud.captures[0].clean.inspection.synchronizedComparison === true && attempt2Cloud.captures[0].clean.inspection.candidateSourceFrame === '42', 'attempt-2 cloud comparison must remain synchronized on source frame 42');
assert(size(attempt2CloudImage).width === 1366 && size(attempt2CloudImage).height === 900, 'attempt-2 cloud comparison must retain the captured viewport');
assert(hash(attempt2CloudImage) === '2c45cfce48e12477885cb0d17e5a1d62259b1b827029a80ecd888703c8a93c49', 'attempt-2 cloud image bytes changed');
assert(validation.technicalState === 'synchronized-visual-gate-red' && validation.latestSynchronizedComparison.attachmentAdded === false, 'validation must fail closed without a fifth attachment');
assert(provenance.homeCenterAttempt2.artifact.sha256 === 'dc71881702d153f40bce8da31a98936c8217075fd71194af986f8fe286408e6e' && provenance.homeCenterAttempt2.artifact.readbackVerified === true, 'attempt-2 blend must be byte-verified in Home Center');
assert(provenance.homeCenterAttempt2.workspace.workspaceId === 'bws_64d66aedecf413cbf3393bf9a7a503' && provenance.homeCenterAttempt2.workspace.revisionId === 'brv_f2e3a8f680ca316ac749c13fbfac88', 'attempt-2 Home Center workspace identity changed');
assert(provenance.homeCenterAttempt2.workspace.inspectionReadback.correctiveAttachmentObjectCount === 4 && provenance.homeCenterAttempt2.workspace.inspectionReadback.reviewedTimelineFrameRange[1] === 254, 'live Home Center inspection must read four corrections and the complete reviewed timeline');
assert(refine.includes('image_angle(left_wrist, right_wrist)') && refine.includes('performance_changed') && refine.includes('rear_forearm_foreshortened'), 'attempt-2 Blender correction must use reviewed wrists, forbid performance change, and add only the rear forearm');

assert(viewer.includes("document.body.dataset.synchronizedComparison"), 'viewer must expose synchronized-comparison readiness');
assert(viewer.includes('comparisonImage.dataset.sourceFrame'), 'viewer must expose witness source frame');
assert(viewer.includes('animation.comparison?.frames'), 'viewer must preload the synchronized witness');
assert(css.includes('.sprite-comparison-grid.has-comparison'), 'viewer must lay out the synchronized comparison');
assert(css.includes('@media (max-width: 700px)'), 'comparison must have a bounded mobile layout');
assert(capture.includes('comparison source frames are not synchronized'), 'cloud capture must fail closed on a desynchronized comparison');
assert(capture.includes("args.manifest"), 'cloud capture must support the canary manifest');
assert(capture.includes('Math.min(preferredFrame, scrubberMax)'), 'cloud capture must clamp one-frame manifests to the scrubber range');

console.log(JSON.stringify({
  ok: true,
  sourceFrame: animation.frames[0].sourceFrame,
  sourceTimestampSeconds: animation.frames[0].sourceTimestampSeconds,
  correctiveAttachments: current,
  humanAccepted: false,
  state: manifest.reviewState,
}, null, 2));

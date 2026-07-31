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
const constraints = json('authoring', 'vanguard_muramasa_canary', 'constraint-ledger.json');
const weapon = json('authoring', 'vanguard_muramasa_canary', 'weapon-companion-track.json');
const mapping = json(...base, 'evidence', 'mapping-manifest.json');
const inspection = json(...base, 'evidence', 'scene-inspection-manifest.json');
const validation = json(...base, 'evidence', 'validation-report.json');
const viewer = fs.readFileSync(at('src', 'sprite-viewer.js'), 'utf8');
const css = fs.readFileSync(at('src', 'styles.css'), 'utf8');
const capture = fs.readFileSync(at('tools', 'capture_sprite_review.mjs'), 'utf8');
const refine = fs.readFileSync(at('tools', 'refine_vanguard_muramasa_canary.py'), 'utf8');
const attempt1Cloud = json(...base, 'evidence', 'cloud-review', 'muramasa-canary-001-attempt-001', 'report.json');
const attempt1CloudImage = bytes(...base, 'evidence', 'cloud-review', 'muramasa-canary-001-attempt-001', 'synchronized-pose-lab-comparison.png');
const attempt2Cloud = json(...base, 'evidence', 'cloud-review', 'muramasa-canary-001-attempt-002', 'report.json');
const attempt2CloudImage = bytes(...base, 'evidence', 'cloud-review', 'muramasa-canary-001-attempt-002', 'synchronized-pose-lab-comparison.png');
const attempt3Dir = at(...base, 'evidence', 'cloud-review', 'muramasa-canary-001-attempt-003');

assert(JSON.stringify(config.initialCorrectiveAttachments) === JSON.stringify(initial), 'initial three-attachment lock changed');
assert(JSON.stringify(parts.correctiveAttachments.map(({ id }) => id)) === JSON.stringify(current), 'repair must retain exactly the production-v21 four-attachment vocabulary');
assert(parts.additionPolicy.initialCorrectiveAttachmentCount === 3 && parts.additionPolicy.currentCorrectiveAttachmentCount === 4, 'repair must retain three initial plus the evidence-authorized rear forearm');
assert(parts.additionPolicy.furtherAttachmentRequiresSynchronizedPoseLabFailure === true, 'expansion must require synchronized Pose Lab evidence');
assert(parts.additionPolicy.performanceMayChangeToMeetQuota === false, 'approved performance may not change to meet a quota');
assert(parts.additionPolicy.currentAttempt.attemptId === 'muramasa-canary-001-attempt-003' && parts.additionPolicy.currentAttempt.attachmentAdded === false, 'attempt 3 must add no attachment');
assert(parts.correctiveAttachments.slice(0, 3).every((item) => item.attempts.length === 3), 'the initial three must record attempts 1, 2, and 3');
const rearForearm = parts.correctiveAttachments[3];
assert(rearForearm.id === 'rear_forearm_foreshortened' && rearForearm.attempts.length === 2, 'rear forearm must remain the only evidence-authorized expansion');
assert(rearForearm.gateEvidence.runId === '30581078830' && rearForearm.gateEvidence.cloudCaptureSha256 === '462130acac6d229e6f73661a3cddd9b151874bf18757f07e56eabdf66a5e2a48', 'fourth attachment must retain its synchronized gate evidence');
assert(parts.correctiveAttachments.every((item) => item.attempts.at(-1).attemptId === 'muramasa-canary-001-attempt-003'), 'all four roots must record attempt 3');
assert(parts.correctiveAttachments.every((item) => item.attempts.at(-1).performanceChanged === false), 'attempt 3 must not alter approved performance');
assert(parts.correctiveAttachments.every((item) => item.attempts.at(-1).humanAccepted === false), 'machine output may not claim Drew acceptance');
assert(parts.correctiveAttachments.every((item) => Array.isArray(item.internalComponents) && item.internalComponents.length >= 1), 'every existing attachment root must record its reused internal components');

assert(manifest.reviewState.includes('attempt 3'), 'manifest must expose attempt 3 quarantine');
assert(manifest.attemptId === 'muramasa-canary-001-attempt-003', 'manifest must expose attempt 3');
assert(manifest.animations.length === 1, 'bounded canary must expose exactly one hardest key');
const animation = manifest.animations[0];
assert(animation.frames.length === 1 && animation.frames[0].sourceFrame === 42, 'canary must remain on approved source frame 42');
assert(animation.frames[0].sourceTimestampSeconds === 0.7661160104986877, 'approved source timestamp changed');
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
assert(provenance.attempt3.attachmentAdded === false && provenance.attempt3.performanceChanged === false, 'attempt-3 provenance must record no fifth attachment and no performance change');
assert(provenance.attempt3.candidateSha256 === animation.frames[0].sha256, 'attempt-3 provenance must identify exact candidate bytes');
assert(validation.correctiveAttachmentCount === 4 && validation.attachmentAdded === false, 'attempt-3 Blender result must contain exactly four corrective attachments');
assert(validation.approvedPerformanceChanged === false, 'validation must preserve approved performance');
assert(validation.frozenPerformance.sourceFrame === 42 && validation.frozenPerformance.wrists && validation.frozenPerformance.root && validation.frozenPerformance.feet && validation.frozenPerformance.supportState, 'validation must lock frame, wrists, root, feet, and support state');
assert(mapping.timeline.sourceFrameCount === 254 && mapping.timeline.resampled === false, 'complete unresampled reviewed timeline must enter Blender');
assert(JSON.stringify(mapping.attachments) === JSON.stringify(current), 'mapping manifest must retain the exact four attachment roots');
assert(mapping.coordinateTransform.outputPixels.perFrameRecentering === false && mapping.coordinateTransform.outputPixels.perFrameScaleNormalization === false && mapping.coordinateTransform.outputPixels.mirrored === false, 'registration transform changed');
assert(mapping.frozenPerformance.sourceFrame === 42 && mapping.frozenPerformance.performanceChanged === false, 'mapping must lock frame 42 and unchanged performance');
assert(JSON.stringify(mapping.weaponCorrection.priorTip) === JSON.stringify([522.0, 384.0]) && JSON.stringify(mapping.weaponCorrection.correctedTip) === JSON.stringify([191.492, 384.0]), 'mapping must record the production-v21 sword-vector correction');
const correctedWeaponFrame = weapon.frames.find((frame) => frame.sourceFrame === 42);
assert(JSON.stringify(correctedWeaponFrame.root) === JSON.stringify([356.746, 435.2475]), 'sword root changed');
assert(JSON.stringify(correctedWeaponFrame.primaryHand) === JSON.stringify([367.7515, 432.5795]) && JSON.stringify(correctedWeaponFrame.secondaryHand) === JSON.stringify([345.7405, 437.9155]), 'reviewed wrist/hilt ownership changed');
assert(JSON.stringify(correctedWeaponFrame.tip) === JSON.stringify([191.492, 384.0]), 'frame-42 sword tip was not corrected');
assert(weapon.corrections[0].basis.cloudCaptureSha256 === '2c45cfce48e12477885cb0d17e5a1d62259b1b827029a80ecd888703c8a93c49' && weapon.corrections[0].performanceChanged === false, 'sword correction lacks v21 synchronized evidence');
assert(constraints.forbidden.includes('fifth corrective attachment'), 'constraint ledger must forbid a fifth attachment');
const rootObjects = inspection.objects.filter((obj) => obj.customProperties.includes('corrective_attachment_id'));
assert(rootObjects.length === 4 && JSON.stringify(rootObjects.map((obj) => obj.name).sort()) === JSON.stringify(['ATTACH_BreastplateTurn3Q','ATTACH_OverheadTwoHandGrip','ATTACH_RearBootForeshortened','ATTACH_RearForearmForeshortened'].sort()), 'scene inspection must expose exactly four registered attachment roots');
assert(inspection.objects.some((obj) => obj.name === 'ATTACH_BreastplateTurn3Q__Torso') && inspection.objects.some((obj) => obj.name === 'ATTACH_OverheadTwoHandGrip__HandsAndHilt') && inspection.objects.some((obj) => obj.name === 'ATTACH_RearBootForeshortened__BootAndShinSeat'), 'scene inspection must expose repaired compound components');

assert(attempt1Cloud.captures[0].clean.sha256 === hash(attempt1CloudImage), 'attempt-1 cloud report/image mismatch');
assert(attempt2Cloud.captures[0].clean.sha256 === hash(attempt2CloudImage), 'attempt-2 cloud report/image mismatch');
assert(attempt2Cloud.captures[0].clean.inspection.synchronizedComparison === true && attempt2Cloud.captures[0].clean.inspection.candidateSourceFrame === '42', 'attempt-2 evidence must remain synchronized');
if (fs.existsSync(attempt3Dir)) {
  const report = json(...base, 'evidence', 'cloud-review', 'muramasa-canary-001-attempt-003', 'report.json');
  const image = bytes(...base, 'evidence', 'cloud-review', 'muramasa-canary-001-attempt-003', 'synchronized-pose-lab-comparison.png');
  assert(report.captures[0].clean.sha256 === hash(image), 'attempt-3 cloud report/image mismatch');
  assert(report.captures[0].clean.inspection.synchronizedComparison === true && report.captures[0].clean.inspection.candidateSourceFrame === '42', 'attempt-3 cloud comparison must remain synchronized on frame 42');
  assert(size(image).width === 1366 && size(image).height === 900, 'attempt-3 cloud comparison must retain the normal review viewport');
} else {
  assert(validation.normalSizeSynchronizedGate === 'pending', 'cloud evidence absence must fail closed as pending');
}

assert(refine.includes('attachment_root') && refine.includes('ATTACH_BreastplateTurn3Q__NearUpperArm') && refine.includes('ATTACH_OverheadTwoHandGrip__HandsAndHilt'), 'Blender repair must use compound components inside existing roots');
assert(refine.includes('production_v21_vector_corrected') && refine.includes('performance_changed'), 'Blender repair must record sword correction and unchanged performance');
assert(!refine.includes('fifth corrective attachment'), 'Blender repair must not encode a fifth attachment');
assert(viewer.includes('document.body.dataset.synchronizedComparison') && viewer.includes('comparisonImage.dataset.sourceFrame'), 'viewer must expose synchronized comparison state');
assert(css.includes('.sprite-comparison-grid.has-comparison') && css.includes('@media (max-width: 700px)'), 'viewer must support normal and mobile synchronized layouts');
assert(capture.includes('comparison source frames are not synchronized') && capture.includes('Math.min(preferredFrame, scrubberMax)'), 'cloud capture must fail closed on desynchronization and one-frame bounds');

console.log(JSON.stringify({
  ok: true,
  attemptId: manifest.attemptId,
  sourceFrame: animation.frames[0].sourceFrame,
  sourceTimestampSeconds: animation.frames[0].sourceTimestampSeconds,
  candidateSha256: animation.frames[0].sha256,
  correctiveAttachments: current,
  attachmentAdded: false,
  performanceChanged: false,
  humanAccepted: false,
  state: manifest.reviewState,
}, null, 2));

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

const locked = ['breastplate_turn_3q', 'overhead_two_hand_grip', 'rear_boot_foreshortened'];
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

assert(JSON.stringify(config.initialCorrectiveAttachments) === JSON.stringify(locked), 'initial corrective attachment lock changed');
assert(JSON.stringify(parts.correctiveAttachments.map(({ id }) => id)) === JSON.stringify(locked), 'part library expanded before a synchronized failure');
assert(parts.additionPolicy.initialCorrectiveAttachmentCount === 3, 'initial attachment count must remain three');
assert(parts.additionPolicy.furtherAttachmentRequiresSynchronizedPoseLabFailure === true, 'expansion must require synchronized Pose Lab evidence');
assert(parts.additionPolicy.performanceMayChangeToMeetQuota === false, 'approved performance may not change to meet a quota');
assert(parts.correctiveAttachments.every((item) => item.attempts.length === 1 && item.attempts[0].attemptId === 'muramasa-canary-001-attempt-001'), 'every initial correction must record attempt 001 exactly once');
assert(parts.correctiveAttachments.every((item) => item.attempts[0].reuseDisposition.includes('retain-in-vanguard-vocabulary')), 'every correction must carry a later-reuse disposition');

assert(manifest.reviewState.startsWith('RED'), 'canary must remain visibly quarantined');
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
assert(validation.correctiveAttachmentCount === 3, 'Blender result must contain exactly three corrective attachments');
assert(mapping.timeline.sourceFrameCount === 254 && mapping.timeline.resampled === false, 'complete unresampled reviewed timeline must enter Blender');
assert(mapping.attachments.length === 3, 'mapping manifest must not contain a fourth correction');
assert(mapping.coordinateTransform.outputPixels.perFrameRecentering === false, 'per-frame recentering is forbidden');
assert(mapping.coordinateTransform.outputPixels.perFrameScaleNormalization === false, 'per-frame scale normalization is forbidden');
assert(mapping.coordinateTransform.outputPixels.mirrored === false, 'mirroring is forbidden');

assert(viewer.includes("document.body.dataset.synchronizedComparison"), 'viewer must expose synchronized-comparison readiness');
assert(viewer.includes('comparisonImage.dataset.sourceFrame'), 'viewer must expose witness source frame');
assert(viewer.includes('animation.comparison?.frames'), 'viewer must preload the synchronized witness');
assert(css.includes('.sprite-comparison-grid.has-comparison'), 'viewer must lay out the synchronized comparison');
assert(css.includes('@media (max-width: 700px)'), 'comparison must have a bounded mobile layout');
assert(capture.includes('comparison source frames are not synchronized'), 'cloud capture must fail closed on a desynchronized comparison');
assert(capture.includes("args.manifest"), 'cloud capture must support the canary manifest');

console.log(JSON.stringify({
  ok: true,
  sourceFrame: animation.frames[0].sourceFrame,
  sourceTimestampSeconds: animation.frames[0].sourceTimestampSeconds,
  correctiveAttachments: locked,
  humanAccepted: false,
  state: manifest.reviewState,
}, null, 2));

#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file));
const main = read('src/main.js').toString('utf8');
const css = read('src/styles.css').toString('utf8');
const spriteManifest = JSON.parse(
  read('public/assets/vanguard/fleshpunk/animations.json').toString('utf8'),
);

assert.equal(spriteManifest.schema, 'pose-lab-v2-sprite-animation-set-v1');
assert.equal(spriteManifest.status, 'human-approved-game-asset');
assert.equal(spriteManifest.sourceAuthority.model, 'public/assets/vanguard/vanguard_rigged_animations.glb');
assert.equal(spriteManifest.sourceAuthority.camera, 'fixed model-left, presenting screen-right');
assert.equal(spriteManifest.sourceAuthority.mirrored, false);
assert.equal(spriteManifest.sourceAuthority.perFrameReframing, false);
assert.equal(spriteManifest.sourceAuthority.stabilization, false);
assert.deepEqual(spriteManifest.frame, {
  width: 512,
  height: 512,
  format: 'RGBA PNG',
  originPx: [256, 376],
});

const expectedAnimations = new Map([
  ['Idle', {
    frames: 6,
    durations: [170, 170, 160, 170, 170, 160],
    gamePlayback: 'loop',
  }],
  ['SwordAttack1', {
    frames: 12,
    durations: [50, 50, 50, 50, 50, 50, 50, 50, 70, 80, 80, 120],
    gamePlayback: 'once',
  }],
]);

assert.equal(spriteManifest.animations.length, expectedAnimations.size);
const assetRoot = path.join(root, 'public/assets/vanguard/fleshpunk');
for (const animation of spriteManifest.animations) {
  const expected = expectedAnimations.get(animation.clip);
  assert(expected, `unexpected sprite animation ${animation.clip}`);
  assert.equal(animation.frames.length, expected.frames, `${animation.clip} frame count`);
  assert.equal(animation.gamePlayback, expected.gamePlayback, `${animation.clip} game playback`);
  assert.deepEqual(
    animation.frames.map((frame) => frame.durationMs),
    expected.durations,
    `${animation.clip} authored timings`,
  );
  for (const frame of animation.frames) {
    const file = path.join(assetRoot, frame.src);
    const bytes = fs.readFileSync(file);
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      frame.sha256,
      `${animation.clip} ${frame.src} hash`,
    );
    assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG', `${frame.src} format`);
    assert.equal(bytes.readUInt32BE(16), 512, `${frame.src} width`);
    assert.equal(bytes.readUInt32BE(20), 512, `${frame.src} height`);
    assert.equal(bytes[25], 6, `${frame.src} must be RGBA PNG`);
  }
}

const requiredRuntimeContracts = [
  "vanguardFleshpunkAnimations: './assets/vanguard/fleshpunk/animations.json'",
  "spriteAnimationManifest: ASSETS.vanguardFleshpunkAnimations",
  'function loadTwoDSpriteManifest()',
  "manifest.schema !== 'pose-lab-v2-sprite-animation-set-v1'",
  'await Promise.all(frameSources.map',
  'dataset.twoDSpriteFramesReady',
  'function selectTwoDAnimation(name = null)',
  'function applyTwoDPreviewFrame(frame)',
  'twoDSpriteImage.src = src',
  'function twoDPreviewFrameDuration(frame = twoDPreviewFrame)',
  'function cycleTwoDPreviewSpeed()',
  'data-two-d-previous-frame',
  'data-two-d-next-frame',
  'data-two-d-play-pause',
  'data-two-d-scrub',
  'data-two-d-cycle-clip',
  'data-two-d-speed',
  "handle.visible = viewMode !== 'twoD'",
  "if (viewMode === 'twoD') return false;",
];

for (const contract of requiredRuntimeContracts) {
  assert(main.includes(contract), `2D preview contract missing: ${contract}`);
}

assert(!main.includes('twoDSpriteImage.src = activeImportedAnimationClip'), '2D view must not fake sprite playback from the GLB clip');
assert(!main.includes('.gif'), '2D runtime must not depend on GIF playback');
assert(
  css.includes('.two-d-sprite-stage')
    && css.includes('.two-d-sprite-frame img')
    && css.includes('body.is-2d canvas'),
  '2D preview must expose a dedicated PNG-sequence stage and hide the 3D canvas',
);

console.log(JSON.stringify({
  status: 'PASS',
  checked: [
    'approved Idle and SwordAttack1 sprite promotion',
    '18 RGBA PNG hashes and dimensions',
    'fixed model-left/screen-right source contract',
    'authored per-frame timing',
    'direct PNG sequence playback',
    'play, speed, frame-step, scrub, and clip controls',
    'no GIF runtime dependency',
    '2D authoring-gesture lockout',
  ],
}, null, 2));

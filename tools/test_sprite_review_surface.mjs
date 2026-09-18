#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const failures = [];

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath));
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function pngSize(buffer) {
  const signature = '89504e470d0a1a0a';
  assert(buffer.subarray(0, 8).toString('hex') === signature, 'frame must be a PNG');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const manifestPath = 'public/assets/vanguard/fleshpunk/animations.json';
const manifest = JSON.parse(read(manifestPath).toString('utf8'));
const viewer = read('src/sprite-viewer.js').toString('utf8');
const gifEncoder = read('src/gif-encoder.js').toString('utf8');
const slicer = read('src/sprite-slicer.js').toString('utf8');
const html = read('index.html').toString('utf8');
const css = read('src/styles.css').toString('utf8');

assert(manifest.schema === 'pose-lab-v2-2d-animation-set-v1', '2D manifest schema must be stable');
assert(manifest.character === 'Fleshpunk Vanguard', '2D manifest must identify Fleshpunk Vanguard');
assert(manifest.defaultAnimation === 'idle', 'Idle must remain the default 2D animation');
assert(manifest.frameSpace?.width === 512 && manifest.frameSpace?.height === 512, 'all 2D frames must use the 512x512 game frame');
assert(manifest.frameSpace?.background === 'transparent', '2D frame background must be transparent');
assert(manifest.frameSpace?.facing === 'screen-right', '2D frame set must remain screen-right');
assert(manifest.animations?.length === 2, 'initial 2D set must contain Idle and Sword Attack 1');

const ids = manifest.animations.map((animation) => animation.id);
assert(JSON.stringify(ids) === JSON.stringify(['idle', 'swordattack1']), '2D animation order must be Idle then Sword Attack 1');

for (const animation of manifest.animations) {
  assert(animation.frames.length > 1, `${animation.id} must contain multiple frames`);
  assert(animation.loop === true, `${animation.id} must default to a review loop`);
  assert(typeof animation.contactSheet === 'string', `${animation.id} must retain a contact-sheet approval artifact`);
  assert(fs.existsSync(path.join(root, 'public/assets/vanguard/fleshpunk', animation.contactSheet)), `${animation.id} contact sheet is missing`);

  for (const [index, frame] of animation.frames.entries()) {
    assert(!frame.src.toLowerCase().endsWith('.gif'), `${animation.id} frame ${index} must not use GIF playback`);
    assert(Number.isFinite(frame.durationMs) && frame.durationMs > 0, `${animation.id} frame ${index} duration is invalid`);
    const relativeFramePath = path.join('public/assets/vanguard/fleshpunk', frame.src);
    assert(fs.existsSync(path.join(root, relativeFramePath)), `${animation.id} frame ${index} is missing`);
    if (!fs.existsSync(path.join(root, relativeFramePath))) continue;
    const bytes = read(relativeFramePath);
    const size = pngSize(bytes);
    assert(size.width === 512 && size.height === 512, `${animation.id} frame ${index} changed dimensions`);
    assert(sha256(bytes) === frame.sha256, `${animation.id} frame ${index} changed approved bytes`);
  }
}

const idle = manifest.animations[0];
const attack = manifest.animations[1];
assert(idle.frames.length === 6, 'approved Idle must retain six key frames');
assert(idle.frames.reduce((sum, frame) => sum + frame.durationMs, 0) === 1000, 'approved Idle timing must remain one second');
assert(attack.frames.length === 12, 'approved Sword Attack 1 must retain twelve frames');
assert(attack.frames.reduce((sum, frame) => sum + frame.durationMs, 0) === 750, 'approved Sword Attack 1 timing must remain 750ms');

assert(html.includes("startupParams.get('view')"), 'HTML must route the requested Pose Lab view');
assert(html.includes("'./src/sprite-viewer.js'"), 'HTML must expose the 2D review entry');
assert(html.includes("'./src/main.js'"), 'HTML must retain the 3D editor entry');
assert(viewer.includes('.durationMs / playbackSpeed'), '2D playback must honor per-frame timing');
assert(viewer.includes("event.key === 'ArrowLeft'") && viewer.includes("event.key === 'ArrowRight'"), '2D review must support keyboard frame stepping');
assert(viewer.includes("stack.classList.toggle('show-onion'"), '2D review must expose onion-skin deltas');
assert(viewer.includes('buildDeltaImage') && viewer.includes("stack.classList.toggle('show-delta'"), '2D review must expose exact pixel-delta inspection');
assert(!css.includes('sprite-onion-previous {\n  transform:') && !css.includes('sprite-onion-next {\n  transform:'), '2D inspection must not invent frame motion');
assert(viewer.includes("document.body.dataset.reviewReady = '1'"), '2D review must expose a visual-capture readiness signal');
assert(css.includes('.sprite-stage.checker') && css.includes('.sprite-frame-strip'), '2D review styles are incomplete');
assert(viewer.includes('New Pose Lab animation') && viewer.includes('data-import-screen'), 'Sprite Lab must use a full-page import flow inside the 2D viewer');
assert(viewer.includes('data-import-file') && viewer.includes('data-import-preview'), 'importer must expose a visible file picker and editable sheet canvas');
assert(!viewer.includes('Grid does not divide') && !viewer.includes('data-import-columns'), 'importer must not require a divisible fixed grid');
assert(viewer.includes('detectFrameBoxes') && viewer.includes('beginBoxEdit') && viewer.includes('Add box'), 'importer must propose and allow correction of frame boxes');
assert(viewer.includes('createImportedAnimation') && viewer.includes('manifest.animations.push'), 'contact sheet must become a new Pose Lab animation, not a detached preview');
assert(viewer.includes('Export GIF') && viewer.includes('encodeGif(frames, animation.frames[0].durationMs)'), 'imported Pose Lab animation must export an animated GIF');
assert(viewer.includes("localStorage.setItem('pose-lab-sprite-lab-recent'") && viewer.includes("indexedDB.open('pose-lab-sprite-lab'"), 'Sprite Lab must persist source bytes and recent metadata locally');
assert(slicer.includes('dominantBorderColor') && slicer.includes('projectionRuns'), 'intelligent slicer must derive candidates from source pixels');
assert(gifEncoder.includes("'image/gif'") && gifEncoder.includes('GIF89a') && gifEncoder.includes('NETSCAPE2.0'), 'Sprite Lab GIF encoder must create a looping GIF artifact');
assert(css.includes('.sprite-import-screen') && css.includes('.sprite-import-card'), 'full-page Sprite Lab importer styles are incomplete');

const swarmlingManifestPath = 'public/assets/swarmling/fleshpunk/animations.json';
if (fs.existsSync(path.join(root, swarmlingManifestPath))) {
  const swarmling = JSON.parse(read(swarmlingManifestPath).toString('utf8'));
  assert(swarmling.schema === 'pose-lab-v2-2d-animation-set-v1', 'Swarmling 2D manifest schema must be stable');
  assert(swarmling.character === 'Fleshpunk Swarmling', 'Swarmling manifest must identify the character');
  assert(swarmling.defaultAnimation === 'idle', 'Swarmling Idle must be the default animation');
  assert(swarmling.frameSpace?.width === 512 && swarmling.frameSpace?.height === 512, 'Swarmling frames must use the 512x512 game frame');
  assert(swarmling.frameSpace?.background === 'transparent', 'Swarmling frames must retain transparency');
  assert(swarmling.frameSpace?.facing === 'screen-left', 'Swarmling must face screen-left toward Vanguard');
  assert(swarmling.animations?.length === 1, 'Swarmling test set must contain only native Idle');
  const swarmlingIdle = swarmling.animations[0];
  assert(swarmlingIdle.id === 'idle' && swarmlingIdle.frames.length === 6, 'Swarmling Idle must contain six frames');
  for (const [index, frame] of swarmlingIdle.frames.entries()) {
    const relativeFramePath = path.join('public/assets/swarmling/fleshpunk', frame.src);
    assert(fs.existsSync(path.join(root, relativeFramePath)), `Swarmling Idle frame ${index} is missing`);
    if (!fs.existsSync(path.join(root, relativeFramePath))) continue;
    const bytes = read(relativeFramePath);
    const size = pngSize(bytes);
    assert(size.width === 512 && size.height === 512, `Swarmling Idle frame ${index} changed dimensions`);
    assert(sha256(bytes) === frame.sha256, `Swarmling Idle frame ${index} changed approved bytes`);
  }
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  animations: manifest.animations.map((animation) => ({
    id: animation.id,
    frames: animation.frames.length,
    durationMs: animation.frames.reduce((sum, frame) => sum + frame.durationMs, 0),
  })),
  checks: [
    'approved PNG hashes',
    '512x512 RGBA asset contract',
    'direct frame playback',
    'per-frame timing',
    'scrub and keyboard stepping',
    'onion-skin inspection',
    'pixel-delta inspection',
    'no inspection-authored frame motion',
  ],
}, null, 2));

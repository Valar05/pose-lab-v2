#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(root, 'public/assets/crimson/crimson_review_assets_manifest.json');
const mainPath = path.join(root, 'src/main.js');

function fail(message) {
  console.error(JSON.stringify({ ok: false, check: 'crimson-review-assets', error: message }, null, 2));
  process.exit(1);
}
function assert(condition, message) { if (!condition) fail(message); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function loadJson(file) { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
function readGlb(file) {
  const data = fs.readFileSync(path.join(root, file));
  assert(data.toString('ascii', 0, 4) === 'glTF', `${file} is not GLB`);
  let offset = 12;
  let json = null;
  while (offset < data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    const chunk = data.slice(offset + 8, offset + 8 + length);
    if (type === 'JSON') json = JSON.parse(chunk.toString('utf8').replace(/\0+$/g, '').trimEnd());
    offset += 8 + length;
  }
  assert(json, `${file} missing JSON`);
  return { json, bytes: data.length };
}

assert(exists('public/assets/crimson/crimson_plume_knight_rigged_pbr_review.glb'), 'missing optimized Crimson character review GLB; run npm run optimize:crimson-review-assets');
assert(exists('public/assets/crimson/arborblade_sword_review.glb'), 'missing optimized Arborblade review GLB; run npm run optimize:crimson-review-assets');
assert(fs.existsSync(manifestPath), 'missing Crimson review asset manifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(manifest.schema === 'pose-lab-v2-crimson-review-assets-v1', 'wrong review asset manifest schema');
assert(manifest.combinedReviewBytes <= manifest.budgets.combinedReviewBytesMax, 'combined Crimson review payload exceeds budget');
assert(manifest.character.reviewBytes <= manifest.budgets.characterReviewBytesMax, 'character review payload exceeds budget');
assert(manifest.sword.reviewBytes <= manifest.budgets.swordReviewBytesMax, 'sword review payload exceeds budget');
assert(manifest.combinedReviewBytes < manifest.combinedSourceBytes * 0.55, 'review payload must materially reduce full source payload');
const character = readGlb('public/assets/crimson/crimson_plume_knight_rigged_pbr_review.glb');
const sword = readGlb('public/assets/crimson/arborblade_sword_review.glb');
assert((character.json.animations || []).length >= 2, 'optimized Crimson character must preserve walking/running animations');
assert((character.json.skins || []).length >= 1, 'optimized Crimson character must preserve skin');
assert((character.json.images || []).length >= 4, 'optimized Crimson character must preserve PBR image channels');
assert((sword.json.images || []).length >= 4, 'optimized Arborblade must preserve PBR image channels');
assert(sword.json.asset?.extras?.poseLabV2ReviewOptimization, 'optimized sword must record review optimization provenance');
const calibration = loadJson('public/assets/crimson/crimson_sword_calibration.json');
assert(JSON.stringify(calibration.bladeLocalAxis) === JSON.stringify([0, 0, 1]), 'Crimson sword calibration must keep +Z blade axis');
const main = fs.readFileSync(mainPath, 'utf8');
assert(main.includes("crimson_plume_knight_rigged_pbr_review.glb"), 'runtime must reference optimized Crimson review character by default');
assert(main.includes("arborblade_sword_review.glb"), 'runtime must reference optimized Arborblade review sword by default');
assert(main.includes("quality=source") || main.includes("URL_PARAMS.get('quality')"), 'runtime must expose quality=source full-fidelity escape hatch');
console.log(JSON.stringify({
  ok: true,
  check: 'crimson-review-assets',
  combinedReviewBytes: manifest.combinedReviewBytes,
  combinedSourceBytes: manifest.combinedSourceBytes,
  characterBytes: character.bytes,
  swordBytes: sword.bytes,
}, null, 2));

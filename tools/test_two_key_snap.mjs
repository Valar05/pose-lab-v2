#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  TWO_KEY_MODE,
  buildTwoKeyPlan,
  deriveDeformationRecipe,
  estimateAlphaMask,
  estimateFootAnchor,
  renderTwoKeyFrameRgba,
  validateParametricDocument,
} from '../src/two-key-snap.js';
import { buildStoredZip } from '../src/zip-store.js';

const width = 12;
const height = 12;
const transparent = [0, 0, 0, 0];

function sprite(fill) {
  return new Uint8ClampedArray(width * height * 4);
}

function paintPixel(rgba, x, y, color) {
  const offset = (y * width + x) * 4;
  rgba.set(color, offset);
}

function rgbaAt(rgba, x, y) {
  const offset = (y * width + x) * 4;
  return [...rgba.slice(offset, offset + 4)];
}

function paintRect(rgba, x0, y0, x1, y1, colorFor) {
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      paintPixel(rgba, x, y, colorFor(x, y));
    }
  }
}

function colorSet(rgba) {
  const set = new Set();
  for (let offset = 0; offset < rgba.length; offset += 4) {
    set.add([...rgba.slice(offset, offset + 4)].join(','));
  }
  return set;
}

function assertPixelsDrawOnlyFrom(output, source, message) {
  const allowed = colorSet(source);
  allowed.add(transparent.join(','));
  for (let offset = 0; offset < output.length; offset += 4) {
    const color = [...output.slice(offset, offset + 4)].join(',');
    assert.ok(allowed.has(color), message + ' at pixel ' + (offset / 4) + ': ' + color);
  }
}

const standing = sprite();
paintRect(standing, 4, 1, 7, 9, (x, y) => [20 + x, 40 + y, 90, 255]);
paintRect(standing, 3, 10, 8, 11, (x, y) => [60 + x, 100 + y, 120, 255]);

const crouched = sprite();
paintRect(crouched, 2, 5, 9, 9, (x, y) => [160 + x, 20 + y, 40, 255]);
paintRect(crouched, 3, 10, 8, 11, (x, y) => [190 + x, 50 + y, 60, 255]);

const plan = buildTwoKeyPlan({
  holdA: 500,
  bridgeAB: 240,
  bridgeSteps: 3,
  holdB: 500,
  bridgeBA: 300,
  pingPong: true,
  easing: 'ease-in-out',
  deformStrength: 70,
});

assert.equal(plan.mode, TWO_KEY_MODE);
assert.equal(plan.frames.length, 8);
assert.deepEqual(
  plan.frames.map((frame) => frame.frameType),
  ['authored', 'procedural', 'procedural', 'procedural', 'authored', 'procedural', 'procedural', 'procedural'],
);
assert.equal(plan.frames[0].key, 'A');
assert.equal(plan.frames[4].key, 'B');
assert.ok(plan.frames.slice(1, 4).every((frame) => frame.from === 'A' && frame.to === 'B'));
assert.ok(plan.frames.slice(5).every((frame) => frame.from === 'B' && frame.to === 'A'));

const zeroPlan = buildTwoKeyPlan({
  holdA: 100,
  bridgeAB: 100,
  bridgeSteps: 0,
  holdB: 100,
  bridgeBA: 100,
  pingPong: true,
  deformStrength: 0,
});
assert.equal(zeroPlan.settings.bridgeSteps, 0, 'bridgeSteps=0 must remain zero');
assert.equal(zeroPlan.settings.deformStrength, 0, 'deformStrength=0 must remain zero');
assert.deepEqual(zeroPlan.frames.map((frame) => frame.frameType), ['authored', 'authored']);

const recipe = deriveDeformationRecipe(standing, crouched, width, height, {
  plantedFeet: true,
  anchorBandPx: 2,
  maskPaddingPx: 0,
  alphaThreshold: 24,
});
assert.equal(recipe.schema, 'pose-lab-v2-deformation-recipe-v1');
assert.equal(recipe.method, 'anchored-silhouette-row-warp-v1');
assert.equal(recipe.plantedFeet, true);
assert.equal(recipe.maskPaddingPx, 0, 'maskPaddingPx=0 must remain zero');
assert.equal(recipe.alphaThreshold, 24);
const zeroThresholdRecipe = deriveDeformationRecipe(standing, crouched, width, height, {
  plantedFeet: true,
  anchorBandPx: 2,
  maskPaddingPx: 0,
  alphaThreshold: 0,
});
assert.equal(zeroThresholdRecipe.alphaThreshold, 0, 'alphaThreshold=0 must remain zero');
assert.equal(zeroThresholdRecipe.maskPaddingPx, 0, 'zero threshold recipe must keep zero mask padding');
assert.deepEqual(estimateAlphaMask(standing, width, height, 24, 0), {
  x: 3, y: 1, width: 6, height: 11, source: 'alpha-subject',
});
assert.deepEqual(estimateAlphaMask(crouched, width, height, 24, 0), {
  x: 2, y: 5, width: 8, height: 7, source: 'alpha-subject',
});
assert.equal(Math.round(estimateFootAnchor(standing, width, height).y), 11);
assert.equal(Math.round(estimateFootAnchor(crouched, width, height).y), 11);

const authoredA = renderTwoKeyFrameRgba(plan.frames[0], { A: standing, B: crouched }, width, height, recipe);
const authoredB = renderTwoKeyFrameRgba(plan.frames[4], { A: standing, B: crouched }, width, height, recipe);
assert.deepEqual([...authoredA], [...standing], 'Key A must remain pixel-exact');
assert.deepEqual([...authoredB], [...crouched], 'Key B must remain pixel-exact');

const bridgeAB = renderTwoKeyFrameRgba(plan.frames[2], { A: standing, B: crouched }, width, height, recipe);
const bridgeBA = renderTwoKeyFrameRgba(plan.frames[6], { A: standing, B: crouched }, width, height, recipe);
assert.notDeepEqual([...bridgeAB], [...standing], 'A→B bridge must visibly deform from standing');
assert.notDeepEqual([...bridgeAB], [...crouched], 'A→B bridge must not pretend to be authored Key B');
assert.notDeepEqual([...bridgeBA], [...crouched], 'B→A bridge must visibly deform from crouched');
assertPixelsDrawOnlyFrom(bridgeAB, standing, 'A→B bridge must sample pixels only from Key A, never crossfade from B');
assertPixelsDrawOnlyFrom(bridgeBA, crouched, 'B→A bridge must sample pixels only from Key B, never crossfade from A');

for (let y = 10; y <= 11; y += 1) {
  for (let x = 3; x <= 8; x += 1) {
    assert.deepEqual(rgbaAt(bridgeAB, x, y), rgbaAt(standing, x, y), 'planted Key A foot band drifted');
    assert.deepEqual(rgbaAt(bridgeBA, x, y), rgbaAt(crouched, x, y), 'planted Key B foot band drifted');
  }
}

const nativeDocument = {
  schema: 'pose-lab-v2-two-key-parametric-v1',
  version: 1,
  mode: TWO_KEY_MODE,
  id: 'crouch-contract-test',
  label: 'Crouch contract test',
  loop: true,
  frameSpace: { width, height, background: 'transparent' },
  endpoints: {
    A: { name: 'standing.png', dataUrl: 'data:image/png;base64,AA==', sha256: 'a' },
    B: { name: 'crouched.png', dataUrl: 'data:image/png;base64,AA==', sha256: 'b' },
  },
  timing: { ...plan.settings },
  recipe,
  plan: plan.frames.map((frame) => ({ ...frame })),
};
assert.equal(validateParametricDocument(nativeDocument), nativeDocument);
assert.ok(nativeDocument.plan.filter((frame) => frame.frameType === 'procedural').every((frame) => !('src' in frame) && !('dataUrl' in frame)));

const illegalNativeDocument = structuredClone(nativeDocument);
illegalNativeDocument.plan[1].dataUrl = 'data:image/png;base64,forbidden';
assert.throws(
  () => validateParametricDocument(illegalNativeDocument),
  /must not be stored/,
  'native parametric JSON must reject baked procedural bridge frames',
);

const bytes = new TextEncoder().encode('pose-lab');
const zipped = buildStoredZip([{ name: 'Key-A.png', bytes }, { name: 'Key-B.png', bytes }]);
const zipView = new DataView(zipped.buffer, zipped.byteOffset, zipped.byteLength);
assert.equal(zipView.getUint32(0, true), 0x04034b50);
assert.equal(zipView.getUint32(zipped.length - 22, true), 0x06054b50);

console.log(JSON.stringify({
  ok: true,
  mode: plan.mode,
  frames: plan.frames.map(({ frameType, label, durationMs }) => ({ frameType, label, durationMs })),
  recipe: {
    method: recipe.method,
    anchors: recipe.anchors,
    masks: recipe.masks,
    plantedFeet: recipe.plantedFeet,
  },
  checks: [
    'authored Key A pixel identity',
    'authored Key B pixel identity',
    'standing-to-crouch spatial deformation',
    'procedural pixels come from one authored endpoint only',
    'no crossfade ghosting',
    'planted-foot anchor band invariant',
    'native parametric plan contains zero bridge bitmaps',
    'native schema rejects stored procedural bitmaps',
    'PNG ZIP container',
  ],
}, null, 2));

#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildTwoKeyPlan, hardSnapPixels, estimateFootAnchor, alignTargetToFoot } from '../src/two-key-snap.js';
import { buildStoredZip } from '../src/zip-store.js';

const plan = buildTwoKeyPlan({ holdA:500, bridgeAB:240, bridgeSteps:3, holdB:500, bridgeBA:300, pingPong:true, easing:'ease-in-out', snapStrength:70 });
assert.equal(plan.frames[0].frameType, 'authored');
assert.equal(plan.frames[0].label, 'K0');
assert.equal(plan.frames[4].frameType, 'authored');
assert.equal(plan.frames[4].label, 'K3');
assert.ok(plan.frames.slice(1,4).every(f => f.frameType === 'procedural'));
assert.ok(plan.frames.slice(5).every(f => f.frameType === 'procedural'));
assert.equal(plan.frames.length, 8);

const a = new Uint8ClampedArray([10,20,30,255, 40,50,60,255, 70,80,90,255, 100,110,120,255]);
const b = new Uint8ClampedArray([210,220,230,255, 240,250,255,255, 170,180,190,255, 140,150,160,255]);
assert.deepEqual([...hardSnapPixels(a,b,2,2,0)], [...a]);
assert.deepEqual([...hardSnapPixels(a,b,2,2,1)], [...b]);
const bridge = hardSnapPixels(a,b,2,2,0.5);
for (let o=0;o<bridge.length;o+=4) {
  const p=bridge.slice(o,o+4), ap=a.slice(o,o+4), bp=b.slice(o,o+4);
  assert.ok(p.every((v,i)=>v===ap[i]) || p.every((v,i)=>v===bp[i]), 'bridge pixel was blended');
}
const fa=new Uint8ClampedArray(4*4*4), fb=new Uint8ClampedArray(4*4*4);
for (const x of [1,2]) fa[(3*4+x)*4+3]=255;
for (const x of [2,3]) fb[(2*4+x)*4+3]=255;
assert.equal(estimateFootAnchor(fa,4,4).y,3);
const aligned=alignTargetToFoot(fa,fb,4,4);
assert.equal(aligned.dy,1);
assert.ok(aligned.dx<0);

const bytes=new TextEncoder().encode('pose-lab');
const zipped=buildStoredZip([{name:'K0.png',bytes},{name:'K3.png',bytes}]);
const view=new DataView(zipped.buffer,zipped.byteOffset,zipped.byteLength);
assert.equal(view.getUint32(0,true),0x04034b50);
assert.equal(view.getUint32(zipped.length-22,true),0x06054b50);

console.log(JSON.stringify({ok:true,frames:plan.frames.map(({frameType,label,durationMs})=>({frameType,label,durationMs})),checks:['authored endpoint identity','procedural labeling','no ghost blending','foot anchoring','PNG ZIP container']},null,2));

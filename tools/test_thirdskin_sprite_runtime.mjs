import assert from 'node:assert/strict';
import { locateProgramStep, normalizeRuntimePlan, sampleCurve } from '../src/thirdskin-runtime.js';

const plan={
 schema:'thirdskin-runtime-plan-v1',id:'test-jab',character:'April',actionClass:'combat',
 cellCount:2,nonIdleCellCount:1,derivedFramesStored:false,totalDurationMs:30,
 cellTable:{
  idle:{role:'idle',asset:'./idle.png',sha256:'1'.repeat(64)},
  hit:{role:'contact',asset:'./hit.png',sha256:'2'.repeat(64)}
 },
 deformationCurves:{
  idle:{durationMs:20,loop:true,interpolation:'linear',controlPoints:[{t:0,values:{leftStretch:0}},{t:1,values:{leftStretch:.1}}]},
  snap:{durationMs:10,loop:false,interpolation:'step',controlPoints:[{t:0,values:{rightStretch:0}},{t:1,values:{rightStretch:.2}}]}
 },
 program:[
  {index:0,cell:'idle',role:'idle',curve:'idle',durationMs:10,effects:[]},
  {index:1,cell:'hit',role:'contact',curve:'snap',durationMs:10,effects:['contact-echo']},
  {index:2,cell:'idle',role:'idle',curve:'idle',durationMs:10,effects:[]}
 ],
 review:{status:'draft',surface:'sprite-lab'}
};
const normalized=normalizeRuntimePlan(plan,new URL('https://example.test/runtime.json'));
assert.equal(Object.keys(normalized.cells).length,2);
assert.equal(normalized.program[1].startMs,10);
assert.equal(locateProgramStep(normalized.program,15,30).role,'contact');
assert.equal(sampleCurve(plan.deformationCurves.snap,9).values.rightStretch,0);
assert.ok(sampleCurve(plan.deformationCurves.idle,10).values.leftStretch>0);
assert.equal('frames' in normalized,false);
assert.throws(()=>normalizeRuntimePlan({...plan,frames:[]},new URL('https://example.test/runtime.json')),/must not contain stored frames/);
console.log(JSON.stringify({ok:true,checks:['two-source-cells','program-boundaries','curve-sampling','no-stored-frames']}));

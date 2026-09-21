import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

const aprilPlanPath=new URL('../public/assets/thirdskin/april/idle-v3/runtime-plan.json',import.meta.url);
const aprilPlan=JSON.parse(readFileSync(aprilPlanPath,'utf8'));
const april=normalizeRuntimePlan(aprilPlan,new URL('https://example.test/assets/thirdskin/april/idle-v3/runtime-plan.json'));
assert.equal(april.deformationContract.mode,'hip-knee-bridge');
assert.equal(april.deformationContract.upperBody,'rigid translation only');
assert.equal(april.deformationContract.lowerLegs,'rigid and stationary');
assert.equal(april.deformationContract.rootMotion,false);
assert.equal(april.cellTable.idle.sha256,'62286087ef03c82cc98bf5b716073aca78999588a1acd13be11be18718c94346');
const aprilCurve=april.deformationCurves['anchored-idle-cycle'];
for(const point of aprilCurve.controlPoints){
 assert.equal(point.values.overallScale,1);
 assert.equal(point.values.rotationDeg,0);
 assert.equal(point.values.translateY,0);
 assert.equal(point.values.hipUv,.48);
 assert.equal(point.values.kneeUv,.26);
}
assert.equal(sampleCurve(aprilCurve,0).values.hipKneeCrouch,0);
assert.equal(sampleCurve(aprilCurve,1000).values.hipKneeCrouch,.055);
assert.equal(sampleCurve(aprilCurve,500).values.hipKneeShear,-.012);
assert.equal(sampleCurve(aprilCurve,1500).values.hipKneeShear,.012);
console.log(JSON.stringify({ok:true,checks:['two-source-cells','program-boundaries','curve-sampling','no-stored-frames','april-hip-knee-locality','april-phase-locked-cycle']}));

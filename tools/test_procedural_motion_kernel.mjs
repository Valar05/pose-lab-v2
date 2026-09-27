#!/usr/bin/env node
import assert from 'node:assert/strict';
import {evaluateProceduralMotion} from '../src/procedural-motion-kernel.js';

const base={shearX:0,scaleX:1,scaleY:1,rotateDeg:0};

const idle={
  mode:'deform-breath-v3',cycleMs:1500,
  amplitudes:{shearX:.052,scaleX:.008,scaleY:.014,rotateDeg:1.75},
  harmonics:{secondary:.30,tertiary:.10},
  axisPhase:{shearX:.75,scaleX:2.4,scaleY:.2,rotateDeg:1.35},
  phaseWeights:{idle:1},terminalStillPhases:[]
};
const i0=evaluateProceduralMotion(idle,{ms:0,phaseId:'idle',phaseU:0},base);
const i1=evaluateProceduralMotion(idle,{ms:420,phaseId:'idle',phaseU:.3},base);
assert.notDeepEqual(i0,i1,'idle must deform over time');
assert.ok(Math.abs(i1.shearX)>0.01||Math.abs(i1.rotateDeg)>0.25,'idle needs visible deformation');
assert.ok(Math.abs(i1.scaleX-1)<0.02,'idle X shrink/grow must remain small');
assert.ok(Math.abs(i1.scaleY-1)<0.03,'idle Y shrink/grow must remain small');

const micro={
  mode:'micro-alert-cluster',cycleMs:92,clusterMs:430,decayMs:720,
  amplitudes:{shearX:.022,scaleX:.008,scaleY:.014,rotateDeg:1.15},
  axisPhase:{shearX:.25,scaleX:1.6,scaleY:.05,rotateDeg:2.1},
  phaseWeights:{'surprise-flare':1.15},terminalStillPhases:[]
};
const samples=[0,23,46,69,92,115,138].map(ms=>
  evaluateProceduralMotion(micro,{ms,phaseId:'surprise-flare',phaseU:.5},base)
);
assert.ok(new Set(samples.map(x=>x.rotateDeg.toFixed(3))).size>=5,'aggro must produce fast micro-pulse variation');
assert.ok(Math.max(...samples.map(x=>Math.abs(x.scaleY-1)))<0.04,'aggro micro-pulses must not become broad size pumping');

for(const [mode,phase] of [
  ['attack-snap','strike'],
  ['attack-drag','rake'],
  ['attack-bloom','bloom-impact']
]){
  const p={
    mode,cycleMs:200,
    amplitudes:{shearX:.05,scaleX:.02,scaleY:.025,rotateDeg:2.5},
    axisPhase:{shearX:0,scaleX:1,scaleY:2,rotateDeg:.5},
    phaseWeights:{[phase]:1},terminalStillPhases:[]
  };
  const a=evaluateProceduralMotion(p,{ms:35,phaseId:phase,phaseU:.5},base);
  assert.notDeepEqual(a,base,mode+' must materially affect the attack');
}

console.log(JSON.stringify({
  ok:true,
  checked:[
    'low-shrink-high-deform-idle',
    'clustered-aggro-micro-pulses',
    'attack-snap',
    'attack-drag',
    'attack-bloom'
  ]
},null,2));

#!/usr/bin/env node
import assert from 'node:assert/strict';
import {evaluateProceduralMotion} from '../src/procedural-motion-kernel.js';

const base={shearX:0,scaleX:1,scaleY:1,rotateDeg:0};

const idle={
  mode:'organic-breath-v2',cycleMs:1500,
  amplitudes:{shearX:.028,scaleX:.022,scaleY:.044,rotateDeg:1.15},
  harmonics:{secondary:.26,tertiary:.08},
  axisPhase:{shearX:.9,scaleX:2.2,scaleY:.15,rotateDeg:1.45},
  phaseWeights:{idle:1},terminalStillPhases:[]
};
const a=evaluateProceduralMotion(idle,{ms:0,phaseId:'idle',phaseU:0},base);
const b=evaluateProceduralMotion(idle,{ms:375,phaseId:'idle',phaseU:.25},base);
assert.notDeepEqual(a,b,'idle physiology must visibly evolve over time');
assert.ok(Math.abs(b.scaleY-1)>0.005,'idle breathing must materially change vertical scale');
assert.ok(Math.abs(b.rotateDeg)>0.1,'idle sway must materially rotate');

const aggro={
  mode:'asymmetric-alert-pulse',cycleMs:240,
  amplitudes:{shearX:.052,scaleX:.034,scaleY:.062,rotateDeg:2.8},
  axisPhase:{shearX:.35,scaleX:1.75,scaleY:0,rotateDeg:2.35},
  phaseWeights:{'idle-enter':.12,'surprise-flare':1.25,'surprise-hold':.82,'idle-return':.22},
  terminalStillPhases:[]
};
const flare=evaluateProceduralMotion(aggro,{ms:60,phaseId:'surprise-flare',phaseU:.4},base);
const idleEnter=evaluateProceduralMotion(aggro,{ms:60,phaseId:'idle-enter',phaseU:.4},base);
assert.ok(Math.abs(flare.scaleY-1)>Math.abs(idleEnter.scaleY-1),'aggro flare must pulse harder than idle-enter');

const death={
  mode:'terminal-spasm',cycleMs:125,decayMs:520,
  amplitudes:{shearX:.05,scaleX:.03,scaleY:.046,rotateDeg:3.25},
  axisPhase:{shearX:.2,scaleX:1.3,scaleY:2.6,rotateDeg:.75},
  phaseWeights:{'fatal-stagger':1,'fatal-kneel':.78,'fall-prone':.48,corpse:0},
  terminalStillPhases:['corpse']
};
const corpse=evaluateProceduralMotion(death,{ms:1200,phaseId:'corpse',phaseU:.5},base);
assert.deepEqual(corpse,base,'corpse phase must be absolutely still');
const dying=evaluateProceduralMotion(death,{ms:100,phaseId:'fatal-stagger',phaseU:.5},base);
assert.notDeepEqual(dying,base,'death must have motion before corpse');

console.log(JSON.stringify({ok:true,checked:[
  'independent-axis-oscillators',
  'phase-weighted-envelopes',
  'asymmetric-alert-pulse',
  'visible-organic-idle',
  'terminal-corpse-stillness'
]},null,2));

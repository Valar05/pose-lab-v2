import assert from 'node:assert/strict';
import {SerinGlideController,demoAxis,DEMO_DURATION_SECONDS} from '../src/serin-glide-system.mjs';
const c=new SerinGlideController();
function simulate(seconds,axis,controller=c){let s;for(let i=0;i<Math.round(seconds*120);i++)s=controller.update(1/120,axis);return s;}
let s=simulate(1,0);assert.equal(s.mode,'idle');assert.equal(s.poseBlend,0);assert.equal(s.position,0);
s=simulate(1.2,1);assert.ok(s.velocity>100&&s.poseBlend>0.7&&s.pitch>0&&s.position>0);
const prev=s.position;s=simulate(0.15,0);assert.equal(s.mode,'braking');assert.ok(s.position>=prev&&Math.abs(s.slosh)>0.001);
s=simulate(4.5,0);assert.equal(s.mode,'idle');assert.equal(s.velocity,0);assert.equal(s.pitch,0);assert.equal(s.poseBlend,0);
s=simulate(0.7,-1);assert.ok(s.velocity<0);assert.equal(s.facing,-1);
s=simulate(5,0);assert.equal(s.mode,'idle');
assert.equal(demoAxis(0),0);assert.equal(demoAxis(1.5),1);assert.equal(demoAxis(8.8),0);assert.equal(demoAxis(DEMO_DURATION_SECONDS),0);
const a=new SerinGlideController(),b=new SerinGlideController();
for(let i=0;i<1000;i++){a.update(1/120,i<350?1:0);b.update(1/120,i<350?1:0);}
assert.deepEqual(a.getState(),b.getState());
assert.throws(()=>a.update(1,1),/INVALID_GLIDE_DELTA/);
console.log('SERIN_DYNAMIC_START_BRAKE_SLOSH_IDLE=PASS');

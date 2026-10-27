import assert from 'node:assert/strict';
import {SerinTailMomentum} from '../src/serin-tail-momentum.mjs';
import {SerinUnifiedLocomotion} from '../src/serin-unified-locomotion.mjs';
const h=1/120,impulse=760,max=235;
function simulate(axis,launchFrom){
 const controller=new SerinUnifiedLocomotion(),spring=new SerinTailMomentum();
 if(launchFrom==='glide')for(let i=0;i<125;i++)controller.update(h,axis,false);
 const output=[];
 for(let i=0;i<170;i++){
  const state=controller.update(h,axis,i===0);
  const material=spring.advance(h,state,max,impulse);
  output.push({...material,inAir:state.inAir,jumpY:state.jumpY,landingCount:state.landingCount});
 }
 return output;
}
const idle=simulate(0,'idle'),glide=simulate(1,'glide');
assert.ok(idle[0].jumpY>0&&glide[0].jumpY>0,'physics starts on first frame, no animation delay');
assert.equal(idle[0].launchKind,'idle');
assert.equal(glide[0].launchKind,'glide');
assert.ok(idle[0].launchMomentum<0.25&&glide[0].launchMomentum>0.6,'distinct takeoff context');
assert.ok(idle[0].length<0.80&&glide[0].length<0.9,'liquid gathers instantly');
assert.ok(Math.abs(glide[0].bend)>Math.abs(idle[0].bend)+0.02,'sideways glide launch must visibly start lagging');
assert.ok(Math.max(...idle.map(s=>s.length))>1.06,'tail must extend in air');
assert.ok(Math.max(...glide.map(s=>Math.abs(s.bend)))>0.10,'glide stays swept backward');
assert.ok(idle.some(s=>s.landingCount>0)&&glide.some(s=>s.landingCount>0),'both land');
assert.ok(idle.some(s=>s.impact>0.2)&&glide.some(s=>s.impact>0.2),'contact activates spring recoil');
assert.ok(idle.every(s=>s.length>=0.62&&s.length<=1.36),'length remains bounded');
assert.ok(glide.every(s=>Math.abs(s.bend)<=0.34),'swing remains bounded');
const ctl=new SerinUnifiedLocomotion(),a=new SerinTailMomentum(),b=new SerinTailMomentum();
for(let i=0;i<250;i++){
 const state=ctl.update(h,i<185?1:0,i===132);
 assert.deepEqual(a.advance(h,state,max,impulse),b.advance(h,state,max,impulse),'deterministic spring');
}
assert.throws(()=>a.advance(-1,ctl.getState(),max,impulse),/TAIL_INVALID_DT/);
assert.throws(()=>a.advance(h,ctl.getState(),0,impulse),/TAIL_INVALID_CONFIG/);
a.reset();assert.equal(a.length,1);assert.equal(a.impact,0);
console.log('SERIN_TAIL_IDLE_VS_GLIDE_SPRING_AND_COLLISION_PASS');

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const fail=m=>{throw new Error(m)};

const contract=json('campaigns/swarmling-procedural-physiology-v5.contract.json');
const manifest=json('public/assets/vanguard/fleshpunk/characters/swarmling/animations.json');
const byId=id=>manifest.animations.find(a=>a.id===id);

if(manifest.authority?.sourceByteSha256!==contract.lockedAcceptedState.atlasSha256)fail('atlas changed');

for(const [id,cells] of Object.entries(contract.lockedAcceptedState.utilityPoseSequences)){
  const a=byId(id);
  if(!a)fail('missing utility '+id);
  if(JSON.stringify(a.timeline.map(f=>f.sourceCell))!==JSON.stringify(cells))fail(id+' pose sequence changed');
}

for(const id of ['idle','aggro','damage']){
  const a=byId(id);
  if(JSON.stringify(a.proceduralMotion)!==JSON.stringify(contract.profiles[id]))fail(id+' v5 profile mismatch');
  if(a.procedural?.motionOverlay!=='proceduralMotion-v5-kernel')fail(id+' not bound to v5 kernel');
}

const idle=byId('idle');
if(idle.timeline.length!==1||idle.timeline[0].sourceCell!==7)fail('Idle must remain cell 7 only');
if(idle.proceduralMotion.mode!=='deform-breath-v3')fail('Idle mode wrong');
if(idle.proceduralMotion.amplitudes.scaleX>0.01||idle.proceduralMotion.amplitudes.scaleY>0.02)fail('Idle scale amplitudes too large');
if(idle.proceduralMotion.amplitudes.shearX<0.045||idle.proceduralMotion.amplitudes.rotateDeg<1.5)fail('Idle deformation not strong enough');

const aggro=byId('aggro');
if(aggro.proceduralMotion.mode!=='micro-alert-cluster')fail('Aggro micro-pulse mode missing');
if(aggro.proceduralMotion.cycleMs>110)fail('Aggro pulse frequency too slow');
if(aggro.proceduralMotion.amplitudes.scaleY>0.02)fail('Aggro pulse is too much broad scale pumping');

const damage=byId('damage');
if(JSON.stringify(damage.proceduralMotion)!==JSON.stringify(contract.lockedAcceptedState.damageProfile))fail('accepted Damage physiology changed');

console.log(JSON.stringify({
  ok:true,
  idle:{mode:idle.proceduralMotion.mode,scale:idle.proceduralMotion.amplitudes,deformation:{shearX:idle.proceduralMotion.amplitudes.shearX,rotateDeg:idle.proceduralMotion.amplitudes.rotateDeg}},
  aggro:{mode:aggro.proceduralMotion.mode,cycleMs:aggro.proceduralMotion.cycleMs},
  damagePreserved:true,
  utilityPoseSequencesLocked:true
},null,2));

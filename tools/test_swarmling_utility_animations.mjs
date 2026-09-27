#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const fail=m=>{throw new Error(m)};

const contract=json('campaigns/swarmling-procedural-physiology-v4.contract.json');
const manifest=json('public/assets/vanguard/fleshpunk/characters/swarmling/animations.json');
const preview=read('src/procedural-swarmling-preview.js');
const shell=read('src/procedural-review-shell.js');

const byId=id=>manifest.animations.find(a=>a.id===id);
const locked=contract.lockedAcceptedState;

const run=byId('run');
if(JSON.stringify(run.frames.map(f=>f.sourceCell))!==JSON.stringify(locked.run.sourceCells))fail('Run cells changed');
if(JSON.stringify(run.frames.map(f=>f.anchorPoint))!==JSON.stringify(locked.run.anchors))fail('Run anchors changed');

for(const id of ['jab','rake','scythe-bloom']){
  const a=byId(id),e=locked[id];
  if(JSON.stringify(a.frames.map(f=>f.sourceCell))!==JSON.stringify(e.sourceCells))fail(id+' authored cells changed');
  if(JSON.stringify(a.timeline.map(f=>f.sourceCell))!==JSON.stringify(e.timelineCells))fail(id+' timeline changed');
  if(JSON.stringify(a.stageAnchor)!==JSON.stringify(e.stageAnchor))fail(id+' stage anchor changed');
}
if(byId('jab').frames[1].sourceCell!==15)fail('Needle Jab impact changed');

for(const [id,cells] of Object.entries(contract.authority.poseSequences)){
  const a=byId(id);
  if(!a)fail('missing utility '+id);
  if(JSON.stringify(a.timeline.map(f=>f.sourceCell))!==JSON.stringify(cells))fail(id+' pose sequence changed');
  if(a.reviewLoop!==true)fail(id+' review loop must remain enabled');
  if(a.rootMotion!==false)fail(id+' root motion changed');
  const p=a.proceduralMotion;
  const expected=contract.physiologyProfiles[id];
  if(JSON.stringify(p)!==JSON.stringify(expected))fail(id+' physiology profile does not match contract');
  if(a.procedural?.motionOverlay!=='proceduralMotion-v2-kernel')fail(id+' is not bound to v2 motion kernel');
  if(!shell.includes('swarmling-'+id))fail('selector missing '+id);
}

const idle=byId('idle');
if(idle.timeline.length!==1||idle.timeline[0].sourceCell!==7)fail('Idle must remain one authored frame on cell 7');

const aggro=byId('aggro');
if(JSON.stringify(aggro.timeline.map(f=>f.sourceCell))!==JSON.stringify([7,17,17,7]))fail('Aggro surprise pose changed');
if(aggro.proceduralMotion.mode!=='asymmetric-alert-pulse')fail('Aggro must use asymmetric alert pulse');

const death=byId('death');
if(!death.proceduralMotion.terminalStillPhases?.includes('corpse'))fail('Death must hard-stop procedural motion on corpse');
if(death.proceduralMotion.phaseWeights?.corpse!==0)fail('Corpse phase weight must be zero');

if(!preview.includes("import { evaluateProceduralMotion } from './procedural-motion-kernel.js';"))fail('shared motion kernel import missing');
if(!preview.includes('evaluateProceduralMotion('))fail('shared motion kernel not invoked');
if(preview.includes("case 'organic-breath'")||preview.includes("case 'death-spasm'"))fail('old inline physiology modes still embedded in Swarmling preview');
if(!preview.includes('function reviewTimeAt(raw)'))fail('review-loop runtime missing');
if(!preview.includes('const presentationScale=1.5;'))fail('presentation scale changed');

console.log(JSON.stringify({
  ok:true,
  physiology:Object.fromEntries(Object.keys(contract.physiologyProfiles).map(id=>[id,byId(id).proceduralMotion.mode])),
  poseSequencesLocked:true,
  atlasLocked:true,
  reviewLoopPreserved:true,
  reusableKernel:true,
  vanguardTransferReady:true
},null,2));

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const fail=m=>{throw new Error(m)};

const contract=json('campaigns/swarmling-utility-pack-v3.contract.json');
const manifest=json('public/assets/vanguard/fleshpunk/characters/swarmling/animations.json');
const preview=read('src/procedural-swarmling-preview.js');
const shell=read('src/procedural-review-shell.js');

const byId=id=>manifest.animations.find(a=>a.id===id);
const locked=contract.lockedAcceptedState;

if(manifest.authority?.sourceByteSha256!==locked.atlasSha256)fail('atlas changed during v3');
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

for(const [id,e] of Object.entries(contract.utilityAnimations)){
  const a=byId(id);
  if(!a)fail('missing utility '+id);
  if(a.rootMotion!==false)fail(id+' root motion changed');
  if(a.loop!==e.loop)fail(id+' gameplay loop semantic changed');
  if(a.reviewLoop!==e.reviewLoop)fail(id+' review loop semantic changed');
  if(a.reviewLoopGapMs!==e.reviewLoopGapMs)fail(id+' review loop gap changed');
  if(JSON.stringify(a.timeline.map(f=>f.sourceCell))!==JSON.stringify(e.timeline.map(f=>f.sourceCell)))fail(id+' source cells changed');
  if(JSON.stringify(a.timeline.map(f=>f.durationMs))!==JSON.stringify(e.timeline.map(f=>f.durationMs)))fail(id+' timing changed');
  if(JSON.stringify(a.proceduralMotion)!==JSON.stringify(e.proceduralMotion))fail(id+' procedural profile changed');
  if(a.procedural?.motionOverlay!=='proceduralMotion')fail(id+' procedural overlay missing');
  if(!shell.includes('swarmling-'+id))fail('selector missing '+id);
}

const idle=byId('idle');
if(idle.timeline.length!==1||idle.timeline[0].sourceCell!==7)fail('Idle must be one authored frame, cell 7');
if(idle.proceduralMotion.mode!=='organic-breath')fail('Idle organic breath missing');
if(idle.proceduralMotion.scaleY<0.04||idle.proceduralMotion.rotateDeg<1.2||idle.proceduralMotion.shearX<0.03)fail('Idle procedural motion too weak to be visibly meaningful');

const aggro=byId('aggro');
if(JSON.stringify(aggro.timeline.map(f=>f.sourceCell))!==JSON.stringify([7,17,17,7]))fail('Aggro must restore surprise cell 17');
if(!aggro.timeline.some(f=>f.id==='surprise-flare'&&f.sourceCell===17))fail('Aggro surprise flare missing');

const damage=byId('damage');
if(JSON.stringify(damage.timeline.map(f=>f.sourceCell))!==JSON.stringify([7,18,19,7]))fail('Damage must use folded/stagger cells 18/19');
if(damage.timeline.some(f=>f.sourceCell===17))fail('Damage must not steal Aggro surprise cell 17');

if(JSON.stringify(byId('knockdown').timeline.map(f=>f.sourceCell))!==JSON.stringify([19,20,21]))fail('Knockdown semantic chain changed');
if(JSON.stringify(byId('stand-up').timeline.map(f=>f.sourceCell))!==JSON.stringify([21,20,19,7]))fail('Stand Up semantic chain changed');
if(JSON.stringify(byId('death').timeline.map(f=>f.sourceCell))!==JSON.stringify([19,20,21,22]))fail('Death semantic chain changed');

for(const id of ['idle','aggro','damage','knockdown','stand-up','death']){
  const p=byId(id).proceduralMotion;
  const energy=Math.abs(Number(p.shearX||0))+Math.abs(Number(p.scaleX||0))+Math.abs(Number(p.scaleY||0))+Math.abs(Number(p.rotateDeg||0))/100;
  if(energy<0.05)fail(id+' procedural motion is effectively empty');
}

if(!preview.includes('function proceduralMotionAt(ms,state,base)'))fail('procedural motion runtime missing');
if(!preview.includes('function reviewTimeAt(raw)'))fail('review-loop runtime missing');
if(!preview.includes("animation?.reviewLoop===true"))fail('reviewLoop is not driving preview playback');
if(!preview.includes('const presentationScale=1.5;'))fail('presentation scale changed');

console.log(JSON.stringify({
  ok:true,
  idle:{authoredFrames:1,sourceCell:7,mode:idle.proceduralMotion.mode},
  aggro:{cells:aggro.timeline.map(f=>f.sourceCell),surpriseCell:17},
  damage:{cells:damage.timeline.map(f=>f.sourceCell)},
  reviewLoop:Object.fromEntries(Object.keys(contract.utilityAnimations).map(id=>[id,byId(id).reviewLoop])),
  proceduralMotion:Object.fromEntries(Object.keys(contract.utilityAnimations).map(id=>[id,byId(id).proceduralMotion.mode])),
  atlasLocked:true,
  runAndAttacksLocked:true
},null,2));

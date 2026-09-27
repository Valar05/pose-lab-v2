#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const fail=m=>{throw new Error(m)};

const contract=json('campaigns/swarmling-utility-pack-v2.contract.json');
const manifest=json('public/assets/vanguard/fleshpunk/characters/swarmling/animations.json');
const preview=read('src/procedural-swarmling-preview.js');
const shell=read('src/procedural-review-shell.js');
const pkg=json('package.json');

const byId=id=>manifest.animations.find(a=>a.id===id);

if(contract.schema!=='pose-lab-v2-campaign-contract-v2')fail('utility v2 contract must use framework v2');

const locked=contract.lockedAcceptedState;
const run=byId('run');
if(!run)fail('accepted Run missing');
if(JSON.stringify(run.frames.map(f=>f.sourceCell))!==JSON.stringify(locked.run.sourceCells))fail('Run source cells changed');
if(JSON.stringify(run.frames.map(f=>f.anchorPoint))!==JSON.stringify(locked.run.anchors))fail('Run anchors changed');

for(const id of ['jab','rake','scythe-bloom']){
  const a=byId(id),e=locked[id];
  if(!a)fail('accepted '+id+' missing');
  if(JSON.stringify(a.frames.map(f=>f.sourceCell))!==JSON.stringify(e.sourceCells))fail(id+' authored cells changed');
  if(JSON.stringify(a.timeline.map(f=>f.sourceCell))!==JSON.stringify(e.timelineCells))fail(id+' timeline changed');
  if(JSON.stringify(a.stageAnchor)!==JSON.stringify(e.stageAnchor))fail(id+' stage anchor changed');
}
if(byId('jab').frames[1].sourceCell!==15)fail('Needle Jab impact cell changed');

for(const [id,e] of Object.entries(contract.utilityAnimations)){
  const a=byId(id);
  if(!a)fail('missing utility animation '+id);
  if(a.rootMotion!==false)fail(id+' root motion must remain OFF');
  if(a.loop!==e.loop)fail(id+' loop semantic changed');
  if(JSON.stringify(a.stageAnchor)!==JSON.stringify(e.stageAnchor))fail(id+' stage anchor changed');
  if(JSON.stringify(a.timeline.map(f=>f.sourceCell))!==JSON.stringify(e.timeline.map(f=>f.sourceCell)))fail(id+' source-cell sequence changed');
  if(JSON.stringify(a.timeline.map(f=>f.durationMs))!==JSON.stringify(e.timeline.map(f=>f.durationMs)))fail(id+' timing changed');
  if(JSON.stringify(a.proceduralMotion)!==JSON.stringify(e.proceduralMotion))fail(id+' procedural motion profile changed');
  if(a.procedural?.motionOverlay!=='proceduralMotion')fail(id+' procedural motion overlay missing');
  if(a.procedural?.rootTranslation!==false)fail(id+' root translation must remain OFF');
  if(!a.timeline.every(f=>Array.isArray(f.anchorPoint)&&f.anchorPoint.length===2))fail(id+' missing source anchor');
  const route='swarmling-'+id;
  if(!shell.includes(route))fail('selector missing '+route);
  if(!preview.includes(JSON.stringify(id)))fail('preview route label missing '+id);
}

const idle=byId('idle');
if(idle.timeline.length!==1)fail('Idle must use exactly one authored frame');
if(idle.timeline[0].sourceCell!==7)fail('Idle must use source cell 7 only');
if(idle.proceduralMotion?.mode!=='breathing-loop')fail('Idle breathing procedural motion missing');

const knock=byId('knockdown');
const stand=byId('stand-up');
const death=byId('death');
if(knock.timeline.at(-1).sourceCell!==21)fail('Knockdown must terminate on recoverable prone cell 21');
if(stand.timeline[0].sourceCell!==21||stand.timeline.at(-1).sourceCell!==7)fail('Stand Up must recover cell 21 to idle cell 7');
if(death.timeline.at(-1).sourceCell!==22)fail('Death must terminate on corpse cell 22');
if(death.timeline.at(-1).sourceCell===knock.timeline.at(-1).sourceCell)fail('Death and Knockdown terminal states must differ');

if(!preview.includes('function proceduralMotionAt(ms,state,base)'))fail('procedural motion runtime missing');
if(!preview.includes('function normalizedTimeMs(ms)'))fail('non-loop terminal-time clamp missing');
if(!preview.includes("animation?.loop===false && playing && raw>=total"))fail('non-loop terminal hold missing');
if(!preview.includes('const presentationScale=1.5;'))fail('presentation scale changed');
if(pkg.scripts?.['test:swarmling-utility']!=='node tools/test_swarmling_utility_animations.mjs')fail('utility test npm script missing');
if(pkg.scripts?.['test:swarmling-utility-scale']!=='python3 tools/test_swarmling_utility_scale.py')fail('utility scale test npm script missing');

console.log(JSON.stringify({
  ok:true,
  utilityAnimations:Object.keys(contract.utilityAnimations),
  idleAuthoredFrames:1,
  idleSourceCell:7,
  proceduralMotionProfiles:Object.fromEntries(Object.keys(contract.utilityAnimations).map(id=>[id,byId(id).proceduralMotion.mode])),
  knockdownTerminal:21,
  deathTerminal:22,
  nonLoopTerminalHold:true,
  acceptedRunAndAttacksLocked:true,
  rootMotion:false
},null,2));

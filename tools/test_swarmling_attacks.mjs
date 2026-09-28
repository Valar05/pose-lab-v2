#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const fail=m=>{throw new Error(m)};

const contract=json('campaigns/swarmling-procedural-physiology-v5.contract.json');
const manifest=json('public/assets/vanguard/fleshpunk/characters/swarmling/animations.json');
const preview=read('src/procedural-swarmling-preview.js');
const shell=read('src/procedural-review-shell.js');
const motion=read('motion.html');

const byId=id=>manifest.animations.find(a=>a.id===id);
const locked=contract.lockedAcceptedState;

if(manifest.character!=='Swarmling')fail('wrong Swarmling manifest');
if(manifest.authority?.rootMotion!=='OFF; all movement is authored later in engine. Pose Lab fixes one explicit planted-foot source anchor to the canonical stage anchor.')fail('root-motion contract missing');
if(manifest.authority?.timingAuthority?.revision!=='e89c2adf671b06af4ce6a6c1d3f0118e68a6c274')fail('SecurityTitan timing revision drifted');

for(const id of ['jab','rake','scythe-bloom']){
  const a=byId(id),e=locked[id];
  if(!a)fail('missing '+id);
  if(a.rootMotion!==false)fail(id+' root motion must be false');
  if(JSON.stringify(a.stageAnchor)!==JSON.stringify(e.stageAnchor))fail(id+' stage anchor changed');
  if(JSON.stringify(a.frames.map(f=>f.sourceCell))!==JSON.stringify(e.frames))fail(id+' authored source cells changed');
  if(JSON.stringify(a.timeline.map(f=>f.sourceCell))!==JSON.stringify(e.timeline))fail(id+' timeline source cells changed');
  if(JSON.stringify(a.timeline.map(f=>f.durationMs))!==JSON.stringify(e.durations))fail(id+' timing changed');
  if(a.combatTiming?.activeAtMs!==e.activeAtMs||a.combatTiming?.activeDurationMs!==e.activeDurationMs||a.combatTiming?.attackEndMs!==e.attackEndMs)fail(id+' combat stopwatch changed');
  if(!a.timeline.every(f=>Array.isArray(f.anchorPoint)&&f.anchorPoint.length===2))fail(id+' missing explicit planted-foot anchor');
  if(a.procedural?.rootTranslation!==false)fail(id+' root translation must remain false');
  if(JSON.stringify(a.proceduralMotion)!==JSON.stringify(contract.profiles[id]))fail(id+' procedural profile mismatch');
  if(a.procedural?.motionOverlay!=='proceduralMotion-v5-kernel')fail(id+' not bound to v5 motion kernel');
}
if(byId('jab').frames[1].sourceCell!==15)fail('Needle Jab impact cell changed');

const expectedModes={jab:'attack-snap',rake:'attack-drag','scythe-bloom':'attack-bloom'};
for(const [id,mode] of Object.entries(expectedModes)){
  if(byId(id).proceduralMotion.mode!==mode)fail(id+' wrong procedural attack mode');
}

if(!preview.includes("import { evaluateProceduralMotion } from './procedural-motion-kernel.js';"))fail('shared motion kernel import missing');
if(!preview.includes('evaluateProceduralMotion('))fail('shared motion kernel not invoked');
if(!preview.includes('const runAnchors=[[128,249],[128,249],[128,249],[128,249],[128,249],[128,249]];'))fail('uniform Run anchors missing');
if(!preview.includes('ctx.drawImage(image,-srcX,-srcY,w,h)'))fail('full-cell planted draw missing');
if(preview.includes('shiftX')||preview.includes('shiftY'))fail('preview introduced stage translation');
if(!motion.includes("procedural?.startsWith('swarmling-')"))fail('motion router does not cover Swarmling');
for(const route of ['swarmling-jab','swarmling-rake','swarmling-scythe-bloom']){
  if(!shell.includes(route))fail('selector missing '+route);
}

console.log(JSON.stringify({
  ok:true,
  rootMotion:false,
  poseChoicesLocked:true,
  timingLocked:true,
  stageAnchorsLocked:true,
  proceduralProfiles:expectedModes
},null,2));

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const fail=(m)=>{throw new Error(m)};

const manifest=JSON.parse(read('public/assets/vanguard/fleshpunk/characters/swarmling/animations.json'));
const preview=read('src/procedural-swarmling-preview.js');
const shell=read('src/procedural-review-shell.js');
const motion=read('motion.html');

if(manifest.character!=='Swarmling')fail('wrong Swarmling manifest');
if(manifest.authority?.rootMotion!=='OFF; all movement is authored later in engine. Pose Lab fixes one explicit planted-foot source anchor to the canonical stage anchor.')fail('root-motion contract missing');
if(manifest.authority?.timingAuthority?.revision!=='e89c2adf671b06af4ce6a6c1d3f0118e68a6c274')fail('SecurityTitan timing revision drifted');

const expected={
  jab:{cells:[8,13],durations:[350,650],activeAtMs:350,activeDurationMs:50,attackEndMs:1000,cooldownMs:1050},
  rake:{cells:[14,15],durations:[550,450],activeAtMs:550,activeDurationMs:50,attackEndMs:1000,cooldownMs:900},
  'scythe-bloom':{cells:[11,15,16],durations:[350,100,550],activeAtMs:350,activeDurationMs:50,attackEndMs:1000,cooldownMs:1050},
};

for(const [id,e] of Object.entries(expected)){
  const a=manifest.animations.find(x=>x.id===id);
  if(!a)fail('missing '+id);
  if(a.rootMotion!==false)fail(id+' root motion must be false');
  if(JSON.stringify(a.stageAnchor)!==JSON.stringify([220,226]))fail(id+' stage anchor changed');
  if(JSON.stringify(a.frames.map(f=>f.sourceCell))!==JSON.stringify(e.cells))fail(id+' source cells changed');
  if(JSON.stringify(a.frames.map(f=>f.durationMs))!==JSON.stringify(e.durations))fail(id+' visual timing changed');
  if(!a.frames.every(f=>Array.isArray(f.anchorPoint)&&f.anchorPoint.length===2))fail(id+' missing explicit planted-foot anchor');
  for(const key of ['activeAtMs','activeDurationMs','attackEndMs','cooldownMs']){
    if(a.combatTiming?.[key]!==e[key])fail(id+' '+key+' changed');
  }
}

if(!preview.includes("const [srcAnchorX,srcAnchorY]=anchorFor(frame,index);"))fail('preview is not using explicit source anchors');
if(!preview.includes("Root motion</div><div>OFF"))fail('preview no-root-motion readout missing');
if(!motion.includes("procedural?.startsWith('swarmling-')"))fail('motion router does not cover Swarmling attacks');
for(const route of ['swarmling-jab','swarmling-rake','swarmling-scythe-bloom']){
  if(!shell.includes(route))fail('selector missing '+route);
}

console.log(JSON.stringify({
  ok:true,
  rootMotion:false,
  timingAuthority:'SecurityTitan e89c2adf671b06af4ce6a6c1d3f0118e68a6c274',
  attacks:Object.keys(expected)
},null,2));

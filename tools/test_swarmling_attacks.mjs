#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fail=m=>{throw new Error(m)};

const manifest=JSON.parse(read('public/assets/vanguard/fleshpunk/characters/swarmling/animations.json'));
const preview=read('src/procedural-swarmling-preview.js');
const shell=read('src/procedural-review-shell.js');
const motion=read('motion.html');

if(manifest.character!=='Swarmling')fail('wrong Swarmling manifest');
if(manifest.authority?.rootMotion!=='OFF; all movement is authored later in engine. Pose Lab fixes one explicit planted-foot source anchor to the canonical stage anchor.')fail('root-motion contract missing');
if(manifest.authority?.timingAuthority?.revision!=='e89c2adf671b06af4ce6a6c1d3f0118e68a6c274')fail('SecurityTitan timing revision drifted');

const expected={
  jab:{authoredCells:[10,15],timelineCells:[7,10,15,15,7],activeAtMs:350},
  rake:{authoredCells:[13,15],timelineCells:[7,13,15,15,7],activeAtMs:550},
  'scythe-bloom':{authoredCells:[11,15,16],timelineCells:[7,11,15,16,7],activeAtMs:350},
};

for(const [id,e] of Object.entries(expected)){
  const a=manifest.animations.find(x=>x.id===id);
  if(!a)fail('missing '+id);
  if(a.rootMotion!==false)fail(id+' root motion must be false');
  if(JSON.stringify(a.stageAnchor)!==JSON.stringify([220,226]))fail(id+' stage anchor changed');
  if(JSON.stringify(a.frames.map(f=>f.sourceCell))!==JSON.stringify(e.authoredCells))fail(id+' authored source cells changed');
  if(JSON.stringify(a.timeline.map(f=>f.sourceCell))!==JSON.stringify(e.timelineCells))fail(id+' timeline source cells changed');
  if(a.timeline.reduce((n,f)=>n+f.durationMs,0)!==1000)fail(id+' timeline must remain 1000ms');
  if(a.timeline[0].id!=='idle-enter'||a.timeline.at(-1).id!=='idle-return')fail(id+' must start and end on idle');
  if(a.combatTiming?.activeAtMs!==e.activeAtMs||a.combatTiming?.activeDurationMs!==50||a.combatTiming?.attackEndMs!==1000)fail(id+' Titan stopwatch changed');
  if(!a.timeline.every(f=>Array.isArray(f.anchorPoint)&&f.anchorPoint.length===2))fail(id+' missing explicit planted-foot anchor');
  if(!a.timeline.every(f=>Number(f.deform?.scaleX)>0&&Number(f.deform?.scaleY)>0&&Number.isFinite(Number(f.deform?.shearX))&&Number.isFinite(Number(f.deform?.rotateDeg))))fail(id+' missing procedural deformation/rotation');
  if(a.procedural?.rootTranslation!==false)fail(id+' root translation must remain false');
  if(JSON.stringify(a.procedural?.allowed)!==JSON.stringify(['shearX','scaleX','scaleY','rotateDeg']))fail(id+' procedural allowlist changed');
}

if(!preview.includes('function deformAt(index,u)'))fail('procedural deformation interpolation missing');
if(!preview.includes('rotateDeg:lerp('))fail('procedural rotation interpolation missing');
if(!preview.includes('ctx.rotate((d.rotateDeg||0)*Math.PI/180)'))fail('planted-foot rotation draw missing');
if(!preview.includes("const runAnchors=[[127,249],[128,249],[128,249],[128,250],[126,249],[128,250]];"))fail('run body-center anchors missing');
if(!preview.includes('ctx.drawImage(image,-srcX,-srcY,w,h)'))fail('full-cell planted draw missing');
if(preview.includes('const isBg='))fail('near-black flood-fill cleanup must not return');
if(!preview.includes('Root motion</div><div>OFF'))fail('no-root-motion readout missing');
if(preview.includes('shiftX')||preview.includes('shiftY'))fail('preview introduced stage translation');
if(!motion.includes("procedural?.startsWith('swarmling-')"))fail('motion router does not cover Swarmling attacks');
for(const route of ['swarmling-jab','swarmling-rake','swarmling-scythe-bloom']){
  if(!shell.includes(route))fail('selector missing '+route);
}

console.log(JSON.stringify({
  ok:true,
  rootMotion:false,
  materiallyChangedPoseChoices:true,
  procedural:['shearX','scaleX','scaleY','rotateDeg'],
  timingAuthority:'SecurityTitan e89c2adf671b06af4ce6a6c1d3f0118e68a6c274',
  attacks:Object.keys(expected)
},null,2));

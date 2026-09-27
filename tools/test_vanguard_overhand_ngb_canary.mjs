import fs from 'node:fs';

const recipe=JSON.parse(fs.readFileSync(new URL('../public/assets/vanguard/procedural/overhand-strike.recipe.json',import.meta.url),'utf8'));
const renderer=fs.readFileSync(new URL('../src/procedural-motion-preview.js',import.meta.url),'utf8');

const fail=msg=>{throw new Error(msg)};
const ids=recipe.phases.map(p=>p.id);
const expectedIds=['idle','anticipation','chamber','cross-commit','lean-forward','contact','follow-through','recoil-1','recoil-2','idle-return'];
if(ids.join('|')!==expectedIds.join('|'))fail('Overhand phase identity/order changed');
const durations=recipe.phases.map(p=>p.durationMs);
const expectedDurations=[25,45,45,30,25,70,70,95,90,105];
if(durations.join(',')!==expectedDurations.join(','))fail('Overhand canary timing changed');
if(durations.reduce((a,b)=>a+b,0)!==600)fail('Overhand total is not 600 ms');
const startOf=id=>recipe.phases.slice(0,recipe.phases.findIndex(p=>p.id===id)).reduce((n,p)=>n+p.durationMs,0);
if(startOf('contact')!==170)fail('Overhand contact no longer starts at 170 ms');
if(startOf('follow-through')!==240)fail('Overhand follow-through no longer starts at 240 ms');
if(recipe.comboHandoffMs!==310)fail('Overhand combo handoff no longer 310 ms');
if(recipe.timingCanary?.essentialFollowThroughEndMs!==310)fail('timing canary metadata drifted');
if(recipe.rootMotion!==false)fail('root motion changed');
if(recipe.canvas?.anchor?.join(',')!=='92,226')fail('canvas anchor changed');
if(recipe.stage?.centerX!==220)fail('stage center changed');
if(recipe.bodyScale!==1.5)fail('bodyScale changed');
const sourceExpect={
  idle:[2,58,97],
  chamber:[26,64,84],
  commit:[40,58,86],
  preimpact:[32,60,89],
  contact:[35,46,89],
};
for(const [id,[cell,x,y]] of Object.entries(sourceExpect)){
  const s=recipe.sources[id];
  if(!s||s.cell!==cell||s.anchorPoint?.[0]!==x||s.anchorPoint?.[1]!==y)fail(id+' source identity/anchor changed');
  if(s.registrationOffset?.join(',')!=='0,0')fail(id+' registration changed');
}
if(recipe.sources['slash-right']?.cell!==5)fail('slash source cell changed');
if(recipe.effectAtlases?.['slash-canonical']?.sha256!=='e9b551585d6f92e1e5d94c7722d5051771fd6f38092eeb5c3f447b5c27e55c2d')fail('slash atlas authority changed');

const blur=recipe.motionBlur;
if(!blur?.enabled||blur.samples!==4||blur.spanPx!==30||blur.filterPx!==2.5||blur.maxAlpha!==0.42||blur.directionStage?.join(',')!=='-1,0.22')fail('motion blur config changed');
const blurExpected={
  idle:0,
  anticipation:0,
  chamber:.10,
  'cross-commit':.58,
  'lean-forward':1,
  contact:.82,
  'follow-through':.38,
  'recoil-1':.12,
  'recoil-2':.03,
  'idle-return':0,
};
for(const [id,v] of Object.entries(blurExpected))if(recipe.phases.find(p=>p.id===id)?.blur?.amount!==v)fail(id+' blur amount changed');

for(const needle of [
  'function drawBody(id,d,blurAmount=0)',
  'recipe.motionBlur',
  'blur?.enabled && blurAmount>0',
  "b=iv(i,u,'blur','amount')",
  'drawBody(p.source,d,b)',
]) if(!renderer.includes(needle))fail('renderer missing canary blur behavior: '+needle);

console.log('Vanguard Overhand NGB timing + slash persistence + strong motion blur canary: PASS');

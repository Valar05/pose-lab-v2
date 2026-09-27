import fs from 'node:fs';
const recipe=JSON.parse(fs.readFileSync(new URL('../public/assets/vanguard/procedural/overhand-strike.recipe.json',import.meta.url),'utf8'));
const renderer=fs.readFileSync(new URL('../src/procedural-motion-preview.js',import.meta.url),'utf8');
const fail=m=>{throw new Error(m)};
const timing=[25,45,45,30,25,70,70,95,90,105];
if(recipe.phases.map(p=>p.durationMs).join(',')!==timing.join(','))fail('timing changed');
if(recipe.comboHandoffMs!==310)fail('handoff changed');
if(recipe.motionBlur?.primaryStretchX!==0)fail('forward scale not retired');
if(recipe.motionBlur?.primarySquashY!==0)fail('primary squash not retired');
if(recipe.motionBlur?.primaryShearX!==0)fail('primary extra shear not retired');
if(recipe.motionBlur?.primaryShiftPx!==0)fail('primary shift not retired');
if(recipe.motionBlur?.primaryFilterPx!==4)fail('primary blur was not preserved');
if(recipe.motionBlur?.samples!==4||recipe.motionBlur?.spanPx!==34||recipe.motionBlur?.filterPx!==2||recipe.motionBlur?.maxAlpha!==0.48)fail('trail blur changed');
const ml=recipe.motionLines;
if(!ml?.enabled||ml.sliceHeightPx!==3||ml.maxPullPx!==34||ml.wavePx!==7||ml.waveCycles!==3.5||ml.ghostCount!==3)fail('motion-line config changed');
for(const needle of [
  'function drawMotionLineBody',
  'recipe.motionLines?.enabled',
  'primaryBlurPx',
  'maxPullPx',
  'ghostCount',
  'ctx.drawImage(it.canvas,0,sy,w,band,x0-pull'
]) if(!renderer.includes(needle))fail('renderer missing '+needle);
if(recipe.rootMotion!==false||recipe.canvas.anchor.join(',')!=='92,226'||recipe.stage.centerX!==220||recipe.bodyScale!==1.5)fail('identity/placement changed');
if(recipe.sources['slash-right']?.cell!==5)fail('slash source changed');
console.log('Vanguard Overhand blur + backward motion-line distortion v3: PASS');

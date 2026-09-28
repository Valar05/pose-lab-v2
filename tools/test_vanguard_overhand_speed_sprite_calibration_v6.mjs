import fs from 'node:fs';
import crypto from 'node:crypto';
const recipe=JSON.parse(fs.readFileSync(new URL('../public/assets/vanguard/procedural/overhand-strike.recipe.json',import.meta.url),'utf8'));
const renderer=fs.readFileSync(new URL('../src/procedural-motion-preview.js',import.meta.url),'utf8');
const asset=fs.readFileSync(new URL('../public/assets/vanguard/procedural/vanguard-diorama-speed-lines.png',import.meta.url));
const fail=m=>{throw new Error(m)};
if(recipe.phases.map(p=>p.durationMs).join(',')!=='25,45,45,30,25,70,70,95,90,105')fail('timing changed');
if(recipe.comboHandoffMs!==310)fail('handoff changed');
if(recipe.rootMotion!==false)fail('root motion changed');
if(recipe.bodyScale!==1.5)fail('bodyScale changed');
if(recipe.canvas.anchor.join(',')!=='92,226')fail('canvas anchor changed');
if(recipe.stage.centerX!==220)fail('stage changed');
if(recipe.sources['slash-right']?.cell!==5)fail('slash source changed');
if(crypto.createHash('sha256').update(asset).digest('hex')!=='363b184de9bfc98a74c92a2066f63b6a4c9a9998a168fad87f67f2c32cc396e8')fail('speed-line asset bytes changed');
const fx=recipe.speedLineSprite;
if(!fx?.enabled)fail('speedLineSprite disabled');
if(fx.path!=='assets/vanguard/procedural/vanguard-diorama-speed-lines.png')fail('speed-line path changed');
if(fx.position?.join(',')!=='42,-96')fail('position not calibrated');
if(fx.minScaleX!==1.05||fx.maxScaleX!==1.45||fx.scaleY!==1||fx.alpha!==.88||fx.imageSmoothing!==false||fx.inheritBodyScale!==true)fail('presentation calibration changed');
const expectedBlur={idle:0,anticipation:0,chamber:0,'cross-commit':.32,'lean-forward':1,contact:.46,'follow-through':.08,'recoil-1':0,'recoil-2':0,'idle-return':0};
for(const [id,v] of Object.entries(expectedBlur))if(recipe.phases.find(p=>p.id===id)?.blur?.amount!==v)fail(id+' blur envelope changed');
for(const needle of [
  'drawSpeedLineSprite(px,py,reg,d,bodyScale,blurAmount)',
  'function drawSpeedLineSprite(px,py,reg,d,bodyScale,amount)',
  'const inheritedScale=spec.inheritBodyScale===false?1:bodyScale;',
  'ctx.transform((d.scaleX||1)*inheritedScale,0,d.shearX,(d.scaleY||1)*inheritedScale'
]) if(!renderer.includes(needle)) fail('renderer missing '+needle);
console.log('Vanguard Overhand speed-sprite calibration v6: PASS');

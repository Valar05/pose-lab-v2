import fs from 'node:fs';
import crypto from 'node:crypto';
const recipe=JSON.parse(fs.readFileSync(new URL('../public/assets/vanguard/procedural/overhand-strike.recipe.json',import.meta.url),'utf8'));
const renderer=fs.readFileSync(new URL('../src/procedural-motion-preview.js',import.meta.url),'utf8');
const asset=fs.readFileSync(new URL('../public/assets/vanguard/procedural/vanguard-diorama-speed-lines.png',import.meta.url));
const fail=m=>{throw new Error(m)};
if(recipe.phases.map(p=>p.durationMs).join(',')!=='25,45,45,30,25,70,70,95,90,105')fail('timing changed');
if(recipe.comboHandoffMs!==310)fail('handoff changed');
if(recipe.rootMotion!==false)fail('rootMotion changed');
if(recipe.bodyScale!==1.5)fail('bodyScale changed');
if(recipe.canvas.anchor.join(',')!=='92,226')fail('canvas anchor changed');
if(recipe.stage.centerX!==220)fail('stage changed');
if(recipe.sources['slash-right']?.cell!==5)fail('slash source changed');
for(const k of ['idle','chamber','commit','preimpact','contact']){
  if(recipe.sources[k]?.backgroundKey!=='black-border')fail(k+' alpha key missing');
  if(recipe.sources[k]?.backgroundKeyThreshold!==18)fail(k+' alpha key threshold changed');
}
if(crypto.createHash('sha256').update(asset).digest('hex')!=='363b184de9bfc98a74c92a2066f63b6a4c9a9998a168fad87f67f2c32cc396e8')fail('speed-line source bytes changed');
const expectedBlur={idle:0,anticipation:0,chamber:0,'cross-commit':.32,'lean-forward':1,contact:.46,'follow-through':.08,'recoil-1':0,'recoil-2':0,'idle-return':0};
for(const [id,v] of Object.entries(expectedBlur))if(recipe.phases.find(p=>p.id===id)?.blur?.amount!==v)fail(id+' blur envelope changed');
for(const needle of [
 'function installSpeedLineControls()',
 'data-speed-line-controls',
 'Copy speed-line values',
 'function installSlashControls()',
 'Slash Controls',
 'installSlashControls();',
 'installSpeedLineControls();',
 'Number(spec.manualScaleX??1)',
 'Number(spec.manualScaleY??1)',
 "src.backgroundKey==='black-border'"
]) if(!renderer.includes(needle)) fail('renderer missing '+needle);
console.log('Vanguard Overhand alpha-composite controls v8: PASS');

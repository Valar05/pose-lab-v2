import fs from 'node:fs';
import crypto from 'node:crypto';
const recipe=JSON.parse(fs.readFileSync(new URL('../public/assets/vanguard/procedural/overhand-strike.recipe.json',import.meta.url),'utf8'));
const renderer=fs.readFileSync(new URL('../src/procedural-motion-preview.js',import.meta.url),'utf8');
const asset=fs.readFileSync(new URL('../public/assets/vanguard/procedural/vanguard-diorama-speed-lines.png',import.meta.url));
const fail=m=>{throw new Error(m)};
if(recipe.phases.map(p=>p.durationMs).join(',')!=='25,45,45,30,25,70,70,95,90,105')fail('timing changed');
if(recipe.comboHandoffMs!==310)fail('handoff changed');
if(recipe.rootMotion!==false)fail('root motion changed');
if(recipe.canvas.anchor.join(',')!=='92,226')fail('canvas anchor changed');
if(recipe.stage.centerX!==220)fail('stage changed');
if(recipe.bodyScale!==1.5)fail('bodyScale changed');
if(recipe.sources['slash-right']?.cell!==5)fail('slash source changed');
const expectedBlur={idle:0,anticipation:0,chamber:0,'cross-commit':.32,'lean-forward':1,contact:.46,'follow-through':.08,'recoil-1':0,'recoil-2':0,'idle-return':0};
for(const [id,v] of Object.entries(expectedBlur))if(recipe.phases.find(p=>p.id===id)?.blur?.amount!==v)fail(id+' blur envelope changed');
const fx=recipe.speedLineSprite;
if(!fx?.enabled)fail('speedLineSprite disabled');
if(fx.manualScaleX!==1||fx.manualScaleY!==1)fail('manual scale defaults changed');
if(crypto.createHash('sha256').update(asset).digest('hex')!=='7603f1349f767e085a984468c06934c4018360d9faf1d8afe55bcbf9f66f4bf0')fail('crop-fixed speed-line bytes wrong');
for(const needle of [
  'function installSpeedLineControls()',
  'data-speed-line-controls',
  'Copy speed-line values',
  'installSlashControls();',
  'installSpeedLineControls();',
  'function installSlashControls()',
  'Slash Controls',
  'Number(spec.manualScaleX??1)',
  'Number(spec.manualScaleY??1)'
]) if(!renderer.includes(needle)) fail('renderer missing '+needle);
console.log('Vanguard Overhand speed-line controls v7: PASS');

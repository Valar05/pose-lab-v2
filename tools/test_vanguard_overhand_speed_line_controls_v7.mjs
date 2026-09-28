import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const recipe=JSON.parse(fs.readFileSync(new URL('../public/assets/vanguard/procedural/overhand-strike.recipe.json',import.meta.url),'utf8'));
const renderer=fs.readFileSync(new URL('../src/procedural-motion-preview.js',import.meta.url),'utf8');
const assetUrl=new URL('../public/assets/vanguard/procedural/vanguard-diorama-speed-lines.png',import.meta.url);
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
const py=spawnSync('python3',['-c',"from PIL import Image; import hashlib,sys; im=Image.open(sys.argv[1]).convert('RGBA'); print(hashlib.sha256(im.tobytes()).hexdigest())",assetUrl.pathname],{encoding:'utf8'});
if(py.status!==0)fail('could not decode speed-line PNG for pixel identity');
if(py.stdout.trim()!=='0675ecc1022145a893833f722e547a22bf73fa4c034c56db4bd9b9d2c678a448')fail('crop-fixed speed-line pixels wrong');
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

import { createProceduralReviewShell } from './procedural-review-shell.js';

const ui=createProceduralReviewShell({
  title:'Swarmling Run',
  animation:'swarmling-run',
  character:'swarmling',
  accent:'#d6a84d'
});
const {q,canvas,fit}=ui;
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=true;
const play=q('[data-play]'),restart=q('[data-restart]'),scrub=q('[data-scrub]');
const phase=q('[data-phase]'),time=q('[data-time]'),kv=q('[data-kv]');
let manifest,run,images=[],playing=true,start=performance.now(),offset=0,total=480;

const loadImage=src=>new Promise((ok,no)=>{
  const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('Could not load '+src));i.src=src;
});

function render(ms){
  ms=((ms%total)+total)%total;
  const index=Math.min(run.frames.length-1,Math.floor(ms/80));
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
  const image=images[index];
  const presentationScale=1.5;
  const drawW=Math.round(image.naturalWidth*presentationScale);
  const drawH=Math.round(image.naturalHeight*presentationScale);
  const x=Math.round((canvas.width-drawW)/2);
  const y=Math.round((canvas.height-drawH)/2);
  ctx.drawImage(image,0,0,image.naturalWidth,image.naturalHeight,x,y,drawW,drawH);
  phase.textContent='run-'+String(index+1);
  time.textContent=Math.round(ms)+' / '+total+' ms';
  scrub.value=String(ms/total);
  kv.innerHTML=`<div>Character</div><div>Swarmling</div><div>Frame</div><div>${index+1} / 6</div><div>Cadence</div><div>80 ms</div><div>Root motion</div><div>OFF</div>`;
}
function loop(now){const ms=playing?(offset+(now-start))%total:offset;render(ms);requestAnimationFrame(loop)}
play.onclick=()=>{if(playing){offset=(offset+(performance.now()-start))%total;playing=false;play.textContent='▶'}else{start=performance.now();playing=true;play.textContent='❚❚'}};
restart.onclick=()=>{offset=0;start=performance.now();render(0)};
scrub.oninput=()=>{offset=Number(scrub.value)*total;start=performance.now();render(offset)};

try{
  manifest=await fetch('./assets/vanguard/fleshpunk/characters/swarmling/animations.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('manifest HTTP '+r.status);return r.json()});
  if(manifest.character!=='Swarmling'||manifest.lineage!=='vanguard-side-2d-sprite')throw new Error('Wrong Swarmling lineage');
  run=manifest.animations.find(a=>a.id==='run');
  if(!run||run.frames.length!==6||!run.frames.every((f,i)=>f.durationMs===80&&f.sourceCell===i+1))throw new Error('Wrong Swarmling run contract');
  const base='./assets/vanguard/fleshpunk/characters/swarmling/';
  images=await Promise.all(run.frames.map(f=>loadImage(base+f.src)));
  canvas.width=430;canvas.height=260;
  q('[data-recipe]').textContent=JSON.stringify(run,null,2);
  q('[data-title]').textContent='Swarmling Run';
  render(0);
  requestAnimationFrame(()=>{fit();requestAnimationFrame(loop)});
}catch(err){
  document.querySelector('#app').innerHTML='<pre style="padding:18px;color:#ff8a8a;white-space:pre-wrap"></pre>';
  document.querySelector('#app pre').textContent=err?.stack||String(err);
}

import { createProceduralReviewShell } from './procedural-review-shell.js';

const params=new URLSearchParams(location.search);
const animation='vesper-run';
const ui=createProceduralReviewShell({
  title:'Vesper Run',
  animation,
  accent:'#8da66d'
});
const {q,canvas,fit}=ui;
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=true;
const phaseEl=q('[data-phase]');
const kv=q('[data-kv]');
const timeEl=q('[data-time]');
const scrub=q('[data-scrub]');
const playBtn=q('[data-play]');

let recipe,atlas,playing=true,start=performance.now(),offset=0;
const cache=new Map();
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const lerp=(a,b,t)=>a+(b-a)*t;
const loadImage=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('Could not load '+src));i.src=src;});

function rectFor(cellNo){
  const a=recipe.atlas;
  const idx=cellNo-a.indexBase;
  const c=idx%a.columns;
  const r=Math.floor(idx/a.columns);
  const x0=Math.round(c*atlas.naturalWidth/a.columns);
  const x1=Math.round((c+1)*atlas.naturalWidth/a.columns);
  const y0=Math.round(r*atlas.naturalHeight/a.rows);
  const y1=Math.round((r+1)*atlas.naturalHeight/a.rows);
  return [x0,y0,x1-x0,y1-y0];
}

function cell(cellNo){
  if(cache.has(cellNo)) return cache.get(cellNo);
  const [sx,sy,sw,sh]=rectFor(cellNo);
  const raw=document.createElement('canvas');
  raw.width=sw;
  raw.height=sh;
  raw.getContext('2d').drawImage(atlas,sx,sy,sw,sh,0,0,sw,sh);
  // IMPORTANT: preserve source-cell geometry. No per-frame trim or recenter.
  const item={image:raw,anchor:[Math.round(sw/2),sh-1]};
  cache.set(cellNo,item);
  return item;
}

function segments(){
  const total=recipe.poses.reduce((s,p)=>s+p.weight,0);
  let acc=0;
  return recipe.poses.map((p,i)=>{
    const a=acc/total;
    acc+=p.weight;
    return {p,i,a,b:acc/total};
  });
}

function stateAt(t){
  const segs=segments();
  t=((t%1)+1)%1;
  const s=segs.find(x=>t>=x.a&&t<x.b)||segs.at(-1);
  const u=(t-s.a)/(s.b-s.a);
  return {p:s.p,next:recipe.poses[(s.i+1)%recipe.poses.length],u};
}

function interp(a,b,u){
  const e=smooth(u),A=a.deform||{},B=b.deform||{};
  return {
    shearX:lerp(A.shearX||0,B.shearX||0,e),
    scaleX:lerp(A.scaleX??1,B.scaleX??1,e),
    scaleY:lerp(A.scaleY??1,B.scaleY??1,e),
    shiftX:lerp(A.shiftX||0,B.shiftX||0,e),
    shiftY:lerp(A.shiftY||0,B.shiftY||0,e)
  };
}

function secondaryAt(t){
  const s=recipe.secondary||{};
  const bobCycles=Number(s.bobCyclesPerRun??2);
  const shearCycles=Number(s.shearPulseCyclesPerRun??1);
  const bobPx=Number(s.bobPx??0);
  const shearPulse=Number(s.shearPulse??0);
  return {
    // Two soft lift/compression pulses per full six-frame cycle.
    shiftY:-Math.abs(Math.sin(Math.PI*2*t*bobCycles))*bobPx,
    shearX:Math.sin(Math.PI*2*t*shearCycles)*shearPulse
  };
}

function draw(p,d,secondary,alpha=1){
  const base=cell(p.cell);
  const [px,py]=recipe.canvas.anchor;
  const bodyScale=Number(recipe.bodyScale??1);
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(px,py+secondary.shiftY);
  ctx.transform(
    (d.scaleX??1)*bodyScale,
    0,
    (d.shearX||0)+secondary.shearX,
    (d.scaleY??1)*bodyScale,
    d.shiftX||0,
    d.shiftY||0
  );
  ctx.drawImage(base.image,-base.anchor[0],-base.anchor[1]);
  ctx.restore();
}

function render(t){
  const state=stateAt(t);
  const d=interp(state.p,state.next,state.u);
  const secondary=secondaryAt(t);
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#000';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  draw(state.p,d,secondary,1);

  phaseEl.textContent=state.p.id;
  timeEl.textContent=Math.round(t*recipe.cycleMs)+' / '+recipe.cycleMs+' ms';
  scrub.value=String(t);
  kv.innerHTML=`<div>Atlas cell</div><div>${state.p.cell}</div>
    <div>Next cell</div><div>${state.next.cell}</div>
    <div>Shear X</div><div>${(d.shearX+secondary.shearX).toFixed(3)}</div>
    <div>Procedural bob</div><div>${secondary.shiftY.toFixed(2)} px</div>
    <div>Scale X/Y</div><div>${d.scaleX.toFixed(3)} / ${d.scaleY.toFixed(3)}</div>
    <div>Root motion</div><div>OFF</div>`;
}

function loop(now){
  let t=offset;
  if(playing)t=(offset+(now-start)/recipe.cycleMs)%1;
  render(t);
  requestAnimationFrame(loop);
}

playBtn.onclick=()=>{
  if(playing){
    offset=(offset+(performance.now()-start)/recipe.cycleMs)%1;
    playing=false;
    playBtn.textContent='▶';
  }else{
    start=performance.now();
    playing=true;
    playBtn.textContent='❚❚';
  }
};
q('[data-restart]').onclick=()=>{offset=0;start=performance.now();render(0)};
scrub.oninput=()=>{offset=Number(scrub.value);start=performance.now();render(offset)};

try{
  recipe=await fetch('./assets/vesper/procedural/run.recipe.json',{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error('recipe HTTP '+r.status);return r.json()});
  q('[data-recipe]').textContent=JSON.stringify(recipe,null,2);
  q('[data-title]').textContent=recipe.id;
  const rev=params.get('rev');
  const atlasPath='./'+recipe.atlas.file+(rev?'?rev='+encodeURIComponent(rev):'');
  atlas=await loadImage(atlasPath);
  if(atlas.naturalWidth!==recipe.atlas.size[0]||atlas.naturalHeight!==recipe.atlas.size[1]){
    throw new Error(`Wrong Vesper atlas dimensions: expected ${recipe.atlas.size.join('x')}, got ${atlas.naturalWidth}x${atlas.naturalHeight}`);
  }
  canvas.width=recipe.canvas.size[0];
  canvas.height=recipe.canvas.size[1];
  for(const p of recipe.poses)cell(p.cell);
  render(0);
  requestAnimationFrame(()=>{fit();requestAnimationFrame(loop)});
}catch(err){
  document.querySelector('#app').innerHTML='<pre style="padding:18px;color:#ff8a8a;white-space:pre-wrap"></pre>';
  document.querySelector('#app pre').textContent=err?.stack||String(err);
}

import { createProceduralReviewShell } from './procedural-review-shell.js';

const params=new URLSearchParams(location.search);
const requested=params.get('procedural')||'swarmling-run';
const animationId=requested.startsWith('swarmling-')?requested.slice('swarmling-'.length):'run';
const routeLabels=Object.freeze({
  "run":"Swarmling Run",
  "jab":"Swarmling Needle Jab",
  "rake":"Swarmling Low Rake",
  "scythe-bloom":"Swarmling Scythe Bloom",
  "idle":"Swarmling Idle",
  "aggro":"Swarmling Aggro / Attention",
  "damage":"Swarmling Damage / Hit React",
  "knockdown":"Swarmling Knockdown",
  "stand-up":"Swarmling Stand Up",
  "death":"Swarmling Death",
});
const ui=createProceduralReviewShell({
  title:routeLabels[animationId]||'Swarmling',
  animation:'swarmling-'+animationId,
  character:'swarmling',
  accent:'#d6a84d'
});
const {q,canvas,fit}=ui;
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=true;
const play=q('[data-play]'),restart=q('[data-restart]'),scrub=q('[data-scrub]');
const phase=q('[data-phase]'),time=q('[data-time]'),kv=q('[data-kv]');
let manifest,animation,sourceAtlas=null,playing=true,start=performance.now(),offset=0,total=1;
const boundsCache=new WeakMap();
const sourceCellCache=new Map();
const imageCache=new Map();
const runAnchors=[[128,249],[128,249],[128,249],[128,249],[128,249],[128,249]];
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const lerp=(a,b,t)=>a+(b-a)*t;

const loadImage=src=>{
  if(imageCache.has(src))return Promise.resolve(imageCache.get(src));
  return new Promise((ok,no)=>{
    const i=new Image();
    i.onload=()=>{imageCache.set(src,i);ok(i)};
    i.onerror=()=>no(new Error('Could not load '+src));
    i.src=src;
  });
};
const widthOf=image=>image.naturalWidth||image.width;
const heightOf=image=>image.naturalHeight||image.height;

function visibleBounds(image,pad=0){
  const key=String(pad);
  let byPad=boundsCache.get(image);
  if(byPad?.[key])return byPad[key];
  const w=widthOf(image),h=heightOf(image);
  const c=document.createElement('canvas');
  c.width=w;c.height=h;
  const x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(image,0,0,w,h);
  const d=x.getImageData(0,0,w,h).data;
  let minX=w,minY=h,maxX=-1,maxY=-1;
  for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
    if(d[(yy*w+xx)*4+3]>8){
      minX=Math.min(minX,xx);minY=Math.min(minY,yy);
      maxX=Math.max(maxX,xx);maxY=Math.max(maxY,yy);
    }
  }
  if(maxX<minX)throw new Error('Empty Swarmling frame');
  const b={
    x:Math.max(0,minX-pad),
    y:Math.max(0,minY-pad),
    w:Math.min(w,maxX+1+pad)-Math.max(0,minX-pad),
    h:Math.min(h,maxY+1+pad)-Math.max(0,minY-pad)
  };
  byPad={...(byPad||{}),[key]:b};
  boundsCache.set(image,byPad);
  return b;
}

function sourceCellImage(cellNo){
  if(sourceCellCache.has(cellNo))return sourceCellCache.get(cellNo);
  if(!sourceAtlas)throw new Error('Swarmling source atlas not loaded');
  const spec=manifest.authority.sourceLayout;
  const idx=cellNo-1,c=idx%spec.columns,r=Math.floor(idx/spec.columns);
  const sx=c*spec.cellWidth,sy=r*spec.cellHeight;
  const out=document.createElement('canvas');
  out.width=spec.cellWidth;out.height=spec.cellHeight;
  const x=out.getContext('2d');
  // Preserve the authored source cell exactly. The motion stage is already
  // black, so background-keying would only destroy dark silhouette detail.
  x.drawImage(
    sourceAtlas,
    sx,sy,spec.cellWidth,spec.cellHeight,
    0,0,spec.cellWidth,spec.cellHeight
  );
  sourceCellCache.set(cellNo,out);
  return out;
}

function sequence(){
  return Array.isArray(animation.timeline)&&animation.timeline.length
    ? animation.timeline
    : animation.frames;
}

function stateAtMs(ms){
  const seq=sequence();
  let acc=0;
  for(let i=0;i<seq.length;i++){
    const item=seq[i],end=acc+Number(item.durationMs);
    if(ms<end||i===seq.length-1){
      const u=Number(item.durationMs)>0?clamp((ms-acc)/Number(item.durationMs)):0;
      return{item,index:i,startMs:acc,u};
    }
    acc=end;
  }
  return{item:seq[0],index:0,startMs:0,u:0};
}

function anchorFor(item,index){
  if(Array.isArray(item.anchorPoint))return item.anchorPoint.map(Number);
  return runAnchors[index]||runAnchors[0];
}

function deformAt(index,u){
  const seq=sequence();
  const a=seq[index]?.deform||{};
  const b=seq[Math.min(seq.length-1,index+1)]?.deform||a;
  const t=smooth(u);
  return{
    shearX:lerp(Number(a.shearX??0),Number(b.shearX??a.shearX??0),t),
    scaleX:lerp(Number(a.scaleX??1),Number(b.scaleX??a.scaleX??1),t),
    scaleY:lerp(Number(a.scaleY??1),Number(b.scaleY??a.scaleY??1),t),
    rotateDeg:lerp(Number(a.rotateDeg??0),Number(b.rotateDeg??a.rotateDeg??0),t)
  };
}

function proceduralMotionAt(ms,state,base){
  const p=animation?.proceduralMotion;
  if(!p)return base;
  const cycle=Math.max(1,Number(p.cycleMs||1000));
  const phase=(ms/cycle)*Math.PI*2;
  const s1=Math.sin(phase);
  const s2=Math.sin(phase*2+0.65);
  const harmonic=Number(p.secondHarmonic||0);
  let signal=s1+harmonic*s2;
  const decay=Math.max(1,Number(p.decayMs||600));
  const decayEnv=Math.exp(-Math.max(0,ms)/decay);

  if(p.mode==='organic-breath'){
    signal=s1+harmonic*s2;
  }else if(p.mode==='startle-quiver'){
    signal=(Math.sin(phase*1.8)+0.45*Math.sin(phase*3.1))*Math.max(.28,decayEnv);
  }else if(p.mode==='impact-rattle'){
    signal=(Math.sin(phase*2.2)+0.35*Math.sin(phase*4.4))*decayEnv;
  }else if(p.mode==='collapse-jolt'){
    signal=(Math.sin(phase*1.6)+0.3*Math.sin(phase*3.2))*Math.max(.18,decayEnv);
  }else if(p.mode==='effort-pulse'){
    signal=(s1+harmonic*s2)*(.65+.35*Math.sin(Math.PI*clamp(state.u)));
  }else if(p.mode==='death-spasm'){
    signal=(Math.sin(phase*2.4)+0.4*Math.sin(phase*4.8))*decayEnv;
  }

  return{
    shearX:Number(base.shearX||0)+signal*Number(p.shearX||0),
    scaleX:Number(base.scaleX||1)-signal*Number(p.scaleX||0),
    scaleY:Number(base.scaleY||1)+signal*Number(p.scaleY||0),
    rotateDeg:Number(base.rotateDeg||0)+signal*Number(p.rotateDeg||0)
  };
}

function reviewTimeAt(raw){
  if(animation?.reviewLoop===true){
    const gap=Math.max(0,Number(animation.reviewLoopGapMs||0));
    const span=Math.max(1,total+gap);
    const t=((raw%span)+span)%span;
    return t>=total?Math.max(0,total-.001):t;
  }
  if(animation?.loop===true)return ((raw%total)+total)%total;
  return Math.max(0,Math.min(Math.max(0,total-.001),raw));
}


async function imageFor(item){
  if(item.src){
    const base='./assets/vanguard/fleshpunk/characters/swarmling/';
    return loadImage(base+item.src);
  }
  if(Number.isInteger(item.sourceCell))return sourceCellImage(item.sourceCell);
  throw new Error('Swarmling sequence item has no src or sourceCell');
}

function drawPlanted(image,item,index,d){
  const presentationScale=1.5;
  const stageAnchor=Array.isArray(animation.stageAnchor)?animation.stageAnchor:[220,226];
  const [stageX,stageY]=stageAnchor.map(Number);
  const [srcX,srcY]=anchorFor(item,index);
  const w=widthOf(image),h=heightOf(image);

  ctx.save();
  ctx.translate(stageX,stageY);
  ctx.rotate((d.rotateDeg||0)*Math.PI/180);
  ctx.transform(
    presentationScale*d.scaleX,
    0,
    d.shearX,
    presentationScale*d.scaleY,
    0,
    0
  );
  ctx.drawImage(image,-srcX,-srcY,w,h);
  ctx.restore();
}

async function render(ms){
  ms=reviewTimeAt(ms);
  const state=stateAtMs(ms),item=state.item,index=state.index;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);

  const image=await imageFor(item);
  const baseDeform=deformAt(index,state.u);
  const d=proceduralMotionAt(ms,state,baseDeform);
  drawPlanted(image,item,index,d);

  const timing=animation.combatTiming||{};
  const active=Number.isFinite(timing.activeAtMs)
    && ms>=timing.activeAtMs
    && ms<timing.activeAtMs+Number(timing.activeDurationMs||0);
  const [srcAnchorX,srcAnchorY]=anchorFor(item,index);
  phase.textContent=item.id||item.phase||((animationId==='run')?'run-'+String(index+1):animationId+'-'+String(index+1));
  time.textContent=Math.round(ms)+' / '+total+' ms';
  scrub.value=String(ms/total);
  kv.innerHTML=`<div>Character</div><div>Swarmling</div>
    <div>Phase</div><div>${index+1} / ${sequence().length}</div>
    <div>Source cell</div><div>${item.sourceCell??'derived'}</div>
    <div>Active</div><div>${active?'YES':'no'}</div>
    <div>Shear X</div><div>${d.shearX.toFixed(3)}</div>
    <div>Scale X/Y</div><div>${d.scaleX.toFixed(3)} / ${d.scaleY.toFixed(3)}</div>
    <div>Rotate</div><div>${d.rotateDeg.toFixed(1)}°</div>
    <div>Root motion</div><div>OFF</div>
    <div>Plant anchor</div><div>${srcAnchorX}, ${srcAnchorY}</div>`;
}

function loop(now){
  const raw=playing?(offset+(now-start)):offset;
  if(animation?.reviewLoop!==true && animation?.loop!==true && playing && raw>=total){
    offset=Math.max(0,total-.001);
    playing=false;
    play.textContent='▶';
  }
  const ms=reviewTimeAt(playing?raw:offset);
  render(ms).catch(err=>{playing=false;throw err});
  requestAnimationFrame(loop);
}

play.onclick=()=>{
  if(playing){offset=(offset+(performance.now()-start))%total;playing=false;play.textContent='▶'}
  else{if(animation?.reviewLoop!==true&&animation?.loop!==true&&offset>=total-1)offset=0;start=performance.now();playing=true;play.textContent='❚❚'}
};
restart.onclick=()=>{offset=0;start=performance.now();render(0)};
scrub.oninput=()=>{offset=Number(scrub.value)*total;start=performance.now();render(offset)};

try{
  const manifestPath='./assets/vanguard/fleshpunk/characters/swarmling/animations.json';
  manifest=await fetch(manifestPath,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('manifest HTTP '+r.status);return r.json()});
  if(manifest.character!=='Swarmling'||manifest.lineage!=='vanguard-side-2d-sprite')throw new Error('Wrong Swarmling lineage');
  animation=manifest.animations.find(a=>a.id===animationId);
  if(!animation)throw new Error('Missing Swarmling animation '+animationId);
  if(animation.rootMotion!==false && animationId!=='run')throw new Error('Swarmling root motion must be OFF');

  const seq=sequence();
  total=seq.reduce((sum,item)=>sum+Number(item.durationMs),0);
  const needsAtlas=seq.some(item=>!item.src&&Number.isInteger(item.sourceCell));
  if(needsAtlas){
    const base='./assets/vanguard/fleshpunk/characters/swarmling/';
    sourceAtlas=await loadImage(base+manifest.authority.source);
  }
  await Promise.all(seq.filter(item=>item.src).map(item=>imageFor(item)));

  canvas.width=430;canvas.height=260;
  q('[data-recipe]').textContent=JSON.stringify(animation,null,2);
  q('[data-title]').textContent=routeLabels[animationId]||animation.label;
  await render(0);
  requestAnimationFrame(()=>{fit();requestAnimationFrame(loop)});
}catch(err){
  document.querySelector('#app').innerHTML='<pre style="padding:18px;color:#ff8a8a;white-space:pre-wrap"></pre>';
  document.querySelector('#app pre').textContent=err?.stack||String(err);
}

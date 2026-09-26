import { createProceduralReviewShell } from './procedural-review-shell.js';

const params=new URLSearchParams(location.search);
const requested=params.get('procedural')||'swarmling-run';
const animationId=requested.startsWith('swarmling-')?requested.slice('swarmling-'.length):'run';
const routeLabels=Object.freeze({
  run:'Swarmling Run',
  jab:'Swarmling Needle Jab',
  rake:'Swarmling Low Rake',
  'scythe-bloom':'Swarmling Scythe Bloom'
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
let manifest,animation,images=[],sourceAtlas=null,playing=true,start=performance.now(),offset=0,total=1;
const boundsCache=new WeakMap();
const sourceCellCache=new Map();
const runAnchors=[
  [128,249],[128,249],[128,249],[128,250],[128,249],[128,250]
];

const loadImage=src=>new Promise((ok,no)=>{
  const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('Could not load '+src));i.src=src;
});
const widthOf=image=>image.naturalWidth||image.width;
const heightOf=image=>image.naturalHeight||image.height;

function visibleBounds(image){
  if(boundsCache.has(image))return boundsCache.get(image);
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
  const b={x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};
  boundsCache.set(image,b);
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
  const x=out.getContext('2d',{willReadFrequently:true});
  x.drawImage(sourceAtlas,sx,sy,spec.cellWidth,spec.cellHeight,0,0,spec.cellWidth,spec.cellHeight);

  const im=x.getImageData(0,0,out.width,out.height),d=im.data;
  const seen=new Uint8Array(out.width*out.height),stack=[];
  const isBg=(px,py)=>{
    const i=(py*out.width+px)*4;
    return d[i+3]>8 && Math.max(d[i],d[i+1],d[i+2])<=18;
  };
  const push=(px,py)=>{
    const i=py*out.width+px;
    if(seen[i]||!isBg(px,py))return;
    seen[i]=1;stack.push([px,py]);
  };
  for(let px=0;px<out.width;px++){push(px,0);push(px,out.height-1);}
  for(let py=0;py<out.height;py++){push(0,py);push(out.width-1,py);}
  while(stack.length){
    const [px,py]=stack.pop(),i=(py*out.width+px)*4;
    d[i+3]=0;
    if(px>0)push(px-1,py);
    if(px+1<out.width)push(px+1,py);
    if(py>0)push(px,py-1);
    if(py+1<out.height)push(px,py+1);
  }
  x.putImageData(im,0,0);
  sourceCellCache.set(cellNo,out);
  return out;
}

function frameAtMs(ms){
  let acc=0;
  for(let i=0;i<animation.frames.length;i++){
    const f=animation.frames[i],end=acc+Number(f.durationMs);
    if(ms<end||i===animation.frames.length-1)return{frame:f,index:i,startMs:acc};
    acc=end;
  }
  return{frame:animation.frames[0],index:0,startMs:0};
}

function anchorFor(frame,index){
  if(Array.isArray(frame.anchorPoint))return frame.anchorPoint.map(Number);
  return runAnchors[index]||runAnchors[0];
}

function render(ms){
  ms=((ms%total)+total)%total;
  const state=frameAtMs(ms),frame=state.frame,index=state.index;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);

  const image=images[index];
  const b=visibleBounds(image);
  const presentationScale=1.5;
  const stageAnchor=Array.isArray(animation.stageAnchor)?animation.stageAnchor:[220,226];
  const [anchorX,anchorY]=stageAnchor.map(Number);
  const [srcAnchorX,srcAnchorY]=anchorFor(frame,index);
  const drawW=Math.round(b.w*presentationScale);
  const drawH=Math.round(b.h*presentationScale);
  const x=Math.round(anchorX-(srcAnchorX-b.x)*presentationScale);
  const y=Math.round(anchorY-(srcAnchorY-b.y)*presentationScale);
  ctx.drawImage(image,b.x,b.y,b.w,b.h,x,y,drawW,drawH);

  const timing=animation.combatTiming||{};
  const active=Number.isFinite(timing.activeAtMs)
    && ms>=timing.activeAtMs
    && ms<timing.activeAtMs+Number(timing.activeDurationMs||0);
  phase.textContent=frame.phase||((animationId==='run')?'run-'+String(index+1):animationId+'-'+String(index+1));
  time.textContent=Math.round(ms)+' / '+total+' ms';
  scrub.value=String(ms/total);
  kv.innerHTML=`<div>Character</div><div>Swarmling</div>
    <div>Frame</div><div>${index+1} / ${animation.frames.length}</div>
    <div>Source cell</div><div>${frame.sourceCell??'derived'}</div>
    <div>Active</div><div>${active?'YES':'no'}</div>
    <div>Root motion</div><div>OFF</div>
    <div>Plant anchor</div><div>${srcAnchorX}, ${srcAnchorY}</div>`;
}

function loop(now){
  const ms=playing?(offset+(now-start))%total:offset;
  render(ms);
  requestAnimationFrame(loop);
}
play.onclick=()=>{
  if(playing){offset=(offset+(performance.now()-start))%total;playing=false;play.textContent='▶'}
  else{start=performance.now();playing=true;play.textContent='❚❚'}
};
restart.onclick=()=>{offset=0;start=performance.now();render(0)};
scrub.oninput=()=>{offset=Number(scrub.value)*total;start=performance.now();render(offset)};

try{
  const manifestPath='./assets/vanguard/fleshpunk/characters/swarmling/animations.json';
  manifest=await fetch(manifestPath,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('manifest HTTP '+r.status);return r.json()});
  if(manifest.character!=='Swarmling'||manifest.lineage!=='vanguard-side-2d-sprite')throw new Error('Wrong Swarmling lineage');
  animation=manifest.animations.find(a=>a.id===animationId);
  if(!animation)throw new Error('Missing Swarmling animation '+animationId);
  if(animation.rootMotion!==false && animationId!=='run')throw new Error('Swarmling attack root motion must be OFF');
  total=animation.frames.reduce((sum,f)=>sum+Number(f.durationMs),0);

  const base='./assets/vanguard/fleshpunk/characters/swarmling/';
  const needsAtlas=animation.frames.some(f=>!f.src && Number.isInteger(f.sourceCell));
  if(needsAtlas)sourceAtlas=await loadImage(base+manifest.authority.source);
  images=await Promise.all(animation.frames.map(async f=>{
    if(f.src)return loadImage(base+f.src);
    if(Number.isInteger(f.sourceCell))return sourceCellImage(f.sourceCell);
    throw new Error('Frame has no src or sourceCell');
  }));

  canvas.width=430;canvas.height=260;
  q('[data-recipe]').textContent=JSON.stringify(animation,null,2);
  q('[data-title]').textContent=routeLabels[animationId]||animation.label;
  render(0);
  requestAnimationFrame(()=>{fit();requestAnimationFrame(loop)});
}catch(err){
  document.querySelector('#app').innerHTML='<pre style="padding:18px;color:#ff8a8a;white-space:pre-wrap"></pre>';
  document.querySelector('#app pre').textContent=err?.stack||String(err);
}

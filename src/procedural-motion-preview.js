const app = document.querySelector('#app');
const params = new URLSearchParams(location.search);
const candidate = params.get('procedural') || 'vanguard-overhand-strike';
const recipeUrl = './assets/vanguard/procedural/overhand-strike.recipe.json';

app.innerHTML = `
<style>
  :root{--bg:#090d10;--panel:#111820;--line:#293742;--text:#f2eee7;--muted:#9caab6;--accent:#ffbd4a}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,sans-serif}
  .top{display:flex;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line);background:#0e1419}
  .top strong{font-size:15px}
  .top .tag{font-size:11px;color:#081014;background:var(--accent);padding:3px 7px;border-radius:999px;font-weight:900}
  .top .spacer{flex:1}
  button{border:1px solid var(--line);background:#17212a;color:var(--text);border-radius:7px;padding:8px 12px;font:inherit;font-weight:800}
  .layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;min-height:calc(100dvh - 57px)}
  .stage-wrap{display:grid;grid-template-rows:minmax(0,1fr) auto;background:#050709}
  .stage{display:grid;place-items:center;padding:18px;min-height:60dvh;background:
    linear-gradient(#ffffff08 1px,transparent 1px),
    linear-gradient(90deg,#ffffff08 1px,transparent 1px),#080c0f;background-size:32px 32px}
  canvas{width:min(92vw,860px);height:auto;image-rendering:pixelated;border:1px solid #24313a;background:#000}
  .transport{display:grid;grid-template-columns:auto auto 1fr auto;gap:10px;align-items:center;padding:10px 14px;border-top:1px solid var(--line);background:#0e1419}
  input[type=range]{width:100%}
  .side{padding:14px;background:var(--panel);border-left:1px solid var(--line);overflow:auto}
  .phase{font-size:24px;font-weight:900;color:var(--accent);margin:4px 0 12px}
  .meta{font-size:12px;color:var(--muted);line-height:1.55}
  .kv{display:grid;grid-template-columns:110px 1fr;gap:6px 10px;font-size:12px;margin:14px 0}
  .kv div:nth-child(odd){color:var(--muted)}
  pre{font-size:11px;white-space:pre-wrap;background:#091015;border:1px solid var(--line);padding:9px;border-radius:7px;max-height:32dvh;overflow:auto}
  .error{padding:18px;color:#ff8888;white-space:pre-wrap}
  @media(max-width:820px){
    .layout{display:block}
    .side{border-left:0;border-top:1px solid var(--line)}
    .stage{min-height:46dvh;padding:8px}
    .transport{grid-template-columns:auto auto 1fr}
    .transport .time{grid-column:1/-1}
  }
</style>
<header class="top">
  <strong>Pose Lab V2 · Procedural Motion</strong>
  <span class="tag">LIVE RECIPE</span>
  <span class="spacer"></span>
  <button data-editor>Profiles</button>
</header>
<div class="layout">
  <section class="stage-wrap">
    <div class="stage"><canvas data-canvas width="430" height="260"></canvas></div>
    <div class="transport">
      <button data-play>❚❚</button>
      <button data-restart>↺</button>
      <input data-scrub type="range" min="0" max="1" step="0.001" value="0">
      <span class="time" data-time></span>
    </div>
  </section>
  <aside class="side">
    <div class="meta">Candidate</div>
    <div style="font-weight:900;font-size:18px" data-name></div>
    <div class="phase" data-phase></div>
    <div class="kv" data-kv></div>
    <div class="meta">This surface resolves atlas cells and procedural deformation at runtime. Generated GIFs are not the motion authority.</div>
    <pre data-recipe></pre>
  </aside>
</div>`;

const canvas = app.querySelector('[data-canvas]');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;
const playButton = app.querySelector('[data-play]');
const restartButton = app.querySelector('[data-restart]');
const scrub = app.querySelector('[data-scrub]');
const phaseEl = app.querySelector('[data-phase]');
const timeEl = app.querySelector('[data-time]');
const kvEl = app.querySelector('[data-kv]');
const recipeEl = app.querySelector('[data-recipe]');
const nameEl = app.querySelector('[data-name]');
app.querySelector('[data-editor]').addEventListener('click',()=>{ location.href='./motion.html'; });

let recipe, atlasImage, slashImage, slashColored;
let playing = true;
let startedAt = performance.now();
let offsetMs = 0;
let totalMs = 1;
let phases = [];
let processedCells = new Map();

function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>reject(new Error('Could not load '+src));
    img.src=src;
  });
}

function clockDeg(v){ return (v%12)*30-90; }
function lerp(a,b,t){ return a+(b-a)*t; }
function clamp01(v){ return Math.max(0,Math.min(1,v)); }
function ease(t){ t=clamp01(t); return t*t*(3-2*t); }

function atlasRect(spec, cell){
  const idx=cell-(spec.indexBase||0);
  const col=idx%spec.columns;
  const row=Math.floor(idx/spec.columns);
  return {
    x:Math.round(col*atlasImage.naturalWidth/spec.columns),
    y:Math.round(row*atlasImage.naturalHeight/spec.rows),
    w:Math.round((col+1)*atlasImage.naturalWidth/spec.columns)-Math.round(col*atlasImage.naturalWidth/spec.columns),
    h:Math.round((row+1)*atlasImage.naturalHeight/spec.rows)-Math.round(row*atlasImage.naturalHeight/spec.rows),
  };
}

function processAtlasCell(sourceId){
  if(processedCells.has(sourceId)) return processedCells.get(sourceId);
  const src=recipe.sources[sourceId];
  const atlasSpec=recipe.atlases[src.atlas];
  const r=atlasRect(atlasSpec,src.cell);
  const raw=document.createElement('canvas');
  raw.width=r.w; raw.height=r.h;
  const rc=raw.getContext('2d',{willReadFrequently:true});
  rc.drawImage(atlasImage,r.x,r.y,r.w,r.h,0,0,r.w,r.h);
  const image=rc.getImageData(0,0,r.w,r.h);
  const d=image.data;
  let minX=r.w,minY=r.h,maxX=-1,maxY=-1;
  for(let y=0;y<r.h;y++){
    for(let x=0;x<r.w;x++){
      const i=(y*r.w+x)*4;
      const rr=d[i],gg=d[i+1],bb=d[i+2];
      const blue=bb>110 && bb>rr+35 && bb>gg+35;
      if(blue) d[i+3]=0;
      if(d[i+3]>8){ if(x<minX)minX=x;if(y<minY)minY=y;if(x>maxX)maxX=x;if(y>maxY)maxY=y; }
    }
  }
  rc.putImageData(image,0,0);
  if(maxX<minX){ throw new Error('Atlas cell '+src.cell+' is empty after blue-key'); }

  const trim=document.createElement('canvas');
  trim.width=maxX-minX+1; trim.height=maxY-minY+1;
  trim.getContext('2d').drawImage(raw,minX,minY,trim.width,trim.height,0,0,trim.width,trim.height);

  const tc=trim.getContext('2d',{willReadFrequently:true});
  const td=tc.getImageData(0,0,trim.width,trim.height).data;
  const band=Math.min(16,trim.height);
  const y0=trim.height-band;
  let spans=[],start=null;
  for(let x=0;x<trim.width;x++){
    let hit=false;
    for(let y=y0;y<trim.height;y++){
      if(td[(y*trim.width+x)*4+3]>8){hit=true;break;}
    }
    if(hit && start===null) start=x;
    if(!hit && start!==null){spans.push([start,x-1]);start=null;}
  }
  if(start!==null) spans.push([start,trim.width-1]);
  const span=spans[0]||[0,0];
  let sum=0,count=0;
  for(let x=span[0];x<=span[1];x++){
    for(let y=y0;y<trim.height;y++){
      if(td[(y*trim.width+x)*4+3]>8){sum+=x;count++;}
    }
  }
  const anchorX=count?Math.round(sum/count):span[0];
  const result={canvas:trim,anchor:[anchorX,trim.height-1],cell:src.cell};
  processedCells.set(sourceId,result);
  return result;
}

function buildSlash(){
  const c=document.createElement('canvas');
  c.width=slashImage.naturalWidth; c.height=slashImage.naturalHeight;
  const x=c.getContext('2d',{willReadFrequently:true});
  x.drawImage(slashImage,0,0);
  const im=x.getImageData(0,0,c.width,c.height);
  const d=im.data;
  let minX=c.width,minY=c.height,maxX=-1,maxY=-1;
  for(let y=0;y<c.height;y++) for(let xx=0;xx<c.width;xx++){
    const i=(y*c.width+xx)*4;
    const v=Math.max(d[i],d[i+1],d[i+2]);
    if(v>4){if(xx<minX)minX=xx;if(y<minY)minY=y;if(xx>maxX)maxX=xx;if(y>maxY)maxY=y;}
  }
  const crop=document.createElement('canvas');
  crop.width=maxX-minX+1; crop.height=maxY-minY+1;
  crop.getContext('2d').drawImage(c,minX,minY,crop.width,crop.height,0,0,crop.width,crop.height);
  const targetW=recipe.effect.width;
  const targetH=Math.max(1,Math.round(crop.height*targetW/crop.width));
  const scaled=document.createElement('canvas');
  scaled.width=targetW; scaled.height=targetH;
  scaled.getContext('2d').drawImage(crop,0,0,targetW,targetH);
  const sc=scaled.getContext('2d',{willReadFrequently:true});
  const pixels=sc.getImageData(0,0,targetW,targetH);
  const stops=recipe.effect.gradientStops.slice().sort((a,b)=>a.at-b.at);
  function color(v){
    const n=v/255;
    let a=stops[0],b=stops[stops.length-1];
    for(let i=0;i<stops.length-1;i++) if(n>=stops[i].at && n<=stops[i+1].at){a=stops[i];b=stops[i+1];break;}
    const t=(b.at-a.at)?(n-a.at)/(b.at-a.at):0;
    return [0,1,2].map(k=>Math.round(lerp(a.rgb[k],b.rgb[k],t)));
  }
  for(let i=0;i<pixels.data.length;i+=4){
    const v=Math.max(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);
    const rgb=color(v);
    pixels.data[i]=rgb[0];pixels.data[i+1]=rgb[1];pixels.data[i+2]=rgb[2];
    pixels.data[i+3]=Math.round(v*recipe.effect.alphaGain);
  }
  sc.putImageData(pixels,0,0);
  slashColored=scaled;
}

function phaseAt(ms){
  let acc=0;
  for(let i=0;i<phases.length;i++){
    const p=phases[i];
    if(ms<acc+p.durationMs || i===phases.length-1){
      return {phase:p,index:i,start:acc,local:clamp01((ms-acc)/p.durationMs)};
    }
    acc+=p.durationMs;
  }
  return {phase:phases[phases.length-1],index:phases.length-1,start:acc,local:1};
}

function interpolateState(index,t,key,def){
  const a=phases[index];
  const b=phases[Math.min(phases.length-1,index+1)];
  const av=a[key]?.[def] ?? (key==='deform' ? ({shearX:0,scaleX:1,scaleY:1,shiftX:0,shiftY:0}[def]) : 0);
  const bv=b[key]?.[def] ?? av;
  return lerp(Number(av),Number(bv),ease(t));
}

function drawBody(sourceId,deform){
  const item=processAtlasCell(sourceId);
  const [px,py]=recipe.canvas.anchor;
  ctx.save();
  ctx.translate(px,py);
  ctx.transform(deform.scaleX,0,deform.shearX,deform.scaleY,deform.shiftX||0,deform.shiftY||0);
  ctx.drawImage(item.canvas,-item.anchor[0],-item.anchor[1]);
  ctx.restore();
}

function drawSlash(effect){
  if(!effect || !slashColored) return;
  const spec=recipe.effect;
  const start=clockDeg(spec.startClock)*Math.PI/180;
  let end=clockDeg(spec.endClock);
  let startDeg=clockDeg(spec.startClock);
  while(end<=startDeg) end+=360;
  const current=(startDeg+(end-startDeg)*clamp01(effect.reveal))*Math.PI/180;
  const radius=Math.hypot(canvas.width,canvas.height)*2;

  const layer=document.createElement('canvas');
  layer.width=canvas.width; layer.height=canvas.height;
  const lc=layer.getContext('2d');

  lc.save();
  lc.beginPath();
  lc.moveTo(spec.pivot[0],spec.pivot[1]);
  lc.arc(spec.pivot[0],spec.pivot[1],radius,start,current,false);
  lc.closePath();
  lc.clip();

  const passes=[
    {alpha:effect.wideGlow*spec.wideOpacity,blur:spec.wideBlurPx},
    {alpha:effect.tightGlow*spec.tightOpacity,blur:spec.tightBlurPx},
    {alpha:effect.core,blur:0}
  ];
  for(const pass of passes){
    if(pass.alpha<=0) continue;
    lc.save();
    lc.globalAlpha=pass.alpha;
    lc.filter=pass.blur? `blur(${pass.blur}px)` : 'none';
    lc.drawImage(slashColored,spec.position[0],spec.position[1]);
    lc.restore();
  }
  lc.restore();
  ctx.drawImage(layer,0,0);
}

function render(ms){
  const state=phaseAt(ms);
  const p=state.phase, i=state.index, t=state.local;
  const deform={
    shearX:interpolateState(i,t,'deform','shearX'),
    scaleX:interpolateState(i,t,'deform','scaleX'),
    scaleY:interpolateState(i,t,'deform','scaleY'),
    shiftX:interpolateState(i,t,'deform','shiftX'),
    shiftY:interpolateState(i,t,'deform','shiftY'),
  };
  const effect=p.effect ? {
    reveal:interpolateState(i,t,'effect','reveal'),
    core:interpolateState(i,t,'effect','core'),
    tightGlow:interpolateState(i,t,'effect','tightGlow'),
    wideGlow:interpolateState(i,t,'effect','wideGlow'),
  } : null;

  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle='black';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  drawBody(p.source,deform);
  drawSlash(effect);

  phaseEl.textContent=p.id;
  timeEl.textContent=`${Math.round(ms)} / ${totalMs} ms`;
  scrub.value=String(ms/totalMs);
  const src=recipe.sources[p.source];
  kvEl.innerHTML=`
    <div>Atlas cell</div><div>${src.cell ?? 'effect'}</div>
    <div>Shear X</div><div>${deform.shearX.toFixed(3)}</div>
    <div>Scale X/Y</div><div>${deform.scaleX.toFixed(3)} / ${deform.scaleY.toFixed(3)}</div>
    <div>Slash reveal</div><div>${effect ? effect.reveal.toFixed(2) : '0.00'}</div>
    <div>Glow core</div><div>${effect ? effect.core.toFixed(2) : '0.00'}</div>
  `;
}

function loop(now){
  let ms=offsetMs;
  if(playing) ms=(offsetMs+(now-startedAt))%totalMs;
  render(ms);
  requestAnimationFrame(loop);
}

playButton.addEventListener('click',()=>{
  if(playing){
    offsetMs=(offsetMs+(performance.now()-startedAt))%totalMs;
    playing=false; playButton.textContent='▶';
  }else{
    startedAt=performance.now();
    playing=true; playButton.textContent='❚❚';
  }
});
restartButton.addEventListener('click',()=>{offsetMs=0;startedAt=performance.now();render(0);});
scrub.addEventListener('input',()=>{
  offsetMs=Number(scrub.value)*totalMs;
  startedAt=performance.now();
  render(offsetMs);
});

try{
  recipe=await fetch(recipeUrl,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Recipe HTTP '+r.status);return r.json();});
  nameEl.textContent=recipe.description || recipe.id;
  recipeEl.textContent=JSON.stringify(recipe,null,2);
  phases=recipe.phases;
  totalMs=phases.reduce((n,p)=>n+Number(p.durationMs),0);
  canvas.width=recipe.canvas.size[0]; canvas.height=recipe.canvas.size[1];

  const atlasPath='./assets/vanguard/procedural/vanguard-pose-atlas-48.png';
  const slashPath='./assets/vanguard/procedural/slash_right.png';
  [atlasImage,slashImage]=await Promise.all([loadImage(atlasPath),loadImage(slashPath)]);

  const spec=recipe.atlases['vanguard-canonical'];
  if(atlasImage.naturalWidth!==spec.size[0] || atlasImage.naturalHeight!==spec.size[1]){
    throw new Error(`Atlas size mismatch: expected ${spec.size.join('x')}, got ${atlasImage.naturalWidth}x${atlasImage.naturalHeight}`);
  }
  buildSlash();
  render(0);
  requestAnimationFrame(loop);
}catch(err){
  app.innerHTML='<pre class="error"></pre>';
  app.querySelector('.error').textContent=err?.stack||String(err);
}

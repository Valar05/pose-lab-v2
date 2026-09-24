import { createProceduralReviewShell } from './procedural-review-shell.js';

const params=new URLSearchParams(location.search);
const requested=params.get('procedural');
const animation=requested==='vanguard-undercut-strike'
  ? 'vanguard-undercut-strike'
  : requested==='vanguard-attack2-uppercut'
    ? 'vanguard-attack2-uppercut'
    : requested==='vanguard-horizontal-strike'
      ? 'vanguard-horizontal-strike'
      : 'vanguard-overhand-strike';
const isUndercut=animation==='vanguard-undercut-strike';
const isAttack2=animation==='vanguard-attack2-uppercut';
const isHorizontal=animation==='vanguard-horizontal-strike';
const ui=createProceduralReviewShell({
  title:isHorizontal?'Vanguard Horizontal Slash':isAttack2?'Vanguard Attack 2 Uppercut':isUndercut?'Vanguard Undercut Strike':'Vanguard Overhand Strike',
  animation,
  accent:'#ffbd4a'
});
const {q,canvas,fit}=ui;
const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;
const play=q('[data-play]'),restart=q('[data-restart]'),scrub=q('[data-scrub]'),phaseEl=q('[data-phase]'),timeEl=q('[data-time]'),kv=q('[data-kv]');
let recipe,atlas,slash,slashMap,playing=true,start=performance.now(),offset=0,total=1,phases=[];
const cache=new Map(),clamp=v=>Math.max(0,Math.min(1,v)),ease=t=>{t=clamp(t);return t*t*(3-2*t)},lerp=(a,b,t)=>a+(b-a)*t;
const loadImage=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('Could not load '+src));i.src=src;});
function rect(spec,cell){const idx=cell-(spec.indexBase||0),c=idx%spec.columns,r=Math.floor(idx/spec.columns);const x0=Math.round(c*atlas.naturalWidth/spec.columns),x1=Math.round((c+1)*atlas.naturalWidth/spec.columns),y0=Math.round(r*atlas.naturalHeight/spec.rows),y1=Math.round((r+1)*atlas.naturalHeight/spec.rows);return[x0,y0,x1-x0,y1-y0]}
function body(sourceId){
 if(cache.has(sourceId))return cache.get(sourceId);
 const src=recipe.sources[sourceId],spec=recipe.atlases[src.atlas],[sx,sy,sw,sh]=rect(spec,src.cell);

 const raw=document.createElement('canvas');
 raw.width=sw;raw.height=sh;
 const rc=raw.getContext('2d',{willReadFrequently:true});
 rc.drawImage(atlas,sx,sy,sw,sh,0,0,sw,sh);

 const im=rc.getImageData(0,0,sw,sh),d=im.data;
 let minX=sw,minY=sh,maxX=-1,maxY=-1;
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
   const i=(y*sw+x)*4,R=d[i],G=d[i+1],B=d[i+2];
   if(B>110&&B>R+35&&B>G+35)d[i+3]=0;
   if(d[i+3]>8){
     minX=Math.min(minX,x);minY=Math.min(minY,y);
     maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
   }
 }
 if(src.isolateLargestComponent){
   const seen=new Uint8Array(sw*sh),components=[];
   const neighbors=[[1,0],[-1,0],[0,1],[0,-1]];
   for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
     const pi=y*sw+x;
     if(seen[pi]||d[pi*4+3]<=8)continue;
     const stack=[[x,y]],pixels=[];seen[pi]=1;
     while(stack.length){
       const [cx,cy]=stack.pop(),ci=cy*sw+cx;
       pixels.push(ci);
       for(const [dx,dy] of neighbors){
         const nx=cx+dx,ny=cy+dy;
         if(nx<0||ny<0||nx>=sw||ny>=sh)continue;
         const ni=ny*sw+nx;
         if(seen[ni]||d[ni*4+3]<=8)continue;
         seen[ni]=1;stack.push([nx,ny]);
       }
     }
     components.push(pixels);
   }
   components.sort((a,b)=>b.length-a.length);
   const keep=new Uint8Array(sw*sh);
   if(components[0])for(const i of components[0])keep[i]=1;
   minX=sw;minY=sh;maxX=-1;maxY=-1;
   for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
     const i=y*sw+x,di=i*4;
     if(!keep[i])d[di+3]=0;
     if(d[di+3]>8){
       minX=Math.min(minX,x);minY=Math.min(minY,y);
       maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
     }
   }
 }
 rc.putImageData(im,0,0);
 if(maxX<minX)throw new Error('Empty atlas cell '+src.cell);

 // Horizontal Slash uses a common atlas-cell coordinate system.
 // Do NOT independently trim its authored poses or their apparent height/grounding drifts.
 if(src.anchorMode==='ground-contact-center'){
   // Preserve native atlas scale. Use the actual lowest occupied foreground row
   // as the common ground line, and center on the foreground touching that row.
   const groundY=maxY;
   const bandTop=Math.max(minY,groundY-5);
   let sumX=0,countX=0;
   for(let y=bandTop;y<=groundY;y++){
     for(let x=minX;x<=maxX;x++){
       if(d[(y*sw+x)*4+3]>8){sumX+=x;countX++;}
     }
   }
   const groundX=countX?Math.round(sumX/countX):Math.round((minX+maxX)/2);
   const item={
     canvas:raw,
     anchor:[groundX,groundY],
     cell:src.cell,
     cellGeometry:true,
     bodyScale:1
   };
   cache.set(sourceId,item);
   return item;
 }

 const trim=document.createElement('canvas');
 trim.width=maxX-minX+1;trim.height=maxY-minY+1;
 trim.getContext('2d').drawImage(raw,minX,minY,trim.width,trim.height,0,0,trim.width,trim.height);

 let anchorX=Math.round(trim.width/2);
 if(src.anchorMode==='rear-foot-left'){
   const td=trim.getContext('2d',{willReadFrequently:true}).getImageData(0,0,trim.width,trim.height).data;
   const band=Math.min(16,trim.height),y0=trim.height-band;let spans=[],spanStart=null;
   for(let x=0;x<trim.width;x++){
     let hit=false;
     for(let y=y0;y<trim.height;y++){if(td[(y*trim.width+x)*4+3]>8){hit=true;break;}}
     if(hit&&spanStart===null)spanStart=x;
     if(!hit&&spanStart!==null){spans.push([spanStart,x-1]);spanStart=null;}
   }
   if(spanStart!==null)spans.push([spanStart,trim.width-1]);
   const span=spans[0]||[0,trim.width-1];let sum=0,count=0;
   for(let x=span[0];x<=span[1];x++)for(let y=y0;y<trim.height;y++){
     if(td[(y*trim.width+x)*4+3]>8){sum+=x;count++;}
   }
   anchorX=count?Math.round(sum/count):span[0];
 }

 const item={canvas:trim,anchor:[anchorX,trim.height-1],cell:src.cell};
 cache.set(sourceId,item);
 return item;
}
function clock(v){return(v%12)*30-90}
function phaseAt(ms){let a=0;for(let i=0;i<phases.length;i++){const p=phases[i];if(ms<a+p.durationMs||i===phases.length-1)return{p,i,u:clamp((ms-a)/p.durationMs)};a+=p.durationMs}}
function iv(i,u,key,name){const a=phases[i],b=phases[Math.min(phases.length-1,i+1)],fallback=key==='deform'?({shearX:0,scaleX:1,scaleY:1,shiftX:0,shiftY:0}[name]):0;return lerp(Number(a[key]?.[name]??fallback),Number(b[key]?.[name]??a[key]?.[name]??fallback),ease(u))}
function buildSlash(){
 function colorizeCanvas(c){
   const x=c.getContext('2d',{willReadFrequently:true});
   const pix=x.getImageData(0,0,c.width,c.height),pd=pix.data;
   const stops=recipe.effect.gradientStops.slice().sort((a,b)=>a.at-b.at);
   function colorFor(vv){
     const n=vv/255;let a=stops[0],b=stops[stops.length-1];
     for(let i=0;i<stops.length-1;i++){
       if(n>=stops[i].at&&n<=stops[i+1].at){a=stops[i];b=stops[i+1];break;}
     }
     const t=(b.at-a.at)?(n-a.at)/(b.at-a.at):0;
     return [0,1,2].map(k=>Math.round(lerp(a.rgb[k],b.rgb[k],t)));
   }
   for(let i=0;i<pd.length;i+=4){
     const vv=Math.max(pd[i],pd[i+1],pd[i+2]),rgb=colorFor(vv);
     pd[i]=rgb[0];pd[i+1]=rgb[1];pd[i+2]=rgb[2];
     pd[i+3]=Math.max(0,Math.min(255,Math.round(vv*recipe.effect.alphaGain)));
   }
   x.putImageData(pix,0,0);
   return c;
 }

 const c=document.createElement('canvas');c.width=slash.naturalWidth;c.height=slash.naturalHeight;
 const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(slash,0,0);
 const im=x.getImageData(0,0,c.width,c.height),d=im.data;let minX=c.width,minY=c.height,maxX=-1,maxY=-1;
 for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){
   const i=(y*c.width+xx)*4,vv=Math.max(d[i],d[i+1],d[i+2]);
   if(vv>4){minX=Math.min(minX,xx);minY=Math.min(minY,y);maxX=Math.max(maxX,xx);maxY=Math.max(maxY,y);}
 }
 const crop=document.createElement('canvas');crop.width=maxX-minX+1;crop.height=maxY-minY+1;
 crop.getContext('2d').drawImage(c,minX,minY,crop.width,crop.height,0,0,crop.width,crop.height);
 const w=recipe.effect.width,h=Math.max(1,Math.round(crop.height*w/crop.width)),o=document.createElement('canvas');o.width=w;o.height=h;
 o.getContext('2d').drawImage(crop,0,0,w,h);
 slashMap=colorizeCanvas(o);
}
function stageOffsetX(){
 const key=recipe.stage?.centerSource||'idle',it=body(key),[px]=recipe.canvas.anchor;
 const localCenter=px-it.anchor[0]+it.canvas.width/2;
 return (recipe.stage?.centerX??215)-localCenter;
}
function drawBody(id,d){
 const it=body(id),[px,py]=recipe.canvas.anchor;
 ctx.save();
 ctx.translate(stageOffsetX(),0);
 ctx.translate(px,py);
 ctx.transform(d.scaleX||1,0,d.shearX,d.scaleY||1,d.shiftX||0,d.shiftY||0);
 ctx.drawImage(it.canvas,-it.anchor[0],-it.anchor[1]);
 ctx.restore();
}
function drawEffectImage(target,image,x,y,rotationDeg=0){
 if(!rotationDeg){target.drawImage(image,x,y);return;}
 const cx=x+image.width/2,cy=y+image.height/2;
 target.save();
 target.translate(cx,cy);
 target.rotate(rotationDeg*Math.PI/180);
 target.drawImage(image,-image.width/2,-image.height/2);
 target.restore();
}
function transformedSlash(image,spec){
 // Keep raw slash geometry. All tuning transforms happen at draw time
 // around a stable local pivot, so rotation never changes/crops the bitmap.
 return image;
}
function drawLegacySlash(e,layerName='front'){
 if(!e||!slashMap||layerName==='back')return;
 const s=recipe.effect||{};
 const mode=s.transform||'none';
 const rot=Number(s.rotationDeg||0);
 const flipY=mode==='flip-y';
 const flipX=mode==='flip-x';
 const swap=Math.abs(rot)%180===90;
 const image=document.createElement('canvas');
 image.width=swap?slashMap.height:slashMap.width;
 image.height=swap?slashMap.width:slashMap.height;
 const ix=image.getContext('2d');
 ix.translate(image.width/2,image.height/2);
 if(rot)ix.rotate(rot*Math.PI/180);
 ix.scale(flipX?-1:1,flipY?-1:1);
 ix.drawImage(slashMap,-slashMap.width/2,-slashMap.height/2);

 const x=Number(s.position?.[0]??0),y=Number(s.position?.[1]??0);
 const reveal=clamp(Number(e.reveal??0));
 if(reveal<=0)return;

 const layer=document.createElement('canvas');
 layer.width=canvas.width; layer.height=canvas.height;
 const lc=layer.getContext('2d');
 lc.save();

 if(s.revealMode==='radial-local' && reveal<0.999){
   const lp=s.localPivot||[image.width/2,image.height/2];
   const px=x+lp[0],py=y+lp[1];
   const startDeg=clock(Number(s.startClock??7.5));
   let endDeg=clock(Number(s.endClock??1.5));
   while(endDeg<=startDeg)endDeg+=360;
   const start=startDeg*Math.PI/180;
   const current=(startDeg+(endDeg-startDeg)*reveal)*Math.PI/180;
   const radius=Math.hypot(image.width,image.height)*1.5;
   lc.beginPath();
   lc.moveTo(px,py);
   lc.arc(px,py,radius,start,current,false);
   lc.closePath();
   lc.clip();
 }

 function passImage(color){
   if(!color)return image;
   const tint=document.createElement('canvas');
   tint.width=image.width;tint.height=image.height;
   const tc=tint.getContext('2d');
   tc.drawImage(image,0,0);
   tc.globalCompositeOperation='source-in';
   tc.fillStyle=`rgb(${color[0]},${color[1]},${color[2]})`;
   tc.fillRect(0,0,tint.width,tint.height);
   return tint;
 }

 const passes=[
   {a:Number(e.wideGlow||0)*Number(s.wideOpacity??.55),b:Number(s.wideBlurPx??7.5),color:s.wideGlowRgb},
   {a:Number(e.tightGlow||0)*Number(s.tightOpacity??.65),b:Number(s.tightBlurPx??2.4),color:s.tightGlowRgb},
   {a:Number(e.core||0),b:0,color:null}
 ];
 for(const p of passes){
   if(p.a<=0)continue;
   lc.save();
   lc.globalAlpha=p.a;
   lc.filter=p.b?`blur(${p.b}px)`:'none';
   lc.drawImage(passImage(p.color),x,y);
   lc.restore();
 }
 lc.restore();

 ctx.save();
 ctx.translate(stageOffsetX(),0);
 ctx.drawImage(layer,0,0);
 ctx.restore();
}

function drawSlash(e,layerName='front'){
 if(!isHorizontal)return drawLegacySlash(e,layerName);
 if(!e||!slashMap)return;

 const spec=recipe.effect||{};
 const image=transformedSlash(slashMap,spec);
 const x=Number(spec.position?.[0]??0);
 const y=Number(spec.position?.[1]??0);
 const reveal=clamp(Number(e.reveal??0));
 if(reveal<=0)return;

 const split=Math.max(.05,Math.min(.95,Number(spec.depthSplit??.5)));
 const pivot=spec.revealPivot||[.5,.5];
 const px=image.width*Number(pivot[0]??.5);
 const py=image.height*Number(pivot[1]??.5);

 const rotZ=Number(spec.rotateZDeg??0)*Math.PI/180;
 const tiltX=Number(spec.tiltXDeg??0)*Math.PI/180;
 const yawY=Number(spec.yawYDeg??0)*Math.PI/180;
 const sx=Number(spec.scaleX??1)*(spec.flipX?-1:1);
 const sy=Number(spec.scaleY??1)*(spec.flipY?-1:1);

 // Keep normal 2D Rotate Z separate from pseudo-3D controls.
 // Tilt X compresses Y; Yaw Y adds horizontal projective shear.
 const pseudoScaleY=Math.max(.06,Math.abs(Math.cos(tiltX)));
 const pseudoShearX=Math.tan(yawY)*.65;

 const start=Number(spec.revealStartDeg??0)*Math.PI/180;
 const sweep=Number(spec.revealSweepDeg??180)*Math.PI/180;
 const end=spec.revealCounterClockwise===false
   ? start+sweep*reveal
   : start-sweep*reveal;

 function passImage(color){
   if(!color)return image;
   const tint=document.createElement('canvas');
   tint.width=image.width;
   tint.height=image.height;
   const tc=tint.getContext('2d');
   tc.drawImage(image,0,0);
   tc.globalCompositeOperation='source-in';
   tc.fillStyle=`rgb(${color[0]},${color[1]},${color[2]})`;
   tc.fillRect(0,0,tint.width,tint.height);
   return tint;
 }

 const radius=Math.hypot(image.width,image.height)*2.5;
 const backIsLeft=(spec.backSide||'left')==='left';
 const passes=[
   {a:e.wideGlow*spec.wideOpacity,b:spec.wideBlurPx,color:spec.wideGlowRgb},
   {a:e.tightGlow*spec.tightOpacity,b:spec.tightBlurPx,color:spec.tightGlowRgb},
   {a:e.core,b:0,color:null}
 ];

 ctx.save();
 ctx.translate(stageOffsetX()+x+px,y+py);
 ctx.rotate(rotZ);
 ctx.scale(sx,sy);
 ctx.transform(1,0,pseudoShearX,pseudoScaleY,0,0);

 // Reveal in slash-local space, after placement transform.
 ctx.beginPath();
 ctx.moveTo(0,0);
 ctx.arc(0,0,radius,start,end,spec.revealCounterClockwise!==false);
 ctx.closePath();
 ctx.clip();

 // Split in slash-local space, not transformed scratch-canvas coordinates.
 ctx.beginPath();
 const splitX=-px+image.width*split;
 if(layerName==='back'){
   if(backIsLeft){
     ctx.rect(-px-8,-py-8,image.width*split+16,image.height+16);
   }else{
     ctx.rect(splitX-8,-py-8,image.width*(1-split)+16,image.height+16);
   }
 }else{
   if(backIsLeft){
     ctx.rect(splitX-8,-py-8,image.width*(1-split)+16,image.height+16);
   }else{
     ctx.rect(-px-8,-py-8,image.width*split+16,image.height+16);
   }
 }
 ctx.clip();

 for(const q of passes){
   if(q.a<=0)continue;
   ctx.save();
   ctx.globalAlpha=q.a;
   ctx.filter=q.b?`blur(${q.b}px)`:'none';
   ctx.drawImage(passImage(q.color),-px,-py);
   ctx.restore();
 }
 ctx.restore();
}
function render(ms){
 const s=phaseAt(ms),p=s.p,i=s.i,u=s.u,d={shearX:iv(i,u,'deform','shearX'),scaleX:iv(i,u,'deform','scaleX'),scaleY:iv(i,u,'deform','scaleY'),shiftX:iv(i,u,'deform','shiftX'),shiftY:iv(i,u,'deform','shiftY')},e=p.effect?{reveal:iv(i,u,'effect','reveal'),core:iv(i,u,'effect','core'),tightGlow:iv(i,u,'effect','tightGlow'),wideGlow:iv(i,u,'effect','wideGlow')}:null; if(isHorizontal&&window.__horizontalControls?.controls.full.checked&&e){e.reveal=1;e.core=1;e.tightGlow=1;e.wideGlow=.7;}
 ctx.setTransform(1,0,0,1,0,0);
 ctx.fillStyle='#000';
 ctx.fillRect(0,0,canvas.width,canvas.height);

 drawSlash(e,'back');
 drawBody(p.source,d);
 drawSlash(e,'front');

 phaseEl.textContent=p.id;
 timeEl.textContent=Math.round(ms)+' / '+total+' ms';
 scrub.value=String(ms/total);
 const src=recipe.sources[p.source];
 kv.innerHTML=`<div>Atlas cell</div><div>${src.cell??''}</div><div>Shear X</div><div>${d.shearX.toFixed(3)}</div><div>Scale X/Y</div><div>${d.scaleX.toFixed(3)} / ${d.scaleY.toFixed(3)}</div><div>Root motion</div><div>OFF</div>`;
}
function loop(now){let ms=offset;if(playing)ms=(offset+(now-start))%total;render(ms);requestAnimationFrame(loop)}
play.onclick=()=>{if(playing){offset=(offset+(performance.now()-start))%total;playing=false;play.textContent='▶'}else{start=performance.now();playing=true;play.textContent='❚❚'}};
restart.onclick=()=>{offset=0;start=performance.now();render(0)};scrub.oninput=()=>{offset=Number(scrub.value)*total;start=performance.now();render(offset)};

function installHorizontalControls(){
 if(!isHorizontal)return;
 const side=document.querySelector('.side');
 if(!side||side.querySelector('[data-horizontal-controls]'))return;

 const box=document.createElement('details');
 box.open=true;
 box.setAttribute('data-horizontal-controls','');
 box.innerHTML=`
   <summary style="font-size:15px;margin-bottom:10px">Slash Controls</summary>
   <div style="display:grid;grid-template-columns:92px 1fr 54px;gap:7px 8px;align-items:center;font-size:12px">
     <label>X</label><input data-hc="x" type="range" min="-250" max="450" step="1"><output data-out="x"></output>
     <label>Y</label><input data-hc="y" type="range" min="-250" max="450" step="1"><output data-out="y"></output>
     <label>Rotate Z °</label><input data-hc="rotz" type="range" min="-180" max="180" step="1"><output data-out="rotz"></output>
     <label>Tilt X °</label><input data-hc="tiltx" type="range" min="-89" max="89" step="1"><output data-out="tiltx"></output>
     <label>Yaw Y °</label><input data-hc="yawy" type="range" min="-75" max="75" step="1"><output data-out="yawy"></output>
     <label>Scale X</label><input data-hc="sx" type="range" min="-3" max="3" step=".05"><output data-out="sx"></output>
     <label>Scale Y</label><input data-hc="sy" type="range" min="-3" max="3" step=".05"><output data-out="sy"></output>
     <label>Depth split</label><input data-hc="split" type="range" min="0" max="1" step=".01"><output data-out="split"></output>
     <label>Reveal start</label><input data-hc="rstart" type="range" min="-180" max="360" step="1"><output data-out="rstart"></output>
     <label>Reveal sweep</label><input data-hc="rsweep" type="range" min="1" max="360" step="1"><output data-out="rsweep"></output>
   </div>
   <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
     <label><input data-hc="flipx" type="checkbox"> Flip X</label>
     <label><input data-hc="flipy" type="checkbox"> Flip Y</label>
     <label><input data-hc="full" type="checkbox"> Full effect</label>
   </div>
   <div style="display:flex;gap:7px;margin-top:10px;flex-wrap:wrap">
     <button data-hc-reset>Reset</button>
     <button data-hc-copy>Copy values</button>
   </div>
 `;
 side.insertBefore(box,side.querySelector('details'));

 const fx=recipe.effect;
 const controls={
   x:box.querySelector('[data-hc="x"]'),
   y:box.querySelector('[data-hc="y"]'),
   rotz:box.querySelector('[data-hc="rotz"]'),
   tiltx:box.querySelector('[data-hc="tiltx"]'),
   yawy:box.querySelector('[data-hc="yawy"]'),
   sx:box.querySelector('[data-hc="sx"]'),
   sy:box.querySelector('[data-hc="sy"]'),
   split:box.querySelector('[data-hc="split"]'),
   rstart:box.querySelector('[data-hc="rstart"]'),
   rsweep:box.querySelector('[data-hc="rsweep"]'),
   flipx:box.querySelector('[data-hc="flipx"]'),
   flipy:box.querySelector('[data-hc="flipy"]'),
   full:box.querySelector('[data-hc="full"]')
 };
 function setValues(){
   controls.x.value=fx.position?.[0]??0;
   controls.y.value=fx.position?.[1]??0;
   controls.rotz.value=fx.rotateZDeg??0;
   controls.tiltx.value=fx.tiltXDeg??0;
   controls.yawy.value=fx.yawYDeg??0;
   controls.sx.value=Number(fx.scaleX??1);
   controls.sy.value=Number(fx.scaleY??1);
   controls.split.value=fx.depthSplit??.5;
   controls.rstart.value=fx.revealStartDeg??0;
   controls.rsweep.value=fx.revealSweepDeg??180;
   controls.flipx.checked=!!fx.flipX;
   controls.flipy.checked=!!fx.flipY;
   refreshOutputs();
 }
 function refreshOutputs(){
   for(const k of ['x','y','rotz','tiltx','yawy','sx','sy','split','rstart','rsweep']){
     box.querySelector('[data-out="'+k+'"]').textContent=controls[k].value;
   }
 }
 function apply(){
   fx.position=[Number(controls.x.value),Number(controls.y.value)];
   fx.rotateZDeg=Number(controls.rotz.value);
   fx.tiltXDeg=Number(controls.tiltx.value);
   fx.yawYDeg=Number(controls.yawy.value);
   const sx=Number(controls.sx.value),sy=Number(controls.sy.value);
   fx.scaleX=Math.abs(sx)<.01?(sx<0?-.01:.01):sx;
   fx.scaleY=Math.abs(sy)<.01?(sy<0?-.01:.01):sy;
   fx.flipX=controls.flipx.checked;
   fx.flipY=controls.flipy.checked;
   fx.depthSplit=Number(controls.split.value);
   fx.revealStartDeg=Number(controls.rstart.value);
   fx.revealSweepDeg=Number(controls.rsweep.value);
   refreshOutputs();
   render(offset);
 }
 Object.values(controls).forEach(el=>{el.oninput=apply;el.onchange=apply;});
 box.querySelector('[data-hc-reset]').onclick=()=>{
   Object.assign(fx,{position:[130,122],rotateZDeg:0,tiltXDeg:0,yawYDeg:0,scaleX:1,scaleY:1,flipX:false,flipY:false,depthSplit:.5,revealStartDeg:0,revealSweepDeg:180});
   controls.full.checked=false;setValues();render(offset);
 };
 box.querySelector('[data-hc-copy]').onclick=async()=>{
   const payload={
     position:fx.position,
     rotateZDeg:fx.rotateZDeg,
     tiltXDeg:fx.tiltXDeg,
     yawYDeg:fx.yawYDeg,
     scaleX:fx.scaleX,
     scaleY:fx.scaleY,
     flipX:fx.flipX,
     flipY:fx.flipY,
     depthSplit:fx.depthSplit,
     revealStartDeg:fx.revealStartDeg,
     revealSweepDeg:fx.revealSweepDeg
   };
   try{await navigator.clipboard.writeText(JSON.stringify(payload,null,2));}catch{}
   box.querySelector('[data-hc-copy]').textContent='Copied';
   setTimeout(()=>box.querySelector('[data-hc-copy]').textContent='Copy values',800);
 };
 window.__horizontalControls={box,controls};
 setValues();
}

try{
 const recipePath=isHorizontal
   ? './assets/vanguard/procedural/horizontal-strike.recipe.json'
   : isAttack2
     ? './assets/vanguard/procedural/attack2-uppercut.recipe.json'
     : isUndercut
       ? './assets/vanguard/procedural/undercut-strike.recipe.json'
       : './assets/vanguard/procedural/overhand-strike.recipe.json';
 recipe=await fetch(recipePath,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('recipe HTTP '+r.status);return r.json()});q('[data-recipe]').textContent=JSON.stringify(recipe,null,2);q('[data-title]').textContent=recipe.id;phases=recipe.phases;total=phases.reduce((n,p)=>n+Number(p.durationMs),0);canvas.width=recipe.canvas.size[0];canvas.height=recipe.canvas.size[1];
 const spec=recipe.atlases['vanguard-canonical'],atlasPath=spec.path.startsWith('./')?spec.path:'./'+spec.path,effectSource=recipe.sources[recipe.effect.source],slashPath=effectSource.path.startsWith('./')?effectSource.path:'./'+effectSource.path;
 [atlas,slash]=await Promise.all([loadImage(atlasPath),loadImage(slashPath)]);buildSlash();for(const [id,s] of Object.entries(recipe.sources))if(s.role==='body')body(id);installHorizontalControls();render(0);requestAnimationFrame(()=>{fit();requestAnimationFrame(loop)});
}catch(err){document.querySelector('#app').innerHTML='<pre style="padding:18px;color:#ff8a8a;white-space:pre-wrap"></pre>';document.querySelector('#app pre').textContent=err?.stack||String(err)}

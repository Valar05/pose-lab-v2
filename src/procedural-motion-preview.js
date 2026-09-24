import { createProceduralReviewShell } from './procedural-review-shell.js';

const params=new URLSearchParams(location.search);
const requested=params.get('procedural');
const animation=requested==='vanguard-undercut-strike'
  ? 'vanguard-undercut-strike'
  : requested==='vanguard-horizontal-strike'
    ? 'vanguard-horizontal-strike'
    : 'vanguard-overhand-strike';
const isUndercut=animation==='vanguard-undercut-strike';
const isHorizontal=animation==='vanguard-horizontal-strike';
const ui=createProceduralReviewShell({
  title:isHorizontal?'Vanguard Horizontal Slash':isUndercut?'Vanguard Undercut Strike':'Vanguard Overhand Strike',
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
 const oc=o.getContext('2d',{willReadFrequently:true});oc.drawImage(crop,0,0,w,h);
 const pix=oc.getImageData(0,0,w,h),pd=pix.data,stops=recipe.effect.gradientStops.slice().sort((a,b)=>a.at-b.at);
 function colorFor(vv){
   const n=vv/255;let a=stops[0],b=stops[stops.length-1];
   for(let i=0;i<stops.length-1;i++){if(n>=stops[i].at&&n<=stops[i+1].at){a=stops[i];b=stops[i+1];break;}}
   const t=(b.at-a.at)?(n-a.at)/(b.at-a.at):0;
   return [0,1,2].map(k=>Math.round(lerp(a.rgb[k],b.rgb[k],t)));
 }
 for(let i=0;i<pd.length;i+=4){
   const vv=Math.max(pd[i],pd[i+1],pd[i+2]),rgb=colorFor(vv);
   pd[i]=rgb[0];pd[i+1]=rgb[1];pd[i+2]=rgb[2];
   pd[i+3]=Math.max(0,Math.min(255,Math.round(vv*recipe.effect.alphaGain)));
 }
 oc.putImageData(pix,0,0);slashMap=o;
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
 const W=image.width,H=image.height;
 const center=spec.planeCenter||[215,158];
 const rz=Number(spec.rotateZDeg??45)*Math.PI/180;
 const rx=Number(spec.rotateXDeg??-60)*Math.PI/180;
 const focal=Number(spec.focalPx??260);
 const scale=Number(spec.planeScale??.62);
 const gx=Number(spec.globalScaleX??2);
 const fx=spec.flipX?-1:1;
 const fy=spec.flipY?-1:1;

 function project(u,v){
   // local plane coords centered on source; y is UP in 3D space.
   let x=((u-.5)*W)*scale*fx;
   let y=((.5-v)*H)*scale*fy;
   let z=0;

   // 1) Rotate the slash plane around Z first.
   const xz=x*Math.cos(rz)-y*Math.sin(rz);
   const yz=x*Math.sin(rz)+y*Math.cos(rz);
   x=xz;
   y=yz;

   // 2) Stretch GLOBAL / post-Z screen-world X, exactly as requested.
   x*=gx;

   // 3) Then pitch around X. Negative angle sends the top edge rearward/down.
   const yx=y*Math.cos(rx)-z*Math.sin(rx);
   const zx=y*Math.sin(rx)+z*Math.cos(rx);
   y=yx;
   z=zx;

   const denom=Math.max(40,focal-z);
   const p=focal/denom;
   return {
     x:center[0]+x*p,
     y:center[1]-y*p,
     z,
     p
   };
 }

 return {image,W,H,project};
}
function drawSlash(e,layerName='front'){
 if(!e||!slashMap)return;
 const spec=recipe.effect||{};
 const reveal=clamp(Number(e.reveal??0));
 if(reveal<=0)return;

 const plane=transformedSlash(slashMap,spec);
 const cols=Math.max(8,Number(spec.tessellation?.[0]??28));
 const rows=Math.max(4,Number(spec.tessellation?.[1]??14));
 const depth0=Number(spec.vanguardDepth??0);

 function makeRevealSource(color){
   const src=document.createElement('canvas');
   src.width=plane.W;src.height=plane.H;
   const sx=src.getContext('2d');
   const rp=spec.revealPivot||[.88,.60];
   const cx=plane.W*rp[0],cy=plane.H*rp[1];
   const radius=Math.hypot(plane.W,plane.H)*2;
   const start=Number(spec.revealStartDeg??16)*Math.PI/180;
   const sweep=Number(spec.revealSweepDeg??190)*Math.PI/180;
   const end=spec.revealCounterClockwise===false
     ? start+sweep*reveal
     : start-sweep*reveal;

   sx.save();
   sx.beginPath();
   sx.moveTo(cx,cy);
   sx.arc(cx,cy,radius,start,end,spec.revealCounterClockwise!==false);
   sx.closePath();
   sx.clip();
   sx.drawImage(plane.image,0,0);
   sx.restore();

   if(color){
     sx.globalCompositeOperation='source-in';
     sx.fillStyle=`rgb(${color[0]},${color[1]},${color[2]})`;
     sx.fillRect(0,0,src.width,src.height);
     sx.globalCompositeOperation='source-over';
   }
   return src;
 }

 function affineFor(s0,s1,s2,d0,d1,d2){
   const x0=s0[0],y0=s0[1],x1=s1[0],y1=s1[1],x2=s2[0],y2=s2[1];
   const X0=d0.x,Y0=d0.y,X1=d1.x,Y1=d1.y,X2=d2.x,Y2=d2.y;
   const det=x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);
   if(Math.abs(det)<1e-6)return null;
   const a=(X0*(y1-y2)+X1*(y2-y0)+X2*(y0-y1))/det;
   const c=(X0*(x2-x1)+X1*(x0-x2)+X2*(x1-x0))/det;
   const e=(X0*(x1*y2-x2*y1)+X1*(x2*y0-x0*y2)+X2*(x0*y1-x1*y0))/det;
   const b=(Y0*(y1-y2)+Y1*(y2-y0)+Y2*(y0-y1))/det;
   const d=(Y0*(x2-x1)+Y1*(x0-x2)+Y2*(x1-x0))/det;
   const f=(Y0*(x1*y2-x2*y1)+Y1*(x2*y0-x0*y2)+Y2*(x0*y1-x1*y0))/det;
   return [a,b,c,d,e,f];
 }

 function renderProjected(source){
   const layer=document.createElement('canvas');
   layer.width=canvas.width;layer.height=canvas.height;
   const lc=layer.getContext('2d');
   lc.imageSmoothingEnabled=true;

   function tri(s0,s1,s2,d0,d1,d2){
     const avgZ=(d0.z+d1.z+d2.z)/3;
     const wantsBack=layerName==='back';
     if(wantsBack ? avgZ>=depth0 : avgZ<depth0)return;
     const m=affineFor(s0,s1,s2,d0,d1,d2);
     if(!m)return;

     lc.save();
     lc.beginPath();
     lc.moveTo(d0.x,d0.y);lc.lineTo(d1.x,d1.y);lc.lineTo(d2.x,d2.y);
     lc.closePath();lc.clip();
     lc.setTransform(m[0],m[1],m[2],m[3],m[4],m[5]);
     lc.drawImage(source,0,0);
     lc.restore();
   }

   for(let j=0;j<rows;j++){
     const v0=j/rows,v1=(j+1)/rows;
     for(let i=0;i<cols;i++){
       const u0=i/cols,u1=(i+1)/cols;
       const s00=[u0*plane.W,v0*plane.H],s10=[u1*plane.W,v0*plane.H];
       const s01=[u0*plane.W,v1*plane.H],s11=[u1*plane.W,v1*plane.H];
       const p00=plane.project(u0,v0),p10=plane.project(u1,v0);
       const p01=plane.project(u0,v1),p11=plane.project(u1,v1);
       tri(s00,s10,s11,p00,p10,p11);
       tri(s00,s11,s01,p00,p11,p01);
     }
   }
   return layer;
 }

 const passes=[
   {alpha:e.wideGlow*spec.wideOpacity,blur:spec.wideBlurPx,color:spec.wideGlowRgb},
   {alpha:e.tightGlow*spec.tightOpacity,blur:spec.tightBlurPx,color:spec.tightGlowRgb},
   {alpha:e.core,blur:0,color:null}
 ];

 for(const q of passes){
   if(q.alpha<=0)continue;
   const source=makeRevealSource(q.color);
   const layer=renderProjected(source);
   ctx.save();
   ctx.translate(stageOffsetX(),0);
   ctx.globalAlpha=q.alpha;
   ctx.filter=q.blur?`blur(${q.blur}px)`:'none';
   ctx.drawImage(layer,0,0);
   ctx.restore();
 }
}
function render(ms){
 const s=phaseAt(ms),p=s.p,i=s.i,u=s.u,d={shearX:iv(i,u,'deform','shearX'),scaleX:iv(i,u,'deform','scaleX'),scaleY:iv(i,u,'deform','scaleY'),shiftX:iv(i,u,'deform','shiftX'),shiftY:iv(i,u,'deform','shiftY')},e=p.effect?{reveal:iv(i,u,'effect','reveal'),core:iv(i,u,'effect','core'),tightGlow:iv(i,u,'effect','tightGlow'),wideGlow:iv(i,u,'effect','wideGlow')}:null;
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

try{
 const recipePath=isHorizontal
   ? './assets/vanguard/procedural/horizontal-strike.recipe.json'
   : isUndercut
     ? './assets/vanguard/procedural/undercut-strike.recipe.json'
     : './assets/vanguard/procedural/overhand-strike.recipe.json';
 recipe=await fetch(recipePath,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('recipe HTTP '+r.status);return r.json()});q('[data-recipe]').textContent=JSON.stringify(recipe,null,2);q('[data-title]').textContent=recipe.id;phases=recipe.phases;total=phases.reduce((n,p)=>n+Number(p.durationMs),0);canvas.width=recipe.canvas.size[0];canvas.height=recipe.canvas.size[1];
 const spec=recipe.atlases['vanguard-canonical'],atlasPath=spec.path.startsWith('./')?spec.path:'./'+spec.path,effectSource=recipe.sources[recipe.effect.source],slashPath=effectSource.path.startsWith('./')?effectSource.path:'./'+effectSource.path;
 [atlas,slash]=await Promise.all([loadImage(atlasPath),loadImage(slashPath)]);buildSlash();for(const [id,s] of Object.entries(recipe.sources))if(s.role==='body')body(id);render(0);requestAnimationFrame(()=>{fit();requestAnimationFrame(loop)});
}catch(err){document.querySelector('#app').innerHTML='<pre style="padding:18px;color:#ff8a8a;white-space:pre-wrap"></pre>';document.querySelector('#app pre').textContent=err?.stack||String(err)}

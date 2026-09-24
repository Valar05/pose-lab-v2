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
 const rot=Number(spec.rotationDeg||0);
 const pitch=Math.max(0.08,Number(spec.pitchScaleY??1));
 const yaw=Number(spec.yawShearX||0);

 const pad=Math.ceil(Math.max(image.width,image.height));
 const scratch=document.createElement('canvas');
 scratch.width=image.width+pad*2;
 scratch.height=image.height+pad*2;
 const x=scratch.getContext('2d',{willReadFrequently:true});

 x.translate(scratch.width/2,scratch.height/2);
 if(rot)x.rotate(rot*Math.PI/180);
 x.transform(1,0,yaw,pitch,0,0);
 x.drawImage(image,-image.width/2,-image.height/2);

 const im=x.getImageData(0,0,scratch.width,scratch.height);
 const d=im.data;
 let minX=scratch.width,minY=scratch.height,maxX=-1,maxY=-1;
 for(let yy=0;yy<scratch.height;yy++){
   for(let xx=0;xx<scratch.width;xx++){
     if(d[(yy*scratch.width+xx)*4+3]>4){
       minX=Math.min(minX,xx);minY=Math.min(minY,yy);
       maxX=Math.max(maxX,xx);maxY=Math.max(maxY,yy);
     }
   }
 }
 if(maxX<minX)return image;

 const out=document.createElement('canvas');
 out.width=maxX-minX+1;
 out.height=maxY-minY+1;
 out.getContext('2d').drawImage(
   scratch,
   minX,minY,out.width,out.height,
   0,0,out.width,out.height
 );
 return out;
}
function drawSlash(e,layerName='front'){
 if(!e)return;

 const spec=recipe.effect;
 const image=transformedSlash(slashMap,spec);
 const x=spec.position[0];
 const y=spec.position[1];

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

 const layer=document.createElement('canvas');
 layer.width=canvas.width;
 layer.height=canvas.height;
 const lc=layer.getContext('2d');

 const reveal=clamp(e.reveal);
 const split=Math.max(.15,Math.min(.85,Number(spec.depthSplit??.55)));
 const splitX=x+image.width*split;

 lc.save();

 // Visual counterclockwise sweep:
 // begin at the bright right/near cap, travel across the upper arc toward left/far.
 if(reveal<0.999){
   const cx=x+image.width/2;
   const cy=y+image.height/2;
   const radius=Math.hypot(image.width,image.height)*1.3;
   const startAngle=0;
   const endAngle=-Math.PI*reveal;

   lc.beginPath();
   lc.moveTo(cx,cy);
   lc.arc(cx,cy,radius,startAngle,endAngle,true);
   lc.closePath();
   lc.clip();
 }

 // Far/left section goes behind Vanguard.
 // Near/right cap goes in front.
 lc.beginPath();
 if(layerName==='back'){
   lc.rect(x,y,image.width*split+2,image.height);
 }else{
   lc.rect(splitX-2,y,image.width*(1-split)+4,image.height);
 }
 lc.clip();

 const passes=[
   {a:e.wideGlow*spec.wideOpacity,b:spec.wideBlurPx,color:spec.wideGlowRgb},
   {a:e.tightGlow*spec.tightOpacity,b:spec.tightBlurPx,color:spec.tightGlowRgb},
   {a:e.core,b:0,color:null}
 ];

 for(const q of passes){
   if(q.a<=0)continue;
   lc.save();
   lc.globalAlpha=q.a;
   lc.filter=q.b?`blur(${q.b}px)`:'none';
   lc.drawImage(passImage(q.color),x,y);
   lc.restore();
 }

 lc.restore();

 ctx.save();
 ctx.translate(stageOffsetX(),0);
 ctx.drawImage(layer,0,0);
 ctx.restore();
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

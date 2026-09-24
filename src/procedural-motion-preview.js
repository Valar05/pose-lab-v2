import { createProceduralReviewShell } from './procedural-review-shell.js';

const ui=createProceduralReviewShell({title:'Vanguard Overhand Strike',animation:'vanguard-overhand-strike',accent:'#ffbd4a'});
const {q,canvas,fit}=ui;
const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;
const play=q('[data-play]'),restart=q('[data-restart]'),scrub=q('[data-scrub]'),phaseEl=q('[data-phase]'),timeEl=q('[data-time]'),kv=q('[data-kv]');
let recipe,atlas,slash,slashMap,playing=true,start=performance.now(),offset=0,total=1,phases=[];
const cache=new Map(),clamp=v=>Math.max(0,Math.min(1,v)),ease=t=>{t=clamp(t);return t*t*(3-2*t)},lerp=(a,b,t)=>a+(b-a)*t;
const loadImage=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('Could not load '+src));i.src=src;});
function rect(spec,cell){const idx=cell-(spec.indexBase||0),c=idx%spec.columns,r=Math.floor(idx/spec.columns);const x0=Math.round(c*atlas.naturalWidth/spec.columns),x1=Math.round((c+1)*atlas.naturalWidth/spec.columns),y0=Math.round(r*atlas.naturalHeight/spec.rows),y1=Math.round((r+1)*atlas.naturalHeight/spec.rows);return[x0,y0,x1-x0,y1-y0]}
function body(sourceId){
 if(cache.has(sourceId))return cache.get(sourceId);const src=recipe.sources[sourceId],spec=recipe.atlases[src.atlas],[sx,sy,sw,sh]=rect(spec,src.cell);
 const raw=document.createElement('canvas');raw.width=sw;raw.height=sh;const rc=raw.getContext('2d',{willReadFrequently:true});rc.drawImage(atlas,sx,sy,sw,sh,0,0,sw,sh);
 const im=rc.getImageData(0,0,sw,sh),d=im.data;let minX=sw,minY=sh,maxX=-1,maxY=-1;
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const i=(y*sw+x)*4,R=d[i],G=d[i+1],B=d[i+2];if(B>110&&B>R+35&&B>G+35)d[i+3]=0;if(d[i+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}
 rc.putImageData(im,0,0);if(maxX<minX)throw new Error('Empty atlas cell '+src.cell);
 const trim=document.createElement('canvas');trim.width=maxX-minX+1;trim.height=maxY-minY+1;trim.getContext('2d').drawImage(raw,minX,minY,trim.width,trim.height,0,0,trim.width,trim.height);
 const item={canvas:trim,anchor:[Math.round(trim.width/2),trim.height-1],cell:src.cell};cache.set(sourceId,item);return item;
}
function clock(v){return(v%12)*30-90}
function phaseAt(ms){let a=0;for(let i=0;i<phases.length;i++){const p=phases[i];if(ms<a+p.durationMs||i===phases.length-1)return{p,i,u:clamp((ms-a)/p.durationMs)};a+=p.durationMs}}
function iv(i,u,key,name){const a=phases[i],b=phases[Math.min(phases.length-1,i+1)],fallback=key==='deform'?({shearX:0,scaleX:1,scaleY:1,shiftX:0,shiftY:0}[name]):0;return lerp(Number(a[key]?.[name]??fallback),Number(b[key]?.[name]??a[key]?.[name]??fallback),ease(u))}
function buildSlash(){
 const c=document.createElement('canvas');c.width=slash.naturalWidth;c.height=slash.naturalHeight;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(slash,0,0);const im=x.getImageData(0,0,c.width,c.height),d=im.data;let minX=c.width,minY=c.height,maxX=-1,maxY=-1;
 for(let y=0;y<c.height;y++)for(let xx=0;xx<c.width;xx++){const i=(y*c.width+xx)*4,v=Math.max(d[i],d[i+1],d[i+2]);if(v>4){minX=Math.min(minX,xx);minY=Math.min(minY,y);maxX=Math.max(maxX,xx);maxY=Math.max(maxY,y)}}
 const crop=document.createElement('canvas');crop.width=maxX-minX+1;crop.height=maxY-minY+1;crop.getContext('2d').drawImage(c,minX,minY,crop.width,crop.height,0,0,crop.width,crop.height);
 const w=recipe.effect.width,h=Math.max(1,Math.round(crop.height*w/crop.width)),o=document.createElement('canvas');o.width=w;o.height=h;o.getContext('2d').drawImage(crop,0,0,w,h);slashMap=o;
}
function drawBody(id,d){const it=body(id),[px,py]=recipe.canvas.anchor;ctx.save();ctx.translate(px,py);ctx.transform(d.scaleX,0,d.shearX,d.scaleY,d.shiftX||0,d.shiftY||0);ctx.drawImage(it.canvas,-it.anchor[0],-it.anchor[1]);ctx.restore()}
function drawSlash(e){
 if(!e)return;const s=recipe.effect,startDeg=clock(s.startClock),endBase=clock(s.endClock);let end=endBase;while(end<=startDeg)end+=360;const cur=(startDeg+(end-startDeg)*clamp(e.reveal))*Math.PI/180,startRad=startDeg*Math.PI/180,r=Math.hypot(canvas.width,canvas.height)*2;
 const layer=document.createElement('canvas');layer.width=canvas.width;layer.height=canvas.height;const lc=layer.getContext('2d');lc.save();lc.beginPath();lc.moveTo(s.pivot[0],s.pivot[1]);lc.arc(s.pivot[0],s.pivot[1],r,startRad,cur,false);lc.closePath();lc.clip();
 const passes=[{a:e.wideGlow*s.wideOpacity,b:s.wideBlurPx},{a:e.tightGlow*s.tightOpacity,b:s.tightBlurPx},{a:e.core,b:0}];
 for(const p of passes){if(p.a<=0)continue;lc.save();lc.globalAlpha=p.a;lc.filter=p.b?`blur(${p.b}px)`:'none';lc.drawImage(slashMap,s.position[0],s.position[1]);lc.restore()}lc.restore();ctx.drawImage(layer,0,0);
}
function render(ms){
 const s=phaseAt(ms),p=s.p,i=s.i,u=s.u,d={shearX:iv(i,u,'deform','shearX'),scaleX:iv(i,u,'deform','scaleX'),scaleY:iv(i,u,'deform','scaleY'),shiftX:iv(i,u,'deform','shiftX'),shiftY:iv(i,u,'deform','shiftY')},e=p.effect?{reveal:iv(i,u,'effect','reveal'),core:iv(i,u,'effect','core'),tightGlow:iv(i,u,'effect','tightGlow'),wideGlow:iv(i,u,'effect','wideGlow')}:null;
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);drawBody(p.source,d);drawSlash(e);phaseEl.textContent=p.id;timeEl.textContent=Math.round(ms)+' / '+total+' ms';scrub.value=String(ms/total);const src=recipe.sources[p.source];kv.innerHTML=`<div>Atlas cell</div><div>${src.cell??''}</div><div>Shear X</div><div>${d.shearX.toFixed(3)}</div><div>Scale X/Y</div><div>${d.scaleX.toFixed(3)} / ${d.scaleY.toFixed(3)}</div><div>Root motion</div><div>OFF</div>`;
}
function loop(now){let ms=offset;if(playing)ms=(offset+(now-start))%total;render(ms);requestAnimationFrame(loop)}
play.onclick=()=>{if(playing){offset=(offset+(performance.now()-start))%total;playing=false;play.textContent='▶'}else{start=performance.now();playing=true;play.textContent='❚❚'}};
restart.onclick=()=>{offset=0;start=performance.now();render(0)};scrub.oninput=()=>{offset=Number(scrub.value)*total;start=performance.now();render(offset)};

try{
 recipe=await fetch('./assets/vanguard/procedural/overhand-strike.recipe.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('recipe HTTP '+r.status);return r.json()});q('[data-recipe]').textContent=JSON.stringify(recipe,null,2);q('[data-title]').textContent=recipe.id;phases=recipe.phases;total=phases.reduce((n,p)=>n+Number(p.durationMs),0);canvas.width=recipe.canvas.size[0];canvas.height=recipe.canvas.size[1];
 const spec=recipe.atlases['vanguard-canonical'],atlasPath=spec.path.startsWith('./')?spec.path:'./'+spec.path,slashPath=recipe.sources['slash-right'].path.startsWith('./')?recipe.sources['slash-right'].path:'./'+recipe.sources['slash-right'].path;
 [atlas,slash]=await Promise.all([loadImage(atlasPath),loadImage(slashPath)]);buildSlash();for(const [id,s] of Object.entries(recipe.sources))if(s.role==='body')body(id);render(0);requestAnimationFrame(()=>{fit();requestAnimationFrame(loop)});
}catch(err){document.querySelector('#app').innerHTML='<pre style="padding:18px;color:#ff8a8a;white-space:pre-wrap"></pre>';document.querySelector('#app pre').textContent=err?.stack||String(err)}

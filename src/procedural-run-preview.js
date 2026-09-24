import { createProceduralReviewShell } from './procedural-review-shell.js';

const params=new URLSearchParams(location.search);
const animation=params.get('procedural')==='vanguard-idle'?'vanguard-idle':'vanguard-run';
const isIdle=animation==='vanguard-idle';
const ui=createProceduralReviewShell({
  title:isIdle?'Vanguard Idle':'Vanguard Run',
  animation,
  accent:isIdle?'#d9b37c':'#59d5e8'
});
const {q,canvas,fit}=ui;
const ctx=canvas.getContext('2d'); ctx.imageSmoothingEnabled=true;
const phaseEl=q('[data-phase]'), kv=q('[data-kv]'), timeEl=q('[data-time]'), scrub=q('[data-scrub]'), playBtn=q('[data-play]');
let recipe,atlas,playing=true,start=performance.now(),offset=0;
const cache=new Map();
const clamp=v=>Math.max(0,Math.min(1,v)), smooth=t=>{t=clamp(t);return t*t*(3-2*t)}, lerp=(a,b,t)=>a+(b-a)*t;
const loadImage=src=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('Could not load '+src));i.src=src;});

function rectFor(cell){
 const a=recipe.atlas,idx=cell-a.indexBase,c=idx%a.columns,r=Math.floor(idx/a.columns);
 const x0=Math.round(c*atlas.naturalWidth/a.columns),x1=Math.round((c+1)*atlas.naturalWidth/a.columns);
 const explicit=a.rowBounds?.[String(r)];
 const y0=explicit?Number(explicit[0]):Math.round(r*atlas.naturalHeight/a.rows);
 const y1=explicit?Number(explicit[1]):Math.round((r+1)*atlas.naturalHeight/a.rows);
 return [x0,y0,x1-x0,y1-y0];
}
function cell(cellNo){
 if(cache.has(cellNo)) return cache.get(cellNo);
 const [sx,sy,sw,sh]=rectFor(cellNo),raw=document.createElement('canvas'); raw.width=sw; raw.height=sh;
 const rc=raw.getContext('2d',{willReadFrequently:true}); rc.drawImage(atlas,sx,sy,sw,sh,0,0,sw,sh);
 const im=rc.getImageData(0,0,sw,sh),d=im.data; let minX=sw,minY=sh,maxX=-1,maxY=-1;
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const i=(y*sw+x)*4,R=d[i],G=d[i+1],B=d[i+2];if(B>110&&B>R+35&&B>G+35){d[i]=0;d[i+1]=0;d[i+2]=0;d[i+3]=0;}else if(B>80&&B>Math.max(R,G)+18){d[i+2]=Math.max(R,G)+18;}if(d[i+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}}
 rc.putImageData(im,0,0); if(maxX<minX)throw new Error('Empty Vanguard atlas cell '+cellNo);
 const trim=document.createElement('canvas'); trim.width=maxX-minX+1; trim.height=maxY-minY+1; trim.getContext('2d').drawImage(raw,minX,minY,trim.width,trim.height,0,0,trim.width,trim.height);
 const item={image:trim,anchor:[Math.round(trim.width/2),trim.height-1]}; cache.set(cellNo,item); return item;
}
function segments(){const total=recipe.poses.reduce((s,p)=>s+p.weight,0);let acc=0;return recipe.poses.map((p,i)=>{const a=acc/total;acc+=p.weight;return{p,i,a,b:acc/total}})}
function stateAt(t){const segs=segments();t=((t%1)+1)%1;const s=segs.find(x=>t>=x.a&&t<x.b)||segs.at(-1);const u=(t-s.a)/(s.b-s.a);return{p:s.p,next:recipe.poses[(s.i+1)%recipe.poses.length],u}}
function interp(a,b,u){const e=smooth(u),A=a.deform,B=b.deform;return{shearX:lerp(A.shearX||0,B.shearX||0,e),scaleX:lerp(A.scaleX??1,B.scaleX??1,e),scaleY:lerp(A.scaleY??1,B.scaleY??1,e),shiftX:lerp(A.shiftX||0,B.shiftX||0,e),shiftY:lerp(A.shiftY||0,B.shiftY||0,e)}}
function piecewiseCompressUpperLegs(image,amount,spec){
 if(!amount||amount<=0)return image;
 const hip=Math.max(0,Math.min(image.height-2,Math.round(image.height*(spec.hipFraction??0.48))));
 const knee=Math.max(hip+1,Math.min(image.height-1,Math.round(image.height*(spec.kneeFraction??0.76))));
 const bandH=knee-hip;
 const compressedH=Math.max(1,Math.round(bandH*(1-amount)));
 const delta=bandH-compressedH;
 const out=document.createElement('canvas');
 out.width=image.width;
 out.height=Math.max(1,image.height-delta);
 const oc=out.getContext('2d');
 // top stays unchanged
 oc.drawImage(image,0,0,image.width,hip,0,0,image.width,hip);
 // hips->knees compress continuously
 oc.drawImage(image,0,hip,image.width,bandH,0,hip,image.width,compressedH);
 // everything below knees translates upward with no gap
 oc.drawImage(image,0,knee,image.width,image.height-knee,0,hip+compressedH,image.width,image.height-knee);
 return out;
}
function draw(p,d,a){
 const base=cell(p.cell),[px,py]=recipe.canvas.anchor;
 const spec=recipe.continuous?.upperLegCompression;
 const image=(isIdle && spec && (d.upperLegCompression||0)>0)
   ? piecewiseCompressUpperLegs(base.image,d.upperLegCompression,spec)
   : base.image;
 const anchor=[Math.round(image.width/2),image.height-1];
 const reg=recipe.registration?.byCell?.[String(p.cell)]||{};
 const regScale=Number(reg.scale??1);
 const regX=Number(reg.offsetX??0),regY=Number(reg.offsetY??0);
 ctx.save();
 ctx.globalAlpha=a;
 ctx.translate(px+regX,py+regY);
 const bodyScale=Number(recipe.bodyScale??1);
 ctx.transform((d.scaleX??1)*bodyScale*regScale,0,d.shearX,(d.scaleY??1)*bodyScale*regScale,d.shiftX||0,d.shiftY||0);
 ctx.drawImage(image,-anchor[0],-anchor[1]);
 ctx.restore();
}
function render(t){
 let p,d,nextCell;
 if(isIdle && recipe.continuous?.mode==='sine'){
   p=recipe.poses[0];
   const phase=(t+(recipe.continuous.phaseOffset||0))*Math.PI*2;
   const legSpec=recipe.continuous.upperLegCompression;
   const legPhase=phase+((legSpec?.phaseOffset||0)*Math.PI*2);
   const legCompression=legSpec
     ? (legSpec.amplitude||0)*((1-Math.cos(legPhase))/2)
     : 0;
   d={
     shearX:(recipe.continuous.shearXAmplitude||0)*Math.sin(phase),
     scaleX:1,
     scaleY:1,
     shiftX:0,
     shiftY:0,
     upperLegCompression:legCompression
   };
   nextCell=p.cell;
 }else{
   const state=stateAt(t);
   p=state.p;
   nextCell=state.next.cell;
   d=interp(state.p,state.next,state.u);
 }
 ctx.setTransform(1,0,0,1,0,0);
 ctx.fillStyle='#000';
 ctx.fillRect(0,0,canvas.width,canvas.height);
 draw(p,d,1);
 phaseEl.textContent=isIdle?'continuous-idle':p.id;
 timeEl.textContent=Math.round(t*recipe.cycleMs)+' / '+recipe.cycleMs+' ms';
 scrub.value=String(t);
 kv.innerHTML=`<div>Atlas cell</div><div>${p.cell}</div><div>Next cell</div><div>${nextCell}</div><div>Shear X</div><div>${d.shearX.toFixed(3)}</div><div>Shift X/Y</div><div>${d.shiftX.toFixed(2)} / ${d.shiftY.toFixed(2)}</div><div>Scale X/Y</div><div>${d.scaleX.toFixed(3)} / ${d.scaleY.toFixed(3)}</div><div>Upper leg</div><div>${((d.upperLegCompression||0)*100).toFixed(1)}%</div><div>Root motion</div><div>OFF</div>`;
}
function loop(now){let t=offset;if(playing)t=(offset+(now-start)/recipe.cycleMs)%1;render(t);requestAnimationFrame(loop)}
playBtn.onclick=()=>{if(playing){offset=(offset+(performance.now()-start)/recipe.cycleMs)%1;playing=false;playBtn.textContent='▶'}else{start=performance.now();playing=true;playBtn.textContent='❚❚'}};
q('[data-restart]').onclick=()=>{offset=0;start=performance.now();render(0)};scrub.oninput=()=>{offset=Number(scrub.value);start=performance.now();render(offset)};

try{
 const recipePath=isIdle?'./assets/vanguard/procedural/idle.recipe.json':'./assets/vanguard/procedural/run.recipe.json';
 recipe=await fetch(recipePath,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('recipe HTTP '+r.status);return r.json()});
 q('[data-recipe]').textContent=JSON.stringify(recipe,null,2);q('[data-title]').textContent=recipe.id;
 const atlasPath=recipe.atlas.file.startsWith('./')?recipe.atlas.file:'./'+recipe.atlas.file;atlas=await loadImage(atlasPath);
 if(atlas.naturalWidth!==recipe.atlas.size[0]||atlas.naturalHeight!==recipe.atlas.size[1])throw new Error(`Wrong Vanguard atlas dimensions: expected ${recipe.atlas.size.join('x')}, got ${atlas.naturalWidth}x${atlas.naturalHeight}`);
 canvas.width=recipe.canvas.size[0];canvas.height=recipe.canvas.size[1];for(const p of recipe.poses)cell(p.cell);render(0);requestAnimationFrame(()=>{fit();requestAnimationFrame(loop)});
}catch(err){document.querySelector('#app').innerHTML='<pre style="padding:18px;color:#ff8a8a;white-space:pre-wrap"></pre>';document.querySelector('#app pre').textContent=err?.stack||String(err)}

const app=document.querySelector('#app');

app.innerHTML=`
<style>
:root{--bg:#070a0d;--panel:#10171d;--line:#29343d;--text:#f1ede6;--muted:#98a7b2;--accent:#59d5e8}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,sans-serif}
.top{display:flex;align-items:center;gap:10px;padding:10px 13px;border-bottom:1px solid var(--line);background:#0d1318}
.top strong{font-size:15px}.pill{font-size:11px;font-weight:900;color:#071014;background:var(--accent);padding:3px 7px;border-radius:999px}.spacer{flex:1}
button{font:inherit;color:var(--text);background:#172129;border:1px solid var(--line);border-radius:7px;padding:8px 11px;font-weight:800}
.layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;min-height:calc(100dvh - 58px)}
.stagewrap{display:grid;grid-template-rows:minmax(0,1fr) auto}
.stage{min-height:58dvh;display:grid;place-items:center;padding:12px;background:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px),#050709;background-size:32px 32px}
canvas{width:min(92vw,860px);height:auto;background:#000;border:1px solid #202b33;image-rendering:pixelated}
.transport{display:grid;grid-template-columns:auto auto 1fr auto;gap:9px;align-items:center;padding:10px 12px;border-top:1px solid var(--line);background:#0d1318}
input[type=range]{width:100%}
.side{background:var(--panel);border-left:1px solid var(--line);padding:14px;overflow:auto}.phase{font-size:23px;font-weight:900;color:var(--accent);margin:5px 0 12px}
.meta{font-size:12px;color:var(--muted);line-height:1.55}.kv{display:grid;grid-template-columns:110px 1fr;gap:6px 9px;font-size:12px;margin:14px 0}.kv div:nth-child(odd){color:var(--muted)}
pre{font-size:10px;white-space:pre-wrap;max-height:29dvh;overflow:auto;background:#081015;border:1px solid var(--line);padding:8px;border-radius:7px}
@media(max-width:820px){.layout{display:block}.side{border-left:0;border-top:1px solid var(--line)}.stage{min-height:45dvh;padding:6px}.transport{grid-template-columns:auto auto 1fr}.transport .time{grid-column:1/-1}}
</style>
<header class="top"><strong>Pose Lab V2 · Vanguard Run</strong><span class="pill">LIVE PROCEDURAL</span><span class="spacer"></span><button data-profiles>Profiles</button></header>
<div class="layout">
<section class="stagewrap">
<div class="stage"><canvas data-canvas width="430" height="260"></canvas></div>
<div class="transport"><button data-play>❚❚</button><button data-restart>↺</button><input data-scrub type="range" min="0" max="1" step=".001" value="0"><span class="time" data-time></span></div>
</section>
<aside class="side">
<div class="meta">Motion authority</div><div style="font-weight:850">911832.mp4 procedural run</div>
<div class="phase" data-phase></div>
<div class="kv" data-kv></div>
<div class="meta">World travel is intentionally absent. The game controller owns translation. Pose Lab is showing the sprite-local run machinery only.</div>
<pre data-recipe></pre>
</aside>
</div>`;

const canvas=app.querySelector('[data-canvas]');
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=true;
const phaseEl=app.querySelector('[data-phase]');
const kv=app.querySelector('[data-kv]');
const timeEl=app.querySelector('[data-time]');
const scrub=app.querySelector('[data-scrub]');
const playBtn=app.querySelector('[data-play]');
app.querySelector('[data-profiles]').onclick=()=>location.href='./motion.html';

let recipe,atlas;
let playing=true,start=performance.now(),offset=0;
const cellCache=new Map();

function loadImage(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('Could not load '+src));i.src=src;});}
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;

function rectFor(cell){
 const a=recipe.atlas,idx=cell-a.indexBase,c=idx%a.columns,r=Math.floor(idx/a.columns);
 const x0=Math.round(c*atlas.naturalWidth/a.columns),x1=Math.round((c+1)*atlas.naturalWidth/a.columns);
 const y0=Math.round(r*atlas.naturalHeight/a.rows),y1=Math.round((r+1)*atlas.naturalHeight/a.rows);
 return [x0,y0,x1-x0,y1-y0];
}

function cell(cellNo){
 if(cellCache.has(cellNo)) return cellCache.get(cellNo);
 const [sx,sy,sw,sh]=rectFor(cellNo);
 const raw=document.createElement('canvas');raw.width=sw;raw.height=sh;
 const rc=raw.getContext('2d',{willReadFrequently:true});
 rc.drawImage(atlas,sx,sy,sw,sh,0,0,sw,sh);
 const im=rc.getImageData(0,0,sw,sh),d=im.data;
 let minX=sw,minY=sh,maxX=-1,maxY=-1;
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const i=(y*sw+x)*4,R=d[i],G=d[i+1],B=d[i+2];if(B>110&&B>R+35&&B>G+35)d[i+3]=0;if(d[i+3]>8){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}}
 rc.putImageData(im,0,0);
 if(maxX<minX)throw new Error('Empty run atlas cell '+cellNo);
 const trim=document.createElement('canvas');trim.width=maxX-minX+1;trim.height=maxY-minY+1;trim.getContext('2d').drawImage(raw,minX,minY,trim.width,trim.height,0,0,trim.width,trim.height);
 const td=trim.getContext('2d').getImageData(0,0,trim.width,trim.height).data;
 const band=Math.min(18,trim.height),y0=trim.height-band;let spans=[],s=null;
 for(let x=0;x<trim.width;x++){let hit=false;for(let y=y0;y<trim.height;y++)if(td[(y*trim.width+x)*4+3]>8){hit=true;break;}if(hit&&s===null)s=x;if(!hit&&s!==null){spans.push([s,x-1]);s=null;}}
 if(s!==null)spans.push([s,trim.width-1]);
 const span=spans[0]||[0,trim.width-1];let sum=0,n=0;
 for(let x=span[0];x<=span[1];x++)for(let y=y0;y<trim.height;y++)if(td[(y*trim.width+x)*4+3]>8){sum+=x;n++;}
 const item={image:trim,anchor:[n?Math.round(sum/n):span[0],trim.height-1]};
 cellCache.set(cellNo,item);return item;
}

function weightedSegments(){
 const total=recipe.poses.reduce((s,p)=>s+p.weight,0);let acc=0;
 return recipe.poses.map((p,i)=>{const a=acc/total;acc+=p.weight;return {p,i,a,b:acc/total};});
}
function stateAt(t){
 const segs=weightedSegments();t=((t%1)+1)%1;
 let s=segs.find(x=>t>=x.a&&t<x.b)||segs[segs.length-1];
 const u=(t-s.a)/(s.b-s.a),next=recipe.poses[(s.i+1)%recipe.poses.length];
 return {p:s.p,next,u,i:s.i};
}
function interpDef(a,b,u){
 const e=smooth(u),A=a.deform,B=b.deform;
 const pulse=Math.sin(u*Math.PI);
 return {
  shearX:lerp(A.shearX,B.shearX,e)-recipe.secondary.forwardSkewPulse*pulse,
  scaleX:lerp(A.scaleX,B.scaleX,e),
  scaleY:lerp(A.scaleY,B.scaleY,e)+recipe.secondary.breathScaleY*Math.sin(u*Math.PI*2),
  shiftY:lerp(A.shiftY||0,B.shiftY||0,e)+recipe.secondary.bobPx*Math.sin(u*Math.PI*2)
 };
}
function drawPose(p,def,alpha){
 const item=cell(p.cell),[px,py]=recipe.canvas.anchor;
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(px,py);ctx.transform(def.scaleX,0,def.shearX,def.scaleY,0,def.shiftY);ctx.drawImage(item.image,-item.anchor[0],-item.anchor[1]);ctx.restore();
}
function render(t){
 const s=stateAt(t),def=interpDef(s.p,s.next,s.u);
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#000';ctx.fillRect(0,0,canvas.width,canvas.height);
 const blend=recipe.blendWindow,edgeStart=1-blend;
 if(s.u>edgeStart){
  const x=smooth((s.u-edgeStart)/blend);
  drawPose(s.p,def,1-x);drawPose(s.next,def,x);
 }else drawPose(s.p,def,1);
 phaseEl.textContent=s.p.id;
 timeEl.textContent=Math.round(t*recipe.cycleMs)+' / '+recipe.cycleMs+' ms';
 scrub.value=String(t);
 kv.innerHTML=`<div>Atlas cell</div><div>${s.p.cell}</div><div>Next cell</div><div>${s.next.cell}</div><div>Phase</div><div>${s.u.toFixed(2)}</div><div>Shear X</div><div>${def.shearX.toFixed(3)}</div><div>Scale X/Y</div><div>${def.scaleX.toFixed(3)} / ${def.scaleY.toFixed(3)}</div><div>Root motion</div><div>OFF</div>`;
}
function loop(now){let t=offset;if(playing)t=(offset+(now-start)/recipe.cycleMs)%1;render(t);requestAnimationFrame(loop);}
playBtn.onclick=()=>{if(playing){offset=(offset+(performance.now()-start)/recipe.cycleMs)%1;playing=false;playBtn.textContent='▶';}else{start=performance.now();playing=true;playBtn.textContent='❚❚';}};
app.querySelector('[data-restart]').onclick=()=>{offset=0;start=performance.now();render(0);};
scrub.oninput=()=>{offset=Number(scrub.value);start=performance.now();render(offset);};

try{
 recipe=await fetch('./assets/vanguard/procedural/run.recipe.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('recipe HTTP '+r.status);return r.json();});
 app.querySelector('[data-recipe]').textContent=JSON.stringify(recipe,null,2);
 atlas=await loadImage('./assets/vanguard/procedural/vanguard-pose-atlas-48.png');
 if(atlas.naturalWidth!==recipe.atlas.size[0]||atlas.naturalHeight!==recipe.atlas.size[1])throw new Error('Wrong Vanguard atlas dimensions');
 canvas.width=recipe.canvas.size[0];canvas.height=recipe.canvas.size[1];
 for(const p of recipe.poses)cell(p.cell);
 render(0);requestAnimationFrame(loop);
}catch(err){app.innerHTML='<pre style="padding:18px;color:#ff8a8a;white-space:pre-wrap"></pre>';app.querySelector('pre').textContent=err?.stack||String(err);}

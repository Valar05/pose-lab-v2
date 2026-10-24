// Panzer Pose Lab: three independently selected original authored sheets.
// Snap-only diagnostic; no generated bridge frames, shears, or image regeneration.
const params=new URLSearchParams(location.search);
const app=document.querySelector('#app');
app.innerHTML=`<style>
*{box-sizing:border-box}body{margin:0;background:#0b1015;color:#ece7d9;font:14px system-ui}
header{padding:12px 16px;background:#161e25;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
button{background:#26313a;color:white;border:1px solid #60707a;border-radius:6px;padding:9px 12px}
main{max-width:1100px;margin:auto}canvas{display:block;width:100%;background:radial-gradient(#30404b,#12181f);touch-action:manipulation}
.controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px}
input{width:min(440px,85vw)}small{color:#a9bdc8}
</style><main><header><strong>Pose Lab V2 · Panzer Three-Layer Turntable</strong><small>Hull clockwise · Turret counterclockwise · Gun follows turret</small></header>
<canvas width="960" height="600"></canvas><div class="controls">
<button id="pause">Pause</button><button id="step">Step one snap</button>
<label>Frame <input id="scrub" type="range" min="0" max="7" step="1" value="0"></label>
<span id="readout"></span></div>
<div class="controls"><small>Authoritative sheets: hulls, turrets, barrels. Eight 45° authored poses, no interpolation. Candidate only; visual approval pending.</small></div></main>`;
const canvas=app.querySelector('canvas'),ctx=canvas.getContext('2d');
const rect=(c,r,w,h)=>[c*w/2,r*h/4,w/2,h/4];
const srcRoot='./assets/panzer-pose-experiment/';
const paths=['hulls.png','turrets.png','barrels.png'];
const images=await Promise.all(paths.map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Missing '+name));im.src=srcRoot+name+'?rev='+encodeURIComponent(params.get('rev')||'panzer-v1')})));
const [hulls,turrets,barrels]=images;
let frame=0,playing=true,last=performance.now();
function drawCell(im,index,centerX,centerY,scale){
 const [sx,sy,sw,sh]=rect(index%2,Math.floor(index/2),im.width,im.height);
 const dw=sw*scale,dh=sh*scale;
 ctx.drawImage(im,sx,sy,sw,sh,centerX-dw/2,centerY-dh/2,dw,dh);
}
function draw(){
 ctx.clearRect(0,0,960,600);
 const hull=frame, turret=(8-frame)%8;
 // Compositional registration: first test uses independent three-sheet anchors.
 // Per-direction true turret-ring calibration follows visual review, not guessed animation compensation.
 drawCell(hulls,hull,480,370,0.75);
 drawCell(turrets,turret,480,278,0.64);
 // Barrel is an external weapon layer. Rear-facing gun overlaps behind turret.
 if(turret>=3&&turret<=5){ctx.globalAlpha=0.75;drawCell(barrels,turret,480,263,0.38);ctx.globalAlpha=1;}
 else drawCell(barrels,turret,480+(turret===1?76:turret===2?145:turret===6?-145:turret===7?-76:0),turret===0?293:278,0.38);
 app.querySelector('#readout').textContent=`Hull: ${hull*45}° clockwise · Turret: ${turret*45}° counterclockwise · Step ${frame+1}/8`;
 app.querySelector('#scrub').value=String(frame);
}
function tick(t){if(playing&&t-last>=700){frame=(frame+1)%8;last=t;draw()}requestAnimationFrame(tick)}
app.querySelector('#pause').onclick=()=>{playing=!playing;app.querySelector('#pause').textContent=playing?'Pause':'Play'};
app.querySelector('#step').onclick=()=>{playing=false;app.querySelector('#pause').textContent='Play';frame=(frame+1)%8;draw()};
app.querySelector('#scrub').oninput=e=>{playing=false;app.querySelector('#pause').textContent='Play';frame=Number(e.target.value);draw()};
draw();requestAnimationFrame(tick);

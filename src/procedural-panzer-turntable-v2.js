const app = document.querySelector('#app');
app.replaceChildren();

const params = new URLSearchParams(location.search);
const revision = params.get('rev') || 'dev';
const showAnchorsInitial = params.get('anchors') === '1';
const base = './assets/panzer-pose-experiment/recompose-v1/';

const style = document.createElement('style');
style.textContent = `
  *{box-sizing:border-box}
  body{margin:0;background:#111a22;color:#e6edf0;font-family:system-ui,sans-serif}
  main{max-width:1200px;margin:auto;padding:16px}
  h1{font-size:1.35rem;margin:0 0 8px}
  p{line-height:1.45;color:#bfd0d9}
  .row{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:10px 0}
  button{padding:10px 12px;border-radius:8px;border:1px solid #77838d;background:#2b3740;color:#fff}
  button[aria-pressed=true]{background:#d9a961;color:#111}
  .panel{background:#1b242b;border:1px solid #33414c;border-radius:12px;padding:12px}
  canvas{display:block;width:100%;height:auto;border-radius:12px;border:1px solid #4b5b67;background:#222}
  .status{font-family:ui-monospace,monospace;white-space:pre-wrap}
  .mini{display:grid;grid-template-columns:repeat(4,minmax(80px,1fr));gap:8px;margin-top:8px}
  .chip{padding:6px 8px;border-radius:8px;background:#222d35;border:1px solid #3f4f5a;font-size:.9rem}
  a{color:#e8bb78}
`;
document.head.append(style);

const main = document.createElement('main');
app.append(main);
main.innerHTML = `
  <h1>Panzer Turntable V2 Â· measured three-piece composition</h1>
  <p>Hull uses the approved post-processed working sprite. Turret and barrel are composed independently using manually measured directional anchors. This preview intentionally snaps the eight authored directions before any deformation or elevation experiments.</p>
  <div class="row">
    <button id="playBtn" aria-pressed="true">Pause</button>
    <button id="stepBtn">Step</button>
    <button id="anchorBtn" aria-pressed="${showAnchorsInitial ? 'true' : 'false'}">Toggle anchors</button>
    <div class="chip" id="frameLabel">Loadingâ€¦</div>
  </div>
  <div class="panel"><canvas id="view" width="561" height="350"></canvas></div>
  <div class="panel status" id="status"></div>
`;

const canvas = document.getElementById('view');
const ctx = canvas.getContext('2d');
const frameLabel = document.getElementById('frameLabel');
const status = document.getElementById('status');
const playBtn = document.getElementById('playBtn');
const stepBtn = document.getElementById('stepBtn');
const anchorBtn = document.getElementById('anchorBtn');

function asset(path){ return `${base}${path}?rev=${encodeURIComponent(revision)}`; }
function loadImage(url){ return new Promise((resolve,reject)=>{ const img = new Image(); img.onload=()=>resolve(img); img.onerror=()=>reject(new Error(`image load failed: ${url}`)); img.src=url; }); }
async function loadJSON(url){ const res = await fetch(url); if(!res.ok) throw new Error(`${url} -> ${res.status}`); return await res.json(); }

function sliceSheet(img, cols=2, rows=4){
  const out=[]; const cw=Math.floor(img.width/cols); const ch=Math.floor(img.height/rows);
  for(let i=0;i<cols*rows;i++){
    const sx=(i%cols)*cw, sy=Math.floor(i/cols)*ch;
    const c=document.createElement('canvas'); c.width=cw; c.height=ch;
    c.getContext('2d').drawImage(img,sx,sy,cw,ch,0,0,cw,ch);
    out.push({canvas:c,width:cw,height:ch});
  }
  return out;
}

function cropAlpha(frame){
  const {canvas,width,height}=frame; const data=canvas.getContext('2d').getImageData(0,0,width,height).data;
  let minX=width,minY=height,maxX=-1,maxY=-1;
  for(let y=0;y<height;y++) for(let x=0;x<width;x++){
    const a=data[(y*width+x)*4+3];
    if(a){ if(x<minX)minX=x; if(y<minY)minY=y; if(x>maxX)maxX=x; if(y>maxY)maxY=y; }
  }
  if(maxX<0){ return {canvas, width, height, bbox:[0,0,width,height]}; }
  const w=maxX-minX+1, h=maxY-minY+1;
  const out=document.createElement('canvas'); out.width=w; out.height=h;
  out.getContext('2d').drawImage(canvas,minX,minY,w,h,0,0,w,h);
  return {canvas:out,width:w,height:h,bbox:[minX,minY,maxX+1,maxY+1]};
}

function scaleFrame(frame, scale){
  const w=Math.max(1,Math.round(frame.width*scale));
  const h=Math.max(1,Math.round(frame.height*scale));
  const out=document.createElement('canvas'); out.width=w; out.height=h;
  const g=out.getContext('2d'); g.imageSmoothingEnabled=true; g.drawImage(frame.canvas,0,0,w,h);
  return {...frame, canvas:out, width:w, height:h, scale};
}

function dot(x,y,color,label){
  ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#fff'; ctx.font='12px ui-monospace,monospace'; ctx.fillText(label,x+8,y-8);
}

const DIRECTIONS = ['front','front-right','right','rear-right','rear','rear-left','left','front-left'];

(async function boot(){
  try{
    const reg = await loadJSON(asset('panzer-registration-v1.json'));
    const hullSheet = await loadImage(asset(reg.sourceFiles.hull));
    const turretSheet = await loadImage(asset(reg.sourceFiles.turret));
    const barrelSheet = await loadImage(asset(reg.sourceFiles.barrel));

    const hullFrames = sliceSheet(hullSheet,2,4);
    const turretFrames = sliceSheet(turretSheet,2,4).map(cropAlpha).map(f=>scaleFrame(f, reg.turretScale));
    const barrelFrames = sliceSheet(barrelSheet,2,4).map(cropAlpha).map(f=>scaleFrame(f, reg.turretScale));

    const turretBase = reg.turretBaseAnchorsFullCell.map((pt,i)=>{
      const bbox = cropAlpha(sliceSheet(turretSheet,2,4)[i]).bbox;
      return [Math.round((pt[0]-bbox[0])*reg.turretScale), Math.round((pt[1]-bbox[1])*reg.turretScale)];
    });
    const turretGun = reg.turretGunAnchorsFullCell.map((pt,i)=>{
      const bbox = cropAlpha(sliceSheet(turretSheet,2,4)[i]).bbox;
      return [Math.round((pt[0]-bbox[0])*reg.turretScale), Math.round((pt[1]-bbox[1])*reg.turretScale)];
    });
    const barrelRoot = reg.barrelRootAnchorsFullCell.map((pt,i)=>{
      const bbox = cropAlpha(sliceSheet(barrelSheet,2,4)[i]).bbox;
      return [Math.round((pt[0]-bbox[0])*reg.turretScale), Math.round((pt[1]-bbox[1])*reg.turretScale)];
    });
    const barrelBehind = new Set(reg.barrelDrawBehindTurret);

    let step = 0;
    let running = true;
    let showAnchors = showAnchorsInitial;
    let lastTick = performance.now();

    playBtn.onclick = ()=>{ running=!running; playBtn.textContent = running ? 'Pause' : 'Play'; playBtn.setAttribute('aria-pressed', String(running)); };
    stepBtn.onclick = ()=>{ step=(step+1)%8; draw(); };
    anchorBtn.onclick = ()=>{ showAnchors=!showAnchors; anchorBtn.setAttribute('aria-pressed', String(showAnchors)); draw(); };

    function draw(){
      const hullIndex = step % 8;
      const turretIndex = (8 - (step % 8)) % 8;
      const barrelIndex = turretIndex;

      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#25282d';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(hullFrames[hullIndex].canvas,0,0);

      const hr = reg.hullRingCenters[hullIndex];
      const tb = turretBase[turretIndex];
      const tg = turretGun[turretIndex];
      const br = barrelRoot[barrelIndex];
      const turret = turretFrames[turretIndex];
      const barrel = barrelFrames[barrelIndex];
      const tx = hr[0]-tb[0], ty = hr[1]-tb[1];
      const gx = tx+tg[0], gy = ty+tg[1];
      const bx = gx-br[0], by = gy-br[1];

      if(barrelBehind.has(barrelIndex)) ctx.drawImage(barrel.canvas,bx,by);
      ctx.drawImage(turret.canvas,tx,ty);
      if(!barrelBehind.has(barrelIndex)) ctx.drawImage(barrel.canvas,bx,by);

      if(showAnchors){
        dot(hr[0], hr[1], '#00e1ff', 'hull ring');
        dot(tx+tb[0], ty+tb[1], '#5dff78', 'turret base');
        dot(gx, gy, '#ffca28', 'gun');
        dot(bx+br[0], by+br[1], '#ff5d7a', 'barrel root');
      }

      frameLabel.textContent = `step ${step} Â· hull ${hullIndex} ${DIRECTIONS[hullIndex]} Â· turret ${turretIndex} ${DIRECTIONS[turretIndex]}`;
      status.textContent = [
        `revision: ${revision}`,
        `route: ${reg.route}`,
        `turret scale: ${reg.turretScale}`,
        `hull ring center: ${JSON.stringify(hr)}`,
        `turret base anchor: ${JSON.stringify(tb)}`,
        `turret gun anchor: ${JSON.stringify(tg)}`,
        `barrel root anchor: ${JSON.stringify(br)}`,
        `barrel behind turret: ${barrelBehind.has(barrelIndex)}`,
        `source hashes: ${JSON.stringify(reg.sourceSha256, null, 2)}`
      ].join('\n');
    }

    function tick(now){
      if(running && now-lastTick >= reg.timing.stepMs){
        step=(step+1)%8; lastTick=now; draw();
      }
      requestAnimationFrame(tick);
    }

    draw();
    requestAnimationFrame(tick);
  }catch(err){
    console.error(err);
    status.textContent = String(err && err.stack || err);
  }
})();

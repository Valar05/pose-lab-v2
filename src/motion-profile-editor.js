import { CONNIE_ATLAS, CONNIE_RECTS, CONNIE_CONTENT_BOUNDS } from './motion/connie-profiles.js';
import { MOTION_PROFILES, getMotionProfile } from './motion/profiles.js';
import { copyProfile, instantiateProfile, resolveProfileTiming } from './motion/profile-core.js';
import { serializeMotionInstance, candidateRepoPath } from './motion/plmp-serializer.js';

const app = document.querySelector('#app');
const profileOptions = Object.values(MOTION_PROFILES)
  .map((p) => `<option value="${p.id}@${p.version}">${p.label} @${p.version}</option>`)
  .join('');

app.innerHTML = `
<style>
  :root {
    --bg:#0a0d10; --panel:#11161b; --panel2:#161d23; --line:#2a343d;
    --text:#f4efe6; --muted:#9eabb6; --accent:#e3a84b; --blue:#4ea1ff;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,sans-serif}
  button,select,input{font:inherit}
  button,select,input[type=text],input[type=number]{
    min-height:38px;border:1px solid var(--line);border-radius:7px;
    background:#0d1216;color:var(--text);padding:6px 9px
  }
  button{font-weight:700;background:#182028}
  button:hover{background:#222c35}
  .topbar{height:58px;padding:9px 12px;border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:center}
  .brand{font-weight:850;margin-right:6px;white-space:nowrap}
  .spacer{flex:1}
  .workspace{display:grid;grid-template-columns:220px minmax(0,1fr) 260px;min-height:calc(100dvh - 58px - 220px)}
  .side{background:var(--panel);padding:12px;border-right:1px solid var(--line);overflow:auto}
  .side.right{border-right:0;border-left:1px solid var(--line)}
  .section-title{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);font-weight:800;margin:4px 0 10px}
  .stage-wrap{display:grid;grid-template-rows:1fr auto;min-width:0;background:#07090b}
  .stage{position:relative;min-height:360px;display:grid;place-items:center;overflow:hidden;
    background:
      linear-gradient(#ffffff07 1px,transparent 1px),
      linear-gradient(90deg,#ffffff07 1px,transparent 1px),
      #0b0f12;
    background-size:32px 32px}
  .stage::after{content:"";position:absolute;left:10%;right:10%;bottom:18%;border-top:1px solid #ffffff1c}
  .stage-card{position:relative;z-index:1;width:min(72vw,62vh,520px,420px);aspect-ratio:1/1;height:auto;display:grid;place-items:center}
  .stage-card canvas{display:block;width:100%;height:auto;aspect-ratio:1/1;object-fit:contain;max-width:100%;max-height:none}
  .stage-placeholder{color:#73808a;text-align:center;line-height:1.5;border:1px dashed #33404a;border-radius:10px;padding:28px;max-width:360px}
  .stage img{max-width:100%;max-height:100%;image-rendering:auto;object-fit:contain}
  .transport{height:54px;border-top:1px solid var(--line);display:flex;gap:8px;align-items:center;justify-content:center;background:#0e1317}
  .transport button{min-width:44px}
  .frame-list{display:grid;gap:8px}
  .library-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
  .library-tools{display:grid;gap:8px;margin-bottom:10px}
  .library-tools input,.library-tools select{width:100%}
  .import-button{display:flex;align-items:center;justify-content:center;min-height:40px;border:1px solid var(--line);border-radius:7px;background:#182028;color:var(--text);font-weight:800;cursor:pointer}
  .library-meta{font-size:11px;color:var(--muted);margin:8px 0 10px}
  .thumb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .thumb{border:1px solid var(--line);border-radius:8px;background:#0b1014;padding:6px;display:grid;gap:5px;cursor:pointer;text-align:left}
  .thumb:hover,.thumb.active{border-color:var(--accent)}
  .thumb-canvas{width:100%;aspect-ratio:1/1;background:
    linear-gradient(45deg,#20272d 25%,transparent 25%),linear-gradient(-45deg,#20272d 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,#20272d 75%),linear-gradient(-45deg,transparent 75%,#20272d 75%),#151a1e;
    background-position:0 0,0 8px,8px -8px,-8px 0;background-size:16px 16px;border-radius:5px;image-rendering:pixelated}
  .thumb strong{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .thumb small{color:var(--muted);font-size:10px}
  .mobile-only{display:none}
  .frame-card{border:1px solid var(--line);border-radius:8px;padding:8px;background:#0c1115}
  .frame-card.active{border-color:var(--accent);box-shadow:0 0 0 1px #e3a84b55 inset}
  .frame-label{display:flex;justify-content:space-between;gap:8px;font-weight:750;margin-bottom:6px}
  .frame-card input{width:100%;font-size:12px}
  .inspector-grid{display:grid;gap:9px}
  .inspector-grid label{display:grid;gap:4px;color:var(--muted);font-size:12px}
  .inspector-grid input{color:var(--text)}
  details{border:1px solid var(--line);border-radius:8px;background:#0c1115;padding:8px}
  details summary{cursor:pointer;font-weight:750}
  pre{white-space:pre-wrap;font-size:11px;color:#b8c3cc;max-height:220px;overflow:auto}
  .timeline{height:220px;border-top:1px solid var(--line);background:#0d1216;display:grid;grid-template-rows:42px 1fr}
  .timeline-head{display:flex;align-items:center;gap:10px;padding:6px 12px;border-bottom:1px solid var(--line)}
  .timeline-head .duration{margin-left:auto;color:var(--muted);font-size:12px}
  .track{position:relative;margin:22px 24px 30px;height:86px;border-radius:8px;background:#121920;border:1px solid var(--line)}
  .track-line{position:absolute;left:16px;right:16px;top:42px;height:2px;background:#394550}
  .key{position:absolute;top:21px;transform:translateX(-50%);display:grid;justify-items:center;gap:5px;cursor:pointer;touch-action:none}
  .diamond{width:18px;height:18px;background:var(--blue);transform:rotate(45deg);border:2px solid #cfe7ff;border-radius:2px}
  .key.active .diamond{background:var(--accent);border-color:#ffe0a1}
  .key-label{font-size:11px;color:#c8d2d9;white-space:nowrap}
  .playhead{position:absolute;top:6px;bottom:6px;width:2px;background:#ff6b6b;pointer-events:none}
  .scrub{position:absolute;left:16px;right:16px;bottom:8px;width:calc(100% - 32px)}
  .status{font-size:12px;color:var(--muted);padding:0 10px}
  @media (max-width:900px){
    .workspace{grid-template-columns:1fr;display:block}
    .side{border:0;border-bottom:1px solid var(--line)}
    .side.right{border:0;border-top:1px solid var(--line)}
    .mobile-only{display:inline-flex}
    .frame-library{display:none;position:fixed;z-index:50;left:0;right:0;top:0;bottom:0;background:var(--panel);padding:14px;overflow:auto}
    .frame-library.open{display:block}
    .thumb-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
    .stage{min-height:43dvh}
    .side.right{max-height:none}
    .timeline{height:205px}
    .topbar{height:auto;min-height:58px;flex-wrap:wrap}
  }
</style>

<section>
  <header class="topbar">
    <span class="brand">Motion Profile Lab</span>
    <button data-library-open class="mobile-only">Frames</button>
    <select data-profile aria-label="Motion profile">${profileOptions}</select>
    <button data-copy>Copy Profile</button>
    <span class="spacer"></span>
    <button data-preview>Preview</button>
    <button data-save>Save Candidate</button>
  </header>

  <main class="workspace">
    <aside class="side frame-library" data-library-panel>
      <div class="library-head">
        <div>
          <div class="section-title">Frame Library</div>
          <strong data-assign-target>Assign to: ready</strong>
        </div>
        <button data-library-close class="mobile-only" aria-label="Close frame library">×</button>
      </div>
      <div class="library-tools">
        <input data-library-search type="search" placeholder="Search frames, sheets, tags">
        <select data-library-sheet aria-label="Filter by source sheet">
          <option value="">All sheets</option>
        </select>
        <select data-import-grid aria-label="Sprite sheet grid">
          <option value="auto">Auto grid</option>
          <option value="4x3">4 × 3</option>
          <option value="4x4">4 × 4</option>
        </select>
        <label class="import-button">＋ Add Sheet<input data-import-sheet type="file" accept="image/png,image/jpeg,image/webp" hidden></label>
      </div>
      <div class="library-meta" data-library-meta>No sheets loaded yet.</div>
      <div class="thumb-grid" data-library-grid></div>
    </aside>

    <section class="stage-wrap">
      <div class="stage">
        <div class="stage-card" data-stage></div>
      </div>
      <div class="transport">
        <button data-prev title="Previous key">◀|</button>
        <button data-play title="Play / Pause">▶</button>
        <button data-next title="Next key">|▶</button>
        <button data-loop title="Loop">↻ Loop</button>
        <span class="status" data-status></span>
      </div>
    </section>

    <aside class="side right">
      <div class="section-title">Animation</div>
      <div class="inspector-grid">
        <label>Name<input data-id type="text" value="vanguard-jab"></label>
        <label>Character<input data-character type="text" value="vanguard"></label>
        <label>Length <input data-duration type="number" min="1" value="320"></label>
      </div>

      <div class="section-title" style="margin-top:18px">Selected Key</div>
      <div data-key-inspector class="inspector-grid"></div>

      <div class="section-title" style="margin-top:18px">Motion</div>
      <div data-motion-summary style="font-size:12px;color:var(--muted);line-height:1.55"></div>

      <details style="margin-top:14px">
        <summary>Advanced / Recipe</summary>
        <pre data-stack></pre>
      </details>
    </aside>
  </main>

  <section class="timeline">
    <div class="timeline-head">
      <strong data-pin></strong>
      <span class="duration" data-duration-label></span>
    </div>
    <div class="track" data-track>
      <div class="track-line"></div>
      <div class="playhead" data-playhead></div>
      <input class="scrub" data-scrub type="range" min="0" max="1" step=".001" value="0">
    </div>
  </section>
</section>`;

const connieRequested=new URLSearchParams(location.search).get('character')==='connie';
let active = connieRequested ? getMotionProfile('connie-idle',1) : getMotionProfile('jab', 1);
let working = active;
const connieAtlas=new Image();
const connieMasked=document.createElement('canvas');
let connieReady=false;
connieAtlas.onload=()=>{
 connieMasked.width=connieAtlas.naturalWidth;connieMasked.height=connieAtlas.naturalHeight;
 const c=connieMasked.getContext('2d',{willReadFrequently:true});
 c.drawImage(connieAtlas,0,0);
 const data=c.getImageData(0,0,connieMasked.width,connieMasked.height);
 const d=data.data,w=connieMasked.width,h=connieMasked.height;
 // Flood only black pixels connected to the image border, preserving dark interior details.
 const visited=new Uint8Array(w*h),queue=new Int32Array(w*h);
 let head=0,tail=0;
 const offer=(i)=>{if(visited[i])return;visited[i]=1;const k=i*4;if(d[k]<20&&d[k+1]<20&&d[k+2]<20)queue[tail++]=i;};
 for(let x=0;x<w;x++){offer(x);offer((h-1)*w+x);}
 for(let y=0;y<h;y++){offer(y*w);offer(y*w+w-1);}
 while(head<tail){const i=queue[head++],k=i*4;d[k+3]=0;
 const x=i%w;if(x>0)offer(i-1);if(x<w-1)offer(i+1);
 if(i>=w)offer(i-w);if(i<(h-1)*w)offer(i+w);
 }
 c.putImageData(data,0,0);connieReady=true;renderStage();
};
connieAtlas.src=CONNIE_ATLAS;
let selectedKeyId = working.keys[0]?.id;
let playhead = 0;
let playing = false;
let loop = true;
let raf = null;
let playStartedAt = 0;
let playStartedAtNormalized = 0;
const frameValues = {};
const frameMeta = {};
let libraryItems = [];
let recentItemIds = [];
let activeAssignRole = working.frameRoles[0]?.id || 'ready';

const q = (s) => app.querySelector(s);
const qa = (s) => [...app.querySelectorAll(s)];
const profileSelect = q('[data-profile]');
const libraryPanel = q('[data-library-panel]');
const libraryGrid = q('[data-library-grid]');
const librarySearch = q('[data-library-search]');
const librarySheet = q('[data-library-sheet]');
const libraryMeta = q('[data-library-meta]');
const assignTarget = q('[data-assign-target]');
const importSheet = q('[data-import-sheet]');
const importGrid = q('[data-import-grid]');
const track = q('[data-track]');
const stage = q('[data-stage]');
const inspector = q('[data-key-inspector]');
const stack = q('[data-stack]');
const status = q('[data-status]');
const pin = q('[data-pin]');
const durationLabel = q('[data-duration-label]');
const playheadEl = q('[data-playhead]');
const scrub = q('[data-scrub]');

function durationMs(){ return Math.max(1, Number(q('[data-duration]').value) || 320); }

function keyState(){
  return working.keys.map((key) => {
    const el = q(`[data-key-id="${key.id}"]`);
    return {...key, at: el ? Number(el.dataset.at) : key.at};
  });
}

function currentFrameRole(){
  const keys = keyState().slice().sort((a,b)=>a.at-b.at);
  let winner = keys[0];
  for (const k of keys) if (k.at <= playhead) winner = k;
  const direct = working.frameRoles.find((r)=>r.id===winner?.id);
  if (direct) return direct.id;
  const transition = working.transitions.find((t)=>t.id===winner?.id);
  return transition?.to || working.frameRoles[0]?.id;
}

function renderStage(){
  const role = currentFrameRole();
  const src = frameValues[role]?.trim();
  stage.innerHTML = '';
  if(working.family==='connie-atlas'){
    const isDash=working.id==='connie-transform'||working.id==='connie-dash-spin';
    const isReturn=working.id==='connie-untransform';
    const sequence=working.id==='connie-run'
      ? ['run_1','run_2','run_3','run_2']
      : isDash ? ['spin_1','spin_2','spin_3','spin_3','spin_3','spin_2','spin_1']
      : isReturn ? ['spin_3','spin_2','spin_1'] : null;
    const sequenceIndex=sequence?Math.min(sequence.length-1,Math.floor(playhead*sequence.length)):0;
    // Stationary crouched aerial pose at BOTH endpoints of the complete dash.
    const id=isDash
      ? (playhead<.13||playhead>=.87?'spin_1':playhead<.29?'spin_2':playhead<.71?'spin_3':'spin_2')
      : sequence?sequence[sequenceIndex]:(CONNIE_RECTS[role] ? role : working.frameRoles[0]?.id);
    const rect=CONNIE_RECTS[id];
    if(rect){
      const c=document.createElement('canvas');c.width=600;c.height=600;c.style.width='100%';c.style.height='auto';c.style.aspectRatio='1 / 1';
      const cx=c.getContext('2d');
      if(connieReady){
        const [x0,y0,x1,y1]=rect,w=x1-x0,h=y1-y0;
        const time=playhead*2*Math.PI;
        const spinning=working.id==='connie-transform'||working.id==='connie-dash-spin'||working.id==='connie-untransform';
        // The upright aerial sprite remains unrotated. The intermediate
        // character accelerates gently; the pinwheel has the highest speed.
        // On return the angular velocity decelerates by the same envelope.
        const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
        const spinStart=.13,spinEnd=.87;
        const u=Math.max(0,Math.min(1,(playhead-spinStart)/(spinEnd-spinStart)));
        const speed=v=>v<.216?(.08+.92*ease(v/.216))
          :v<.784?1:(.08+.92*ease((1-v)/.216));
        const integrate=end=>{let total=0;const n=120,step=end/n;
          for(let i=0;i<n;i++)total+=speed((i+.5)*step)*step;
          return total;};
        // First and final aerial sprite each rotate just 30 degrees.
        // Keep the intermediate and pinwheel spin curve untouched.
        const edgeTurn=Math.PI/6;
        const angle=isDash&&id==='spin_1'
          ? (playhead<spinStart
              ? -edgeTurn*(1-ease(playhead/spinStart))
              : 4*Math.PI+edgeTurn*ease((playhead-spinEnd)/(1-spinEnd)))
          : isDash?4*Math.PI*integrate(u)/integrate(1)
          :working.id==='connie-untransform'?2*Math.PI*playhead:0;
        // Scale ONLY the first aerial character pose. The intermediate
        // transformation sprite and pinwheel always retain native dimensions.
        let humanScale=1;
        if(isDash&&id==='spin_1'){
          if(playhead<.13)humanScale=1-.22*ease((playhead-.045)/.085);
          else if(playhead>=.87)humanScale=.78+.22*ease((playhead-.87)/.085);
        }
        cx.save();
        const runBounce=0;
        const rebound=working.id==='connie-aerial'?playhead:0;
        cx.translate(300,spinning?300:550+runBounce);
        if(working.id==='connie-aerial'){
          const kickCompress=rebound<.34?Math.sin(Math.PI*rebound/.34):0;
          const launchStretch=rebound>=.34&&rebound<.72?Math.sin(Math.PI*(rebound-.34)/.38):0;
          // Compression follows the diagonal kick, then releases into flight.
          cx.transform(1-.075*kickCompress+.035*launchStretch,
            -.06*kickCompress, -.06*kickCompress,
            1-.075*kickCompress+.045*launchStretch,
            0,0);
        }
        cx.rotate(angle);
        if(isDash&&id==='spin_1')cx.scale(humanScale,humanScale);
        // Anchor visible artwork, not arbitrary atlas crop margins.
        // The source and destination widths/heights remain exactly identical.
        const visible=CONNIE_CONTENT_BOUNDS[id];
        const destX=-(visible[0]+visible[2])/2;
        const destY=spinning?-(visible[1]+visible[3])/2:-visible[3];
        if(working.id==='connie-idle'){
          // Pixel-space joint displacement. Every output pixel copies one
          // original atlas pixel: no canvas scaling, slice gaps or scanlines.
          const source=cx.createImageData(w,h);
          const srcCtx=connieMasked.getContext('2d');
          const original=srcCtx.getImageData(x0,y0,w,h);
          const src=original.data,dst=source.data;
          const crouch=(1-Math.cos(time))*.5;
          const blinkPhase=(playhead*1.0)%1;
          const blink=Math.pow(Math.max(0,1-Math.abs(blinkPhase-.52)/.095),1.5);
          const eyeX=183,eyeY=103,eyeRX=8,eyeRY=5;
          const knee=h*.70,ankle=h*.87;
          for(let y=0;y<h;y++){
            const v=y/h;
            // Upper body translates down; displacement smoothly fades at
            // the ankle while feet stay fixed to their atlas positions.
            const vertical=v<.66 ? 3*crouch
              : v<.87 ? 3*crouch*(.87-v)/.21 : 0;
            const bend=v>.55&&v<.87
              ? Math.sin(Math.PI*(v-.55)/.32)*2*crouch : 0;
            const sy=Math.max(0,Math.min(h-1,Math.round(y-vertical)));
            for(let x=0;x<w;x++){
              const sx=Math.max(0,Math.min(w-1,Math.round(x-bend)));
              let eyeSampleY=sy;
              const ex=(x-eyeX)/eyeRX,ey=(sy-eyeY)/eyeRY;
              if(blink>0&&ex*ex+ey*ey<1){
                const falloff=(1-ex*ex)*(1-ey*ey);
                eyeSampleY=Math.max(0,Math.min(h-1,Math.round(eyeY+(sy-eyeY)/(Math.max(.12,1-blink*.88*falloff)))));
              }
              const si=(eyeSampleY*w+sx)*4,di=(y*w+x)*4;
              dst[di]=src[si];dst[di+1]=src[si+1];
              dst[di+2]=src[si+2];dst[di+3]=src[si+3];
            }
          }
          const deformed=document.createElement('canvas');
          deformed.width=w;deformed.height=h;
          deformed.getContext('2d').putImageData(source,0,0);
          cx.drawImage(deformed,destX,destY);
        }else if(working.id==='connie-run'){
          // Port Vanguard's recipe-based signed shear, not pixel-space liquid
          // displacement. No vertical bob, no root translation, no leg resampling.
          const shearKeys=[.0375,-.0475,.0375,-.0475,.0375];
          const u=Math.max(0,Math.min(4,playhead*4));
          const k=Math.min(3,Math.floor(u));
          const f=Math.max(0,Math.min(1,u-k));
          const eased=f*f*(3-2*f);
          const shear=shearKeys[k]+(shearKeys[k+1]-shearKeys[k])*eased;
          cx.transform(1,0,shear,1,0,0);
          // Last segment transitions back to run_1 without holding it.
          // The first frame is seen once per loop, never duplicated.
          const returnPhase=Math.max(0,Math.min(1,(playhead-.75)/.25));
          const fade=returnPhase*returnPhase*(3-2*returnPhase);
          cx.globalAlpha=1-fade;
          cx.drawImage(connieMasked,x0,y0,w,h,destX,destY,w,h);
          if(fade>0){
            const first=CONNIE_RECTS.run_1;
            const firstVisible=CONNIE_CONTENT_BOUNDS.run_1;
            const fw=first[2]-first[0],fh=first[3]-first[1];
            cx.globalAlpha=fade;
            cx.drawImage(connieMasked,first[0],first[1],fw,fh,
              -(firstVisible[0]+firstVisible[2])/2,-firstVisible[3],fw,fh);
          }
          cx.globalAlpha=1;
        }else{
          // Authoritative poses are copied unscaled and unwarped.
          // Avoid fractional scanline re-sampling and accidental silhouette squash.
          cx.drawImage(connieMasked,x0,y0,w,h,destX,destY,w,h);
        }
        cx.restore();
      }
      stage.append(c);
      qa('.frame-card').forEach(el=>el.classList.toggle('active',el.dataset.role===role));
      return;
    }
  }
  if (src && /^(https?:|data:|blob:|\/|\.\/|\.\.\/)/.test(src)) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = role || 'pose frame';
    img.onerror = () => {
      stage.innerHTML = `<div class="stage-placeholder"><strong>${role || 'Pose'}</strong><br>Could not load this source.<br><small>${src}</small></div>`;
    };
    stage.append(img);
  } else {
    stage.innerHTML = `<div class="stage-placeholder"><strong>${role || 'Pose'}</strong><br>Open Frames and choose a thumbnail.<br><small>Imported sheets are batch-normalized to canonical 96px cells.</small></div>`;
  }
  qa('.frame-card').forEach((el)=>el.classList.toggle('active', el.dataset.role===role));
}

function updatePlayhead(){
  playhead = Math.min(1, Math.max(0, playhead));
  playheadEl.style.left = `calc(16px + (100% - 32px) * ${playhead})`;
  scrub.value = String(playhead);
  renderStage();
}

function inferGrid(fileName, image){
  const name=(fileName||'').toLowerCase();
  if(importGrid.value !== 'auto'){
    const [cols,rows]=importGrid.value.split('x').map(Number);
    return {cols,rows};
  }
  if(name.includes('913745')) return {cols:4,rows:3};
  if(name.includes('913748')) return {cols:4,rows:4};
  const ratio=image.naturalWidth/image.naturalHeight;
  return ratio > 1.2 ? {cols:4,rows:3} : {cols:4,rows:4};
}

function inferSheetTags(sheetId){
  if(sheetId.includes('913745')) return ['vanguard','body','unarmed','combat'];
  if(sheetId.includes('913748')) return ['vanguard','bayonet','claw','thrust','weapon'];
  return ['vanguard','imported'];
}

function normalizeCell(sourceCanvas){
  const ctx=sourceCanvas.getContext('2d',{willReadFrequently:true});
  const image=ctx.getImageData(0,0,sourceCanvas.width,sourceCanvas.height);
  const d=image.data;
  let minX=sourceCanvas.width,minY=sourceCanvas.height,maxX=-1,maxY=-1;
  for(let y=0;y<sourceCanvas.height;y++){
    for(let x=0;x<sourceCanvas.width;x++){
      const i=(y*sourceCanvas.width+x)*4;
      const m=Math.max(d[i],d[i+1],d[i+2]);
      let a=0;
      if(m>5) a=Math.max(0,Math.min(255,Math.round((m-5)/(28-5)*255)));
      d[i+3]=a;
      if(a>8){ if(x<minX)minX=x;if(y<minY)minY=y;if(x>maxX)maxX=x;if(y>maxY)maxY=y; }
    }
  }
  ctx.putImageData(image,0,0);
  if(maxX<minX || maxY<minY) return document.createElement('canvas');
  const bw=maxX-minX+1,bh=maxY-minY+1;
  const canonical=document.createElement('canvas');
  canonical.width=96; canonical.height=96;
  const c=canonical.getContext('2d');
  c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
  const sharedScale=.22;
  let dw=Math.max(1,Math.round(bw*sharedScale));
  let dh=Math.max(1,Math.round(bh*sharedScale));
  const fit=Math.min(1,88/dw,88/dh);
  dw=Math.max(1,Math.round(dw*fit)); dh=Math.max(1,Math.round(dh*fit));
  const dx=Math.round((96-dw)/2);
  const dy=Math.max(0,90-dh);
  c.drawImage(sourceCanvas,minX,minY,bw,bh,dx,dy,dw,dh);
  return canonical;
}

async function importSpriteSheet(file){
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();
    image.src=url;
    await image.decode();
    const {cols,rows}=inferGrid(file.name,image);
    const sheetId=(file.name.replace(/\.[^.]+$/,'') || `sheet-${Date.now()}`);
    const tags=inferSheetTags(sheetId);
    const full=document.createElement('canvas');
    full.width=image.naturalWidth; full.height=image.naturalHeight;
    full.getContext('2d').drawImage(image,0,0);
    const cellW=image.naturalWidth/cols, cellH=image.naturalHeight/rows;
    const added=[];
    for(let row=0;row<rows;row++){
      for(let col=0;col<cols;col++){
        const cell=document.createElement('canvas');
        cell.width=Math.round(cellW); cell.height=Math.round(cellH);
        cell.getContext('2d').drawImage(full,
          Math.round(col*cellW),Math.round(row*cellH),Math.round(cellW),Math.round(cellH),
          0,0,cell.width,cell.height);
        const normalized=normalizeCell(cell);
        const id=`${sheetId}:r${row+1}c${col+1}`;
        added.push({
          id,sheet:sheetId,row:row+1,col:col+1,index:row*cols+col,
          tags:[...tags,'normalized-96'],
          dataUrl:normalized.toDataURL('image/png'),
          canonicalPx:96
        });
      }
    }
    libraryItems=[...libraryItems.filter(x=>x.sheet!==sheetId),...added];
    refreshSheetFilter();
    renderLibrary();
    status.textContent=`Imported ${added.length} canonical 96px frames from ${sheetId}`;
  } finally { URL.revokeObjectURL(url); }
}

function refreshSheetFilter(){
  const current=librarySheet.value;
  const sheets=[...new Set(libraryItems.map(x=>x.sheet))].sort();
  librarySheet.innerHTML='<option value="">All sheets</option>'+sheets.map(id=>`<option value="${id}">${id}</option>`).join('');
  if(sheets.includes(current)) librarySheet.value=current;
}

function resolveAssignRole(){
  const direct=working.frameRoles.find(r=>r.id===selectedKeyId);
  if(direct) return direct.id;
  const transition=working.transitions.find(t=>t.id===selectedKeyId);
  return transition?.to || activeAssignRole || working.frameRoles[0]?.id;
}

function assignLibraryItem(item){
  activeAssignRole=resolveAssignRole();
  frameValues[activeAssignRole]=item.dataUrl;
  frameMeta[activeAssignRole]={id:item.id,sheet:item.sheet,row:item.row,col:item.col,tags:item.tags};
  recentItemIds=[item.id,...recentItemIds.filter(id=>id!==item.id)].slice(0,12);
  assignTarget.textContent=`Assign to: ${activeAssignRole} · ${item.id}`;
  status.textContent=`${item.id} → ${activeAssignRole}`;
  renderLibrary();
  renderStage();
  updateRecipe();
  if(matchMedia('(max-width:900px)').matches) libraryPanel.classList.remove('open');
}

function renderLibrary(){
  activeAssignRole=resolveAssignRole();
  assignTarget.textContent=`Assign to: ${activeAssignRole}`;
  const query=librarySearch.value.trim().toLowerCase();
  const sheet=librarySheet.value;
  const filtered=libraryItems.filter(item=>{
    if(sheet && item.sheet!==sheet) return false;
    if(!query) return true;
    return [item.id,item.sheet,...item.tags].join(' ').toLowerCase().includes(query);
  });
  libraryMeta.textContent=libraryItems.length
    ? `${filtered.length} shown · ${libraryItems.length} canonical 96px frames · click to assign`
    : 'Add a source sheet. The whole sheet is batch-normalized to 96px cells.';
  libraryGrid.innerHTML='';
  for(const item of filtered){
    const button=document.createElement('button');
    button.type='button'; button.className='thumb';
    if(frameMeta[activeAssignRole]?.id===item.id) button.classList.add('active');
    const img=document.createElement('img');
    img.className='thumb-canvas'; img.src=item.dataUrl; img.alt=item.id;
    const strong=document.createElement('strong'); strong.textContent=item.id;
    const small=document.createElement('small'); small.textContent=item.tags.filter(t=>t!=='normalized-96').slice(0,3).join(' · ');
    button.append(img,strong,small);
    button.addEventListener('click',()=>assignLibraryItem(item));
    libraryGrid.append(button);
  }
}

function renderFrames(){
  renderLibrary();
}

function renderTimeline(){
  qa('.key').forEach((e)=>e.remove());
  const keys = keyState();
  for (const key of keys){
    const el=document.createElement('div');
    el.className='key' + (key.id===selectedKeyId?' active':'');
    el.dataset.keyId=key.id;
    el.dataset.at=String(key.at);
    el.style.left=`calc(16px + (100% - 32px) * ${key.at})`;
    el.innerHTML=`<div class="diamond"></div><div class="key-label">${key.id}</div>`;
    el.addEventListener('click',()=>{
      selectedKeyId=key.id; playhead=Number(el.dataset.at); activeAssignRole=resolveAssignRole(); renderTimeline(); renderInspector(); renderLibrary(); updatePlayhead();
    });
    track.append(el);
  }
  renderInspector();
  durationLabel.textContent = `${durationMs()} ms · ${keys.length} keys`;
}

function renderInspector(){
  const key = keyState().find((k)=>k.id===selectedKeyId) || keyState()[0];
  if(!key){ inspector.innerHTML='<span>No key selected</span>'; return; }
  selectedKeyId=key.id;
  inspector.innerHTML=`
    <label>Key <input value="${key.id}" disabled></label>
    <label>Time
      <input data-selected-time type="range" min="0" max="1" step=".01" value="${key.at}">
      <span data-selected-time-label style="color:var(--text)">${Math.round(key.at*durationMs())} ms · ${key.at.toFixed(2)}</span>
    </label>`;
  const slider=q('[data-selected-time]');
  slider.addEventListener('input',()=>{
    const el=q(`[data-key-id="${selectedKeyId}"]`);
    const at=Number(slider.value);
    el.dataset.at=String(at);
    el.style.left=`calc(16px + (100% - 32px) * ${at})`;
    q('[data-selected-time-label]').textContent=`${Math.round(at*durationMs())} ms · ${at.toFixed(2)}`;
    playhead=at; updatePlayhead(); updateRecipe();
  });
}

function buildInstance(){
  const frameMap={};
  for(const role of working.frameRoles){
    if(frameMeta[role.id]) frameMap[role.id]=frameMeta[role.id].id;
    else if(frameValues[role.id]) frameMap[role.id]=frameValues[role.id];
  }
  const timingOverrides={};
  keyState().forEach((k)=>timingOverrides[k.id]=k.at);
  if(working.family==='connie-atlas')for(const role of working.frameRoles)frameMap[role.id]=CONNIE_ATLAS+'#'+role.id;
  return instantiateProfile(working,{
    id:q('[data-id]').value.trim() || 'motion',
    character:q('[data-character]').value.trim() || 'unknown',
    durationMs:durationMs(),
    frames:frameMap,
    timingOverrides
  });
}

function updateRecipe(){
  const inst=buildInstance();
  let resolved={};
  try{ resolved=resolveProfileTiming(working,inst.durationMs,inst.timingOverrides); }catch{}
  q('[data-motion-summary]').innerHTML = `
    <div><strong>Family:</strong> ${working.family || 'motion'}</div>
    <div><strong>Transitions:</strong> ${working.transitions.length}</div>
    <div><strong>Modifiers:</strong> ${[...new Set(working.transitions.flatMap(t=>t.modifiers||[]))].join(', ') || 'none'}</div>
    <div><strong>Constraints:</strong> ${[...new Set(working.transitions.flatMap(t=>t.constraints||[]))].join(', ') || 'none'}</div>`;
  stack.textContent=JSON.stringify({resolved,transitions:working.transitions},null,2);
  durationLabel.textContent=`${inst.durationMs} ms · ${working.keys.length} keys`;
}

function render(){
  pin.textContent=`${working.label} @${working.version}`;
  selectedKeyId=working.keys[0]?.id;
  playhead=0;
  renderFrames();
  refreshSheetFilter();
  renderTimeline();
  updateRecipe();
  updatePlayhead();
  status.textContent='Ready';
}

function togglePlay(){
  if(playing){
    playing=false; cancelAnimationFrame(raf); q('[data-play]').textContent='▶'; return;
  }
  playing=true; q('[data-play]').textContent='❚❚';
  playStartedAt=performance.now();
  playStartedAtNormalized=playhead;
  const tick=(now)=>{
    if(!playing) return;
    const delta=(now-playStartedAt)/durationMs();
    playhead=playStartedAtNormalized+delta;
    if(playhead>=1){
      if(loop){ playhead%=1; playStartedAt=now; playStartedAtNormalized=playhead; }
      else { playhead=1; playing=false; q('[data-play]').textContent='▶'; updatePlayhead(); return; }
    }
    updatePlayhead();
    raf=requestAnimationFrame(tick);
  };
  raf=requestAnimationFrame(tick);
}

function stepKey(dir){
  const keys=keyState().slice().sort((a,b)=>a.at-b.at);
  let idx=keys.findIndex(k=>k.id===selectedKeyId);
  if(idx<0) idx=0;
  idx=Math.max(0,Math.min(keys.length-1,idx+dir));
  selectedKeyId=keys[idx].id; playhead=keys[idx].at;
  renderTimeline(); updatePlayhead();
}

if(connieRequested){profileSelect.value='connie-idle@1';q('[data-character]').value='connie';q('[data-id]').value='connie-idle';q('[data-duration]').value='1900';}
profileSelect.addEventListener('change',()=>{
  const [id,version]=profileSelect.value.split('@');
  active=getMotionProfile(id,Number(version)); working=active; if(working.family==='connie-atlas'){q('[data-character]').value='connie';q('[data-id]').value=id;q('[data-duration]').value=id==='connie-idle'?1900:id==='connie-run'?720:id==='connie-aerial'?780:950;for(const role of working.frameRoles)frameValues[role.id]=CONNIE_ATLAS+'#'+role.id;} render();
});
q('[data-copy]').addEventListener('click',()=>{
  working=copyProfile(working,{id:`${working.id}-copy`,label:`${working.label} Copy`});
  render(); status.textContent='Working copy created';
});
q('[data-play]').addEventListener('click',togglePlay);
q('[data-prev]').addEventListener('click',()=>stepKey(-1));
q('[data-next]').addEventListener('click',()=>stepKey(1));
q('[data-loop]').addEventListener('click',()=>{
  loop=!loop; q('[data-loop]').textContent=loop?'↻ Loop':'→ Once';
});
scrub.addEventListener('input',()=>{
  playhead=Number(scrub.value); updatePlayhead();
});
q('[data-duration]').addEventListener('input',()=>{renderInspector();updateRecipe();});
q('[data-preview]').addEventListener('click',()=>{
  try{
    const packet=serializeMotionInstance(working,buildInstance());
    stack.textContent=JSON.stringify(packet,null,2);
    q('details').open=true;
    status.textContent='Recipe previewed';
  }catch(err){status.textContent=err.message;}
});
q('[data-library-open]').addEventListener('click',()=>libraryPanel.classList.add('open'));
q('[data-library-close]').addEventListener('click',()=>libraryPanel.classList.remove('open'));
librarySearch.addEventListener('input',renderLibrary);
librarySheet.addEventListener('change',renderLibrary);
importSheet.addEventListener('change',async()=>{
  const file=importSheet.files?.[0];
  if(!file) return;
  status.textContent='Importing and downrezzing whole sheet…';
  try{ await importSpriteSheet(file); }
  catch(err){ status.textContent=`Import failed: ${err.message}`; }
  finally{ importSheet.value=''; }
});

q('[data-save]').addEventListener('click',()=>{
  try{
    const inst=buildInstance();
    const packet=serializeMotionInstance(working,inst);
    const path=candidateRepoPath(inst);
    stack.textContent=JSON.stringify({path,packet},null,2);
    q('details').open=true;
    status.textContent=`Prepared: ${path}`;
  }catch(err){status.textContent=err.message;}
});

render();
document.title='Motion Profile Lab · Pose Lab V2';

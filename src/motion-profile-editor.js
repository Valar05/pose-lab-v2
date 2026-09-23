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
  .stage-card{position:relative;z-index:1;width:min(72vw,520px);height:min(62vh,420px);display:grid;place-items:center}
  .stage-placeholder{color:#73808a;text-align:center;line-height:1.5;border:1px dashed #33404a;border-radius:10px;padding:28px;max-width:360px}
  .stage img{max-width:100%;max-height:100%;image-rendering:auto;object-fit:contain}
  .transport{height:54px;border-top:1px solid var(--line);display:flex;gap:8px;align-items:center;justify-content:center;background:#0e1317}
  .transport button{min-width:44px}
  .frame-list{display:grid;gap:8px}
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
    .workspace .side:first-child{display:none}
    .stage{min-height:43dvh}
    .side.right{max-height:none}
    .timeline{height:205px}
    .topbar{height:auto;min-height:58px;flex-wrap:wrap}
  }
</style>

<section>
  <header class="topbar">
    <span class="brand">Motion Profile Lab</span>
    <select data-profile aria-label="Motion profile">${profileOptions}</select>
    <button data-copy>Copy Profile</button>
    <span class="spacer"></span>
    <button data-preview>Preview</button>
    <button data-save>Save Candidate</button>
  </header>

  <main class="workspace">
    <aside class="side">
      <div class="section-title">Pose Frames</div>
      <div class="frame-list" data-frames></div>
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

let active = getMotionProfile('jab', 1);
let working = active;
let selectedKeyId = working.keys[0]?.id;
let playhead = 0;
let playing = false;
let loop = true;
let raf = null;
let playStartedAt = 0;
let playStartedAtNormalized = 0;
const frameValues = {};

const q = (s) => app.querySelector(s);
const qa = (s) => [...app.querySelectorAll(s)];
const profileSelect = q('[data-profile]');
const framesEl = q('[data-frames]');
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
  if (src && /^(https?:|data:|blob:|\/|\.\/|\.\.\/)/.test(src)) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = role || 'pose frame';
    img.onerror = () => {
      stage.innerHTML = `<div class="stage-placeholder"><strong>${role || 'Pose'}</strong><br>Could not load this source.<br><small>${src}</small></div>`;
    };
    stage.append(img);
  } else {
    stage.innerHTML = `<div class="stage-placeholder"><strong>${role || 'Pose'}</strong><br>Assign a pose frame on the left.<br><small>The stage will preview the selected/current key here.</small></div>`;
  }
  qa('.frame-card').forEach((el)=>el.classList.toggle('active', el.dataset.role===role));
}

function updatePlayhead(){
  playhead = Math.min(1, Math.max(0, playhead));
  playheadEl.style.left = `calc(16px + (100% - 32px) * ${playhead})`;
  scrub.value = String(playhead);
  renderStage();
}

function renderFrames(){
  framesEl.innerHTML = working.frameRoles.map((role)=>`
    <div class="frame-card" data-role="${role.id}">
      <div class="frame-label">
        <span>${role.label}</span>
        <span style="color:var(--muted);font-size:11px">${role.required===false?'optional':'required'}</span>
      </div>
      <input data-frame-role="${role.id}" value="${frameValues[role.id] || ''}" placeholder="paste image URL / asset path">
    </div>`).join('');
  qa('[data-frame-role]').forEach((input)=>{
    input.addEventListener('input',()=>{
      frameValues[input.dataset.frameRole] = input.value;
      renderStage();
    });
    input.closest('.frame-card').addEventListener('click',(e)=>{
      if(e.target.tagName !== 'INPUT'){
        const key = working.keys.find((k)=>k.id===input.dataset.frameRole);
        if(key){ selectedKeyId=key.id; playhead=key.at; renderTimeline(); updatePlayhead(); }
      }
    });
  });
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
      selectedKeyId=key.id; playhead=Number(el.dataset.at); renderTimeline(); renderInspector(); updatePlayhead();
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
  const frameMap={...frameValues};
  const timingOverrides={};
  keyState().forEach((k)=>timingOverrides[k.id]=k.at);
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

profileSelect.addEventListener('change',()=>{
  const [id,version]=profileSelect.value.split('@');
  active=getMotionProfile(id,Number(version)); working=active; render();
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

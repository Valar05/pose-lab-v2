import { MOTION_PROFILES, getMotionProfile } from './motion/profiles.js';
import { copyProfile, instantiateProfile, resolveProfileTiming } from './motion/profile-core.js';
import { serializeMotionInstance, candidateRepoPath } from './motion/plmp-serializer.js';

const app=document.querySelector('#app');
const profileOptions=Object.values(MOTION_PROFILES).map((p)=>`<option value="${p.id}@${p.version}">${p.label} @${p.version}</option>`).join('');

app.innerHTML=`
<section style="min-height:100dvh;background:#090c0f;color:#f7f2e8;font-family:system-ui,sans-serif;display:grid;grid-template-rows:auto 1fr auto">
  <header style="padding:12px 16px;border-bottom:1px solid #ffffff22;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <strong>Motion Profile Lab</strong>
    <select data-profile style="min-height:40px;background:#182026;color:#f7f2e8;border:1px solid #ffffff30;border-radius:7px;padding:6px 10px">${profileOptions}</select>
    <button data-copy>Copy Profile</button>
    <span data-pin style="color:#aeb8c1;font-size:12px"></span>
  </header>

  <main style="display:grid;grid-template-columns:minmax(0,1fr);gap:12px;padding:12px">
    <section style="border:1px solid #ffffff22;border-radius:10px;padding:12px;background:#11161a">
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end">
        <label>Animation ID<br><input data-id value="vanguard-jab" /></label>
        <label>Character<br><input data-character value="vanguard" /></label>
        <label>Duration ms<br><input data-duration type="number" min="1" value="320" /></label>
      </div>
      <div data-frames style="display:grid;gap:8px;margin-top:12px"></div>
    </section>

    <section style="border:1px solid #ffffff22;border-radius:10px;padding:12px;background:#11161a">
      <strong>Normalized timing</strong>
      <div data-keys style="display:grid;gap:8px;margin-top:10px"></div>
      <div data-resolved style="margin-top:10px;color:#aeb8c1;font:12px ui-monospace,monospace"></div>
    </section>

    <section style="border:1px solid #ffffff22;border-radius:10px;padding:12px;background:#11161a">
      <strong>Stack</strong>
      <pre data-stack style="white-space:pre-wrap;font-size:12px;color:#cfd8df"></pre>
    </section>
  </main>

  <footer style="padding:12px 16px;border-top:1px solid #ffffff22;display:flex;gap:8px;flex-wrap:wrap">
    <button data-preview>Preview Recipe</button>
    <button data-save style="background:#4c2d1f;border-color:#f0c35a">Prepare Save Candidate</button>
    <button data-blank title="Blank profiles are intentionally secondary">New Blank Profile</button>
    <span data-status style="margin-left:auto;color:#aeb8c1;font-size:12px"></span>
  </footer>
</section>`;

for (const button of app.querySelectorAll('button')) Object.assign(button.style,{minHeight:'40px',padding:'7px 11px',border:'1px solid #ffffff30',borderRadius:'7px',background:button.style.background||'#182026',color:'#f7f2e8',fontWeight:'750'});
for (const input of app.querySelectorAll('input')) Object.assign(input.style,{minHeight:'36px',background:'#0d1215',color:'#f7f2e8',border:'1px solid #ffffff30',borderRadius:'6px',padding:'4px 7px'});

let active=getMotionProfile('jab',1);
let working=active;

const q=(s)=>app.querySelector(s);
const profileSelect=q('[data-profile]');
const frames=q('[data-frames]');
const keys=q('[data-keys]');
const resolved=q('[data-resolved]');
const stack=q('[data-stack]');
const status=q('[data-status]');
const pin=q('[data-pin]');

function render(){
  pin.textContent=`Pinned: ${working.id}@${working.version}${working.copiedFrom?` · copied from ${working.copiedFrom.id}@${working.copiedFrom.version}`:''}`;
  frames.innerHTML=working.frameRoles.map((role)=>`
    <label style="display:grid;grid-template-columns:110px minmax(0,1fr);gap:8px;align-items:center">
      <span>${role.label}${role.required===false?' (optional)':''}</span>
      <input data-frame-role="${role.id}" placeholder="asset id / URL / cell id" />
    </label>`).join('');
  keys.innerHTML=working.keys.map((key)=>`
    <label style="display:grid;grid-template-columns:100px 1fr 64px;gap:8px;align-items:center">
      <span>${key.id}</span>
      <input data-key="${key.id}" type="range" min="0" max="1" step=".01" value="${key.at}" />
      <output data-key-out="${key.id}">${key.at.toFixed(2)}</output>
    </label>`).join('');
  stack.textContent=JSON.stringify(working.transitions,null,2);
  app.querySelectorAll('[data-key]').forEach((slider)=>slider.addEventListener('input',()=>{q(`[data-key-out="${slider.dataset.key}"]`).textContent=Number(slider.value).toFixed(2);updateResolved();}));
  q('[data-duration]').addEventListener('input',updateResolved,{once:true});
  updateResolved();
}
function buildInstance(){
  const frameMap={};
  app.querySelectorAll('[data-frame-role]').forEach((el)=>{ if(el.value.trim()) frameMap[el.dataset.frameRole]=el.value.trim(); });
  const timingOverrides={};
  app.querySelectorAll('[data-key]').forEach((el)=>{ timingOverrides[el.dataset.key]=Number(el.value); });
  return instantiateProfile(working,{
    id:q('[data-id]').value.trim()||'motion',
    character:q('[data-character]').value.trim()||'unknown',
    durationMs:Number(q('[data-duration]').value)||320,
    frames:frameMap,
    timingOverrides
  });
}
function updateResolved(){
  const inst=buildInstance();
  resolved.textContent=JSON.stringify(resolveProfileTiming(working,inst.durationMs,inst.timingOverrides),null,2);
}
profileSelect.addEventListener('change',()=>{
  const [id,version]=profileSelect.value.split('@');
  active=getMotionProfile(id,Number(version));
  working=active;
  render();
});
q('[data-copy]').addEventListener('click',()=>{
  working=copyProfile(working,{id:`${working.id}-copy`,label:`${working.label} Copy`});
  render();
  status.textContent='Profile copied. Edits are now independent.';
});
q('[data-preview]').addEventListener('click',()=>{
  const inst=buildInstance();
  try{ const packet=serializeMotionInstance(working,inst); stack.textContent=JSON.stringify(packet,null,2); status.textContent='PLMP recipe previewed.'; }
  catch(err){ status.textContent=err.message; }
});
q('[data-save]').addEventListener('click',()=>{
  const inst=buildInstance();
  try{
    const packet=serializeMotionInstance(working,inst);
    const path=candidateRepoPath(inst);
    stack.textContent=JSON.stringify({path,packet},null,2);
    status.textContent=`Ready for authenticated repo save: ${path}`;
  }catch(err){status.textContent=err.message;}
});
q('[data-blank]').addEventListener('click',()=>{status.textContent='Blank profile creation is intentionally secondary. Copy a working profile unless you truly need a new grammar.';});
render();
document.title='Motion Profile Lab · Pose Lab V2';

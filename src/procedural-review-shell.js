export function createProceduralReviewShell({title,animation,accent='#59d5e8'}){
  const app=document.querySelector('#app');
  app.innerHTML=`
  <style>
  :root{--bg:#070a0d;--panel:#10171d;--line:#29343d;--text:#f1ede6;--muted:#98a7b2;--accent:${accent}}
  *{box-sizing:border-box}html,body{min-height:100%;overflow-y:auto}
  body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;overflow-y:auto;-webkit-overflow-scrolling:touch}
  button,select,input{font:inherit}button,select{color:var(--text);background:#172129;border:1px solid var(--line);border-radius:7px;padding:8px 10px;font-weight:800}
  .top{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid var(--line);background:#0d1318;flex-wrap:wrap}
  .top strong{font-size:15px}.pill{font-size:11px;font-weight:900;color:#071014;background:var(--accent);padding:3px 7px;border-radius:999px}.spacer{flex:1}
  .anim-select{min-width:175px}.layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;align-items:start}
  .stagewrap{min-width:0}.stage-toolbar{display:flex;gap:7px;align-items:center;padding:8px 10px;border-bottom:1px solid var(--line);background:#0b1116;flex-wrap:wrap}
  .stage-toolbar input{width:min(270px,42vw)}.zoom-readout{min-width:52px;text-align:center;font-size:12px;color:var(--muted)}
  .viewport{position:relative;min-height:440px;height:min(68dvh,720px);overflow:hidden;background:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px),#050709;background-size:32px 32px;touch-action:pan-y;cursor:grab}
  .viewport.dragging{cursor:grabbing}.holder{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);will-change:transform}
  canvas{display:block;background:#000;border:1px solid #202b33;image-rendering:pixelated;box-shadow:0 12px 40px #0008;max-width:none;max-height:none}
  .transport{display:grid;grid-template-columns:auto auto minmax(120px,1fr) auto;gap:9px;align-items:center;padding:10px 12px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:#0d1318}
  .transport input{width:100%}.side{background:var(--panel);border-left:1px solid var(--line);padding:14px;min-height:100%;overflow:visible}
  .phase{font-size:23px;font-weight:900;color:var(--accent);margin:5px 0 12px}.meta{font-size:12px;color:var(--muted);line-height:1.55}
  .kv{display:grid;grid-template-columns:110px 1fr;gap:6px 9px;font-size:12px;margin:14px 0}.kv div:nth-child(odd){color:var(--muted)}
  details{margin-top:14px}summary{cursor:pointer;font-weight:800}pre{font-size:10px;white-space:pre-wrap;max-height:45dvh;overflow:auto;background:#081015;border:1px solid var(--line);padding:8px;border-radius:7px}
  @media(max-width:820px){html,body,#app{min-height:100%;height:auto;overflow-y:auto;-webkit-overflow-scrolling:touch}.layout{display:block;min-height:auto}.stagewrap{min-height:auto}.side{border-left:0;border-top:1px solid var(--line);min-height:auto;overflow:visible;padding-bottom:32dvh}.viewport{height:56dvh;min-height:360px}.transport{grid-template-columns:auto auto minmax(100px,1fr)}.transport .time{grid-column:1/-1}.anim-select{min-width:0;flex:1}}
  </style>
  <header class="top"><strong>Pose Lab V2 · Procedural</strong><span class="pill">LIVE</span>
    <select class="anim-select" data-animation>
      <option value="vanguard-idle">Vanguard · Idle</option>
      <option value="vanguard-run">Vanguard · Run</option>
      <option value="vanguard-overhand-strike">Vanguard · Overhand Strike</option>
      <option value="vanguard-undercut-strike">Vanguard · Undercut Strike</option>
      <option value="vanguard-attack2-uppercut">Vanguard · Attack 2 Uppercut</option>
      <option value="vanguard-horizontal-strike">Vanguard · Horizontal Slash</option>
    </select>
    <span class="spacer"></span><button data-profiles>Profiles</button>
  </header>
  <div class="layout">
    <section class="stagewrap">
      <div class="stage-toolbar">
        <button data-zoom-out>−</button><input data-zoom type="range" min=".5" max="4" step=".05" value="1"><button data-zoom-in>＋</button>
        <span class="zoom-readout" data-zoom-readout>100%</span><button data-fit>Fit</button><button data-one>100%</button><button data-center>Center</button>
      </div>
      <div class="viewport" data-viewport><div class="holder" data-holder><canvas data-canvas width="430" height="260"></canvas></div></div>
      <div class="transport"><button data-play>❚❚</button><button data-restart>↺</button><input data-scrub type="range" min="0" max="1" step=".001" value="0"><span class="time" data-time></span></div>
    </section>
    <aside class="side"><div class="meta">Animation</div><div style="font-weight:850" data-title>${title}</div><div class="phase" data-phase></div><div class="kv" data-kv></div>
      <div class="meta">Vanguard uses one canonical review position across animations. Drag the stage to pan when zoomed.</div>
      <details><summary>Recipe</summary><pre data-recipe></pre></details>
    </aside>
  </div>`;

  const q=s=>app.querySelector(s), canvas=q('[data-canvas]'), viewport=q('[data-viewport]'), holder=q('[data-holder]');
  const zoomInput=q('[data-zoom]'), zoomReadout=q('[data-zoom-readout]'), select=q('[data-animation]');
  select.value=animation;
  select.onchange=()=>{location.href='./motion.html?procedural='+encodeURIComponent(select.value);};
  q('[data-profiles]').onclick=()=>location.href='./motion.html';

  let zoom=1,panX=0,panY=0,drag=false,sx=0,sy=0,px=0,py=0;
  function apply(){
    holder.style.transform=`translate(calc(-50% + ${panX}px),calc(-50% + ${panY}px))`;
    const w=Math.max(1,Math.round(canvas.width*zoom)),h=Math.max(1,Math.round(canvas.height*zoom));
    canvas.style.width=w+'px';canvas.style.height=h+'px';
    holder.style.width=w+'px';holder.style.height=h+'px';
    zoomInput.value=String(zoom);zoomReadout.textContent=Math.round(zoom*100)+'%';
  }
  function setZoom(v){zoom=Math.max(.5,Math.min(4,Number(v)));apply();}
  function fit(){const pad=28;panX=0;panY=0;setZoom(Math.max(.5,Math.min(4,Math.min((viewport.clientWidth-pad)/canvas.width,(viewport.clientHeight-pad)/canvas.height))));}
  zoomInput.oninput=()=>setZoom(zoomInput.value);q('[data-zoom-in]').onclick=()=>setZoom(zoom+.15);q('[data-zoom-out]').onclick=()=>setZoom(zoom-.15);
  q('[data-fit]').onclick=fit;q('[data-one]').onclick=()=>{panX=0;panY=0;setZoom(1)};q('[data-center]').onclick=()=>{panX=0;panY=0;apply()};
  viewport.onpointerdown=e=>{
    if(e.pointerType==='touch' && zoom<=1.05) return;
    drag=true;viewport.classList.add('dragging');
    if(e.pointerType!=='touch') viewport.setPointerCapture(e.pointerId);
    sx=e.clientX;sy=e.clientY;px=panX;py=panY;
  };
  viewport.onpointermove=e=>{if(!drag)return;panX=px+e.clientX-sx;panY=py+e.clientY-sy;apply()};
  const end=e=>{
    drag=false;viewport.classList.remove('dragging');
    if(e.pointerType!=='touch'){try{viewport.releasePointerCapture(e.pointerId)}catch{}}
  };
  viewport.onpointerup=end;viewport.onpointercancel=end;
  return {app,q,canvas,viewport,fit,setZoom,getZoom:()=>zoom};
}

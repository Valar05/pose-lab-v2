import * as THREE from 'three';
import { locateProgramStep, normalizeRuntimePlan, sampleCurve, sha256Hex } from './thirdskin-runtime.js';
import { MAX_PLAYBACK_SPEED, MIN_PLAYBACK_SPEED, PLAYBACK_SPEED_STEP, formatPlaybackSpeed, readPlaybackSpeed, writePlaybackSpeed } from './playback-preferences.js';

const params = new URLSearchParams(window.location.search);
const requestedManifest = params.get('manifest');
const app = document.querySelector('#app');

const styles = document.createElement('style');
styles.textContent = `
  .thirdskin-lab { min-height:100dvh; display:grid; grid-template-rows:auto minmax(48vh,1fr) auto; background:#090c0f; color:#f7f2e8; }
  .thirdskin-header,.thirdskin-console { padding:14px 16px; background:rgba(7,10,12,.96); }
  .thirdskin-header { display:flex; justify-content:space-between; gap:16px; align-items:center; border-bottom:1px solid #ffffff22; }
  .thirdskin-header h1,.thirdskin-header p { margin:0; }
  .thirdskin-header p { color:#aeb8c1; font-size:12px; }
  .thirdskin-stage { position:relative; min-height:0; overflow:hidden; background-color:#253038; background-image:linear-gradient(45deg,#1b2328 25%,transparent 25%),linear-gradient(-45deg,#1b2328 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#1b2328 75%),linear-gradient(-45deg,transparent 75%,#1b2328 75%); background-position:0 0,0 16px,16px -16px,-16px 0; background-size:32px 32px; }
  .thirdskin-stage canvas { width:100%; height:100%; display:block; }
  .thirdskin-badge { position:absolute; top:10px; left:10px; padding:6px 8px; background:#080b0ddd; border:1px solid #f0c35a66; border-radius:6px; font:700 12px/1.35 ui-monospace,monospace; white-space:pre-line; }
  .thirdskin-console { display:grid; gap:10px; border-top:1px solid #ffffff22; }
  .thirdskin-controls,.thirdskin-steps { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .thirdskin-console button,.thirdskin-console select { min-height:40px; padding:7px 11px; border:1px solid #ffffff30; border-radius:7px; background:#182026; color:#f7f2e8; font:inherit; font-weight:750; }
  .thirdskin-console button[aria-pressed="true"],.thirdskin-console button.active { border-color:#f0c35a; background:#4c2d1f; }
  .thirdskin-console input[type="range"] { width:100%; min-height:30px; }
  .thirdskin-speed { display:grid; grid-template-columns:auto minmax(140px,260px) auto; gap:8px; align-items:center; min-width:min(100%,360px); }
  .thirdskin-speed input[type="range"] { width:100%; }
  .thirdskin-speed output { min-width:4.25em; font-variant-numeric:tabular-nums; text-align:right; color:#d8ecff; font-weight:800; }
  .thirdskin-readout { color:#d8ecff; font-weight:800; }
  .thirdskin-contract { color:#bfeeff; font-size:12px; }
  .thirdskin-failure { max-width:760px; margin:32px auto; padding:20px; }
  .thirdskin-failure pre { white-space:pre-wrap; overflow-wrap:anywhere; }
  @media (min-width:900px) { .thirdskin-lab { grid-template-columns:minmax(0,1fr) minmax(360px,.42fr); grid-template-rows:auto minmax(0,1fr); } .thirdskin-header { grid-column:1/-1; } .thirdskin-console { border-top:0; border-left:1px solid #ffffff22; align-content:start; overflow:auto; } }
`;
document.head.append(styles);

if (!requestedManifest) {
  fail('Sprite Lab needs a compiled Thirdskin runtime plan', 'Open ?view=sprite&manifest=/path/to/runtime-plan.json');
} else {
  boot().catch((error) => fail('Sprite Lab failed to load', error instanceof Error ? error.stack || error.message : String(error)));
}

function fail(label, detail) {
  document.body.dataset.bootFailed = '1';
  app.innerHTML = `<section class="thirdskin-failure"><h1>${label}</h1><pre></pre></section>`;
  app.querySelector('pre').textContent = detail;
}

async function boot() {
  const manifestUrl = new URL(requestedManifest, window.location.href);
  const response = await fetch(manifestUrl);
  if (!response.ok) throw new Error(`Runtime plan returned ${response.status}`);
  const plan = normalizeRuntimePlan(await response.json(), manifestUrl);
  const initialPlaybackSpeed = readPlaybackSpeed();

  app.innerHTML = `
    <section class="thirdskin-lab">
      <header class="thirdskin-header">
        <div><p>Pose Lab V2 · Thirdskin Commander</p><h1>2D Animation Review</h1><p>Sparse source cells reconstructed by deterministic localized deformation.</p></div>
        <a href="./?view=2d">Legacy frame review</a>
      </header>
      <section class="thirdskin-stage checker" data-stage aria-label="Sprite Lab deformation stage">
        <div class="thirdskin-badge" data-badge></div>
      </section>
      <section class="thirdskin-console" aria-label="Sprite Lab controls">
        <div><strong data-title></strong><div class="thirdskin-contract">Canonical cells: <span data-cell-count></span> · derived frames stored: no</div></div>
        <div class="thirdskin-controls">
          <button type="button" data-previous aria-label="Previous exposure">◀</button>
          <button type="button" data-play aria-pressed="true">Pause</button>
          <button type="button" data-next aria-label="Next exposure">▶</button>
          <label class="thirdskin-speed"><span>Speed</span><input data-speed type="range" min="${MIN_PLAYBACK_SPEED}" max="${MAX_PLAYBACK_SPEED}" step="${PLAYBACK_SPEED_STEP}" value="${initialPlaybackSpeed}" aria-label="Playback speed"><output data-speed-output>${formatPlaybackSpeed(initialPlaybackSpeed)}</output></label>
          <output class="thirdskin-readout" data-readout></output>
        </div>
        <label><span class="sr-only">Program time</span><input data-scrub type="range" min="0" max="${plan.totalDurationMs}" value="0" step="1"></label>
        <div class="thirdskin-steps" data-steps role="tablist" aria-label="Exposure program boundaries"></div>
        <p class="thirdskin-contract">Program boundaries are review samples, not stored keyframes. Pause and step them for frozen inspection.</p>
        <p class="sr-only" aria-live="polite" data-live></p>
      </section>
    </section>
  `;

  const stage = app.querySelector('[data-stage]');
  const badge = app.querySelector('[data-badge]');
  const readout = app.querySelector('[data-readout]');
  const live = app.querySelector('[data-live]');
  const scrub = app.querySelector('[data-scrub]');
  const playButton = app.querySelector('[data-play]');
  const speedInput = app.querySelector('[data-speed]');
  const speedOutput = app.querySelector('[data-speed-output]');
  app.querySelector('[data-title]').textContent = `${plan.character} · ${plan.id}`;
  app.querySelector('[data-cell-count]').textContent = String(Object.keys(plan.cells).length);

  const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, premultipliedAlpha:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
  camera.position.z = 2;
  const geometry = new THREE.PlaneGeometry(2, 2, 64, 64);
  const baseUniforms = {
    map:{value:null}, overallScale:{value:1}, leftStretch:{value:0}, rightStretch:{value:0},
    hipKneeCrouch:{value:0}, hipKneeShear:{value:0}, hipUv:{value:.48}, kneeUv:{value:.26},
    rotationRad:{value:0}, translate:{value:new THREE.Vector2(0,0)}, glow:{value:0},
    opacity:{value:1}, texel:{value:new THREE.Vector2(1/512,1/512)}, outline:{value:0},
  };
  const vertexShader = `
    varying vec2 vUv;
    uniform float overallScale,leftStretch,rightStretch,rotationRad;
    uniform float hipKneeCrouch,hipKneeShear,hipUv,kneeUv;
    uniform vec2 translate;
    void main(){
      vUv=uv;
      vec3 p=position;
      float side=mix(leftStretch,rightStretch,uv.x);
      p.x*=overallScale*(1.0+side);
      p.y*=overallScale;
      p.x+=mix(-leftStretch,rightStretch,uv.x)*0.22;
      // Lower legs remain fixed; the torso rides as one rigid plate; only this bridge deforms.
      float bridge=smoothstep(kneeUv,hipUv,uv.y);
      p.y-=hipKneeCrouch*bridge;
      p.x+=hipKneeShear*bridge;
      float c=cos(rotationRad),s=sin(rotationRad);
      p.xy=mat2(c,-s,s,c)*p.xy+translate;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
    }`;
  const fragmentShader = `
    varying vec2 vUv;
    uniform sampler2D map;
    uniform vec2 texel;
    uniform float glow,opacity,outline;
    void main(){
      vec4 base=texture2D(map,vUv);
      float edge=max(max(texture2D(map,vUv+vec2(texel.x,0.)).a,texture2D(map,vUv-vec2(texel.x,0.)).a),max(texture2D(map,vUv+vec2(0.,texel.y)).a,texture2D(map,vUv-vec2(0.,texel.y)).a));
      float halo=max(0.,edge-base.a)*outline;
      vec3 color=base.rgb*(1.+glow*.22)+vec3(1.,.62,.16)*halo;
      float alpha=max(base.a,halo)*opacity;
      if(alpha<.002) discard;
      gl_FragColor=vec4(color,alpha);
    }`;

  function material() {
    const uniforms={};
    for(const [key,entry] of Object.entries(baseUniforms)) uniforms[key]={value:entry.value?.clone ? entry.value.clone() : entry.value};
    return new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false});
  }
  const primary=new THREE.Mesh(geometry,material()); primary.renderOrder=3; scene.add(primary);
  const echoes=[-1,1].map((direction)=>{
    const mesh=new THREE.Mesh(geometry,material()); mesh.renderOrder=1; mesh.visible=false; mesh.userData.direction=direction; scene.add(mesh); return mesh;
  });

  const textureCache=new Map();
  async function verifiedTexture(cell) {
    if(textureCache.has(cell.id)) return textureCache.get(cell.id);
    const promise=(async()=>{
      const assetResponse=await fetch(cell.assetUrl);
      if(!assetResponse.ok) throw new Error(`Cell ${cell.id} returned ${assetResponse.status}`);
      const bytes=await assetResponse.arrayBuffer();
      const digest=await sha256Hex(bytes);
      if(digest!==cell.sha256) throw new Error(`Cell ${cell.id} SHA-256 mismatch`);
      const objectUrl=URL.createObjectURL(new Blob([bytes]));
      try {
        const texture=await new THREE.TextureLoader().loadAsync(objectUrl);
        texture.colorSpace=THREE.SRGBColorSpace;
        texture.minFilter=THREE.LinearFilter;
        texture.magFilter=THREE.LinearFilter;
        texture.generateMipmaps=false;
        const width=texture.image?.naturalWidth||texture.image?.width||512;
        const height=texture.image?.naturalHeight||texture.image?.height||512;
        texture.userData.aspect=width/height;
        texture.userData.texel=new THREE.Vector2(1/width,1/height);
        return texture;
      } finally { URL.revokeObjectURL(objectUrl); }
    })();
    textureCache.set(cell.id,promise);
    return promise;
  }

  await Promise.all(Object.values(plan.cells).map(verifiedTexture));

  let playing=true;
  let speed=initialPlaybackSpeed;
  let timeMs=0;
  let previousNow=null;
  let activeIndex=-1;
  let textureToken=0;

  function announce(message){ live.textContent=''; requestAnimationFrame(()=>{live.textContent=message;}); }
  function resize(){
    const width=Math.max(1,stage.clientWidth),height=Math.max(1,stage.clientHeight);
    renderer.setSize(width,height,false);
    const viewportAspect=width/height;
    camera.left=-viewportAspect; camera.right=viewportAspect; camera.top=1; camera.bottom=-1; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();

  function setUniforms(mesh,values,effects,echoOffset=0){
    const u=mesh.material.uniforms;
    u.overallScale.value=values.overallScale??1;
    u.leftStretch.value=values.leftStretch??0;
    u.rightStretch.value=values.rightStretch??0;
    u.hipKneeCrouch.value=values.hipKneeCrouch??0;
    u.hipKneeShear.value=values.hipKneeShear??0;
    u.hipUv.value=values.hipUv??.48;
    u.kneeUv.value=values.kneeUv??.26;
    u.rotationRad.value=THREE.MathUtils.degToRad(values.rotationDeg??0);
    u.translate.value.set((values.translateX??0)+echoOffset,values.translateY??0);
    u.glow.value=values.glow??0;
    u.opacity.value=echoOffset===0?(values.opacity??1):.2;
    u.outline.value=effects.includes('contact-outline-flare')?1.4:(values.outline??Math.max(0,(values.glow??0)-.45));
  }

  async function activate(step){
    if(activeIndex===step.index) return;
    activeIndex=step.index;
    const token=++textureToken;
    const texture=await verifiedTexture(plan.cells[step.cell]);
    if(token!==textureToken) return;
    for(const mesh of [primary,...echoes]){
      mesh.material.uniforms.map.value=texture;
      mesh.material.uniforms.texel.value.copy(texture.userData.texel);
      mesh.scale.set(texture.userData.aspect>=1?texture.userData.aspect:1,texture.userData.aspect<1?1/texture.userData.aspect:1,1);
    }
    echoes.forEach((mesh)=>{mesh.visible=step.effects.includes('contact-echo');});
  }

  function render(){
    const step=locateProgramStep(plan.program,timeMs,plan.totalDurationMs);
    activate(step).catch((error)=>fail('Sprite Lab cell failed verification',error.message));
    const elapsed=timeMs-step.startMs;
    const sample=sampleCurve(plan.deformationCurves[step.curve],elapsed);
    setUniforms(primary,sample.values,step.effects,0);
    echoes.forEach((mesh)=>setUniforms(mesh,sample.values,step.effects,mesh.userData.direction*.055));
    badge.textContent=`cell: ${step.cell} (${step.role})\ncurve: ${step.curve}\neffects: ${step.effects.join(', ')||'none'}`;
    readout.textContent=`${Math.round(timeMs)} / ${plan.totalDurationMs} ms · step ${step.index+1}/${plan.program.length}`;
    scrub.value=String(Math.round(timeMs));
    [...app.querySelectorAll('[data-step]')].forEach((button)=>button.classList.toggle('active',Number(button.dataset.step)===step.index));
    renderer.render(scene,camera);
  }

  function tick(now){
    if(previousNow===null) previousNow=now;
    if(playing){
      timeMs+=(now-previousNow)*speed;
      if(timeMs>=plan.totalDurationMs) timeMs%=plan.totalDurationMs;
    }
    previousNow=now;
    render();
    requestAnimationFrame(tick);
  }

  const steps=app.querySelector('[data-steps]');
  plan.program.forEach((step)=>{
    const button=document.createElement('button');
    button.type='button'; button.role='tab'; button.dataset.step=String(step.index);
    button.textContent=`${step.index+1} · ${step.role} · ${step.durationMs}ms`;
    button.addEventListener('click',()=>{playing=false;playButton.textContent='Play';playButton.setAttribute('aria-pressed','false');timeMs=step.startMs;announce(`Paused at ${step.role} exposure ${step.index+1}`);render();});
    steps.append(button);
  });
  function jump(direction){
    const step=locateProgramStep(plan.program,timeMs,plan.totalDurationMs);
    const index=(step.index+direction+plan.program.length)%plan.program.length;
    timeMs=plan.program[index].startMs; render(); announce(`${plan.program[index].role} exposure ${index+1}`);
  }
  app.querySelector('[data-previous]').addEventListener('click',()=>jump(-1));
  app.querySelector('[data-next]').addEventListener('click',()=>jump(1));
  playButton.addEventListener('click',()=>{playing=!playing;previousNow=null;playButton.textContent=playing?'Pause':'Play';playButton.setAttribute('aria-pressed',String(playing));announce(playing?'Animation playing':'Animation paused');});
  speedInput.addEventListener('input',()=>{
    speed=writePlaybackSpeed(speedInput.value);
    speedInput.value=String(speed);
    speedOutput.textContent=formatPlaybackSpeed(speed);
    announce(`Playback speed ${formatPlaybackSpeed(speed)}`);
  });
  scrub.addEventListener('input',()=>{playing=false;playButton.textContent='Play';playButton.setAttribute('aria-pressed','false');timeMs=Number(scrub.value);render();});

  document.title=`${plan.character} · Sprite Lab`;
  document.body.dataset.reviewReady='1';
  document.body.dataset.reviewMode=params.get('view')==='2d'?'pose-2d':'sprite';
  requestAnimationFrame(tick);
}

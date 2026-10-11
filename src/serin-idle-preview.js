import {scheduledBlink,manualBlink,verifyBlinkSpec} from './serin-blink-timeline.mjs';
// Serin: one immutable RGBA pose, animated in a dedicated WebGL lane.
// Nothing in this module changes Vanguard/Swarmling renderers or atlas pixels.
const app=document.querySelector('#app');
const configUrl='./assets/serin/idle.recipe.json';
const params=new URLSearchParams(location.search);
const rev=params.get('rev') || '';
const query=rev ? '?rev='+encodeURIComponent(rev) : '';
const prefersReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
app.innerHTML = `
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#080911;color:#f4ecff;font:15px system-ui,sans-serif}
button,select,input{font:inherit;accent-color:#c66bff}
button,select{border:1px solid #6c4b8b;background:#25152e;color:#f7eaff;border-radius:9px;padding:9px 12px;min-height:40px}
button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #efbdff;outline-offset:2px}
.serin-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:9px 12px;background:#120d1c;border-bottom:1px solid #52315b}
.serin-top strong{font-size:17px}.serin-top .tag{font-size:11px;color:#efd7ff;border:1px solid #795c92;border-radius:12px;padding:3px 8px}
.serin-space{flex:1}.serin-main{display:grid;grid-template-columns:minmax(0,1fr) 285px;gap:0}
.serin-stage{position:relative;display:grid;place-items:center;min-height:65dvh;padding:12px;overflow:hidden;background-color:#0c0d16}
.serin-stage.checker{background-color:#15101d;background-image:linear-gradient(45deg,#ffffff0c 25%,transparent 25%),linear-gradient(-45deg,#ffffff0c 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ffffff0c 75%),linear-gradient(-45deg,transparent 75%,#ffffff0c 75%);background-size:24px 24px;background-position:0 0,0 12px,12px -12px,-12px 0}
.serin-stage canvas{display:block;max-width:100%;max-height:75dvh;width:auto;height:auto;background:transparent}
.serin-stage .error{position:absolute;top:16px;left:16px;right:16px;background:#3b1428;border:1px solid #ec7595;padding:12px;border-radius:9px;white-space:pre-wrap}
.serin-controls{padding:16px;background:#120e1e;border-left:1px solid #513965}
.serin-controls h2{font-size:17px;margin:0 0 10px}
.serin-control{display:grid;grid-template-columns:1fr auto;gap:5px 8px;margin:15px 0}
.serin-control input{grid-column:1/-1;width:100%;min-height:30px}
.serin-actions{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}
.serin-notice{font-size:12px;line-height:1.5;color:#cbb8d5;margin-top:13px}
.serin-status{font-size:12px;color:#e5b8ff;min-height:1.5em}
@media(max-width:820px){.serin-main{display:block}.serin-stage{min-height:unset;padding:8px}.serin-stage canvas{max-height:69dvh}.serin-controls{border-left:0;border-top:1px solid #513965}.serin-top strong{font-size:15px}}
</style>
<header class="serin-top"><strong>Pose Lab V2 · Serin</strong><span class="tag">ONE-FRAME LIQUID IDLE</span>
 <span class="serin-space"></span><label for="serin-character">Character</label>
 <select id="serin-character" aria-label="Character"><option value="serin-idle">Serin</option><option value="vanguard-idle">Vanguard</option><option value="swarmling-idle">Swarmling</option></select>
 <button id="serin-profiles">Profiles</button></header>
<main class="serin-main">
 <section class="serin-stage checker" id="serin-stage" aria-label="Transparent animated Serin character">
  <canvas id="serin-canvas" width="724" height="966" role="img" aria-label="Serin, violet cosmic liquid demoness, continuous one-frame idle"></canvas>
  <div class="error" id="serin-error" role="alert" hidden></div>
 </section>
 <section class="serin-controls" aria-label="Serin deformation controls">
  <h2>Liquid physics lab</h2><div class="serin-status" id="serin-status">Loading approved source…</div>
  <div class="serin-actions"><button id="serin-play" aria-pressed="false">Pause</button><button id="serin-restart">Restart</button><button id="serin-blink-now" aria-label="Make Serin blink now">Blink now</button><button id="serin-checker" aria-pressed="true">Transparency grid</button></div>
  <label class="serin-control">Hair inertia <output id="hair-value">1.00</output><input id="hair" aria-label="Hair inertia" type="range" min="0" max="2" step="0.05" value="1"></label>
  <label class="serin-control">Liquid column <output id="liquid-value">1.00</output><input id="liquid" aria-label="Liquid column deformation" type="range" min="0" max="2" step="0.05" value="1"></label>
  <label class="serin-control">Surface currents <output id="currents-value">1.00</output><input id="currents" aria-label="Liquid surface currents" type="range" min="0" max="2" step="0.05" value="1"></label>
  <label class="serin-control">Starlight pulse <output id="glow-value">1.00</output><input id="glow" aria-label="Starlight pulse" type="range" min="0" max="2" step="0.05" value="1"></label>
  <label class="serin-control">Tempo <output id="speed-value">1.00</output><input id="speed" aria-label="Animation tempo" type="range" min="0.25" max="2" step="0.05" value="1"></label>
  <p class="serin-notice" id="serin-blink-note">Blinks: irregular intervals, with an occasional double blink. The face returns to the exact original frame between blinks.</p>
  <p class="serin-notice">One approved transparent PNG. Every motion is reversible shader deformation. Hair sways in layers; the luminous lower body rolls through currents and eddies while the pool breathes. No newly invented poses, no root movement, no opaque backdrop.</p>
  <p class="serin-notice">Review candidate. Your visual approval is required before promotion.</p>
 </section>
</main>`;
const q=(selector)=>app.querySelector(selector),canvas=q('#serin-canvas'),stage=q('#serin-stage');
q('#serin-profiles').onclick=()=>location.assign('./motion.html');
q('#serin-character').onchange=e=>location.assign('./motion.html?procedural='+encodeURIComponent(e.target.value));
const settings={hair:1,liquid:1,currents:1,glow:1,speed:1};
for(const name of Object.keys(settings)){
  q('#'+name).oninput=e=>{settings[name]=Number(e.target.value);q('#'+name+'-value').textContent=settings[name].toFixed(2);};
}
q('#serin-checker').onclick=()=>{const on=stage.classList.toggle('checker');q('#serin-checker').setAttribute('aria-pressed',String(on));};
let playing=!prefersReduced,clockStart=performance.now(),clockOffset=0,ready=false;
let manualBlinkStart=Number.NaN;
q('#serin-blink-now').onclick=()=>{manualBlinkStart=performance.now();};
function timeAt(now){return (clockOffset+(playing?(now-clockStart)*settings.speed:0));}
q('#serin-play').textContent=playing?'Pause':'Play';
q('#serin-play').setAttribute('aria-pressed',String(!playing));
q('#serin-play').onclick=()=>{
 const now=performance.now();clockOffset=timeAt(now);clockStart=now;playing=!playing;
 q('#serin-play').textContent=playing?'Pause':'Play';
 q('#serin-play').setAttribute('aria-pressed',String(!playing));
};
q('#serin-restart').onclick=()=>{clockOffset=0;clockStart=performance.now();};
q('#speed').addEventListener('pointerdown',()=>{clockOffset=timeAt(performance.now());clockStart=performance.now();});
function fail(msg){q('#serin-error').hidden=false;q('#serin-error').textContent=msg;q('#serin-status').textContent='Failed closed';}
function compile(gl,type,text){
 const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);
 if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'Shader compile failed');
 return s;
}
const vertex=`
attribute vec2 aPosition;
varying vec2 vUv;
void main(){vUv=aPosition*0.5+0.5;gl_Position=vec4(aPosition,0.0,1.0);}
`;
const fragment=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uImage;
uniform float uPhase;
uniform float uHair;
uniform float uLiquid;
uniform float uCurrents;
uniform float uGlow;
uniform float uBlink;
uniform vec4 uEyeLeft;
uniform vec4 uEyeRight;
uniform vec2 uEyeSlants;
float smoothBand(float a,float b,float c,float d,float v){return smoothstep(a,b,v)*(1.0-smoothstep(c,d,v));}
float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
// One-source eyelid closure: sample nearby approved painted cheek skin,
// then return the existing lash-line as a narrow curved eyelid crease.
// This runs only within the two individually calibrated facial ellipses.
vec4 applyBlink(vec4 base,vec2 uv,vec4 eye,float slope,float closing){
  vec2 d=vec2((uv.x-eye.x)/eye.z,(uv.y-eye.y)/eye.w);
  d.y-=slope*d.x;
  float oval=length(d);
  float region=1.0-smoothstep(0.72,1.02,oval);
  float shutter=region*closing;
  if(shutter<0.001)return base;
  // Skin is borrowed from immediately beneath this specific eye. No new art.
  vec2 cheekUv=clamp(uv+vec2(0.0,eye.w*1.95),vec2(0.001),vec2(0.999));
  vec4 skin=texture2D(uImage,vec2(cheekUv.x,1.0-cheekUv.y));
  vec4 covered=vec4(mix(base.rgb,skin.rgb,shutter*skin.a),base.a);
  float crease=(1.0-smoothstep(0.04,0.19,abs(d.y-0.07)))*
    (1.0-smoothstep(0.58,0.91,abs(d.x)))*
    smoothstep(0.45,0.89,closing);
  covered.rgb=mix(covered.rgb,vec3(0.21,0.065,0.14),0.83*crease);
  return covered;
}
void main(){
  // Coordinates in top-origin source space. Source pose never advances frames.
  vec2 p=vec2(vUv.x,1.0-vUv.y);
  float t=uPhase;
  // Hair mass occupies upper-left, with a broad feathered boundary.
  float hairMask=smoothBand(0.035,0.16,0.48,0.70,p.y)*(1.0-smoothstep(0.40,0.70,p.x));
  float hairRoot=clamp((0.75-p.x)/0.75,0.0,1.0);
  vec2 hairWarp=vec2(
     (0.012*sin(t+p.y*15.0+p.x*4.0)+0.006*sin(2.0*t-p.y*29.0))*hairRoot,
     (0.0038*sin(t+p.x*19.0)+0.0028*sin(2.0*t+p.y*23.0))*hairRoot
  )*hairMask*uHair;
  // A pinned neck/waist with gently flexing fluid body.
  float tailMask=smoothstep(0.46,0.68,p.y)*(1.0-smoothstep(0.13,0.36,abs(p.x-0.53)));
  tailMask*=1.0-smoothstep(0.88,0.99,p.y);
  float tailBend=0.013*sin(t+p.y*8.0)+0.006*sin(2.0*t-p.y*17.0);
  vec2 liquidWarp=vec2(tailBend,0.0045*sin(2.0*t+p.x*28.0))*tailMask*uLiquid;
  // Spreading pool undulates radially without ever translating the root.
  float poolMask=smoothstep(0.78,0.93,p.y);
  float radial=length(vec2((p.x-0.52)*1.0,(p.y-0.94)*2.3));
  vec2 poolWarp=vec2(0.004*cos(2.0*t+radial*42.0),0.0025*sin(2.0*t+radial*66.0))*poolMask*uCurrents;
  // The torso has a separate, low-amplitude breathing mode.
  float torsoMask=smoothBand(0.13,0.21,0.42,0.56,p.y)*smoothBand(0.44,0.55,0.76,0.84,p.x);
  vec2 breath=vec2((p.x-0.60)*0.006*sin(t),0.0017*sin(t))*torsoMask;
  // Reverse-map the input image with continuously feathered displacements.
  vec2 source=clamp(p+hairWarp+liquidWarp+poolWarp+breath,vec2(0.001),vec2(0.999));
  vec4 c=texture2D(uImage,vec2(source.x,1.0-source.y));
  if(c.a<0.004){gl_FragColor=vec4(0.0);return;}
  // Outside the blink ellipses, source pixels and all prior physics stay untouched.
  if(uBlink>0.001){
    c=applyBlink(c,source,uEyeLeft,uEyeSlants.x,uBlink);
    c=applyBlink(c,source,uEyeRight,uEyeSlants.y,uBlink);
  }
  float violet=clamp((c.b-max(c.r,c.g)*0.78)*3.0,0.0,1.0);
  float flow=tailMask+poolMask*0.85;
  // Tangential nebula streaks and small deterministic, repeating sparkles.
  float current=sin(p.y*90.0+p.x*45.0-2.0*t)+sin(p.x*84.0-p.y*25.0+3.0*t);
  float glimmer=(0.5+0.5*sin(current*1.2+t))*flow*violet*uCurrents;
  vec2 cell=floor(source*vec2(184.0,247.0));
  float star=step(0.989,hash21(cell));
  float twinkle=pow(0.5+0.5*sin(t*3.0+hash21(cell+7.0)*6.2831853),8.0)*star*violet;
  vec3 tint=vec3(0.22,0.06,0.36)*glimmer*0.13 + vec3(0.20,0.10,0.30)*twinkle*0.65;
  float pulse=(0.5+0.5*sin(t+source.y*9.0))*0.09*uGlow;
  c.rgb=clamp(c.rgb+tint*uGlow+vec3(0.10,0.025,0.15)*pulse*violet,0.0,1.0);
  gl_FragColor=c;
}`;
async function boot(){
 const recipe=await fetch(configUrl+query,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Serin recipe HTTP '+r.status);return r.json();});
 if(recipe.schema!=='pose-lab-v2-serin-idle-v1'||recipe.source.sha256!=='00ba472a4ee922a0840a3d63a71deafd054a3f91514480bab7918e94afab307f')throw new Error('Serin source contract mismatch');
 verifyBlinkSpec(recipe.blink);
 const image=new Image();image.decoding='async';
 image.src='./'+recipe.source.file+query;
 await new Promise((yes,no)=>{image.onload=yes;image.onerror=()=>no(new Error('Approved source missing: '+recipe.source.file+'. Run the Serin phone campaign to ingest the exact PNG.'));});
 if(image.naturalWidth!==1086||image.naturalHeight!==1448)throw new Error('Unexpected source geometry: '+image.naturalWidth+' x '+image.naturalHeight);
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
 if(!gl){
   const cx=canvas.getContext('2d');cx.clearRect(0,0,canvas.width,canvas.height);
   cx.drawImage(image,0,0,canvas.width,canvas.height);
   q('#serin-status').textContent='Static fallback: WebGL unavailable; source intact';
   return;
 }
 const program=gl.createProgram();
 gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vertex));
 gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,fragment));
 gl.linkProgram(program);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Shader link failed');
 gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const pos=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
 const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
 if(gl.getError()!==gl.NO_ERROR)throw new Error('GPU rejected Serin texture');
 const loc=name=>gl.getUniformLocation(program,name);
 const uniforms={phase:loc('uPhase'),hair:loc('uHair'),liquid:loc('uLiquid'),currents:loc('uCurrents'),glow:loc('uGlow'),blink:loc('uBlink')};
 const eyeVec=(eye)=>new Float32Array([eye.x/1086,eye.y/1448,eye.rx/1086,eye.ry/1448]);
 gl.uniform4fv(loc('uEyeLeft'),eyeVec(recipe.blink.leftEye));
 gl.uniform4fv(loc('uEyeRight'),eyeVec(recipe.blink.rightEye));
 gl.uniform2f(loc('uEyeSlants'),recipe.blink.leftEye.slant,recipe.blink.rightEye.slant);
 gl.uniform1i(loc('uImage'),0);
 gl.viewport(0,0,canvas.width,canvas.height);
 gl.clearColor(0,0,0,0);
 const cycle=Number(recipe.cycleMs)||9800;
 ready=true;q('#serin-status').textContent='WebGL liquid deformation · transparent RGBA · source locked';
 function render(now){
   if(!ready)return;
   const phase=2*Math.PI*((timeAt(now)%cycle)/cycle);
   gl.clear(gl.COLOR_BUFFER_BIT);
   gl.uniform1f(uniforms.phase,phase);
   gl.uniform1f(uniforms.hair,settings.hair);
   gl.uniform1f(uniforms.liquid,settings.liquid);
   gl.uniform1f(uniforms.currents,settings.currents);
   gl.uniform1f(uniforms.glow,settings.glow);
   gl.uniform1f(uniforms.blink,Math.max(scheduledBlink(timeAt(now),recipe.blink),manualBlink(now,manualBlinkStart,recipe.blink.manual)));
   gl.drawArrays(gl.TRIANGLES,0,6);
   requestAnimationFrame(render);
 }
 requestAnimationFrame(render);
}
boot().catch(e=>fail(e.stack||String(e)));

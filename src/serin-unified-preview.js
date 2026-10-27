import {SerinUnifiedLocomotion} from './serin-unified-locomotion.mjs';
import {scheduledBlink,manualBlink,verifyBlinkSpec} from './serin-blink-timeline.mjs';
import {demoAxis,DEMO_DURATION_SECONDS} from './serin-glide-wave-system.mjs';
const app=document.querySelector('#app');
app.innerHTML=[
'<style>',
'*{box-sizing:border-box}body{margin:0;background:#100d19;color:#f4eaff;font:15px system-ui,sans-serif}',
'button,select{background:#2b1739;color:inherit;border:1px solid #845ba2;padding:10px 13px;border-radius:9px;min-height:44px;font:inherit}',
'button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid #ffcdff;outline-offset:2px}',
'header{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:11px;background:#181026;border-bottom:1px solid #533665}header strong{font-size:18px}',
'main{display:grid;grid-template-columns:minmax(0,1fr) 310px}.stage{background:repeating-conic-gradient(#b7b1c528 0% 25%,#1c162e 0% 50%) 50%/26px 26px;display:grid;place-items:center;min-height:70dvh;padding:8px;overflow:hidden}',
'.stage canvas{max-width:100%;max-height:75dvh;object-fit:contain;display:block}.side{padding:15px;background:#171023;border-left:1px solid #543466}',
'.controls{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.status{font-size:13px;color:#eab9ff;white-space:pre-wrap;line-height:1.6}',
'input[type=range]{width:100%;accent-color:#c978f3}.small{font-size:12px;color:#cbb9df;line-height:1.5}label{display:block;margin-top:16px}',
'.error{border:1px solid #f492a6;background:#442031;padding:12px;border-radius:8px;white-space:pre-wrap}',
'@media(max-width:850px){main{display:block}.stage{min-height:0}.stage canvas{max-height:65dvh}.side{border-left:0;border-top:1px solid #543466;padding-bottom:10dvh}}',
'</style>',
'<header><strong>Pose Lab V2 · Serin Unified Locomotion</strong><span>PHYSICS-DRIVEN</span>',
'<select aria-label="Animation" id="animation"><option value="serin-unified">Unified Locomotion</option><option value="serin-back-idle">Back Idle</option><option value="serin-idle">Front Idle</option></select>',
'<button id="profiles">Profiles</button></header>',
'<main><section class="stage" aria-label="Serin glide preview">',
'<canvas width="768" height="1340" id="stage" role="img" aria-label="Serin glides right, sloshes, then settles into idle"></canvas>',
'<p id="error" class="error" role="alert" hidden></p></section>',
'<aside class="side"><strong>Game-driven locomotion</strong>',
'<p class="small">Idle → accelerate/pitch → glide → brake/slosh → idle. Game owns world position; this lab pins the sprite for inspection.</p>',
'<div class="controls"><button id="start">Glide right</button><button id="stop">Stop / slosh</button><button id="reverse">Reverse</button><button id="jump">Jump</button><button id="blink-now">Blink now</button><button id="demo">Demo: idle → glide → idle</button><button id="reset">Reset to idle</button></div>',
'<label for="throttle">Input axis</label><input type="range" id="throttle" min="-1" max="1" value="0" step="0.05">',
'<p class="small">Arrow keys move, Space or ↑ jumps instantly, S brakes. Jump from idle or while gliding. On a phone, choose Glide right then Jump. Vertical motion is real physics, not frames.</p>',
'<p class="status" id="status">Checking approved source hashes…</p>',
'<p class="small">Unified front idle with its original upper-lid blink schedule, accepted grounded glide and fast bow-wave, immediate jump and landing. One-frame in-place airborne deformation is a review candidate until a dedicated midair PNG is authorized. Human verdict pending.</p>',
'</aside></main>'
].join('');
const q=s=>app.querySelector(s);
const params=new URLSearchParams(location.search);
const rev=params.get('rev')||'',cache=rev?'?rev='+encodeURIComponent(rev):'';
const canvas=q('#stage'),controller=new SerinUnifiedLocomotion();
let axis=0,demo=false,demoTime=0,running=true,frameTime=0,pendingJump=false,manualBlinkStart=Number.NaN;
const setAxis=n=>{demo=false;axis=n;q('#throttle').value=String(n);};
q('#start').onclick=()=>setAxis(1);q('#reverse').onclick=()=>setAxis(-1);
q('#stop').onclick=()=>setAxis(0);q('#jump').onclick=()=>{pendingJump=true;};
q('#blink-now').onclick=()=>{manualBlinkStart=controller.time*1000;};
q('#reset').onclick=()=>{setAxis(0);pendingJump=false;controller.reset();};
q('#demo').onclick=()=>{controller.reset();axis=0;demo=true;demoTime=0;q('#throttle').value='0';};
q('#throttle').oninput=e=>setAxis(Number(e.target.value));
q('#profiles').onclick=()=>location.assign('./motion.html');
q('#animation').onchange=e=>location.assign('./motion.html?procedural='+encodeURIComponent(e.target.value));
const held=new Set();
addEventListener('keydown',e=>{if(e.target.matches('input,select'))return;
 if(['ArrowLeft','ArrowRight','ArrowUp','Space','KeyS'].includes(e.code)){
  e.preventDefault();if((e.code==='Space'||e.code==='ArrowUp')&&!held.has(e.code))pendingJump=true;
  held.add(e.code);
 }
});
addEventListener('keyup',e=>held.delete(e.code));addEventListener('blur',()=>{held.clear();pendingJump=false;});
function fail(e){running=false;q('#error').hidden=false;q('#error').textContent=String(e?.stack||e);q('#status').textContent='FAILED CLOSED';}
function compile(gl,type,src){const shader=gl.createShader(type);gl.shaderSource(shader,src);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;}
const vertex=['attribute vec2 aPos;','varying vec2 vUv;','void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.0,1.0);}'].join('\n');
const fragment=[
'precision highp float;',
'varying vec2 vUv;',
'uniform sampler2D uIdle;',
'uniform sampler2D uGlide;',
'uniform float uPoseBlend;',
'uniform float uSourceMode;',
'uniform float uPitch;',
'uniform float uSlosh;',
'uniform float uPhase;',
'uniform float uWake;',
'uniform float uFacing;',
'uniform float uFrameScale;',
'uniform float uWavePhase;',
'uniform float uEdgePhase;',
'uniform float uWaveAmplitude;',
'uniform float uCrest;',
'uniform float uCrestCenter;',
'uniform float uForwardLean;',
'uniform float uJumpY;',
'uniform float uAirShape;',
'uniform float uFlightTrail;',
'uniform float uLanding;',
'uniform float uBlink;',
'uniform float uIdleTime;',
'uniform vec4 uEyeLeft;',
'uniform vec4 uEyeRight;',
'uniform vec2 uEyeSlants;',
'uniform float uShapeProgress;',
'uniform float uReverseBend;',
'vec4 applyBlinkDeform(vec4 base,vec2 uv,vec4 eye,float slope,float closing){',
'  if(closing<=0.0001)return base;',
'  vec2 d=vec2((uv.x-eye.x)/eye.z,(uv.y-eye.y)/eye.w);',
'  d.y-=slope*d.x;',
'  float wing=1.0-smoothstep(0.76,1.0,abs(d.x));',
'  float topBoundary=-1.12;',
'  float corner=pow(min(abs(d.x),1.0),1.6);',
'  float upperEdge=-0.39+0.16*corner;',
'  float lowerEdge=0.43-0.10*corner;',
'  if(wing<=0.0001 || d.y<=topBoundary || d.y>=lowerEdge)return base;',
'  float lidY=mix(upperEdge,lowerEdge,closing*wing);',
'  // Upper lid travels down: expand the original painted lid tissue from',
'  // [topBoundary,upperEdge] into [topBoundary,lidY]. No pixels manufactured.',
'  float sourceY;',
'  if(d.y<lidY){',
'    sourceY=topBoundary+',
'       (d.y-topBoundary)*(upperEdge-topBoundary)/max(0.00001,lidY-topBoundary);',
'  }else{',
'    // The uncovered eye contracts toward the stationary lower lid.',
'    sourceY=upperEdge+',
'       (d.y-lidY)*(lowerEdge-upperEdge)/max(0.00001,lowerEdge-lidY);',
'  }',
'  // At closure=0 the source mapping is identity, and the outside remains',
'  // untouched. At closure=1 the iris disappears beneath the moving upper lid.',
'  vec2 movedUv=vec2(uv.x,clamp(uv.y+(sourceY-d.y)*eye.w,0.001,0.999));',
'  return texture2D(uIdle,vec2(movedUv.x,1.0-movedUv.y));',
'}',
'void main(){',
' // Fixed native pixel scale with 359 px camera headroom for the jump apex.',
' vec2 canvasP=vec2(vUv.x,1.0-vUv.y);',
' vec2 groundP=vec2(canvasP.x,(canvasP.y*1895.0-359.0)/1536.0);',
' vec2 p=groundP+vec2(0.0,uJumpY/1536.0);',
' // Both authored poses are nearly edge-to-edge. Reserve the same safe area',
' // before pitch/flow so neither horn nor pool gets clipped by the stage.',
' vec2 framed=(p-vec2(0.5,0.5))/uFrameScale+vec2(0.5,0.5);',
' // Sampling guards below preserve alpha outside the authored source rectangles.',
' p=framed;',
' // Never flip the entire sprite when reversing. She slides backwards.',
' // Pool is a fixed world anchor. Only anatomy above waist rotates.',
' // Rotate the anatomical center mildly, not the entire hair and silhouette.',
' float waistField=(1.0-smoothstep(0.48,0.70,p.y))*smoothstep(0.28,0.44,p.x);',
' float shoulderField=(1.0-smoothstep(0.26,0.42,p.y))*smoothstep(0.32,0.48,p.x);',
' float upper=clamp(0.88*waistField+0.42*shoulderField,0.0,1.0);',
' vec2 pivot=vec2(0.55,0.57);',
' // Texture-space inverse rotation: negative angle moves the visible head',
' // to screen-right. Positive made her lean away from forward travel.',
' float angle=radians(-(uForwardLean*0.88+uPitch*0.05-uReverseBend*0.78));',
' vec2 local=p-pivot;',
' vec2 turned=vec2(cos(angle)*local.x-sin(angle)*local.y,sin(angle)*local.x+cos(angle)*local.y)+pivot;',
' vec2 warp=mix(p,turned,upper);',
' // Symmetric two-sided SOURCE-SPACE deformation toward one middle shape.',
' // Source switches only at a 58/42 hysteretic mid-motion threshold.',
' float morph=sin(3.14159265*clamp(uShapeProgress,0.0,1.0));',
' float torso=clamp(waistField+shoulderField*0.45,0.0,1.0);',
' float head=smoothstep(0.36,0.52,p.x)*(1.0-smoothstep(0.25,0.56,p.y));',
' float side=uSourceMode>0.5?-1.0:1.0;',
' warp.x+=side*morph*(0.028*head+0.018*torso);',
' warp.y+=side*morph*(0.010*head+0.006*torso);',
' // On reverse, the ACTUAL source silhouette bows back a little.',
' // Suppress this below the waist and at the grounded pool edge.',
' warp.x+=uReverseBend*(0.004*head+0.003*torso);',
' warp.y-=uReverseBend*0.0015*torso;',
' // During flight the existing single pose becomes a coalesced liquid shape.',
' // The bottom pool stays in stage space, not attached under her in the air.',
' float flight=clamp(uAirShape,0.0,1.0);',
' float coil=smoothstep(0.55,0.76,p.y)*(1.0-smoothstep(0.88,0.96,p.y));',
' warp.x=mix(warp.x,0.53+(warp.x-0.53)*0.73,coil*flight);',
' warp.x+=uFlightTrail*coil*(0.015+0.006*sin(uWavePhase+p.y*17.0));',
' warp.y-=uLanding*0.019*(1.0-smoothstep(0.60,0.82,p.y));',
' // Front idle retains her slow hair inertia and column breathing beneath',
' // the faster crest/wake system, without altering the accepted wave formula.',
' float idleWeight=1.0-clamp(uShapeProgress,0.0,1.0);',
' float idleHair=(1.0-smoothstep(0.40,0.70,p.x))*smoothstep(0.01,0.13,p.y)*(1.0-smoothstep(0.48,0.70,p.y));',
' warp.x+=idleWeight*idleHair*(0.010*sin(uIdleTime+p.y*15.0+p.x*4.0)+0.005*sin(2.0*uIdleTime-p.y*29.0));',
' warp.x+=idleWeight*coil*0.011*sin(uIdleTime+p.y*8.0);',
' // Reverse is deliberately quiet: keep the fluid pool active but cap',
' // hair/tail deformation instead of mirroring or wobbling the whole body.',
' float detailMotion=uFacing<0.0?0.12:1.0;',
' // Hair lags in acceleration and braking; jewelry/body do not globally melt.',
' float hair=(1.0-smoothstep(0.64,0.85,p.x))*smoothstep(0.01,0.13,p.y)*(1.0-smoothstep(0.42,0.65,p.y));',
' warp.x+=detailMotion*(0.016*uSlosh+0.003*sin(uPhase*.7+p.y*18.0)*uWake)*hair;',
' // Liquid keeps traveling inside its silhouette, even as root speed decays.',
' float tail=smoothstep(0.50,0.72,p.y)*(1.0-smoothstep(0.91,0.99,p.y));',
' warp.x+=detailMotion*tail*(0.016*uSlosh+0.009*sin(uPhase+p.y*9.0)*uWake);',
' // Faster wave motion, concentrated at pool perimeter.',
' float puddle=smoothstep(0.75,0.88,p.y);',
' float bow=exp(-pow((p.x-uCrestCenter)*9.0,2.0))*smoothstep(0.78,0.85,p.y)*(1.0-smoothstep(0.97,1.0,p.y));',
' warp.y+=puddle*uWaveAmplitude*(0.65*sin(uWavePhase+p.x*20.0)+0.35*sin(uEdgePhase+p.x*37.0))-uCrest*bow;',
' warp.x+=puddle*uWaveAmplitude*0.45*sin(uWavePhase*0.8+p.y*12.0);',
' float radius=length(vec2(p.x-0.52,2.1*(p.y-0.94)));',
' warp.x+=puddle*0.004*uWake*sin(radius*43.0+uPhase);',
' // One pixel scale for all assets: source-native geometry and a shared',
' // bottom-aligned world surface, no per-frame zoom or independent bbox fitting.',
' vec2 idlePx=vec2(warp.x*1086.0,warp.y*1536.0-88.0);',
' vec2 glidePx=vec2(warp.x*1086.0-31.0,warp.y*1536.0);',
' bool inIdle=idlePx.x>=0.0&&idlePx.x<1086.0&&idlePx.y>=0.0&&idlePx.y<1448.0;',
' bool inGlide=glidePx.x>=0.0&&glidePx.x<1024.0&&glidePx.y>=0.0&&glidePx.y<1536.0;',
' vec4 idle=inIdle?texture2D(uIdle,vec2(idlePx.x/1086.0,1.0-idlePx.y/1448.0)):vec4(0.0);',
' vec4 glide=inGlide?texture2D(uGlide,vec2(glidePx.x/1024.0,1.0-glidePx.y/1536.0)):vec4(0.0);',
' vec4 result=uSourceMode>0.5?glide:idle; // one latched source, no repeated threshold swaps',
' if(uSourceMode<0.5&&uBlink>0.001&&inIdle){',
'   vec2 eye=vec2(idlePx.x/1086.0,idlePx.y/1448.0);',
'   result=applyBlinkDeform(result,eye,uEyeLeft,uEyeSlants.x,uBlink);',
'   result=applyBlinkDeform(result,eye,uEyeRight,uEyeSlants.y,uBlink);',
' }',
' // Aerial fluid tapers before the source PNG pool. No arbitrary per-pose resize.',
' float lower=smoothstep(0.73,0.88,p.y);',
' result.a*=1.0-flight*lower;',
' // Preserve a ground-attached residual puddle while the body leaves it.',
' // This uses the SAME authorized source image, never a painted replacement.',
' float groundPoolMask=smoothstep(0.85,0.93,groundP.y);',
' vec2 poolWarp=vec2(groundP.x+0.004*uWaveAmplitude*sin(uWavePhase+groundP.x*20.0),groundP.y);',
' vec2 idleFloor=vec2(poolWarp.x*1086.0,poolWarp.y*1536.0-88.0);',
' vec2 glideFloor=vec2(poolWarp.x*1086.0-31.0,poolWarp.y*1536.0);',
' bool floorIdle=idleFloor.x>=0.0&&idleFloor.x<1086.0&&idleFloor.y>=0.0&&idleFloor.y<1448.0;',
' bool floorGlide=glideFloor.x>=0.0&&glideFloor.x<1024.0&&glideFloor.y>=0.0&&glideFloor.y<1536.0;',
' vec4 puddleIdle=floorIdle?texture2D(uIdle,vec2(idleFloor.x/1086.0,1.0-idleFloor.y/1448.0)):vec4(0.0);',
' vec4 puddleGlide=floorGlide?texture2D(uGlide,vec2(glideFloor.x/1024.0,1.0-glideFloor.y/1536.0)):vec4(0.0);',
' vec4 residual=uSourceMode>0.5?puddleGlide:puddleIdle;',
' residual.a*=flight*groundPoolMask*0.60;',
' result.rgb=mix(residual.rgb,result.rgb,result.a);',
' result.a=result.a+residual.a*(1.0-result.a);',
' if(uSourceMode<0.5){',
'   float star=0.5+0.5*sin(2.0*uIdleTime+idlePx.y*0.022);',
'   result.rgb+=vec3(0.027,0.009,0.048)*star*(1.0-flight)*result.a;',
' }',
' if(result.a<0.003)result=vec4(0.0);',
' gl_FragColor=result;',
'}'
].join('\n');
async function loadAuthorized(path,sha,dimensions){
 const r=await fetch('./'+path+cache,{cache:'no-store'});
 if(!r.ok)throw Error('SOURCE_MISSING '+path+' HTTP '+r.status);
 const bytes=await r.arrayBuffer();
 if(!crypto?.subtle)throw Error('Browser SHA verifier unavailable');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
 if(digest!==sha)throw Error('SOURCE_SHA256_MISMATCH '+path+': '+digest);
 const b=new Uint8Array(bytes),u32=i=>(b[i]*16777216+b[i+1]*65536+b[i+2]*256+b[i+3])>>>0;
 if(b.length<26||b[0]!==137||b[1]!==80||b[2]!==78||b[3]!==71||b[25]!==6||u32(16)!==dimensions[0]||u32(20)!==dimensions[1])throw Error('SOURCE_NOT_EXPECTED_RGBA_PNG '+path);
 const src=URL.createObjectURL(new Blob([bytes],{type:'image/png'}));
 try{const img=new Image();img.src=src;await img.decode();return img;}finally{URL.revokeObjectURL(src);}
}
async function boot(){
 const r=await fetch('./assets/serin-glide/unified-locomotion.recipe.json'+cache,{cache:'no-store'});
 if(!r.ok)throw Error('GLIDE_RECIPE_MISSING');
 const recipe=await r.json();
 if(recipe.schema!=='pose-lab-v2-serin-unified-v1'||recipe.source.idle.sha256!=='00ba472a4ee922a0840a3d63a71deafd054a3f91514480bab7918e94afab307f'||!(/^[0-9a-f]{64}$/.test(recipe.source.glide.sha256))||recipe.presentation?.safeFrameScale!==1)throw Error('GLIDE_RECIPE_SOURCE_CONTRACT_MISMATCH');
 const frontRecipe=await fetch('./assets/serin/idle.recipe.json'+cache,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('FRONT_BLINK_RECIPE_MISSING');return r.json();});
 if(frontRecipe.source.sha256!==recipe.source.idle.sha256||!verifyBlinkSpec(frontRecipe.blink))throw Error('FRONT_IDLE_BLINK_AUTHORITY_MISMATCH');
 const [idle,glide]=await Promise.all([loadAuthorized(recipe.source.idle.file,recipe.source.idle.sha256,recipe.source.idle.size),loadAuthorized(recipe.source.glide.file,recipe.source.glide.sha256,recipe.source.glide.size)]);
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false});
 if(!gl)throw Error('WebGL needed for dynamic slosh');
 const prog=gl.createProgram();
 gl.attachShader(prog,compile(gl,gl.VERTEX_SHADER,vertex));
 gl.attachShader(prog,compile(gl,gl.FRAGMENT_SHADER,fragment));
 gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
 gl.useProgram(prog);
 gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const a=gl.getAttribLocation(prog,'aPos');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 for(const [i,img] of [[0,idle],[1,glide]]){
  gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
 }
 if(gl.getError()!==gl.NO_ERROR)throw Error('TEXTURE_UPLOAD_FAILED');
 const loc=name=>gl.getUniformLocation(prog,name);
 gl.uniform1i(loc('uIdle'),0);gl.uniform1i(loc('uGlide'),1);
 const out=Object.fromEntries(['PoseBlend','SourceMode','Pitch','Slosh','Phase','Wake','Facing','WavePhase','EdgePhase','WaveAmplitude','Crest','CrestCenter','ForwardLean','ShapeProgress','ReverseBend','JumpY','AirShape','FlightTrail','Landing','Blink','IdleTime'].map(k=>[k,loc('u'+k)]));
 const eyeVec=e=>new Float32Array([e.x/1086,e.y/1448,e.rx/1086,e.ry/1448]);
 gl.uniform4fv(loc('uEyeLeft'),eyeVec(frontRecipe.blink.leftEye));
 gl.uniform4fv(loc('uEyeRight'),eyeVec(frontRecipe.blink.rightEye));
 gl.uniform2f(loc('uEyeSlants'),frontRecipe.blink.leftEye.slant,frontRecipe.blink.rightEye.slant);
 gl.uniform1f(loc('uFrameScale'),recipe.presentation.safeFrameScale);
 gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);
 function frame(now){
  if(!running)return;
  const dt=frameTime?Math.min((now-frameTime)/1000,0.05):0;frameTime=now;
  let drive=axis;
  if(demo){demoTime+=dt;drive=demoAxis(demoTime);if(demoTime>=DEMO_DURATION_SECONDS){demo=false;drive=0;axis=0;}}
  else if(held.has('KeyS'))drive=0;
  else if(held.has('ArrowRight'))drive=1;
  else if(held.has('ArrowLeft'))drive=-1;
  const s=controller.update(dt,drive,pendingJump);
  pendingJump=false;
  gl.clear(gl.COLOR_BUFFER_BIT);
  for(const k of ['PoseBlend','SourceMode','Pitch','Slosh','Phase','Wake','Facing','WavePhase','EdgePhase','WaveAmplitude','Crest','CrestCenter','ForwardLean','ShapeProgress','ReverseBend','JumpY','AirShape','FlightTrail','Landing','Blink','IdleTime']){const fields={PoseBlend:'poseBlend',SourceMode:'sourceMode',Pitch:'pitch',Slosh:'slosh',Phase:'phase',Wake:'wake',Facing:'facing',WavePhase:'wavePhase',EdgePhase:'edgePhase',WaveAmplitude:'waveAmplitude',Crest:'crest',CrestCenter:'crestCenter',ForwardLean:'forwardLean',ShapeProgress:'shapeProgress',ReverseBend:'reverseBend',JumpY:'jumpY',AirShape:'airShape',FlightTrail:'flightTrail',Landing:'landCompression',Blink:'blink',IdleTime:'idleTime'};const value=k==='Blink'?Math.max(scheduledBlink(s.time*1000,frontRecipe.blink),manualBlink(s.time*1000,manualBlinkStart,frontRecipe.blink.manual)):k==='IdleTime'?s.time*(2*Math.PI/9.8):s[fields[k]];gl.uniform1f(out[k],value);continue;}
  gl.drawArrays(gl.TRIANGLES,0,6);
  q('#status').textContent='SOURCE '+(s.sourceMode?'GLIDE 8c0d9b48':'FRONT IDLE 00ba472a')+' | changes '+s.sourceSwitchCount+' | bend '+s.forwardLean.toFixed(1)+'° | reverse '+s.reverseBend.toFixed(1)+'° | shape '+s.shapeProgress.toFixed(2)+' | Jump '+(s.inAir?'AIR':'GROUND')+' '+s.jumpY.toFixed(0)+'px | from '+s.jumpFrom+' | land '+s.landingCount+' | Mode '+s.mode+' | velocity '+s.velocity.toFixed(1)+' | pitch '+s.pitch.toFixed(1)+'° | slosh '+s.slosh.toFixed(3)+' | pose '+s.poseBlend.toFixed(2)+' | crest '+s.crest.toFixed(3)+' | ripple '+s.waveAmplitude.toFixed(3)+' | world X '+s.position.toFixed(1);
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}
boot().catch(fail);

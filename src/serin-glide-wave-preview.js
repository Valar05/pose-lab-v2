import {SerinGlideWaveController,demoAxis,DEMO_DURATION_SECONDS} from './serin-glide-wave-system.mjs';
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
'<header><strong>Pose Lab V2 · Serin Wave Glide</strong><span>PHYSICS-DRIVEN</span>',
'<select aria-label="Animation" id="animation"><option value="serin-glide-wave">Wave Glide</option><option value="serin-back-idle">Back Idle</option><option value="serin-idle">Front Idle</option></select>',
'<button id="profiles">Profiles</button></header>',
'<main><section class="stage" aria-label="Serin glide preview">',
'<canvas width="768" height="1086" id="stage" role="img" aria-label="Serin glides right, sloshes, then settles into idle"></canvas>',
'<p id="error" class="error" role="alert" hidden></p></section>',
'<aside class="side"><strong>Game-driven locomotion</strong>',
'<p class="small">Idle → accelerate/pitch → glide → brake/slosh → idle. Game owns world position; this lab pins the sprite for inspection.</p>',
'<div class="controls"><button id="start">Glide right</button><button id="stop">Stop / slosh</button><button id="reverse">Reverse</button><button id="demo">Demo: idle → glide → idle</button><button id="reset">Reset to idle</button></div>',
'<label for="throttle">Input axis</label><input type="range" id="throttle" min="-1" max="1" value="0" step="0.05">',
'<p class="small">Arrow keys move. Space brakes. On a phone, use the buttons or slider. The demo is optional; this is not a sprite-frame animation loop.</p>',
'<p class="status" id="status">Checking approved source hashes…</p>',
'<p class="small">Faster dynamic puddle currents, a leading bow crest, and forward torso lean. One body at a time, no arbitrary 84% shrink. Human visual verdict pending.</p>',
'</aside></main>'
].join('');
const q=s=>app.querySelector(s);
const params=new URLSearchParams(location.search);
const rev=params.get('rev')||'',cache=rev?'?rev='+encodeURIComponent(rev):'';
const canvas=q('#stage'),controller=new SerinGlideWaveController();
let axis=0,demo=false,demoTime=0,running=true,frameTime=0;
const setAxis=n=>{demo=false;axis=n;q('#throttle').value=String(n);};
q('#start').onclick=()=>setAxis(1);q('#reverse').onclick=()=>setAxis(-1);
q('#stop').onclick=()=>setAxis(0);q('#reset').onclick=()=>{setAxis(0);controller.reset();};
q('#demo').onclick=()=>{controller.reset();axis=0;demo=true;demoTime=0;q('#throttle').value='0';};
q('#throttle').oninput=e=>setAxis(Number(e.target.value));
q('#profiles').onclick=()=>location.assign('./motion.html');
q('#animation').onchange=e=>location.assign('./motion.html?procedural='+encodeURIComponent(e.target.value));
const held=new Set();
addEventListener('keydown',e=>{if(e.target.matches('input,select'))return;
 if(['ArrowLeft','ArrowRight','Space'].includes(e.code)){e.preventDefault();held.add(e.code);}
});
addEventListener('keyup',e=>held.delete(e.code));addEventListener('blur',()=>held.clear());
function fail(e){running=false;q('#error').hidden=false;q('#error').textContent=String(e?.stack||e);q('#status').textContent='FAILED CLOSED';}
function compile(gl,type,src){const shader=gl.createShader(type);gl.shaderSource(shader,src);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;}
const vertex=['attribute vec2 aPos;','varying vec2 vUv;','void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.0,1.0);}'].join('\n');
const fragment=[
'precision highp float;',
'varying vec2 vUv;',
'uniform sampler2D uIdle;',
'uniform sampler2D uGlide;',
'uniform float uPoseBlend;',
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
'void main(){',
' vec2 p=vec2(vUv.x,1.0-vUv.y);',
' // Both authored poses are nearly edge-to-edge. Reserve the same safe area',
' // before pitch/flow so neither horn nor pool gets clipped by the stage.',
' vec2 framed=(p-vec2(0.5,0.5))/uFrameScale+vec2(0.5,0.5);',
' if(framed.x<0.0||framed.y<0.0||framed.x>1.0||framed.y>1.0){gl_FragColor=vec4(0.0);return;}',
' p=framed;',
' if(uFacing<0.0)p.x=1.0-p.x;',
' // Pool is a fixed world anchor. Only anatomy above waist rotates.',
' float upper=1.0-smoothstep(0.50,0.77,p.y);',
' vec2 pivot=vec2(0.55,0.57);',
' float angle=radians(uForwardLean+uPitch*0.2);',
' vec2 local=p-pivot;',
' vec2 turned=vec2(cos(angle)*local.x-sin(angle)*local.y,sin(angle)*local.x+cos(angle)*local.y)+pivot;',
' vec2 warp=mix(p,turned,upper);',
' // Deform both source silhouettes toward each other around a single handoff.',
' float handoff=1.0-smoothstep(0.0,0.5,abs(uPoseBlend-0.5));',
' float torso=(1.0-smoothstep(0.42,0.72,p.y))*smoothstep(0.22,0.40,p.x);',
' warp.x+=handoff*torso*(uPoseBlend<0.5?0.018:-0.018);',
' warp.y+=handoff*torso*(uPoseBlend<0.5?0.008:-0.008);',
' // Hair lags in acceleration and braking; jewelry/body do not globally melt.',
' float hair=(1.0-smoothstep(0.64,0.85,p.x))*smoothstep(0.01,0.13,p.y)*(1.0-smoothstep(0.42,0.65,p.y));',
' warp.x+=(0.016*uSlosh+0.003*sin(uPhase*.7+p.y*18.0)*uWake)*hair;',
' // Liquid keeps traveling inside its silhouette, even as root speed decays.',
' float tail=smoothstep(0.50,0.72,p.y)*(1.0-smoothstep(0.91,0.99,p.y));',
' warp.x+=tail*(0.016*uSlosh+0.009*sin(uPhase+p.y*9.0)*uWake);',
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
' vec4 result=uPoseBlend<0.5?idle:glide; // no ghosted double anatomy',
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
 const r=await fetch('./assets/serin-glide/wave-locomotion.recipe.json'+cache,{cache:'no-store'});
 if(!r.ok)throw Error('GLIDE_RECIPE_MISSING');
 const recipe=await r.json();
 if(recipe.schema!=='pose-lab-v2-serin-wave-v2'||recipe.source.idle.sha256!=='00ba472a4ee922a0840a3d63a71deafd054a3f91514480bab7918e94afab307f'||!(/^[0-9a-f]{64}$/.test(recipe.source.glide.sha256))||recipe.presentation?.safeFrameScale!==1)throw Error('GLIDE_RECIPE_SOURCE_CONTRACT_MISMATCH');
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
 const out=Object.fromEntries(['PoseBlend','Pitch','Slosh','Phase','Wake','Facing','WavePhase','EdgePhase','WaveAmplitude','Crest','CrestCenter','ForwardLean'].map(k=>[k,loc('u'+k)]));
 gl.uniform1f(loc('uFrameScale'),recipe.presentation.safeFrameScale);
 gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);
 function frame(now){
  if(!running)return;
  const dt=frameTime?Math.min((now-frameTime)/1000,0.05):0;frameTime=now;
  let drive=axis;
  if(demo){demoTime+=dt;drive=demoAxis(demoTime);if(demoTime>=DEMO_DURATION_SECONDS){demo=false;drive=0;axis=0;}}
  else if(held.has('Space'))drive=0;
  else if(held.has('ArrowRight'))drive=1;
  else if(held.has('ArrowLeft'))drive=-1;
  const s=controller.update(dt,drive);
  gl.clear(gl.COLOR_BUFFER_BIT);
  for(const k of ['PoseBlend','Pitch','Slosh','Phase','Wake','Facing','WavePhase','EdgePhase','WaveAmplitude','Crest','CrestCenter','ForwardLean']){const fields={PoseBlend:'poseBlend',Pitch:'pitch',Slosh:'slosh',Phase:'phase',Wake:'wake',Facing:'facing',WavePhase:'wavePhase',EdgePhase:'edgePhase',WaveAmplitude:'waveAmplitude',Crest:'crest',CrestCenter:'crestCenter',ForwardLean:'forwardLean'};gl.uniform1f(out[k],s[fields[k]]);}
  gl.drawArrays(gl.TRIANGLES,0,6);
  q('#status').textContent='Mode '+s.mode+' | velocity '+s.velocity.toFixed(1)+' | pitch '+s.pitch.toFixed(1)+'° | slosh '+s.slosh.toFixed(3)+' | pose '+s.poseBlend.toFixed(2)+' | crest '+s.crest.toFixed(3)+' | ripple '+s.waveAmplitude.toFixed(3)+' | world X '+s.position.toFixed(1);
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}
boot().catch(fail);

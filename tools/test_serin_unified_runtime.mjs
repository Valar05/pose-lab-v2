import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const read=p=>fs.readFileSync(p,'utf8');
const recipe=JSON.parse(read('public/assets/serin-glide/unified-locomotion.recipe.json'));
const config=JSON.parse(read('campaigns/serin-unified-locomotion-v1.contract.json'));
const blinkRecipe=JSON.parse(read('public/assets/serin/idle.recipe.json'));
const shader=read('src/serin-unified-preview.js');
const ground=read('src/serin-glide-wave-preview.js');
const originalBlink=read('src/serin-idle-preview.js');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(recipe.schema,'pose-lab-v2-serin-unified-v1');
assert.equal(recipe.rootMotion,false);assert.equal(recipe.jump.takeoffDelayMs,0);
assert.equal(recipe.presentation.safeFrameScale,1);
assert.equal(recipe.presentation.additionalHeadroomPixels,359);
assert.equal(recipe.source.idle.sha256,blinkRecipe.source.sha256);
assert.equal(recipe.source.idle.sha256,config.authority.idleSHA256);
assert.equal(recipe.source.glide.sha256,config.authority.glideSHA256);
assert.equal(sha(fs.readFileSync('public/assets/serin/serin-idle.png')),recipe.source.idle.sha256);
assert.equal(sha(fs.readFileSync('public/assets/serin-glide/serin-glide-wave-v2.png')),recipe.source.glide.sha256);
assert.equal(recipe.aerialArt.dedicatedMidairPNG,null,'no fabricated source art');
assert.ok(read('motion.html').includes("procedural === 'serin-unified'"));
assert.ok(read('src/procedural-review-shell.js').includes("['serin-unified','Unified Locomotion']"));
for(const name of ["id=\"jump\"","id=\"blink-now\"","id=\"start\"","id=\"reverse\"",
"controller.update(dt,drive,pendingJump)","uJumpY","uAirShape","uFlightTrail","uLanding",
"uEyeLeft","uEyeRight","uEyeSlants","scheduledBlink(","manualBlink(","verifyBlinkSpec(",
"canvasP.y*1895.0-359.0","float groundPoolMask=smoothstep(0.85,0.93,groundP.y)",
"gl.clearColor(0,0,0,0)","uSourceMode>0.5?glide:idle"])
 assert.ok(shader.includes(name),'MISSING_UNIFIED_BEHAVIOR '+name);
// The exact approved front-upper-lid inverse-pixel method remains the source.
const start='vec4 applyBlinkDeform';
const method=originalBlink.slice(originalBlink.indexOf(start),originalBlink.indexOf('void main(){',originalBlink.indexOf(start))).trimEnd();
const port=shader.slice(shader.indexOf("'"+start),shader.indexOf("'void main(){',",shader.indexOf("'"+start)));
const decoded=port.split('\n').map(l=>l.trim().replace(/^'/,'').replace(/',?$/,'').replace(/\\'/g,"'")).join('\n');
assert.ok(decoded.includes('vec4 applyBlinkDeform'));
for(const l of ['float lidY=mix(upperEdge,lowerEdge,closing*wing);',
'sourceY=topBoundary+',
'return texture2D(uIdle,vec2(movedUv.x,1.0-movedUv.y));'])
 assert.ok(decoded.includes(l),'UPPER_LID_BEHAVIOR_DRIFT '+l);
assert.ok(method.includes('return texture2D(uImage,vec2(movedUv.x,1.0-movedUv.y));'));
assert.equal(blinkRecipe.blink.leftEye.x,668);
assert.equal(blinkRecipe.blink.rightEye.x,713);
assert.ok(shader.includes('eyeVec(frontRecipe.blink.leftEye)'),'eyes from real recipe');
assert.ok(!shader.includes('mix(idle,glide,'),'no old whole-image crossfade');
// Preserve every accepted shader ripple statement and state handoff verbatim.
for(const x of [
'warp.y+=puddle*uWaveAmplitude*(0.65*sin(uWavePhase+p.x*20.0)+0.35*sin(uEdgePhase+p.x*37.0))-uCrest*bow;',
'warp.x+=puddle*uWaveAmplitude*0.45*sin(uWavePhase*0.8+p.y*12.0);',
'float bow=exp(-pow((p.x-uCrestCenter)*9.0,2.0))*smoothstep(0.78,0.85,p.y)*(1.0-smoothstep(0.97,1.0,p.y));',
'warp.x+=side*morph*(0.028*head+0.018*torso);',
'vec2 idlePx=vec2(warp.x*1086.0,warp.y*1536.0-88.0);',
'vec2 glidePx=vec2(warp.x*1086.0-31.0,warp.y*1536.0);'])
 assert.ok(ground.includes(x)&&shader.includes(x),'LOCKED_GROUND_ANIMATION_CHANGED '+x);
const script=read('tools/campaigns/serin-unified-locomotion-v1.sh');
assert.ok(script.includes('pose_campaign_boot')&&script.includes('pose_campaign_verify'));
assert.ok(script.includes('SERIN_UNIFIED_TRANSPORT=PASS'));
assert.ok(script.includes('NO_OP_ALREADY_APPLIED'));
assert.ok(!script.includes('serin-glide-wave-authorize.mjs'),'no fresh image ingress');
console.log('SERIN_UNIFIED_SOURCE_BLINK_GROUND_WAVE_AND_STAGE_PASS');

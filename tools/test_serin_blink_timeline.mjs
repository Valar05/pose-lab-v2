// Deterministic Serin blink timing and scope contract.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {scheduledBlink,manualBlink,blinkPulse,verifyBlinkSpec} from '../src/serin-blink-timeline.mjs';
const root=new URL('../',import.meta.url);
const recipe=JSON.parse(fs.readFileSync(new URL('public/assets/serin/idle.recipe.json',root),'utf8'));
const spec=recipe.blink;
assert.equal(verifyBlinkSpec(spec),true);
assert.equal(recipe.poseFrames,1);
assert.equal(recipe.rootMotion,false);
assert.equal(recipe.source.sha256,'00ba472a4ee922a0840a3d63a71deafd054a3f91514480bab7918e94afab307f');
assert.equal(scheduledBlink(0,spec),0);
assert.equal(spec.periodMs,22000);
assert.equal(spec.events.length,6);
assert.equal(scheduledBlink(4000,spec),0);
for(const e of spec.events){
 assert.equal(scheduledBlink(e.atMs,spec),0);
 assert.ok(scheduledBlink(e.atMs+e.closeMs*0.5,spec)>0.4);
 assert.equal(scheduledBlink(e.atMs+e.closeMs+e.holdMs*0.5,spec),1);
 assert.equal(scheduledBlink(e.atMs+e.closeMs+e.holdMs+e.openMs,spec),0);
}
for(const t of [0,1000,2250,9750,19950,21999])assert.equal(scheduledBlink(t,spec),scheduledBlink(t+spec.periodMs,spec));
for(let i=0;i<spec.events.length;i++){
 const prev=spec.events[i];const next=spec.events[(i+1)%spec.events.length];
 const gap=i===spec.events.length-1 ? spec.periodMs-prev.atMs+next.atMs : next.atMs-prev.atMs;
 assert.ok(gap<=6000,'blink too far apart');
}
assert.ok(spec.events[3].atMs-spec.events[2].atMs<500,'occasional double blink removed');
assert.equal(scheduledBlink(21999,spec),0);
assert.equal(scheduledBlink(22000,spec),0);
assert.equal(manualBlink(1000,Number.NaN,spec.manual),0);
assert.ok(manualBlink(1100,1000,spec.manual)>0.99);
assert.equal(manualBlink(1400,1000,spec.manual),0);
const src=fs.readFileSync(new URL('src/serin-idle-preview.js',root),'utf8');
assert.ok(src.includes("if(uBlink>0.001)"),'eyelid changes gated by nonzero blink');
assert.ok(src.includes('applyBlinkDeform(c,source,uEyeLeft'),'missing left eyelid deformation');
assert.ok(src.includes('applyBlinkDeform(c,source,uEyeRight'),'missing right eyelid deformation');
assert.ok(src.includes('if(d.y<lidY)'),'top eyelid must physically extend downward');
assert.ok(src.includes('return texture2D(uImage,vec2(movedUv.x,1.0-movedUv.y))'),'must deform approved pixel source');
assert.ok(!/cheekUv|covered\.rgb|vec3\(0\.21,0\.065,0\.14\)/.test(src),'paint-over blink must remain removed');
assert.ok(src.includes('return base;'),'non-eye shader remains identical at inactive blinks');
assert.ok(src.includes("gl.clearColor(0,0,0,0)"),'transparent shader clear preserved');
for(const exact of [
 '(0.012*sin(t+p.y*15.0+p.x*4.0)+0.006*sin(2.0*t-p.y*29.0))*hairRoot',
 'float tailBend=0.013*sin(t+p.y*8.0)+0.006*sin(2.0*t-p.y*17.0);',
 'vec2 poolWarp=vec2(0.004*cos(2.0*t+radial*42.0),0.0025*sin(2.0*t+radial*66.0))*poolMask*uCurrents;',
 'vec2 breath=vec2((p.x-0.60)*0.006*sin(t),0.0017*sin(t))*torsoMask;'
])assert.ok(src.includes(exact),'baseline Serin motion altered: '+exact);
console.log('SERIN_DENSE_UPPER_LID_DEFORMATION=PASS');
console.log('SERIN_BLINK_SCHEDULE=PASS');
console.log('SERIN_EXISTING_LIQUID_HAIR_UNCHANGED=PASS');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const text=p=>fs.readFileSync(p,'utf8');
const recipe=JSON.parse(text('public/assets/serin-glide/wave-locomotion.recipe.json'));
const contract=JSON.parse(text('campaigns/serin-glide-wave-locomotion-v2.contract.json'));
const preview=text('src/serin-glide-wave-preview.js'),script=text('tools/campaigns/serin-glide-wave-locomotion-v2.sh');
assert.equal(recipe.schema,'pose-lab-v2-serin-wave-v2');
assert.equal(recipe.rootMotion,false);
assert.equal(recipe.source.idle.sha256,contract.authority.idleSHA256);
assert.equal(recipe.source.glide.sha256,contract.authority.glideSHA256);
assert.equal(recipe.presentation.safeFrameScale,1);
assert.equal(recipe.presentation.noOpacityBlend,true);
assert.ok(text('motion.html').includes("procedural === 'serin-glide-wave'"));
assert.ok(text('src/procedural-review-shell.js').includes("['serin-glide-wave','Wave Glide']"));
for(const s of ['uWavePhase','uEdgePhase','uWaveAmplitude','uCrest','uCrestCenter','uForwardLean','uSourceMode>0.5?glide:idle','gl.clearColor(0,0,0,0)'])assert.ok(preview.includes(s),s);
assert.ok(!preview.includes('mix(idle,glide,'),'old RGBA crossfade must not return');
assert.ok(!preview.includes('uPoseBlend<0.5?idle:glide'),'avoid speed-threshold source thrash');
assert.ok(!preview.includes('p.x=1.0-p.x'),'do not mirror whole sprite on reverse');
assert.ok(preview.includes('float angle=radians(-(uForwardLean*0.88+uPitch*0.05-uReverseBend*0.78));'),'meaningful forward silhouette bend and restrained reverse');
assert.ok(preview.includes('float upper=clamp(0.88*waistField+0.42*shoulderField,0.0,1.0);'),'torso bend retained');
assert.ok(preview.includes('float torso=clamp(waistField+shoulderField*0.45,0.0,1.0);'),'localized but visible torso deformation');
assert.ok(preview.includes('warp.x+=side*morph*(0.028*head+0.018*torso);'),'symmetric geometric source-space handoff');
assert.ok(preview.includes('warp.x+=uReverseBend*(0.004*head+0.003*torso);'),'reverse sprite geometry changes');
const controller=text('src/serin-glide-wave-system.mjs');
assert.ok(controller.includes('this.shapeProgress=follow(this.shapeProgress,visualTarget,right?4.8:4.1,h);'));
assert.ok(controller.includes('if(this.shapeProgress>=0.58)next=1;'));
assert.ok(controller.includes('else if(this.shapeProgress<=0.42)next=0;'));
assert.ok(controller.includes('this.forwardLean=follow(this.forwardLean,8.6*this.shapeProgress,10,h);'));
assert.ok(controller.includes('this.reverseBend=follow(this.reverseBend,reverseTarget,backwards?9:7,h);'));
assert.ok(!controller.includes('this.crest<0.006'),'do not wait for dead-still water to switch source');
assert.ok(preview.includes('float detailMotion=uFacing<0.0?0.12:1.0;'),'reverse body motion subdued');
// The already praised fluid shader equations MUST remain byte-equivalent.
for(const wave of [
'warp.y+=puddle*uWaveAmplitude*(0.65*sin(uWavePhase+p.x*20.0)+0.35*sin(uEdgePhase+p.x*37.0))-uCrest*bow;',
'warp.x+=puddle*uWaveAmplitude*0.45*sin(uWavePhase*0.8+p.y*12.0);',
'float bow=exp(-pow((p.x-uCrestCenter)*9.0,2.0))*smoothstep(0.78,0.85,p.y)*(1.0-smoothstep(0.97,1.0,p.y));'
])assert.ok(preview.includes(wave),'locked-good ripple must be unmodified: '+wave);
const glideSHA='8c0d9b48d9522eae67cdea4a6d0d7b0e0d83ca6bfc235254bac8d8bf8c6f1ddc';
assert.equal(recipe.source.glide.sha256,glideSHA,'exact saved phone glide is the moving source');
assert.ok(preview.includes('GLIDE 8c0d9b48'),'review HUD identifies selected source');
assert.ok(preview.includes('vec2 idlePx=vec2(warp.x*1086.0,warp.y*1536.0-88.0);'));
assert.ok(preview.includes('vec2 glidePx=vec2(warp.x*1086.0-31.0,warp.y*1536.0);'));
assert.ok(preview.includes('vec4 idle=inIdle?texture2D'));
assert.ok(preview.includes('vec4 glide=inGlide?texture2D'));
assert.ok(!preview.includes('warp=clamp(warp,vec2(0.0005)'),'no edge smear of source alpha');
assert.ok(script.includes('pose_campaign_boot')&&script.includes('pose_campaign_push_and_readback'));
assert.ok(script.includes('wave-locomotion.recipe.json'));
assert.ok(script.includes('file_00000000b6ac81fbb8c9c9f85a645117.png'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(hash(fs.readFileSync('public/assets/serin/serin-idle.png')),contract.authority.idleSHA256);
const path='public/assets/serin-glide/serin-glide-wave-v2.png';
if(!fs.existsSync(path)){
 if(!process.argv.includes('--allow-pending-ingress'))throw Error('MISSING_AUTHORIZED_GLIDE_PNG');
 assert.equal(recipe.source.glide.sha256,'pending-phone-ingress');
 console.log('SERIN_WAVE_ASSET_PENDING_EXACT_PHONE_INGRESS');
}else{
 assert.match(recipe.source.glide.sha256,/^[a-f0-9]{64}$/);
 const png=fs.readFileSync(path);
 assert.equal(hash(png),recipe.source.glide.sha256);
 assert.equal(png.readUInt32BE(16),1024);
 assert.equal(png.readUInt32BE(20),1536);
 assert.equal(png[25],6);
 console.log('SERIN_WAVE_REPO_PNG_SHA256='+hash(png));
}
console.log('SERIN_WAVE_PREVIEW_SOURCE_CONTRACT_PASS');

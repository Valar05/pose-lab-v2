import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const config=JSON.parse(read('campaigns/serin-authored-jump-v1.contract.json'));
const recipe=JSON.parse(read('public/assets/serin-jump/unified-airborne.recipe.json'));
const shader=read('src/serin-unified-authored-preview.js');
const prior=read('src/serin-unified-preview.js');
const source='public/assets/serin-jump/serin-jump-airborne-v1.png';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const expected='dae365a6adf33bb3961df2a5cbeb21f53c37f1043124765511c7b8ef8015e453';
assert.equal(recipe.schema,'pose-lab-v2-serin-unified-authored-v1');
assert.equal(recipe.source.airborne.sha256,expected);
assert.equal(config.authority.sourceSHA256,expected);
assert.deepEqual(recipe.source.airborne.size,[1086,1448]);
assert.equal(recipe.source.airborne.alpha,true);
assert.equal(recipe.presentation.safeFrameScale,1);
assert.equal(recipe.jump.takeoffDelayMs,0);
assert.equal(recipe.jump.landingLockoutMs,0);
assert.equal(recipe.aerialArt.sourcePhonePath,config.authority.selectedOriginalPhonePath);
for(const z of ["'uniform sampler2D uAir;'","'uniform float uAirActive;'","' if(uAirActive>0.5){'",
"vec2 airPx=vec2(groundP.x*1086.0,groundP.y*1536.0-88.0+uJumpY)",
"loadAuthorized(recipe.source.airborne.file,recipe.source.airborne.sha256,recipe.source.airborne.size)",
"gl.uniform1i(loc('uAir'),2);","gl.uniform1f(loc('uAirActive'),s.inAir?1:0);",
"' vec2 p=groundP;'","' float flight=0.0;'","'uniform float uAirTime;'","'uniform float uAirVelocity;'","'uniform float uAirHorizontal;'","'uniform float uAirTrail;'"])
 assert.ok(shader.includes(z),'MISSING_NEW_FLIGHT_ASSERTION '+z);
const gate=shader.indexOf("' if(uAirActive>0.5){'");
const grounded=shader.indexOf("' // Both authored poses are nearly edge-to-edge");
assert.ok(gate>0&&grounded>gate);
assert.ok(shader.slice(gate,grounded).includes("'   return;'"),
  'Air pixels must exit shader before ground image, floor, alpha, or body warps');
assert.ok(!shader.includes('uFlightTrail*coil'),'rejected split-flight deformation must not operate');
// Regression: a full-body airborne sprite without active fluid motion is NOT complete.
for(const wire of ["gl.uniform1f(loc('uAirTime'),s.time);",
"gl.uniform1f(loc('uAirVelocity'),s.jumpVelocity/760);",
"gl.uniform1f(loc('uAirHorizontal'),s.velocity/controller.config.maxSpeed);",
"gl.uniform1f(loc('uAirTrail'),s.flightTrail);"])
 assert.ok(shader.includes(wire),'AIR_FLUID_UNWIRED '+wire);
for(const expression of ["sampleAt.x+=tail*","sampleAt.y+=tail*","sampleAt.x+=hair*",
"pow(current,7.0)*tail*violet","flying.rgb+=","uLanding*puddle*0.008"])
 assert.ok(shader.includes(expression),'NO_RENDERED_FLUID_EFFECT '+expression);
assert.ok(shader.includes('airValid?texture2D(uAir'), 'flight must animate the one existing PNG');
assert.ok(shader.includes('flying.a<0.003?vec4(0.0):flying'), 'glow must not escape source alpha');
assert.ok(!shader.includes('mix(idle,glide,'),'avoid image-source crossfades');
assert.ok(shader.includes("const s=controller.update(dt,drive,pendingJump);"),
 'existing immediate jump controller must remain in use');
assert.ok(shader.includes('gl.clearColor(0,0,0,0)'));
assert.ok(read('motion.html').includes("procedural === 'serin-unified-authored'"));
assert.ok(read('src/procedural-review-shell.js').includes("['serin-unified-authored','Authored Airborne']"));
assert.ok(prior.includes("const [idle,glide]=await Promise.all"),'previous unified sprite candidate must remain accessible');
const oldRecipe=JSON.parse(read('public/assets/serin-glide/unified-locomotion.recipe.json'));
assert.equal(oldRecipe.aerialArt.dedicatedMidairPNG,null,'prior route remains unchanged');
for(const item of config.machine.lockedFiles)assert.equal(sha(fs.readFileSync(item.path)),item.sha256,'LOCKED_IMAGE_DRIFT '+item.path);
if(fs.existsSync(source)){
 const bytes=fs.readFileSync(source);
 assert.equal(sha(bytes),expected,'accepted art byte drift');
 assert.equal(bytes.readUInt32BE(16),1086,'incorrect authored width');
 assert.equal(bytes.readUInt32BE(20),1448,'incorrect authored height');
 assert.equal(bytes[25],6,'incorrect PNG alpha color type');
 console.log('SERIN_AUTHORED_JUMP_EXACT_SOURCE_VERIFIED');
}else{
 console.log('SERIN_AUTHORED_JUMP_INGRESS_PENDING: artwork not yet in Git, runtime NOT ready');
}
console.log('SERIN_AUTHORED_JUMP_STATIC_AND_LOCKED_GATES_PASS');

// Test the production response curve itself, not duplicated test parameters.
const begin=shader.indexOf('function jumpReaction(');
const end=shader.indexOf("const app=document.querySelector",begin);
assert.ok(begin>=0&&end>begin,'REACTIVE_JUMP_FUNCTION_MISSING');
const react=vm.runInNewContext(shader.slice(begin,end)+'\njumpReaction;');
const takeoff=react(0,760,760);
const rebound=react(0.135,600,760);
const apex=react(760/1260,0,760);
const rise=react(0.4,700,760);
assert.ok(takeoff.squash>0.98&&takeoff.stretch===0&&takeoff.apex<0.01,'IMMEDIATE_SQUASH_MISSING');
assert.ok(rebound.squash<0.01&&rebound.stretch>0.30,'SPRING_RELEASE_MISSING');
assert.ok(apex.apex>0.98&&apex.squash===0,'APEX_GATHER_MISSING');
assert.ok(rise.apex<0.01,'GATHER_MUST_USE_VERTICAL_VELOCITY');
for(const token of ["'uniform float uLaunchSquash;'","'uniform float uLaunchStretch;'","'uniform float uApexGather;'",
  "gl.uniform1f(loc('uLaunchSquash'),response.squash);",
  "gl.uniform1f(loc('uLaunchStretch'),response.stretch);",
  "gl.uniform1f(loc('uApexGather'),response.apex);",
  'float elasticY=1.0-0.20*squash+0.10*release;',
  'float elasticX=1.0+0.12*squash-0.035*release;',
  'float impact=clamp(uLanding,0.0,1.0);','const jumpPhase='])
 assert.ok(shader.includes(token),'REACTIVE_PHASE_NOT_WIRED '+token);
console.log('SERIN_JUMP_REACTIVE_PHASE_ENVELOPES_PASS');

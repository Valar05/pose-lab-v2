// Runtime identity/route guard; run on the phone AFTER source ingress.
// Also supports syntax/route-only guard while the branch is still a quarantined scaffold.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const text=path=>fs.readFileSync(new URL(path,root),'utf8');
const recipe=JSON.parse(text('public/assets/serin/idle.recipe.json'));
const contract=JSON.parse(text('campaigns/serin-liquid-idle-v1.contract.json'));
const sha=recipe.source.sha256;
assert.equal(recipe.schema,'pose-lab-v2-serin-idle-v1');
assert.equal(recipe.poseFrames,1);assert.equal(recipe.rootMotion,false);
assert.equal(recipe.source.alpha,true);assert.deepEqual(recipe.source.size,[1086,1448]);
assert.equal(sha,contract.authority.imageSha256);
assert.match(text('motion.html'),/procedural === 'serin-idle'/);
assert.ok(text('src/procedural-review-shell.js').includes("['serin-idle','Liquid Idle']"));
const src=text('src/serin-idle-preview.js');
for(const key of ['uHair','uLiquid','uCurrents','uGlow','uBlink','uEyeLeft','uEyeRight','gl.clearColor(0,0,0,0)','prefers-reduced-motion'])assert.ok(src.includes(key),key);
assert.ok(recipe.blink&&recipe.blink.periodMs===22000);
assert.ok(src.includes('id="serin-blink-now"'));
assert.ok(src.includes('applyBlinkDeform'));
assert.ok(!src.includes('cheekUv'));
const image=new URL('public/'+recipe.source.file,root);
if(!fs.existsSync(image)){
 if(process.argv.includes('--allow-missing-asset')){console.log('SERIN_CODE_ONLY=PASS (image ingress pending)');process.exit(0);}
 throw Error('MISSING_AUTHORITY: exact Serin PNG has not yet been ingested from phone');
}
const b=fs.readFileSync(image);
assert.equal(crypto.createHash('sha256').update(b).digest('hex'),sha,'Serin PNG hash mismatch');
assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a','PNG signature');
assert.equal(b.readUInt32BE(16),1086);assert.equal(b.readUInt32BE(20),1448);
assert.equal(b[25],6,'PNG RGBA required');
console.log('SERIN_SOURCE_IDENTITY=PASS SHA256='+sha);
console.log('SERIN_ROUTE_SHADER_CONTRACT=PASS');

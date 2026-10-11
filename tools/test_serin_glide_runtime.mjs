import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
const root=new URL('../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root),'utf8');
const c=JSON.parse(read('campaigns/serin-glide-locomotion-v1.contract.json'));
const m=JSON.parse(read('public/assets/serin-glide/locomotion.recipe.json'));
assert.equal(m.frames,2);assert.equal(m.rootMotion,false);
assert.equal(m.source.idle.sha256,c.authority.idleSHA256);
assert.equal(m.source.glide.sha256,c.authority.glideSHA256);
assert.deepEqual(m.source.idle.size,[1024,1536]);
assert.deepEqual(m.source.glide.size,[1024,1536]);
assert.ok(read('motion.html').includes("procedural === 'serin-glide'"));
assert.ok(read('src/procedural-review-shell.js').includes("['serin-glide','Dynamic Glide']"));
const launcher=read('tools/campaigns/serin-glide-locomotion-v1.sh');
const servedRecipePath='assets/serin-glide/locomotion.recipe.json';
assert.equal(m.reviewRoute,'motion.html?procedural=serin-glide');
assert.ok(launcher.includes('curl -fsS "$BASE/'+servedRecipePath+'"'),'Phone launcher must serve the actual recipe path');
assert.ok(!launcher.includes('assets/serin-glide/idle.recipe.json'),'Old idle recipe path must never be probed by glide');
assert.ok(launcher.includes('pose_campaign_wait_http "$BASE/motion.html"'),'Review server readiness must be checked');

const src=read('src/serin-glide-preview.js');
for(const needle of ['uPoseBlend','uPitch','uWake','uSlosh','gl.clearColor(0,0,0,0)','SOURCE_SHA256_MISMATCH','SerinGlideController','loadAuthorized(recipe.source.idle.file','loadAuthorized(recipe.source.glide.file'])assert.ok(src.includes(needle),needle);
for(const kind of ['idle','glide']){
 const url=new URL('public/'+m.source[kind].file,root);
 if(!fs.existsSync(url)){
  if(kind==='glide'&&process.argv.includes('--allow-pending-ingress')){console.log('GLIDE_ART=PENDING_PHONE_INGRESS');continue;}
  throw Error('MISSING_AUTHORITATIVE_SOURCE '+url.pathname);
 }
 const bytes=fs.readFileSync(url);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),m.source[kind].sha256);
 assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');
 assert.equal(bytes.readUInt32BE(16),1024);assert.equal(bytes.readUInt32BE(20),1536);
 assert.equal(bytes[25],6,'expected RGBA PNG');
 console.log('SOURCE_SHA256=PASS '+kind);
}
console.log('SERIN_SOURCE_CONTRACT_AND_ROUTE=PASS');

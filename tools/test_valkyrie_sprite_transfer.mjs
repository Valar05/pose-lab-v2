#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const base=path.join(root,'public/assets/valkyrie-squad/factory-v1');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'transfer-manifest.json'),'utf8'));
const expectedApril=['combat-idle','idle','run','jab','cross','front-kick','dash','dodge-slide','flip-jump'];
const expectedVanguard=['heavy-idle','run','brake-pivot','reach-brace','dash','dodge-slide','flip-jump','shotgun-blast','bayonet-drive','weapon-bash','grapple-entry'];
const assert=(v,m)=>{if(!v)throw new Error(m)};
assert(JSON.stringify(manifest.animationIds.april)===JSON.stringify(expectedApril),'April animation-ID set changed');
assert(JSON.stringify(manifest.animationIds.vanguard)===JSON.stringify(expectedVanguard),'Vanguard animation-ID set changed');
assert(manifest.counts.total===20,'complete library must contain 20 animations');
for(const asset of manifest.assets){const file=path.join(base,asset.path);let bytes;if(fs.existsSync(file)){bytes=fs.readFileSync(file)}else{assert(asset.chunkDescriptor,'missing direct asset without chunk descriptor: '+asset.path);const descriptor=JSON.parse(fs.readFileSync(path.join(base,asset.chunkDescriptor),'utf8'));bytes=Buffer.concat(descriptor.parts.map((part)=>{const chunk=fs.readFileSync(path.join(root,part.path));assert(chunk.length===part.bytes,part.path+' byte count changed');assert(crypto.createHash('sha256').update(chunk).digest('hex')===part.sha256,part.path+' hash changed');return chunk}))}assert(bytes.length===asset.bytes,asset.path+' byte count changed');assert(crypto.createHash('sha256').update(bytes).digest('hex')===asset.sha256,asset.path+' hash changed')}
const moduleSource=fs.readFileSync(path.join(root,'src/valkyrie-sprite-lab.js'),'utf8');
for(const id of [...expectedApril,...expectedVanguard])assert(moduleSource.includes("'"+id+"'"),'runtime missing '+id);
assert(moduleSource.includes("new URL('../assets/valkyrie-squad/factory-v1/runtime/"),'runtime assets must resolve inside Pose Lab V2');
assert(moduleSource.includes("document.body.dataset.reviewReady='1'"),'runtime readiness marker missing');
console.log(JSON.stringify({ok:true,april:expectedApril.length,vanguard:expectedVanguard.length,total:20,checks:['animation-id equality','asset sha256','Pose Lab asset paths','runtime readiness']},null,2));

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
assert(moduleSource.includes("revisedAsset('../assets/valkyrie-squad/factory-v1/runtime/"),'runtime assets must resolve inside Pose Lab V2');
assert(moduleSource.includes("url.searchParams.set('cacheBust',ASSET_REVISION)"),'runtime assets must inherit the deployed revision');
assert(moduleSource.includes("setCharacter(character,false);document.body.dataset.reviewReady='1'"),'runtime readiness must follow decoded media and populated state');
assert(moduleSource.includes('const FULL_SPRITE_VIEW=Object.freeze({sourceSize:512,pivotX:256,pivotY:512,centerX:256,groundY:448,maxScale:.75,safeMargin:18,driveLever:384})'),'full-sprite presentation contract missing');
assert(moduleSource.includes('function fullSpriteFitTransform(state,offsetX=0,angleOffset=0)'),'full-sprite fit helper missing');
assert(!moduleSource.includes('const rows=32,sourceSlice=512/rows,baseX=64,baseY=64,baseSize=384,destSlice=baseSize/rows,groundY=448'),'Vanguard combat must not be rendered as horizontal slices');
assert(!moduleSource.includes('ctx.rect(18,18,476,476);ctx.clip()'),'Vanguard combat must not hard-clip complete silhouettes');
console.log(JSON.stringify({ok:true,april:expectedApril.length,vanguard:expectedVanguard.length,total:20,checks:['animation-id equality','asset sha256','Pose Lab asset paths','runtime readiness','continuous full-sprite fit','no combat hard clip']},null,2));

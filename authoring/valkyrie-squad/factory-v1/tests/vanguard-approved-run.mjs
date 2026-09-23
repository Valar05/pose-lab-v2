#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const manifest=JSON.parse(fs.readFileSync('public/assets/valkyrie-squad/factory-v1/runtime/vanguard-run-pose-atlas-96.json','utf8'));
const atlas=fs.readFileSync('public/assets/valkyrie-squad/factory-v1/runtime/vanguard-run-pose-atlas-96.png');
const runtime=fs.readFileSync('src/valkyrie-sprite-lab.js','utf8');
const april=JSON.parse(fs.readFileSync('authoring/valkyrie-squad/factory-v1/source-masters/april-v5-canonical.spritelab.json','utf8'));
const assert=(v,m)=>{if(!v)throw new Error(m)};

assert(manifest.source.sha256==='fc121638fe04310f35b684c9e20dda578d64868ca4a66215bdbc71956dcfd8b7','approved chat source SHA drifted');
assert(manifest.source.frameOrder.join(',')==='top-left,top-middle,top-right,bottom-left,bottom-middle,bottom-right','authored frame order changed');
assert(manifest.runtime.sha256==='3503b13779b96e490fbf97efaafb7103cfa3e422e66225f35caa92632891c99b','manifest atlas hash changed');
assert(crypto.createHash('sha256').update(atlas).digest('hex')===manifest.runtime.sha256,'runtime atlas bytes do not match manifest');
assert(manifest.runtime.cellSize.join(',')==='96,96'&&manifest.runtime.grid.join(',')==='3,2'&&manifest.runtime.poseCount===6,'Vanguard run atlas contract changed');
assert(manifest.runtime.animationFramesBaked===false&&manifest.runtime.runtimeMotion==='procedural','Vanguard run was baked');
assert(manifest.registration.scaleEdits===false&&manifest.registration.rotationEdits===false&&manifest.registration.poseEdits===false,'registration exceeded translation-only boundary');

const aprilRun=april.animations.find(x=>x.id==='run');
assert(aprilRun&&aprilRun.fps===3.8&&aprilRun.frame_ids.length===6,'accepted April run authority changed');
assert(aprilRun.motion_program.bridge_distortion.stretch===0.1&&aprilRun.motion_program.bridge_distortion.squash===0.055&&aprilRun.motion_program.bridge_distortion.shear===0.075,'accepted April bridge preset changed');

for(const token of [
  "vanguard-run-pose-atlas-96.png",
  "function vanguardRunPoseCell(id)",
  "function drawBridgeDistortedSprite",
  "crop=character==='vanguard'?vanguardRunPoseCell",
  "fps:3.8",
  "interval:1000/3.8",
  "cycleMs:1578.947368421053",
  "stretch:.10,squash:.055,shear:.075",
  "const RUN_CAMERA=Object.freeze({scale:.80,centerX:256,groundY:399})",
  "if(clip==='run'){playing=false"
]) assert(runtime.includes(token),'runtime missing '+token);
const runStart=runtime.indexOf('function drawRun(now)');
const runEnd=runtime.indexOf('function drawPose(',runStart);
const runSource=runtime.slice(runStart,runEnd);
assert(runSource.includes('drawBridgeDistortedSprite(ctx,crop,frame.pivot,RUN_CAMERA.scale,RUN_CAMERA.centerX,RUN_CAMERA.groundY,RUN.bridge'),'Vanguard run is not reusing April bridge renderer');
assert(!runSource.includes('ctx.rotate(')&&!runSource.includes('angle'),'run path introduced rotation/yaw');
console.log('VANGUARD_APPROVED_RUN_PASS: six authored frames, reading order preserved, translation-only registration, exact April 3.8 FPS bridge renderer reused');

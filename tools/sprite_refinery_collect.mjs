#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, readJson, resolveManifest, root, writeJson, sha256File } from './sprite_refinery_common.mjs';

function copyDir(src, dst) { fs.mkdirSync(dst, { recursive: true }); for (const entry of fs.readdirSync(src, { withFileTypes: true })) { const s=path.join(src,entry.name), d=path.join(dst,entry.name); if (entry.isDirectory()) copyDir(s,d); else fs.copyFileSync(s,d); } }
function findResults(dir) { const out=[]; if (!fs.existsSync(dir)) return out; for (const entry of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,entry.name); if (entry.isDirectory()) out.push(...findResults(p)); else if (entry.name==='result.json') out.push(p); } return out; }

const args=parseArgs(process.argv); const manifestPath=resolveManifest(args.manifest||args.batch); const manifest=readJson(manifestPath);
const workersRoot=path.join(root,args.resultsDir||`generated/sprite-refinery/workers/${manifest.batch_id}`);
const publish=args.publish==='true'||args.publish===true; const reviewRoot=path.join(root,args.reviewDir||`public/reviews/sprite-refinery/${manifest.batch_id}`);
const results=findResults(workersRoot).map((file)=>readJson(file));
const ready=results.filter((r)=>r.status==='ready'); const red=results.filter((r)=>r.status==='red'); const blocked=results.filter((r)=>r.status==='blocked');
fs.mkdirSync(reviewRoot,{recursive:true});
const animations=[];
for (const result of ready) {
  const clip=manifest.clips.find((c)=>c.id===result.clip_id); if (!clip) continue;
  const clipReviewDir=path.join(reviewRoot,result.clip_id); fs.mkdirSync(clipReviewDir,{recursive:true});
  copyDir(path.join(root,result.frames_dir), path.join(clipReviewDir,'frames'));
  fs.copyFileSync(path.join(root,result.raw_styled_sheet), path.join(clipReviewDir,'raw-styled-contact-sheet.png'));
  fs.copyFileSync(path.join(root,result.verifier_report), path.join(clipReviewDir,'verifier-report.json'));
  fs.copyFileSync(path.join(root,result.provenance), path.join(clipReviewDir,'provenance.json'));
  const frames=[];
  for (let i=0;i<clip.frame_count;i++) {
    const name=`${clip.id}_${String(i).padStart(4,'0')}.png`; const file=path.join(clipReviewDir,'frames',name);
    frames.push({ src: `${result.clip_id}/frames/${name}`, durationMs: clip.timing_ms[i], sha256: sha256File(file), status: result.status });
  }
  animations.push({ id: clip.id, label: clip.action, status: 'ready', loop: true, contactSheet: `${clip.id}/raw-styled-contact-sheet.png`, sourceMetadata: `${clip.id}/provenance.json`, verifierReport: `${clip.id}/verifier-report.json`, groundGuideY: 384, contract: ['ready','screen-right','appearance-only','no-mirroring'], frames });
  if (publish) {
    const canonicalRoot=path.join(root,'public/assets/vanguard/fleshpunk',clip.id); fs.mkdirSync(canonicalRoot,{recursive:true});
    copyDir(path.join(clipReviewDir,'frames'), path.join(canonicalRoot,'frames'));
    fs.copyFileSync(path.join(clipReviewDir,'raw-styled-contact-sheet.png'), path.join(canonicalRoot,'contact-sheet.png'));
    fs.copyFileSync(path.join(clipReviewDir,'provenance.json'), path.join(canonicalRoot,'source-metadata.json'));
  }
}
const reviewManifest={ schema:'pose-lab-v2-2d-animation-set-v1', character:'Fleshpunk Vanguard', defaultAnimation: animations[0]?.id || 'idle', batch_id: manifest.batch_id, frameSpace:{width:512,height:512,colorMode:'RGBA',background:'transparent',facing:'screen-right',camera:'fixed'}, authority:{poseCameraFacingTiming:'Steel Vanguard native animation renders',appearance:'fleshpunk-vanguard-v1 approved concept',excluded:['Crimson model','bitmap mirroring','per-frame reframing','stabilization','invented in-betweens']}, statuses:{ready:ready.map(r=>r.clip_id), red:red.map(r=>r.clip_id), blocked:blocked.map(r=>r.clip_id)}, animations };
writeJson(path.join(reviewRoot,'animations.json'), reviewManifest);
writeJson(path.join(reviewRoot,'batch-report.json'), { schema:'pose-lab-v2-sprite-refinery-batch-report-v1', batch_id:manifest.batch_id, status:red.length||blocked.length?'partial':'ready', results, review_manifest:`public/reviews/sprite-refinery/${manifest.batch_id}/animations.json`, review_url_path:`/?view=2d&manifest=./reviews/sprite-refinery/${manifest.batch_id}/animations.json` });
if (publish && ready.length) {
  const canonical=readJson('public/assets/vanguard/fleshpunk/animations.json');
  for (const anim of animations) {
    const index=canonical.animations.findIndex((entry)=>entry.id===anim.id);
    if (index>=0) canonical.animations[index]={...canonical.animations[index],...anim, contactSheet:`${anim.id}/contact-sheet.png`, sourceMetadata:`${anim.id}/source-metadata.json`, frames:anim.frames.map(f=>({...f, src:f.src.replace(`${anim.id}/frames/`,`${anim.id}/frames/`)}))};
    else canonical.animations.push(anim);
  }
  writeJson(path.join(root,'public/assets/vanguard/fleshpunk/animations.json'), canonical);
}
console.log(JSON.stringify({ ok:true, ready:ready.length, red:red.length, blocked:blocked.length, review:path.relative(root,reviewRoot) }, null, 2));

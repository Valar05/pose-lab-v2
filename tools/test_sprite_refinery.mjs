#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, readJson } from './sprite_refinery_common.mjs';

const failures=[];
function assert(c,m){ if(!c) failures.push(m); }
function run(args, env={}) { return spawnSync('node', args, { cwd: root, encoding:'utf8', env:{...process.env,...env}, maxBuffer:1024*1024*20 }); }
function runOk(args, env={}) { const r=run(args,env); if(r.status!==0) failures.push(`${args.join(' ')} failed: ${r.stdout}\n${r.stderr}`); return r; }

let r=run(['tools/sprite_refinery_plan.mjs','--manifest','vanguard-fleshpunk-001','--provider','openai','--out','generated/sprite-refinery/test-openai-plan.json']);
assert(r.status!==0, 'real OpenAI plan must block while approved Fleshpunk Vanguard concept asset is missing');
assert((r.stdout+r.stderr).includes('approved concept asset missing'), 'real provider blocker must name missing concept asset');
r=runOk(['tools/sprite_refinery_plan.mjs','--manifest','vanguard-fleshpunk-001','--provider','fixture','--out','generated/sprite-refinery/test-fixture-plan.json']);
const plan=readJson('generated/sprite-refinery/test-fixture-plan.json');
assert(plan.matrix.length===2, 'fixture plan must produce two independent clip workers');
assert(plan.max_concurrency===2, 'batch concurrency must be bounded to two');
for (const clip of ['idle','swordattack1']) {
  runOk(['tools/sprite_refinery_worker.mjs','--manifest','vanguard-fleshpunk-001','--clip',clip,'--provider','fixture','--out-dir',`generated/sprite-refinery/workers-test/vanguard-fleshpunk-001/${clip}`], { SPRITE_REFINERY_SKIP_RENDER:'1' });
  const result=readJson(`generated/sprite-refinery/workers-test/vanguard-fleshpunk-001/${clip}/result.json`);
  assert(result.status==='ready', `${clip} fixture worker must be ready`);
}
const before=readJson('generated/sprite-refinery/workers-test/vanguard-fleshpunk-001/idle/result.json').output_hashes.raw_styled_sheet;
runOk(['tools/sprite_refinery_worker.mjs','--manifest','vanguard-fleshpunk-001','--clip','idle','--provider','fixture','--out-dir','generated/sprite-refinery/workers-test/vanguard-fleshpunk-001/idle'], { SPRITE_REFINERY_SKIP_RENDER:'1' });
const after=readJson('generated/sprite-refinery/workers-test/vanguard-fleshpunk-001/idle/result.json').output_hashes.raw_styled_sheet;
assert(before===after, 'fixture rerun must be idempotent for deterministic packet/output reuse');
const redDir=path.join(root,'generated/sprite-refinery/workers-test/vanguard-fleshpunk-001/redclip'); fs.mkdirSync(redDir,{recursive:true});
fs.writeFileSync(path.join(redDir,'result.json'), JSON.stringify({schema:'pose-lab-v2-sprite-refinery-worker-result-v1',status:'red',batch_id:'vanguard-fleshpunk-001',clip_id:'redclip',error:'fixture structural rejection'}, null, 2));
runOk(['tools/sprite_refinery_collect.mjs','--manifest','vanguard-fleshpunk-001','--resultsDir','generated/sprite-refinery/workers-test/vanguard-fleshpunk-001','--reviewDir','generated/sprite-refinery/review-test/vanguard-fleshpunk-001']);
const report=readJson('generated/sprite-refinery/review-test/vanguard-fleshpunk-001/batch-report.json');
assert(report.status==='partial', 'collector must preserve mixed success/failure as partial');
const review=readJson('generated/sprite-refinery/review-test/vanguard-fleshpunk-001/animations.json');
assert(review.animations.length===2, 'collector must register only ready clips');
assert(review.statuses.red.includes('redclip'), 'collector must preserve red reports for inspection');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/sprite-refinery-batch.yml'),'utf8');
assert(workflow.includes('strategy:') && workflow.includes('matrix:'), 'workflow must use matrix workers');
assert(workflow.includes('fail-fast: false'), 'parallel workers must not cancel siblings on one red clip');
assert(workflow.includes('gh pr create --draft'), 'collector must create one draft batch PR');
assert(workflow.includes('OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}'), 'real provider must be secret-backed');
assert(workflow.includes('continue-on-error: true'), 'worker step must upload red/blocked artifacts instead of losing reports');
const provider=fs.readFileSync(path.join(root,'tools/sprite_refinery_provider.mjs'),'utf8');
assert(provider.includes('/v1/images/edits') && provider.includes('gpt-image-1'), 'real provider contract must target current image edit endpoint/model');
assert(!provider.includes('console.log(process.env.OPENAI_API_KEY)'), 'provider must not log secrets');
if (failures.length) { console.error(JSON.stringify({ok:false,failures},null,2)); process.exit(1); }
console.log(JSON.stringify({ok:true, checks:['real provider blocks without approved concept','two-worker fixture matrix','artifact-only workers','mixed collector partial','idempotent fixture rerun','draft PR workflow','secret-backed OpenAI provider']}, null, 2));

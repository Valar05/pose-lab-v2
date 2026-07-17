#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const lowBackKickPoseclip = '../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2.poseclip.json';
const lowBackKickEvidence = '../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2_visual_evidence.json';
const learningPacket = 'generated/learning/lowbackkick/Low-Back-Kick-learning-packet/manifest.json';
const cloudJob = 'generated/cloud-worker-jobs/Low-Back-Kick-learning-packet/job.json';

function run(command, args) {
  const label = [command, ...args].join(' ');
  console.log(`\n$ ${label}`);
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`command failed (${result.status}): ${label}`);
  }
}

function assertExists(file) {
  if (!fs.existsSync(path.join(root, file))) {
    throw new Error(`required file missing: ${file}`);
  }
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}

assertExists('CODEX_STARTS_HERE.md');
assertExists('docs/CLOUD_WORKER_ANIMATION_SURFACE.md');
assertExists('docs/CLOUD_WORKER_OUTPUT_CONTRACT.md');
assertExists('docs/COMMAND_CENTER_DISPATCH_PROMPT.md');

run('npm', ['run', 'learning:packet', '--',
  '--legacy-poseclip', lowBackKickPoseclip,
  '--legacy-evidence', lowBackKickEvidence,
]);
assertExists(learningPacket);

run('npm', ['run', 'cloud:worker-job', '--',
  '--learning-packet', learningPacket,
]);
assertExists(cloudJob);

const job = readJson(cloudJob);
if (job.workerContract?.dispatchSurface !== 'Home Center Command Center MCP') {
  throw new Error('cloud worker job must target Home Center Command Center MCP');
}
if (!job.requiredDocs?.includes('CODEX_STARTS_HERE.md')) {
  throw new Error('cloud worker job must list CODEX_STARTS_HERE.md as required doc');
}
if (!job.expectedOutputs?.includes('outputs/worker_report.md')) {
  throw new Error('cloud worker job must list worker_report.md as expected output');
}

run('npm', ['run', 'test:learning-packet']);
run('npm', ['run', 'test:cloud-worker-surface']);
run('npm', ['run', 'build']);
run('npm', ['run', 'smoke']);

console.log(JSON.stringify({
  ok: true,
  learningPacket,
  cloudJob,
  dispatchSurface: job.workerContract.dispatchSurface,
  status: job.status,
}, null, 2));

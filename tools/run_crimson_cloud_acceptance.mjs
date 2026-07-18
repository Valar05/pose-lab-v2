#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const DEFAULT_REPO = 'Valar05/pose-lab-v2';
const PAGES_WORKFLOW = 'Deploy GitHub Pages';
const QA_WORKFLOW = 'Crimson Visual QA';
const REQUIRED_ASSERTIONS = [
  'realSwordVisible',
  'hiltSeatedInHand',
  'bladeProjectsForwardFromWrist',
  'bladeTipDoesNotClimbForearmInRest',
  'noHandImpale',
  'noManualAlignmentRequired',
];

function parseArgs(argv) {
  const args = {
    repo: DEFAULT_REPO,
    outRoot: 'generated/cloud-visual-evidence/crimson-sword',
    waitPages: true,
    promote: true,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--visual-read') args.visualRead = argv[++i] || '';
    else if (arg.startsWith('--visual-read=')) args.visualRead = arg.slice('--visual-read='.length);
    else if (arg === '--repo') args.repo = argv[++i] || DEFAULT_REPO;
    else if (arg.startsWith('--repo=')) args.repo = arg.slice('--repo='.length);
    else if (arg === '--run-id') args.runId = argv[++i] || '';
    else if (arg.startsWith('--run-id=')) args.runId = arg.slice('--run-id='.length);
    else if (arg === '--out-root') args.outRoot = argv[++i] || args.outRoot;
    else if (arg.startsWith('--out-root=')) args.outRoot = arg.slice('--out-root='.length);
    else if (arg === '--skip-pages-wait') args.waitPages = false;
    else if (arg === '--no-promote') args.promote = false;
    else if (arg === '--help' || arg === '-h') {
      console.log(`usage: node tools/run_crimson_cloud_acceptance.mjs --visual-read TEXT [--run-id ID] [--skip-pages-wait]\n\nRuns the Crimson cloud screenshot lane, downloads the artifact, promotes evidence with explicit visual assertions, and runs npm run accept:crimson-sword. The visual read is mandatory so telemetry cannot promote itself. Confirmed assertions: ${REQUIRED_ASSERTIONS.join(', ')}`);
      process.exit(0);
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  if (!args.visualRead || args.visualRead.length < 40) {
    throw new Error('--visual-read is required and must describe the cloud screenshot hand/hilt/blade relationship');
  }
  return args;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    env: process.env,
  });
  if (result.status !== 0) {
    const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
    throw new Error(`${command} ${args.join(' ')} failed${output ? `:\n${output}` : ''}`);
  }
  return result.stdout || '';
}

function currentSha(short = false) {
  return run('git', short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD']).trim();
}

function reviewInfo() {
  return JSON.parse(run('node', ['tools/crimson_sword_review_url.mjs']));
}

function latestPagesRun(repo, fullSha) {
  const text = run('gh', ['run', 'list', '--repo', repo, '--workflow', PAGES_WORKFLOW, '--branch', 'main', '--limit', '10', '--json', 'databaseId,headSha,status,conclusion']);
  const runs = JSON.parse(text || '[]');
  return runs.find((item) => String(item.headSha || '').startsWith(fullSha));
}

function waitForPages(repo, fullSha) {
  const pagesRun = latestPagesRun(repo, fullSha);
  if (!pagesRun) {
    console.warn(`warning: no ${PAGES_WORKFLOW} run found for ${fullSha}; continuing with cache-busted URL`);
    return null;
  }
  if (pagesRun.status !== 'completed') {
    run('gh', ['run', 'watch', String(pagesRun.databaseId), '--repo', repo, '--exit-status'], { stdio: 'inherit' });
    return pagesRun.databaseId;
  }
  if (pagesRun.conclusion !== 'success') {
    throw new Error(`${PAGES_WORKFLOW} run ${pagesRun.databaseId} is ${pagesRun.conclusion}`);
  }
  return pagesRun.databaseId;
}

function dispatchQa(repo, url) {
  const output = run('gh', ['workflow', 'run', QA_WORKFLOW, '--repo', repo, '--ref', 'main', '-f', `url=${url}`]);
  const match = output.match(/\/runs\/(\d+)/);
  if (match) return match[1];
  const list = run('gh', ['run', 'list', '--repo', repo, '--workflow', QA_WORKFLOW, '--branch', 'main', '--limit', '1', '--json', 'databaseId']);
  const runs = JSON.parse(list || '[]');
  if (!runs[0]?.databaseId) throw new Error('could not determine Crimson Visual QA run id after dispatch');
  return String(runs[0].databaseId);
}

function downloadArtifact(repo, runId, outRoot) {
  const outDir = path.join(outRoot, `github-actions-${runId}-download`);
  fs.rmSync(path.join(root, outDir), { recursive: true, force: true });
  fs.mkdirSync(path.join(root, outDir), { recursive: true });
  run('gh', ['run', 'download', runId, '--repo', repo, '--dir', outDir]);
  const manifest = findFirst(path.join(root, outDir), 'visual_qa_manifest.json');
  const screenshot = findFirst(path.join(root, outDir), 'screenshot.png');
  if (!manifest || !screenshot) throw new Error(`downloaded artifact missing visual_qa_manifest.json or screenshot.png under ${outDir}`);
  return { outDir, manifest: path.relative(root, manifest), screenshot: path.relative(root, screenshot) };
}

function findFirst(dir, basename) {
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (entry.name === basename) return absolute;
    }
  }
  return null;
}

function promote(manifest, visualRead) {
  run('node', [
    'tools/command_center_crimson_visual_evidence.mjs',
    '--manifest', manifest,
    '--out', 'generated/cloud-visual-evidence/crimson-sword/latest.json',
    '--visual-read', visualRead,
    '--confirm-all-visual-assertions',
  ], { stdio: 'inherit' });
  run('npm', ['run', 'accept:crimson-sword'], { stdio: 'inherit' });
}

const args = parseArgs(process.argv);
const fullSha = currentSha(false);
const shortSha = currentSha(true);
const info = reviewInfo();
if (info.commit !== shortSha) throw new Error(`review URL commit ${info.commit} does not match HEAD ${shortSha}`);
if (args.waitPages) waitForPages(args.repo, fullSha);
const runId = args.runId || dispatchQa(args.repo, info.url);
run('gh', ['run', 'watch', runId, '--repo', args.repo, '--exit-status'], { stdio: 'inherit' });
const artifact = downloadArtifact(args.repo, runId, args.outRoot);
if (args.promote) promote(artifact.manifest, args.visualRead);
console.log(JSON.stringify({
  ok: true,
  commit: shortSha,
  url: info.url,
  runId,
  artifact,
  promoted: args.promote,
  assertions: REQUIRED_ASSERTIONS,
}, null, 2));

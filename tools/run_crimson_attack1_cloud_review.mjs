#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const DEFAULT_REPO = 'Valar05/pose-lab-v2';
const QA_WORKFLOW = 'Crimson Visual QA';
const CANDIDATE = 'crimson-light-attack1-vanguard-3';

function parseArgs(argv) {
  const args = { repo: DEFAULT_REPO, dispatch: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dispatch') args.dispatch = true;
    else if (arg === '--repo') args.repo = argv[++i] || DEFAULT_REPO;
    else if (arg.startsWith('--repo=')) args.repo = arg.slice('--repo='.length);
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node tools/run_crimson_attack1_cloud_review.mjs [--dispatch] [--repo OWNER/REPO]');
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: options.stdio || 'pipe' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout || ''}\n${result.stderr || ''}`.trim());
  return result.stdout || '';
}

const args = parseArgs(process.argv);
const review = JSON.parse(run('node', ['tools/attack1_review_urls.mjs']));
const urls = review.urls
  .filter((entry) => entry.candidate === CANDIDATE && entry.primeKey)
  .map((entry) => ({ label: entry.label, candidate: entry.candidate, primeKey: entry.primeKey, time: entry.time, url: entry.url }));
if (urls.length !== 8) throw new Error(`expected 8 Crimson Attack1 prime URLs for ${CANDIDATE}, got ${urls.length}`);
const urlList = JSON.stringify(urls);
let runId = null;
if (args.dispatch) {
  run('gh', ['workflow', 'run', QA_WORKFLOW, '--repo', args.repo, '--ref', 'main', '-f', `url_list=${urlList}`]);
  const latest = JSON.parse(run('gh', ['run', 'list', '--repo', args.repo, '--workflow', QA_WORKFLOW, '--branch', 'main', '--limit', '1', '--json', 'databaseId']) || '[]');
  runId = latest[0]?.databaseId ? String(latest[0].databaseId) : null;
}
console.log(JSON.stringify({
  ok: true,
  schema: 'pose-lab-v2-crimson-attack1-cloud-batch-request-v1',
  candidate: CANDIDATE,
  cacheBust: review.cacheBust,
  dispatch: args.dispatch,
  runId,
  urls,
  ghWorkflowInput: { url_list: urlList },
}, null, 2));

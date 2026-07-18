#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const DEFAULT_OUT = 'generated/cloud-visual-evidence/crimson-sword/latest.json';
const REQUIRED_ASSERTIONS = [
  'realSwordVisible',
  'hiltSeatedInHand',
  'bladeProjectsForwardFromWrist',
  'noHandImpale',
  'noManualAlignmentRequired',
];

function parseArgs(argv) {
  const args = {out: DEFAULT_OUT};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--manifest') args.manifest = argv[++i] || '';
    else if (arg.startsWith('--manifest=')) args.manifest = arg.slice('--manifest='.length);
    else if (arg === '--out') args.out = argv[++i] || '';
    else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length);
    else if (arg === '--hosted-url') args.hostedUrl = argv[++i] || '';
    else if (arg === '--screenshot-url') args.screenshotUrl = argv[++i] || '';
    else if (arg === '--visual-read') args.visualRead = argv[++i] || '';
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node tools/command_center_crimson_visual_evidence.mjs --manifest visual_qa_manifest.json [--out generated/cloud-visual-evidence/crimson-sword/latest.json] [--hosted-url URL] [--screenshot-url URL]');
      process.exit(0);
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  if (!args.manifest) throw new Error('--manifest is required');
  return args;
}

function currentSha() {
  return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
}

function resolveProjectPath(file) {
  return path.isAbsolute(file) ? file : path.join(root, file);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const args = parseArgs(process.argv);
const source = readJson(resolveProjectPath(args.manifest));
assert(source.schema === 'command-center-visual-qa-evidence-v1', 'source manifest must be command-center-visual-qa-evidence-v1');
assert(source.captureKind === 'command-center-cloud-screenshot', 'source manifest must be command-center-cloud-screenshot');
assert(source.target === 'crimson-sword', 'source manifest target must be crimson-sword');
assert(source.screenshotSha256, 'source manifest must include screenshotSha256');
assert(source.screenshotPath || args.screenshotUrl || source.screenshotUrl, 'source manifest must include screenshotPath or screenshotUrl');
assert(source.jobId, 'source manifest must include Command Center jobId');
assert(source.browserEpisode?.episodeId, 'source manifest must include browserEpisode.episodeId');
const assertions = source.assertions || {};
for (const key of REQUIRED_ASSERTIONS) assert(assertions[key] === true, 'source manifest visual assertion must be true: ' + key);
const visualRead = args.visualRead || source.visualRead || '';
assert(visualRead.length >= 40, 'visualRead must be supplied by the Command Center visual read before Crimson acceptance');
const commit = currentSha();
const cacheBust = 'crimson-sword-' + commit;
const hostedUrl = args.hostedUrl || source.hostedUrl || source.startUrl || source.finalUrl || '';
const evidence = {
  schema: 'pose-lab-v2-crimson-sword-cloud-visual-evidence-v1',
  target: 'crimson-sword',
  model: 'crimson',
  commit,
  cacheBust,
  hostedUrl,
  capturedAt: source.capturedAt,
  captureKind: 'command-center-cloud-screenshot',
  screenshotPath: source.screenshotPath || '',
  screenshotUrl: args.screenshotUrl || source.screenshotUrl || '',
  screenshotSha256: source.screenshotSha256,
  visualRead,
  assertions,
  browserSocketProof: source.browserSocketProof,
  commandCenter: {
    jobId: source.jobId,
    jobStatus: source.commandCenter?.jobStatus || source.jobStatus || 'completed',
    sessionId: source.sessionId,
    browserEpisodeId: source.browserEpisode.episodeId,
    artifactManifestPath: path.resolve(args.manifest),
  },
};
const out = resolveProjectPath(args.out || DEFAULT_OUT);
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ok: true, out: path.relative(root, out), captureKind: evidence.captureKind, jobId: evidence.commandCenter.jobId, browserEpisodeId: evidence.commandCenter.browserEpisodeId}, null, 2));


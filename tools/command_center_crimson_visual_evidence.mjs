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
  'bladeTipDoesNotClimbForearmInRest',
  'noHandImpale',
  'noManualAlignmentRequired',
];

function parseArgs(argv) {
  const args = {out: DEFAULT_OUT, confirmedAssertions: new Set()};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--manifest') args.manifest = argv[++i] || '';
    else if (arg.startsWith('--manifest=')) args.manifest = arg.slice('--manifest='.length);
    else if (arg === '--out') args.out = argv[++i] || '';
    else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length);
    else if (arg === '--hosted-url') args.hostedUrl = argv[++i] || '';
    else if (arg === '--screenshot-url') args.screenshotUrl = argv[++i] || '';
    else if (arg === '--visual-read') args.visualRead = argv[++i] || '';
    else if (arg === '--confirm-visual-assertion') args.confirmedAssertions.add(argv[++i] || '');
    else if (arg.startsWith('--confirm-visual-assertion=')) args.confirmedAssertions.add(arg.slice('--confirm-visual-assertion='.length));
    else if (arg === '--confirm-all-visual-assertions') REQUIRED_ASSERTIONS.forEach((key) => args.confirmedAssertions.add(key));
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node tools/command_center_crimson_visual_evidence.mjs --manifest visual_qa_manifest.json --visual-read TEXT --confirm-all-visual-assertions [--out generated/cloud-visual-evidence/crimson-sword/latest.json] [--hosted-url URL] [--screenshot-url URL]');
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

function localScreenshotPath(source, manifestFile) {
  const sourcePath = source.screenshotPath || '';
  if (sourcePath) {
    const resolved = resolveProjectPath(sourcePath);
    if (fs.existsSync(resolved)) return sourcePath;
  }
  const sibling = path.join(path.dirname(manifestFile), 'screenshot.png');
  if (fs.existsSync(sibling)) return path.relative(root, sibling);
  return sourcePath;
}

const args = parseArgs(process.argv);
const manifestFile = resolveProjectPath(args.manifest);
const source = readJson(manifestFile);
assert(source.schema === 'command-center-visual-qa-evidence-v1', 'source manifest must be command-center-visual-qa-evidence-v1');
const acceptedCaptureKinds = new Set(['cloud-screenshot', 'hosted-cloud-screenshot', 'sense-cloud-screenshot', 'command-center-cloud-screenshot']);
assert(acceptedCaptureKinds.has(source.captureKind), 'source manifest must be hosted/cloud screenshot evidence');
assert(source.target === 'crimson-sword', 'source manifest target must be crimson-sword');
assert(source.screenshotSha256, 'source manifest must include screenshotSha256');
assert(source.screenshotPath || args.screenshotUrl || source.screenshotUrl, 'source manifest must include screenshotPath or screenshotUrl');
if (source.captureKind === 'command-center-cloud-screenshot') {
  assert(/^job_[A-Za-z0-9-]+/.test(String(source.jobId || '')), 'Command Center source manifest must include job_ id');
  assert(/^browser_episode_[A-Za-z0-9_-]+/.test(String(source.browserEpisode?.episodeId || '')), 'Command Center source manifest must include browserEpisode.episodeId');
}
const visualRead = args.visualRead || source.visualRead || '';
assert(visualRead.length >= 40, 'visualRead must be supplied by a human visual read before Crimson acceptance');
assert(!/not seated|not held|behind the wrist|above the hilt|up the forearm|\bred\b|wrong|fails|manual alignment required/i.test(visualRead), 'visualRead still describes a red Crimson sword relationship');
const assertions = {...(source.assertions || {})};
for (const key of args.confirmedAssertions) {
  if (!REQUIRED_ASSERTIONS.includes(key)) throw new Error('unknown visual assertion: ' + key);
  assertions[key] = true;
}
for (const key of REQUIRED_ASSERTIONS) assert(assertions[key] === true, 'visual assertion must be confirmed from the cloud screenshot: ' + key);
const socketProof = source.browserSocketProof || {};
assert(socketProof.status === 'attached', 'source browserSocketProof.status must be attached');
assert(socketProof.parentBone === 'RightHand', 'source browserSocketProof.parentBone must be RightHand');
assert(socketProof.visibleInViewport === true, 'source browserSocketProof.visibleInViewport must be true');
assert(Number(socketProof.hiltToHandDistance) >= 0.12 && Number(socketProof.hiltToHandDistance) <= 0.16, 'source Crimson screenshot is red: hilt distance is outside the latest accepted manual-export palm grip band');
if (Array.isArray(socketProof.hiltScreen) && Array.isArray(socketProof.tipScreen)) {
  const dx = Number(socketProof.tipScreen[0]) - Number(socketProof.hiltScreen[0]);
  const dy = Number(socketProof.tipScreen[1]) - Number(socketProof.hiltScreen[1]);
  assert(Math.abs(dy) <= 80, 'source Crimson screenshot is red: blade tip is too vertical relative to hilt');
  assert(Math.abs(dx) >= 35, 'source Crimson screenshot is red: blade does not project visibly out from the wrist');
} else {
  throw new Error('source browserSocketProof must include hiltScreen and tipScreen');
}
if (Array.isArray(socketProof.bladeWorldDirection)) {
  assert(Math.abs(Number(socketProof.bladeWorldDirection[1])) <= 0.45, 'source Crimson screenshot is red: blade direction is mostly vertical');
  const bladeX = Number(socketProof.bladeWorldDirection[0]);
  const bladeY = Number(socketProof.bladeWorldDirection[1]);
  const bladeZ = Number(socketProof.bladeWorldDirection[2]);
  assert(bladeZ >= 0.85 && bladeZ > Math.abs(bladeX) * 2 && bladeZ > Math.abs(bladeY) * 4, 'source Crimson screenshot is red: blade direction is not dominantly forward on positive Z');
} else {
  throw new Error('source browserSocketProof must include bladeWorldDirection');
}
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
  captureKind: source.captureKind,
  screenshotPath: localScreenshotPath(source, manifestFile),
  screenshotUrl: args.screenshotUrl || source.screenshotUrl || '',
  screenshotSha256: source.screenshotSha256,
  visualRead,
  assertions,
  browserSocketProof: source.browserSocketProof,
  evidenceSource: {
    jobId: source.jobId,
    jobStatus: source.commandCenter?.jobStatus || source.jobStatus || 'completed',
    sessionId: source.sessionId,
    browserEpisodeId: source.browserEpisode?.episodeId,
    artifactManifestPath: path.resolve(args.manifest),
    surface: source.surface,
  },
};
const out = resolveProjectPath(args.out || DEFAULT_OUT);
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify({ok: true, out: path.relative(root, out), captureKind: evidence.captureKind, jobId: evidence.evidenceSource.jobId, browserEpisodeId: evidence.evidenceSource.browserEpisodeId}, null, 2));


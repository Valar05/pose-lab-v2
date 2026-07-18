#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const DEFAULT_EVIDENCE = 'generated/cloud-visual-evidence/crimson-sword/latest.json';
const HOSTED_ORIGIN = 'https://valar05.github.io';
const HOSTED_PATH = '/pose-lab-v2/';
const REQUIRED_ASSERTIONS = [
  'realSwordVisible',
  'hiltSeatedInHand',
  'bladeProjectsForwardFromWrist',
  'bladeTipDoesNotClimbForearmInRest',
  'noHandImpale',
  'noManualAlignmentRequired',
];
const ACCEPTED_CAPTURE_KINDS = [
  'cloud-screenshot',
  'hosted-cloud-screenshot',
  'sense-cloud-screenshot',
  'command-center-cloud-screenshot',
];

function parseArgs(argv) {
  const args = { evidence: DEFAULT_EVIDENCE, allowFixture: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--evidence') args.evidence = argv[++i] || '';
    else if (arg.startsWith('--evidence=')) args.evidence = arg.slice('--evidence='.length);
    else if (arg === '--allow-fixture') args.allowFixture = true;
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node tools/require_crimson_cloud_visual_evidence.mjs [--evidence FILE] [--allow-fixture]');
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function currentSha() {
  return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}

function resolveProjectPath(file) {
  return path.isAbsolute(file) ? file : path.join(root, file);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').slice(0, 240);
}

function fail(errors, evidenceFile) {
  console.error(JSON.stringify({
    ok: false,
    check: 'crimson-cloud-visual-acceptance',
    evidence: evidenceFile,
    classification: 'visual-acceptance',
    errors,
  }, null, 2));
  process.exit(1);
}

function validateHostedUrl(evidence, expectedCacheBust, errors) {
  const urlText = evidence.hostedUrl || evidence.url || evidence.reviewUrl || '';
  if (!urlText) {
    errors.push('missing hostedUrl for cloud screenshot evidence');
    return null;
  }
  let url = null;
  try {
    url = new URL(urlText);
  } catch (error) {
    errors.push(`invalid hostedUrl: ${compact(error.message)}`);
    return null;
  }
  if (url.origin !== HOSTED_ORIGIN || url.pathname !== HOSTED_PATH) {
    errors.push(`hostedUrl must be ${HOSTED_ORIGIN}${HOSTED_PATH}, got ${url.origin}${url.pathname}`);
  }
  if (url.protocol !== 'https:') errors.push('hostedUrl must use https');
  if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') errors.push('localhost is forbidden for Crimson visual acceptance');
  if (url.searchParams.get('model') !== 'crimson') errors.push('hostedUrl must request model=crimson');
  if (url.searchParams.get('cacheBust') !== expectedCacheBust) {
    errors.push(`hostedUrl cacheBust ${url.searchParams.get('cacheBust') || 'missing'} does not match ${expectedCacheBust}`);
  }
  return url;
}

function validateCapture(evidence, evidenceFile, args, errors) {
  const captureKind = evidence.captureKind || evidence.screenshotKind || evidence.evidenceLane || '';
  if (!ACCEPTED_CAPTURE_KINDS.includes(captureKind)) {
    errors.push(`captureKind must be ${ACCEPTED_CAPTURE_KINDS.join('/')}, got ${captureKind || 'missing'}`);
  }
  if (captureKind === 'command-center-cloud-screenshot') {
    const commandCenter = evidence.commandCenter || evidence.commandCenterProof || {};
    const jobId = evidence.commandCenterJobId || commandCenter.jobId || evidence.jobId || '';
    const episodeId = evidence.browserEpisodeId || evidence.browserEpisode?.episodeId || commandCenter.browserEpisodeId || '';
    const jobStatus = commandCenter.jobStatus || evidence.commandCenterJobStatus || '';
    if (!/^job_[A-Za-z0-9-]+/.test(String(jobId))) errors.push('Command Center evidence must include commandCenter.jobId for the terminal visual QA job');
    if (!/^browser_episode_[A-Za-z0-9_-]+/.test(String(episodeId))) errors.push('Command Center evidence must include a completed browser episode id');
    if (jobStatus && jobStatus !== 'completed') errors.push(`Command Center visual QA job must be completed when jobStatus is provided, got ${jobStatus}`);
    if (commandCenter.actionStatus === 'requested' && !episodeId) errors.push('Command Center requested actions are not visual evidence without a completed browser episode');
  }
  const screenshotPath = evidence.screenshotPath || evidence.capturePath || evidence.screenshot?.path || '';
  const screenshotUrl = evidence.screenshotUrl || evidence.screenshot?.url || '';
  const screenshotSha256 = evidence.screenshotSha256 || evidence.screenshot?.sha256 || '';
  if (!screenshotPath && !screenshotUrl) errors.push('cloud evidence must include screenshotPath or screenshotUrl');
  if (!/^[a-f0-9]{64}$/i.test(String(screenshotSha256))) errors.push('cloud evidence must include a 64-character screenshotSha256');
  if (screenshotUrl) {
    try {
      const url = new URL(screenshotUrl);
      if (url.protocol !== 'https:') errors.push('screenshotUrl must be https when provided');
    } catch (error) {
      errors.push(`invalid screenshotUrl: ${compact(error.message)}`);
    }
  }
  if (screenshotPath) {
    const absolute = resolveProjectPath(screenshotPath);
    const normalized = absolute.replace(/\\/g, '/');
    if (normalized.startsWith('/storage/emulated/0/Pictures/Screenshots/')) {
      errors.push('Android local screenshots are forbidden for Crimson cloud visual acceptance');
    }
    if (normalized.includes('/generated/crimson-sword-calibration/') || normalized.includes('/blender-render-truth/')) {
      errors.push('local Blender/diagnostic renders are forbidden for Crimson cloud visual acceptance');
    }
    const cloudEvidenceRoot = path.join(root, 'generated/cloud-visual-evidence').replace(/\\/g, '/');
    const tmpRoot = '/data/data/com.termux/files/usr/tmp/';
    if (!normalized.startsWith(cloudEvidenceRoot + '/') && !(args.allowFixture && normalized.startsWith(tmpRoot))) {
      errors.push('screenshotPath must live under generated/cloud-visual-evidence unless --allow-fixture is used by tests');
    }
    if (fs.existsSync(absolute)) {
      const actualHash = sha256(absolute);
      if (screenshotSha256 && actualHash !== screenshotSha256) errors.push(`screenshotSha256 does not match screenshotPath bytes: ${actualHash}`);
      if (fs.statSync(absolute).size < 1024 && !args.allowFixture) errors.push('screenshotPath is too small to be credible cloud screenshot evidence');
    } else if (!screenshotUrl) {
      errors.push(`screenshotPath does not exist and no screenshotUrl was provided: ${screenshotPath}`);
    }
  }
  if (!evidenceFile.replace(/\\/g, '/').includes('/generated/cloud-visual-evidence/') && !args.allowFixture) {
    errors.push('evidence manifest must live under generated/cloud-visual-evidence unless --allow-fixture is used by tests');
  }
}

function main() {
  const args = parseArgs(process.argv);
  const evidenceFile = resolveProjectPath(args.evidence);
  if (!fs.existsSync(evidenceFile)) {
    fail([
      `missing fresh cloud visual evidence: ${args.evidence}`,
      'Crimson sword visual acceptance requires a hosted GitHub Pages screenshot manifest, not build/smoke/intake checks.',
    ], evidenceFile);
  }
  const errors = [];
  let evidence = null;
  try {
    evidence = loadJson(evidenceFile);
  } catch (error) {
    fail([`invalid evidence JSON: ${compact(error.message)}`], evidenceFile);
  }
  const commit = currentSha();
  const expectedCacheBust = `crimson-sword-${commit}`;
  if (evidence.schema !== 'pose-lab-v2-crimson-sword-cloud-visual-evidence-v1') {
    errors.push(`schema must be pose-lab-v2-crimson-sword-cloud-visual-evidence-v1, got ${evidence.schema || 'missing'}`);
  }
  if (evidence.target !== 'crimson-sword' && evidence.target !== 'crimson') errors.push(`target must be crimson-sword, got ${evidence.target || 'missing'}`);
  if (evidence.model !== 'crimson') errors.push(`model must be crimson, got ${evidence.model || 'missing'}`);
  if (evidence.commit !== commit) errors.push(`evidence commit ${evidence.commit || 'missing'} does not match current ${commit}`);
  if (evidence.cacheBust !== expectedCacheBust) errors.push(`evidence cacheBust ${evidence.cacheBust || 'missing'} does not match ${expectedCacheBust}`);
  if (!evidence.capturedAt || Number.isNaN(Date.parse(evidence.capturedAt))) errors.push('capturedAt ISO timestamp is required');
  validateHostedUrl(evidence, expectedCacheBust, errors);
  validateCapture(evidence, evidenceFile, args, errors);
  const visualRead = String(evidence.visualRead || '');
  if (visualRead.length < 40) errors.push('visualRead must describe the visible hand/hilt/blade relationship in concrete nouns');
  if (/not seated|not held|behind the wrist|above the hilt|up the forearm|\bred\b|wrong|fails|manual alignment required/i.test(visualRead)) {
    errors.push('visualRead still describes a red Crimson sword relationship');
  }
  const assertions = evidence.assertions || {};
  for (const key of REQUIRED_ASSERTIONS) {
    if (assertions[key] !== true) errors.push(`visual assertion must be true: ${key}`);
  }
  const browserSocketProof = evidence.browserSocketProof || evidence.poseLabSocketProof || {};
  if (browserSocketProof.status !== 'attached') errors.push('browserSocketProof.status must be attached');
  if (browserSocketProof.parentBone !== 'RightHand') errors.push('browserSocketProof.parentBone must be RightHand');
  if (browserSocketProof.visibleInViewport !== true) errors.push('browserSocketProof.visibleInViewport must be true');
  if (!(Number(browserSocketProof.screenLengthPx) >= 12)) errors.push('browserSocketProof.screenLengthPx must show a visible blade length');
  if (!(Number(browserSocketProof.bladeWorldLength) >= 0.5)) errors.push('browserSocketProof.bladeWorldLength must be nonzero and sword-sized');
  if (!Array.isArray(browserSocketProof.hiltScreen) || !Array.isArray(browserSocketProof.tipScreen)) errors.push('browserSocketProof must include hiltScreen and tipScreen');
  if (Array.isArray(browserSocketProof.hiltScreen) && Array.isArray(browserSocketProof.tipScreen)) {
    const hiltX = Number(browserSocketProof.hiltScreen[0]);
    const hiltY = Number(browserSocketProof.hiltScreen[1]);
    const tipX = Number(browserSocketProof.tipScreen[0]);
    const tipY = Number(browserSocketProof.tipScreen[1]);
    const dx = tipX - hiltX;
    const dy = tipY - hiltY;
    if (!(Math.abs(dy) <= 80)) errors.push('Crimson rest blade tip must stay near hilt height in the review camera; a floor-down or forearm-up sword is red');
    if (!(Math.abs(dx) >= 35)) errors.push('Crimson rest blade must project visibly out from the wrist in the review camera, not vanish into the hand');
  }
  if (Array.isArray(browserSocketProof.bladeWorldDirection)) {
    const bladeY = Number(browserSocketProof.bladeWorldDirection[1]);
    const bladeZ = Number(browserSocketProof.bladeWorldDirection[2]);
    if (!(Math.abs(bladeY) <= 0.45)) errors.push('Crimson rest blade world direction must not be mostly vertical');
    const bladeX = Number(browserSocketProof.bladeWorldDirection[0]);
    if (!(bladeZ >= 0.85 && bladeZ > Math.abs(bladeX) * 2 && bladeZ > Math.abs(bladeY) * 4)) errors.push('Crimson rest blade world direction must be dominantly forward on positive Z, not side-leading X or vertical Y');
  }
  if (errors.length) fail(errors, evidenceFile);
  console.log(JSON.stringify({
    ok: true,
    check: 'crimson-cloud-visual-acceptance',
    classification: 'visual-acceptance',
    evidence: path.relative(root, evidenceFile),
    hostedUrl: evidence.hostedUrl || evidence.url || evidence.reviewUrl,
    cacheBust: expectedCacheBust,
    assertions: REQUIRED_ASSERTIONS,
  }, null, 2));
}

main();

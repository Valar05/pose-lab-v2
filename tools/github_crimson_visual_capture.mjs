#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function parseArgs(argv) {
  const args = {
    outDir: 'generated/cloud-visual-evidence/crimson-sword/github-actions',
    target: 'crimson-sword',
    sessionId: 'github_actions_crimson_session',
    episodeId: 'browser_episode_github_actions_crimson',
    timeoutMs: 180000,
    settleMs: 500,
    expectedCandidateId: '',
    expectedPoseSha: '',
    expectedCandidateModuleSha: '',
    urls: [],
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--url') args.urls.push({ label: `capture-${args.urls.length + 1}`, url: argv[++i] || '' });
    else if (arg.startsWith('--url=')) args.urls.push({ label: `capture-${args.urls.length + 1}`, url: arg.slice('--url='.length) });
    else if (arg === '--url-list') args.urls.push(...JSON.parse(argv[++i] || '[]'));
    else if (arg.startsWith('--url-list=')) args.urls.push(...JSON.parse(arg.slice('--url-list='.length) || '[]'));
    else if (arg === '--out-dir') args.outDir = argv[++i] || '';
    else if (arg === '--target') args.target = argv[++i] || args.target;
    else if (arg === '--job-id') args.jobId = argv[++i] || '';
    else if (arg === '--session-id') args.sessionId = argv[++i] || '';
    else if (arg === '--episode-id') args.episodeId = argv[++i] || '';
    else if (arg === '--timeout-ms') args.timeoutMs = Number(argv[++i] || args.timeoutMs);
    else if (arg === '--settle-ms') args.settleMs = Number(argv[++i] || args.settleMs);
    else if (arg === '--expected-candidate-id') args.expectedCandidateId = argv[++i] || '';
    else if (arg.startsWith('--expected-candidate-id=')) args.expectedCandidateId = arg.slice('--expected-candidate-id='.length);
    else if (arg === '--expected-pose-sha') args.expectedPoseSha = argv[++i] || '';
    else if (arg.startsWith('--expected-pose-sha=')) args.expectedPoseSha = arg.slice('--expected-pose-sha='.length);
    else if (arg === '--expected-candidate-module-sha') args.expectedCandidateModuleSha = argv[++i] || '';
    else if (arg.startsWith('--expected-candidate-module-sha=')) args.expectedCandidateModuleSha = arg.slice('--expected-candidate-module-sha='.length);
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node tools/github_crimson_visual_capture.mjs --url HOSTED_URL | --url-list JSON [--out-dir DIR] [--expected-candidate-id ID --expected-pose-sha SHA256 --expected-candidate-module-sha SHA256]');
      process.exit(0);
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  args.urls = args.urls.map((entry, index) => typeof entry === 'string'
    ? { label: `capture-${index + 1}`, url: entry }
    : {
        label: entry.label || entry.primeKey || `capture-${index + 1}`,
        primeKey: entry.primeKey || null,
        time: entry.time ?? null,
        cameraView: entry.cameraView || null,
        url: entry.url || '',
      });
  if (!args.urls.length || args.urls.some((entry) => !entry.url)) throw new Error('--url or --url-list with urls is required');
  const parityArgs = [args.expectedCandidateId, args.expectedPoseSha, args.expectedCandidateModuleSha];
  const suppliedParityArgs = parityArgs.filter(Boolean).length;
  if (suppliedParityArgs > 0 && suppliedParityArgs !== parityArgs.length) {
    throw new Error('candidate parity requires --expected-candidate-id, --expected-pose-sha, and --expected-candidate-module-sha together');
  }
  if (suppliedParityArgs && (!/^[a-f0-9]{64}$/.test(args.expectedPoseSha) || !/^[a-f0-9]{64}$/.test(args.expectedCandidateModuleSha))) {
    throw new Error('candidate parity pose and module SHA values must be lowercase 64-character hex');
  }
  return args;
}

export function assertBlenderManifestContract(manifest, expectedCandidateId) {
  const candidateId = String(manifest?.generatedCandidate?.candidateId || '');
  const authoredPoseSha = String(manifest?.authoredFrameZero?.poseSha256 || '');
  const generatedPoseSha = String(manifest?.generatedCandidate?.poseSha256 || '');
  const candidateModuleSha = String(manifest?.sourceHashes?.requestedCandidate?.sha256 || '');
  const errors = [];
  if (manifest?.status !== 'PASS') errors.push(`manifest status expected PASS, got ${manifest?.status || 'missing'}`);
  if (manifest?.candidateParity?.status !== 'PASS') errors.push(`candidate parity status expected PASS, got ${manifest?.candidateParity?.status || 'missing'}`);
  if (manifest?.candidateParity?.exactFramePayloadMatch !== true) errors.push('candidate parity exactFramePayloadMatch must be true');
  if (manifest?.candidateParity?.authoredGlbShaMatch !== true) errors.push('candidate parity authoredGlbShaMatch must be true');
  if (manifest?.candidateParity?.committedStatusMatch !== true) errors.push('candidate parity committedStatusMatch must be true');
  if (manifest?.candidateParity?.committedAuthorEligibleBeforeCandidateParity !== true) errors.push('candidate parity committed author eligibility must be true');
  if (manifest?.authoredFrameZero?.exactAuthoredGlb !== true) errors.push('authoredFrameZero.exactAuthoredGlb must be true');
  if (manifest?.candidate !== expectedCandidateId) errors.push(`manifest candidate expected ${expectedCandidateId}, got ${manifest?.candidate || 'missing'}`);
  if (candidateId !== expectedCandidateId) errors.push(`generated candidate expected ${expectedCandidateId}, got ${candidateId || 'missing'}`);
  if (!/^[a-f0-9]{64}$/.test(authoredPoseSha)) errors.push('authored frame pose SHA must be lowercase 64-character hex');
  if (generatedPoseSha !== authoredPoseSha) errors.push('authored and generated pose SHA values must match');
  if (manifest?.generatedCandidate?.source?.exactAuthoredGlb !== true) errors.push('generated candidate must declare exactAuthoredGlb');
  if (manifest?.generatedCandidate?.source?.status !== 'generated-visual-pending-candidate-parity') errors.push('generated candidate must be author-eligible before browser review');
  if (manifest?.generatedCandidate?.source?.authorEligibleBeforeCandidateParity !== true) errors.push('generated candidate author eligibility must be true');
  if (manifest?.generatedCandidate?.source?.poseSha256 !== authoredPoseSha) errors.push('generated candidate source pose SHA must match authored pose SHA');
  if (manifest?.candidateParity?.committedPoseSha256 !== authoredPoseSha) errors.push('committed candidate pose SHA must match authored pose SHA');
  if (manifest?.candidateParity?.generatedPoseSha256 !== authoredPoseSha) errors.push('candidate parity generated pose SHA must match authored pose SHA');
  const authoredGlbSha = String(manifest?.authoredFrameZero?.glb?.sha256 || '');
  if (!/^[a-f0-9]{64}$/.test(authoredGlbSha)) errors.push('authored frame GLB SHA must be lowercase 64-character hex');
  if (manifest?.candidateParity?.generatedAuthoredGlbSha256 !== authoredGlbSha) errors.push('candidate parity generated GLB SHA must match authored frame GLB');
  if (manifest?.candidateParity?.committedDeclaredAuthoredGlbSha256 !== authoredGlbSha) errors.push('committed candidate GLB SHA must match authored frame GLB');
  if (manifest?.generatedCandidate?.source?.authoredGlbSha256 !== authoredGlbSha) errors.push('generated candidate GLB SHA must match authored frame GLB');
  if (!/^[a-f0-9]{64}$/.test(candidateModuleSha)) errors.push('requested candidate module SHA must be lowercase 64-character hex');
  if (manifest?.candidateParity?.committedCandidateSha256 !== candidateModuleSha) errors.push('candidate parity module SHA must match requested candidate source hash');
  if (errors.length) throw new Error(`Blender candidate contract failed: ${errors.join('; ')}`);
  return { candidateId, poseSha: authoredPoseSha, candidateModuleSha };
}

export function assertRuntimeAuthoringReportContract(report, expectedCandidateId, candidate) {
  const candidateId = String(report?.candidate || '');
  const poseSha = String(report?.poseSha256 || '');
  const candidateModuleSha = String(report?.candidateModuleSha256 || '');
  const authoredGlbSha = String(report?.authoredGlb?.sha256 || '');
  const source = candidate?.source || {};
  const runtimeAuthoring = source.runtimeAuthoring || {};
  const errors = [];
  if (report?.schema !== 'pose-lab-v2-crimson-runtime-frame-zero-authoring-report-v1') {
    errors.push(`report schema is invalid: ${report?.schema || 'missing'}`);
  }
  if (report?.status !== 'PASS') errors.push(`report status expected PASS, got ${report?.status || 'missing'}`);
  if (candidateId !== expectedCandidateId) errors.push(`report candidate expected ${expectedCandidateId}, got ${candidateId || 'missing'}`);
  if (candidate?.id !== expectedCandidateId) errors.push(`committed candidate expected ${expectedCandidateId}, got ${candidate?.id || 'missing'}`);
  if (!/^[a-f0-9]{64}$/.test(poseSha)) errors.push('pose SHA must be lowercase 64-character hex');
  if (!/^[a-f0-9]{64}$/.test(candidateModuleSha)) errors.push('candidate module SHA must be lowercase 64-character hex');
  if (!/^[a-f0-9]{64}$/.test(authoredGlbSha)) errors.push('authored GLB SHA must be lowercase 64-character hex');
  if (report?.committedModuleParity?.enforced !== true) errors.push('committed module parity must be enforced with --check');
  if (report?.committedModuleParity?.status !== 'PASS') errors.push('committed module parity status must be PASS');
  if (report?.committedModuleParity?.exactBytes !== true) errors.push('committed module parity exactBytes must be true');
  if (report?.committedModuleParity?.committedSha256 !== candidateModuleSha
    || report?.committedModuleParity?.generatedSha256 !== candidateModuleSha) {
    errors.push('committed and generated module SHA values must match the report module SHA');
  }
  if (report?.selected?.status !== 'PASS') errors.push('selected runtime geometry status must be PASS');
  const selectedChecks = report?.selected?.checks || {};
  for (const check of [
    'silhouette',
    'supportPalmPin',
    'vanguardHighGuard',
    'leftLowElbow',
    'rightLowElbow',
    'supportReachReserve',
    'supportElbowBend',
    'dominantReachReserve',
    'dominantElbowBend',
  ]) {
    if (selectedChecks[check] !== true) errors.push(`selected runtime geometry check ${check} must be true`);
  }
  if (report?.selected?.angleDeg !== 48) errors.push(`selected runtime angle expected 48, got ${report?.selected?.angleDeg ?? 'missing'}`);
  if (JSON.stringify(report?.testedAnglesDeg) !== JSON.stringify([48])) errors.push('runtime authoring must test exactly the bound 48 degree correction');
  if (!Array.isArray(report?.trials) || report.trials.length !== 1
    || JSON.stringify(report.trials[0]) !== JSON.stringify(report.selected)) {
    errors.push('runtime authoring trials must contain the exact selected trial');
  }
  if (report?.selected?.silhouette?.status !== 'PASS') errors.push('selected silhouette status must be PASS');
  for (const view of ['center', 'left', 'right']) {
    if (report?.selected?.silhouette?.views?.[view]?.status !== 'PASS') {
      errors.push(`selected silhouette view ${view} must be PASS`);
    }
  }
  const roundTrip = report?.authoredGlb?.roundTrip || {};
  if (report?.authoredGlb?.path !== 'generated/pose-candidates/crimson-combat-ready-vanguard-frame0-4.authored.glb') errors.push('authored GLB path is invalid');
  if (!Number.isInteger(report?.authoredGlb?.byteLength) || report.authoredGlb.byteLength <= 0) errors.push('authored GLB byteLength must be a positive integer');
  if (report?.authoredGlb?.animation !== 'CrimsonRuntimeCombatReadyFrameZero') errors.push('authored GLB animation name is invalid');
  if (report?.authoredGlb?.channelCount !== 21) errors.push('authored GLB must declare 21 channels');
  if (roundTrip.status !== 'PASS') errors.push('authored GLB round-trip status must be PASS');
  if (roundTrip.animation !== report?.authoredGlb?.animation) errors.push('authored GLB round-trip animation must match');
  if (roundTrip.duration !== 0) errors.push('authored GLB round-trip duration must be zero');
  if (roundTrip.channelCount !== 21 || roundTrip.uniqueChannelCount !== 21) errors.push('authored GLB round-trip must contain 21 unique channels');
  if (!Array.isArray(roundTrip.channels) || roundTrip.channels.length !== 21
    || new Set(roundTrip.channels).size !== 21) errors.push('authored GLB round-trip channel list must contain 21 unique names');
  if (roundTrip.reconstructedPoseSha256 !== poseSha) errors.push('authored GLB round-trip pose SHA must match the report pose SHA');
  const finiteMetrics = [
    report?.selected?.blade?.residualAngleDeg,
    report?.selected?.supportHand?.palmPinErrorWorld,
    report?.selected?.supportHand?.reachReserveTorso,
    report?.selected?.supportHand?.elbowAngleDeg,
    report?.selected?.lowElbows?.leftDropTorso,
    report?.selected?.lowElbows?.rightDropTorso,
    report?.selected?.vanguardHighGuard?.dominantHandAboveNeckTorso,
    report?.selected?.vanguardHighGuard?.supportHandAboveNeckTorso,
    report?.selected?.vanguardHighGuard?.handClusterBesideHeadShoulders,
    report?.selected?.vanguardHighGuard?.gripStepTorso,
    report?.selected?.reachAndBend?.rightReachReserveTorso,
    report?.selected?.reachAndBend?.rightElbowAngleDeg,
    ...['center', 'left', 'right'].flatMap((view) => {
      const gate = report?.selected?.silhouette?.views?.[view] || {};
      return [
        gate.bladeHeadPixels,
        gate.guardHeadPixels,
        gate.minimumArmHeadPixels,
        gate.minimumHandHeadPixels,
        ...(gate.bladeScreen?.hilt || []),
        ...(gate.bladeScreen?.tip || []),
      ];
    }),
  ];
  if (finiteMetrics.some((value) => !Number.isFinite(value))) errors.push('runtime authoring geometry metrics must all be finite');
  if (source.exactAuthoredGlb !== true || source.exactAuthoredBodyGlb !== true) errors.push('committed candidate must declare exact authored body GLB');
  if (source.status !== 'generated-visual-pending-candidate-parity') errors.push('committed candidate must remain visual-pending before browser review');
  if (source.authorEligibleBeforeCandidateParity !== true) errors.push('committed candidate author eligibility must be true');
  if (source.poseSha256 !== poseSha) errors.push('committed candidate pose SHA must match the report');
  if (source.authoredGlbSha256 !== authoredGlbSha) errors.push('committed candidate authored GLB SHA must match the report');
  if (runtimeAuthoring.schema !== 'pose-lab-v2-crimson-runtime-frame-zero-authoring-v1') errors.push('committed candidate runtime-authoring schema is invalid');
  if (runtimeAuthoring.authoredGlb?.sha256 !== authoredGlbSha) errors.push('runtime-authoring GLB SHA must match the report');
  if (runtimeAuthoring.authoredGlb?.animation !== report?.authoredGlb?.animation) errors.push('runtime-authoring animation must match the report');
  if (runtimeAuthoring.authoredGlb?.channels?.length !== 21) errors.push('runtime-authoring metadata must contain 21 channels');
  if (runtimeAuthoring.authoredGlb?.byteLength !== report?.authoredGlb?.byteLength) errors.push('runtime-authoring GLB byteLength must match the report');
  if (JSON.stringify(runtimeAuthoring.authoredBones) !== JSON.stringify([
    'LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand',
  ])) errors.push('runtime authoring must own both complete arm chains');
  if (runtimeAuthoring.gates?.status !== 'PASS') errors.push('committed runtime-authoring gates must be PASS');
  if (JSON.stringify(runtimeAuthoring.gates) !== JSON.stringify(report?.selected)) errors.push('committed runtime-authoring gates must exactly match the report selection');
  if (JSON.stringify(runtimeAuthoring.viewport) !== JSON.stringify([986, 900])) errors.push('committed runtime-authoring viewport must be 986x900');
  if (JSON.stringify(runtimeAuthoring.bladeWorldDirection) !== JSON.stringify(runtimeAuthoring.gates?.blade?.actualWorldDirection)) errors.push('runtime-authoring blade direction must match its selected gate');
  if (errors.length) throw new Error(`Runtime authoring contract failed: ${errors.join('; ')}`);
  return { candidateId, poseSha, candidateModuleSha, authoredGlbSha };
}

function appliedProofFromDataset(dataset) {
  try { return JSON.parse(dataset?.reviewAppliedProof || ''); }
  catch { return null; }
}

export function assertExpectedReviewParity(debugPayload, args) {
  const expected = {
    candidateId: String(args.expectedCandidateId || ''),
    poseSha: String(args.expectedPoseSha || ''),
    candidateModuleSha: String(args.expectedCandidateModuleSha || ''),
  };
  const appliedProof = appliedProofFromDataset(debugPayload?.dataset);
  const actual = {
    candidateId: String(debugPayload?.dataset?.reviewCandidateId || ''),
    poseSha: String(debugPayload?.dataset?.reviewPoseSha || ''),
    candidateModuleSha: String(debugPayload?.dataset?.reviewCandidateModuleSha || ''),
    appliedProof,
  };
  const mismatches = [];
  if (expected.candidateId && actual.candidateId !== expected.candidateId) {
    mismatches.push(`candidate id expected ${expected.candidateId}, got ${actual.candidateId || 'missing'}`);
  }
  if (expected.poseSha && actual.poseSha !== expected.poseSha) {
    mismatches.push(`pose SHA expected ${expected.poseSha}, got ${actual.poseSha || 'missing'}`);
  }
  if (expected.candidateModuleSha && actual.candidateModuleSha !== expected.candidateModuleSha) {
    mismatches.push(`candidate module SHA expected ${expected.candidateModuleSha}, got ${actual.candidateModuleSha || 'missing'}`);
  }
  if (expected.candidateId) {
    if (!appliedProof) mismatches.push('candidate applied proof is missing or invalid JSON');
    else {
      if (appliedProof.status !== 'PASS') mismatches.push(`candidate applied proof expected PASS, got ${appliedProof.status || 'missing'}`);
      if (appliedProof.candidateId !== expected.candidateId) mismatches.push('candidate applied proof id does not match expected candidate');
      if (appliedProof.poseSha !== expected.poseSha) mismatches.push('candidate applied proof pose SHA does not match expected pose');
      if (appliedProof.candidateModuleSha !== expected.candidateModuleSha) mismatches.push('candidate applied proof module SHA does not match expected module');
      if (appliedProof.exactAuthoredGlb !== true) mismatches.push('candidate applied proof must declare exactAuthoredGlb');
      if (appliedProof.zeroMissingRequestedBones !== true || appliedProof.missingRequestedBones?.length) mismatches.push('candidate applied proof has missing requested bones');
      if (appliedProof.allRequestedChannelsApplied !== true) mismatches.push('candidate applied proof did not apply every requested channel');
      if (!(appliedProof.bones?.requestedCount > 0) || appliedProof.bones?.appliedCount !== appliedProof.bones?.requestedCount) mismatches.push('candidate applied proof bone counts do not match');
      if (appliedProof.positions?.appliedCount !== appliedProof.positions?.requestedCount) mismatches.push('candidate applied proof position counts do not match');
      if (!(appliedProof.saber?.requestedCount > 0) || appliedProof.saber?.appliedCount !== appliedProof.saber?.requestedCount) mismatches.push('candidate applied proof saber counts do not match');
    }
  }
  const proof = {
    enforced: Boolean(expected.candidateId),
    status: mismatches.length ? 'FAIL' : expected.candidateId ? 'PASS' : 'NOT_ENFORCED',
    expected,
    actual,
    mismatches,
  };
  if (mismatches.length) {
    const error = new Error(`rendered candidate parity failed: ${mismatches.join('; ')}`);
    error.reviewParity = proof;
    throw error;
  }
  return proof;
}

export function assertRuntimeAuthoringProof(debugPayload, expectedCameraView, expectedCandidateId) {
  let proof = null;
  try { proof = JSON.parse(debugPayload?.dataset?.crimsonRuntimeAuthoringProof || ''); }
  catch { proof = null; }
  const expectedView = expectedCameraView || 'center';
  const errors = [];
  if (!proof) errors.push('runtime-authoring proof is missing or invalid JSON');
  else {
    if (proof.schema !== 'pose-lab-v2-crimson-runtime-authoring-proof-v1') errors.push('runtime-authoring proof schema is invalid');
    if (proof.status !== 'PASS') errors.push(`runtime-authoring proof expected PASS, got ${proof.status || 'missing'}`);
    if (proof.candidateId !== expectedCandidateId) errors.push(`runtime-authoring proof candidate expected ${expectedCandidateId}, got ${proof.candidateId || 'missing'}`);
    if (proof.view !== expectedView) errors.push(`runtime-authoring proof view expected ${expectedView}, got ${proof.view || 'missing'}`);
    for (const name of ['candidate', 'authoringGate', 'viewGate', 'viewport', 'bladeDirection', 'hiltScreen', 'tipScreen']) {
      if (proof.checks?.[name] !== true) errors.push(`runtime-authoring proof check ${name} must be true`);
    }
    const metricThresholds = [
      ['bladeAngleDeg', 'bladeAngleDeg'],
      ['hiltScreenPixels', 'screenPointPixels'],
      ['tipScreenPixels', 'screenPointPixels'],
    ];
    for (const [metric, threshold] of metricThresholds) {
      const value = proof.errors?.[metric];
      const maximum = proof.thresholds?.[threshold];
      if (!Number.isFinite(value) || !Number.isFinite(maximum) || value > maximum) {
        errors.push(`runtime-authoring proof ${metric} must be finite and within ${threshold}`);
      }
    }
  }
  if (errors.length) {
    const error = new Error(`runtime-authoring browser parity failed: ${errors.join('; ')}`);
    error.runtimeAuthoringProof = proof;
    throw error;
  }
  return proof;
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function safeName(value, index) {
  return `${String(index + 1).padStart(2, '0')}-${String(value || 'capture').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'capture'}`;
}

async function collectDebug(page) {
  return page.evaluate(() => ({
    dataset: { ...document.body.dataset },
    readyState: document.readyState,
    locationHref: location.href,
    title: document.title,
    visibleText: document.body.innerText.slice(0, 1000),
    canvases: Array.from(document.querySelectorAll('canvas')).map((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        bounds: [rect.left, rect.top, rect.right, rect.bottom].map((value) => Math.round(value)),
      };
    }),
  }));
}

function socketProof(debugPayload) {
  const raw = debugPayload?.dataset?.crimsonSocketProof || '';
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch (error) { return { status: 'invalid-json', parseError: error.message }; }
}

function browserLaunchOptions() {
  const channel = process.env.PLAYWRIGHT_CHROME_CHANNEL || (process.env.CI ? 'chrome' : '');
  const options = {
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  };
  if (channel) options.channel = channel;
  return options;
}

async function captureOne({ page, args, entry, outDir, index, launchOptions }) {
  const captureDir = args.urls.length === 1 ? outDir : path.join(outDir, safeName(entry.primeKey || entry.label, index));
  await fs.mkdir(captureDir, { recursive: true });
  const consoleEvents = [];
  const pageErrors = [];
  const networkFailures = [];
  const responseStatuses = [];
  const onConsole = (message) => consoleEvents.push({ type: message.type(), text: message.text().slice(0, 1000) });
  const onPageError = (error) => pageErrors.push(String(error.message || error).slice(0, 1000));
  const onRequestFailed = (request) => networkFailures.push({ url: request.url(), failure: request.failure()?.errorText || '' });
  const onResponse = (response) => { if (response.status() >= 400) responseStatuses.push({ url: response.url(), status: response.status() }); };
  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);
  page.on('response', onResponse);
  try {
    const failCapture = async (phase, error, debugPayload = null) => {
      const payload = debugPayload || await collectDebug(page);
      const failureScreenshotPath = path.join(captureDir, 'failure-screenshot.png');
      await page.screenshot({ path: failureScreenshotPath, fullPage: false });
      const failure = {
        schema: 'pose-lab-v2-cloud-visual-capture-failure-v1',
        phase,
        label: entry.label,
        url: page.url(),
        error: String(error?.message || error),
        reviewParity: error?.reviewParity || null,
        runtimeAuthoringProof: error?.runtimeAuthoringProof || null,
        debugPayload: payload,
        consoleEvents,
        pageErrors,
        networkFailures,
        responseStatuses,
        screenshotPath: failureScreenshotPath,
      };
      await fs.writeFile(path.join(captureDir, 'failure.json'), JSON.stringify(failure, null, 2) + '\n');
      throw new Error(`${phase} failed for ${entry.label}: ${JSON.stringify(failure)}`);
    };
    await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: args.timeoutMs });
    try {
      await page.waitForFunction(() => {
        const dataset = document.body?.dataset || {};
        return dataset.reviewReady === '1'
          && dataset.firstFrame === '1'
          && dataset.bootReady === '1'
          && (!dataset.saberAttachmentStatus || dataset.saberAttachmentStatus === 'attached')
          && (!dataset.saberVisibleInViewport || dataset.saberVisibleInViewport === 'true');
      }, null, { timeout: args.timeoutMs });
    } catch (error) {
      await failCapture('visual readiness', error);
    }
    const parityDebugPayload = await collectDebug(page);
    let reviewParity;
    try {
      reviewParity = assertExpectedReviewParity(parityDebugPayload, args);
    } catch (error) {
      await failCapture('rendered candidate parity', error, parityDebugPayload);
    }
    if (entry.cameraView) {
      await page.evaluate((cameraView) => {
        const button = document.querySelector(`[data-camera-view="${cameraView}"]`);
        if (!button) throw new Error(`missing camera view button: ${cameraView}`);
        button.click();
      }, entry.cameraView);
      try {
        await page.waitForFunction((cameraView) => {
          try {
            const proof = JSON.parse(document.body?.dataset?.crimsonRuntimeAuthoringProof || '');
            return proof.view === cameraView;
          } catch {
            return false;
          }
        }, entry.cameraView, { timeout: args.timeoutMs });
      } catch (error) {
        await failCapture('runtime authoring view sync', error);
      }
    }
    await page.waitForTimeout(Math.max(0, Math.min(args.settleMs, 30000)));
    const debugPayload = await collectDebug(page);
    let runtimeAuthoringProof = null;
    if (args.expectedCandidateId) {
      try {
        runtimeAuthoringProof = assertRuntimeAuthoringProof(
          debugPayload,
          entry.cameraView || 'center',
          args.expectedCandidateId,
        );
      } catch (error) {
        await failCapture('runtime authoring parity', error, debugPayload);
      }
    }
    const screenshotPath = path.join(captureDir, 'screenshot.png');
    const screenshotBytes = await page.screenshot({ path: screenshotPath, fullPage: false });
    const manifest = {
      schema: 'command-center-visual-qa-evidence-v1',
      target: args.target,
      captureKind: 'cloud-screenshot',
      jobId: args.jobId || 'github_actions_crimson_visual_qa',
      sessionId: args.sessionId,
      browserEpisode: { episodeId: `${args.episodeId}_${index + 1}`, outcome: 'visual_qa_captured' },
      label: entry.label,
      primeKey: entry.primeKey,
      attackTime: entry.time,
      cameraView: entry.cameraView,
      startUrl: entry.url,
      finalUrl: page.url(),
      capturedAt: new Date().toISOString(),
      screenshotPath,
      screenshotSha256: sha256(screenshotBytes),
      surface: {
        runtime: 'github-actions-playwright',
        browser: 'system-chrome',
        channel: launchOptions.channel || 'playwright-default',
        mode: 'desktop',
        viewport: { width: 1366, height: 900 },
      },
      browserSocketProof: socketProof(debugPayload),
      runtimeAuthoringProof,
      reviewParity,
      bootTimings: (() => { try { return JSON.parse(debugPayload?.dataset?.bootTimings || '{}'); } catch { return {}; } })(),
      debugPayload,
      consoleEvents,
      pageErrors,
      networkFailures,
      responseStatuses,
      visualRead: '',
      assertions: {
        renderedCandidateParity: reviewParity.enforced ? reviewParity.status === 'PASS' : null,
        runtimeAuthoringParity: runtimeAuthoringProof ? runtimeAuthoringProof.status === 'PASS' : null,
      },
    };
    await fs.writeFile(path.join(captureDir, 'visual_qa_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    await fs.writeFile(path.join(captureDir, 'console_network.json'), JSON.stringify({ consoleEvents, pageErrors, networkFailures, responseStatuses }, null, 2) + '\n');
    return { label: entry.label, primeKey: entry.primeKey, time: entry.time, manifest: path.join(captureDir, 'visual_qa_manifest.json'), screenshot: screenshotPath, screenshotSha256: manifest.screenshotSha256, reviewParity, bootTimings: manifest.bootTimings };
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);
  }
}

export async function main(argv = process.argv) {
  const args = parseArgs(argv);
  const { chromium } = await import('playwright');
  const outDir = path.resolve(args.outDir);
  await fs.mkdir(outDir, { recursive: true });
  const launchOptions = browserLaunchOptions();
  const browser = await chromium.launch(launchOptions);
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
    const captures = [];
    for (let index = 0; index < args.urls.length; index += 1) {
      captures.push(await captureOne({ page, args, entry: args.urls[index], outDir, index, launchOptions }));
    }
    const batchManifest = {
      schema: 'pose-lab-v2-cloud-visual-batch-v1',
      target: args.target,
      capturedAt: new Date().toISOString(),
      expectedReviewParity: {
        candidateId: args.expectedCandidateId || '',
        poseSha: args.expectedPoseSha || '',
        candidateModuleSha: args.expectedCandidateModuleSha || '',
      },
      captureCount: captures.length,
      captures,
    };
    await fs.writeFile(path.join(outDir, 'batch_manifest.json'), JSON.stringify(batchManifest, null, 2) + '\n');
    console.log(JSON.stringify({ ok: true, outDir, captures }, null, 2));
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await main();

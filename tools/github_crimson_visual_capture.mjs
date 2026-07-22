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
    }
    await page.waitForTimeout(Math.max(0, Math.min(args.settleMs, 30000)));
    const screenshotPath = path.join(captureDir, 'screenshot.png');
    const screenshotBytes = await page.screenshot({ path: screenshotPath, fullPage: false });
    const debugPayload = await collectDebug(page);
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
      reviewParity,
      bootTimings: (() => { try { return JSON.parse(debugPayload?.dataset?.bootTimings || '{}'); } catch { return {}; } })(),
      debugPayload,
      consoleEvents,
      pageErrors,
      networkFailures,
      responseStatuses,
      visualRead: '',
      assertions: { renderedCandidateParity: reviewParity.enforced ? reviewParity.status === 'PASS' : null },
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

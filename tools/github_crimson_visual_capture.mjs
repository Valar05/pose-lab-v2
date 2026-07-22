#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

function parseArgs(argv) {
  const args = {
    outDir: 'generated/cloud-visual-evidence/crimson-sword/github-actions',
    target: 'crimson-sword',
    sessionId: 'github_actions_crimson_session',
    episodeId: 'browser_episode_github_actions_crimson',
    timeoutMs: 180000,
    settleMs: 500,
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
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node tools/github_crimson_visual_capture.mjs --url HOSTED_URL | --url-list JSON [--out-dir DIR]');
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
  return args;
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
      const debugPayload = await collectDebug(page);
      const failureScreenshotPath = path.join(captureDir, 'failure-screenshot.png');
      await page.screenshot({ path: failureScreenshotPath, fullPage: false });
      const failure = {
        schema: 'pose-lab-v2-cloud-visual-capture-failure-v1',
        label: entry.label,
        url: page.url(),
        error: String(error?.message || error),
        debugPayload,
        consoleEvents,
        pageErrors,
        networkFailures,
        responseStatuses,
        screenshotPath: failureScreenshotPath,
      };
      await fs.writeFile(path.join(captureDir, 'failure.json'), JSON.stringify(failure, null, 2) + '\n');
      throw new Error(`visual readiness failed for ${entry.label}: ${JSON.stringify(failure)}`);
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
      bootTimings: (() => { try { return JSON.parse(debugPayload?.dataset?.bootTimings || '{}'); } catch { return {}; } })(),
      debugPayload,
      consoleEvents,
      pageErrors,
      networkFailures,
      responseStatuses,
      visualRead: '',
      assertions: {},
    };
    await fs.writeFile(path.join(captureDir, 'visual_qa_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    await fs.writeFile(path.join(captureDir, 'console_network.json'), JSON.stringify({ consoleEvents, pageErrors, networkFailures, responseStatuses }, null, 2) + '\n');
    return { label: entry.label, primeKey: entry.primeKey, time: entry.time, manifest: path.join(captureDir, 'visual_qa_manifest.json'), screenshot: screenshotPath, screenshotSha256: manifest.screenshotSha256, bootTimings: manifest.bootTimings };
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);
    page.off('response', onResponse);
  }
}

const args = parseArgs(process.argv);
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
    captureCount: captures.length,
    captures,
  };
  await fs.writeFile(path.join(outDir, 'batch_manifest.json'), JSON.stringify(batchManifest, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, outDir, captures }, null, 2));
} finally {
  await browser.close();
}

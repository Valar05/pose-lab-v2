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
    settleMs: 5000,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--url') args.url = argv[++i] || '';
    else if (arg.startsWith('--url=')) args.url = arg.slice('--url='.length);
    else if (arg === '--out-dir') args.outDir = argv[++i] || '';
    else if (arg === '--job-id') args.jobId = argv[++i] || '';
    else if (arg === '--session-id') args.sessionId = argv[++i] || '';
    else if (arg === '--episode-id') args.episodeId = argv[++i] || '';
    else if (arg === '--timeout-ms') args.timeoutMs = Number(argv[++i] || args.timeoutMs);
    else if (arg === '--settle-ms') args.settleMs = Number(argv[++i] || args.settleMs);
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node tools/github_crimson_visual_capture.mjs --url HOSTED_URL [--out-dir DIR]');
      process.exit(0);
    } else {
      throw new Error('unknown argument: ' + arg);
    }
  }
  if (!args.url) throw new Error('--url is required');
  return args;
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
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

const args = parseArgs(process.argv);
const outDir = path.resolve(args.outDir);
await fs.mkdir(outDir, { recursive: true });
const consoleEvents = [];
const pageErrors = [];
const networkFailures = [];
const responseStatuses = [];
const launchOptions = browserLaunchOptions();
const browser = await chromium.launch(launchOptions);
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
  page.on('console', (message) => consoleEvents.push({ type: message.type(), text: message.text().slice(0, 1000) }));
  page.on('pageerror', (error) => pageErrors.push(String(error.message || error).slice(0, 1000)));
  page.on('requestfailed', (request) => networkFailures.push({ url: request.url(), failure: request.failure()?.errorText || '' }));
  page.on('response', (response) => {
    if (response.status() >= 400) responseStatuses.push({ url: response.url(), status: response.status() });
  });
  await page.goto(args.url, { waitUntil: 'domcontentloaded', timeout: args.timeoutMs });
  await page.waitForFunction(() => {
    const dataset = document.body?.dataset || {};
    return dataset.bootReady === '1'
      && dataset.saberAttachmentStatus === 'attached'
      && dataset.saberVisibleInViewport === 'true';
  }, null, { timeout: args.timeoutMs });
  await page.waitForTimeout(Math.max(0, Math.min(args.settleMs, 30000)));
  const screenshotPath = path.join(outDir, 'screenshot.png');
  const screenshotBytes = await page.screenshot({ path: screenshotPath, fullPage: false });
  const debugPayload = await collectDebug(page);
  const manifest = {
    schema: 'command-center-visual-qa-evidence-v1',
    target: args.target,
    captureKind: 'cloud-screenshot',
    jobId: args.jobId || 'github_actions_crimson_visual_qa',
    sessionId: args.sessionId,
    browserEpisode: { episodeId: args.episodeId, outcome: 'visual_qa_captured' },
    startUrl: args.url,
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
    debugPayload,
    consoleEvents,
    pageErrors,
    networkFailures,
    responseStatuses,
    visualRead: '',
    assertions: {},
  };
  await fs.writeFile(path.join(outDir, 'visual_qa_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await fs.writeFile(path.join(outDir, 'console_network.json'), JSON.stringify({ consoleEvents, pageErrors, networkFailures, responseStatuses }, null, 2) + '\n');
  console.log(JSON.stringify({ ok: true, manifest: path.join(outDir, 'visual_qa_manifest.json'), screenshot: screenshotPath, screenshotSha256: manifest.screenshotSha256 }, null, 2));
} finally {
  await browser.close();
}

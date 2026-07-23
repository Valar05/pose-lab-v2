#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

function parseArgs(argv) {
  const args = {
    url: 'http://127.0.0.1:4173/',
    outDir: 'generated/sprite-review',
    batchFixture: null,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--url') args.url = argv[++index] || args.url;
    else if (argument.startsWith('--url=')) args.url = argument.slice('--url='.length);
    else if (argument === '--out-dir') args.outDir = argv[++index] || args.outDir;
    else if (argument.startsWith('--out-dir=')) args.outDir = argument.slice('--out-dir='.length);
    else if (argument === '--batch-fixture') args.batchFixture = argv[++index] || args.batchFixture;
    else if (argument.startsWith('--batch-fixture=')) args.batchFixture = argument.slice('--batch-fixture='.length);
    else throw new Error(`unknown argument: ${argument}`);
  }
  return args;
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function browserLaunchOptions() {
  const channel = process.env.PLAYWRIGHT_CHROME_CHANNEL || (process.env.CI ? 'chrome' : '');
  return {
    ...(channel ? { channel } : {}),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  };
}

async function inspect(page) {
  return page.evaluate(() => {
    const current = document.querySelector('[data-current-frame]');
    const delta = document.querySelector('[data-delta-frame]');
    const activeFrame = document.querySelector('[data-frame-index].active');
    return {
      title: document.title,
      dataset: { ...document.body.dataset },
      currentFrame: current ? {
        src: current.getAttribute('src'),
        naturalWidth: current.naturalWidth,
        naturalHeight: current.naturalHeight,
        alt: current.getAttribute('alt'),
      } : null,
      deltaCanvas: delta ? {
        width: delta.width,
        height: delta.height,
        visible: getComputedStyle(delta).display !== 'none',
      } : null,
      frameCount: document.querySelectorAll('[data-frame-index]').length,
      activeFrameIndex: activeFrame?.getAttribute('data-frame-index') || null,
      readout: document.querySelector('[data-frame-readout]')?.textContent || '',
    };
  });
}

async function inspectBatch(page) {
  return page.evaluate(() => ({
    title: document.querySelector('[data-batch-title]')?.textContent || '',
    batchStates: [...document.querySelectorAll('[data-batch-clips] [role="listitem"]')].map((row) => ({
      clip: row.querySelector('h4')?.textContent || '',
      state: row.querySelector('.sprite-state-badge')?.textContent?.toLowerCase() || '',
      evidenceLinks: [...row.querySelectorAll('a')].map((link) => ({ label: link.textContent, href: link.href })),
    })),
  }));
}

const args = parseArgs(process.argv);
const outDir = path.resolve(args.outDir);
await fs.mkdir(outDir, { recursive: true });
const launchOptions = browserLaunchOptions();
const browser = await chromium.launch(launchOptions);
const report = {
  schema: 'pose-lab-v2-sprite-browser-evidence-v1',
  capturedAt: new Date().toISOString(),
  browser: launchOptions.channel || 'playwright-default',
  viewport: { width: 1366, height: 900 },
  captures: [],
};

try {
  const page = await browser.newPage({ viewport: report.viewport, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error.message || error)));

  for (const animation of ['idle', 'swordattack1']) {
    const url = new URL(args.url);
    url.searchParams.set('view', '2d');
    url.searchParams.set('animation', animation);
    if (args.batchFixture) url.searchParams.set('batch', args.batchFixture);
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => document.body.dataset.reviewReady === '1', null, { timeout: 120000 });
    await page.waitForFunction(() => {
      const image = document.querySelector('[data-current-frame]');
      return image?.complete && image.naturalWidth === 512 && image.naturalHeight === 512;
    }, null, { timeout: 120000 });
    if (args.batchFixture) {
      await page.waitForFunction(() => !document.querySelector('[data-batch-panel]')?.hidden, null, { timeout: 120000 });
    }
    if ((await page.locator('[data-play]').textContent()) === 'Pause') {
      await page.locator('[data-play]').click();
    }
    await page.locator('[data-scrubber]').fill(animation === 'idle' ? '2' : '6');
    await page.waitForTimeout(120);

    const cleanPath = path.join(outDir, `${animation}-clean.png`);
    const cleanBytes = await page.screenshot({ path: cleanPath, fullPage: false });
    const cleanInspection = await inspect(page);

    await page.locator('[data-delta]').click();
    await page.waitForFunction(() => {
      const canvas = document.querySelector('[data-delta-frame]');
      return canvas && getComputedStyle(canvas).display !== 'none';
    });
    await page.waitForTimeout(120);
    const deltaPath = path.join(outDir, `${animation}-delta.png`);
    const deltaBytes = await page.screenshot({ path: deltaPath, fullPage: false });
    const deltaInspection = await inspect(page);

    if (cleanInspection.frameCount !== (animation === 'idle' ? 6 : 12)) {
      throw new Error(`${animation} rendered ${cleanInspection.frameCount} frame controls`);
    }
    if (cleanInspection.currentFrame?.naturalWidth !== 512 || cleanInspection.currentFrame?.naturalHeight !== 512) {
      throw new Error(`${animation} current frame is not 512x512`);
    }
    if (!deltaInspection.deltaCanvas?.visible) {
      throw new Error(`${animation} delta canvas did not become visible`);
    }

    report.captures.push({
      animation,
      clean: {
        path: cleanPath,
        sha256: sha256(cleanBytes),
        inspection: cleanInspection,
      },
      delta: {
        path: deltaPath,
        sha256: sha256(deltaBytes),
        inspection: deltaInspection,
      },
    });

    if (args.batchFixture && !report.batchEvidence) {
      const batchInspection = await inspectBatch(page);
      const states = batchInspection.batchStates.map(({ state }) => state);
      if (!states.some((state) => state === 'ready') || !states.some((state) => state === 'red')) {
        throw new Error(`batch fixture must visibly contain READY and RED states; got ${states.join(', ')}`);
      }
      if (batchInspection.batchStates.some(({ evidenceLinks }) => evidenceLinks.length === 0)) {
        throw new Error('each batch fixture clip must expose at least one evidence link');
      }
      const panel = page.locator('[data-batch-panel]');
      await panel.scrollIntoViewIfNeeded();
      const batchPath = path.join(outDir, 'batch-ready-red.png');
      const batchBytes = await panel.screenshot({ path: batchPath });
      report.batchEvidence = {
        path: batchPath,
        sha256: sha256(batchBytes),
        fixture: args.batchFixture,
        inspection: batchInspection,
      };
    }
  }
  report.pageErrors = pageErrors;
  if (pageErrors.length) throw new Error(`browser page errors: ${pageErrors.join('; ')}`);
  await fs.writeFile(path.join(outDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, outDir, captures: report.captures.length }, null, 2));
} finally {
  await browser.close();
}

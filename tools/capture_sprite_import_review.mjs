#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const EXPECTED_FIXTURE_SHA256 = 'c68c3268a04027ae7f05eea623f344b079360ce6a1f709a35647b1f0cdadcac2';
const EXPECTED_FIXTURE_BYTES = 1313998;
const EXPECTED_WIDTH = 1475;
const EXPECTED_HEIGHT = 720;

function parseArgs(argv) {
  const args = {
    url: 'http://127.0.0.1:4173/',
    fixture: 'tests/fixtures/sprite-lab/image_cc96778d.jpg',
    outDir: 'generated/sprite-import-review',
  };
  for (let index = 2; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--url') args.url = argv[++index] || args.url;
    else if (argument.startsWith('--url=')) args.url = argument.slice('--url='.length);
    else if (argument === '--fixture') args.fixture = argv[++index] || args.fixture;
    else if (argument.startsWith('--fixture=')) args.fixture = argument.slice('--fixture='.length);
    else if (argument === '--out-dir') args.outDir = argv[++index] || args.outDir;
    else if (argument.startsWith('--out-dir=')) args.outDir = argument.slice('--out-dir='.length);
    else throw new Error('unknown argument: ' + argument);
  }
  return args;
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function browserLaunchOptions() {
  const channel = process.env.PLAYWRIGHT_CHROME_CHANNEL || (process.env.CI ? 'chrome' : '');
  return {
    ...(channel ? { channel } : {}),
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  };
}

async function inspect(page) {
  return page.evaluate(() => {
    const preview = document.querySelector('[data-import-preview]');
    const current = document.querySelector('[data-current-frame]');
    return {
      importerHidden: document.querySelector('[data-import-screen]')?.hidden ?? true,
      status: document.querySelector('[data-import-status]')?.textContent || '',
      preview: preview ? {
        width: preview.width,
        height: preview.height,
        ariaLabel: preview.getAttribute('aria-label') || '',
        hidden: document.querySelector('[data-import-preview-wrap]')?.hidden ?? true,
      } : null,
      frameCount: document.querySelectorAll('[data-frame-index]').length,
      title: document.querySelector('[data-animation-title]')?.textContent || '',
      pickerLabels: [...document.querySelectorAll('[data-animation-picker] button')].map((button) => button.textContent?.trim() || ''),
      exportGifVisible: !document.querySelector('[data-export-current-gif]')?.hidden,
      currentFrame: current ? {
        src: current.getAttribute('src'),
        naturalWidth: current.naturalWidth,
        naturalHeight: current.naturalHeight,
      } : null,
    };
  });
}

async function readPersistedDraft(page) {
  return page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('pose-lab-sprite-lab', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const draft = await new Promise((resolve, reject) => {
      const request = db.transaction('drafts').objectStore('drafts').get('latest');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (!draft) return null;
    const sourceBytes = await draft.file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', sourceBytes);
    const sourceSha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
    return {
      source: {
        name: draft.file.name,
        size: draft.file.size,
        type: draft.file.type,
        sha256: sourceSha256,
      },
      metadata: draft.metadata,
      frameBlobs: (draft.frameBlobs || []).map((blob) => ({
        size: blob.size,
        type: blob.type,
      })),
    };
  });
}

async function screenshot(page, outDir, name) {
  const file = path.join(outDir, name);
  const bytes = await page.screenshot({ path: file, fullPage: false });
  return { path: file, sha256: sha256(bytes) };
}

const args = parseArgs(process.argv);
const fixture = path.resolve(args.fixture);
const outDir = path.resolve(args.outDir);
await fs.mkdir(outDir, { recursive: true });

const fixtureBytes = await fs.readFile(fixture);
const fixtureSha256 = sha256(fixtureBytes);
assert(fixtureSha256 === EXPECTED_FIXTURE_SHA256, 'fixture sha256 changed: ' + fixtureSha256);
assert(fixtureBytes.length === EXPECTED_FIXTURE_BYTES, 'fixture byte count changed: ' + fixtureBytes.length);

const launchOptions = browserLaunchOptions();
const browser = await chromium.launch(launchOptions);
const report = {
  schema: 'pose-lab-v2-sprite-import-browser-evidence-v1',
  capturedAt: new Date().toISOString(),
  browser: launchOptions.channel || 'playwright-default',
  viewport: { width: 1366, height: 900 },
  fixture: {
    path: fixture,
    sha256: fixtureSha256,
    bytes: fixtureBytes.length,
    width: EXPECTED_WIDTH,
    height: EXPECTED_HEIGHT,
  },
  captures: {},
};

try {
  const page = await browser.newPage({ viewport: report.viewport, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error.message || error)));

  const url = new URL(args.url);
  url.searchParams.set('view', '2d');
  url.searchParams.set('cacheBust', 'hosted-intelligent-slicer-qa');
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => document.body.dataset.reviewReady === '1', null, { timeout: 120000 });

  await page.locator('[data-import-sheet]').click();
  await page.locator('[data-import-file]').setInputFiles(fixture);
  await page.waitForFunction(() => {
    const preview = document.querySelector('[data-import-preview]');
    const status = document.querySelector('[data-import-status]')?.textContent || '';
    return preview?.getAttribute('aria-label')?.includes('4 frames') && status.startsWith('Detected 4 frames');
  }, null, { timeout: 120000 });

  report.detected = await inspect(page);
  assert(report.detected.preview?.width === EXPECTED_WIDTH, 'import preview width changed');
  assert(report.detected.preview?.height === EXPECTED_HEIGHT, 'import preview height changed');
  assert(report.detected.preview?.ariaLabel.includes('4 frames'), 'exact specimen did not detect four candidates');
  report.captures.detectedFour = await screenshot(page, outDir, 'sprite-import-detected-4.png');

  await page.locator('[data-import-preview]').focus();
  await page.keyboard.press('PageUp');
  await page.waitForFunction(() => document.querySelector('[data-import-preview]')?.getAttribute('aria-label')?.includes('Selected frame 4'));
  await page.locator('[data-box-delete]').click();
  await page.waitForFunction(() => document.querySelector('[data-import-preview]')?.getAttribute('aria-label')?.includes('3 frames'));
  report.corrected = await inspect(page);
  assert(report.corrected.preview?.ariaLabel.includes('3 frames'), 'deleting end card did not leave three frames');
  report.captures.correctedThree = await screenshot(page, outDir, 'sprite-import-corrected-3.png');

  await page.locator('[data-import-duration]').fill('120');
  await page.locator('[data-import-confirm]').click();
  await page.waitForFunction(() => document.querySelector('[data-import-screen]')?.hidden === true, null, { timeout: 120000 });
  await page.waitForFunction(() => {
    const current = document.querySelector('[data-current-frame]');
    return document.querySelectorAll('[data-frame-index]').length === 3 &&
      current?.complete && current.naturalWidth === 512 && current.naturalHeight === 512;
  }, null, { timeout: 120000 });

  report.created = await inspect(page);
  assert(report.created.frameCount === 3, 'created draft does not expose three frames');
  assert(report.created.title === 'image_cc96778d', 'created draft label changed: ' + report.created.title);
  assert(report.created.exportGifVisible, 'GIF export is not visible for imported draft');
  report.captures.created = await screenshot(page, outDir, 'sprite-import-created.png');

  report.persisted = await readPersistedDraft(page);
  assert(report.persisted, 'IndexedDB draft missing');
  assert(report.persisted.source.sha256 === EXPECTED_FIXTURE_SHA256, 'IndexedDB source bytes changed');
  assert(report.persisted.source.size === EXPECTED_FIXTURE_BYTES, 'IndexedDB source byte count changed');
  assert(report.persisted.metadata?.source?.width === EXPECTED_WIDTH, 'persisted source width changed');
  assert(report.persisted.metadata?.source?.height === EXPECTED_HEIGHT, 'persisted source height changed');
  assert(report.persisted.metadata?.frameCount === 3, 'persisted frame count is not three');
  assert(report.persisted.metadata?.boxes?.length === 3, 'persisted boxes are not three');
  assert(JSON.stringify(report.persisted.metadata?.frameDurationsMs) === JSON.stringify([120, 120, 120]), 'persisted frame timing changed');
  assert(report.persisted.frameBlobs.length === 3, 'persisted frame blob count is not three');
  assert(report.persisted.frameBlobs.every((blob) => blob.type === 'image/png' && blob.size > 0), 'persisted frames are not nonempty PNG blobs');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => document.body.dataset.reviewReady === '1', null, { timeout: 120000 });
  const importedButton = page.locator('[data-animation-picker] button').filter({ hasText: 'image_cc96778d' });
  await importedButton.waitFor({ state: 'visible', timeout: 120000 });
  await importedButton.click();
  await page.waitForFunction(() => {
    const current = document.querySelector('[data-current-frame]');
    return document.querySelectorAll('[data-frame-index]').length === 3 &&
      document.querySelector('[data-animation-title]')?.textContent === 'image_cc96778d' &&
      current?.complete && current.naturalWidth === 512 && current.naturalHeight === 512;
  }, null, { timeout: 120000 });

  report.reloaded = await inspect(page);
  assert(report.reloaded.frameCount === 3, 'reloaded draft does not expose three frames');
  assert(report.reloaded.title === 'image_cc96778d', 'reloaded draft label changed');
  report.captures.reloaded = await screenshot(page, outDir, 'sprite-import-reloaded.png');

  report.pageErrors = pageErrors;
  if (pageErrors.length) throw new Error('browser page errors: ' + pageErrors.join('; '));

  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({
    ok: true,
    fixtureSha256,
    detectedFrames: 4,
    correctedFrames: 3,
    persistedFrames: report.persisted.frameBlobs.length,
    reloadedFrames: report.reloaded.frameCount,
    outDir,
  }, null, 2));
} finally {
  await browser.close();
}

#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await fs.readFile(path.join(ROOT, 'config', 'embodied-kinesis-canary.json'), 'utf8'));
const baseUrl = process.env.KINESIS_URL || 'http://127.0.0.1:4173/';
const outDir = path.join(ROOT, 'generated', 'embodied-kinesis', config.stage, config.candidate);
const duration = 0.708333;
const phases = [
  ['start', 0],
  ['windup', 0.125],
  ['contact', 0.25],
  ['followThrough', 0.375],
  ['recoil', 0.542],
  ['end', 0.708333],
];
const params = new URLSearchParams({
  model: 'meshy',
  pose: 'attack1',
  candidate: config.candidate,
  fistHands: '1',
  reviewControls: '1',
  cacheBust: String(Date.now()),
});
const url = `${baseUrl.replace(/\/?$/, '/')}?${params}`;
const browserArgs = ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'];

function safe(value) { return String(value).replace(/[^a-zA-Z0-9_-]+/g, '-'); }
async function launchInstalledBrowser() {
  const requested = process.env.PLAYWRIGHT_CHROME_CHANNEL;
  const attempts = [...new Set([requested, 'chrome', 'msedge', null].filter((value, index, all) => value !== undefined && all.indexOf(value) === index))];
  const errors = [];
  for (const channel of attempts) {
    try {
      return await chromium.launch({ headless: true, channel: channel || undefined, args: browserArgs });
    } catch (error) {
      errors.push(`${channel || 'playwright-default'}: ${error.message}`);
    }
  }
  throw new Error(`No usable Chromium-family browser found. Tried installed Chrome/Edge and Playwright default. ${errors.join(' | ')}`);
}
async function setAttackTime(page, seconds) {
  await page.evaluate((value) => {
    const input = document.querySelector('[data-attack-scrub]');
    if (!input) throw new Error('attack scrubber missing');
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, seconds);
  await page.waitForTimeout(80);
}

await fs.mkdir(path.join(outDir, 'keys'), { recursive: true });
await fs.mkdir(path.join(outDir, 'motion'), { recursive: true });
const browser = await launchInstalledBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const consoleEvents = [];
  const pageErrors = [];
  page.on('console', (message) => consoleEvents.push({ type: message.type(), text: message.text().slice(0, 1000) }));
  page.on('pageerror', (error) => pageErrors.push(String(error.message || error).slice(0, 1000)));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => document.body?.dataset?.reviewReady === '1', null, { timeout: 120000 });

  await page.evaluate(() => {
    const cycle = document.querySelector('[data-cycle-view-mode]');
    if (!cycle) throw new Error('view mode control missing');
    if (!/FPV/i.test(cycle.textContent || '')) cycle.click();
  });
  await page.waitForFunction(() => /FPV/i.test(document.querySelector('[data-cycle-view-mode]')?.textContent || ''), null, { timeout: 10000 });
  await page.waitForTimeout(150);

  const canvas = page.locator('canvas');
  const keyCaptures = [];
  for (const [label, time] of phases) {
    await setAttackTime(page, time);
    const file = path.join(outDir, 'keys', `${safe(label)}.png`);
    await canvas.screenshot({ path: file });
    const state = await page.evaluate(() => ({
      view: document.querySelector('[data-cycle-view-mode]')?.textContent?.trim() || '',
      pose: document.querySelector('[data-cycle-pose-state]')?.textContent?.trim() || '',
      attackTime: document.querySelector('[data-attack-time]')?.textContent?.trim() || '',
      dataset: { ...document.body.dataset },
    }));
    keyCaptures.push({ label, time, file: path.relative(ROOT, file), state });
  }

  const motionFps = 24;
  const motionFrameCount = Math.max(2, Math.ceil(duration * motionFps) + 1);
  const motion = [];
  for (let index = 0; index < motionFrameCount; index += 1) {
    const time = Math.min(duration, (index / (motionFrameCount - 1)) * duration);
    await setAttackTime(page, time);
    const file = path.join(outDir, 'motion', `frame-${String(index).padStart(3, '0')}.png`);
    await canvas.screenshot({ path: file });
    motion.push({ index, time: Number(time.toFixed(6)), file: path.relative(ROOT, file) });
  }

  const finalState = await page.evaluate(() => ({
    view: document.querySelector('[data-cycle-view-mode]')?.textContent?.trim() || '',
    pose: document.querySelector('[data-cycle-pose-state]')?.textContent?.trim() || '',
    dataset: { ...document.body.dataset },
    canvas: (() => { const c = document.querySelector('canvas'); return c ? { width: c.width, height: c.height } : null; })(),
  }));
  const receipt = {
    schema: 'embodied-kinesis-runtime-capture-v1',
    stage: config.stage,
    candidate: config.candidate,
    sourceClip: config.source.clip,
    targetModel: config.target.path,
    url,
    viewport: [390, 844],
    targetCameraMode: 'firstPerson',
    fpvConfirmedByControl: /FPV/i.test(finalState.view),
    keyCaptures,
    motionFps,
    motion,
    finalState,
    consoleEvents,
    pageErrors,
    verdict: /FPV/i.test(finalState.view) && !pageErrors.length ? 'CAPTURED' : 'INVALID_EVIDENCE',
  };
  await fs.writeFile(path.join(outDir, 'runtime-capture.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
  if (receipt.verdict !== 'CAPTURED') process.exitCode = 2;
} finally {
  await browser.close();
}

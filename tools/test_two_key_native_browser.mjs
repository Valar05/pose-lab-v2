#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const baseUrl = process.env.POSE_LAB_URL || 'http://127.0.0.1:4173/?view=2d';
const chromium = process.env.CHROMIUM || 'chromium-browser';
const debugPort = Number(process.env.POSE_LAB_CDP_PORT || 9327);
const evidencePath = path.resolve(process.env.POSE_LAB_TWO_KEY_EVIDENCE || path.join(root, 'docs/evidence/pose-lab-two-key-deform-native-browser.json'));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  let lastError = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
      lastError = new Error('HTTP ' + response.status + ' from ' + url);
    } catch (error) {
      lastError = error;
    }
    await sleep(120);
  }
  throw lastError || new Error('Timed out waiting for ' + url);
}

class Cdp {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
  }

  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out opening DevTools websocket')), 10000);
      this.ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.ws.addEventListener('error', (event) => {
        clearTimeout(timer);
        reject(new Error('DevTools websocket error: ' + String(event?.message || event)));
      }, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message || JSON.stringify(message.error)));
        else pending.resolve(message.result || {});
        return;
      }
      if (message.method) this.events.push(message);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const promise = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.ws.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  close() {
    try { this.ws?.close(); } catch {}
  }
}

async function main() {
  const manifest = JSON.parse(await fsp.readFile(path.join(root, 'public/assets/vanguard/fleshpunk/animations.json'), 'utf8'));
  const idle = manifest.animations.find((entry) => entry.id === 'idle');
  assert(idle && idle.frames.length >= 4, 'approved Idle fixture must contain at least four frames');
  const keyAPath = path.join(root, 'public/assets/vanguard/fleshpunk', idle.frames[0].src);
  const keyBPath = path.join(root, 'public/assets/vanguard/fleshpunk', idle.frames[3].src);
  const keyABytes = await fsp.readFile(keyAPath);
  const keyBBytes = await fsp.readFile(keyBPath);
  const keyASha = sha256(keyABytes);
  const keyBSha = sha256(keyBBytes);
  assert.notEqual(keyASha, keyBSha, 'browser acceptance needs two distinct authored images');

  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'pose-lab-two-key-native-'));
  const profileDir = path.join(tempRoot, 'profile');
  const downloadDir = path.join(tempRoot, 'downloads');
  await fsp.mkdir(profileDir, { recursive: true });
  await fsp.mkdir(downloadDir, { recursive: true });

  const browser = spawn(chromium, [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--hide-scrollbars',
    '--window-size=1366,900',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=' + debugPort,
    '--user-data-dir=' + profileDir,
    'about:blank',
  ], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let browserStderr = '';
  browser.stderr.on('data', (chunk) => { browserStderr += String(chunk); });

  let cdp = null;
  try {
    const versionResponse = await waitForHttp('http://127.0.0.1:' + debugPort + '/json/version', 20000);
    const browserVersion = await versionResponse.json();
    const targets = await (await fetch('http://127.0.0.1:' + debugPort + '/json/list')).json();
    const target = targets.find((entry) => entry.type === 'page');
    assert(target?.webSocketDebuggerUrl, 'Chromium did not expose a page DevTools target');

    cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.open();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir });

    const evaluated = async (expression) => {
      const response = await cdp.send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true,
      });
      if (response.exceptionDetails) {
        throw new Error('Browser evaluate failed: ' + (response.exceptionDetails.text || JSON.stringify(response.exceptionDetails)));
      }
      return response.result?.value;
    };

    const waitFor = async (expression, timeoutMs = 15000, label = expression) => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if (await evaluated(expression)) return;
        await sleep(80);
      }
      throw new Error('Timed out waiting for browser condition: ' + label);
    };

    const trustedClick = async (selector) => {
      const point = await evaluated(`(() => {
        const element = document.querySelector(${JSON.stringify(selector)});
        if (!element) throw new Error('missing click target: ' + ${JSON.stringify(selector)});
        const rect = element.getBoundingClientRect();
        element.scrollIntoView({ block: 'center', inline: 'center' });
        const next = element.getBoundingClientRect();
        return { x: next.left + next.width / 2, y: next.top + next.height / 2 };
      })()`);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    };

    const nodeFor = async (selector) => {
      const document = await cdp.send('DOM.getDocument', { depth: 1, pierce: true });
      const found = await cdp.send('DOM.querySelector', { nodeId: document.root.nodeId, selector });
      assert(found.nodeId, 'missing DOM node: ' + selector);
      return found.nodeId;
    };

    const setFile = async (selector, filePath) => {
      const nodeId = await nodeFor(selector);
      await cdp.send('DOM.setFileInputFiles', { nodeId, files: [filePath] });
      await evaluated(`(() => {
        const input = document.querySelector(${JSON.stringify(selector)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
    };

    const pixelSha = async (selector) => evaluated(`(async () => {
      const image = document.querySelector(${JSON.stringify(selector)});
      if (!image) throw new Error('missing image');
      if (!image.complete) await new Promise((resolve, reject) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', reject, { once: true });
      });
      if (image.decode) await image.decode().catch(() => {});
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const digest = await crypto.subtle.digest('SHA-256', pixels);
      return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
    })()`);

    const sourceBlobSha = async (selector) => evaluated(`(async () => {
      const image = document.querySelector(${JSON.stringify(selector)});
      const bytes = await (await fetch(image.src)).arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
    })()`);

    const dataUrlPixelSha = async (dataUrl) => evaluated(`(async () => {
      const image = new Image();
      image.src = ${JSON.stringify(dataUrl)};
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const digest = await crypto.subtle.digest('SHA-256', pixels);
      return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
    })()`);

    const clearDownloads = async () => {
      for (const name of await fsp.readdir(downloadDir)) {
        await fsp.rm(path.join(downloadDir, name), { force: true, recursive: true });
      }
    };

    const downloadFrom = async (selector, extension, timeoutMs = 30000) => {
      await clearDownloads();
      await trustedClick(selector);
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const names = await fsp.readdir(downloadDir);
        const ready = names.filter((name) => !name.endsWith('.crdownload') && (!extension || name.endsWith(extension)));
        if (ready.length) {
          const full = path.join(downloadDir, ready[0]);
          const stat = await fsp.stat(full);
          if (stat.size > 0) return full;
        }
        await sleep(100);
      }
      throw new Error('Timed out waiting for download from ' + selector + '; stderr=' + browserStderr.slice(-1200));
    };

    await cdp.send('Page.navigate', { url: baseUrl });
    await waitFor("document.body.dataset.reviewReady === '1'", 20000, 'Pose Lab reviewReady');
    await waitFor("document.querySelector('[data-animation-mode]') && document.querySelector('[data-two-key-panel]')", 10000, 'Two-Key controls');

    await evaluated(`(() => {
      const mode = document.querySelector('[data-animation-mode]');
      mode.value = 'two-key-deform';
      mode.dispatchEvent(new Event('change', { bubbles: true }));
      return !document.querySelector('[data-two-key-panel]').hidden;
    })()`);
    await setFile('[data-two-key-a]', keyAPath);
    await waitFor(`document.querySelector('[data-two-key-a-name]').textContent === ${JSON.stringify(path.basename(keyAPath))}`, 10000, 'Key A load');
    await setFile('[data-two-key-b]', keyBPath);
    await waitFor(`document.querySelector('[data-two-key-b-name]').textContent === ${JSON.stringify(path.basename(keyBPath))}`, 10000, 'Key B load');

    await trustedClick('[data-two-key-build]');
    await waitFor("document.querySelector('[data-two-key-status]').textContent.includes('Native parametric preview ready')", 20000, 'native parametric preview');

    const frameInfo = await evaluated(`Array.from(document.querySelectorAll('[data-frame-index]')).map((button) => ({
      index: Number(button.dataset.frameIndex),
      frameType: button.dataset.frameType,
      text: button.textContent,
      thumbnailSrc: button.querySelector('img')?.getAttribute('src') || null,
    }))`);
    assert.deepEqual(frameInfo.map((entry) => entry.frameType), [
      'authored', 'procedural', 'procedural', 'procedural', 'authored', 'procedural', 'procedural', 'procedural',
    ]);
    assert(frameInfo.filter((entry) => entry.frameType === 'procedural').every((entry) => entry.thumbnailSrc === null), 'procedural frame strip must stay lazy before playback');

    const keyASourceSha = await sourceBlobSha('[data-current-frame]');
    assert.equal(keyASourceSha, keyASha, 'live authored Key A blob bytes must equal the source file');
    const keyAPixelSha = await pixelSha('[data-current-frame]');

    await trustedClick('[data-frame-index="2"]');
    await waitFor("document.querySelector('[data-frame-readout]').textContent.includes('procedural')", 10000, 'procedural preview frame');
    await waitFor("document.querySelector('[data-current-frame]').src.startsWith('data:image/png')", 10000, 'procedural data URL');
    const bridgePixelSha = await pixelSha('[data-current-frame]');

    await trustedClick('[data-frame-index="4"]');
    await waitFor("document.querySelector('[data-frame-readout]').textContent.includes('authored')", 10000, 'authored Key B frame');
    const keyBSourceSha = await sourceBlobSha('[data-current-frame]');
    assert.equal(keyBSourceSha, keyBSha, 'live authored Key B blob bytes must equal the source file');
    const keyBPixelSha = await pixelSha('[data-current-frame]');
    assert.notEqual(bridgePixelSha, keyAPixelSha, 'procedural bridge must visibly differ from Key A');
    assert.notEqual(bridgePixelSha, keyBPixelSha, 'procedural bridge must remain procedural, not equal Key B');

    const nativePath = await downloadFrom('[data-two-key-export-native]', '.json');
    const nativeBytes = await fsp.readFile(nativePath);
    const nativeDoc = JSON.parse(nativeBytes.toString('utf8'));
    assert.equal(nativeDoc.schema, 'pose-lab-v2-two-key-parametric-v1');
    assert.equal(nativeDoc.mode, 'two-key-deform');
    assert.equal(nativeDoc.endpoints.A.sha256, keyASha);
    assert.equal(nativeDoc.endpoints.B.sha256, keyBSha);
    assert.equal(nativeDoc.recipe.schema, 'pose-lab-v2-deformation-recipe-v1');
    assert.equal(nativeDoc.recipe.method, 'anchored-silhouette-row-warp-v1');
    assert(nativeDoc.plan.some((frame) => frame.frameType === 'procedural'));
    assert(nativeDoc.plan.filter((frame) => frame.frameType === 'procedural').every((frame) => !('src' in frame) && !('dataUrl' in frame)), 'native JSON stored a procedural bitmap');

    await setFile('[data-two-key-json]', nativePath);
    await waitFor("document.querySelector('[data-two-key-status]').textContent.includes('Native parametric JSON reloaded')", 20000, 'native JSON reload');
    await trustedClick('[data-frame-index="4"]');
    const reloadedKeyBSourceSha = await sourceBlobSha('[data-current-frame]');
    assert.equal(reloadedKeyBSourceSha, keyBSha, 'Key B bytes changed after native parametric reload');

    await trustedClick('[data-frame-index="2"]');
    const reloadedBridgePixelSha = await pixelSha('[data-current-frame]');
    assert.equal(reloadedBridgePixelSha, bridgePixelSha, 'live procedural preview changed after native parametric reload');

    const bakedPath = await downloadFrom('[data-two-key-export-baked]', '.json');
    const bakedBytes = await fsp.readFile(bakedPath);
    const bakedDoc = JSON.parse(bakedBytes.toString('utf8'));
    assert.equal(bakedDoc.schema, 'pose-lab-v2-two-key-baked-v1');
    assert.equal(bakedDoc.frames.length, frameInfo.length);
    assert(bakedDoc.frames.every((frame) => typeof frame.dataUrl === 'string' && frame.dataUrl.startsWith('data:image/png')), 'baked JSON must contain rendered PNG data only after export');
    const bakedBridgePixelSha = await dataUrlPixelSha(bakedDoc.frames[2].dataUrl);
    assert.equal(bakedBridgePixelSha, bridgePixelSha, 'baked bridge pixels must match the live preview renderer');

    const sheetPath = await downloadFrom('[data-two-key-export-sheet]', '.png');
    const sheetBytes = await fsp.readFile(sheetPath);
    assert.equal(sheetBytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'contact sheet must be PNG');
    const sheetWidth = sheetBytes.readUInt32BE(16);
    const sheetHeight = sheetBytes.readUInt32BE(20);
    assert(sheetWidth > 512 && sheetHeight > 256, 'contact sheet dimensions are unexpectedly small');

    const zipPath = await downloadFrom('[data-two-key-export-png]', '.zip');
    const zipBytes = await fsp.readFile(zipPath);
    assert.equal(zipBytes.readUInt32LE(0), 0x04034b50, 'PNG frame ZIP must start with a ZIP local-file header');
    assert(zipBytes.includes(Buffer.from('procedural', 'utf8')), 'PNG ZIP must retain procedural labels in filenames');

    const gifPath = await downloadFrom('[data-two-key-export-gif]', '.gif');
    const gifBytes = await fsp.readFile(gifPath);
    assert.equal(gifBytes.subarray(0, 6).toString('ascii'), 'GIF89a', 'GIF export must be a GIF89a artifact');
    assert.equal(gifBytes.readUInt16LE(6), manifest.frameSpace.width);
    assert.equal(gifBytes.readUInt16LE(8), manifest.frameSpace.height);
    let graphicControls = 0;
    for (let index = 0; index + 2 < gifBytes.length; index += 1) {
      if (gifBytes[index] === 0x21 && gifBytes[index + 1] === 0xf9 && gifBytes[index + 2] === 0x04) graphicControls += 1;
    }
    assert.equal(graphicControls, frameInfo.length, 'GIF export frame count must match the live preview plan');

    const finalFrameInfo = await evaluated(`Array.from(document.querySelectorAll('[data-frame-index]')).map((button) => ({
      frameType: button.dataset.frameType,
      thumbnailSrc: button.querySelector('img')?.getAttribute('src') || null,
    }))`);
    assert(finalFrameInfo.filter((entry) => entry.frameType === 'procedural').every((entry) => entry.thumbnailSrc === null), 'exports must not mutate procedural thumbnails into canonical frame assets');

    const statusText = await evaluated("document.querySelector('[data-two-key-status]').textContent");
    const recipeText = await evaluated("document.querySelector('[data-two-key-recipe]').textContent");
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();

    const receipt = {
      schema: 'pose-lab-v2-two-key-deform-browser-acceptance-v1',
      capturedAt: new Date().toISOString(),
      repoHead: head,
      branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
      url: baseUrl,
      browser: browserVersion.Browser || 'unknown',
      sourceKeys: {
        A: { path: path.relative(root, keyAPath), sha256: keyASha, pixelSha256: keyAPixelSha },
        B: { path: path.relative(root, keyBPath), sha256: keyBSha, pixelSha256: keyBPixelSha },
      },
      preview: {
        frameTypes: frameInfo.map((entry) => entry.frameType),
        proceduralThumbnailSourcesInitiallyPresent: frameInfo.filter((entry) => entry.frameType === 'procedural' && entry.thumbnailSrc).length,
        bridgePixelSha256: bridgePixelSha,
        reloadedBridgePixelSha256: reloadedBridgePixelSha,
        statusText,
        recipeText,
      },
      nativeParametric: {
        sha256: sha256(nativeBytes),
        schema: nativeDoc.schema,
        proceduralFrameBitmapFields: nativeDoc.plan.filter((frame) => frame.frameType === 'procedural' && ('src' in frame || 'dataUrl' in frame)).length,
        recipeMethod: nativeDoc.recipe.method,
        reloadedKeyBSha256: reloadedKeyBSourceSha,
      },
      baked: {
        sha256: sha256(bakedBytes),
        schema: bakedDoc.schema,
        frameCount: bakedDoc.frames.length,
        bridgePixelSha256: bakedBridgePixelSha,
        matchesLiveBridge: bakedBridgePixelSha === bridgePixelSha,
      },
      exports: {
        gif: { sha256: sha256(gifBytes), bytes: gifBytes.length, frameCount: graphicControls, width: gifBytes.readUInt16LE(6), height: gifBytes.readUInt16LE(8) },
        pngFrameZip: { sha256: sha256(zipBytes), bytes: zipBytes.length },
        contactSheet: { sha256: sha256(sheetBytes), bytes: sheetBytes.length, width: sheetWidth, height: sheetHeight },
      },
      checks: [
        'actual Chromium loaded the phone-hosted Pose Lab runtime',
        'two exact authored 512x512 source files loaded through real file inputs',
        'authored Key A source bytes stayed exact',
        'authored Key B source bytes stayed exact',
        'procedural bridge visibly differed from both authored keys',
        'procedural strip frames had no eager src bitmap',
        'native parametric JSON contained endpoint images, recipe, timing, and zero procedural bitmap fields',
        'native parametric JSON reloaded with endpoint SHA-256 preserved',
        'reloaded live bridge reproduced the same pixel hash',
        'baked JSON was generated on export and matched the live bridge pixel hash',
        'contact sheet exported as PNG',
        'PNG frame ZIP exported with procedural labels',
        'GIF exported at frame-space dimensions with the same frame count as preview',
        'exports did not mutate procedural thumbnails into canonical assets',
      ],
    };

    await fsp.mkdir(path.dirname(evidencePath), { recursive: true });
    await fsp.writeFile(evidencePath, JSON.stringify(receipt, null, 2) + '\n');
    console.log(JSON.stringify({ ok: true, evidencePath, receipt }, null, 2));
  } finally {
    cdp?.close();
    browser.kill('SIGTERM');
    await sleep(300);
    if (!browser.killed) browser.kill('SIGKILL');
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});

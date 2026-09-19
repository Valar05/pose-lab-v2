import { encodeGif } from './gif-encoder.js';
import { detectFrameBoxes, constrainFrameBox, clearConnectedBackground } from './sprite-slicer.js';
const URL_PARAMS = new URLSearchParams(window.location.search);
const DEFAULT_MANIFEST = './assets/vanguard/fleshpunk/animations.json';
const manifestUrl = new URL(URL_PARAMS.get('manifest') || DEFAULT_MANIFEST, window.location.href);
const app = document.querySelector('#app');

app.innerHTML = `
  <section class="sprite-lab">
    <header class="sprite-header">
      <div>
        <p class="sprite-eyebrow">Pose Lab V2</p>
        <h1>2D Animation Review</h1>
        <p class="sprite-subtitle">Direct PNG playback. No GIF assembly required.</p>
      </div>
      <button type="button" class="sprite-import-button" data-import-sheet>Import contact sheet</button>
      <nav class="sprite-mode-switch" aria-label="Pose Lab view">
        <a class="active" href="./?view=2d" aria-current="page">2D</a>
        <a href="./?model=vanguard">3D rig</a>
      </nav>
    </header>

    <main class="sprite-workspace">
      <section class="sprite-stage checker" data-stage aria-label="Animation stage">
        <div class="sprite-stack" data-sprite-stack>
          <img class="sprite-frame sprite-onion sprite-onion-previous" data-previous-frame alt="" aria-hidden="true" />
          <img class="sprite-frame sprite-current" data-current-frame alt="" />
          <canvas class="sprite-frame sprite-delta" width="512" height="512" data-delta-frame aria-hidden="true"></canvas>
          <img class="sprite-frame sprite-onion sprite-onion-next" data-next-frame alt="" aria-hidden="true" />
          <span class="sprite-ground-guide" data-ground-guide aria-hidden="true"></span>
        </div>
      </section>

      <section class="sprite-console" aria-label="2D animation controls">
        <div class="sprite-console-heading">
          <div>
            <p class="sprite-eyebrow">Animation</p>
            <h2 data-animation-title>Loading…</h2>
          </div>
          <div class="sprite-evidence-links" aria-label="Animation evidence">
            <span data-status-badge class="sprite-status-badge">status</span>
            <a data-contact-sheet target="_blank" rel="noreferrer">Steel/styled sheet</a>
            <a data-final-frames target="_blank" rel="noreferrer">Final frames</a>
            <a data-provenance target="_blank" rel="noreferrer">Provenance</a>
            <a data-verifier target="_blank" rel="noreferrer">Verifier</a>
            <button type="button" data-export-current-gif hidden>Export GIF</button>
          </div>
        </div>

        <div class="sprite-animation-picker" data-animation-picker role="tablist" aria-label="Animations"></div>

        <div class="sprite-transport" aria-label="Playback">
          <button type="button" data-previous aria-label="Previous frame">◀</button>
          <button type="button" class="sprite-play" data-play aria-label="Pause animation">Pause</button>
          <button type="button" data-next aria-label="Next frame">▶</button>
          <output data-frame-readout>Frame —</output>
          <label>
            <span>Speed</span>
            <select data-speed aria-label="Playback speed">
              <option value="0.25">¼×</option>
              <option value="0.5">½×</option>
              <option value="1" selected>1×</option>
              <option value="2">2×</option>
            </select>
          </label>
        </div>

        <label class="sprite-scrubber">
          <span class="sr-only">Frame</span>
          <input type="range" min="0" max="0" step="1" value="0" data-scrubber />
        </label>

        <div class="sprite-inspection-controls" aria-label="Inspection">
          <button type="button" data-onion aria-pressed="false">Onion: Off</button>
          <button type="button" data-delta aria-pressed="false">Delta: Off</button>
          <button type="button" data-loop aria-pressed="true">Loop: On</button>
          <button type="button" data-ground aria-pressed="false">Ground: Off</button>
          <button type="button" data-fit>Fit</button>
          <label class="sprite-zoom">
            <span>Zoom <output data-zoom-output>100%</output></span>
            <input type="range" min="25" max="200" step="5" value="100" data-zoom />
          </label>
        </div>

        <fieldset class="sprite-background-picker">
          <legend>Background</legend>
          <button type="button" data-background="checker" class="active" aria-pressed="true">Checker</button>
          <button type="button" data-background="charcoal" aria-pressed="false">Dark</button>
          <button type="button" data-background="cream" aria-pressed="false">Light</button>
          <button type="button" data-background="chroma" aria-pressed="false">Chroma</button>
        </fieldset>

        <div class="sprite-batch-status" data-batch-status aria-label="Batch status"></div>
        <div class="sprite-contract" data-contract aria-label="Animation contract"></div>
        <div class="sprite-frame-strip" data-frame-strip role="tablist" aria-label="Frames"></div>
        <p class="sprite-shortcuts">Space: play/pause · ←/→: step · Home/End: first/last</p>
        <p class="sr-only" data-live-status aria-live="polite"></p>
      </section>
    </main>
    <section class="sprite-import-screen" data-import-screen hidden aria-label="Import contact sheet">
      <div class="sprite-import-card">
        <p class="sprite-eyebrow">Sprite Lab</p><h1>New Pose Lab animation</h1>
        <p>Choose one contact-sheet image. This creates a browser-local draft animation in this same 2D viewer, survives reload on this device, and does not overwrite Idle or Sword Attack 1.</p>
        <label>Contact sheet <input type="file" accept=".png,.webp,.jpg,.jpeg,image/png,image/webp,image/jpeg" data-import-file /></label>
        <label class="sprite-import-duration">Frame ms <input type="number" min="20" max="2000" value="120" data-import-duration /></label>
        <div class="sprite-slicer-canvas-wrap" data-import-preview-wrap hidden><canvas data-import-preview tabindex="0" aria-describedby="sprite-slicer-help" aria-label="Editable detected frame boxes"></canvas></div>
        <p id="sprite-slicer-help" class="sprite-slicer-help">Pointer: drag a box or its gold resize corner. Keyboard: arrows move the selected box; Ctrl/Command + arrows resize it; hold Shift for 10-pixel steps.</p>
        <div class="sprite-slicer-tools"><button type="button" data-box-add disabled>Add box</button><button type="button" data-box-delete disabled>Delete</button><button type="button" data-box-earlier disabled>Earlier</button><button type="button" data-box-later disabled>Later</button><button type="button" data-redetect disabled>Redetect</button><button type="button" data-restore-import disabled>Restore local draft</button></div>
        <p data-import-status>Choose a PNG, WebP, or JPEG. Sprite Lab will propose editable frame boxes.</p>
        <div class="sprite-import-actions"><button type="button" data-import-cancel>Cancel</button><button type="button" class="primary" data-import-confirm disabled>Create Pose Lab animation</button></div>
      </div>
    </section>
  </section>
`;

const stage = app.querySelector('[data-stage]');
const stack = app.querySelector('[data-sprite-stack]');
const currentImage = app.querySelector('[data-current-frame]');
const previousImage = app.querySelector('[data-previous-frame]');
const nextImage = app.querySelector('[data-next-frame]');
const deltaCanvas = app.querySelector('[data-delta-frame]');
const deltaContext = deltaCanvas.getContext('2d', { willReadFrequently: true });
const groundGuide = app.querySelector('[data-ground-guide]');
const animationTitle = app.querySelector('[data-animation-title]');
const animationPicker = app.querySelector('[data-animation-picker]');
const contactSheetLink = app.querySelector('[data-contact-sheet]');
const statusBadge = app.querySelector('[data-status-badge]');
const finalFramesLink = app.querySelector('[data-final-frames]');
const provenanceLink = app.querySelector('[data-provenance]');
const verifierLink = app.querySelector('[data-verifier]');
const batchStatus = app.querySelector('[data-batch-status]');
const playButton = app.querySelector('[data-play]');
const previousButton = app.querySelector('[data-previous]');
const nextButton = app.querySelector('[data-next]');
const frameReadout = app.querySelector('[data-frame-readout]');
const speedInput = app.querySelector('[data-speed]');
const scrubber = app.querySelector('[data-scrubber]');
const onionButton = app.querySelector('[data-onion]');
const deltaButton = app.querySelector('[data-delta]');
const loopButton = app.querySelector('[data-loop]');
const groundButton = app.querySelector('[data-ground]');
const fitButton = app.querySelector('[data-fit]');
const zoomInput = app.querySelector('[data-zoom]');
const zoomOutput = app.querySelector('[data-zoom-output]');
const frameStrip = app.querySelector('[data-frame-strip]');
const contract = app.querySelector('[data-contract]');
const liveStatus = app.querySelector('[data-live-status]');
const backgroundButtons = [...app.querySelectorAll('[data-background]')];
const importSheetButton = app.querySelector('[data-import-sheet]');
const importScreen = app.querySelector('[data-import-screen]');
const importFile = app.querySelector('[data-import-file]');
const importPreviewWrap = app.querySelector('[data-import-preview-wrap]');
const importPreview = app.querySelector('[data-import-preview]');
const importPreviewContext = importPreview.getContext('2d');
const addBoxButton = app.querySelector('[data-box-add]');
const deleteBoxButton = app.querySelector('[data-box-delete]');
const earlierBoxButton = app.querySelector('[data-box-earlier]');
const laterBoxButton = app.querySelector('[data-box-later]');
const redetectButton = app.querySelector('[data-redetect]');
const restoreImportButton = app.querySelector('[data-restore-import]');
const importDuration = app.querySelector('[data-import-duration]');
const importStatus = app.querySelector('[data-import-status]');
const importCancel = app.querySelector('[data-import-cancel]');
const importConfirm = app.querySelector('[data-import-confirm]');
const exportCurrentGif = app.querySelector('[data-export-current-gif]');

let manifest = null;
let animation = null;
let currentFrameIndex = 0;
let playing = true;
let loopEnabled = true;
let onionEnabled = false;
let deltaEnabled = false;
let groundEnabled = false;
let playbackSpeed = 1;
let nextFrameAt = null;
let playbackRequest = null;
let manualZoom = false;
const frameImageCache = new Map();
const frameImagePromises = new Map();
const deltaImageCache = new Map();
const deltaPreviousCanvas = document.createElement('canvas');
const deltaCurrentCanvas = document.createElement('canvas');
const deltaPreviousContext = deltaPreviousCanvas.getContext('2d', { willReadFrequently: true });
const deltaCurrentContext = deltaCurrentCanvas.getContext('2d', { willReadFrequently: true });
let importedSheetFile = null;
let importedSheetUrl = null;
let importedSheetImage = null;
let importedBoxes = [];
let selectedImportedBox = -1;
let importPointer = null;

function assetUrl(path) {
  return new URL(path, manifestUrl).href;
}

function frameAt(index) {
  const count = animation.frames.length;
  return animation.frames[(index + count) % count];
}

function animationDurationMs() {
  return animation.frames.reduce((total, frame) => total + frame.durationMs, 0);
}

function setPressed(button, pressed, onLabel, offLabel) {
  button.setAttribute('aria-pressed', String(pressed));
  button.textContent = pressed ? onLabel : offLabel;
}

function announce(message) {
  liveStatus.textContent = '';
  requestAnimationFrame(() => {
    liveStatus.textContent = message;
  });
}

function deltaCacheKey() {
  return `${animation.id}:${currentFrameIndex}`;
}

function buildDeltaImage(previous, current) {
  const width = manifest.frameSpace.width;
  const height = manifest.frameSpace.height;
  for (const target of [deltaCanvas, deltaPreviousCanvas, deltaCurrentCanvas]) {
    target.width = width;
    target.height = height;
  }
  deltaPreviousContext.clearRect(0, 0, width, height);
  deltaCurrentContext.clearRect(0, 0, width, height);
  deltaPreviousContext.drawImage(previous, 0, 0, width, height);
  deltaCurrentContext.drawImage(current, 0, 0, width, height);
  const previousPixels = deltaPreviousContext.getImageData(0, 0, width, height);
  const currentPixels = deltaCurrentContext.getImageData(0, 0, width, height);
  const output = deltaContext.createImageData(width, height);

  for (let offset = 0; offset < output.data.length; offset += 4) {
    const previousAlpha = previousPixels.data[offset + 3];
    const currentAlpha = currentPixels.data[offset + 3];
    const difference = Math.max(
      Math.abs(previousPixels.data[offset] - currentPixels.data[offset]),
      Math.abs(previousPixels.data[offset + 1] - currentPixels.data[offset + 1]),
      Math.abs(previousPixels.data[offset + 2] - currentPixels.data[offset + 2]),
      Math.abs(previousAlpha - currentAlpha),
    );
    if (difference < 14) continue;

    if (currentAlpha > previousAlpha + 18) {
      output.data[offset] = 255;
      output.data[offset + 1] = 194;
      output.data[offset + 2] = 64;
    } else if (previousAlpha > currentAlpha + 18) {
      output.data[offset] = 70;
      output.data[offset + 1] = 210;
      output.data[offset + 2] = 255;
    } else {
      output.data[offset] = 255;
      output.data[offset + 1] = 82;
      output.data[offset + 2] = 164;
    }
    output.data[offset + 3] = Math.max(96, Math.min(255, difference * 2));
  }
  return output;
}

async function renderDelta() {
  if (!deltaEnabled) return;
  const renderKey = deltaCacheKey();
  const cached = deltaImageCache.get(renderKey);
  if (cached) {
    deltaContext.putImageData(cached, 0, 0);
    return;
  }
  const frame = frameAt(currentFrameIndex);
  const previous = frameAt(currentFrameIndex - 1);
  const [previousAsset, currentAsset] = await Promise.all([
    preloadFrame(previous.src),
    preloadFrame(frame.src),
  ]);
  if (!deltaEnabled || renderKey !== deltaCacheKey()) return;
  const output = buildDeltaImage(previousAsset, currentAsset);
  deltaImageCache.set(renderKey, output);
  deltaContext.putImageData(output, 0, 0);
}

function renderFrame({ speak = false } = {}) {
  const frame = frameAt(currentFrameIndex);
  const previous = frameAt(currentFrameIndex - 1);
  const next = frameAt(currentFrameIndex + 1);
  const frameNumber = currentFrameIndex + 1;
  const frameCount = animation.frames.length;

  currentImage.src = assetUrl(frame.src);
  currentImage.alt = `${manifest.character}, ${animation.label}, frame ${frameNumber} of ${frameCount}`;
  previousImage.src = assetUrl(previous.src);
  nextImage.src = assetUrl(next.src);
  if (deltaEnabled) renderDelta().catch(() => {});
  scrubber.value = String(currentFrameIndex);
  frameReadout.textContent = `Frame ${frameNumber}/${frameCount} · ${frame.durationMs} ms`;

  [...frameStrip.querySelectorAll('[data-frame-index]')].forEach((button) => {
    const active = Number(button.dataset.frameIndex) === currentFrameIndex;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });

  if (speak) announce(`${animation.label}, frame ${frameNumber} of ${frameCount}`);
}

function updatePlayButton() {
  playButton.textContent = playing ? 'Pause' : 'Play';
  playButton.setAttribute('aria-label', playing ? 'Pause animation' : 'Play animation');
}

function pause({ speak = false } = {}) {
  playing = false;
  nextFrameAt = null;
  if (playbackRequest !== null) cancelAnimationFrame(playbackRequest);
  playbackRequest = null;
  updatePlayButton();
  if (speak) announce('Animation paused');
}

function play({ speak = false } = {}) {
  if (playing && playbackRequest !== null) return;
  playing = true;
  nextFrameAt = null;
  updatePlayButton();
  playbackRequest = requestAnimationFrame(playback);
  if (speak) announce('Animation playing');
}

function advanceFrame(direction, { speak = false, fromPlayback = false } = {}) {
  const finalIndex = animation.frames.length - 1;
  let nextIndex = currentFrameIndex + direction;

  if (nextIndex > finalIndex && !loopEnabled) {
    currentFrameIndex = finalIndex;
    renderFrame({ speak });
    pause();
    return;
  }

  if (nextIndex < 0 && !loopEnabled) nextIndex = 0;
  currentFrameIndex = (nextIndex + animation.frames.length) % animation.frames.length;
  if (!fromPlayback) nextFrameAt = null;
  renderFrame({ speak });
}

function playback(now) {
  if (!playing) return;
  const duration = frameAt(currentFrameIndex).durationMs / playbackSpeed;
  if (nextFrameAt === null) nextFrameAt = now + duration;

  if (now >= nextFrameAt) {
    advanceFrame(1, { fromPlayback: true });
    nextFrameAt = now + (frameAt(currentFrameIndex).durationMs / playbackSpeed);
  }
  playbackRequest = requestAnimationFrame(playback);
}

function buildFrameStrip() {
  frameStrip.replaceChildren();
  animation.frames.forEach((frame, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.frameIndex = String(index);
    button.role = 'tab';
    button.setAttribute('aria-label', `Frame ${index + 1}, ${frame.durationMs} milliseconds`);

    const image = document.createElement('img');
    image.src = assetUrl(frame.src);
    image.alt = '';
    image.loading = 'eager';
    image.decoding = 'async';

    const label = document.createElement('span');
    label.textContent = `${index + 1} · ${frame.durationMs}ms`;
    button.append(image, label);
    button.addEventListener('click', () => {
      pause();
      currentFrameIndex = index;
      renderFrame({ speak: true });
    });
    frameStrip.append(button);
  });
}

function buildAnimationPicker() {
  animationPicker.replaceChildren();
  manifest.animations.forEach((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.role = 'tab';
    button.dataset.animationId = entry.id;
    button.textContent = entry.label;
    button.addEventListener('click', () => setAnimation(entry.id, { speak: true }));
    animationPicker.append(button);
  });
}

function updateAnimationPicker() {
  [...animationPicker.querySelectorAll('[data-animation-id]')].forEach((button) => {
    const active = button.dataset.animationId === animation.id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  });
}

function setZoom(value) {
  const zoom = Math.max(25, Math.min(200, Math.round(Number(value) / 5) * 5));
  zoomInput.value = String(zoom);
  zoomOutput.textContent = `${zoom}%`;
  stack.style.width = `${manifest.frameSpace.width * (zoom / 100)}px`;
}

function fitStage() {
  const padding = 28;
  const availableWidth = Math.max(128, stage.clientWidth - padding);
  const availableHeight = Math.max(128, stage.clientHeight - padding);
  const fit = Math.min(
    100,
    (availableWidth / manifest.frameSpace.width) * 100,
    (availableHeight / manifest.frameSpace.height) * 100,
  );
  setZoom(Math.max(25, Math.floor(fit / 5) * 5));
}

function setAnimation(id, { speak = false } = {}) {
  const requested = manifest.animations.find((entry) => entry.id === id);
  if (!requested) return;
  const wasPlaying = playing;
  pause();
  animation = requested;
  currentFrameIndex = 0;
  loopEnabled = animation.loop !== false;
  animationTitle.textContent = animation.label;
  scrubber.max = String(animation.frames.length - 1);
  contactSheetLink.href = assetUrl(animation.contactSheet);
  exportCurrentGif.hidden = !animation.imported;
  const status = animation.status || 'ready';
  statusBadge.textContent = status;
  statusBadge.dataset.status = status;
  const firstFrame = animation.frames[0]?.src || '';
  finalFramesLink.href = firstFrame ? assetUrl(firstFrame.replace(/[^/]+$/, '')) : assetUrl(animation.contactSheet);
  provenanceLink.href = animation.sourceMetadata ? assetUrl(animation.sourceMetadata) : assetUrl(animation.contactSheet);
  verifierLink.href = animation.verifierReport ? assetUrl(animation.verifierReport) : assetUrl(animation.sourceMetadata || animation.contactSheet);
  contract.replaceChildren(...animation.contract.map((item) => {
    const badge = document.createElement('span');
    badge.textContent = item;
    return badge;
  }));
  groundGuide.style.top = `${(animation.groundGuideY / manifest.frameSpace.height) * 100}%`;
  setPressed(loopButton, loopEnabled, 'Loop: On', 'Loop: Off');
  buildFrameStrip();
  updateAnimationPicker();
  renderFrame();
  if (!manualZoom) fitStage();
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set('view', '2d');
  nextUrl.searchParams.set('animation', animation.id);
  history.replaceState(null, '', nextUrl);
  if (wasPlaying) play();
  if (speak) announce(`${animation.label}, ${animation.frames.length} frames, ${animationDurationMs()} milliseconds, status ${animation.status || 'ready'}`);
}

function preloadFrame(src) {
  if (frameImageCache.has(src)) return Promise.resolve(frameImageCache.get(src));
  if (frameImagePromises.has(src)) return frameImagePromises.get(src);
  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      frameImageCache.set(src, image);
      frameImagePromises.delete(src);
      resolve(image);
    };
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = assetUrl(src);
  });
  frameImagePromises.set(src, promise);
  return promise;
}

function importNumber(input, min, max, fallback) { return Math.max(min, Math.min(max, Math.round(Number(input.value) || fallback))); }
function setImportStatus(message) { importStatus.textContent = message; }
function openSpriteDb() { return new Promise((resolve, reject) => { const request = indexedDB.open('pose-lab-sprite-lab', 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('drafts')) request.result.createObjectStore('drafts'); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function saveLocalDraft(file, metadata, frameBlobs = []) { const db = await openSpriteDb(); await new Promise((resolve, reject) => { const transaction = db.transaction('drafts', 'readwrite'); transaction.objectStore('drafts').put({ file, metadata, frameBlobs }, 'latest'); transaction.oncomplete = resolve; transaction.onerror = () => reject(transaction.error); }); db.close(); localStorage.setItem('pose-lab-sprite-lab-recent', JSON.stringify({ name: metadata.source.name, importedAt: metadata.importedAt, id: metadata.id })); restoreImportButton.disabled = false; }
async function readLocalDraft() { const db = await openSpriteDb(); const result = await new Promise((resolve, reject) => { const request = db.transaction('drafts').objectStore('drafts').get('latest'); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); }); db.close(); return result; }
function localDraftAnimationFromStorage(draft) { if (!draft?.file || !draft?.metadata || !Array.isArray(draft.frameBlobs) || draft.frameBlobs.length === 0) return null; const metadata = draft.metadata; if (metadata.schema !== 'pose-lab-v2-intelligent-sprite-import-v1' || !metadata.id || draft.frameBlobs.length !== metadata.frameCount) return null; const durations = Array.isArray(metadata.frameDurationsMs) && metadata.frameDurationsMs.length === draft.frameBlobs.length ? metadata.frameDurationsMs : draft.frameBlobs.map(() => metadata.durationMs || 120); const sourceUrl = URL.createObjectURL(draft.file); const sourceMetadata = URL.createObjectURL(new Blob([JSON.stringify(metadata, null, 2) + '\n'], { type: 'application/json' })); return { id: metadata.id, label: metadata.label || metadata.source?.name?.replace(/\.[^.]+$/, '') || 'Imported contact sheet', status: 'draft', imported: true, localDraft: true, loop: true, contactSheet: sourceUrl, sourceMetadata, verifierReport: sourceUrl, groundGuideY: 511, contract: ['auto-detected + human-corrected', '512×512', 'browser-local draft'], frames: draft.frameBlobs.map((blob, index) => ({ src: URL.createObjectURL(blob), durationMs: durations[index] })) }; }
function upsertLocalDraftAnimation(entry) { manifest.animations = manifest.animations.filter((candidate) => !candidate.localDraft); if (entry) manifest.animations.push(entry); }
function updateBoxActions() { const active = selectedImportedBox >= 0 && selectedImportedBox < importedBoxes.length; addBoxButton.disabled = !importedSheetImage; deleteBoxButton.disabled = !active; earlierBoxButton.disabled = !active || selectedImportedBox === 0; laterBoxButton.disabled = !active || selectedImportedBox === importedBoxes.length - 1; redetectButton.disabled = !importedSheetImage; importConfirm.disabled = !importedSheetImage || importedBoxes.length === 0; }
function drawImportPreview() { if (!importedSheetImage) return; importPreviewContext.clearRect(0, 0, importPreview.width, importPreview.height); importPreviewContext.drawImage(importedSheetImage, 0, 0); importPreviewContext.lineWidth = Math.max(2, Math.round(Math.max(importPreview.width, importPreview.height) / 420)); importPreviewContext.font = 'bold ' + Math.max(14, Math.round(importPreview.width / 65)) + 'px system-ui'; importedBoxes.forEach((box, index) => { const selected = index === selectedImportedBox; importPreviewContext.strokeStyle = selected ? '#f0c35a' : '#55d7ff'; importPreviewContext.fillStyle = selected ? 'rgba(240,195,90,.16)' : 'rgba(85,215,255,.10)'; importPreviewContext.fillRect(box.x, box.y, box.width, box.height); importPreviewContext.strokeRect(box.x, box.y, box.width, box.height); importPreviewContext.fillStyle = selected ? '#f0c35a' : '#55d7ff'; importPreviewContext.fillRect(box.x, box.y, Math.max(28, importPreview.width / 42), Math.max(22, importPreview.width / 58)); importPreviewContext.fillStyle = '#071013'; importPreviewContext.fillText(String(index + 1), box.x + 5, box.y + Math.max(17, importPreview.width / 72)); if (selected) { const handle = Math.max(14, importPreview.width / 60); importPreviewContext.fillStyle = '#f0c35a'; importPreviewContext.fillRect(box.x + box.width - handle, box.y + box.height - handle, handle, handle); } }); const selected = importedBoxes[selectedImportedBox]; importPreview.setAttribute('aria-label', selected ? `Editable frame boxes. ${importedBoxes.length} frames. Selected frame ${selectedImportedBox + 1}: x ${selected.x}, y ${selected.y}, width ${selected.width}, height ${selected.height}.` : `Editable frame boxes. ${importedBoxes.length} frames. No frame selected.`); updateBoxActions(); }
function detectImportedBoxes() { if (!importedSheetImage) return; const scratch = document.createElement('canvas'); scratch.width = importedSheetImage.width; scratch.height = importedSheetImage.height; const context = scratch.getContext('2d', { willReadFrequently: true }); context.drawImage(importedSheetImage, 0, 0); importedBoxes = detectFrameBoxes(context.getImageData(0, 0, scratch.width, scratch.height)); selectedImportedBox = importedBoxes.length ? 0 : -1; drawImportPreview(); setImportStatus(importedBoxes.length ? 'Detected ' + importedBoxes.length + ' frame' + (importedBoxes.length === 1 ? '' : 's') + '. Tap a box, drag to move, or drag its gold corner to resize.' : 'No confident frames found. Add a box and place it over each frame.'); }
function validImportType(file) { return Boolean(file && (file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/jpeg' || /\.(png|webp|jpe?g)$/i.test(file.name))); }
function loadImportSheet(file, saved = null) { if (!validImportType(file)) { setImportStatus('Unsupported file. Choose PNG, WebP, JPG, or JPEG.'); return; } if (importedSheetUrl) URL.revokeObjectURL(importedSheetUrl); importedSheetFile = file; importedSheetUrl = URL.createObjectURL(file); importedSheetImage = new Image(); importedSheetImage.onload = () => { importPreview.width = importedSheetImage.width; importPreview.height = importedSheetImage.height; importPreviewWrap.hidden = false; if (saved?.boxes?.length) { importedBoxes = saved.boxes.map((box) => constrainFrameBox(box, importedSheetImage.width, importedSheetImage.height)); selectedImportedBox = 0; importDuration.value = String(saved.durationMs || 120); drawImportPreview(); setImportStatus('Restored ' + importedBoxes.length + ' editable frame boxes from local storage.'); } else detectImportedBoxes(); }; importedSheetImage.onerror = () => { importedSheetImage = null; importedBoxes = []; updateBoxActions(); setImportStatus('This PNG, WebP, or JPEG could not be decoded by the browser.'); }; importedSheetImage.src = importedSheetUrl; setImportStatus('Analyzing ' + file.name + '…'); }
function openImporter() { importScreen.hidden = false; importFile.value = ''; importedSheetFile = null; importedSheetImage = null; importedBoxes = []; selectedImportedBox = -1; importPreviewWrap.hidden = true; updateBoxActions(); setImportStatus('Choose a PNG, WebP, or JPEG. Sprite Lab will propose editable frame boxes.'); readLocalDraft().then((draft) => { restoreImportButton.disabled = !draft; }).catch(() => { restoreImportButton.disabled = true; }); }
function closeImporter() { importScreen.hidden = true; }
function previewPoint(event) { const bounds = importPreview.getBoundingClientRect(); return { x: (event.clientX - bounds.left) * importPreview.width / bounds.width, y: (event.clientY - bounds.top) * importPreview.height / bounds.height }; }
function hitBox(point) { for (let index = importedBoxes.length - 1; index >= 0; index -= 1) { const box = importedBoxes[index]; if (point.x >= box.x && point.x <= box.x + box.width && point.y >= box.y && point.y <= box.y + box.height) return index; } return -1; }
function beginBoxEdit(event) { if (!importedSheetImage) return; const point = previewPoint(event), hit = hitBox(point); if (hit < 0) return; selectedImportedBox = hit; const box = importedBoxes[hit], handle = Math.max(22, importPreview.width / 45); importPointer = { id: event.pointerId, mode: point.x >= box.x + box.width - handle && point.y >= box.y + box.height - handle ? 'resize' : 'move', start: point, original: { ...box } }; importPreview.focus({ preventScroll: true }); importPreview.setPointerCapture(event.pointerId); drawImportPreview(); }
function moveBoxEdit(event) { if (!importPointer || event.pointerId !== importPointer.id) return; const point = previewPoint(event), dx = point.x - importPointer.start.x, dy = point.y - importPointer.start.y, original = importPointer.original; importedBoxes[selectedImportedBox] = constrainFrameBox(importPointer.mode === 'resize' ? { ...original, width: original.width + dx, height: original.height + dy } : { ...original, x: original.x + dx, y: original.y + dy }, importPreview.width, importPreview.height); drawImportPreview(); }
function endBoxEdit(event) { if (importPointer && event.pointerId === importPointer.id) importPointer = null; }
function handleImportPreviewKeydown(event) { if (!importedSheetImage || selectedImportedBox < 0 || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return; event.preventDefault(); event.stopPropagation(); const amount = event.shiftKey ? 10 : 1; const resize = event.ctrlKey || event.metaKey; const box = { ...importedBoxes[selectedImportedBox] }; if (resize) { if (event.key === 'ArrowLeft') box.width -= amount; if (event.key === 'ArrowRight') box.width += amount; if (event.key === 'ArrowUp') box.height -= amount; if (event.key === 'ArrowDown') box.height += amount; } else { if (event.key === 'ArrowLeft') box.x -= amount; if (event.key === 'ArrowRight') box.x += amount; if (event.key === 'ArrowUp') box.y -= amount; if (event.key === 'ArrowDown') box.y += amount; } importedBoxes[selectedImportedBox] = constrainFrameBox(box, importPreview.width, importPreview.height); drawImportPreview(); }
function canvasBlob(canvas) { return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not encode a frame.')), 'image/png')); }
async function createImportedAnimation() { if (!importedSheetImage || !importedSheetFile || !manifest || !importedBoxes.length) return; const durationMs = importNumber(importDuration, 20, 2000, 120); importConfirm.disabled = true; setImportStatus('Building ' + importedBoxes.length + ' Pose Lab frames…'); const frameBlobs = []; for (const box of importedBoxes) { const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; const context = canvas.getContext('2d'), scale = Math.min(512 / box.width, 512 / box.height), drawWidth = Math.round(box.width * scale), drawHeight = Math.round(box.height * scale); context.drawImage(importedSheetImage, box.x, box.y, box.width, box.height, Math.round((512 - drawWidth) / 2), Math.round((512 - drawHeight) / 2), drawWidth, drawHeight); const rgba = context.getImageData(0, 0, 512, 512); rgba.data.set(clearConnectedBackground(rgba, 52)); context.putImageData(rgba, 0, 0); frameBlobs.push(await canvasBlob(canvas)); } const id = 'imported-' + Date.now(), label = importedSheetFile.name.replace(/\.[^.]+$/, '') || 'Imported contact sheet'; const metadata = { schema: 'pose-lab-v2-intelligent-sprite-import-v1', status: 'draft', id, label, source: { name: importedSheetFile.name, size: importedSheetFile.size, type: importedSheetFile.type, width: importedSheetImage.width, height: importedSheetImage.height }, boxes: importedBoxes.map(({ x, y, width, height }) => ({ x, y, width, height })), frameCount: frameBlobs.length, durationMs, frameDurationsMs: frameBlobs.map(() => durationMs), importedAt: new Date().toISOString() }; await saveLocalDraft(importedSheetFile, metadata, frameBlobs); const entry = localDraftAnimationFromStorage({ file: importedSheetFile, metadata, frameBlobs }); if (!entry) throw new Error('Could not restore the newly created local draft.'); upsertLocalDraftAnimation(entry); buildAnimationPicker(); closeImporter(); setAnimation(entry.id, { speak: true }); }
async function exportCurrentAnimationGif() { if (!animation?.imported) return; try { const images = await Promise.all(animation.frames.map((frame) => preloadFrame(frame.src))); const frames = images.map((image) => { const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512; canvas.getContext('2d').drawImage(image, 0, 0, 512, 512); return canvas; }); const blob = encodeGif(frames, animation.frames.map((frame) => frame.durationMs)), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = animation.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.gif'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); announce('GIF downloaded'); } catch (error) { announce(error instanceof Error ? error.message : String(error)); } }

async function boot() {
  try {
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Animation manifest returned ${response.status}`);
    manifest = await response.json();
    if (manifest.schema !== 'pose-lab-v2-2d-animation-set-v1') {
      throw new Error(`Unsupported animation manifest: ${manifest.schema || 'missing schema'}`);
    }
    if (!Array.isArray(manifest.animations) || manifest.animations.length === 0) {
      throw new Error('Animation manifest contains no animations');
    }

    try {
      const localDraft = localDraftAnimationFromStorage(await readLocalDraft());
      if (localDraft) upsertLocalDraftAnimation(localDraft);
    } catch {
      // IndexedDB restoration is additive; tracked review animations must still boot if local storage is unavailable.
    }
    buildAnimationPicker();
    const statuses = manifest.statuses || {};
    batchStatus.textContent = manifest.batch_id
      ? `Batch ${manifest.batch_id} · ready ${(statuses.ready || []).length} · red ${(statuses.red || []).length} · blocked ${(statuses.blocked || []).length}`
      : 'Approved tracked animation set';
    const requestedId = URL_PARAMS.get('animation') || manifest.defaultAnimation;
    animation = manifest.animations.find((entry) => entry.id === requestedId) || manifest.animations[0];
    await Promise.all(animation.frames.map((frame) => preloadFrame(frame.src)));
    setAnimation(animation.id);
    document.title = `${manifest.character} · 2D Review`;
    document.body.dataset.reviewReady = '1';
    document.body.dataset.reviewMode = '2d';
  } catch (error) {
    document.body.dataset.bootFailed = '1';
    app.innerHTML = `
      <section class="sprite-boot-failure">
        <h1>2D review failed to load</h1>
        <pre></pre>
      </section>
    `;
    app.querySelector('pre').textContent = error instanceof Error ? error.message : String(error);
  }
}

playButton.addEventListener('click', () => {
  if (playing) pause({ speak: true });
  else play({ speak: true });
});
previousButton.addEventListener('click', () => {
  pause();
  advanceFrame(-1, { speak: true });
});
nextButton.addEventListener('click', () => {
  pause();
  advanceFrame(1, { speak: true });
});
scrubber.addEventListener('input', () => {
  pause();
  currentFrameIndex = Number(scrubber.value);
  renderFrame({ speak: true });
});
speedInput.addEventListener('change', () => {
  playbackSpeed = Number(speedInput.value);
  nextFrameAt = null;
  announce(`Playback speed ${speedInput.options[speedInput.selectedIndex].text}`);
});
onionButton.addEventListener('click', () => {
  onionEnabled = !onionEnabled;
  if (onionEnabled) {
    deltaEnabled = false;
    stack.classList.remove('show-delta');
    setPressed(deltaButton, false, 'Delta: On', 'Delta: Off');
  }
  stack.classList.toggle('show-onion', onionEnabled);
  setPressed(onionButton, onionEnabled, 'Onion: On', 'Onion: Off');
});
deltaButton.addEventListener('click', () => {
  deltaEnabled = !deltaEnabled;
  if (deltaEnabled) {
    onionEnabled = false;
    stack.classList.remove('show-onion');
    setPressed(onionButton, false, 'Onion: On', 'Onion: Off');
  }
  stack.classList.toggle('show-delta', deltaEnabled);
  setPressed(deltaButton, deltaEnabled, 'Delta: On', 'Delta: Off');
  if (deltaEnabled) renderDelta().catch(() => {});
});
loopButton.addEventListener('click', () => {
  loopEnabled = !loopEnabled;
  setPressed(loopButton, loopEnabled, 'Loop: On', 'Loop: Off');
});
groundButton.addEventListener('click', () => {
  groundEnabled = !groundEnabled;
  groundGuide.classList.toggle('visible', groundEnabled);
  setPressed(groundButton, groundEnabled, 'Ground: On', 'Ground: Off');
});
fitButton.addEventListener('click', () => {
  manualZoom = false;
  fitStage();
});
zoomInput.addEventListener('input', () => {
  manualZoom = true;
  setZoom(zoomInput.value);
});
importSheetButton.addEventListener('click', openImporter);
importCancel.addEventListener('click', closeImporter);
importFile.addEventListener('change', () => loadImportSheet(importFile.files?.[0]));
importPreview.addEventListener('pointerdown', beginBoxEdit);
importPreview.addEventListener('keydown', handleImportPreviewKeydown);
importPreview.addEventListener('pointermove', moveBoxEdit);
importPreview.addEventListener('pointerup', endBoxEdit);
importPreview.addEventListener('pointercancel', endBoxEdit);
addBoxButton.addEventListener('click', () => { if (!importedSheetImage) return; const box = constrainFrameBox({ x: importedSheetImage.width * .25, y: importedSheetImage.height * .25, width: importedSheetImage.width * .5, height: importedSheetImage.height * .5 }, importedSheetImage.width, importedSheetImage.height); importedBoxes.push(box); selectedImportedBox = importedBoxes.length - 1; drawImportPreview(); });
deleteBoxButton.addEventListener('click', () => { if (selectedImportedBox < 0) return; importedBoxes.splice(selectedImportedBox, 1); selectedImportedBox = Math.min(selectedImportedBox, importedBoxes.length - 1); drawImportPreview(); });
earlierBoxButton.addEventListener('click', () => { if (selectedImportedBox <= 0) return; [importedBoxes[selectedImportedBox - 1], importedBoxes[selectedImportedBox]] = [importedBoxes[selectedImportedBox], importedBoxes[selectedImportedBox - 1]]; selectedImportedBox -= 1; drawImportPreview(); });
laterBoxButton.addEventListener('click', () => { if (selectedImportedBox < 0 || selectedImportedBox >= importedBoxes.length - 1) return; [importedBoxes[selectedImportedBox + 1], importedBoxes[selectedImportedBox]] = [importedBoxes[selectedImportedBox], importedBoxes[selectedImportedBox + 1]]; selectedImportedBox += 1; drawImportPreview(); });
redetectButton.addEventListener('click', detectImportedBoxes);
restoreImportButton.addEventListener('click', () => readLocalDraft().then((draft) => { if (draft) loadImportSheet(draft.file, draft.metadata); }).catch((error) => setImportStatus(String(error))));
importConfirm.addEventListener('click', () => createImportedAnimation().catch((error) => { setImportStatus(error instanceof Error ? error.message : String(error)); updateBoxActions(); }));
exportCurrentGif.addEventListener('click', () => exportCurrentAnimationGif());
backgroundButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const background = button.dataset.background;
    stage.className = `sprite-stage ${background}`;
    backgroundButtons.forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle('active', active);
      candidate.setAttribute('aria-pressed', String(active));
    });
  });
});

window.addEventListener('resize', () => {
  if (!manualZoom && manifest) fitStage();
});

window.addEventListener('keydown', (event) => {
  if (!animation) return;
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target?.tagName)) return;
  if (event.code === 'Space') {
    event.preventDefault();
    if (playing) pause({ speak: true });
    else play({ speak: true });
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    pause();
    advanceFrame(-1, { speak: true });
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    pause();
    advanceFrame(1, { speak: true });
  } else if (event.key === 'Home') {
    event.preventDefault();
    pause();
    currentFrameIndex = 0;
    renderFrame({ speak: true });
  } else if (event.key === 'End') {
    event.preventDefault();
    pause();
    currentFrameIndex = animation.frames.length - 1;
    renderFrame({ speak: true });
  }
});

boot();

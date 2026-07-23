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

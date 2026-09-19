import { encodeGif } from './gif-encoder.js';
import {
  TWO_KEY_MODE,
  LEGACY_TWO_KEY_MODE,
  buildTwoKeyPlan,
  deriveDeformationRecipe,
  renderTwoKeyFrameRgba,
  validateParametricDocument,
} from './two-key-snap.js';
import { buildStoredZip } from './zip-store.js';

function safeName(value) {
  return String(value || 'two-key').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'two-key';
}

function numberValue(input, fallback, min = 0, max = 60000) {
  return Math.max(min, Math.min(max, Math.round(Number(input.value) || fallback)));
}

function blobUrl(blob) {
  return URL.createObjectURL(blob);
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not encode PNG frame.')), 'image/png');
  });
}

function downloadBlob(blob, filename) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 3000);
}

async function fileSha256(file) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function validImage(file) {
  return Boolean(file && (((file.type || '').startsWith('image/')) || /\.(png|webp|jpe?g)$/i.test(file.name || '')));
}

async function decodeImageFile(file, width, height) {
  if (!validImage(file)) throw new Error('Two-Key endpoints must be image files.');
  const href = URL.createObjectURL(file);
  try {
    const image = new Image();
    const loaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Could not decode ' + file.name));
    });
    image.src = href;
    await loaded;
    if (image.naturalWidth !== width || image.naturalHeight !== height) {
      throw new Error('Sacred endpoints must be exactly ' + width + '×' + height + ' pixels. ' + file.name + ' is ' + image.naturalWidth + '×' + image.naturalHeight + '.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    return {
      file,
      rgba: new Uint8ClampedArray(context.getImageData(0, 0, width, height).data),
      sha256: await fileSha256(file),
      sourceWidth: image.naturalWidth,
      sourceHeight: image.naturalHeight,
      previewUrl: URL.createObjectURL(file),
    };
  } finally {
    URL.revokeObjectURL(href);
  }
}

function rgbaCanvas(rgba, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
  return canvas;
}

function rgbaDataUrl(rgba, width, height) {
  return rgbaCanvas(rgba, width, height).toDataURL('image/png');
}

async function rgbaBlob(rgba, width, height) {
  return canvasBlob(rgbaCanvas(rgba, width, height));
}

async function blobDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlFile(dataUrl, name, type) {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name || 'endpoint.png', { type: type || blob.type || 'image/png' });
}

function selectedFrames(animation, scope) {
  return scope === 'authored'
    ? animation.frames.filter((frame) => frame.frameType === 'authored')
    : [...animation.frames];
}

function frameFileName(frame, index) {
  return String(index).padStart(2, '0') + '_' + safeName(frame.label || 'frame') + '_' + (frame.frameType || 'frame') + '.png';
}

function cleanPlanFrames(frames) {
  return frames.map((frame) => {
    const clean = {
      frameType: frame.frameType,
      label: frame.label,
      durationMs: frame.durationMs,
    };
    if (frame.key) clean.key = frame.key;
    if (frame.from) clean.from = frame.from;
    if (frame.to) clean.to = frame.to;
    if (Number.isFinite(frame.progress)) clean.progress = frame.progress;
    if (Number.isFinite(frame.rawProgress)) clean.rawProgress = frame.rawProgress;
    return clean;
  });
}

function twoKeyContract(recipe) {
  return [
    'authored endpoint pixels sacred',
    'procedural bridge generated live',
    'spatial deformation only',
    'no crossfade / no stored bridge frames',
    recipe.plantedFeet ? 'planted-foot anchor on' : 'planted-foot anchor off',
  ];
}

function recipeSummary(recipe) {
  const a = recipe.anchors.A;
  const b = recipe.anchors.B;
  const ma = recipe.masks.A;
  const mb = recipe.masks.B;
  return 'Recipe ' + recipe.method
    + ' · A anchor ' + Math.round(a.x) + ',' + Math.round(a.y)
    + ' · B anchor ' + Math.round(b.x) + ',' + Math.round(b.y)
    + ' · A mask ' + ma.x + ',' + ma.y + ' ' + ma.width + '×' + ma.height
    + ' · B mask ' + mb.x + ',' + mb.y + ' ' + mb.width + '×' + mb.height;
}

function makeRuntimeEntry({ manifest, id, label, keyA, keyB, plan, recipe, importedAt }) {
  const width = manifest.frameSpace.width;
  const height = manifest.frameSpace.height;
  const endpoints = { A: keyA.rgba, B: keyB.rgba };
  const previewCache = new Map();
  const frames = cleanPlanFrames(plan.frames).map((frame) => ({
    ...frame,
    ...(frame.frameType === 'authored' ? { src: frame.key === 'B' ? keyB.previewUrl : keyA.previewUrl } : {}),
  }));
  const metadata = {
    schema: 'pose-lab-v2-two-key-parametric-storage-v1',
    id,
    label,
    mode: TWO_KEY_MODE,
    loop: plan.loop,
    source: { name: keyA.file.name, sha256: keyA.sha256, width, height },
    keyB: { name: keyB.file.name, sha256: keyB.sha256, width, height },
    timing: { ...plan.settings },
    recipe,
    plan: cleanPlanFrames(plan.frames),
    frameCount: plan.frames.length,
    importedAt: importedAt || new Date().toISOString(),
  };
  const metadataUrl = blobUrl(new Blob([JSON.stringify(metadata, null, 2) + '\n'], { type: 'application/json' }));
  const entry = {
    id,
    label,
    mode: TWO_KEY_MODE,
    status: 'draft',
    imported: true,
    localDraft: true,
    loop: plan.loop,
    contactSheet: keyA.previewUrl,
    sourceMetadata: metadataUrl,
    verifierReport: metadataUrl,
    groundGuideY: height - 1,
    contract: twoKeyContract(recipe),
    frames,
    twoKeySettings: { ...plan.settings },
    twoKeyRecipe: recipe,
    endpointSources: { A: keyA.file.name, B: keyB.file.name },
    twoKeyRuntime: { keyA, keyB, endpoints, recipe, metadata },
  };

  entry.resolveFrameSrc = (frame) => {
    if (frame.src) return frame.src;
    const cacheKey = frame.label + ':' + frame.progress + ':' + frame.from + ':' + frame.to;
    if (!previewCache.has(cacheKey)) {
      const rgba = renderTwoKeyFrameRgba(frame, endpoints, width, height, recipe);
      previewCache.set(cacheKey, rgbaDataUrl(rgba, width, height));
    }
    return previewCache.get(cacheKey);
  };
  entry.bakeFrameRgba = (frame) => renderTwoKeyFrameRgba(frame, endpoints, width, height, recipe);
  return entry;
}

async function parametricDocument(animation, manifest) {
  const runtime = animation.twoKeyRuntime;
  if (!runtime) throw new Error('This Two-Key animation has no parametric runtime.');
  const keyA = runtime.keyA;
  const keyB = runtime.keyB;
  return {
    schema: 'pose-lab-v2-two-key-parametric-v1',
    version: 1,
    mode: TWO_KEY_MODE,
    id: animation.id,
    label: animation.label,
    loop: animation.loop !== false,
    frameSpace: { ...manifest.frameSpace },
    endpoints: {
      A: {
        name: keyA.file.name,
        type: keyA.file.type || 'image/png',
        size: keyA.file.size,
        width: keyA.sourceWidth,
        height: keyA.sourceHeight,
        sha256: keyA.sha256,
        dataUrl: await blobDataUrl(keyA.file),
      },
      B: {
        name: keyB.file.name,
        type: keyB.file.type || 'image/png',
        size: keyB.file.size,
        width: keyB.sourceWidth,
        height: keyB.sourceHeight,
        sha256: keyB.sha256,
        dataUrl: await blobDataUrl(keyB.file),
      },
    },
    timing: { ...animation.twoKeySettings },
    recipe: animation.twoKeyRecipe,
    plan: cleanPlanFrames(animation.frames),
  };
}

async function bakeFrames(animation, manifest, scope) {
  const frames = selectedFrames(animation, scope);
  const width = manifest.frameSpace.width;
  const height = manifest.frameSpace.height;
  const baked = [];
  for (const frame of frames) {
    const rgba = animation.bakeFrameRgba(frame);
    baked.push({ frame, rgba, canvas: rgbaCanvas(rgba, width, height) });
  }
  return baked;
}

export async function installTwoKeyDeform({
  app,
  getManifest,
  getAnimation,
  setAnimation,
  openImporter,
  saveLocalDraft,
  readLocalDraft,
  upsertLocalDraftAnimation,
  buildAnimationPicker,
  announce,
}) {
  const consoleEl = app.querySelector('.sprite-console');
  const animationPicker = app.querySelector('[data-animation-picker]');
  if (!consoleEl || !animationPicker || consoleEl.querySelector('[data-animation-mode]')) return null;

  const style = document.createElement('style');
  style.textContent = [
    '.two-key-mode-row,.two-key-grid,.two-key-export-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
    '.two-key-mode-row label,.two-key-panel label{display:grid;gap:4px;color:#b9c5cd;font-size:12px}',
    '.two-key-panel{display:grid;gap:12px;padding:12px;border:1px solid rgba(85,215,255,.25);border-radius:10px;background:#10171b}',
    '.two-key-panel[hidden]{display:none}',
    '.two-key-grid{align-items:end}',
    '.two-key-panel input[type="number"]{width:92px}',
    '.two-key-panel input[type="range"]{min-width:160px}',
    '.two-key-status,.two-key-recipe{margin:0;color:#bfeeff;font-size:12px;line-height:1.4}',
    '.two-key-key{padding:8px;border:1px solid rgba(255,255,255,.12);border-radius:8px}',
    '.two-key-key strong{color:#f0c35a}',
    '.sprite-frame-strip button[data-frame-type="authored"]{border-color:#f0c35a}',
    '.sprite-frame-strip button[data-frame-type="procedural"]{border-color:#55d7ff}',
    '.sprite-frame-strip button[data-frame-type="procedural"] span{color:#8fe7ff}',
    '.sprite-frame-strip button[data-frame-type="procedural"] img:not([src]){background:repeating-linear-gradient(135deg,#14242b,#14242b 8px,#19343f 8px,#19343f 16px)}',
  ].join('');

  document.head.append(style);

  const modeRow = document.createElement('div');
  modeRow.className = 'two-key-mode-row';
  modeRow.innerHTML = [
    '<label>Animation mode',
    '<select data-animation-mode>',
    '<option value="frame-sequence">Frame Sequence</option>',
    '<option value="two-key-deform">Two-Key Deform</option>',
    '<option value="contact-sheet-review">Contact Sheet Review</option>',
    '</select></label>',
  ].join('');

  const panel = document.createElement('section');
  panel.className = 'two-key-panel';
  panel.dataset.twoKeyPanel = '';
  panel.hidden = true;
  panel.innerHTML = [
    '<div class="two-key-grid">',
    '<label class="two-key-key"><strong>Authored Key A</strong><input type="file" accept="image/*" data-two-key-a aria-label="Choose authored Key A image"><span data-two-key-a-name>no file</span></label>',
    '<label class="two-key-key"><strong>Authored Key B</strong><input type="file" accept="image/*" data-two-key-b aria-label="Choose authored Key B image"><span data-two-key-b-name>no file</span></label>',
    '</div>',
    '<div class="two-key-grid">',
    '<label>Hold A ms<input type="number" min="20" max="10000" value="500" data-two-key-hold-a></label>',
    '<label>A→B duration ms<input type="number" min="20" max="10000" value="240" data-two-key-ab></label>',
    '<label>Bridge steps<input type="number" min="0" max="24" value="3" data-two-key-steps></label>',
    '<label>Hold B ms<input type="number" min="20" max="10000" value="500" data-two-key-hold-b></label>',
    '<label>B→A duration ms<input type="number" min="20" max="10000" value="240" data-two-key-ba></label>',
    '<label>Easing<select data-two-key-easing><option value="ease-in-out">Ease in/out</option><option value="linear">Linear</option><option value="ease-in">Ease in</option><option value="ease-out">Ease out</option></select></label>',
    '<label>Deform strength <output data-two-key-strength-output>70</output><input type="range" min="0" max="100" step="1" value="70" data-two-key-strength></label>',
    '<label>Mask padding px<input type="number" min="0" max="64" value="2" data-two-key-mask-padding></label>',
    '<label>Anchor band px<input type="number" min="1" max="96" value="12" data-two-key-anchor-band></label>',
    '<label>Alpha threshold<input type="number" min="0" max="255" value="24" data-two-key-alpha></label>',
    '<label><span>Reverse / ping-pong</span><input type="checkbox" checked data-two-key-pingpong></label>',
    '<label><span>Plant feet / pin anchors</span><input type="checkbox" checked data-two-key-foot-anchor></label>',
    '<button type="button" data-two-key-build>Build / update live preview</button>',
    '</div>',
    '<p class="two-key-status" data-two-key-status>Choose two exact-size endpoint images. Authored keys stay pixel-exact. Procedural bridge frames are generated only when previewed or exported.</p>',
    '<p class="two-key-recipe" data-two-key-recipe></p>',
    '<div class="two-key-export-row">',
    '<label>Export sequence<select data-two-key-export-scope><option value="full">Full sequence</option><option value="authored">Authored keys only</option></select></label>',
    '<button type="button" data-two-key-export-gif>Export GIF</button>',
    '<button type="button" data-two-key-export-png>Export PNG frame ZIP</button>',
    '<button type="button" data-two-key-export-sheet>Export contact sheet</button>',
    '<button type="button" data-two-key-export-baked>Export baked JSON</button>',
    '<button type="button" data-two-key-export-native>Export native parametric JSON</button>',
    '</div>',
    '<label>Reload native parametric JSON<input type="file" accept=".json,application/json" data-two-key-json aria-label="Reload native Two-Key parametric JSON"></label>',
  ].join('');

  consoleEl.insertBefore(modeRow, animationPicker);
  consoleEl.insertBefore(panel, animationPicker.nextSibling);

  const q = (selector) => panel.querySelector(selector);
  const mode = modeRow.querySelector('[data-animation-mode]');
  const keyAInput = q('[data-two-key-a]');
  const keyBInput = q('[data-two-key-b]');
  const keyAName = q('[data-two-key-a-name]');
  const keyBName = q('[data-two-key-b-name]');
  const status = q('[data-two-key-status]');
  const recipeReadout = q('[data-two-key-recipe]');
  const holdA = q('[data-two-key-hold-a]');
  const bridgeAB = q('[data-two-key-ab]');
  const bridgeSteps = q('[data-two-key-steps]');
  const holdB = q('[data-two-key-hold-b]');
  const bridgeBA = q('[data-two-key-ba]');
  const easing = q('[data-two-key-easing]');
  const strength = q('[data-two-key-strength]');
  const strengthOutput = q('[data-two-key-strength-output]');
  const maskPadding = q('[data-two-key-mask-padding]');
  const anchorBand = q('[data-two-key-anchor-band]');
  const alphaThreshold = q('[data-two-key-alpha]');
  const pingPong = q('[data-two-key-pingpong]');
  const footAnchor = q('[data-two-key-foot-anchor]');
  const build = q('[data-two-key-build]');
  const exportScope = q('[data-two-key-export-scope]');
  const jsonInput = q('[data-two-key-json]');

  let keyA = null;
  let keyB = null;
  let latestAnimationId = null;

  function setStatus(message) {
    status.textContent = message;
  }

  function applySettings(settings = {}, recipe = null) {
    if (settings.holdA) holdA.value = String(settings.holdA);
    if (settings.bridgeAB) bridgeAB.value = String(settings.bridgeAB);
    if (Number.isFinite(settings.bridgeSteps)) bridgeSteps.value = String(settings.bridgeSteps);
    if (settings.holdB) holdB.value = String(settings.holdB);
    if (settings.bridgeBA) bridgeBA.value = String(settings.bridgeBA);
    if (settings.easing) easing.value = settings.easing;
    if (Number.isFinite(settings.deformStrength)) {
      strength.value = String(settings.deformStrength);
      strengthOutput.textContent = String(settings.deformStrength);
    }
    if (typeof settings.pingPong === 'boolean') pingPong.checked = settings.pingPong;
    if (recipe) {
      if (Number.isFinite(recipe.maskPaddingPx)) maskPadding.value = String(recipe.maskPaddingPx);
      if (Number.isFinite(recipe.anchorBandPx)) anchorBand.value = String(recipe.anchorBandPx);
      if (Number.isFinite(recipe.alphaThreshold)) alphaThreshold.value = String(recipe.alphaThreshold);
      if (typeof recipe.plantedFeet === 'boolean') footAnchor.checked = recipe.plantedFeet;
      recipeReadout.textContent = recipeSummary(recipe);
    }
  }

  function currentTwoKey() {
    const active = getAnimation();
    if (active?.mode === TWO_KEY_MODE || active?.mode === LEGACY_TWO_KEY_MODE) return active;
    const manifest = getManifest();
    return manifest?.animations?.find((entry) => entry.id === latestAnimationId) || null;
  }

  mode.addEventListener('change', () => {
    panel.hidden = mode.value !== TWO_KEY_MODE;
    if (mode.value === 'contact-sheet-review') openImporter();
  });
  strength.addEventListener('input', () => { strengthOutput.textContent = strength.value; });

  async function loadKey(input, role) {
    const file = input.files?.[0];
    if (!file) return null;
    const manifest = getManifest();
    const decoded = await decodeImageFile(file, manifest.frameSpace.width, manifest.frameSpace.height);
    if (role === 'A') {
      if (keyA?.previewUrl) URL.revokeObjectURL(keyA.previewUrl);
      keyA = decoded;
      keyAName.textContent = file.name;
    } else {
      if (keyB?.previewUrl) URL.revokeObjectURL(keyB.previewUrl);
      keyB = decoded;
      keyBName.textContent = file.name;
    }
    setStatus('Key ' + role + ' loaded pixel-exact: ' + file.name + ' · ' + decoded.sourceWidth + '×' + decoded.sourceHeight + ' · sha256 ' + decoded.sha256.slice(0, 12) + '…');
    return decoded;
  }

  keyAInput.addEventListener('change', () => loadKey(keyAInput, 'A').catch((error) => setStatus(String(error.message || error))));
  keyBInput.addEventListener('change', () => loadKey(keyBInput, 'B').catch((error) => setStatus(String(error.message || error))));

  async function persistEntry(entry) {
    const runtime = entry.twoKeyRuntime;
    const metadata = runtime.metadata;
    await saveLocalDraft(runtime.keyA.file, metadata, [], {
      endpointFiles: { A: runtime.keyA.file, B: runtime.keyB.file },
    });
  }

  function installEntry(entry, speak = true) {
    upsertLocalDraftAnimation(entry);
    buildAnimationPicker();
    latestAnimationId = entry.id;
    mode.value = TWO_KEY_MODE;
    panel.hidden = false;
    applySettings(entry.twoKeySettings, entry.twoKeyRecipe);
    keyA = entry.twoKeyRuntime.keyA;
    keyB = entry.twoKeyRuntime.keyB;
    keyAName.textContent = keyA.file.name;
    keyBName.textContent = keyB.file.name;
    setAnimation(entry.id, { speak });
  }

  async function buildPreview() {
    if (!keyA || !keyB) throw new Error('Choose both authored endpoint images first.');
    const manifest = getManifest();
    const width = manifest.frameSpace.width;
    const height = manifest.frameSpace.height;
    const settings = {
      holdA: numberValue(holdA, 500, 20, 10000),
      bridgeAB: numberValue(bridgeAB, 240, 20, 10000),
      bridgeSteps: numberValue(bridgeSteps, 3, 0, 24),
      holdB: numberValue(holdB, 500, 20, 10000),
      bridgeBA: numberValue(bridgeBA, 240, 20, 10000),
      pingPong: pingPong.checked,
      easing: easing.value,
      deformStrength: numberValue(strength, 70, 0, 100),
    };
    const plan = buildTwoKeyPlan(settings);
    const recipe = deriveDeformationRecipe(keyA.rgba, keyB.rgba, width, height, {
      plantedFeet: footAnchor.checked,
      maskPaddingPx: numberValue(maskPadding, 2, 0, 64),
      anchorBandPx: numberValue(anchorBand, 12, 1, 96),
      alphaThreshold: numberValue(alphaThreshold, 24, 0, 255),
    });
    const id = 'two-key-deform-' + Date.now();
    const label = 'Two-Key Deform ' + keyA.file.name.replace(/\.[^.]+$/, '') + ' → ' + keyB.file.name.replace(/\.[^.]+$/, '');
    const entry = makeRuntimeEntry({ manifest, id, label, keyA, keyB, plan, recipe });
    await persistEntry(entry);
    installEntry(entry);
    const procedural = entry.frames.filter((frame) => frame.frameType === 'procedural').length;
    setStatus('Native parametric preview ready: 2 authored keys + ' + procedural + ' procedural descriptors. No bridge frame bitmap was stored.');
    recipeReadout.textContent = recipeSummary(recipe);
    return entry;
  }

  build.addEventListener('click', () => buildPreview().catch((error) => setStatus(String(error.message || error))));

  async function exportGif() {
    const animation = currentTwoKey();
    if (!animation) throw new Error('Build or reload a Two-Key Deform animation first.');
    const baked = await bakeFrames(animation, getManifest(), exportScope.value);
    const gif = encodeGif(baked.map((item) => item.canvas), baked.map((item) => item.frame.durationMs));
    downloadBlob(gif, safeName(animation.label) + '-' + exportScope.value + '.gif');
    setStatus('GIF baked from the same renderer used by live preview.');
  }

  async function exportPngZip() {
    const animation = currentTwoKey();
    if (!animation) throw new Error('Build or reload a Two-Key Deform animation first.');
    const manifest = getManifest();
    const baked = await bakeFrames(animation, manifest, exportScope.value);
    const entries = [];
    for (let index = 0; index < baked.length; index += 1) {
      const blob = await canvasBlob(baked[index].canvas);
      entries.push({ name: frameFileName(baked[index].frame, index), bytes: new Uint8Array(await blob.arrayBuffer()) });
    }
    downloadBlob(new Blob([buildStoredZip(entries)], { type: 'application/zip' }), safeName(animation.label) + '-' + exportScope.value + '-png-frames.zip');
    setStatus('PNG frame ZIP baked on demand with ' + baked.length + ' frames.');
  }

  async function exportSheet() {
    const animation = currentTwoKey();
    if (!animation) throw new Error('Build or reload a Two-Key Deform animation first.');
    const manifest = getManifest();
    const baked = await bakeFrames(animation, manifest, exportScope.value);
    const cell = 220;
    const labelHeight = 34;
    const columns = Math.min(4, baked.length);
    const rows = Math.ceil(baked.length / columns);
    const canvas = document.createElement('canvas');
    canvas.width = columns * cell;
    canvas.height = rows * (cell + labelHeight);
    const context = canvas.getContext('2d');
    context.fillStyle = '#15191c';
    context.fillRect(0, 0, canvas.width, canvas.height);
    baked.forEach((item, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = col * cell;
      const y = row * (cell + labelHeight);
      context.drawImage(item.canvas, x, y, cell, cell);
      context.fillStyle = item.frame.frameType === 'authored' ? '#f0c35a' : '#55d7ff';
      context.fillRect(x, y + cell, cell, labelHeight);
      context.fillStyle = '#071013';
      context.font = 'bold 14px system-ui';
      context.fillText(item.frame.label + ' · ' + item.frame.frameType, x + 7, y + cell + 22);
    });
    downloadBlob(await canvasBlob(canvas), safeName(animation.label) + '-' + exportScope.value + '-contact-sheet.png');
    setStatus('Contact sheet baked on demand; authored/procedural labels included.');
  }

  async function exportBakedJson() {
    const animation = currentTwoKey();
    if (!animation) throw new Error('Build or reload a Two-Key Deform animation first.');
    const manifest = getManifest();
    const baked = await bakeFrames(animation, manifest, exportScope.value);
    const frames = [];
    for (const item of baked) {
      const blob = await canvasBlob(item.canvas);
      frames.push({
        frameType: item.frame.frameType,
        label: item.frame.label,
        durationMs: item.frame.durationMs,
        dataUrl: await blobDataUrl(blob),
      });
    }
    const root = {
      schema: 'pose-lab-v2-two-key-baked-v1',
      sourceMode: TWO_KEY_MODE,
      id: animation.id,
      label: animation.label,
      frameSpace: { ...manifest.frameSpace },
      frames,
    };
    downloadBlob(new Blob([JSON.stringify(root, null, 2) + '\n'], { type: 'application/json' }), safeName(animation.label) + '-' + exportScope.value + '-baked.json');
    setStatus('Baked JSON generated now. It was not stored as the native asset.');
  }

  async function exportNativeJson() {
    const animation = currentTwoKey();
    if (!animation) throw new Error('Build or reload a Two-Key Deform animation first.');
    const root = await parametricDocument(animation, getManifest());
    validateParametricDocument(root);
    downloadBlob(new Blob([JSON.stringify(root, null, 2) + '\n'], { type: 'application/json' }), safeName(animation.label) + '-parametric.json');
    setStatus('Native parametric JSON exported: two authored keys + recipe + timing only; zero bridge bitmaps.');
  }

  q('[data-two-key-export-gif]').addEventListener('click', () => exportGif().catch((error) => setStatus(String(error.message || error))));
  q('[data-two-key-export-png]').addEventListener('click', () => exportPngZip().catch((error) => setStatus(String(error.message || error))));
  q('[data-two-key-export-sheet]').addEventListener('click', () => exportSheet().catch((error) => setStatus(String(error.message || error))));
  q('[data-two-key-export-baked]').addEventListener('click', () => exportBakedJson().catch((error) => setStatus(String(error.message || error))));
  q('[data-two-key-export-native]').addEventListener('click', () => exportNativeJson().catch((error) => setStatus(String(error.message || error))));

  async function entryFromParametricDocument(root, persist = true) {
    validateParametricDocument(root);
    const manifest = getManifest();
    if (root.frameSpace?.width !== manifest.frameSpace.width || root.frameSpace?.height !== manifest.frameSpace.height) {
      throw new Error('Parametric JSON frame size does not match this Pose Lab manifest.');
    }
    const fileA = await dataUrlFile(root.endpoints.A.dataUrl, root.endpoints.A.name, root.endpoints.A.type);
    const fileB = await dataUrlFile(root.endpoints.B.dataUrl, root.endpoints.B.name, root.endpoints.B.type);
    const decodedA = await decodeImageFile(fileA, manifest.frameSpace.width, manifest.frameSpace.height);
    const decodedB = await decodeImageFile(fileB, manifest.frameSpace.width, manifest.frameSpace.height);
    if (root.endpoints.A.sha256 && decodedA.sha256 !== root.endpoints.A.sha256) throw new Error('Key A SHA-256 did not survive parametric JSON reload.');
    if (root.endpoints.B.sha256 && decodedB.sha256 !== root.endpoints.B.sha256) throw new Error('Key B SHA-256 did not survive parametric JSON reload.');
    const settings = {
      holdA: root.timing?.holdA,
      holdB: root.timing?.holdB,
      bridgeAB: root.timing?.bridgeAB,
      bridgeBA: root.timing?.bridgeBA,
      bridgeSteps: root.timing?.bridgeSteps,
      pingPong: root.timing?.pingPong,
      easing: root.timing?.easing,
      deformStrength: root.timing?.deformStrength,
    };
    const plan = { mode: TWO_KEY_MODE, loop: root.loop !== false, settings, frames: cleanPlanFrames(root.plan) };
    const entry = makeRuntimeEntry({
      manifest,
      id: root.id || 'two-key-deform-json-' + Date.now(),
      label: root.label || 'Reloaded Two-Key Deform',
      keyA: decodedA,
      keyB: decodedB,
      plan,
      recipe: root.recipe,
      importedAt: new Date().toISOString(),
    });
    if (persist) await persistEntry(entry);
    return entry;
  }

  jsonInput.addEventListener('change', async () => {
    try {
      const file = jsonInput.files?.[0];
      if (!file) return;
      const entry = await entryFromParametricDocument(JSON.parse(await file.text()), true);
      installEntry(entry);
      setStatus('Native parametric JSON reloaded. Procedural bridge frames will be regenerated live, not read from the file.');
    } catch (error) {
      setStatus(String(error.message || error));
    }
  });

  try {
    if (typeof readLocalDraft === 'function') {
      const draft = await readLocalDraft();
      if (draft?.metadata?.schema === 'pose-lab-v2-two-key-parametric-storage-v1' && draft?.endpointFiles?.A && draft?.endpointFiles?.B) {
        const manifest = getManifest();
        const restoredA = await decodeImageFile(draft.endpointFiles.A, manifest.frameSpace.width, manifest.frameSpace.height);
        const restoredB = await decodeImageFile(draft.endpointFiles.B, manifest.frameSpace.width, manifest.frameSpace.height);
        const metadata = draft.metadata;
        const plan = {
          mode: TWO_KEY_MODE,
          loop: metadata.loop !== false,
          settings: { ...metadata.timing },
          frames: cleanPlanFrames(metadata.plan),
        };
        const entry = makeRuntimeEntry({
          manifest,
          id: metadata.id,
          label: metadata.label,
          keyA: restoredA,
          keyB: restoredB,
          plan,
          recipe: metadata.recipe,
          importedAt: metadata.importedAt,
        });
        upsertLocalDraftAnimation(entry);
        buildAnimationPicker();
        latestAnimationId = entry.id;
        const requested = new URLSearchParams(window.location.search).get('animation');
        if (requested === entry.id) installEntry(entry, false);
      }
    }
  } catch (error) {
    announce('Two-Key local restore skipped: ' + String(error.message || error));
  }

  const active = getAnimation();
  if (active?.mode === TWO_KEY_MODE || active?.mode === LEGACY_TWO_KEY_MODE) {
    mode.value = TWO_KEY_MODE;
    panel.hidden = false;
    latestAnimationId = active.id;
    applySettings(active.twoKeySettings || {}, active.twoKeyRecipe || null);
  }

  return { mode, panel, buildPreview, entryFromParametricDocument };
}

export const installTwoKeySnap = installTwoKeyDeform;

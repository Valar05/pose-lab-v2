import { encodeGif } from './gif-encoder.js';
import { buildTwoKeyPlan, hardSnapPixels, alignTargetToFoot } from './two-key-snap.js';
import { buildStoredZip } from './zip-store.js';

function safeName(value) {
  return String(value || 'two-key').replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'two-key';
}
function numberValue(input, fallback, min = 0, max = 60000) {
  return Math.max(min, Math.min(max, Math.round(Number(input.value) || fallback)));
}
function blobUrl(blob) { return URL.createObjectURL(blob); }
function canvasBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not encode PNG frame.')), 'image/png'));
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
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = Math.round(image.naturalWidth * scale);
    const drawHeight = Math.round(image.naturalHeight * scale);
    const x = Math.round((width - drawWidth) / 2);
    const y = Math.round((height - drawHeight) / 2);
    context.clearRect(0, 0, width, height);
    context.drawImage(image, x, y, drawWidth, drawHeight);
    const blob = await canvasBlob(canvas);
    return {
      file,
      blob,
      rgba: context.getImageData(0, 0, width, height).data,
      sha256: await fileSha256(file),
      sourceWidth: image.naturalWidth,
      sourceHeight: image.naturalHeight,
      pixelExactAtFrameSize: image.naturalWidth === width && image.naturalHeight === height,
    };
  } finally {
    URL.revokeObjectURL(href);
  }
}
function rgbaBlob(rgba, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
  return canvasBlob(canvas);
}
async function frameBlob(frame) {
  const response = await fetch(frame.src);
  if (!response.ok) throw new Error('Could not read frame ' + frame.label);
  return response.blob();
}
async function blobDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
async function imageForFrame(frame) {
  const image = new Image();
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Could not load frame ' + frame.label));
  });
  image.src = frame.src;
  await loaded;
  return image;
}
function selectedFrames(animation, scope) {
  return scope === 'authored' ? animation.frames.filter((frame) => frame.frameType === 'authored') : [...animation.frames];
}
function frameFileName(frame, index) {
  return `${String(index).padStart(2, '0')}_${safeName(frame.label || 'frame')}_${frame.frameType || 'frame'}.png`;
}
function twoKeyContract(settings) {
  return [
    'authored endpoints sacred',
    'procedural bridge labeled',
    'hard-pixel snap, no ghost blend',
    settings.footAnchor ? 'procedural foot anchor on' : 'foot anchor off',
  ];
}

export function installTwoKeySnap({
  app,
  getManifest,
  getAnimation,
  setAnimation,
  openImporter,
  saveLocalDraft,
  upsertLocalDraftAnimation,
  buildAnimationPicker,
  announce,
}) {
  const consoleEl = app.querySelector('.sprite-console');
  const animationPicker = app.querySelector('[data-animation-picker]');
  if (!consoleEl || !animationPicker || consoleEl.querySelector('[data-animation-mode]')) return;

  const style = document.createElement('style');
  style.textContent = `
    .two-key-mode-row,.two-key-grid,.two-key-export-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .two-key-mode-row label,.two-key-panel label{display:grid;gap:4px;color:#b9c5cd;font-size:12px}
    .two-key-panel{display:grid;gap:12px;padding:12px;border:1px solid rgba(85,215,255,.25);border-radius:10px;background:#10171b}
    .two-key-panel[hidden]{display:none}
    .two-key-grid{align-items:end}
    .two-key-panel input[type="number"]{width:92px}
    .two-key-panel input[type="range"]{min-width:160px}
    .two-key-status{margin:0;color:#bfeeff;font-size:12px}
    .two-key-key{padding:8px;border:1px solid rgba(255,255,255,.12);border-radius:8px}
    .two-key-key strong{color:#f0c35a}
    .sprite-frame-strip button[data-frame-type="authored"]{border-color:#f0c35a}
    .sprite-frame-strip button[data-frame-type="procedural"]{border-color:#55d7ff}
    .sprite-frame-strip button[data-frame-type="procedural"] span{color:#8fe7ff}
  `;
  document.head.append(style);

  const modeRow = document.createElement('div');
  modeRow.className = 'two-key-mode-row';
  modeRow.innerHTML = `
    <label>Animation mode
      <select data-animation-mode>
        <option value="frame-sequence">Frame Sequence</option>
        <option value="two-key-snap">Two-Key Snap</option>
        <option value="contact-sheet-review">Contact Sheet Review</option>
      </select>
    </label>
  `;

  const panel = document.createElement('section');
  panel.className = 'two-key-panel';
  panel.dataset.twoKeyPanel = '';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="two-key-grid">
      <label class="two-key-key"><strong>Authored K0 / Key A</strong><input type="file" data-two-key-a aria-label="Choose authored Key A image"><span data-two-key-a-name>no file</span></label>
      <label class="two-key-key"><strong>Authored K3 / Key B</strong><input type="file" data-two-key-b aria-label="Choose authored Key B image"><span data-two-key-b-name>no file</span></label>
    </div>
    <div class="two-key-grid">
      <label>Hold A ms<input type="number" min="20" max="10000" value="500" data-two-key-hold-a></label>
      <label>A→B duration ms<input type="number" min="20" max="10000" value="240" data-two-key-ab></label>
      <label>Bridge steps<input type="number" min="0" max="24" value="3" data-two-key-steps></label>
      <label>Hold B ms<input type="number" min="20" max="10000" value="500" data-two-key-hold-b></label>
      <label>B→A duration ms<input type="number" min="20" max="10000" value="240" data-two-key-ba></label>
      <label>Easing<select data-two-key-easing><option value="ease-in-out">Ease in/out</option><option value="linear">Linear</option><option value="ease-in">Ease in</option><option value="ease-out">Ease out</option></select></label>
      <label>Snap strength <output data-two-key-snap-output>70</output><input type="range" min="0" max="100" step="1" value="70" data-two-key-snap></label>
      <label><span>Reverse / ping-pong</span><input type="checkbox" checked data-two-key-pingpong></label>
      <label><span>Foot anchor procedural frames</span><input type="checkbox" checked data-two-key-foot-anchor></label>
      <button type="button" data-two-key-build>Build / update preview</button>
    </div>
    <p class="two-key-status" data-two-key-status>Choose two endpoint images. K0 and K3 remain authored; every generated bridge frame is procedural.</p>
    <div class="two-key-export-row">
      <label>Export sequence<select data-two-key-export-scope><option value="full">Full sequence</option><option value="authored">Authored keys only</option></select></label>
      <button type="button" data-two-key-export-gif>Export GIF</button>
      <button type="button" data-two-key-export-png>Export PNG frames (.zip)</button>
      <button type="button" data-two-key-export-json>Export JSON</button>
    </div>
    <div class="two-key-export-row">
      <label>Contact sheet<select data-two-key-sheet-scope><option value="full">Full sequence</option><option value="authored">Authored keys only</option></select></label>
      <label><span>Labels</span><input type="checkbox" checked data-two-key-sheet-labels></label>
      <button type="button" data-two-key-export-sheet>Export contact sheet</button>
    </div>
    <label>Reload exported JSON<input type="file" data-two-key-json aria-label="Reload exported Two-Key JSON"></label>
  `;

  consoleEl.insertBefore(modeRow, animationPicker);
  consoleEl.insertBefore(panel, animationPicker.nextSibling);

  const q = (selector) => panel.querySelector(selector);
  const mode = modeRow.querySelector('[data-animation-mode]');
  const keyAInput = q('[data-two-key-a]');
  const keyBInput = q('[data-two-key-b]');
  const keyAName = q('[data-two-key-a-name]');
  const keyBName = q('[data-two-key-b-name]');
  const status = q('[data-two-key-status]');
  const holdA = q('[data-two-key-hold-a]');
  const bridgeAB = q('[data-two-key-ab]');
  const bridgeSteps = q('[data-two-key-steps]');
  const holdB = q('[data-two-key-hold-b]');
  const bridgeBA = q('[data-two-key-ba]');
  const easing = q('[data-two-key-easing]');
  const snap = q('[data-two-key-snap]');
  const snapOutput = q('[data-two-key-snap-output]');
  const pingPong = q('[data-two-key-pingpong]');
  const footAnchor = q('[data-two-key-foot-anchor]');
  const build = q('[data-two-key-build]');
  const exportScope = q('[data-two-key-export-scope]');
  const sheetScope = q('[data-two-key-sheet-scope]');
  const sheetLabels = q('[data-two-key-sheet-labels]');
  const jsonInput = q('[data-two-key-json]');

  let keyA = null;
  let keyB = null;
  let latestAnimationId = null;

  function currentTwoKey() {
    const active = getAnimation();
    if (active?.mode === 'two-key-snap') return active;
    const manifest = getManifest();
    return manifest?.animations?.find((entry) => entry.id === latestAnimationId) || null;
  }
  function setStatus(message) { status.textContent = message; }

  mode.addEventListener('change', () => {
    panel.hidden = mode.value !== 'two-key-snap';
    if (mode.value === 'contact-sheet-review') openImporter();
  });
  snap.addEventListener('input', () => { snapOutput.textContent = snap.value; });

  async function loadKey(input, role) {
    const file = input.files?.[0];
    if (!file) return null;
    const manifest = getManifest();
    const decoded = await decodeImageFile(file, manifest.frameSpace.width, manifest.frameSpace.height);
    if (role === 'A') { keyA = decoded; keyAName.textContent = file.name; }
    else { keyB = decoded; keyBName.textContent = file.name; }
    setStatus(`${role === 'A' ? 'K0' : 'K3'} loaded: ${file.name} · ${decoded.sourceWidth}×${decoded.sourceHeight}${decoded.pixelExactAtFrameSize ? ' · pixel-size exact' : ' · fit to 512 frame'}`);
    return decoded;
  }
  keyAInput.addEventListener('change', () => loadKey(keyAInput, 'A').catch((error) => setStatus(String(error.message || error))));
  keyBInput.addEventListener('change', () => loadKey(keyBInput, 'B').catch((error) => setStatus(String(error.message || error))));

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
      snapStrength: numberValue(snap, 70, 0, 100),
      footAnchor: footAnchor.checked,
    };
    const plan = buildTwoKeyPlan(settings);
    const frameBlobs = [];
    const frames = [];
    const aToB = settings.footAnchor ? alignTargetToFoot(keyA.rgba, keyB.rgba, width, height) : { rgba: keyB.rgba, dx:0, dy:0 };
    const bToA = settings.footAnchor ? alignTargetToFoot(keyB.rgba, keyA.rgba, width, height) : { rgba: keyA.rgba, dx:0, dy:0 };

    for (const descriptor of plan.frames) {
      let blob;
      if (descriptor.frameType === 'authored') {
        blob = descriptor.key === 'A' ? keyA.blob : keyB.blob;
      } else {
        const from = descriptor.from === 'A' ? keyA.rgba : keyB.rgba;
        const target = descriptor.to === 'B' ? aToB.rgba : bToA.rgba;
        blob = await rgbaBlob(hardSnapPixels(from, target, width, height, descriptor.progress), width, height);
      }
      frameBlobs.push(blob);
      frames.push({
        src: blobUrl(blob),
        durationMs: descriptor.durationMs,
        frameType: descriptor.frameType,
        label: descriptor.label,
        ...(descriptor.frameType === 'procedural' ? { progress: descriptor.progress, direction: `${descriptor.from}->${descriptor.to}` } : {}),
      });
    }

    const id = 'two-key-' + Date.now();
    const label = `Two-Key ${keyA.file.name.replace(/\.[^.]+$/, '')} → ${keyB.file.name.replace(/\.[^.]+$/, '')}`;
    const metadataFrames = frames.map(({ durationMs, frameType, label, progress, direction }) => ({ durationMs, frameType, label, progress, direction }));
    const metadata = {
      schema: 'pose-lab-v2-intelligent-sprite-import-v1',
      status: 'draft',
      id,
      label,
      mode: 'two-key-snap',
      loop: plan.loop,
      source: { name:keyA.file.name, size:keyA.file.size, type:keyA.file.type, kind:'two-key-key-a', width:keyA.sourceWidth, height:keyA.sourceHeight, sha256:keyA.sha256 },
      keyB: { name:keyB.file.name, size:keyB.file.size, type:keyB.file.type, width:keyB.sourceWidth, height:keyB.sourceHeight, sha256:keyB.sha256 },
      frameCount: frames.length,
      durationMs: frames[0]?.durationMs || 120,
      frameDurationsMs: frames.map((frame) => frame.durationMs),
      frames: metadataFrames,
      settings,
      export: { contactSheet:true, authoredOnlySheet:true },
      anchor: settings.footAnchor ? { ab:{dx:aToB.dx,dy:aToB.dy}, ba:{dx:bToA.dx,dy:bToA.dy} } : null,
      importedAt: new Date().toISOString(),
    };
    await saveLocalDraft(keyA.file, metadata, frameBlobs);
    const metadataUrl = blobUrl(new Blob([JSON.stringify(metadata, null, 2) + '\n'], { type:'application/json' }));
    const entry = {
      id,
      label,
      mode: 'two-key-snap',
      status: 'draft',
      imported: true,
      localDraft: true,
      loop: plan.loop,
      contactSheet: frames[0].src,
      sourceMetadata: metadataUrl,
      verifierReport: metadataUrl,
      groundGuideY: height - 1,
      contract: twoKeyContract(settings),
      frames,
      twoKeySettings: settings,
      endpointSources: { A:keyA.file.name, B:keyB.file.name },
    };
    upsertLocalDraftAnimation(entry);
    buildAnimationPicker();
    latestAnimationId = id;
    setAnimation(id, { speak:true });
    const authored = frames.filter((frame) => frame.frameType === 'authored').length;
    const procedural = frames.length - authored;
    setStatus(`Built ${frames.length} frames: ${authored} authored endpoints + ${procedural} procedural bridge frames. K0/K3 were not generated.`);
    return entry;
  }
  build.addEventListener('click', () => buildPreview().catch((error) => setStatus(String(error.message || error))));

  async function exportGif() {
    const animation = currentTwoKey();
    if (!animation) throw new Error('Build or reload a Two-Key animation first.');
    const frames = selectedFrames(animation, exportScope.value);
    const images = await Promise.all(frames.map(imageForFrame));
    const canvases = images.map((image) => {
      const canvas = document.createElement('canvas');
      canvas.width = getManifest().frameSpace.width;
      canvas.height = getManifest().frameSpace.height;
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas;
    });
    const gif = encodeGif(canvases, frames.map((frame) => frame.durationMs));
    downloadBlob(gif, safeName(animation.label) + '-' + exportScope.value + '.gif');
    setStatus('GIF download started from the exact preview frame sequence.');
  }

  async function exportPngZip() {
    const animation = currentTwoKey();
    if (!animation) throw new Error('Build or reload a Two-Key animation first.');
    const frames = selectedFrames(animation, exportScope.value);
    const entries = [];
    for (let index=0; index<frames.length; index += 1) {
      const blob = await frameBlob(frames[index]);
      entries.push({ name:frameFileName(frames[index], index), bytes:new Uint8Array(await blob.arrayBuffer()) });
    }
    const zip = buildStoredZip(entries);
    downloadBlob(new Blob([zip], { type:'application/zip' }), safeName(animation.label) + '-' + exportScope.value + '-png-frames.zip');
    setStatus(`PNG ZIP download started with ${frames.length} frames.`);
  }

  async function exportJson() {
    const animation = currentTwoKey();
    if (!animation) throw new Error('Build or reload a Two-Key animation first.');
    const frames = selectedFrames(animation, exportScope.value);
    const exportedFrames = [];
    for (let index=0; index<frames.length; index += 1) {
      const frame = frames[index];
      const blob = await frameBlob(frame);
      exportedFrames.push({
        src: frameFileName(frame,index),
        durationMs: frame.durationMs,
        frameType: frame.frameType,
        label: frame.label,
        dataUrl: await blobDataUrl(blob),
      });
    }
    const root = {
      schema:'pose-lab-v2-2d-animation-set-v1',
      frameSpace:{ ...getManifest().frameSpace },
      animations:[{
        id:animation.id,
        label:animation.label,
        mode:'two-key-snap',
        loop:animation.loop !== false,
        frames:exportedFrames,
        settings:animation.twoKeySettings || {},
        export:{ contactSheet:true, authoredOnlySheet:true },
      }],
    };
    downloadBlob(new Blob([JSON.stringify(root,null,2)+'\n'], { type:'application/json' }), safeName(animation.label) + '-' + exportScope.value + '.json');
    setStatus('Self-contained JSON download started. Reload it with the JSON file control below.');
  }

  async function exportSheet() {
    const animation = currentTwoKey();
    if (!animation) throw new Error('Build or reload a Two-Key animation first.');
    const frames = selectedFrames(animation, sheetScope.value);
    const images = await Promise.all(frames.map(imageForFrame));
    const cell = 220;
    const labelHeight = sheetLabels.checked ? 34 : 0;
    const columns = Math.min(4, frames.length);
    const rows = Math.ceil(frames.length / columns);
    const canvas = document.createElement('canvas');
    canvas.width = columns * cell;
    canvas.height = rows * (cell + labelHeight);
    const context = canvas.getContext('2d');
    context.fillStyle = '#15191c';
    context.fillRect(0,0,canvas.width,canvas.height);
    for (let index=0; index<frames.length; index += 1) {
      const col=index%columns, row=Math.floor(index/columns), x=col*cell, y=row*(cell+labelHeight);
      context.drawImage(images[index], x, y, cell, cell);
      if (sheetLabels.checked) {
        context.fillStyle = frames[index].frameType === 'authored' ? '#f0c35a' : '#55d7ff';
        context.fillRect(x,y+cell,cell,labelHeight);
        context.fillStyle='#071013';
        context.font='bold 15px system-ui';
        context.fillText(`${frames[index].label} · ${frames[index].frameType}`, x+8, y+cell+22);
      }
    }
    const blob = await canvasBlob(canvas);
    downloadBlob(blob, safeName(animation.label) + '-' + sheetScope.value + '-' + (sheetLabels.checked?'labeled':'unlabeled') + '-contact-sheet.png');
    setStatus('Contact sheet download started.');
  }

  q('[data-two-key-export-gif]').addEventListener('click', () => exportGif().catch((error) => setStatus(String(error.message || error))));
  q('[data-two-key-export-png]').addEventListener('click', () => exportPngZip().catch((error) => setStatus(String(error.message || error))));
  q('[data-two-key-export-json]').addEventListener('click', () => exportJson().catch((error) => setStatus(String(error.message || error))));
  q('[data-two-key-export-sheet]').addEventListener('click', () => exportSheet().catch((error) => setStatus(String(error.message || error))));

  jsonInput.addEventListener('change', async () => {
    try {
      const file = jsonInput.files?.[0];
      if (!file) return;
      const root = JSON.parse(await file.text());
      if (root.schema !== 'pose-lab-v2-2d-animation-set-v1') throw new Error('Unsupported JSON schema.');
      const source = root.animations?.[0];
      if (!source || source.mode !== 'two-key-snap' || !Array.isArray(source.frames) || source.frames.length < 2) throw new Error('JSON does not contain a Two-Key Snap animation.');
      const frames = [];
      for (const frame of source.frames) {
        if (!frame.dataUrl) throw new Error('JSON frame is missing embedded PNG data.');
        const blob = await (await fetch(frame.dataUrl)).blob();
        frames.push({ src:blobUrl(blob), durationMs:frame.durationMs, frameType:frame.frameType, label:frame.label });
      }
      const entry = {
        id:'two-key-json-' + Date.now(),
        label:source.label || file.name.replace(/\.[^.]+$/,''),
        mode:'two-key-snap',
        status:'draft',
        imported:true,
        localDraft:true,
        loop:source.loop !== false,
        contactSheet:frames[0].src,
        sourceMetadata:blobUrl(new Blob([JSON.stringify(root,null,2)],{type:'application/json'})),
        verifierReport:frames[0].src,
        groundGuideY:getManifest().frameSpace.height - 1,
        contract:twoKeyContract(source.settings || {}),
        frames,
        twoKeySettings:source.settings || {},
      };
      upsertLocalDraftAnimation(entry);
      buildAnimationPicker();
      latestAnimationId=entry.id;
      mode.value='two-key-snap';
      panel.hidden=false;
      setAnimation(entry.id,{speak:true});
      setStatus(`Reloaded ${frames.length} frames from exported JSON.`);
    } catch (error) {
      setStatus(String(error.message || error));
    }
  });

  return { mode, panel, buildPreview };
}

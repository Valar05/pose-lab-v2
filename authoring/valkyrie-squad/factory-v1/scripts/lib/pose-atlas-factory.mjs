import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

export const FACTORY_SCHEMA = 'sparse-sprite-character-factory-v1';
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

export async function readFactorySpec(root, relativePath) {
  const spec = JSON.parse(await readFile(path.resolve(root, relativePath), 'utf8'));
  return validateFactorySpec(spec);
}

export function validateFactorySpec(spec) {
  if (spec.schema !== FACTORY_SCHEMA) throw new Error(`unsupported factory schema: ${spec.schema}`);
  if (!spec.character || !spec.sourceRoot) throw new Error('factory character and sourceRoot are required');
  const { atlas, sources, poses, recipes } = spec;
  if (!atlas || !Number.isInteger(atlas.cellSize) || atlas.cellSize < 16) throw new Error('invalid atlas cellSize');
  if (!Number.isInteger(atlas.columns) || !Number.isInteger(atlas.rows) || atlas.columns * atlas.rows < poses.length) throw new Error('atlas grid cannot contain every pose');
  if (!Number.isInteger(atlas.paletteColors) || atlas.paletteColors < 2 || atlas.paletteColors > 256) throw new Error('paletteColors must be 2..256');
  if (!sources || !poses?.length || !recipes || !Object.keys(recipes).length) throw new Error('sources, poses, and recipes are required');
  const ids = poses.map((pose) => pose.id);
  if (new Set(ids).size !== ids.length) throw new Error('pose IDs must be unique');
  for (const [name, source] of Object.entries(sources)) if (!source.file || !/^[a-f0-9]{64}$/.test(source.sha256)) throw new Error(`source ${name} lacks a bound SHA-256`);
  for (const pose of poses) {
    if (!sources[pose.source]) throw new Error(`pose ${pose.id} references unknown source ${pose.source}`);
    if (!pose.semanticSourceId) throw new Error(`pose ${pose.id} lacks semanticSourceId`);
    if (pose.kind === 'sheet-cell') {
      if (![pose.cell, pose.sheetColumns, pose.sourceCellSize, pose.sourceHeight].every(Number.isInteger)) throw new Error(`pose ${pose.id} has incomplete sheet-cell geometry`);
      if (pose.alpha !== 'border-connected-near-black-24') throw new Error(`pose ${pose.id} uses an unapproved alpha policy`);
    } else if (pose.kind === 'normalized-crop') {
      if (pose.rect?.length !== 4 || pose.pivot?.length !== 2 || pose.targetPivot?.length !== 2 || pose.canvas?.length !== 2) throw new Error(`pose ${pose.id} has incomplete normalized-crop geometry`);
    } else if (pose.kind === 'sheet-rect') {
      if (pose.rect?.length !== 4 || pose.alpha !== 'preserved-rgba' || pose.fit !== 'contain' || pose.anchor !== 'bottom-center') throw new Error(`pose ${pose.id} has incomplete sheet-rect geometry`);
    } else if (pose.kind === 'whole-image') {
      if (pose.fit !== 'contain' || pose.anchor !== 'bottom-center' || pose.trim !== true) throw new Error(`pose ${pose.id} has incomplete whole-image geometry`);
    } else throw new Error(`pose ${pose.id} has unsupported kind ${pose.kind}`);
  }
  for (const [animation, poseIds] of Object.entries(recipes)) {
    if (!poseIds.length) throw new Error(`animation ${animation} has no semantic poses`);
    for (const id of poseIds) if (!ids.includes(id)) throw new Error(`animation ${animation} references missing pose ${id}`);
  }
  return spec;
}

function transparentEdgeBlack(data, width, height) {
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const nearBlack = (i) => data[i * 4] < 24 && data[i * 4 + 1] < 24 && data[i * 4 + 2] < 24;
  const add = (x, y) => { const i = y * width + x; if (!seen[i] && nearBlack(i)) { seen[i] = 1; queue[tail++] = i; } };
  for (let x = 0; x < width; x++) { add(x, 0); add(x, height - 1); }
  for (let y = 0; y < height; y++) { add(0, y); add(width - 1, y); }
  while (head < tail) {
    const i = queue[head++], x = i % width, y = Math.floor(i / width);
    data[i * 4 + 3] = 0;
    if (x) add(x - 1, y); if (x + 1 < width) add(x + 1, y); if (y) add(x, y - 1); if (y + 1 < height) add(x, y + 1);
  }
  return data;
}

async function loadRgba(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: Buffer.from(data), width: info.width, height: info.height };
}

async function renderPose(root, spec, pose, rgbaCache) {
  const sourceFile = path.join(root, spec.sourceRoot, spec.sources[pose.source].file);
  if (pose.kind === 'whole-image') {
    const trimmed = sharp(sourceFile).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } });
    const metadata = await trimmed.metadata();
    return {
      image: trimmed,
      sourceHeight: metadata.height,
      normalizedCanvas: [metadata.width, metadata.height],
      pivot: [Math.round(metadata.width / 2), metadata.height],
      fitCell: true,
    };
  }
  if (pose.kind === 'sheet-cell') {
    let sheet = rgbaCache.get(sourceFile);
    if (!sheet) { sheet = await loadRgba(sourceFile); rgbaCache.set(sourceFile, sheet); }
    const left = (pose.cell % pose.sheetColumns) * pose.sourceCellSize;
    const top = Math.floor(pose.cell / pose.sheetColumns) * pose.sourceCellSize;
    if (left + pose.sourceCellSize > sheet.width || top + pose.sourceHeight > sheet.height) throw new Error(`pose ${pose.id} crop leaves source bounds`);
    const raw = Buffer.alloc(pose.sourceCellSize * pose.sourceHeight * 4);
    for (let y = 0; y < pose.sourceHeight; y++) sheet.data.copy(raw, y * pose.sourceCellSize * 4, ((top + y) * sheet.width + left) * 4, ((top + y) * sheet.width + left + pose.sourceCellSize) * 4);
    transparentEdgeBlack(raw, pose.sourceCellSize, pose.sourceHeight);
    return { image: sharp(raw, { raw: { width: pose.sourceCellSize, height: pose.sourceHeight, channels: 4 } }), sourceHeight: pose.sourceHeight, normalizedCanvas: [pose.sourceCellSize, pose.sourceHeight], pivot: null };
  }
  if (pose.kind === 'sheet-rect') {
    const [left, top, width, height] = pose.rect;
    const image = sharp(sourceFile).extract({ left, top, width, height });
    return { image, sourceHeight: height, normalizedCanvas: [width, height], pivot: [Math.round(width / 2), height], fitCell: true };
  }
  const [left, top, width, height] = pose.rect;
  const [canvasWidth, canvasHeight] = pose.canvas;
  const virtualLeft = Math.round(pose.targetPivot[0] - pose.pivot[0]);
  const virtualTop = Math.round(pose.targetPivot[1] - pose.pivot[1]);
  const crop = await sharp(sourceFile).extract({ left, top, width, height }).png().toBuffer();
  const normalized = await sharp({ create: { width: canvasWidth, height: canvasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: crop, left: virtualLeft, top: virtualTop }]).png().toBuffer();
  return { image: sharp(normalized), sourceHeight: canvasHeight, normalizedCanvas: pose.canvas, pivot: pose.targetPivot };
}

export async function buildPoseAtlas({ root, spec }) {
  validateFactorySpec(spec);
  const sourceEntries = Object.entries(spec.sources);
  for (const [name, source] of sourceEntries) {
    const got = sha256(await readFile(path.join(root, spec.sourceRoot, source.file)));
    if (got !== source.sha256) throw new Error(`source master changed: ${name}/${source.file} ${got}`);
  }
  const rgbaCache = new Map(), rendered = [], cellBuffers = [];
  for (const pose of spec.poses) {
    const result = await renderPose(root, spec, pose, rgbaCache);
    rendered.push(result);
    if (result.fitCell) {
      cellBuffers.push(await result.image.resize(spec.atlas.cellSize, spec.atlas.cellSize, {
        fit: 'contain',
        position: 'south',
        kernel: sharp.kernel.lanczos3,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      }).png().toBuffer());
    } else {
      const contentHeight = Math.round(spec.atlas.cellSize * result.sourceHeight / result.normalizedCanvas[0]);
      const resized = await result.image.resize(spec.atlas.cellSize, contentHeight, { fit: 'fill', kernel: sharp.kernel.lanczos3 }).png().toBuffer();
      cellBuffers.push(await sharp({ create: { width: spec.atlas.cellSize, height: spec.atlas.cellSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: resized, left: 0, top: 0 }]).png().toBuffer());
    }
  }
  const atlas = sharp({ create: { width: spec.atlas.columns * spec.atlas.cellSize, height: spec.atlas.rows * spec.atlas.cellSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const composites = cellBuffers.map((input, index) => ({ input, left: (index % spec.atlas.columns) * spec.atlas.cellSize, top: Math.floor(index / spec.atlas.columns) * spec.atlas.cellSize }));
  const atlasBytes = await atlas.composite(composites).png({ palette: true, colours: spec.atlas.paletteColors, quality: 100, effort: 10, dither: 0.65 }).toBuffer();
  if (atlasBytes.length >= spec.atlas.targetBytes) throw new Error(`pose atlas exceeds target: ${atlasBytes.length}`);
  const atlasPath = path.resolve(root, spec.atlas.output), manifestPath = path.resolve(root, spec.atlas.manifest);
  await mkdir(path.dirname(atlasPath), { recursive: true });
  const manifest = {
    schema: spec.atlas.manifestSchema,
    cellSize: [spec.atlas.cellSize, spec.atlas.cellSize],
    grid: [spec.atlas.columns, spec.atlas.rows],
    poseCount: spec.poses.length,
    animationFramesBaked: false,
    runtimeMotion: 'procedural',
    atlas: { file: path.basename(atlasPath), sha256: sha256(atlasBytes), bytes: atlasBytes.length, indexedPng: true, paletteColors: spec.atlas.paletteColors, targetBytes: spec.atlas.targetBytes },
    sources: sourceEntries.map(([, source]) => ({ file: `${spec.sourceRoot}/${source.file}`, sha256: source.sha256, deployment: false })),
    poses: spec.poses.map((pose, index) => ({ id: pose.id, semanticSourceId: pose.semanticSourceId, rect: [(index % spec.atlas.columns) * spec.atlas.cellSize, Math.floor(index / spec.atlas.columns) * spec.atlas.cellSize, spec.atlas.cellSize, spec.atlas.cellSize], contentHeight: rendered[index].fitCell ? spec.atlas.cellSize : Math.round(spec.atlas.cellSize * rendered[index].sourceHeight / rendered[index].normalizedCanvas[0]), normalizedCanvas: rendered[index].normalizedCanvas, pivot: rendered[index].pivot })),
    recipes: spec.recipes
  };
  await writeFile(atlasPath, atlasBytes);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { atlasPath, manifestPath, manifest };
}

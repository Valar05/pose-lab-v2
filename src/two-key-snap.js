export const TWO_KEY_MODE = 'two-key-deform';
export const LEGACY_TWO_KEY_MODE = 'two-key-snap';

export function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function easedProgress(value, easing = 'ease-in-out') {
  const t = clamp01(value);
  if (easing === 'linear') return t;
  if (easing === 'ease-in') return t * t;
  if (easing === 'ease-out') return 1 - ((1 - t) * (1 - t));
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

export function shapedProgress(value, strength = 70) {
  const t = clamp01(value);
  const s = Math.max(0, Math.min(100, Number(strength) || 0)) / 100;
  if (s === 0 || t === 0 || t === 1) return t;
  const exponent = 1 + 3 * s;
  if (t < 0.5) return 0.5 * ((t * 2) ** exponent);
  return 1 - 0.5 * (((1 - t) * 2) ** exponent);
}

function bridgeDuration(totalMs, steps) {
  return Math.max(20, Math.round(Math.max(20, Number(totalMs) || 20) / Math.max(1, steps)));
}

export function buildTwoKeyPlan(options = {}) {
  const holdA = Math.max(20, Math.round(Number(options.holdA) || 500));
  const holdB = Math.max(20, Math.round(Number(options.holdB) || 500));
  const bridgeAB = Math.max(20, Math.round(Number(options.bridgeAB) || 240));
  const bridgeBA = Math.max(20, Math.round(Number(options.bridgeBA) || 240));
  const bridgeSteps = Math.max(0, Math.min(24, Math.round(Number(options.bridgeSteps) || 3)));
  const pingPong = options.pingPong !== false;
  const easing = options.easing || 'ease-in-out';
  const deformStrength = Math.max(0, Math.min(100, Number(options.deformStrength ?? options.snapStrength) || 70));
  const frames = [{ frameType: 'authored', key: 'A', label: 'Key A', durationMs: holdA, progress: 0 }];

  if (bridgeSteps) {
    for (let index = 1; index <= bridgeSteps; index += 1) {
      const raw = index / (bridgeSteps + 1);
      frames.push({
        frameType: 'procedural',
        from: 'A',
        to: 'B',
        label: 'A→B bridge ' + index,
        durationMs: bridgeDuration(bridgeAB, bridgeSteps),
        rawProgress: raw,
        progress: shapedProgress(easedProgress(raw, easing), deformStrength),
      });
    }
  }

  frames.push({ frameType: 'authored', key: 'B', label: 'Key B', durationMs: holdB, progress: 1 });

  if (pingPong && bridgeSteps) {
    for (let index = 1; index <= bridgeSteps; index += 1) {
      const raw = index / (bridgeSteps + 1);
      frames.push({
        frameType: 'procedural',
        from: 'B',
        to: 'A',
        label: 'B→A bridge ' + index,
        durationMs: bridgeDuration(bridgeBA, bridgeSteps),
        rawProgress: raw,
        progress: shapedProgress(easedProgress(raw, easing), deformStrength),
      });
    }
  }

  return {
    mode: TWO_KEY_MODE,
    loop: pingPong,
    settings: { holdA, holdB, bridgeAB, bridgeBA, bridgeSteps, pingPong, easing, deformStrength },
    frames,
  };
}

function normalizeMask(mask, width, height) {
  const x = Math.max(0, Math.min(width - 1, Math.round(Number(mask?.x) || 0)));
  const y = Math.max(0, Math.min(height - 1, Math.round(Number(mask?.y) || 0)));
  const right = Math.max(x, Math.min(width - 1, Math.round(Number(mask?.x ?? 0) + Math.max(1, Number(mask?.width) || width) - 1)));
  const bottom = Math.max(y, Math.min(height - 1, Math.round(Number(mask?.y ?? 0) + Math.max(1, Number(mask?.height) || height) - 1)));
  return { x, y, width: right - x + 1, height: bottom - y + 1 };
}

export function estimateAlphaMask(rgba, width, height, alphaThreshold = 24, padding = 0) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] <= alphaThreshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) return { x: 0, y: 0, width, height, source: 'fallback-frame' };
  const p = Math.max(0, Math.round(Number(padding) || 0));
  minX = Math.max(0, minX - p);
  minY = Math.max(0, minY - p);
  maxX = Math.min(width - 1, maxX + p);
  maxY = Math.min(height - 1, maxY + p);
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, source: 'alpha-subject' };
}

function rowSpan(rgba, width, y, mask, alphaThreshold) {
  if (y < mask.y || y >= mask.y + mask.height) return null;
  let minX = width;
  let maxX = -1;
  const left = mask.x;
  const right = Math.min(width - 1, mask.x + mask.width - 1);
  for (let x = left; x <= right; x += 1) {
    if (rgba[(y * width + x) * 4 + 3] <= alphaThreshold) continue;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }
  return maxX >= minX ? { minX, maxX } : null;
}

function nearestSpan(rgba, width, height, y, mask, alphaThreshold) {
  const yy = Math.max(mask.y, Math.min(mask.y + mask.height - 1, Math.round(y)));
  const direct = rowSpan(rgba, width, yy, mask, alphaThreshold);
  if (direct) return direct;
  for (let delta = 1; delta < mask.height; delta += 1) {
    const above = yy - delta;
    if (above >= mask.y) {
      const found = rowSpan(rgba, width, above, mask, alphaThreshold);
      if (found) return found;
    }
    const below = yy + delta;
    if (below < mask.y + mask.height && below < height) {
      const found = rowSpan(rgba, width, below, mask, alphaThreshold);
      if (found) return found;
    }
  }
  return { minX: mask.x, maxX: mask.x + mask.width - 1 };
}

export function estimateFootAnchor(rgba, width, height, alphaThreshold = 24, suppliedMask = null) {
  const mask = normalizeMask(suppliedMask || estimateAlphaMask(rgba, width, height, alphaThreshold), width, height);
  let maxY = -1;
  for (let y = Math.min(height - 1, mask.y + mask.height - 1); y >= mask.y && maxY < 0; y -= 1) {
    const span = rowSpan(rgba, width, y, mask, alphaThreshold);
    if (span) maxY = y;
  }
  if (maxY < 0) return { x: mask.x + (mask.width - 1) / 2, y: mask.y + mask.height - 1, source: 'mask-bottom' };
  let sumX = 0;
  let count = 0;
  const minY = Math.max(mask.y, maxY - 4);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = mask.x; x < mask.x + mask.width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] > alphaThreshold) {
        sumX += x;
        count += 1;
      }
    }
  }
  return { x: count ? sumX / count : mask.x + (mask.width - 1) / 2, y: maxY, source: 'alpha-foot' };
}

export function deriveDeformationRecipe(keyA, keyB, width, height, options = {}) {
  const alphaThreshold = Math.max(0, Math.min(255, Math.round(Number(options.alphaThreshold) || 24)));
  const maskPaddingPx = Math.max(0, Math.min(64, Math.round(Number(options.maskPaddingPx) || 2)));
  const anchorBandPx = Math.max(1, Math.min(96, Math.round(Number(options.anchorBandPx) || 12)));
  const masks = {
    A: normalizeMask(options.masks?.A || estimateAlphaMask(keyA, width, height, alphaThreshold, maskPaddingPx), width, height),
    B: normalizeMask(options.masks?.B || estimateAlphaMask(keyB, width, height, alphaThreshold, maskPaddingPx), width, height),
  };
  const anchors = {
    A: options.anchors?.A || estimateFootAnchor(keyA, width, height, alphaThreshold, masks.A),
    B: options.anchors?.B || estimateFootAnchor(keyB, width, height, alphaThreshold, masks.B),
  };
  return {
    schema: 'pose-lab-v2-deformation-recipe-v1',
    method: 'anchored-silhouette-row-warp-v1',
    plantedFeet: options.plantedFeet !== false,
    alphaThreshold,
    maskPaddingPx,
    anchorBandPx,
    masks,
    anchors,
  };
}

function copyPixel(source, sourceOffset, target, targetOffset) {
  target[targetOffset] = source[sourceOffset];
  target[targetOffset + 1] = source[sourceOffset + 1];
  target[targetOffset + 2] = source[sourceOffset + 2];
  target[targetOffset + 3] = source[sourceOffset + 3];
}

function clearRectPixels(output, width, height, mask) {
  const right = Math.min(width, mask.x + mask.width);
  const bottom = Math.min(height, mask.y + mask.height);
  for (let y = mask.y; y < bottom; y += 1) {
    output.fill(0, (y * width + mask.x) * 4, (y * width + right) * 4);
  }
}

function copyAnchorBand(source, output, width, height, sourceMask, anchor, bandPx) {
  const top = Math.max(sourceMask.y, Math.round(anchor.y) - bandPx + 1);
  const bottom = Math.min(height - 1, sourceMask.y + sourceMask.height - 1);
  const left = Math.max(0, sourceMask.x);
  const right = Math.min(width - 1, sourceMask.x + sourceMask.width - 1);
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const offset = (y * width + x) * 4;
      copyPixel(source, offset, output, offset);
    }
  }
}

export function deformRgbaBySilhouette(sourceRgba, guideRgba, width, height, progress, recipe, direction = 'A->B') {
  if (sourceRgba.length !== guideRgba.length || sourceRgba.length !== width * height * 4) {
    throw new Error('two-key RGBA buffers must have identical frame dimensions');
  }
  const t = clamp01(progress);
  if (t <= 0) return new Uint8ClampedArray(sourceRgba);

  const sourceKey = direction === 'B->A' ? 'B' : 'A';
  const guideKey = sourceKey === 'A' ? 'B' : 'A';
  const sourceMask = normalizeMask(recipe.masks[sourceKey], width, height);
  const guideMask = normalizeMask(recipe.masks[guideKey], width, height);
  const sourceAnchor = recipe.anchors[sourceKey];
  const guideAnchor = recipe.anchors[guideKey];
  const alphaThreshold = recipe.alphaThreshold ?? 24;
  const alignDx = recipe.plantedFeet ? sourceAnchor.x - guideAnchor.x : 0;
  const alignDy = recipe.plantedFeet ? sourceAnchor.y - guideAnchor.y : 0;
  const targetMask = {
    x: guideMask.x + alignDx,
    y: guideMask.y + alignDy,
    width: guideMask.width,
    height: guideMask.height,
  };

  const output = new Uint8ClampedArray(sourceRgba);
  clearRectPixels(output, width, height, sourceMask);
  const interpTop = sourceMask.y + (targetMask.y - sourceMask.y) * t;
  const interpBottom = (sourceMask.y + sourceMask.height - 1)
    + ((targetMask.y + targetMask.height - 1) - (sourceMask.y + sourceMask.height - 1)) * t;
  const top = Math.max(0, Math.floor(Math.min(interpTop, interpBottom)));
  const bottom = Math.min(height - 1, Math.ceil(Math.max(interpTop, interpBottom)));
  const denomY = Math.max(1, interpBottom - interpTop);

  for (let y = top; y <= bottom; y += 1) {
    const v = clamp01((y - interpTop) / denomY);
    const sourceY = sourceMask.y + v * Math.max(0, sourceMask.height - 1);
    const guideY = guideMask.y + v * Math.max(0, guideMask.height - 1);
    const sourceSpan = nearestSpan(sourceRgba, width, height, sourceY, sourceMask, alphaThreshold);
    const guideSpan = nearestSpan(guideRgba, width, height, guideY, guideMask, alphaThreshold);
    const targetLeft = guideSpan.minX + alignDx;
    const targetRight = guideSpan.maxX + alignDx;
    const left = sourceSpan.minX + (targetLeft - sourceSpan.minX) * t;
    const right = sourceSpan.maxX + (targetRight - sourceSpan.maxX) * t;
    const x0 = Math.max(0, Math.floor(Math.min(left, right)));
    const x1 = Math.min(width - 1, Math.ceil(Math.max(left, right)));
    const denomX = Math.max(1, right - left);
    const sy = Math.max(0, Math.min(height - 1, Math.round(sourceY)));

    for (let x = x0; x <= x1; x += 1) {
      const u = clamp01((x - left) / denomX);
      const sx = Math.max(0, Math.min(width - 1, Math.round(sourceSpan.minX + u * (sourceSpan.maxX - sourceSpan.minX))));
      const sourceOffset = (sy * width + sx) * 4;
      const targetOffset = (y * width + x) * 4;
      copyPixel(sourceRgba, sourceOffset, output, targetOffset);
    }
  }

  if (recipe.plantedFeet) {
    copyAnchorBand(sourceRgba, output, width, height, sourceMask, sourceAnchor, recipe.anchorBandPx ?? 12);
  }
  return output;
}

export function renderTwoKeyFrameRgba(descriptor, endpoints, width, height, recipe) {
  if (descriptor.frameType === 'authored') {
    const source = descriptor.key === 'B' ? endpoints.B : endpoints.A;
    return new Uint8ClampedArray(source);
  }
  const reverse = descriptor.from === 'B';
  const source = reverse ? endpoints.B : endpoints.A;
  const guide = reverse ? endpoints.A : endpoints.B;
  return deformRgbaBySilhouette(source, guide, width, height, descriptor.progress, recipe, reverse ? 'B->A' : 'A->B');
}

export function validateParametricDocument(document) {
  if (!document || document.schema !== 'pose-lab-v2-two-key-parametric-v1') throw new Error('Unsupported Two-Key parametric schema.');
  if (document.mode !== TWO_KEY_MODE && document.mode !== LEGACY_TWO_KEY_MODE) throw new Error('Not a Two-Key Deform document.');
  if (!document.endpoints?.A?.dataUrl || !document.endpoints?.B?.dataUrl) throw new Error('Parametric document is missing authored endpoint data.');
  if (!document.recipe || document.recipe.schema !== 'pose-lab-v2-deformation-recipe-v1') throw new Error('Parametric document is missing its deformation recipe.');
  if (!Array.isArray(document.plan) || document.plan.length < 2) throw new Error('Parametric document is missing its timing plan.');
  if (document.plan.some((frame) => frame.frameType === 'procedural' && ('dataUrl' in frame || 'src' in frame))) {
    throw new Error('Procedural bridge frames must not be stored in native parametric JSON.');
  }
  return document;
}

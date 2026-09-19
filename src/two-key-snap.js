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

export function snappedProgress(value, strength = 70) {
  const t = clamp01(value);
  const s = Math.max(0, Math.min(100, Number(strength) || 0)) / 100;
  if (s === 0 || t === 0 || t === 1) return t;
  const exponent = 1 + 5 * s;
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
  const snapStrength = Math.max(0, Math.min(100, Number(options.snapStrength) || 70));
  const frames = [{ frameType: 'authored', key: 'A', label: 'K0', durationMs: holdA, progress: 0 }];

  if (bridgeSteps) {
    for (let index = 1; index <= bridgeSteps; index += 1) {
      const raw = index / (bridgeSteps + 1);
      frames.push({
        frameType: 'procedural',
        from: 'A',
        to: 'B',
        label: `A→B ${index}`,
        durationMs: bridgeDuration(bridgeAB, bridgeSteps),
        progress: snappedProgress(easedProgress(raw, easing), snapStrength),
      });
    }
  }

  frames.push({ frameType: 'authored', key: 'B', label: 'K3', durationMs: holdB, progress: 1 });

  if (pingPong && bridgeSteps) {
    for (let index = 1; index <= bridgeSteps; index += 1) {
      const raw = index / (bridgeSteps + 1);
      frames.push({
        frameType: 'procedural',
        from: 'B',
        to: 'A',
        label: `B→A ${index}`,
        durationMs: bridgeDuration(bridgeBA, bridgeSteps),
        progress: snappedProgress(easedProgress(raw, easing), snapStrength),
      });
    }
  }

  return {
    mode: 'two-key-snap',
    loop: pingPong,
    settings: { holdA, holdB, bridgeAB, bridgeBA, bridgeSteps, pingPong, easing, snapStrength },
    frames,
  };
}

const BAYER_8 = [
  0,48,12,60,3,51,15,63,
  32,16,44,28,35,19,47,31,
  8,56,4,52,11,59,7,55,
  40,24,36,20,43,27,39,23,
  2,50,14,62,1,49,13,61,
  34,18,46,30,33,17,45,29,
  10,58,6,54,9,57,5,53,
  42,26,38,22,41,25,37,21,
];

export function hardSnapPixels(fromRgba, toRgba, width, height, progress) {
  if (fromRgba.length !== toRgba.length || fromRgba.length !== width * height * 4) {
    throw new Error('two-key RGBA buffers must have identical dimensions');
  }
  const t = clamp01(progress);
  if (t <= 0) return new Uint8ClampedArray(fromRgba);
  if (t >= 1) return new Uint8ClampedArray(toRgba);
  const output = new Uint8ClampedArray(fromRgba.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const threshold = (BAYER_8[(y % 8) * 8 + (x % 8)] + 0.5) / 64;
      const source = threshold <= t ? toRgba : fromRgba;
      output[offset] = source[offset];
      output[offset + 1] = source[offset + 1];
      output[offset + 2] = source[offset + 2];
      output[offset + 3] = source[offset + 3];
    }
  }
  return output;
}

export function estimateFootAnchor(rgba, width, height, alphaThreshold = 24) {
  let maxY = -1;
  for (let y = height - 1; y >= 0 && maxY < 0; y -= 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] > alphaThreshold) { maxY = y; break; }
    }
  }
  if (maxY < 0) return { x: (width - 1) / 2, y: height - 1 };
  let sumX = 0;
  let count = 0;
  const minY = Math.max(0, maxY - 4);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] > alphaThreshold) { sumX += x; count += 1; }
    }
  }
  return { x: count ? sumX / count : (width - 1) / 2, y: maxY };
}

export function translateRgba(rgba, width, height, dx, dy) {
  const output = new Uint8ClampedArray(rgba.length);
  const ix = Math.round(dx);
  const iy = Math.round(dy);
  for (let y = 0; y < height; y += 1) {
    const sy = y - iy;
    if (sy < 0 || sy >= height) continue;
    for (let x = 0; x < width; x += 1) {
      const sx = x - ix;
      if (sx < 0 || sx >= width) continue;
      const out = (y * width + x) * 4;
      const src = (sy * width + sx) * 4;
      output[out] = rgba[src];
      output[out + 1] = rgba[src + 1];
      output[out + 2] = rgba[src + 2];
      output[out + 3] = rgba[src + 3];
    }
  }
  return output;
}

export function alignTargetToFoot(sourceRgba, targetRgba, width, height) {
  const source = estimateFootAnchor(sourceRgba, width, height);
  const target = estimateFootAnchor(targetRgba, width, height);
  const dx = Math.round(source.x - target.x);
  const dy = Math.round(source.y - target.y);
  return { rgba: translateRgba(targetRgba, width, height, dx, dy), dx, dy, sourceAnchor: source, targetAnchor: target };
}

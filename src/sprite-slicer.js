const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function dominantBorderColor(data, width, height) {
  const counts = new Map();
  const samples = [];
  const add = (x, y) => {
    const offset = (y * width + x) * 4;
    const alpha = data[offset + 3];
    if (alpha < 32) return;
    const key = [data[offset] >> 4, data[offset + 1] >> 4, data[offset + 2] >> 4].join(',');
    counts.set(key, (counts.get(key) || 0) + 1);
    samples.push([key, data[offset], data[offset + 1], data[offset + 2]]);
  };
  const stepX = Math.max(1, Math.floor(width / 256));
  const stepY = Math.max(1, Math.floor(height / 256));
  for (let x = 0; x < width; x += stepX) { add(x, 0); add(x, height - 1); }
  for (let y = 0; y < height; y += stepY) { add(0, y); add(width - 1, y); }
  let winner = null, winnerCount = 0;
  for (const [key, count] of counts) if (count > winnerCount) { winner = key; winnerCount = count; }
  if (!winner) return null;
  let r = 0, g = 0, b = 0, count = 0;
  for (const sample of samples) if (sample[0] === winner) { r += sample[1]; g += sample[2]; b += sample[3]; count += 1; }
  return [r / count, g / count, b / count];
}

function projectionRuns(values, threshold, maxGap) {
  const runs = [];
  let start = -1, lastActive = -1;
  for (let index = 0; index < values.length; index += 1) {
    if (values[index] >= threshold) { if (start < 0) start = index; lastActive = index; }
    else if (start >= 0 && index - lastActive > maxGap) { runs.push([start, lastActive + 1]); start = -1; lastActive = -1; }
  }
  if (start >= 0) runs.push([start, lastActive + 1]);
  return runs;
}

export function detectFrameBoxes({ data, width, height }, options = {}) {
  if (!data || data.length !== width * height * 4 || width < 2 || height < 2) throw new Error('detectFrameBoxes requires RGBA pixel data');
  const background = dominantBorderColor(data, width, height);
  const colorThreshold = options.colorThreshold ?? 34;
  const alphaThreshold = options.alphaThreshold ?? 24;
  const mask = new Uint8Array(width * height);
  const columns = new Uint32Array(width), centralColumns = new Uint32Array(width), rows = new Uint32Array(height);
  const centralTop = Math.floor(height * 0.08), centralBottom = Math.ceil(height * 0.90);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const offset = (y * width + x) * 4, alpha = data[offset + 3];
    let foreground = alpha >= alphaThreshold;
    if (foreground && background) {
      const dr = data[offset] - background[0], dg = data[offset + 1] - background[1], db = data[offset + 2] - background[2];
      foreground = Math.sqrt(dr * dr + dg * dg + db * db) >= colorThreshold;
    }
    if (foreground) { mask[y * width + x] = 1; columns[x] += 1; if (y >= centralTop && y < centralBottom) centralColumns[x] += 1; rows[y] += 1; }
  }
  const columnThreshold = Math.max(2, Math.floor(height * (options.projectionRatio ?? 0.002)));
  const rowThreshold = Math.max(2, Math.floor(width * (options.projectionRatio ?? 0.002)));
  let columnRuns = projectionRuns(centralColumns, columnThreshold, Math.max(1, Math.floor(width * 0.006)));
  let rowRuns = projectionRuns(rows, rowThreshold, Math.max(1, Math.floor(height * 0.006)));
  if (!columnRuns.length || !rowRuns.length) return [];
  const minimumPixels = Math.max(8, Math.floor(width * height * (options.minimumAreaRatio ?? 0.00015)));
  const candidates = [];
  for (const [top, bottom] of rowRuns) for (const [left, right] of columnRuns) {
    let minX = right, minY = bottom, maxX = left - 1, maxY = top - 1, count = 0;
    for (let y = top; y < bottom; y += 1) for (let x = left; x < right; x += 1) if (mask[y * width + x]) { count += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
    if (count < minimumPixels || maxX < minX || maxY < minY || maxY - minY + 1 < height * (options.minimumHeightRatio ?? 0.07)) continue;
    const padX = Math.max(2, Math.round((maxX - minX + 1) * (options.paddingRatio ?? 0.04)));
    const padY = Math.max(2, Math.round((maxY - minY + 1) * (options.paddingRatio ?? 0.04)));
    candidates.push({ x: clamp(minX - padX, 0, width - 1), y: clamp(minY - padY, 0, height - 1), width: clamp(maxX + 1 + padX, 1, width) - clamp(minX - padX, 0, width - 1), height: clamp(maxY + 1 + padY, 1, height) - clamp(minY - padY, 0, height - 1), confidence: Number(Math.min(1, count / Math.max(1, (maxX - minX + 1) * (maxY - minY + 1))).toFixed(3)) });
  }
  const likelyWidths = candidates.map((box) => box.width).filter((value) => value >= width * 0.12 && value <= width * 0.45);
  const typicalWidth = likelyWidths.length ? Math.max(...likelyWidths) : null;
  let regularized = candidates;
  if (typicalWidth) {
    const sameVisualRow = [...candidates].sort((a, b) => Math.abs((a.y + a.height / 2) - (b.y + b.height / 2)) < Math.max(a.height, b.height) * 0.25 ? a.x - b.x : a.y - b.y);
    const merged = [];
    for (const box of sameVisualRow) {
      const previous = merged.at(-1);
      const sameRow = previous && Math.abs((previous.y + previous.height / 2) - (box.y + box.height / 2)) < Math.max(previous.height, box.height) * 0.2;
      const gap = previous ? box.x - (previous.x + previous.width) : Infinity;
      const combinedRight = box.x + box.width;
      if (sameRow && gap >= 0 && gap < typicalWidth * 0.2 && combinedRight - previous.x <= typicalWidth * 1.2) {
        previous.y = Math.min(previous.y, box.y); previous.width = combinedRight - previous.x; previous.height = Math.max(previous.y + previous.height, box.y + box.height) - previous.y;
      } else merged.push({ ...box });
    }
    regularized = merged.flatMap((box) => {
      if (box.width <= typicalWidth * 1.5) return [box];
      const count = Math.max(2, Math.round(box.width / typicalWidth)), part = box.width / count;
      return Array.from({ length: count }, (_, index) => ({ ...box, x: Math.round(box.x + index * part), width: Math.round(index === count - 1 ? box.x + box.width - (box.x + index * part) : part), confidence: Number((box.confidence / count).toFixed(3)) }));
    }).filter((box) => box.width >= typicalWidth * 0.45);
  }
  const rowsOfBoxes = [];
  for (const box of regularized.sort((a, b) => a.y - b.y || a.x - b.x)) {
    const center = box.y + box.height / 2;
    const row = rowsOfBoxes.find((group) => Math.abs(center - group.center) <= Math.max(box.height, group.height) * 0.45);
    if (row) { row.boxes.push(box); row.center = row.boxes.reduce((sum, item) => sum + item.y + item.height / 2, 0) / row.boxes.length; row.height = Math.max(row.height, box.height); }
    else rowsOfBoxes.push({ center, height: box.height, boxes: [box] });
  }
  return rowsOfBoxes.sort((a, b) => a.center - b.center).flatMap((row) => row.boxes.sort((a, b) => a.x - b.x));
}

export function constrainFrameBox(box, width, height, minimum = 4) {
  const x = clamp(Math.round(box.x), 0, Math.max(0, width - minimum));
  const y = clamp(Math.round(box.y), 0, Math.max(0, height - minimum));
  return { ...box, x, y, width: clamp(Math.round(box.width), minimum, width - x), height: clamp(Math.round(box.height), minimum, height - y) };
}

export function clearConnectedBackground({ data, width, height }, tolerance = 48) {
  if (!data || data.length !== width * height * 4) throw new Error('clearConnectedBackground requires RGBA pixel data');
  const output = new Uint8ClampedArray(data), background = dominantBorderColor(output, width, height);
  if (!background) return output;
  const queued = new Uint8Array(width * height), queue = [], limit = tolerance * tolerance;
  const eligible = (index) => { const offset = index * 4; if (output[offset + 3] < 32) return true; const dr = output[offset] - background[0], dg = output[offset + 1] - background[1], db = output[offset + 2] - background[2]; return dr * dr + dg * dg + db * db <= limit; };
  const push = (index) => { if (!queued[index] && eligible(index)) { queued[index] = 1; queue.push(index); } };
  for (let x = 0; x < width; x += 1) { push(x); push((height - 1) * width + x); }
  for (let y = 0; y < height; y += 1) { push(y * width); push(y * width + width - 1); }
  for (let cursor = 0; cursor < queue.length; cursor += 1) { const index = queue[cursor], x = index % width, y = Math.floor(index / width); output[index * 4 + 3] = 0; if (x > 0) push(index - 1); if (x + 1 < width) push(index + 1); if (y > 0) push(index - width); if (y + 1 < height) push(index + width); }
  return output;
}

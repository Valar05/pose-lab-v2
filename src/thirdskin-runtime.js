const PLAN_SCHEMA = 'thirdskin-runtime-plan-v1';

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

export function canonicalJson(value) {
  return JSON.stringify(value, Object.keys(value).sort());
}

export function normalizeRuntimePlan(plan, manifestUrl) {
  invariant(plan && typeof plan === 'object', 'Thirdskin runtime plan must be an object');
  invariant(plan.schema === PLAN_SCHEMA, `Unsupported Sprite Lab plan: ${plan.schema || 'missing schema'}`);
  invariant(!Object.prototype.hasOwnProperty.call(plan, 'frames'), 'Thirdskin plans must not contain stored frames');
  invariant(plan.derivedFramesStored === false, 'Thirdskin plan must declare derivedFramesStored=false');
  invariant(plan.cellTable && typeof plan.cellTable === 'object', 'Thirdskin plan is missing cellTable');
  invariant(plan.deformationCurves && typeof plan.deformationCurves === 'object', 'Thirdskin plan is missing deformationCurves');
  invariant(Array.isArray(plan.program) && plan.program.length > 0, 'Thirdskin plan program must be nonempty');

  const cells = {};
  for (const [id, cell] of Object.entries(plan.cellTable)) {
    invariant(cell && typeof cell === 'object', `Cell ${id} must be an object`);
    invariant(['idle', 'load', 'contact', 'apex'].includes(cell.role), `Cell ${id} has invalid role`);
    invariant(typeof cell.asset === 'string' && cell.asset.length > 0, `Cell ${id} is missing asset`);
    invariant(/^[a-f0-9]{64}$/.test(cell.sha256), `Cell ${id} has invalid sha256`);
    invariant(!/^0{64}$/.test(cell.sha256), `Cell ${id} still has a placeholder sha256`);
    const assetUrl = new URL(cell.asset, manifestUrl);
    invariant(['http:', 'https:'].includes(assetUrl.protocol), `Cell ${id} asset must resolve to HTTP(S), not ${assetUrl.protocol}`);
    cells[id] = { ...cell, id, assetUrl: assetUrl.href };
  }

  let cursor = 0;
  const program = plan.program.map((step, index) => {
    invariant(cells[step.cell], `Program step ${index} references missing cell ${step.cell}`);
    invariant(plan.deformationCurves[step.curve], `Program step ${index} references missing curve ${step.curve}`);
    invariant(Number.isInteger(step.durationMs) && step.durationMs > 0, `Program step ${index} has invalid durationMs`);
    const normalized = {
      ...step,
      index,
      startMs: cursor,
      endMs: cursor + step.durationMs,
      effects: [...new Set(step.effects || [])].sort(),
    };
    cursor = normalized.endMs;
    return normalized;
  });

  invariant(program[0].role === 'idle' && program.at(-1).role === 'idle', 'Program must begin and return to idle');
  invariant(cursor === plan.totalDurationMs, 'Program duration does not match totalDurationMs');

  return {
    ...plan,
    cells,
    program,
    totalDurationMs: cursor,
    manifestUrl: String(manifestUrl),
  };
}

export function locateProgramStep(program, timeMs, totalDurationMs) {
  invariant(Array.isArray(program) && program.length > 0, 'Program is empty');
  const bounded = Math.max(0, Math.min(Number(timeMs) || 0, Math.max(0, totalDurationMs - Number.EPSILON)));
  return program.find((step) => bounded >= step.startMs && bounded < step.endMs) || program.at(-1);
}

function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function interpolate(a, b, amount, mode) {
  if (mode === 'step') return a;
  const t = mode === 'smoothstep' || mode === 'cubic' ? smoothstep(amount) : amount;
  return a + ((b - a) * t);
}

export function sampleCurve(curve, elapsedMs) {
  invariant(curve && Array.isArray(curve.controlPoints) && curve.controlPoints.length > 0, 'Curve has no control points');
  const duration = Math.max(1, Number(curve.durationMs) || 1);
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  const phase = curve.loop ? (elapsed % duration) / duration : Math.min(1, elapsed / duration);
  const points = curve.controlPoints;
  let left = points[0];
  let right = points.at(-1);
  for (let index = 1; index < points.length; index += 1) {
    if (phase <= points[index].t) {
      left = points[index - 1];
      right = points[index];
      break;
    }
  }
  const span = Math.max(Number.EPSILON, right.t - left.t);
  const amount = left === right ? 0 : (phase - left.t) / span;
  const keys = new Set([...Object.keys(left.values || {}), ...Object.keys(right.values || {})]);
  const values = {};
  for (const key of keys) {
    const a = Number(left.values?.[key] ?? right.values?.[key] ?? 0);
    const b = Number(right.values?.[key] ?? left.values?.[key] ?? 0);
    values[key] = interpolate(a, b, amount, curve.interpolation || 'linear');
  }
  return { phase, values };
}

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const root = path.resolve(import.meta.dirname, '..');
export const BATCH_SCHEMA = 'pose-lab-v2-sprite-refinery-batch-v1';
export const RESULT_SCHEMA = 'pose-lab-v2-sprite-refinery-worker-result-v1';

export function readJson(relativeOrAbsolute) {
  const file = path.isAbsolute(relativeOrAbsolute) ? relativeOrAbsolute : path.join(root, relativeOrAbsolute);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

export function rel(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

export function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) throw new Error(`unexpected argument: ${item}`);
    const eq = item.indexOf('=');
    if (eq !== -1) {
      const key = item.slice(2, eq).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      args[key] = item.slice(eq + 1);
    } else {
      const key = item.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      const next = argv[index + 1];
      if (!next || next.startsWith('--')) args[key] = true;
      else { args[key] = next; index += 1; }
    }
  }
  return args;
}

export function resolveManifest(identifier) {
  if (!identifier) return 'authoring/sprite-refinery/batches/vanguard-fleshpunk-001.json';
  if (identifier.endsWith('.json') || identifier.includes('/')) return identifier;
  return `authoring/sprite-refinery/batches/${identifier}.json`;
}

export function validateBatch(manifest, options = {}) {
  const provider = options.provider || manifest.provider?.default || 'openai';
  const failures = [];
  const add = (condition, message) => { if (!condition) failures.push(message); };
  add(manifest.schema === BATCH_SCHEMA, 'wrong batch schema');
  add(manifest.batch_id === 'vanguard-fleshpunk-001', 'unexpected or missing batch_id');
  add(manifest.character === 'vanguard', 'Vanguard is the only allowed character authority');
  add(manifest.model_authority === 'public/assets/vanguard/vanguard_rigged_animations.glb', 'unknown model authority');
  add(manifest.camera_profile === 'screen-right-v1', 'unknown camera profile');
  add(!JSON.stringify(manifest).toLowerCase().includes('crimson'), 'Crimson is defunct and forbidden in Sprite Refinery records');
  add(fs.existsSync(path.join(root, manifest.model_authority || '')), 'Vanguard model authority file is missing');
  const conceptPath = manifest.concept?.path ? path.join(root, manifest.concept.path) : '';
  add(manifest.concept?.id === 'fleshpunk-vanguard-v1', 'unknown concept authority id');
  if (provider === 'openai') {
    add(Boolean(conceptPath) && fs.existsSync(conceptPath), `approved concept asset missing: ${manifest.concept?.path || '(none)'}`);
    if (conceptPath && fs.existsSync(conceptPath)) add(sha256File(conceptPath) === manifest.concept.sha256, 'approved concept hash mismatch');
  } else if (provider === 'fixture') {
    if (conceptPath && fs.existsSync(conceptPath) && manifest.concept?.sha256 !== 'APPROVED_CONCEPT_ASSET_NOT_FOUND') {
      add(sha256File(conceptPath) === manifest.concept.sha256, 'fixture concept hash mismatch');
    }
  } else {
    add(false, `unknown provider: ${provider}`);
  }
  add(manifest.provider?.model === 'gpt-image-1', 'OpenAI image edit model must be gpt-image-1 until intentionally changed');
  add(['png'].includes(manifest.provider?.output_format), 'output_format must be png for runtime-ready transparent sheets');
  add(Number.isInteger(manifest.limits?.max_concurrency) && manifest.limits.max_concurrency >= 1 && manifest.limits.max_concurrency <= 4, 'max_concurrency must be bounded 1..4');
  add(Array.isArray(manifest.clips) && manifest.clips.length > 0, 'batch must contain clips');
  add(manifest.clips.length <= manifest.limits.max_clips, 'batch exceeds max_clips');
  const seen = new Set();
  const allowedActions = new Set(['Idle', 'SwordAttack1']);
  for (const clip of manifest.clips || []) {
    add(!seen.has(clip.id), `duplicate clip id ${clip.id}`); seen.add(clip.id);
    add(/^[a-z0-9-]+$/.test(clip.id), `invalid clip id ${clip.id}`);
    add(allowedActions.has(clip.action), `unknown clip action ${clip.action}`);
    add(Number.isInteger(clip.frame_count) && clip.frame_count > 0, `${clip.id} frame_count invalid`);
    add(clip.frame_count <= manifest.limits.max_frames_per_clip, `${clip.id} frame_count exceeds max`);
    add(Array.isArray(clip.frames) && clip.frames.length === clip.frame_count, `${clip.id} frame samples do not match frame_count`);
    add(Array.isArray(clip.timing_ms) && clip.timing_ms.length === clip.frame_count, `${clip.id} timing_ms does not match frame_count`);
    add(clip.timing_ms.every((n) => Number.isInteger(n) && n > 0 && n <= 1000), `${clip.id} timings must be positive integer milliseconds`);
    add(Number.isInteger(clip.grid?.columns) && Number.isInteger(clip.grid?.rows), `${clip.id} grid missing`);
    add(clip.grid.columns * clip.grid.rows >= clip.frame_count, `${clip.id} grid capacity too small`);
    add(clip.grid.columns * clip.grid.rows === clip.frame_count, `${clip.id} grid must exactly match frame count for deterministic worker output`);
  }
  return { ok: failures.length === 0, failures, provider };
}

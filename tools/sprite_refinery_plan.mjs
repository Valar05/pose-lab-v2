#!/usr/bin/env node
import { parseArgs, readJson, resolveManifest, root, validateBatch, writeJson } from './sprite_refinery_common.mjs';
import path from 'node:path';

const args = parseArgs(process.argv);
const manifestPath = resolveManifest(args.manifest || args.batch);
const manifest = readJson(manifestPath);
const provider = args.provider || manifest.provider?.default || 'openai';
const validation = validateBatch(manifest, { provider });
const out = args.out || 'generated/sprite-refinery/plan.json';
const matrix = validation.ok ? manifest.clips.map((clip) => ({
  batch_id: manifest.batch_id,
  manifest: manifestPath,
  clip_id: clip.id,
  action: clip.action,
  frame_count: clip.frame_count,
  provider,
})) : [];
const plan = {
  schema: 'pose-lab-v2-sprite-refinery-plan-v1',
  status: validation.ok ? 'ready' : 'blocked',
  manifest: manifestPath,
  batch_id: manifest.batch_id,
  provider,
  max_concurrency: manifest.limits?.max_concurrency || 1,
  matrix,
  failures: validation.failures,
};
writeJson(path.join(root, out), plan);
console.log(JSON.stringify({ ...plan, include: matrix }, null, 2));
if (!validation.ok) process.exit(1);

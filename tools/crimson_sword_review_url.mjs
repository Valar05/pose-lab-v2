#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const CONTRACT_PATH = 'public/assets/crimson/crimson_model_viewer_constraints.json';

function currentSha() {
  return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function contractHash(contract) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(contract))).digest('hex');
}

const contract = JSON.parse(fs.readFileSync(path.join(root, CONTRACT_PATH), 'utf8'));
const commit = currentSha();
const cacheBust = `${contract.route.cacheBustPrefix}${commit}`;
const url = new URL(contract.route.path, contract.route.origin);
for (const [key, value] of Object.entries(contract.route.params || {})) url.searchParams.set(key, value);
url.searchParams.set('cacheBust', cacheBust);
url.searchParams.set('contractHash', contractHash(contract));

console.log(JSON.stringify({
  schema: 'pose-lab-v2-crimson-sword-review-url-v1',
  cloudReviewOnly: true,
  wakeBrowser: false,
  commit,
  cacheBust,
  contract: CONTRACT_PATH,
  contractHash: contractHash(contract),
  url: url.toString(),
  expectedVisualPredicates: {
    realSwordVisible: 'the real Arborblade sword mesh is visible',
    hiltSeatedInHand: 'the hilt/grip reads as seated in the right hand',
    bladeProjectsForwardFromWrist: 'the blade projects forward from the wrist/grip on positive Z, reading mostly horizontal in the review camera, not backward, upward, downward, or through the hand',
    bladeTipDoesNotClimbForearmInRest: 'the blade point stays near hilt height in the rest/orbit review camera instead of climbing up the forearm or dropping toward the floor',
    noHandImpale: 'the blade does not visibly impale or pierce the hand',
    noManualAlignmentRequired: 'the route boots to the sane socket without manual dragging',
  },
  evidenceManifest: 'generated/cloud-visual-evidence/crimson-sword/latest.json',
}, null, 2));

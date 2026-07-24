#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const verifier = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  'verify_pose_review_bundle.mjs',
);
const revision = 'a'.repeat(40);
const sha = 'b'.repeat(64);
const calibration = 'c'.repeat(64);
const valid = {
  schema: 'pose-lab-v2-review-bundle-v1',
  status: 'quarantined',
  source: { revision, character: 'Crimson', action: 'GuardIdle' },
  authoring: {
    lane: 'direct-final-rig',
    finalRig: true,
    renderer: 'Blender 4.4',
    exportSha256: sha,
    evidence: {
      lockedContactSheet: 'guard-contact-sheet.png',
      orthogonalView: 'guard-orthogonal-sheet.png',
    },
    weapon: {
      mode: 'external',
      hierarchy: ['RightHand', 'SaberGrip', 'ArborbladeSword'],
      calibrationSha256: calibration,
    },
  },
  runtime: {
    url: `https://example.test/${revision}/index.html?model=crimson&clip=GuardIdle`,
    requestedModel: 'crimson',
    activeModel: 'crimson',
    requestedClip: 'GuardIdle',
    activeClip: 'GuardIdle',
    playbackActive: true,
    fallbackRestActive: false,
    hostedCharacterSha256: sha,
    resources: [
      { role: 'page', url: 'https://example.test/index.html', status: 200 },
      { role: 'module', url: 'https://example.test/main.js', status: 200 },
      { role: 'character', url: 'https://example.test/crimson.glb', status: 200 },
      { role: 'weapon', url: 'https://example.test/sword.glb', status: 200 },
    ],
    weapon: {
      mode: 'external',
      hierarchy: ['RightHand', 'SaberGrip', 'ArborbladeSword'],
      calibrationSha256: calibration,
    },
    visual: { status: 'user-pending', evidence: null },
  },
  human: { verdict: 'pending', evidence: null },
};

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pose-is-god-'));
const run = (bundle, ...args) => {
  const file = path.join(temp, 'bundle.json');
  fs.writeFileSync(file, `${JSON.stringify(bundle, null, 2)}\n`);
  return spawnSync(process.execPath, [verifier, file, ...args], {
    encoding: 'utf8',
  });
};

const review = run(valid);
assert.equal(review.status, 0, review.stderr);

const wrongClip = structuredClone(valid);
wrongClip.runtime.activeClip = 'Rest';
assert.notEqual(run(wrongClip).status, 0);

const wrongSword = structuredClone(valid);
wrongSword.runtime.weapon.calibrationSha256 = 'd'.repeat(64);
assert.notEqual(run(wrongSword).status, 0);

const promotionWithoutHuman = run(valid, '--promotion');
assert.notEqual(promotionWithoutHuman.status, 0);

const accepted = structuredClone(valid);
accepted.status = 'accepted';
accepted.human = { verdict: 'accepted', evidence: 'Drew accepted hosted route' };
assert.equal(run(accepted, '--promotion').status, 0);

fs.rmSync(temp, { recursive: true, force: true });
console.log('Pose Is God verifier tests: GREEN');

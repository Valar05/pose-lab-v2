#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const BASE_URL = 'https://valar05.github.io/pose-lab-v2/';
const CANDIDATES = [
  { id: 'attack1-candidate-1', extras: {} },
  { id: 'attack1-joint-pinned-3', extras: { worldSocket: '1', view: 'fpv' } },
  { id: 'crimson-light-attack1-vanguard-1', extras: { model: 'crimson', view: 'orbit', reviewControls: '1' } },
];
const REVIEW_TIMES = [
  ['start', 0],
  ['anticipation', 0.18],
  ['anticipationHold', 0.3],
  ['contact', 0.38],
  ['contactHold', 0.5],
  ['followThrough', 0.7],
  ['recoil', 0.95],
  ['end', 1.25],
];

function currentSha() {
  return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
}

function urlFor(candidate, time, cacheBust, extras = {}) {
  const params = new URLSearchParams({
    pose: 'attack1',
    candidate,
    cacheBust,
    ...extras,
  });
  if (time !== null) params.set('attackTime', String(time));
  return `${BASE_URL}?${params.toString()}`;
}

const cacheBust = `attack1-${currentSha()}`;
const urls = CANDIDATES.flatMap(({ id, extras }) => [{
  label: `${id} animated loop`,
  candidate: id,
  time: null,
  url: urlFor(id, null, cacheBust, extras),
}, ...REVIEW_TIMES.map(([primeKey, time]) => ({
  label: `${id} ${primeKey} ${time.toFixed(6)}s`,
  candidate: id,
  primeKey,
  time,
  url: urlFor(id, time, cacheBust, extras),
}))]);

console.log(JSON.stringify({
  schema: 'pose-lab-v2-attack1-review-urls-v1',
  cloudReviewOnly: true,
  wakeBrowser: false,
  cacheBust,
  candidates: CANDIDATES.map((candidate) => candidate.id),
  urls,
}, null, 2));

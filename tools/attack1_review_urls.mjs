#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const BASE_URL = 'https://valar05.github.io/pose-lab-v2/';
const CANDIDATES = ['attack1-candidate-1', 'attack1-joint-pinned-3'];
const REVIEW_TIMES = [
  ['start', 0],
  ['anticipation', 0.25],
  ['contact', 0.458333],
  ['followThrough', 0.75],
  ['recoil', 1],
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
const urls = CANDIDATES.flatMap((candidate) => [{
  label: `${candidate} animated loop`,
  candidate,
  time: null,
  url: urlFor(candidate, null, cacheBust, candidate.includes('joint-pinned') ? { worldSocket: '1', view: 'fpv' } : {}),
}, ...REVIEW_TIMES.map(([primeKey, time]) => ({
  label: `${candidate} ${primeKey} ${time.toFixed(6)}s`,
  candidate,
  primeKey,
  time,
  url: urlFor(candidate, time, cacheBust, candidate.includes('joint-pinned') ? { worldSocket: '1', view: 'fpv' } : {}),
}))]);

console.log(JSON.stringify({
  schema: 'pose-lab-v2-attack1-review-urls-v1',
  cloudReviewOnly: true,
  wakeBrowser: false,
  cacheBust,
  candidates: CANDIDATES,
  urls,
}, null, 2));

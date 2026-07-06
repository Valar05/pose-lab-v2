#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const BASE_URL = 'https://valar05.github.io/pose-lab-v2/';
const CANDIDATE = 'attack2-candidate-1';
const REVIEW_TIMES = [
  ['start', 0],
  ['backhandPrep', 0.14],
  ['prepHold', 0.24],
  ['contact', 0.36],
  ['contactHold', 0.48],
  ['followThrough', 0.7],
  ['recoil', 0.92],
  ['end', 1.15],
];

function currentSha() {
  return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
}

function urlFor(time, cacheBust) {
  const params = new URLSearchParams({
    pose: 'attack2',
    candidate: CANDIDATE,
    cacheBust,
  });
  if (time !== null) params.set('attackTime', String(time));
  return `${BASE_URL}?${params.toString()}`;
}

const cacheBust = `attack2-${currentSha()}`;
const urls = [{
  label: `${CANDIDATE} animated loop`,
  candidate: CANDIDATE,
  time: null,
  url: urlFor(null, cacheBust),
}, ...REVIEW_TIMES.map(([primeKey, time]) => ({
  label: `${CANDIDATE} ${primeKey} ${time.toFixed(6)}s`,
  candidate: CANDIDATE,
  primeKey,
  time,
  url: urlFor(time, cacheBust),
}))];

console.log(JSON.stringify({
  schema: 'pose-lab-v2-attack2-review-urls-v1',
  cloudReviewOnly: true,
  wakeBrowser: false,
  cacheBust,
  candidate: CANDIDATE,
  urls,
}, null, 2));

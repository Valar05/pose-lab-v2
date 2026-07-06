#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const BASE_URL = 'https://valar05.github.io/pose-lab-v2/';
const READY_CANDIDATE = 'fist-ready-candidate-1';
const CANDIDATE = 'fist-attack1-candidate-1';
const REVIEW_TIMES = [
  ['start', 0],
  ['windup', 0.125],
  ['contact', 0.25],
  ['followThrough', 0.375],
  ['recoil', 0.542],
  ['end', 0.708333],
];

function currentSha() {
  return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
}

function urlFor(time, cacheBust) {
  const params = new URLSearchParams({
    pose: 'attack1',
    candidate: CANDIDATE,
    view: 'fpv',
    cacheBust,
  });
  if (time !== null) params.set('attackTime', String(time));
  return `${BASE_URL}?${params.toString()}`;
}

const cacheBust = `fist-attack1-${currentSha()}`;
const urls = [{
  label: `${READY_CANDIDATE} ready baseline`,
  candidate: READY_CANDIDATE,
  primeKey: 'ready',
  time: 0,
  url: urlFor(0, cacheBust).replace(CANDIDATE, READY_CANDIDATE),
}, {
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
  schema: 'pose-lab-v2-fist-attack1-review-urls-v1',
  cloudReviewOnly: true,
  wakeBrowser: false,
  cacheBust,
  candidates: [READY_CANDIDATE, CANDIDATE],
  visualTarget: 'weaponless FPSPlayer FistReady baseline, then FistAttack1 fist/knuckle orientation read',
  urls,
}, null, 2));

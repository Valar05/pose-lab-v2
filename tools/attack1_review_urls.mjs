#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const BASE_URL = 'https://valar05.github.io/pose-lab-v2/';
const REVIEW_TIMES = [0, 0.25, 0.458333, 0.75, 1.25];

function currentSha() {
  return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
}

function urlFor(time, cacheBust) {
  const params = new URLSearchParams({
    pose: 'attack1',
    cacheBust,
  });
  if (time !== null) params.set('attackTime', String(time));
  return `${BASE_URL}?${params.toString()}`;
}

const cacheBust = `attack1-${currentSha()}`;
const urls = [{
  label: 'Attack1 animated loop',
  time: null,
  url: urlFor(null, cacheBust),
}, ...REVIEW_TIMES.map((time) => ({
  label: `Attack1 ${time.toFixed(6)}s`,
  time,
  url: urlFor(time, cacheBust),
}))];

console.log(JSON.stringify({
  schema: 'pose-lab-v2-attack1-review-urls-v1',
  cloudReviewOnly: true,
  wakeBrowser: false,
  cacheBust,
  urls,
}, null, 2));

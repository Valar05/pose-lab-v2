#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

function run(script) {
  return JSON.parse(execFileSync('node', [script], { encoding: 'utf8' }));
}

const attack1 = run('tools/attack1_review_urls.mjs');
const attack2 = run('tools/attack2_review_urls.mjs');

console.log(JSON.stringify({
  schema: 'pose-lab-v2-attack-review-urls-v1',
  cloudReviewOnly: true,
  wakeBrowser: false,
  cacheBust: {
    attack1: attack1.cacheBust,
    attack2: attack2.cacheBust,
  },
  urls: [
    ...attack1.urls.filter((entry) => entry.candidate === 'attack1-candidate-1'),
    ...attack2.urls,
  ],
}, null, 2));

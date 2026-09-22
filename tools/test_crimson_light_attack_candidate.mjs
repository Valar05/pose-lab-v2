#!/usr/bin/env node
import { ATTACK1_REVIEW_CANDIDATES } from '../src/review-constants.js';

const accepted = Object.entries(ATTACK1_REVIEW_CANDIDATES)
  .filter(([, entry]) => entry.characterKey === 'crimson' && entry.status === 'accepted');
const visualPending = Object.entries(ATTACK1_REVIEW_CANDIDATES)
  .filter(([, entry]) => entry.characterKey === 'crimson' && entry.status === 'visual-pending');
const authoringRed = Object.entries(ATTACK1_REVIEW_CANDIDATES)
  .filter(([, entry]) => entry.characterKey === 'crimson' && entry.status === 'authoring-red');

if (accepted.length) {
  console.error(JSON.stringify({
    ok: false,
    code: 'UNAUTHORIZED_ACCEPTED_CRIMSON_LIGHT_ATTACK1',
    expected: 'No Crimson Attack1 is accepted before the explicit user visual gate.',
    actual: accepted.map(([id]) => id),
  }, null, 2));
  process.exit(1);
}

if (!visualPending.length && !authoringRed.length) {
  console.error(JSON.stringify({
    ok: false,
    code: 'NO_TRACKED_CRIMSON_LIGHT_ATTACK1_RECOVERY',
    expected: 'A Crimson frame-zero candidate must remain honestly authoring-red or become visual-pending after candidate parity passes.',
    actual: [],
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  accepted: [],
  visualPending: visualPending.map(([id]) => id),
  authoringRed: authoringRed.map(([id]) => id),
}, null, 2));

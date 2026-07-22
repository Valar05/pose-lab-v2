#!/usr/bin/env node
import { ATTACK1_REVIEW_CANDIDATES } from '../src/review-constants.js';

const accepted = Object.entries(ATTACK1_REVIEW_CANDIDATES)
  .filter(([, entry]) => entry.characterKey === 'crimson' && entry.status === 'accepted');
const visualPending = Object.entries(ATTACK1_REVIEW_CANDIDATES)
  .filter(([, entry]) => entry.characterKey === 'crimson' && entry.status === 'visual-pending');

if (accepted.length) {
  console.error(JSON.stringify({
    ok: false,
    code: 'UNAUTHORIZED_ACCEPTED_CRIMSON_LIGHT_ATTACK1',
    expected: 'No Crimson Attack1 is accepted before the explicit user visual gate.',
    actual: accepted.map(([id]) => id),
  }, null, 2));
  process.exit(1);
}

if (!visualPending.length) {
  console.error(JSON.stringify({
    ok: false,
    code: 'NO_VISUALLY_REVIEWABLE_CRIMSON_LIGHT_ATTACK1',
    expected: 'At least one Crimson frame-zero candidate remains visual-pending for explicit user review.',
    actual: [],
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, accepted: [], visualPending: visualPending.map(([id]) => id) }, null, 2));

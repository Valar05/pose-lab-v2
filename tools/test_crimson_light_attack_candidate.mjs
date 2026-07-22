#!/usr/bin/env node
import { ATTACK1_REVIEW_CANDIDATES } from '../src/review-constants.js';

const accepted = Object.entries(ATTACK1_REVIEW_CANDIDATES)
  .filter(([, entry]) => entry.characterKey === 'crimson' && entry.status === 'accepted');

if (!accepted.length) {
  console.error(JSON.stringify({
    ok: false,
    code: 'NO_ACCEPTED_CRIMSON_LIGHT_ATTACK1',
    expected: 'A Crimson light Attack1 candidate with independent shared-rest baseline, solved foot truth, and visual evidence is registered as accepted.',
    actual: 'No accepted Crimson light Attack1 candidate is registered. Rejected v3 is quarantine-only.',
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, accepted: accepted.map(([id]) => id) }, null, 2));

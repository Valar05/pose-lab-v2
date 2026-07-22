#!/usr/bin/env node

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node tools/run_crimson_attack1_cloud_review.mjs');
  console.log('No accepted Crimson Attack1 candidate is registered. Rejected v3 is quarantine-only.');
  process.exit(0);
}

throw new Error('No accepted Crimson Attack1 candidate is registered. Rejected v3 is quarantine-only; do not dispatch cloud review for it.');

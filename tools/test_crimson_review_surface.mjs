#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }

assert(main.includes('data-cycle-character>Model: ${ACTIVE_CHARACTER.label}</button>'), 'primary rail must expose visible Model control before Tool');
assert(main.indexOf('data-cycle-character') < main.indexOf('data-cycle-tool'), 'Model control must come before Tool in primary rail');
assert(main.includes('data-panel-toggle="model"') && main.includes('data-panel="model"'), 'Tools dock must include a Model panel');
assert(main.includes('data-model-key="${key}"') && main.includes('CHARACTER_KEYS.map(modelButtonHtml)'), 'Model panel must generate direct buttons for all character profiles');
for (const key of ['crimson', 'meshy', 'davin', 'vanguard', 'ares', 'security-titan']) {
  assert(main.includes(`${key}: {`) || main.includes(`'${key}': {`), `missing character profile ${key}`);
}
assert(main.includes('function switchModel(nextKey)') && main.includes("params.set('model', nextKey)") && main.includes('modelButtons.forEach'), 'model switching must be explicit and wired to direct model buttons');
assert(main.includes("let activePanel = ACTIVE_CHARACTER.key === 'crimson' ? 'model' : null"), 'Crimson must open the Tools dock on Model so switching is reachable');
assert(main.includes("if (ACTIVE_CHARACTER.key === 'crimson') setDockOpen(true, 'model')"), 'Crimson boot must reopen the Model panel, not hide switching behind Transform');
assert(css.includes('button:not([data-cycle-character])') && css.includes('button[data-cycle-character]'), 'FPV/review chrome CSS must keep Model visible instead of filtering it out');
assert(!css.includes('button:not([data-cycle-tool]):not([data-cycle-pose-state]):not([data-cycle-view-mode]):not([data-fpv-settings-toggle]):not([data-attack-review-toggle])'), 'FPV/review chrome must not use the old filter that hid Model');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, check: 'crimson-review-surface', errors: failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, check: 'crimson-review-surface', checked: ['visible-model-control', 'model-panel', 'direct-model-buttons', 'crimson-model-panel-default', 'fpv-keeps-model'] }, null, 2));

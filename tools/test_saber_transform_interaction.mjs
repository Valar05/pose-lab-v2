#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }

assert(main.includes('function saberTransformClaimsEmptyGesture()'), 'Saber transform interaction must have an explicit empty-gesture claim helper');
assert(main.includes("&& (selected || mode === 'rotate' || mode === 'scale')"), 'Rotate/Scale must claim touch gestures even when the thin sword pick misses');
assert(main.includes("if (!hit && !saberTransformClaimsEmptyGesture())"), 'Saber pointer/touch start must only fall through to camera when transform mode does not claim the gesture');
assert(main.includes('const wasSelected = selected && Boolean(hit);'), 'Missed Rotate/Scale drag must not cycle mode as if the user tapped the selected sword');
assert(main.includes('drag canvas to edit sabre; no precise pick required'), 'Status text must explain that Rotate/Scale no longer requires precise sword picking');
assert(main.includes('Camera tool or Move empty-space drag orbits'), 'Status text must preserve an explicit camera-orbit path');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, check: 'saber-transform-interaction', errors: failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, check: 'saber-transform-interaction', checked: ['rotate-scale-claims-empty-canvas', 'missed-pick-does-not-cycle-mode', 'camera-path-remains-explicit'] }, null, 2));

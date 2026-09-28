#!/usr/bin/env node
import assert from 'node:assert/strict';
import { buildActionPlan, gridFor, sampleFrames, slugify } from '../scripts/render-model-reference.mjs';

assert.equal(slugify('Idle_Armature'), 'idle');
assert.equal(slugify('Spring Attack_rig'), 'spring-attack');
assert.deepEqual(gridFor(6), { columns: 3, rows: 2 });
assert.deepEqual(gridFor(12), { columns: 4, rows: 3 });
assert.deepEqual(gridFor(5), { columns: 5, rows: 1 });
assert.deepEqual(sampleFrames([0, 15], 6), [0, 3, 6, 9, 12, 15]);
assert.deepEqual(sampleFrames([10, 20], 3), [10, 15, 20]);

const plan = buildActionPlan(
  { name: 'Light1_Armature', label: 'Light1', frameRange: [1, 31] },
  6
);
assert.equal(plan.slug, 'light1');
assert.deepEqual(plan.grid ?? { columns: plan.columns, rows: plan.rows }, { columns: 3, rows: 2 });
assert.deepEqual(plan.frames, [1, 7, 13, 19, 25, 31]);

console.log('PASS generic model reference helpers');

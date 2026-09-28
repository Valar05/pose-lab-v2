#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  buildActionPlan,
  gridFor,
  isAttackAction,
  selectActions,
  slugify,
} from '../scripts/render-model-reference.mjs';

assert.equal(slugify('Idle_Armature'), 'idle');
assert.equal(slugify('Spring Attack_rig'), 'spring-attack');

assert.deepEqual(gridFor(1), { columns: 1, rows: 1 });
assert.deepEqual(gridFor(5), { columns: 3, rows: 2 });
assert.deepEqual(gridFor(6), { columns: 3, rows: 2 });
assert.deepEqual(gridFor(12), { columns: 4, rows: 3 });
assert.deepEqual(gridFor(67), { columns: 9, rows: 8 });

assert.equal(isAttackAction({ name: 'Light1_Armature', label: 'Light1' }), true);
assert.equal(isAttackAction({ name: 'SpringAttack_Armature', label: 'SpringAttack' }), true);
assert.equal(isAttackAction({ name: 'Idle_Armature', label: 'Idle' }), false);

const actions = [
  { name: 'Idle_Armature', label: 'Idle', keyframes: [0, 10] },
  { name: 'Light1_Armature', label: 'Light1', keyframes: [1, 7, 13, 19, 25, 31] },
  { name: 'Stomp_Armature', label: 'Stomp', keyframes: [0, 5, 11] },
];

assert.deepEqual(
  selectActions(actions).map((action) => action.label),
  ['Light1', 'Stomp']
);
assert.deepEqual(
  selectActions(actions, { scope: 'all' }).map((action) => action.label),
  ['Idle', 'Light1', 'Stomp']
);

const plan = buildActionPlan(actions[1]);
assert.equal(plan.slug, 'light1');
assert.deepEqual(plan.frames, [1, 7, 13, 19, 25, 31]);
assert.deepEqual({ columns: plan.columns, rows: plan.rows }, { columns: 3, rows: 2 });

console.log('PASS generic model reference helpers');

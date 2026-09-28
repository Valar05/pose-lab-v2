import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { GravityDefensiveParityAdapter } from '../src/combat/gravity-defensive-parity-adapter.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readJson = async (relative) => JSON.parse(await readFile(path.join(repoRoot, relative), 'utf8'));
const argumentValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};
const exportSeconds = (source, name) => {
  const match = source.match(new RegExp(`@export var ${name}: float = ([0-9.]+)`));
  assert.ok(match, `missing donor export ${name}`);
  return Number(match[1]);
};

const contract = await readJson('campaigns/gravity-defensive-parity.contract.json');
const donorRoot = argumentValue('--donor-root');
assert.ok(donorRoot, '--donor-root is required so source authority is verified, not assumed');

const donorText = {};
for (const file of contract.donorAuthority.files) {
  const bytes = await readFile(path.join(path.resolve(donorRoot), file.path));
  assert.equal(sha256(bytes), file.sha256, `Gravity Fist donor hash drifted: ${file.path}`);
  donorText[file.path] = bytes.toString('utf8');
}
for (const file of contract.lockedSurface) {
  const bytes = await readFile(path.join(repoRoot, file.path));
  assert.equal(sha256(bytes), file.sha256, `locked target file drifted: ${file.path}`);
}

const player = donorText['scripts/player.gd'];
const enemy = donorText['scenes/ai_controller.gd'];
const conductor = donorText['scenes/ai_conductor.gd'];
const attacks = JSON.parse(donorText['player_attacks.json']);
const headbutt = attacks.special.find((move) => move.name === 'Headbutt');
assert.ok(headbutt, 'pinned donor catalog must contain Headbutt');

const blockDurationMs = exportSeconds(player, 'block_duration') * 1000;
const counterWindowMs = exportSeconds(player, 'block_counter_window') * 1000;
const parryOffenseLockoutMs = exportSeconds(player, 'parry_attack_lockout_duration') * 1000;
const blockedEnemyStunMs = exportSeconds(enemy, 'blocked_stun_duration') * 1000;
const blockedEnemyAttackLockoutMs = exportSeconds(enemy, 'blocked_attack_lockout') * 1000;
const counterSemanticEndMs = Number(headbutt.attack_end) * 1000;
assert.equal(blockDurationMs, 1000);
assert.equal(counterWindowMs, 500);
assert.equal(parryOffenseLockoutMs, 3000);
assert.equal(blockedEnemyStunMs, 2500);
assert.equal(blockedEnemyAttackLockoutMs, 1000);
assert.equal(counterSemanticEndMs, 660);
assert.match(player, /if _block_elapsed <= block_counter_window:[\s\S]*?_start_special_counter_attack\(\)[\s\S]*?return true/);
assert.match(player, /return str\(current_attack\.get\("name", ""\)\) != block_counter_attack_name/);
assert.match(player, /_handle_horizontal_swipe\(sign\(swipe_delta\.x\)\)/);
assert.doesNotMatch(player, /buffered_block/);
assert.match(enemy, /try_block_hit[\s\S]*?on_attack_blocked\(\)[\s\S]*?return[\s\S]*?take_damage/);
assert.match(conductor, /func on_player_parried[\s\S]*?_set_attack_owner\(null\)/);

const recipePath = contract.targetBoundary.presentationFixture.path;
const recipe = await readJson(recipePath);
const presentationDurationMs = recipe.phases.reduce((sum, phase) => sum + Number(phase.durationMs), 0);
assert.equal(presentationDurationMs, contract.targetBoundary.presentationFixture.presentationDurationMs);

const makeAdapter = (counterPresentationMs = presentationDurationMs) => new GravityDefensiveParityAdapter({
  blockDurationMs,
  counterWindowMs,
  counterMoveId: headbutt.name,
  counterSemanticEndMs,
  counterPresentationId: recipe.id,
  counterPresentationDurationMs: counterPresentationMs,
  parryOffenseLockoutMs,
  blockedEnemyStunMs,
  blockedEnemyAttackLockoutMs,
});

// Exact inclusive edge: at 500 ms the facing hit upgrades Block into Headbutt.
const edge = makeAdapter();
assert.equal(edge.requestBlock({ directionSign: 1, standardChainIndex: 3 }), 'started');
edge.advance(500);
const edgeHit = edge.resolveIncomingHit({ attackerDirectionSign: 1 });
assert.deepEqual(edgeHit, { blocked: true, countered: true, damageAuthorized: false });
let state = edge.snapshot();
assert.equal(state.combatState, 'countering');
assert.equal(state.standardChainIndex, 3, 'counter did not restore the chain index preserved at Block entry');
assert.equal(state.enemyOffenseLockedUntilMs, 3500);
assert.equal(state.events.filter((event) => event.type === 'counter-start').length, 1);
assert.equal(state.events.find((event) => event.type === 'presentation-preempted').presentationId, 'gravity-block');
assert.equal(edge.requestBlock({ directionSign: -1 }), 'rejected-counter-active');
assert.equal(edge.snapshot().pendingBlock, false, 'counter-time block input was buffered');

// The existing target presentation ends 50 ms before Headbutt semantics; combat remains countering.
state = edge.advance(presentationDurationMs);
assert.equal(state.nowMs, 1110);
assert.equal(state.combatState, 'countering');
assert.equal(state.representation, null);
state = edge.advance(counterSemanticEndMs - presentationDurationMs);
assert.equal(state.nowMs, 1160);
assert.equal(state.combatState, 'idle');
assert.equal(state.pendingBlock, false, 'rejected Block input appeared after counter recovery');

// One millisecond outside the window is an ordinary directional block, not a parry counter.
const late = makeAdapter();
late.requestBlock({ directionSign: -1, standardChainIndex: 2 });
late.advance(501);
const lateHit = late.resolveIncomingHit({ attackerDirectionSign: -1 });
assert.deepEqual(lateHit, { blocked: true, countered: false, damageAuthorized: false });
state = late.snapshot();
assert.equal(state.combatState, 'blocking');
assert.equal(state.enemyOffenseLockedUntilMs, 0);
assert.equal(state.events.filter((event) => event.type === 'counter-start').length, 0);
late.advance(499);
assert.equal(late.snapshot().combatState, 'idle');

// Facing is required; Block is not 360-degree defense.
const rear = makeAdapter();
rear.requestBlock({ directionSign: 1 });
rear.advance(200);
assert.deepEqual(
  rear.resolveIncomingHit({ attackerDirectionSign: -1 }),
  { blocked: false, countered: false, damageAuthorized: true },
);
assert.equal(rear.snapshot().combatState, 'blocking', 'rear hit silently cancelled Block');

// After the 1000 ms state expires, even a facing hit is damage-authorized.
const expired = makeAdapter();
expired.requestBlock({ directionSign: 1 });
expired.advance(1000);
assert.equal(expired.snapshot().combatState, 'idle');
assert.deepEqual(
  expired.resolveIncomingHit({ attackerDirectionSign: 1 }),
  { blocked: false, countered: false, damageAuthorized: true },
);

// A longer target presentation may continue after semantic recovery without delaying it.
const stretched = makeAdapter(960);
stretched.requestBlock({ directionSign: 1 });
stretched.advance(500);
stretched.resolveIncomingHit({ attackerDirectionSign: 1 });
state = stretched.advance(660);
assert.equal(state.nowMs, 1160);
assert.equal(state.combatState, 'idle');
assert.equal(state.representation.id, recipe.id);
assert.equal(state.representation.elapsedMs, 660);
assert.equal(state.representation.durationMs, 960);

const result = {
  status: 'PASS',
  property: contract.semanticInvariant.name,
  donorRevision: contract.donorAuthority.revision,
  donorVerified: true,
  targetRevision: contract.targetBoundary.repositoryRevision,
  timingsMs: {
    blockDuration: blockDurationMs,
    inclusiveCounterWindow: counterWindowMs,
    headbuttSemanticEnd: counterSemanticEndMs,
    parryOffenseLockout: parryOffenseLockoutMs,
    blockedEnemyStun: blockedEnemyStunMs,
    blockedEnemyAttackLockout: blockedEnemyAttackLockoutMs,
  },
  boundary: {
    at500Ms: edgeHit,
    at501Ms: lateHit,
    rearHitDamageAuthorized: true,
    postExpiryDamageAuthorized: true,
  },
  chainIndexRestored: edge.snapshot().standardChainIndex === 3,
  blockInputMode: 'live-only',
  targetPresentationDurationMs: presentationDurationMs,
  presentationIndependence: 'PASS',
  humanReviewRequired: contract.humanReview.requiredForSemanticVerdict,
};
console.log(JSON.stringify(result, null, 2));

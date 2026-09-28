import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { GravityBufferedChainAdapter } from '../src/combat/gravity-buffered-chain-adapter.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (relative) => JSON.parse(await readFile(path.join(repoRoot, relative), 'utf8'));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sumDuration = (recipe) => recipe.phases.reduce((sum, phase) => sum + Number(phase.durationMs), 0);
const endOfPhase = (recipe, phaseId) => {
  let elapsed = 0;
  for (const phase of recipe.phases) {
    elapsed += Number(phase.durationMs);
    if (phase.id === phaseId) return elapsed;
  }
  throw new Error(`Missing phase ${phaseId}`);
};
const argumentValue = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};

const contract = await readJson('campaigns/gravity-buffered-chain-parity.contract.json');
const firstPath = contract.targetBoundary.firstRepresentation.path;
const nextPath = contract.targetBoundary.nextRepresentation.path;
const firstBytes = await readFile(path.join(repoRoot, firstPath));
const nextBytes = await readFile(path.join(repoRoot, nextPath));
assert.equal(sha256(firstBytes), contract.targetBoundary.firstRepresentation.sha256, 'first target recipe hash drifted');
assert.equal(sha256(nextBytes), contract.targetBoundary.nextRepresentation.sha256, 'next target recipe hash drifted');

const donorPlayer = argumentValue('--donor-player');
let donorVerified = false;
if (donorPlayer) {
  const donorBytes = await readFile(path.resolve(donorPlayer));
  assert.equal(sha256(donorBytes), contract.donorAuthority.sha256, 'Gravity Fist donor source hash drifted');
  donorVerified = true;
}

const firstRecipe = JSON.parse(firstBytes.toString('utf8'));
const nextRecipe = JSON.parse(nextBytes.toString('utf8'));
const semanticEndMs = endOfPhase(firstRecipe, 'stab-contact');
const presentationDurationMs = sumDuration(firstRecipe);
assert.equal(semanticEndMs, contract.targetBoundary.firstRepresentation.semanticEndMs);
assert.equal(presentationDurationMs, contract.targetBoundary.firstRepresentation.presentationDurationMs);
assert.ok(presentationDurationMs > semanticEndMs, 'fixture must contain visual recovery after semantic cutover');

const moves = [
  { id: firstRecipe.id, semanticEndMs, presentationDurationMs },
  { id: nextRecipe.id, semanticEndMs: sumDuration(nextRecipe), presentationDurationMs: sumDuration(nextRecipe) },
];
const adapter = new GravityBufferedChainAdapter({ moves });
assert.equal(adapter.requestStandardAttack(), 'started');
adapter.advance(200);
assert.equal(adapter.requestStandardAttack(), 'buffered');
assert.equal(adapter.requestStandardAttack(), 'already-buffered', 'buffer must retain at most one request');
let state = adapter.advance(119);
assert.equal(state.nowMs, 319);
assert.equal(state.activeMoveId, firstRecipe.id, 'next attack started before semantic attack_end');
assert.equal(state.bufferedAttack, true);
state = adapter.advance(1);
assert.equal(state.nowMs, 320);
assert.equal(state.activeMoveId, nextRecipe.id, 'next ordered attack did not start at semantic attack_end');
assert.equal(state.bufferedAttack, false, 'buffer was not consumed');
assert.equal(state.chainIndex, 2, 'buffer was consumed more than once');
assert.deepEqual(
  state.events.filter((event) => event.type === 'attack-start').map(({ atMs, moveId }) => ({ atMs, moveId })),
  [
    { atMs: 0, moveId: firstRecipe.id },
    { atMs: 320, moveId: nextRecipe.id },
  ],
);
const preemption = state.events.find((event) => event.type === 'presentation-preempted');
assert.deepEqual(
  { atMs: preemption.atMs, moveId: preemption.moveId, remainingMs: preemption.remainingMs },
  { atMs: 320, moveId: firstRecipe.id, remainingMs: 330 },
  'target representation recovery was not separated from combat cutover',
);

const stretched = new GravityBufferedChainAdapter({
  moves: [
    { ...moves[0], presentationDurationMs: 950 },
    moves[1],
  ],
});
stretched.requestStandardAttack();
stretched.advance(200);
stretched.requestStandardAttack();
const stretchedState = stretched.advance(120);
assert.equal(stretchedState.activeMoveId, nextRecipe.id);
assert.equal(stretchedState.events.filter((event) => event.type === 'attack-start')[1].atMs, 320, 'presentation duration changed combat semantics');

const result = {
  status: 'PASS',
  property: contract.semanticInvariant.name,
  donorRevision: contract.donorAuthority.revision,
  donorVerified,
  targetRevision: contract.targetBoundary.repositoryRevision,
  firstMove: firstRecipe.id,
  nextMove: nextRecipe.id,
  semanticCutoverMs: semanticEndMs,
  presentationDurationMs,
  preemptedRecoveryMs: presentationDurationMs - semanticEndMs,
  attackStarts: state.events.filter((event) => event.type === 'attack-start'),
  presentationDurationIndependence: 'PASS',
  humanReviewRequired: contract.humanReview.requiredForSemanticVerdict,
};
console.log(JSON.stringify(result, null, 2));

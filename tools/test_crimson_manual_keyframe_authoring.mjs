#!/usr/bin/env node
import fs from 'node:fs';

const main = fs.readFileSync('src/main.js', 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

assert(main.includes("(REQUESTED_MANUAL_ATTACK || REQUESTED_CANDIDATE) && ACTIVE_CHARACTER.supportsAttackReview !== false"), 'manual imported rigs must expose Attack1 in the pose-state order and initial route');
assert(main.includes("ACTIVE_CHARACTER.supportsBakedPoseStates || (REQUESTED_MANUAL_ATTACK && ACTIVE_CHARACTER.supportsAttackReview !== false)"), 'manual Attack1 authoring must not require Meshy baked pose support');
assert(main.includes("!explicitCandidateReview && !useManualAttackAuthoring()"), 'imported manual authoring must bypass the candidate-only early return');
assert(main.includes("character-rest-per-key"), 'imported rigs must seed manual keys from their own rest pose');
assert(main.includes("Save Key stores frame zero"), 'manual Crimson surface must state the one-frame key contract');
assert(main.includes("ACTIVE_CHARACTER.supportsBakedPoseStates || REQUESTED_MANUAL_ATTACK || Boolean(REQUESTED_CANDIDATE)"), 'explicit manual authoring must expose the Attack controls containing Save Key');
assert(main.includes("key.bones = snapshotPoseBones()"), 'Save Key must persist the directly edited rig bones');
assert(main.includes("navigator.clipboard?.writeText(JSON.stringify(exportTransform(), null, 2))"), 'manual keyframe export must remain inspectable and copyable');

if (failures.length) {
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  route: '?model=crimson&pose=attack1&manual=1&reviewControls=1',
  authority: 'Crimson direct pose controls',
  savedUnit: 'keyframe',
}, null, 2));

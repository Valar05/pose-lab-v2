#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const promotion = args.includes('--promotion');
const manifestArg = args.find((arg) => !arg.startsWith('--'));

if (!manifestArg) {
  console.error(
    'usage: node tools/verify_pose_review_bundle.mjs REVIEW_BUNDLE.json [--promotion]',
  );
  process.exit(2);
}

const manifestPath = path.resolve(manifestArg);
let bundle;
try {
  bundle = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  console.error(`review bundle unreadable: ${error.message}`);
  process.exit(2);
}

const errors = [];
const requireValue = (condition, message) => {
  if (!condition) errors.push(message);
};
const isSha256 = (value) => /^[0-9a-f]{64}$/i.test(String(value || ''));
const isRevision = (value) => /^[0-9a-f]{40}$/i.test(String(value || ''));
const stableJson = (value) => JSON.stringify(value ?? null);

requireValue(
  bundle.schema === 'pose-lab-v2-review-bundle-v1',
  'schema must be pose-lab-v2-review-bundle-v1',
);
requireValue(
  bundle.status === 'quarantined' || bundle.status === 'accepted',
  'status must be quarantined or accepted',
);
requireValue(isRevision(bundle.source?.revision), 'source.revision must be a full commit SHA');
requireValue(Boolean(bundle.source?.character), 'source.character is required');
requireValue(Boolean(bundle.source?.action), 'source.action is required');

const authoring = bundle.authoring || {};
const runtime = bundle.runtime || {};
const authoringWeapon = authoring.weapon || {};
const runtimeWeapon = runtime.weapon || {};
const allowedLanes = new Set([
  'direct-final-rig',
  'retarget',
  'appearance-transfer',
]);
const allowedWeaponModes = new Set(['embedded', 'external', 'none']);

requireValue(allowedLanes.has(authoring.lane), 'authoring.lane is invalid');
requireValue(authoring.finalRig === true, 'authoring.finalRig must be true');
requireValue(Boolean(authoring.renderer), 'authoring.renderer is required');
requireValue(isSha256(authoring.exportSha256), 'authoring.exportSha256 must be SHA-256');
requireValue(
  Boolean(authoring.evidence?.lockedContactSheet),
  'locked contact-sheet evidence is required',
);
requireValue(
  Boolean(authoring.evidence?.orthogonalView),
  'orthogonal-view evidence is required',
);

requireValue(
  allowedWeaponModes.has(authoringWeapon.mode),
  'authoring.weapon.mode is invalid',
);
requireValue(
  authoringWeapon.mode === runtimeWeapon.mode,
  'authoring and runtime weapon modes differ',
);
requireValue(
  stableJson(authoringWeapon.hierarchy || []) ===
    stableJson(runtimeWeapon.hierarchy || []),
  'authoring and runtime weapon hierarchies differ',
);
requireValue(
  (authoringWeapon.calibrationSha256 ?? null) ===
    (runtimeWeapon.calibrationSha256 ?? null),
  'authoring and runtime weapon calibration hashes differ',
);
if (authoringWeapon.mode === 'external') {
  requireValue(
    Array.isArray(authoringWeapon.hierarchy) &&
      authoringWeapon.hierarchy.length >= 2,
    'external weapon requires a declared hierarchy',
  );
  requireValue(
    isSha256(authoringWeapon.calibrationSha256),
    'external weapon requires a calibration SHA-256',
  );
}
if (authoringWeapon.mode === 'none') {
  requireValue(
    (authoringWeapon.hierarchy || []).length === 0,
    'weapon mode none requires an empty hierarchy',
  );
  requireValue(
    authoringWeapon.calibrationSha256 == null,
    'weapon mode none requires null calibrationSha256',
  );
}

requireValue(/^https:\/\//.test(runtime.url || ''), 'runtime.url must be HTTPS');
requireValue(
  runtime.url?.includes(bundle.source?.revision || '__missing__'),
  'runtime.url must contain the full immutable source revision',
);
requireValue(
  runtime.requestedModel === runtime.activeModel,
  'requested model is not the active model',
);
requireValue(
  runtime.requestedClip === runtime.activeClip,
  'requested clip is not the active clip',
);
requireValue(runtime.playbackActive === true, 'requested clip is not actively playing');
requireValue(
  runtime.fallbackRestActive === false,
  'runtime reports rest/fallback as active',
);
requireValue(
  runtime.hostedCharacterSha256 === authoring.exportSha256,
  'hosted character bytes differ from the inspected export',
);

const resources = Array.isArray(runtime.resources) ? runtime.resources : [];
const requiredRoles = new Set(['page', 'module', 'character']);
if (authoringWeapon.mode === 'external') requiredRoles.add('weapon');
for (const resource of resources) {
  requireValue(resource.status === 200, `${resource.role || 'unknown'} resource is not HTTP 200`);
  requiredRoles.delete(resource.role);
}
requireValue(
  requiredRoles.size === 0,
  `missing runtime resources: ${[...requiredRoles].join(', ')}`,
);

const visualStatus = runtime.visual?.status;
requireValue(
  visualStatus === 'browser-captured' || visualStatus === 'user-pending',
  'runtime.visual.status must be browser-captured or user-pending',
);
if (visualStatus === 'browser-captured') {
  requireValue(Boolean(runtime.visual?.evidence), 'browser visual evidence is required');
}

if (promotion) {
  requireValue(bundle.status === 'accepted', 'promotion requires status accepted');
  requireValue(
    bundle.human?.verdict === 'accepted',
    'promotion requires explicit human acceptance',
  );
  requireValue(Boolean(bundle.human?.evidence), 'promotion requires human evidence');
}

if (errors.length) {
  console.error('Pose Is God gate: RED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Pose Is God gate: GREEN (${promotion ? 'promotion' : 'review'})`);

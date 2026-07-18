#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { CRIMSON_SABER_GRIP_LOCAL, CRIMSON_SWORD_LOCAL, CRIMSON_SWORD_REVIEW_LOCAL_AXIS, REVIEW_CAMERA_CONTRACT } from '../src/review-constants.js';

const root = path.resolve(import.meta.dirname, '..');
const DEFAULT_CONTRACT = 'public/assets/crimson/crimson_model_viewer_constraints.json';
const HOSTED_ORIGIN = 'https://valar05.github.io';
const HOSTED_PATH = '/pose-lab-v2/';
const SCHEMA = 'pose-lab-v2-crimson-model-viewer-constraints-v1';
const failures = [];

function parseArgs(argv) {
  const args = { contract: DEFAULT_CONTRACT };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--contract') args.contract = argv[++i] || '';
    else if (arg.startsWith('--contract=')) args.contract = arg.slice('--contract='.length);
    else if (arg === '--help' || arg === '-h') {
      console.log('usage: node tools/validate_crimson_model_viewer_constraints.mjs [--contract FILE]');
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return args;
}

function projectPath(file) {
  return path.isAbsolute(file) ? file : path.join(root, file);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(projectPath(file), 'utf8'));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function transformOnly(value) {
  return {
    position: value?.position,
    rotationDeg: value?.rotationDeg,
    scale: value?.scale,
  };
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function contractHash(contract) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(contract))).digest('hex');
}

const args = parseArgs(process.argv);
const contract = readJson(args.contract);
const calibration = readJson('public/assets/crimson/crimson_sword_calibration.json');
const manifest = readJson('public/assets/crimson/crimson_manifest.json');
const reviewUrlSource = fs.readFileSync(path.join(root, 'tools/crimson_sword_review_url.mjs'), 'utf8');
const blenderSource = fs.readFileSync(path.join(root, 'tools/import_crimson/render_crimson_sword_calibration_blender.py'), 'utf8');

assert(contract.schema === SCHEMA, `constraint schema must be ${SCHEMA}`);
assert(contract.status === 'diagnostic-only-not-visual-acceptance', 'constraint status must be diagnostic-only-not-visual-acceptance');
assert(contract.target === 'crimson-sword', 'constraint target must be crimson-sword');
assert(contract.model === 'crimson', 'constraint model must be crimson');
assert(contract.route?.origin === HOSTED_ORIGIN && contract.route?.path === HOSTED_PATH, 'constraint route must target the hosted model viewer');
assert(contract.route?.params?.model === 'crimson' && contract.route?.params?.pose === 'rest' && contract.route?.params?.view === 'orbit', 'constraint route must match the Crimson rest orbit review surface');
assert(contract.route?.cacheBustPrefix === 'crimson-sword-', 'constraint cacheBustPrefix must match review URL cache token policy');
assert(contract.assets?.character === manifest.runtimeGlb, 'constraint character asset must match Crimson manifest runtimeGlb');
assert(contract.assets?.sword === manifest.swordGlb, 'constraint sword asset must match Crimson manifest swordGlb');
assert(contract.assets?.calibration === 'public/assets/crimson/crimson_sword_calibration.json', 'constraint calibration path must be project-owned Crimson calibration');
assert(sameJson(contract.hierarchy, calibration.hierarchy), 'constraint hierarchy must match sword calibration hierarchy');
assert(sameJson(contract.saberGripLocal, calibration.saberGripLocal), 'constraint saberGripLocal must match sword calibration');
assert(sameJson(transformOnly(contract.saberGripLocal), CRIMSON_SABER_GRIP_LOCAL), 'constraint saberGripLocal transform must match runtime review constants');
assert(sameJson(contract.swordLocal, calibration.swordLocal), 'constraint swordLocal must match sword calibration');
assert(sameJson(contract.swordLocal, CRIMSON_SWORD_LOCAL), 'constraint swordLocal must match runtime review constants');
assert(sameJson(contract.bladeLocalAxis, calibration.bladeLocalAxis), 'constraint bladeLocalAxis must match sword calibration');
assert(sameJson(contract.bladeLocalAxis, CRIMSON_SWORD_REVIEW_LOCAL_AXIS), 'constraint bladeLocalAxis must match runtime review constants');
assert(sameJson(contract.hiltLocalPoint, calibration.hiltLocalPoint), 'constraint hiltLocalPoint must match sword calibration');
assert(contract.normalization?.method === 'pose-lab-v2-normalizeCharacter', 'constraint must declare browser normalizeCharacter policy');
assert(contract.normalization?.centerBoundsAtOrigin === true, 'constraint must center character bounds at origin');
assert(contract.normalization?.feetToGround === true, 'constraint must place feet at ground');
assert(contract.normalization?.targetHeight === 1.75, 'constraint target height must match runtime normalizeCharacter');
assert(sameJson(contract.camera, REVIEW_CAMERA_CONTRACT), 'constraint camera must match REVIEW_CAMERA_CONTRACT');
assert(contract.localBlenderCapture?.classification === 'diagnostic', 'local Blender capture must be diagnostic only');
assert(contract.localBlenderCapture?.mustValidateBeforeRender === true, 'local Blender capture must validate before render');
assert(contract.localBlenderCapture?.acceptance === false, 'local Blender capture must not be visual acceptance');
for (const field of ['camera', 'characterNormalization', 'swordPosition', 'swordRotation', 'swordScale', 'hierarchy']) {
  assert(contract.localBlenderCapture?.forbiddenIndependentOverrides?.includes(field), `local Blender capture must forbid independent ${field} overrides`);
}
assert(reviewUrlSource.includes('crimson_model_viewer_constraints.json'), 'review URL helper must read the model-viewer constraint contract');
assert(blenderSource.includes('crimson_model_viewer_constraints.json'), 'Blender diagnostic must read the model-viewer constraint contract');
assert(blenderSource.includes('contract_hash'), 'Blender diagnostic manifest must record the model-viewer constraint hash');
assert(!blenderSource.includes('obj.scale = (0.82, 0.82, 0.82)'), 'Blender diagnostic must not use independent .82 sword scale');
assert(!blenderSource.includes('obj.location = hand'), 'Blender diagnostic must not place the sword directly at the hand head');

if (failures.length) {
  console.error(JSON.stringify({
    ok: false,
    check: 'crimson-model-viewer-constraints',
    classification: 'guardrail',
    contract: args.contract,
    errors: failures,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  check: 'crimson-model-viewer-constraints',
  classification: 'guardrail',
  contract: args.contract,
  contractHash: contractHash(contract),
  mirroredFields: ['assets', 'hierarchy', 'saberGripLocal', 'swordLocal', 'bladeLocalAxis', 'camera', 'normalization'],
}, null, 2));

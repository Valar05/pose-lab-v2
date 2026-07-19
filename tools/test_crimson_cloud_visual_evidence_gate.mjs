#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function currentSha() { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function run(args) {
  return spawnSync('node', ['tools/require_crimson_cloud_visual_evidence.mjs', ...args], { cwd: root, encoding: 'utf8' });
}
function expectFail(label, args, pattern) {
  const result = run(args);
  assert(result.status !== 0, `${label} should fail`);
  const output = `${result.stdout}\n${result.stderr}`;
  assert(pattern.test(output), `${label} failure should mention ${pattern}, got ${output}`);
}
function writeEvidence(dir, overrides = {}) {
  const screenshot = path.join(dir, 'cloud-shot.png');
  if (!fs.existsSync(screenshot)) fs.writeFileSync(screenshot, 'fixture cloud screenshot bytes\n');
  const commit = currentSha();
  const cacheBust = `crimson-sword-${commit}`;
  const evidence = {
    schema: 'pose-lab-v2-crimson-sword-cloud-visual-evidence-v1',
    target: 'crimson-sword',
    model: 'crimson',
    commit,
    cacheBust,
    hostedUrl: `https://valar05.github.io/pose-lab-v2/?model=crimson&pose=rest&view=orbit&cacheBust=${cacheBust}`,
    capturedAt: '2026-07-17T23:00:00.000Z',
    captureKind: 'hosted-cloud-screenshot',
    screenshotPath: screenshot,
    screenshotSha256: sha256(screenshot),
    visualRead: 'Hosted cloud screenshot shows Crimson Knight with real Arborblade hilt seated in the right hand and blade projecting forward from the hilt in a sane rest direction without hand impale.',
    assertions: {
      realSwordVisible: true,
      hiltSeatedInHand: true,
      bladeProjectsForwardFromWrist: true,
      bladeTipDoesNotClimbForearmInRest: true,
      noHandImpale: true,
      noManualAlignmentRequired: true,
    },
    browserSocketProof: {
      status: 'attached',
      parentBone: 'RightHand',
      visibleInViewport: true,
      screenLengthPx: 96,
      bladeWorldLength: 1.02,
      hiltToHandDistance: 0.18946,
      bladeWorldDirection: [-0.22, 0.02, 0.97],
      hiltScreen: [180, 420],
      tipScreen: [126, 430],
    },
    ...overrides,
  };
  if (overrides.assertions) evidence.assertions = { ...evidence.assertions, ...overrides.assertions };
  const file = path.join(dir, `evidence-${Math.random().toString(16).slice(2)}.json`);
  fs.writeFileSync(file, JSON.stringify(evidence, null, 2));
  return file;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crimson-cloud-gate-'));
expectFail('missing manifest', ['--evidence', path.join(tmp, 'missing.json'), '--allow-fixture'], /missing fresh cloud visual evidence/);
expectFail('localhost evidence', ['--evidence', writeEvidence(tmp, { hostedUrl: 'http://127.0.0.1:8804/?model=crimson&cacheBust=wrong' }), '--allow-fixture'], /hostedUrl must be|https|cacheBust/);
expectFail('Android screenshot evidence', ['--evidence', writeEvidence(tmp, { screenshotPath: '/storage/emulated/0/Pictures/Screenshots/Screenshot_20260717-182119.png' }), '--allow-fixture'], /Android local screenshots are forbidden/);
expectFail('stale cache evidence', ['--evidence', writeEvidence(tmp, { cacheBust: 'crimson-sword-old', hostedUrl: 'https://valar05.github.io/pose-lab-v2/?model=crimson&cacheBust=crimson-sword-old' }), '--allow-fixture'], /cacheBust/);
expectFail('false hilt evidence', ['--evidence', writeEvidence(tmp, { assertions: { hiltSeatedInHand: false } }), '--allow-fixture'], /hiltSeatedInHand/);
expectFail('red visual read evidence', ['--evidence', writeEvidence(tmp, { visualRead: 'Hosted screenshot is red: hilt is not seated and sword is behind the wrist, not held.' }), '--allow-fixture'], /visualRead still describes a red/);
expectFail('missing browser socket proof', ['--evidence', writeEvidence(tmp, { browserSocketProof: { status: 'attached' } }), '--allow-fixture'], /browserSocketProof/);
expectFail('wrist-origin hilt evidence', ['--evidence', writeEvidence(tmp, { browserSocketProof: { status: 'attached', parentBone: 'RightHand', visibleInViewport: true, screenLengthPx: 96, bladeWorldLength: 1.02, hiltToHandDistance: 0, bladeWorldDirection: [-0.22, 0.02, 0.97], hiltScreen: [180, 420], tipScreen: [126, 430] } }), '--allow-fixture'], /wrist-origin|manual-export|palm grip/);
expectFail('upward blade point evidence', ['--evidence', writeEvidence(tmp, { browserSocketProof: { status: 'attached', parentBone: 'RightHand', visibleInViewport: true, screenLengthPx: 96, bladeWorldLength: 1.02, bladeWorldDirection: [0.2, 0.84, 0.49], hiltScreen: [180, 420], tipScreen: [126, 320] } }), '--allow-fixture'], /near hilt height|mostly vertical|positive Z|forward/);
expectFail('downward blade point evidence', ['--evidence', writeEvidence(tmp, { browserSocketProof: { status: 'attached', parentBone: 'RightHand', visibleInViewport: true, screenLengthPx: 96, bladeWorldLength: 1.02, bladeWorldDirection: [-0.46, -0.88, 0.08], hiltScreen: [180, 420], tipScreen: [126, 532] } }), '--allow-fixture'], /near hilt height|mostly vertical|positive Z|forward/);
expectFail('side-leading blade evidence', ['--evidence', writeEvidence(tmp, { browserSocketProof: { status: 'attached', parentBone: 'RightHand', visibleInViewport: true, screenLengthPx: 74.3, bladeWorldLength: 0.56055, bladeWorldDirection: [0.89253, -0.03884, 0.4493], hiltScreen: [392.4, 437.6], tipScreen: [461.7, 464.4] } }), '--allow-fixture'], /dominantly forward|positive Z|side-leading/);
expectFail('command center requested action without episode', ['--evidence', writeEvidence(tmp, {
  captureKind: 'command-center-cloud-screenshot',
  commandCenter: { jobId: 'job_3482abf0-4e12-4c20-92cb-4bfc12cbbf2b', jobStatus: 'completed', actionStatus: 'requested' },
}), '--allow-fixture'], /completed browser episode id/);

const redSubstringPassing = run(['--evidence', writeEvidence(tmp, { visualRead: 'Hosted cloud screenshot shows Crimson Knight with the real Arborblade visible; the hilt reads seated in the right hand and the blade projects forward from the wrist.' }), '--allow-fixture']);
assert(redSubstringPassing.status === 0, `visualRead containing reads should not trip the red-word regex: ${redSubstringPassing.stderr || redSubstringPassing.stdout}`);

const passing = run(['--evidence', writeEvidence(tmp), '--allow-fixture']);
assert(passing.status === 0, `mock hosted cloud evidence should pass fixture gate: ${passing.stderr || passing.stdout}`);
assert(String(passing.stdout || '').trim().startsWith('{'), `passing fixture should emit JSON stdout: ${passing.stderr || passing.stdout}`);
const report = JSON.parse(passing.stdout);
assert(report.ok === true && report.classification === 'visual-acceptance', 'passing fixture report must be visual-acceptance');

const commandCenterPassing = run(['--evidence', writeEvidence(tmp, {
  captureKind: 'command-center-cloud-screenshot',
  commandCenter: {
    jobId: 'job_3482abf0-4e12-4c20-92cb-4bfc12cbbf2b',
    jobStatus: 'completed',
    browserEpisodeId: 'browser_episode_1784342121564_cda069db',
  },
}), '--allow-fixture']);
assert(commandCenterPassing.status === 0, `mock Command Center cloud evidence should pass fixture gate: ${commandCenterPassing.stderr || commandCenterPassing.stdout}`);

if (failures.length) throw new Error(failures.join('\n'));
console.log(JSON.stringify({ ok: true, checked: ['missing', 'localhost', 'android-screenshot', 'stale-cache', 'false-hilt', 'red-read', 'browser-socket-proof', 'wrist-origin-hilt', 'upward-blade-point', 'downward-blade-point', 'side-leading-blade', 'command-center-requested-action', 'red-substring-pass', 'mock-pass', 'command-center-pass'] }, null, 2));

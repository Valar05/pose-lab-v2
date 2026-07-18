#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const failures = [];
function assert(condition, message) { if (!condition) failures.push(message); }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
}
function node(args) { return run('node', args); }
function currentSha() {
  const result = run('git', ['rev-parse', '--short', 'HEAD']);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
}
function expectFail(label, args, pattern) {
  const result = node(args);
  assert(result.status !== 0, `${label} should fail`);
  const output = `${result.stdout}
${result.stderr}`;
  assert(pattern.test(output), `${label} failure should mention ${pattern}, got ${output}`);
}

const fixtureDir = path.join(root, 'generated/cloud-visual-evidence/crimson-sword/promotion-fixture');
fs.rmSync(fixtureDir, { recursive: true, force: true });
fs.mkdirSync(fixtureDir, { recursive: true });
const screenshot = path.join(fixtureDir, 'screenshot.png');
fs.writeFileSync(screenshot, Buffer.concat([Buffer.from('fixture-cloud-screenshot\n'), Buffer.alloc(2048, 7)]));
const sourceManifest = path.join(fixtureDir, 'visual_qa_manifest.json');
const cacheBust = `crimson-sword-${currentSha()}`;
const hostedUrl = `https://valar05.github.io/pose-lab-v2/?model=crimson&pose=rest&view=orbit&cacheBust=${cacheBust}`;
const source = {
  schema: 'command-center-visual-qa-evidence-v1',
  target: 'crimson-sword',
  captureKind: 'cloud-screenshot',
  jobId: 'github_actions_fixture',
  sessionId: 'browser_session_github_actions_fixture',
  browserEpisode: { episodeId: 'browser_episode_github_actions_fixture', outcome: 'visual_qa_captured' },
  startUrl: hostedUrl,
  finalUrl: hostedUrl,
  capturedAt: '2026-07-18T06:06:25.000Z',
  screenshotPath: '/home/runner/work/pose-lab-v2/pose-lab-v2/generated/cloud-visual-evidence/crimson-sword/github-actions-fixture/screenshot.png',
  screenshotSha256: sha256(screenshot),
  surface: { runtime: 'github-actions-playwright', browser: 'system-chrome', channel: 'chrome' },
  browserSocketProof: {
    status: 'attached',
    parentBone: 'RightHand',
    visibleInViewport: true,
    screenLengthPx: 96,
    bladeWorldLength: 0.56055,
    hiltToHandDistance: 0.085,
    bladeWorldDirection: [0.02777, 0.07351, 0.99691],
    hiltScreen: [379.2, 452.1],
    tipScreen: [283.7, 461.9],
  },
  visualRead: '',
  assertions: {},
};
fs.writeFileSync(sourceManifest, JSON.stringify(source, null, 2) + '\n');
const promoted = path.join(fixtureDir, 'promoted.json');
const promoteArgs = ['tools/command_center_crimson_visual_evidence.mjs', '--manifest', sourceManifest, '--out', promoted];
expectFail('promotion without visual read', promoteArgs, /visualRead must be supplied/);
expectFail('promotion without assertion confirmation', [...promoteArgs, '--visual-read', 'Hosted cloud screenshot shows Crimson Knight with real Arborblade visible and held in the right hand, but this fixture intentionally omits assertion flags.'], /visual assertion must be confirmed/);
const pass = node([
  ...promoteArgs,
  '--visual-read',
  'Hosted cloud screenshot shows Crimson Knight in rest pose with the real Arborblade visible; the hilt reads seated in the right hand, the blade projects forward and mostly horizontal from the grip, and it does not pierce the hand.',
  '--confirm-all-visual-assertions',
]);
assert(pass.status === 0, `promotion with visual read and assertions should pass: ${pass.stderr || pass.stdout}`);
const promotedJson = JSON.parse(fs.readFileSync(promoted, 'utf8'));
assert(promotedJson.screenshotPath === path.relative(root, screenshot), `promotion should rewrite runner screenshotPath to downloaded artifact sibling, got ${promotedJson.screenshotPath}`);
const accept = node(['tools/require_crimson_cloud_visual_evidence.mjs', '--evidence', promoted]);
assert(accept.status === 0, `promoted evidence should pass acceptance: ${accept.stderr || accept.stdout}`);

if (failures.length) throw new Error(failures.join('\n'));
console.log(JSON.stringify({ ok: true, checked: ['requires-visual-read', 'requires-assertions', 'rewrites-runner-screenshot-path', 'promoted-evidence-accepted'] }, null, 2));

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE = path.resolve(ROOT, '..');
const POSE_LAB = path.join(WORKSPACE, 'pose-lab');
const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';
const node = process.execPath;
const port = Number(process.env.KINESIS_PORT || 4173);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', env: process.env, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status})`);
}
function succeeds(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'ignore', env: process.env, ...options });
  return !result.error && result.status === 0;
}
function pythonRuntime() {
  for (const candidate of isWin ? [['py',['-3']],['python',[]],['python3',[]]] : [['python3',[]],['python',[]]]) {
    if (succeeds(candidate[0], [...candidate[1], '--version'])) return { command: candidate[0], prefix: candidate[1] };
  }
  throw new Error('BLOCKED: Python 3 is required for the comparison sheet and local server');
}
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

console.log('EMBODIED KINESIS LAB — local first-person canary');
if (!fs.existsSync(path.join(POSE_LAB, 'assets', 'models', 'FPSPlayer.glb'))) {
  console.log(`Reference sibling missing; materializing public source at ${POSE_LAB}`);
  run('git', ['clone', '--depth', '1', 'https://github.com/Valar05/pose-lab.git', POSE_LAB], { cwd: WORKSPACE });
}

run(node, ['scripts/fps-fist-reference.mjs']);
run(node, ['scripts/bake-fist-attack1-candidate.mjs']);
run(node, ['tools/embodied_kinesis_regnet.mjs']);
run(node, ['scripts/build.mjs']);

if (!succeeds(node, ['-e', "import('playwright').then(()=>process.exit(0)).catch(()=>process.exit(1))"])) {
  console.log('Bootstrapping Playwright package without downloading another browser...');
  run(npm, ['install', '--no-save', 'playwright'], { env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' } });
}

const py = pythonRuntime();
if (!succeeds(py.command, [...py.prefix, '-c', 'from PIL import Image'])) {
  console.log('Bootstrapping Pillow for evidence assembly...');
  run(py.command, [...py.prefix, '-m', 'pip', 'install', '--user', 'pillow==11.3.0']);
}
if (!succeeds('ffmpeg', ['-version'])) {
  throw new Error('BLOCKED: ffmpeg is required to emit the animated-model MP4; install ffmpeg, then rerun this same command');
}

const serverLog = fs.openSync(path.join(ROOT, 'generated', 'embodied-kinesis-http.log'), 'a');
const server = spawn(py.command, [...py.prefix, '-m', 'http.server', String(port), '-d', 'dist'], {
  cwd: ROOT,
  stdio: ['ignore', serverLog, serverLog],
  windowsHide: true,
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error('BLOCKED: unified Lab local HTTP surface did not become ready');

  run(node, ['tools/embodied_kinesis_capture.mjs'], { env: { ...process.env, KINESIS_URL: `http://127.0.0.1:${port}/` } });
  run(py.command, [...py.prefix, 'tools/embodied_kinesis_key_sheet.py']);

  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'embodied-kinesis-canary.json'), 'utf8'));
  const out = path.join(ROOT, 'generated', 'embodied-kinesis', cfg.stage, cfg.candidate);
  run('ffmpeg', ['-hide_banner','-loglevel','error','-y','-framerate','24','-i',path.join(out,'motion','frame-%03d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'animation-fpv.mp4')]);
  const outputs = {};
  for (const name of ['animation-fpv.mp4','key-comparison-sheet.png','runtime-capture.json']) {
    const file = path.join(out, name);
    outputs[name] = { bytes: fs.statSync(file).size, sha256: sha256(file) };
  }
  const receipt = {
    schema: 'embodied-kinesis-output-receipt-v1',
    stage: cfg.stage,
    candidate: cfg.candidate,
    outputs,
    presentableToDrew: false,
    reason: 'runtime evidence produced; independent Regnet/Penelope/Venice perceptual gauntlet still required',
  };
  fs.writeFileSync(path.join(out, 'output-receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(`\nCANARY EVIDENCE READY: ${out}`);
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  server.kill();
  fs.closeSync(serverLog);
}

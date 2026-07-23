#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs, readJson, resolveManifest, root, validateBatch, writeJson, sha256File, RESULT_SCHEMA } from './sprite_refinery_common.mjs';
import { runFixtureProvider, runOpenAiProvider } from './sprite_refinery_provider.mjs';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 1024 * 1024 * 20, ...options });
  if (result.status !== 0) {
    const error = new Error(`${command} ${args.join(' ')} failed with ${result.status}\n${result.stdout}\n${result.stderr}`);
    error.stdout = result.stdout; error.stderr = result.stderr; throw error;
  }
  return result;
}

function frameList(clip) { return clip.frames.join(','); }
function timingList(clip) { return clip.timing_ms.join(','); }

const args = parseArgs(process.argv);
const manifestPath = resolveManifest(args.manifest || args.batch);
const manifest = readJson(manifestPath);
const provider = args.provider || manifest.provider?.default || 'openai';
const validation = validateBatch(manifest, { provider });
const clip = manifest.clips.find((entry) => entry.id === args.clip);
const outDir = path.join(root, args.outDir || `generated/sprite-refinery/workers/${manifest.batch_id}/${args.clip || 'unknown'}`);
fs.mkdirSync(outDir, { recursive: true });
let result;
try {
  if (!validation.ok) throw new Error(`batch validation failed: ${validation.failures.join('; ')}`);
  if (!clip) throw new Error(`clip not found: ${args.clip}`);
  const posePacketDir = path.join(outDir, 'pose-packet');
  if (!fs.existsSync(path.join(posePacketDir, 'manifest.json')) || args.forceRender) {
    if (process.env.SPRITE_REFINERY_SKIP_RENDER === '1') {
      fs.mkdirSync(posePacketDir, { recursive: true });
      const fixtureSheet = clip.id === 'idle'
        ? 'public/assets/vanguard/fleshpunk/idle/contact-sheet.png'
        : 'public/assets/vanguard/fleshpunk/swordattack1/contact-sheet.png';
      fs.copyFileSync(path.join(root, fixtureSheet), path.join(posePacketDir, 'beauty-grid.png'));
      fs.copyFileSync(path.join(root, fixtureSheet), path.join(posePacketDir, 'geometry-grid.png'));
      fs.copyFileSync(path.join(root, fixtureSheet), path.join(posePacketDir, 'limb-id-grid.png'));
      fs.copyFileSync(path.join(root, fixtureSheet), path.join(posePacketDir, 'depth-grid.png'));
      writeJson(path.join(posePacketDir, 'manifest.json'), { schema: 'animation-pose-packet-v1', status: 'fixture-native-geometry-reference', clip_id: clip.id, action: clip.action, fixture_source: fixtureSheet });
      writeJson(path.join(posePacketDir, 'verification.json'), { schema: 'animation-pose-packet-verification-v1', status: 'PASS', fixture: true });
    } else {
      const blenderBin = process.env.BLENDER_BIN || 'blender';
      run(blenderBin, [
        '--background', '--python-exit-code', '1', '--python', 'tools/render_animation_pose_packet.py', '--',
        '--asset', manifest.model_authority,
        '--out-dir', posePacketDir,
        '--action', clip.action,
        '--frames', frameList(clip),
        '--source-fps', '60',
        '--camera-side', 'right',
        '--columns', String(clip.grid.columns),
        '--rows', String(clip.grid.rows),
      ]);
      run('python3', ['tools/assemble_animation_pose_packet.py', '--root', posePacketDir]);
      run('python3', ['tools/verify_animation_pose_packet.py', '--root', posePacketDir, '--report', path.join(posePacketDir, 'verification.json')]);
    }
  }
  const rawStyledSheet = path.join(outDir, 'raw-styled-contact-sheet.png');
  const providerProvenance = path.join(outDir, 'provider-provenance.json');
  const attempt = Number(args.attempt || process.env.GITHUB_RUN_ATTEMPT || 1);
  if (!fs.existsSync(rawStyledSheet) || provider === 'openai') {
    if (provider === 'fixture') runFixtureProvider({ posePacketDir, outFile: rawStyledSheet, provenanceFile: providerProvenance, manifest, clip, attempt });
    else runOpenAiProvider({ posePacketDir, conceptPath: path.join(root, manifest.concept.path), outFile: rawStyledSheet, provenanceFile: providerProvenance, manifest, clip, attempt });
  }
  const framesDir = path.join(outDir, 'frames');
  run('python3', ['tools/sprite_refinery_split_sheet.py', '--sheet', rawStyledSheet, '--out-dir', framesDir, '--clip-id', clip.id, '--columns', String(clip.grid.columns), '--rows', String(clip.grid.rows), '--frame-count', String(clip.frame_count)]);
  const structuralReport = path.join(posePacketDir, 'verification.json');
  const verifierReport = path.join(outDir, 'verifier-report.json');
  run('python3', ['tools/sprite_refinery_verify.py', '--frames-dir', framesDir, '--clip-id', clip.id, '--frame-count', String(clip.frame_count), '--timing-ms', timingList(clip), '--report', verifierReport, '--structural-report', structuralReport, '--provider-provenance', providerProvenance]);
  result = {
    schema: RESULT_SCHEMA,
    status: 'ready',
    batch_id: manifest.batch_id,
    clip_id: clip.id,
    action: clip.action,
    provider,
    artifact_root: path.relative(root, outDir),
    pose_packet: path.relative(root, posePacketDir),
    raw_styled_sheet: path.relative(root, rawStyledSheet),
    frames_dir: path.relative(root, framesDir),
    provenance: path.relative(root, providerProvenance),
    verifier_report: path.relative(root, verifierReport),
    output_hashes: {
      raw_styled_sheet: sha256File(rawStyledSheet),
      verifier_report: sha256File(verifierReport),
    },
  };
} catch (error) {
  result = { schema: RESULT_SCHEMA, status: String(error.message || error).includes('approved concept asset missing') ? 'blocked' : 'red', batch_id: manifest.batch_id, clip_id: args.clip || null, provider, artifact_root: path.relative(root, outDir), error: String(error.stack || error), validation_failures: validation.failures };
}
writeJson(path.join(outDir, 'result.json'), result);
console.log(JSON.stringify(result, null, 2));
if (result.status === 'red') process.exit(1);
if (result.status === 'blocked') process.exit(2);

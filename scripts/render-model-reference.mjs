#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/(?:_armature|_rig)$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'action';
}

export function gridFor(count) {
  if (!Number.isInteger(count) || count < 2) {
    throw new Error('--samples must be an integer >= 2');
  }
  for (let rows = Math.floor(Math.sqrt(count)); rows >= 1; rows -= 1) {
    if (count % rows === 0) {
      return { columns: count / rows, rows };
    }
  }
  return { columns: count, rows: 1 };
}

export function sampleFrames(frameRange, count) {
  const [start, end] = frameRange.map(Number);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error(`Invalid action frame range: ${frameRange}`);
  }
  if (count < 2) throw new Error('sample count must be >= 2');
  if (end <= start) {
    return Array.from({ length: count }, (_, index) => index);
  }
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, index) =>
    Number((start + step * index).toFixed(6))
  );
}

function fail(message) {
  console.error(`STOP: ${message}`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.signal || (result.status ?? 1) !== 0) {
    fail(`${command} ${args.join(' ')} failed`);
  }
}

function parseArgs(argv) {
  const options = {
    samples: 6,
    sourceFps: 60,
    cameraSide: 'right',
    width: 512,
    height: 512,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    switch (arg) {
      case '--model':
        options.model = next;
        index += 1;
        break;
      case '--name':
        options.name = next;
        index += 1;
        break;
      case '--actions':
        options.actions = next;
        index += 1;
        break;
      case '--samples':
        options.samples = Number(next);
        index += 1;
        break;
      case '--source-fps':
        options.sourceFps = Number(next);
        index += 1;
        break;
      case '--camera-side':
        options.cameraSide = next;
        index += 1;
        break;
      case '--width':
        options.width = Number(next);
        index += 1;
        break;
      case '--height':
        options.height = Number(next);
        index += 1;
        break;
      case '--out-dir':
        options.outDir = next;
        index += 1;
        break;
      default:
        fail(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function findRequestedActions(actions, requested) {
  if (!requested) return actions;
  const wanted = requested.split(',').map((value) => value.trim()).filter(Boolean);
  const normalizedWanted = new Set(wanted.map((value) => slugify(value)));
  const selected = actions.filter((action) =>
    wanted.includes(action.name) ||
    wanted.includes(action.label) ||
    normalizedWanted.has(slugify(action.name)) ||
    normalizedWanted.has(slugify(action.label))
  );
  const selectedKeys = new Set(selected.flatMap((action) => [action.name, action.label, slugify(action.name), slugify(action.label)]));
  const missing = wanted.filter((value) =>
    !selectedKeys.has(value) && !selectedKeys.has(slugify(value))
  );
  if (missing.length) {
    throw new Error(`Requested actions not found: ${missing.join(', ')}`);
  }
  return selected;
}

export function buildActionPlan(action, samples) {
  const grid = gridFor(samples);
  return {
    name: action.name,
    label: action.label,
    slug: slugify(action.label || action.name),
    frames: sampleFrames(action.frameRange, samples),
    columns: grid.columns,
    rows: grid.rows,
  };
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (!options.model || !options.name) {
    fail('usage: npm run reference:model -- --model MODEL.glb --name model-name [--actions Idle,Attack] [--samples 6]');
  }
  if (!['left', 'right'].includes(options.cameraSide)) {
    fail('--camera-side must be left or right');
  }
  if (!Number.isInteger(options.samples) || options.samples < 2) {
    fail('--samples must be an integer >= 2');
  }

  const model = path.resolve(root, options.model);
  if (!fs.existsSync(model)) fail(`model not found: ${model}`);

  const modelSlug = slugify(options.name);
  const outRoot = path.resolve(
    root,
    options.outDir || path.join('generated', 'model-reference', modelSlug)
  );
  fs.mkdirSync(outRoot, { recursive: true });

  const inspectionPath = path.join(outRoot, 'actions.json');
  run('node', [
    'scripts/run-blender-tool.mjs',
    'tools/inspect_model_actions_blender.py',
    '--',
    '--asset', model,
    '--out', inspectionPath,
  ]);

  const inspection = JSON.parse(fs.readFileSync(inspectionPath, 'utf8'));
  if (!Array.isArray(inspection.actions) || inspection.actions.length === 0) {
    fail(`model has no embedded actions: ${model}`);
  }

  let selected;
  try {
    selected = findRequestedActions(inspection.actions, options.actions);
  } catch (error) {
    fail(error.message);
  }

  const receipt = {
    schema: 'pose-lab-model-reference-v1',
    status: 'rendering',
    name: options.name,
    slug: modelSlug,
    model,
    inspection: inspectionPath,
    cameraSide: options.cameraSide,
    samplesPerAction: options.samples,
    actions: [],
  };

  for (const action of selected) {
    const plan = buildActionPlan(action, options.samples);
    const actionOut = path.join(outRoot, plan.slug);
    fs.rmSync(actionOut, { recursive: true, force: true });
    fs.mkdirSync(actionOut, { recursive: true });

    console.log(`\n=== ${action.name} -> ${plan.slug} ===`);
    run('node', [
      'scripts/run-blender-tool.mjs',
      'tools/render_animation_pose_packet.py',
      '--',
      '--asset', model,
      '--out-dir', actionOut,
      '--action', action.name,
      '--frames', plan.frames.join(','),
      '--source-fps', String(options.sourceFps),
      '--camera-side', options.cameraSide,
      '--width', String(options.width),
      '--height', String(options.height),
      '--columns', String(plan.columns),
      '--rows', String(plan.rows),
    ]);

    run('python3', [
      'tools/assemble_animation_pose_packet.py',
      '--root', actionOut,
    ]);

    const verificationPath = path.join(actionOut, 'verification.json');
    run('python3', [
      'tools/verify_animation_pose_packet.py',
      '--root', actionOut,
      '--report', verificationPath,
    ]);

    receipt.actions.push({
      action: action.name,
      label: action.label,
      slug: plan.slug,
      frameRange: action.frameRange,
      sampleFrames: plan.frames,
      grid: { columns: plan.columns, rows: plan.rows },
      root: actionOut,
      beautyGrid: path.join(actionOut, 'beauty-grid.png'),
      geometryGrid: path.join(actionOut, 'geometry-grid.png'),
      verification: verificationPath,
    });
  }

  const masterContact = path.join(outRoot, `${modelSlug}-master-contact.jpg`);
  run('python3', [
    'tools/stitch_model_reference_contact_sheet.py',
    '--root', outRoot,
    '--out', masterContact,
    '--title', options.name,
  ]);

  receipt.status = 'PASS';
  receipt.masterContact = masterContact;
  const receiptPath = path.join(outRoot, 'receipt.json');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');

  console.log('\n=== MODEL REFERENCE READY ===');
  console.log(`model=${model}`);
  console.log(`actions=${receipt.actions.length}`);
  console.log(`master_contact=${masterContact}`);
  console.log(`receipt=${receiptPath}`);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) {
  main();
}

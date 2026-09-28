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
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('frame count must be an integer >= 1');
  }
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  return { columns, rows };
}

const ATTACK_TOKENS = [
  'attack', 'light', 'heavy', 'kick', 'stomp', 'spring',
  'cast', 'slash', 'stab', 'bash', 'shield', 'thrust',
  'smash', 'strike', 'swing', 'uppercut', 'jab', 'counter',
  'combo', 'finisher', 'charge', 'lunge',
];

export function isAttackAction(action) {
  const value = slugify(action.label || action.name);
  return ATTACK_TOKENS.some((token) => value.includes(token));
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
    scope: 'attacks',
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
      case '--scope':
        options.scope = next;
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
  const wanted = requested.split(',').map((value) => value.trim()).filter(Boolean);
  const normalizedWanted = new Set(wanted.map((value) => slugify(value)));
  const selected = actions.filter((action) =>
    wanted.includes(action.name) ||
    wanted.includes(action.label) ||
    normalizedWanted.has(slugify(action.name)) ||
    normalizedWanted.has(slugify(action.label))
  );
  const selectedKeys = new Set(selected.flatMap((action) => [
    action.name, action.label, slugify(action.name), slugify(action.label),
  ]));
  const missing = wanted.filter((value) =>
    !selectedKeys.has(value) && !selectedKeys.has(slugify(value))
  );
  if (missing.length) {
    throw new Error(`Requested actions not found: ${missing.join(', ')}`);
  }
  return selected;
}

export function selectActions(actions, { requested, scope = 'attacks' } = {}) {
  if (requested) return findRequestedActions(actions, requested);
  if (scope === 'all') return actions;
  if (scope !== 'attacks') throw new Error('--scope must be attacks or all');
  const selected = actions.filter(isAttackAction);
  if (!selected.length) {
    throw new Error('No attack-like actions found; use --scope all or --actions explicitly');
  }
  return selected;
}

export function buildActionPlan(action) {
  const frames = Array.isArray(action.keyframes)
    ? action.keyframes.map(Number).filter(Number.isFinite)
    : [];
  if (!frames.length) {
    throw new Error(`Action ${action.name} has no authored keyframes`);
  }
  const grid = gridFor(frames.length);
  return {
    name: action.name,
    label: action.label,
    slug: slugify(action.label || action.name),
    frames,
    columns: grid.columns,
    rows: grid.rows,
  };
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (!options.model || !options.name) {
    fail('usage: npm run reference:model -- --model MODEL.glb --name model-name [--scope attacks|all] [--actions A,B]');
  }
  if (!['left', 'right'].includes(options.cameraSide)) {
    fail('--camera-side must be left or right');
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
    selected = selectActions(inspection.actions, {
      requested: options.actions,
      scope: options.scope,
    });
  } catch (error) {
    fail(error.message);
  }

  const receipt = {
    schema: 'pose-lab-model-reference-v2',
    status: 'rendering',
    framePolicy: 'every-authored-keyframe',
    name: options.name,
    slug: modelSlug,
    model,
    inspection: inspectionPath,
    scope: options.actions ? 'explicit-actions' : options.scope,
    cameraSide: options.cameraSide,
    actions: [],
  };

  for (const action of selected) {
    let plan;
    try {
      plan = buildActionPlan(action);
    } catch (error) {
      fail(error.message);
    }
    const actionOut = path.join(outRoot, plan.slug);
    fs.rmSync(actionOut, { recursive: true, force: true });
    fs.mkdirSync(actionOut, { recursive: true });

    console.log(`\n=== ${action.name} -> ${plan.slug}: ${plan.frames.length} authored keyframes ===`);
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

    run('python3', ['tools/assemble_animation_pose_packet.py', '--root', actionOut]);

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
      authoredKeyframes: plan.frames,
      keyframeCount: plan.frames.length,
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
  receipt.totalRenderedKeyframes = receipt.actions.reduce((sum, action) => sum + action.keyframeCount, 0);
  receipt.masterContact = masterContact;
  const receiptPath = path.join(outRoot, 'receipt.json');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2) + '\n');

  console.log('\n=== MODEL REFERENCE READY ===');
  console.log(`model=${model}`);
  console.log(`scope=${receipt.scope}`);
  console.log(`actions=${receipt.actions.length}`);
  console.log(`authored_keyframes=${receipt.totalRenderedKeyframes}`);
  console.log(`master_contact=${masterContact}`);
  console.log(`receipt=${receiptPath}`);
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) main();

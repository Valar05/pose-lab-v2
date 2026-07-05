#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const statusPath = path.join(root, 'src', 'pose-status.js');
const candidateRoot = path.join(root, 'generated', 'pose-candidates');
const poseOutput = {
  attack1: {
    file: 'src/attack1-pose.js',
    exportName: 'ATTACK1_POSE_SEQUENCE',
    sourceClip: 'OneHandAttack1',
  },
};

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key.startsWith('--') || value === undefined || value.startsWith('--')) {
      throw new Error(`expected --key value, got ${key}`);
    }
    args[key.slice(2)] = value;
    i += 1;
  }
  return args;
}

function assertInsideCandidateRoot(file) {
  const relative = path.relative(candidateRoot, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`candidate must live under generated/pose-candidates: ${file}`);
  }
}

function moduleExportName(source) {
  const match = source.match(/export const\s+([A-Z0-9_]+)\s*=/);
  return match?.[1] || null;
}

function renderStatus(status) {
  return `export const POSE_STATUS = ${JSON.stringify(status, null, 2)};\n`;
}

async function main() {
  const args = parseArgs(process.argv);
  const pose = args.pose;
  const config = poseOutput[pose];
  if (!config) throw new Error(`unsupported pose: ${pose}`);
  if (args.verdict !== 'accepted') throw new Error('promotion requires --verdict accepted');
  if (!args['evidence-url']?.startsWith('https://')) throw new Error('promotion requires --evidence-url with hosted cloud visual evidence');
  if (!args.candidate) throw new Error('promotion requires --candidate');

  const candidate = path.resolve(root, args.candidate);
  assertInsideCandidateRoot(candidate);
  if (!fs.existsSync(candidate)) throw new Error(`missing candidate: ${candidate}`);
  const source = fs.readFileSync(candidate, 'utf8');
  const exportName = moduleExportName(source);
  if (exportName !== config.exportName) {
    throw new Error(`candidate must export ${config.exportName}, found ${exportName || 'none'}`);
  }

  const output = path.join(root, config.file);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.copyFileSync(candidate, output);
  const promoted = fs.readFileSync(output);
  const sha256 = createHash('sha256').update(promoted).digest('hex');
  const { POSE_STATUS } = await import(`${pathToFileURL(statusPath).href}?t=${Date.now()}`);
  const nextStatus = {
    ...POSE_STATUS,
    [pose]: {
      status: 'accepted',
      module: `./${path.basename(config.file)}`,
      exportName: config.exportName,
      sourceClip: config.sourceClip,
      sha256,
      evidenceUrl: args['evidence-url'],
      promotedFrom: path.relative(root, candidate),
      notes: 'Promoted only after human-visible cloud acceptance.',
    },
  };
  fs.writeFileSync(statusPath, renderStatus(nextStatus));
  console.log(JSON.stringify({
    promoted: config.file,
    pose,
    sha256,
    evidenceUrl: args['evidence-url'],
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

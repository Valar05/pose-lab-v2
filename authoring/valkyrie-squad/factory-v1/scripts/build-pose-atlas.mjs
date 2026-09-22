import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPoseAtlas, readFactorySpec } from './lib/pose-atlas-factory.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specPath = process.argv[2] ?? 'factory/april.factory.json';
const spec = await readFactorySpec(root, specPath);
const { manifest } = await buildPoseAtlas({ root, spec });
console.log(`POSE_ATLAS_OK ${manifest.poseCount} poses ${manifest.atlas.bytes} bytes ${manifest.atlas.sha256}`);

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPoseAtlas, readFactorySpec, validateFactorySpec } from '../scripts/lib/pose-atlas-factory.mjs';
import { directionalBlurSamples, samplePhased, validateMotionLibrary } from '../factory/runtime/sparse-motion-runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spec = await readFactorySpec(root, 'factory/april.factory.json');
const motion = JSON.parse(await readFile(path.join(root, spec.motionLibrary), 'utf8'));
validateMotionLibrary(motion, spec.poses.map((pose) => pose.id));
const animationIds = Object.keys(motion.animations);
if (animationIds.join(',') !== Object.keys(spec.recipes).join(',')) throw new Error('atlas and motion animation IDs differ or changed order');
const project = JSON.parse(await readFile(path.join(root, 'dist/project.json'), 'utf8'));
if (new Set(project.animations.map((entry) => entry.id)).size !== animationIds.length || animationIds.some((id) => !project.animations.some((entry) => entry.id === id))) throw new Error('factory would shrink or replace the deployed animation library');

const temporary = await mkdtemp(path.join(tmpdir(), 'april-pose-factory-'));
try {
  const isolated = structuredClone(spec);
  isolated.atlas.output = path.join(temporary, 'atlas.png');
  isolated.atlas.manifest = path.join(temporary, 'atlas.json');
  const { manifest } = await buildPoseAtlas({ root, spec: isolated });
  if (manifest.atlas.bytes !== 61003 || manifest.atlas.sha256 !== '1f283f698f8ca17074ab77e832f57dc6c4697614c11e6b27747ecb252128b284') throw new Error('generic factory does not reproduce accepted April atlas exactly');
} finally {
  await rm(temporary, { recursive: true, force: true });
}

const slide = motion.animations['dodge-slide'];
const launch = samplePhased(slide, 229), glide = samplePhased(slide, 230), recovery = samplePhased(slide, 559);
if (launch.phase !== 'launch' || launch.stretch < 1.11 || launch.blur < 0.99 || glide.phase !== 'glide' || glide.blur < 0.99 || recovery.phase !== 'skid-recovery' || Math.abs(recovery.stretch - 1) > 0.001 || recovery.blur > 0.001) throw new Error('generic phased sampler changed accepted slide motion');
const trail = directionalBlurSamples(slide.motionBlur, 1);
if (trail.length !== 9 || Math.abs(trail[0].offsetPx + 36) > 0.001 || trail.some((sample) => sample.filterPx !== 2)) throw new Error('generic directional blur changed accepted slide trail');

for (const mutate of [
  (copy) => copy.poses.push(structuredClone(copy.poses[0])),
  (copy) => { copy.poses[0].alpha = 'luminance'; },
  (copy) => { copy.recipes.jab.push('missing-pose'); }
]) {
  const copy = structuredClone(spec);
  mutate(copy);
  let rejected = false;
  try { validateFactorySpec(copy); } catch { rejected = true; }
  if (!rejected) throw new Error('factory accepted a known-invalid character spec');
}

const drifted = structuredClone(spec);
drifted.sources.combat.sha256 = '0'.repeat(64);
drifted.atlas.output = path.join(tmpdir(), 'must-not-build-atlas.png');
drifted.atlas.manifest = path.join(tmpdir(), 'must-not-build-atlas.json');
let sourceDriftRejected = false;
try { await buildPoseAtlas({ root, spec: drifted }); } catch (error) { sourceDriftRejected = /source master changed/.test(String(error)); }
if (!sourceDriftRejected) throw new Error('factory accepted a drifted source hash');

console.log('FACTORY_PASS: declarative atlas and motion factories reproduce April exactly, preserve all nine animations, and reject duplicate poses, unsafe alpha, missing references, and drifted source hashes');

import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const manifestPath = 'generated/meshy-fist-authoring/manifest.json';
const sourcePath = 'public/assets/meshy/meshy_apose_walking_with_skin.glb';
const runtimePath = 'public/assets/meshy/meshy_fist_hands.glb';
const failures = [];
const fail = (message) => failures.push(message);
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

if (!existsSync(manifestPath)) fail('missing Meshy fist authoring manifest; run npm run build:fist-hands');
if (!existsSync(sourcePath)) fail(`missing Meshy source GLB: ${sourcePath}`);
if (!existsSync(runtimePath)) fail(`missing Meshy fist runtime GLB: ${runtimePath}`);

let manifest = null;
if (!failures.length) manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (manifest) {
  if (manifest.schema !== 'pose-lab-v2-meshy-fist-authoring-v1') fail('manifest schema must be pose-lab-v2-meshy-fist-authoring-v1');
  if (manifest.status !== 'quarantined-review') fail('Meshy fist asset must remain quarantined-review until human cloud acceptance');
  if (manifest.diagnostic_only !== true) fail('manifest must mark Blender output diagnostic_only');
  if (!String(manifest.geometry_policy || '').includes('actual Meshy hand-weighted vertices')) fail('manifest must state actual Meshy hand-derived geometry policy');
  if (manifest.source_glb_sha256 !== sha256(sourcePath)) fail('stale Meshy fist artifact: source GLB hash changed; rerun npm run build:fist-hands');
  if (manifest.runtime_glb_sha256 !== sha256(runtimePath)) fail('stale Meshy fist artifact: runtime GLB hash does not match manifest');
  if (manifest.runtime_parenting?.RightMeshyFistHand !== 'RightHand') fail('RightMeshyFistHand must parent to RightHand at runtime');
  if (manifest.runtime_parenting?.LeftMeshyFistHand !== 'LeftHand') fail('LeftMeshyFistHand must parent to LeftHand at runtime');
  if (!manifest.intended_rig?.mitten_chain?.includes('Mitten03')) fail('manifest must preserve the intended 3-chain mitten rig target');
  if (!manifest.intended_rig?.thumb_chain?.includes('Thumb02')) fail('manifest must preserve the intended 2-bone thumb rig target');
  if (!String(manifest.acceptance_note || '').includes('Cloud visual review')) fail('manifest must reject manifest-only visual acceptance');
  if (!Array.isArray(manifest.images) || manifest.images.length < 4) fail('Meshy fist authoring must include diagnostic Blender render views');
  if (manifest.contact_sheet !== 'contact_sheet.html') fail('Meshy fist authoring must include a contact sheet');
  for (const image of manifest.images || []) {
    const imagePath = `generated/meshy-fist-authoring/${image.path}`;
    if (!existsSync(imagePath)) fail(`missing Meshy fist diagnostic render ${imagePath}`);
  }
  if (!existsSync('generated/meshy-fist-authoring/contact_sheet.html')) fail('missing Meshy fist contact sheet');
}

if (failures.length) {
  console.error('Meshy fist authoring validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Meshy fist authoring validation passed: real Meshy-derived fist artifact is current and quarantined.');

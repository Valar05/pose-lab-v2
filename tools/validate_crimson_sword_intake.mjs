import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}
function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
}
function exists(file) {
  return fs.existsSync(path.join(root, file));
}
function readGlbJson(file) {
  const data = fs.readFileSync(path.join(root, file));
  let offset = 12;
  while (offset < data.length) {
    const length = data.readUInt32LE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    const chunk = data.slice(offset + 8, offset + 8 + length);
    if (type === 'JSON') return JSON.parse(chunk.toString('utf8').replace(/\0+$/g, '').trimEnd());
    offset += 8 + length;
  }
  throw new Error(`${file} missing JSON`);
}

const manifest = readJson('public/assets/crimson/crimson_manifest.json');
const calibration = readJson('public/assets/crimson/crimson_sword_calibration.json');
const constraints = readJson('public/assets/crimson/crimson_model_viewer_constraints.json');
const reference = readJson('public/assets/crimson/vanguard_swordattack1_reference.json');
const main = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
const pkg = readJson('package.json');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const provenance = fs.readFileSync(path.join(root, 'ASSET_PROVENANCE.md'), 'utf8');
const crimson = readGlbJson('public/assets/crimson/crimson_plume_knight_rigged_pbr.glb');
const sword = readGlbJson('public/assets/crimson/arborblade_sword.glb');

assert(exists('public/assets/crimson/crimson_plume_knight_rigged_pbr.glb'), 'missing Crimson runtime GLB');
assert(exists('public/assets/crimson/arborblade_sword.glb'), 'missing Arborblade sword runtime GLB');
assert(manifest.schema === 'pose-lab-v2-crimson-runtime-asset-v1', 'Crimson manifest schema mismatch');
assert(calibration.schema === 'pose-lab-v2-crimson-sword-calibration-v1', 'Crimson sword calibration schema mismatch');
assert(reference.schema === 'pose-lab-v2-crimson-vanguard-swordattack1-reference-v1', 'Vanguard SwordAttack1 reference schema mismatch');
assert(manifest.runtimeGlb === 'public/assets/crimson/crimson_plume_knight_rigged_pbr.glb', 'manifest runtime GLB path mismatch');
assert(manifest.swordGlb === 'public/assets/crimson/arborblade_sword.glb', 'manifest sword GLB path mismatch');
assert(manifest.skeleton?.rightHand && manifest.skeleton?.rightForeArm && manifest.skeleton?.rightArm, 'Crimson rig must expose RightArm/RightForeArm/RightHand');
assert((manifest.animations || []).some((clip) => clip.name === 'CrimsonPlumeKnight|walking|baselayer'), 'Crimson walking clip missing');
assert((manifest.animations || []).some((clip) => clip.name === 'CrimsonPlumeKnight|running|baselayer'), 'Crimson running clip missing');
assert(!(manifest.animations || []).some((clip) => /SwordAttack1/i.test(clip.name)), 'Crimson intake must not pretend it has native SwordAttack1');
assert(manifest.materialStatus?.staticCharacterPbrChannels?.baseColorTexture && manifest.materialStatus?.staticCharacterPbrChannels?.normalTexture, 'Crimson static PBR character channels not recorded');
assert(manifest.materialStatus?.swordPbrChannels?.baseColorTexture && manifest.materialStatus?.swordPbrChannels?.normalTexture, 'Arborblade PBR channels not recorded');
assert(JSON.stringify(calibration.hierarchy) === JSON.stringify(['RightHand', 'SaberGrip', 'ArborbladeSword']), 'Crimson sword hierarchy must be RightHand -> SaberGrip -> ArborbladeSword');
assert(constraints.schema === 'pose-lab-v2-crimson-model-viewer-constraints-v1', 'Crimson model-viewer constraint schema mismatch');
assert(constraints.status === 'diagnostic-only-not-visual-acceptance' && constraints.localBlenderCapture?.acceptance === false, 'Crimson model-viewer constraint must keep Blender capture diagnostic-only');
assert(JSON.stringify(constraints.hierarchy) === JSON.stringify(calibration.hierarchy), 'Crimson model-viewer constraint hierarchy must mirror sword calibration');
assert(JSON.stringify(constraints.saberGripLocal) === JSON.stringify(calibration.saberGripLocal), 'Crimson model-viewer constraint SaberGrip must mirror sword calibration');
assert(JSON.stringify(constraints.swordLocal) === JSON.stringify(calibration.swordLocal), 'Crimson model-viewer constraint swordLocal must mirror sword calibration');
assert(JSON.stringify(constraints.bladeLocalAxis) === JSON.stringify(calibration.bladeLocalAxis), 'Crimson model-viewer constraint blade axis must mirror sword calibration');
assert(JSON.stringify(constraints.camera) === JSON.stringify({ fov: 36, near: 0.01, far: 80, position: [2.8, 1.75, 4.2], target: [0, 0.95, 0], viewport: [390, 844] }), 'Crimson model-viewer constraint camera must mirror REVIEW_CAMERA_CONTRACT');
assert(JSON.stringify(calibration.bladeLocalAxis) === JSON.stringify([0, 0, 1]), 'Arborblade blade axis must be normalized to local +Z');
assert(JSON.stringify(calibration.saberGripLocal?.scale) === JSON.stringify([88, 88, 88]), 'Crimson Arborblade grip scale must compensate Crimson RightHand armature scale so the normalized real sword is visible');
assert(JSON.stringify(calibration.saberGripLocal?.rotationDeg) === JSON.stringify([96.50876, 0, -0.07512]), 'Crimson SaberGrip rotation must map the normalized +Z blade to character/world +Z from the actual RightHand basis');
assert(JSON.stringify(calibration.hiltLocalPoint) === JSON.stringify([0, 0, 0]), 'normalized Arborblade hilt anchor must be the asset origin');
assert(calibration.tipLocalPoint?.[2] > 0.3 && Math.abs(calibration.tipLocalPoint?.[0] || 0) < 0.001 && Math.abs(calibration.tipLocalPoint?.[1] || 0) < 0.001, 'normalized Arborblade tip must point forward on local +Z from the hilt origin');
assert(calibration.normalizedBounds?.dominantAxis === 'z', 'normalized Arborblade bounds must be dominant on local Z');
assert(sword.asset?.extras?.poseLabV2CrimsonSword?.normalized === true, 'Arborblade GLB must carry normalized sword metadata');
assert(main.includes('updateSaberAttachmentProof()') && main.includes('saberAttachmentStatus'), 'runtime must measure Crimson sword attachment to the hand');
assert(main.includes('supportsAttackReview: false') && main.includes('canExposeAttackReview()'), 'Crimson locomotion-only route must not expose fake Attack1 review controls');
assert(calibration.status === 'offline-socket-calibrated-not-hosted-visual-accepted', 'Crimson calibration must be socket-calibrated without claiming hosted visual acceptance');
assert(reference.sourceClip === 'SwordAttack1' && reference.policy?.role === 'reference-only', 'Vanguard SwordAttack1 must be reference-only');
assert(reference.byNode?.['Weapon.R']?.length >= 1 && reference.byNode?.['hand.fk.R']?.length >= 1, 'Vanguard reference must include Weapon.R and right hand tracks');
assert(pkg.scripts?.['build:crimson']?.includes('build_crimson_assets.mjs') && pkg.scripts?.['build:crimson']?.includes('normalize:crimson-sword'), 'build:crimson must rebuild assets and normalize the Arborblade sword');
assert(pkg.scripts?.['normalize:crimson-sword'] === 'node tools/import_crimson/normalize_crimson_sword.mjs', 'missing normalize:crimson-sword script');
assert(pkg.scripts?.['review:crimson-sword']?.includes('validate:crimson-model-viewer-constraints') && pkg.scripts?.['review:crimson-sword']?.includes('render_crimson_sword_calibration_blender.py'), 'Blender Crimson sword review must validate model-viewer constraints before rendering');
assert(pkg.scripts?.['validate:crimson-model-viewer-constraints'] === 'node tools/validate_crimson_model_viewer_constraints.mjs', 'missing Crimson model-viewer constraint validator script');
assert(pkg.scripts?.['test:crimson-model-viewer-constraints'] === 'node tools/test_crimson_model_viewer_constraints.mjs', 'missing Crimson model-viewer constraint divergence test');
assert(pkg.scripts?.['review:crimson-sword-url'] === 'node tools/crimson_sword_review_url.mjs', 'missing hosted Crimson sword review URL script');
assert(pkg.scripts?.['reference:crimson:swordattack1'] === 'node tools/import_crimson/extract_vanguard_swordattack1_reference.mjs', 'missing Crimson SwordAttack1 reference script');
assert(pkg.scripts?.['validate:crimson-sword-intake']?.includes('validate:crimson-model-viewer-constraints') && pkg.scripts?.['validate:crimson-sword-intake']?.includes('tools/validate_crimson_sword_intake.mjs'), 'Crimson intake guardrail must validate model-viewer constraints before intake checks');
assert(pkg.scripts?.['accept:crimson-sword'] === 'node tools/require_crimson_cloud_visual_evidence.mjs', 'missing Crimson cloud visual acceptance script');
assert(pkg.scripts?.['validate:crimson-sword'] === 'npm run validate:crimson-sword-intake && npm run accept:crimson-sword', 'validate:crimson-sword must require cloud visual acceptance after intake guardrails');
assert(pkg.scripts?.['test:crimson-cloud-visual-gate'] === 'node tools/test_crimson_cloud_visual_evidence_gate.mjs', 'missing Crimson cloud visual gate fixture test');
assert(main.includes("crimson: './assets/crimson/crimson_plume_knight_rigged_pbr.glb'"), 'runtime must register Crimson GLB asset');
assert(main.includes("arborblade: './assets/crimson/arborblade_sword.glb'"), 'runtime must register Arborblade sword asset');
assert(main.includes("saberAsset: ASSETS.arborblade"), 'Crimson route must select Arborblade as its saber asset');
assert(main.includes("crimson: 'crimson'") && main.includes("'crimson-knight': 'crimson'"), 'Crimson aliases missing');
assert(main.includes('activeSaberGripLocal()'), 'runtime must use per-character saber grip calibration');
assert(main.includes('activeSwordLocal()') && main.includes('sabreRoot.position.fromArray(swordLocal.position)'), 'runtime must apply swordLocal from the Crimson calibration instead of forcing identity');
assert(readme.includes('?model=crimson'), 'README must document Crimson route');
assert(provenance.includes('Crimson Plume Knight / Arborblade'), 'asset provenance must document Crimson and Arborblade');
assert((crimson.animations || []).length === 2, 'Crimson runtime GLB must contain walking and running only');
assert((sword.materials || []).some((material) => material.name === 'Arborblade_PBR'), 'Arborblade runtime material must be named');

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, checks: 40, manifest: manifest.runtimeGlb, sword: manifest.swordGlb, referenceClip: reference.sourceClip, bladeLocalAxis: calibration.bladeLocalAxis }, null, 2));

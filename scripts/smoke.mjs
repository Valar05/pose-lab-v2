import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const main = read('src/main.js');
const readyPose = read('src/ready-pose.js');
const fistReadyPose = read('src/fist-ready-pose.js');
const poseStatusSource = read('src/pose-status.js');
const reviewConstantsSource = read('src/review-constants.js');
const attackCandidateSource = read('src/review-candidates/attack1-candidate-1.js');
const attack2CandidateSource = read('src/review-candidates/attack2-candidate-1.js');
const fistReadyCandidateSource = read('src/review-candidates/fist-ready-candidate-1.js');
const fistAttack1CandidateSource = read('src/review-candidates/fist-attack1-candidate-1.js');
const tipBasisCandidateSource = read('src/review-candidates/attack1-tip-basis-2.js');
const jointPinnedCandidateSource = read('src/review-candidates/attack1-joint-pinned-3.js');
const davinLowBackKickCandidateSource = read('src/review-candidates/davin-lowbackkick-ares-transfer-1.js');
const davinIdleCandidateSource = read('src/review-candidates/davin-idle-screenshot-1.js');
const crimsonLightAttackCandidateSource = read('src/review-candidates/crimson-light-attack1-vanguard-2.js');
const attackReviewUrls = read('tools/attack1_review_urls.mjs');
const attack2ReviewUrls = read('tools/attack2_review_urls.mjs');
const fistAttack1ReviewUrls = read('tools/fist_attack1_review_urls.mjs');
const combinedAttackReviewUrls = read('tools/attack_review_urls.mjs');
const html = read('index.html');
const css = read('src/styles.css');
const readme = read('README.md');
const visualDoctrine = read('docs/VISUAL_VERIFICATION_DOCTRINE.md');
const pkg = JSON.parse(read('package.json'));
const vanguardManifest = JSON.parse(read('public/assets/vanguard/vanguard_manifest.json'));
const vanguardRootMotion = JSON.parse(read('public/assets/vanguard/vanguard_root_motion.json'));
const crimsonManifest = JSON.parse(read('public/assets/crimson/crimson_manifest.json'));
const crimsonSwordCalibration = JSON.parse(read('public/assets/crimson/crimson_sword_calibration.json'));
const crimsonModelViewerConstraints = JSON.parse(read('public/assets/crimson/crimson_model_viewer_constraints.json'));
const crimsonVanguardAttackReference = JSON.parse(read('public/assets/crimson/vanguard_swordattack1_reference.json'));
const crimsonLightAttackBaseline = JSON.parse(read('public/assets/crimson/crimson_light_attack1_weapon_baseline.json'));
const importFromRegex = /from\s+['"]([^'"]+)['"]/g;
const moduleExportRegex = /export const \w+ = (.*);\s*$/s;

function parseExportedObject(source, label) {
  const match = source.match(moduleExportRegex);
  assert(Boolean(match), `${label} must export a plain object literal`);
  if (!match) return {};
  return JSON.parse(match[1]);
}

const readyPreset = parseExportedObject(readyPose, 'Ready pose preset');
const fistReadyPreset = parseExportedObject(fistReadyPose, 'FistReady pose preset');
const poseStatus = parseExportedObject(poseStatusSource, 'Pose status manifest');
const attackCandidate = parseExportedObject(attackCandidateSource, 'Attack1 candidate preview');
const attack2Candidate = parseExportedObject(attack2CandidateSource, 'Attack2 candidate preview');
const fistReadyCandidate = parseExportedObject(fistReadyCandidateSource, 'FistReady candidate preview');
const fistAttack1Candidate = parseExportedObject(fistAttack1CandidateSource, 'FistAttack1 candidate preview');
const tipBasisCandidate = parseExportedObject(tipBasisCandidateSource, 'Attack1 tip-basis candidate preview');
const jointPinnedCandidate = parseExportedObject(jointPinnedCandidateSource, 'Attack1 joint-pinned candidate preview');
const davinLowBackKickCandidate = parseExportedObject(davinLowBackKickCandidateSource, 'Davin LowBackKick candidate preview');
const davinIdleCandidate = parseExportedObject(davinIdleCandidateSource, 'Davin screenshot idle candidate preview');
const crimsonLightAttackCandidate = parseExportedObject(crimsonLightAttackCandidateSource, 'Crimson light Attack1 candidate preview');

if (exists('generated/davin-tail-authoring/manifest.json')) {
  const davinTailManifest = JSON.parse(read('generated/davin-tail-authoring/manifest.json'));
  assert(davinTailManifest.schema === 'pose-lab-v2-davin-tail3-authoring-v1', 'Davin tail manifest must use the tail3 authoring schema');
  assert(davinTailManifest.runtimeGlb === 'public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb', 'Davin tail manifest must point at the tail3 runtime GLB');
  assert(JSON.stringify(davinTailManifest.springBoneIntent?.chain || []) === JSON.stringify(['Tail01', 'Tail02', 'Tail03']), 'Davin tail manifest must declare Tail01/Tail02/Tail03 spring-bone intent');
  assert(davinTailManifest.weightReport?.selectedVertices >= 80 && davinTailManifest.weightReport?.selectedVertices <= 500, 'Davin tail mask must select a bounded tail/plume region, not zero vertices or the whole body');
}
const trackedCandidateFiles = execFileSync('git', ['ls-files', 'generated/pose-candidates'], {
  cwd: root,
  encoding: 'utf8',
}).trim();

function assertRelativeImportsResolve(file) {
  const source = read(file);
  for (const match of source.matchAll(importFromRegex)) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) continue;
    const resolved = path.normalize(path.join(path.dirname(file), specifier));
    assert(exists(resolved), `${file} imports missing relative module ${specifier} -> ${resolved}`);
  }
}

assert(exists('public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr.glb'), 'missing merged Davin Wingsworth Kestrel Man rigged PBR source GLB; run npm run build:davin');
assert(exists('public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb'), 'missing Davin Tail01/Tail02/Tail03 derived runtime GLB; run npm run build:davin-tail3');
assert(exists('public/assets/meshy/meshy_apose_walking_with_skin.glb'), 'missing Meshy A-pose/walking GLB');
assert(exists('public/assets/meshy/meshy_real_sabre.glb'), 'missing real sabre GLB');
assert(exists('public/assets/meshy/meshy_fist_hands.glb'), 'missing Meshy-derived fist hands GLB; run npm run build:fist-hands');
assert(exists('public/assets/ares/ares_rigged_diffuse.glb'), 'missing imported rigged Ares GLB');
assert(exists('public/assets/ares/ares_texture_0.png'), 'missing imported Ares diffuse texture sidecar');
assert(exists('public/assets/ares/security_titan_rigged_diffuse.glb'), 'missing imported rigged SecurityTitan GLB');
assert(exists('public/assets/ares/security_titan_texture_0.png'), 'missing imported SecurityTitan diffuse texture sidecar');
assert(exists('public/assets/vanguard/vanguard_rigged_animations.glb'), 'missing imported Vanguard runtime GLB exported from Downloads/Vanguard.blend');
assert(exists('public/assets/vanguard/vanguard_manifest.json'), 'missing imported Vanguard runtime manifest');
assert(exists('public/assets/vanguard/vanguard_root_motion.json'), 'missing imported Vanguard root motion sidecar');
assert(exists('public/assets/crimson/crimson_plume_knight_rigged_pbr.glb'), 'missing Crimson Plume Knight rigged PBR runtime GLB; run npm run build:crimson');
assert(exists('public/assets/crimson/arborblade_sword.glb'), 'missing Arborblade real sword runtime GLB; run npm run build:crimson');
assert(exists('public/assets/crimson/crimson_manifest.json'), 'missing Crimson runtime manifest');
assert(exists('public/assets/crimson/crimson_sword_calibration.json'), 'missing Crimson sword calibration');
assert(exists('public/assets/crimson/vanguard_swordattack1_reference.json'), 'missing Vanguard SwordAttack1 reference for Crimson; run npm run reference:crimson:swordattack1');
assert(exists('public/assets/crimson/crimson_light_attack1_weapon_baseline.json'), 'missing Crimson light Attack1 saved weapon baseline');
assert(exists('public/assets/crimson/crimson_model_viewer_constraints.json'), 'missing Crimson model-viewer constraint contract');
for (const texture of [
  'base_color.jpg',
  'emissive.jpg',
  'metallic_roughness.jpg',
  'normal.png',
]) {
  assert(exists(`public/assets/meshy/character_sheet_pbr/${texture}`), `missing salvaged Meshy Character Sheet PBR texture: ${texture}`);
}
assert(html.includes("import(`./src/main.js${startupSuffix}`)"), 'HTML must load the minimal app entry with the page cacheBust');
assert(html.includes("stylesheet.href = `./src/styles.css${startupSuffix}`"), 'HTML must load CSS with the page cacheBust');
assert(html.includes('loading Davin Wingsworth and real sabre'), 'HTML shell must not be blank before JS boots');
assert(!html.includes('src="/src/main.js"'), 'GitHub Pages build must not use a root-relative module path');
assert(html.includes("new URLSearchParams(window.location.search)") && html.includes("startupParams.get('cacheBust')"), 'HTML boot must propagate cacheBust into subresources');
assert(html.includes('"three": "./vendor/three/build/three.module.js"'), 'HTML must use same-origin vendored Three dependency');
assert(html.includes('"three/examples/jsm/": "./vendor/three/examples/jsm/"'), 'HTML must use same-origin vendored Three examples');
assert(!html.includes('cdn.jsdelivr.net'), 'runtime must not depend on a CDN before the app can render');
assert(!pkg.dependencies, 'repo must not require npm install dependencies for local build');
assert(pkg.scripts?.build === 'node scripts/build.mjs', 'build must be static and native-binary free');
assert(pkg.scripts?.['build:davin'] === 'node tools/build_davin_wingsworth_glb.mjs', 'Davin merged GLB build must be reproducible');
assert(pkg.scripts?.['inspect:vanguard'] === 'node scripts/run-blender-tool.mjs tools/import_vanguard/inspect_vanguard_blend.py --', 'Vanguard blend inspection must be reproducible');
assert(pkg.scripts?.['root-motion:vanguard'] === 'node scripts/run-blender-tool.mjs tools/import_vanguard/export_vanguard_root_motion.py --', 'Vanguard root motion extraction must be reproducible');
assert(pkg.scripts?.['build:vanguard'] === 'node scripts/run-blender-tool.mjs tools/import_vanguard/export_vanguard_glb.py -- && node scripts/run-blender-tool.mjs tools/import_vanguard/export_vanguard_root_motion.py --', 'Vanguard GLB export plus root motion extraction must be reproducible');
assert(pkg.scripts?.['build:crimson']?.includes('build_crimson_assets.mjs') && pkg.scripts?.['build:crimson']?.includes('normalize:crimson-sword'), 'Crimson build must rebuild assets and normalize Arborblade offline');
assert(pkg.scripts?.['normalize:crimson-sword'] === 'node tools/import_crimson/normalize_crimson_sword.mjs', 'Crimson normalized sword intake must be reproducible');
assert(pkg.scripts?.['review:crimson-sword']?.includes('validate:crimson-model-viewer-constraints') && pkg.scripts?.['review:crimson-sword']?.includes('render_crimson_sword_calibration_blender.py'), 'Crimson sword offline Blender review must validate model-viewer constraints before rendering');
assert(pkg.scripts?.['validate:crimson-model-viewer-constraints'] === 'node tools/validate_crimson_model_viewer_constraints.mjs', 'Crimson model-viewer constraint validator must be explicit');
assert(pkg.scripts?.['test:crimson-model-viewer-constraints'] === 'node tools/test_crimson_model_viewer_constraints.mjs', 'Crimson model-viewer divergence test must be explicit');
assert(pkg.scripts?.['test:crimson-review-surface'] === 'node tools/test_crimson_review_surface.mjs', 'Crimson review surface test must be explicit');
assert(pkg.scripts?.['review:crimson-sword-url'] === 'node tools/crimson_sword_review_url.mjs', 'Crimson cloud review URL printer must be explicit');
assert(pkg.scripts?.['reference:crimson:swordattack1'] === 'node tools/import_crimson/extract_vanguard_swordattack1_reference.mjs', 'Crimson SwordAttack1 Vanguard reference extraction must be reproducible');
assert(pkg.scripts?.['validate:crimson-sword-intake']?.includes('validate:crimson-model-viewer-constraints') && pkg.scripts?.['validate:crimson-sword-intake']?.includes('tools/validate_crimson_sword_intake.mjs'), 'Crimson sword intake guardrail must validate model-viewer constraints before intake checks');
assert(pkg.scripts?.['accept:crimson-sword'] === 'node tools/require_crimson_cloud_visual_evidence.mjs', 'Crimson sword visual acceptance must require cloud screenshot evidence');
assert(pkg.scripts?.['validate:crimson-sword'] === 'npm run validate:crimson-sword-intake && npm run accept:crimson-sword', 'validate:crimson-sword must not pass without cloud visual acceptance');
assert(pkg.scripts?.['test:crimson-cloud-visual-gate'] === 'node tools/test_crimson_cloud_visual_evidence_gate.mjs', 'Crimson visual gate fixture test must exist');
assert(pkg.scripts?.['build:davin-tail3'] === 'node scripts/run-blender-tool.mjs tools/author_davin_tail_chain_blender.py --', 'Davin Tail01/Tail02/Tail03 chain authoring must be reproducible');
assert(pkg.scripts?.['bake:davin-idle'] === 'node scripts/run-blender-tool.mjs tools/author_davin_idle_screenshot_blender.py --', 'Davin screenshot idle candidate bake must be reproducible');
assert(pkg.scripts?.['review:davin-idle'] === 'node scripts/render-davin-idle-diagnostic.mjs', 'Davin screenshot idle diagnostic render must be reproducible');
assert(pkg.scripts?.['bake:ready'] === 'node scripts/bake-ready-pose.mjs', 'Ready pose bake script must be explicit and reproducible');
assert(pkg.scripts?.['bake:attack1:candidate'] === 'node scripts/bake-attack1-candidate.mjs', 'Attack1 candidate bake must be explicit and quarantine-only');
assert(pkg.scripts?.['bake:attack1:tip-match'] === 'node scripts/bake-attack1-tip-match-candidate.mjs', 'Attack1 tip-match candidate bake must be explicit and quarantine-only');
assert(pkg.scripts?.['bake:attack1:tip-basis'] === 'node scripts/bake-attack1-tip-basis-candidate.mjs', 'Attack1 tip-basis candidate bake must be explicit and quarantine-only');
assert(pkg.scripts?.['bake:attack1:joint-pinned'] === 'node scripts/bake-attack1-joint-pinned-candidate.mjs', 'Attack1 joint-pinned candidate bake must be explicit and quarantine-only');
assert(pkg.scripts?.['bake:attack2:candidate'] === 'node scripts/bake-attack2-candidate.mjs', 'Attack2 candidate bake must be explicit and quarantine-only');
assert(pkg.scripts?.['bake:fist-ready'] === 'node scripts/bake-fist-ready-pose.mjs', 'FistReady bake must be explicit and separate from one-hand Ready');
assert(pkg.scripts?.['bake:fist-attack1:candidate'] === 'node scripts/bake-fist-attack1-candidate.mjs', 'FistAttack1 candidate bake must be explicit and quarantine-only');
assert(pkg.scripts?.['bake:davin-lowbackkick'] === 'node scripts/bake-davin-lowbackkick-candidate.mjs', 'Davin LowBackKick candidate bake must be explicit and quarantine-only');
assert(pkg.scripts?.['review:davin-lowbackkick'] === 'node scripts/render-davin-lowbackkick-contact-sheet.mjs', 'Davin LowBackKick contact sheet review must be an explicit diagnostic script');
assert(pkg.scripts?.['reference:attack1:fps'] === 'node scripts/fps-attack1-reference.mjs', 'FPS Attack1 reference extraction must be explicit and separate from Meshy authoring');
assert(pkg.scripts?.['reference:fist:fps'] === 'node scripts/fps-fist-reference.mjs', 'FPS fist reference extraction must be explicit before judging Meshy fist poses');
assert(!pkg.scripts?.['bake:attack1'] && !pkg.scripts?.['diagnose:blade'], 'official scripts must not regenerate or bless the quarantined Attack1 pose');
assert(pkg.scripts?.['promote:animation'] === 'node tools/promote_animation_candidate.mjs', 'animation promotion must use the explicit promotion gate');
assert(pkg.scripts?.['review:attack1'] === 'node tools/attack1_review_urls.mjs', 'Attack1 review URLs must remain available');
assert(pkg.scripts?.['review:attack2'] === 'node tools/attack2_review_urls.mjs', 'Attack2 review URLs must remain available');
assert(pkg.scripts?.['review:fist-attack1'] === 'node tools/fist_attack1_review_urls.mjs', 'FistAttack1 review URLs must remain available');
assert(pkg.scripts?.['review:attacks'] === 'node tools/attack_review_urls.mjs', 'combined Attack review URL printer must remain available');
assert(exists('tools/promote_animation_candidate.mjs'), 'missing animation promotion gate');
assert(exists('tools/attack1_review_urls.mjs'), 'missing Attack1 review URL printer');
assert(exists('tools/attack_review_urls.mjs'), 'missing combined Attack review URL printer');
assert(exists('scripts/bake-attack1-candidate.mjs'), 'missing Attack1 candidate bake script');
assert(exists('scripts/bake-attack1-tip-match-candidate.mjs'), 'missing Attack1 tip-match candidate bake script');
assert(exists('scripts/bake-attack1-tip-basis-candidate.mjs'), 'missing Attack1 tip-basis candidate bake script');
assert(exists('scripts/bake-attack1-joint-pinned-candidate.mjs'), 'missing Attack1 joint-pinned candidate bake script');
assert(exists('scripts/bake-attack2-candidate.mjs'), 'missing Attack2 candidate bake script');
assert(exists('scripts/bake-fist-ready-pose.mjs'), 'missing FistReady bake script');
assert(exists('scripts/bake-fist-attack1-candidate.mjs'), 'missing FistAttack1 candidate bake script');
assert(exists('scripts/fps-attack1-reference.mjs'), 'missing FPS Attack1 reference extractor');
assert(exists('scripts/fps-fist-reference.mjs'), 'missing FPS fist reference extractor');
assert(exists('scripts/bake-davin-lowbackkick-candidate.mjs'), 'missing Davin LowBackKick candidate bake script');
assert(exists('scripts/render-davin-lowbackkick-contact-sheet.mjs'), 'missing Davin LowBackKick contact-sheet orchestrator');
assert(exists('tools/author_davin_tail_chain_blender.py'), 'missing Davin Tail01/Tail02/Tail03 authoring tool');
assert(exists('tools/author_davin_idle_screenshot_blender.py'), 'missing Davin screenshot idle authoring tool');
assert(exists('tools/stitch_davin_idle_diagnostic.py'), 'missing Davin screenshot idle side-by-side diagnostic stitcher');
assert(exists('scripts/render-davin-idle-diagnostic.mjs'), 'missing Davin screenshot idle diagnostic orchestrator');
assert(exists('tools/render_davin_lowbackkick_blender.py'), 'missing Davin LowBackKick Blender diagnostic renderer');
assert(exists('tools/stitch_davin_lowbackkick_contact_sheet.py'), 'missing Davin LowBackKick contact-sheet stitcher');
assert(exists('authoring/meshy_fist/blender_build_meshy_fist_authoring.py'), 'missing Blender-first Meshy fist authoring script');
assert(exists('scripts/build-meshy-fist-authoring.mjs'), 'missing Meshy fist authoring runner');
assert(exists('tools/validate_meshy_fist_authoring.mjs'), 'missing Meshy fist authoring validator');
assert(exists('tools/import_vanguard/inspect_vanguard_blend.py'), 'missing Vanguard blend inspection tool');
assert(exists('tools/import_vanguard/export_vanguard_glb.py'), 'missing Vanguard GLB export tool');
assert(exists('tools/import_vanguard/export_vanguard_root_motion.py'), 'missing Vanguard root motion export tool');
assert(exists('tools/import_crimson/build_crimson_assets.mjs'), 'missing Crimson import build tool');
assert(exists('tools/import_crimson/extract_vanguard_swordattack1_reference.mjs'), 'missing Crimson Vanguard SwordAttack1 reference extraction tool');
assert(exists('tools/validate_crimson_sword_intake.mjs'), 'missing Crimson sword intake validator');
assert(exists('tools/validate_crimson_model_viewer_constraints.mjs'), 'missing Crimson model-viewer constraint validator');
assert(exists('tools/test_crimson_model_viewer_constraints.mjs'), 'missing Crimson model-viewer constraint divergence test');
assert(exists('tools/test_crimson_review_surface.mjs'), 'missing Crimson review surface model-switch test');
assert(exists('tools/require_crimson_cloud_visual_evidence.mjs'), 'missing Crimson cloud visual evidence gate');
assert(exists('tools/crimson_sword_review_url.mjs'), 'missing Crimson cloud review URL helper');
assert(exists('tools/test_crimson_cloud_visual_evidence_gate.mjs'), 'missing Crimson cloud visual evidence gate fixture test');
assert(vanguardManifest.schema === 'pose-lab-v2-vanguard-runtime-asset-v1', 'Vanguard manifest must use the runtime asset schema');
assert(vanguardManifest.sourceBlend === '/storage/emulated/0/Download/Vanguard.blend', 'Vanguard manifest must preserve the Downloads source blend path');
assert(vanguardManifest.runtimeGlb === 'public/assets/vanguard/vanguard_rigged_animations.glb', 'Vanguard manifest must point at the runtime GLB');
assert(vanguardManifest.selectedObjects?.join(',') === 'Body,Long_Sword,rig', 'Vanguard export must include only Body, Long_Sword, and rig from the source blend');
assert(vanguardManifest.animations?.length === 20 && vanguardManifest.animations.some((clip) => clip.name === 'SwordAttack1') && vanguardManifest.animations.some((clip) => clip.name === 'Idle'), 'Vanguard manifest must preserve the 20 embedded source actions');
assert(vanguardManifest.textureStatus?.missingExternalTexturePaths?.length === 2, 'Vanguard manifest must record the two missing external texture paths');
assert(vanguardManifest.textureStatus?.generatedPalette?.lightBluePlates === '#75c9ff' && vanguardManifest.textureStatus?.generatedPalette?.darkGreenUnderarmor === '#123f2f' && vanguardManifest.textureStatus?.generatedPalette?.redHelmetFeathers === '#c92f2f' && vanguardManifest.textureStatus?.generatedPalette?.cyanEyeholes === '#36fff3', 'Vanguard manifest must record the generated fallback palette');
assert(vanguardManifest.rootMotion?.sidecar === 'public/assets/vanguard/vanguard_root_motion.json' && vanguardManifest.rootMotion?.applyInPoseLab === false, 'Vanguard manifest must point at a non-applied root motion sidecar');
assert(vanguardRootMotion.schema === 'pose-lab-v2-vanguard-root-motion-v1' && vanguardRootMotion.applyInPoseLab === false, 'Vanguard root motion sidecar must declare non-applied root motion');
assert(vanguardRootMotion.actions?.length === 20 && vanguardRootMotion.actions.some((clip) => clip.name === 'RunForwardOld' && clip.hasRootMotion && Math.abs(clip.totalDelta?.[1]) > 4), 'Vanguard root motion must preserve meaningful RunForwardOld travel');
assert(vanguardRootMotion.actions.some((clip) => clip.name === 'SwordAttack1' && clip.hasRootMotion), 'Vanguard root motion must preserve sword attack travel for game use');
assert(crimsonManifest.schema === 'pose-lab-v2-crimson-runtime-asset-v1', 'Crimson manifest must use the runtime asset schema');
assert(crimsonManifest.runtimeGlb === 'public/assets/crimson/crimson_plume_knight_rigged_pbr.glb', 'Crimson manifest must point at the runtime GLB');
assert(crimsonManifest.swordGlb === 'public/assets/crimson/arborblade_sword.glb', 'Crimson manifest must point at the Arborblade sword GLB');
assert(crimsonManifest.skeleton?.rightHand && crimsonManifest.skeleton?.rightForeArm && crimsonManifest.skeleton?.rightArm, 'Crimson rig must expose RightArm, RightForeArm, and RightHand for sword attack authoring');
assert(crimsonManifest.animations?.some((clip) => clip.name === 'CrimsonPlumeKnight|walking|baselayer') && crimsonManifest.animations?.some((clip) => clip.name === 'CrimsonPlumeKnight|running|baselayer'), 'Crimson runtime GLB must preserve walking and running clips');
assert(!crimsonManifest.animations?.some((clip) => /SwordAttack1/i.test(clip.name)), 'Crimson intake must not claim a native SwordAttack1 clip');
assert(crimsonManifest.materialStatus?.staticCharacterPbrChannels?.baseColorTexture && crimsonManifest.materialStatus?.staticCharacterPbrChannels?.metallicRoughnessTexture && crimsonManifest.materialStatus?.staticCharacterPbrChannels?.normalTexture && crimsonManifest.materialStatus?.staticCharacterPbrChannels?.emissiveTexture, 'Crimson manifest must record full static character PBR channels');
assert(crimsonManifest.materialStatus?.swordPbrChannels?.baseColorTexture && crimsonManifest.materialStatus?.swordPbrChannels?.metallicRoughnessTexture && crimsonManifest.materialStatus?.swordPbrChannels?.normalTexture && crimsonManifest.materialStatus?.swordPbrChannels?.emissiveTexture, 'Crimson manifest must record full Arborblade PBR channels');
assert(crimsonSwordCalibration.schema === 'pose-lab-v2-crimson-sword-calibration-v1' && crimsonSwordCalibration.status === 'offline-socket-calibrated-not-hosted-visual-accepted', 'Crimson sword calibration must be explicit, socket-calibrated, and not accepted as hosted visual truth');
assert(JSON.stringify(crimsonSwordCalibration.hierarchy) === JSON.stringify(['RightHand', 'SaberGrip', 'ArborbladeSword']), 'Crimson sword hierarchy must remain RightHand -> SaberGrip -> ArborbladeSword');
assert(crimsonModelViewerConstraints.schema === 'pose-lab-v2-crimson-model-viewer-constraints-v1' && crimsonModelViewerConstraints.status === 'diagnostic-only-not-visual-acceptance', 'Crimson model-viewer constraints must be explicit and diagnostic-only');
assert(JSON.stringify(crimsonModelViewerConstraints.hierarchy) === JSON.stringify(crimsonSwordCalibration.hierarchy), 'Crimson model-viewer constraints must mirror the sword hierarchy');
assert(JSON.stringify(crimsonModelViewerConstraints.saberGripLocal) === JSON.stringify(crimsonSwordCalibration.saberGripLocal), 'Crimson model-viewer constraints must mirror SaberGrip calibration');
assert(JSON.stringify(crimsonModelViewerConstraints.swordLocal) === JSON.stringify(crimsonSwordCalibration.swordLocal), 'Crimson model-viewer constraints must mirror swordLocal calibration');
assert(JSON.stringify(crimsonModelViewerConstraints.camera) === JSON.stringify({ fov: 36, near: 0.01, far: 80, position: [2.8, 1.75, 4.2], target: [0, 0.95, 0], viewport: [390, 844] }), 'Crimson model-viewer constraints must mirror REVIEW_CAMERA_CONTRACT');
assert(crimsonModelViewerConstraints.localBlenderCapture?.mustValidateBeforeRender === true && crimsonModelViewerConstraints.localBlenderCapture?.acceptance === false, 'Crimson local Blender capture must fail closed and remain diagnostic-only');
assert(JSON.stringify(crimsonSwordCalibration.bladeLocalAxis) === JSON.stringify([0, 0, 1]), 'Crimson Arborblade blade axis must stay normalized to local +Z');
assert(JSON.stringify(crimsonSwordCalibration.saberGripLocal?.scale) === JSON.stringify([1, 1, 1]), 'Crimson SaberGrip must stay an unscaled RightHand child; scale belongs on the sword mesh, not the bone');
assert(JSON.stringify(crimsonSwordCalibration.swordLocal?.scale) === JSON.stringify([88, 88, 88]), 'Crimson Arborblade sword mesh scale must compensate Crimson RightHand armature units so the normalized real sword is visible');
assert(JSON.stringify(crimsonSwordCalibration.saberGripLocal?.rotationDeg) === JSON.stringify([-15.898, 51.654, 83.103]), 'Crimson SaberGrip rotation must map the normalized +Z blade to character/world +Z');
assert(JSON.stringify(crimsonSwordCalibration.hiltLocalPoint) === JSON.stringify([0, 0, 0]), 'Crimson Arborblade hilt anchor must be the normalized origin');
assert(crimsonSwordCalibration.tipLocalPoint?.[2] > 0.5 && crimsonSwordCalibration.pommelLocalPoint?.[2] < 0, 'Crimson Arborblade pivot must be at the hilt top with blade tip forward on local +Z and pommel behind the grip');
assert(crimsonVanguardAttackReference.schema === 'pose-lab-v2-crimson-vanguard-swordattack1-reference-v1' && crimsonVanguardAttackReference.sourceClip === 'SwordAttack1', 'Crimson Vanguard reference must identify SwordAttack1');
assert(crimsonVanguardAttackReference.policy?.role === 'reference-only' && crimsonVanguardAttackReference.byNode?.['Weapon.R']?.length >= 1 && crimsonVanguardAttackReference.byNode?.['hand.fk.R']?.length >= 1, 'Vanguard SwordAttack1 reference must stay reference-only and include Weapon.R/right-hand tracks');
assert(crimsonLightAttackCandidate.id === 'crimson-light-attack1-vanguard-2' && crimsonLightAttackCandidate.source?.character === 'crimson', 'Crimson light Attack1 candidate must target Crimson with a stable v2 id');
assert(crimsonLightAttackCandidate.source?.policy?.forbiddenUse?.includes('Do not copy Vanguard Weapon.R'), 'Crimson light Attack1 candidate must preserve the no direct Weapon.R copy policy');
assert(crimsonLightAttackBaseline.schema === 'pose-lab-v2-crimson-light-attack1-weapon-baseline-v1' && JSON.stringify(crimsonLightAttackBaseline.saberGripLocal) === JSON.stringify(crimsonLightAttackCandidate.source?.savedWeapon?.saberGripLocal), 'Crimson light Attack1 candidate must use the saved user weapon baseline');
assert(crimsonLightAttackCandidate.source?.savedWeapon?.bladeLocalAxis?.join(',') === '0,0,1', 'Crimson light Attack1 candidate must preserve Arborblade +Z blade axis');
assert(crimsonLightAttackCandidate.frames?.length === 5 && crimsonLightAttackCandidate.frames.some((frame) => frame.label === 'contact'), 'Crimson light Attack1 candidate must include the five review frames and contact frame');
assert(crimsonLightAttackCandidate.guardReport?.crimsonLightAttack1V2?.status === 'PASS', 'Crimson light Attack1 v2 candidate generator guard must pass');
assert((crimsonLightAttackCandidate.guardReport?.crimsonLightAttack1V2?.report || []).find((entry) => entry.label === 'contact')?.bladeAngleErrorDeg <= 7, 'Crimson light Attack1 contact frame must point Arborblade world-forward');
assert(crimsonLightAttackCandidate.guardReport?.crimsonLightAttack1V2?.bodyTravelDeg?.Hips >= 14 && crimsonLightAttackCandidate.guardReport?.crimsonLightAttack1V2?.bodyTravelDeg?.LeftUpLeg >= 3 && crimsonLightAttackCandidate.guardReport?.crimsonLightAttack1V2?.bodyTravelDeg?.RightArm >= 40, 'Crimson light Attack1 v2 must prove full-body movement, not upper-body-only wrap');
assert(reviewConstantsSource.includes('crimson-light-attack1-vanguard-2') && !reviewConstantsSource.includes('crimson-light-attack1-vanguard-1') && reviewConstantsSource.includes('characterKey: "crimson"'), 'Attack1 review registry must expose only Crimson light Attack1 v2 as the active Crimson candidate');
assert(main.includes('explicitCandidateReview') && main.includes('supportsAttackReview: true'), 'Runtime must allow explicit Crimson attack review without enabling baked pose states');
assert(attackReviewUrls.includes('crimson-light-attack1-vanguard-2') && !attackReviewUrls.includes('crimson-light-attack1-vanguard-1') && attackReviewUrls.includes("model: 'crimson'"), 'Attack1 cloud review URLs must include only the Crimson light Attack1 v2 candidate');
assert(attackReviewUrls.includes('wakeBrowser: false') && !attackReviewUrls.includes('termux-open-url') && !attackReviewUrls.includes('am start'), 'Attack1 review URL printer must output exact URLs only and never wake a browser');
assert(attackReviewUrls.includes('attack1-candidate-1') && attackReviewUrls.includes('attack1-joint-pinned-3') && attackReviewUrls.includes('worldSocket') && !attackReviewUrls.includes('attack1-tip-basis-2') && !attackReviewUrls.includes('attack1-tip-match-1') && attackReviewUrls.includes('anticipation') && attackReviewUrls.includes('contact') && attackReviewUrls.includes('recoil'), 'Attack1 review URLs must target candidate prime keys and joint-pinned world-socket overlay URLs');
assert(attack2ReviewUrls.includes('attack2-candidate-1') && attack2ReviewUrls.includes("pose: 'attack2'") && attack2ReviewUrls.includes('backhandPrep') && attack2ReviewUrls.includes('contactHold'), 'Attack2 review URLs must target the combo backhand candidate and its prime keys');
assert(fistAttack1ReviewUrls.includes('fist-ready-candidate-1') && fistAttack1ReviewUrls.includes('fist-attack1-candidate-1') && fistAttack1ReviewUrls.includes('weaponless FPSPlayer FistReady baseline') && fistAttack1ReviewUrls.includes('windup') && fistAttack1ReviewUrls.includes('contact') && fistAttack1ReviewUrls.includes("view: 'fpv'"), 'FistAttack1 review URLs must target the weaponless FistReady baseline and fist candidate prime keys');
assert(combinedAttackReviewUrls.includes('attack1_review_urls.mjs') && combinedAttackReviewUrls.includes('attack2_review_urls.mjs') && combinedAttackReviewUrls.includes('wakeBrowser: false'), 'combined Attack review URL printer must aggregate Attack1 and Attack2 without waking a browser');
assert(!exists('src/attack1-pose.js'), 'contaminated Attack1 generated pose data must not be shipped as repo truth');
assert(exists('src/review-candidates/attack1-candidate-1.js'), 'Attack1 candidate 1 must be available as a preview module');
assert(exists('src/review-candidates/attack1-tip-match-1.js'), 'Attack1 tip-match candidate 1 must be available as a preview module');
assert(exists('src/review-candidates/attack1-tip-basis-2.js'), 'Attack1 tip-basis candidate 2 must be available as a preview module');
assert(exists('src/review-candidates/attack1-joint-pinned-3.js'), 'Attack1 joint-pinned candidate 3 must be available as a preview module');
assert(exists('src/review-candidates/attack2-candidate-1.js'), 'Attack2 candidate 1 must be available as a preview module');
assert(exists('src/fist-ready-pose.js'), 'FistReady pose preset must be available as a generated baseline');
assert(exists('src/review-candidates/fist-ready-candidate-1.js'), 'FistReady candidate 1 must be available as a weaponless preview module');
assert(exists('src/review-candidates/fist-attack1-candidate-1.js'), 'FistAttack1 candidate 1 must be available as a weaponless preview module');
assert(exists('src/review-candidates/davin-lowbackkick-ares-transfer-1.js'), 'Davin LowBackKick Ares transfer candidate must be available as a preview module');
assert(exists('src/review-candidates/davin-idle-screenshot-1.js'), 'Davin screenshot idle candidate must be available as a preview module');
assert(!trackedCandidateFiles, `generated pose candidates must not be tracked on main: ${trackedCandidateFiles}`);
assert(poseStatus.ready?.status === 'accepted', 'Ready must be explicitly accepted in pose-status.js');
assert(poseStatus.ready?.module === './ready-pose.js' && poseStatus.ready?.exportName === 'READY_POSE_PRESET', 'Ready status must point to the accepted Ready module');
assert(createHash('sha256').update(readyPose).digest('hex') === poseStatus.ready?.sha256, 'Ready pose hash must match pose-status.js');
assert(poseStatus.attack1?.status === 'quarantined' && poseStatus.attack1?.fallback === 'ready', 'Attack1 must stay quarantined with Ready fallback until promoted');
assert(attackCandidate.schema === 'pose-lab-v2-attack-candidate-v1', 'Attack1 candidate must use the quarantine preview schema');
assert(attackCandidate.source?.clip === 'OneHandAttack1' && attackCandidate.source?.duration === 1.25 && attackCandidate.source?.keyCount === 8, 'Attack1 candidate must expose the staged SF2-style Attack1 read frames informed by OneHandAttack1 reference');
assert(attackCandidate.source?.method === 'meshy-manual-user-anticipation-contact-with-generated-recovery', 'Attack1 candidate must preserve the user-authored anticipation/contact keys and generate only recovery keys, not retarget FPS quaternions');
assert(attackCandidate.source?.generatedBones?.anticipationHold === 'duplicate(anticipation)' && attackCandidate.source?.generatedBones?.contactHold === 'duplicate(contact)', 'Attack1 candidate must use explicit anticipation/contact holds so the attack reads instead of smoothing through the key poses');
assert(attackCandidate.source?.generatedBones?.followThrough === 'slerp(contact, ready, 0.18)' && attackCandidate.source?.generatedBones?.recoil === 'slerp(contact, ready, 0.68)', 'Attack1 candidate must declare how follow-through and recoil were generated from the user contact key');
assert(Array.isArray(attackCandidate.source?.retargetedBones) && attackCandidate.source.retargetedBones.length === 0, 'Attack1 candidate must not claim retargeted Meshy bones');
assert(attackCandidate.source?.fpsReference?.generatedDir === 'generated/fps-reference/attack1' && attackCandidate.source?.fpsReference?.descriptions?.anticipation, 'Attack1 candidate must carry FPS reference descriptions as reference-only evidence');
assert(attackCandidate.source?.fpsReference?.sourceMotion?.HandR?.travelDeg > 200, 'Attack1 candidate must record substantial FPS HandR source travel');
assert(attackCandidate.frames?.length === 8, 'Attack1 candidate must expose staged read frames including anticipation/contact holds');
assert(attackCandidate.primeKeys?.start === 0 && attackCandidate.primeKeys?.anticipation === 0.18 && attackCandidate.primeKeys?.anticipationHold === 0.3 && attackCandidate.primeKeys?.contact === 0.38 && attackCandidate.primeKeys?.contactHold === 0.5 && attackCandidate.primeKeys?.followThrough === 0.7 && attackCandidate.primeKeys?.recoil === 0.95 && attackCandidate.primeKeys?.end === 1.25, 'Attack1 candidate must expose SF2-style hold/snap/hold review anchors');
assert(attackCandidate.guardReport?.authoredGuard?.status === 'PASS', 'Attack1 candidate must pass the authored FPV anticipation guard');
assert(attackCandidate.guardReport?.authoredGuard?.anticipation?.sourceRightHandMovesRightInFpvPx > 0 && attackCandidate.guardReport?.authoredGuard?.anticipation?.sourceLeftHandMovesRightInFpvPx > 0, 'Attack1 authored guard must require the FPS reference to move both hands right in FPV');
assert(attackCandidate.guardReport?.authoredGuard?.anticipation?.sourceSabreTipLeftOfHiltPx > 0, 'Attack1 authored guard must require the FPS reference sabre tip-left anticipation read');
assert(attackCandidate.guardReport?.authoredGuard?.sourceMotion?.sourceTipNeverDropsBelowHilt, 'Attack1 authored guard must preserve the FPS reference rule that the blade tip never drops below the hilt');
assert(attackCandidate.source?.signatureWristTwist?.bakedRightHandRotationTravelDeg > 150 && attackCandidate.source?.signatureWristTwist?.bakedRightForeArmRotationTravelDeg > 1, 'Attack1 candidate must preserve substantial wrist and forearm travel');
assert(attackCandidate.source?.signatureWristTwist?.bakedRightHandRotationTravelDeg > attackCandidate.guardReport?.authoredGuard?.bakedMotion?.bakedRightArmTravelDeg * 1.5, 'Attack1 candidate RightHand travel must dominate RightArm travel');
assert(attackCandidate.source?.signatureWristTwist?.bakedRightForeArmRotationTravelDeg > 200, 'Attack1 manual candidate must preserve the substantial user-authored RightForeArm motion instead of filtering it out');
assert(attackCandidate.source?.signatureWristTwist?.rightHandPrimaryDriver === true, 'Attack1 candidate must mark RightHand as the primary authored driver');
assert(attackCandidate.guardReport?.readyEndpointContract?.firstMatchesReady && attackCandidate.guardReport?.readyEndpointContract?.lastMatchesReady, 'Attack1 candidate start/end must match accepted Ready');
assert(attack2Candidate.schema === 'pose-lab-v2-attack-candidate-v1', 'Attack2 candidate must use the quarantine preview schema');
assert(attack2Candidate.source?.clip === 'OneHandAttack2' && attack2Candidate.source?.method === 'meshy-combo-backhand-from-attack1-contact-profile', 'Attack2 candidate must be a combo backhand candidate, not a Ready-based retarget');
assert(attack2Candidate.source?.comboStart === 'attack1.contactHold' && attack2Candidate.guardReport?.comboContract?.startMatchesAttack1ContactHold, 'Attack2 candidate must start from Attack1 contactHold');
assert(attack2Candidate.guardReport?.comboContract?.noReadyResetAtStart, 'Attack2 candidate must not reset to Ready at the start');
assert(attack2Candidate.frames?.length === 8 && attack2Candidate.primeKeys?.backhandPrep === 0.14 && attack2Candidate.primeKeys?.contact === 0.36, 'Attack2 candidate must expose staged backhand review anchors');
assert(fistReadyPreset.schema === 'pose-lab-v2-fist-ready-pose-v1' && fistReadyPreset.source?.clip === 'FistReady', 'FistReady preset must be baked from FPSPlayer FistReady');
assert(fistReadyPreset.source?.method === 'orientation-first-retarget-with-world-joint-pins', 'FistReady preset must use orientation retargeting guided by runtime-normalized world joint pins');
assert(fistReadyPreset.source?.projectionFrame === 'ShoulderCenter->Spine02', 'FistReady preset must map FPS joints through the body frame, not the FPV camera');
assert(fistReadyPreset.source?.jointPinned?.report?.right?.wristWorldError <= 0.002 && fistReadyPreset.source?.jointPinned?.report?.left?.wristWorldError <= 0.002, 'FistReady wrist joints must occupy the mapped FPS world-joint positions');
assert(fistReadyPreset.source?.jointPinned?.report?.right?.elbowWorldError <= 0.002 && fistReadyPreset.source?.jointPinned?.report?.left?.elbowWorldError <= 0.002, 'FistReady elbow joints must occupy the mapped FPS world-joint positions');
assert(JSON.stringify(fistReadyPreset.source?.jointPinned?.solverAuthoredBones?.right) === JSON.stringify(['RightArm', 'RightForeArm']), 'FistReady right solve must pin elbow and wrist by authoring arm and forearm only');
assert(JSON.stringify(fistReadyPreset.source?.jointPinned?.solverAuthoredBones?.left) === JSON.stringify(['LeftArm', 'LeftForeArm']), 'FistReady left solve must pin elbow and wrist by authoring arm and forearm only');
assert(fistReadyPreset.source?.fpvScreenPinned?.sourceCamera === 'FPSPlayer.Camera', 'FistReady preset must record FPS FPV screen targets');
assert(fistReadyPreset.source?.fpvScreenPinned?.right?.actual?.RightHand && fistReadyPreset.source?.fpvScreenPinned?.left?.actual?.LeftHand, 'FistReady preset must record Meshy FPV hand screen positions');
assert(fistReadyPreset.source?.jointPinned?.targetSpace?.includes('elbow/wrist from FPS FistReady limb vectors'), 'FistReady must state that world-joint pins, not screen pins, drive the body pose');
assert(fistReadyCandidate.schema === 'pose-lab-v2-attack-candidate-v1' && fistReadyCandidate.source?.clip === 'FistReady', 'FistReady candidate must expose the FistReady baseline for visual review');
assert(fistReadyCandidate.source?.weaponless === true && fistReadyCandidate.guardReport?.weaponless === true, 'FistReady candidate must be weaponless');
assert(fistReadyCandidate.frames?.length === 1 && fistReadyCandidate.frames[0]?.bones?.RightHand, 'FistReady candidate must expose a reviewable right-hand pose frame');
assert(fistAttack1Candidate.schema === 'pose-lab-v2-attack-candidate-v1', 'FistAttack1 candidate must use the quarantine preview schema');
assert(fistAttack1Candidate.source?.clip === 'FistAttack1' && fistAttack1Candidate.source?.readyClip === 'FistReady', 'FistAttack1 candidate must come from FPSPlayer FistAttack1 over FistReady');
assert(fistAttack1Candidate.source?.method === 'fps-fist-world-joint-pinned-over-meshy-fist-ready', 'FistAttack1 candidate must pin FPS fist joints over Meshy FistReady, not OneHandReady');
assert(fistAttack1Candidate.source?.jointPinned?.targetSpace === 'Meshy calibrated world from generated FistReady', 'FistAttack1 joint pin target basis must be generated FistReady');
assert(fistAttack1Candidate.source?.weaponless === true && fistAttack1Candidate.guardReport?.weaponless === true, 'FistAttack1 candidate must be weaponless so fist orientation is the review target');
assert(fistAttack1Candidate.frames?.length === 6 && fistAttack1Candidate.primeKeys?.windup === 0.125 && fistAttack1Candidate.primeKeys?.contact === 0.25, 'FistAttack1 candidate must expose compact punch review anchors');
assert(fistAttack1Candidate.source?.sourceMotion?.RightHand?.travelDeg > 200 && fistAttack1Candidate.source?.sourceMotion?.RightForeArm?.travelDeg > 150, 'FistAttack1 candidate must preserve substantial FPS right hand and forearm rotation travel');
assert(fistAttack1Candidate.guardReport?.sourceMotion?.rightHandPrimaryDriver === true, 'FistAttack1 candidate must record right hand as primary source rotation driver');
assert(JSON.stringify(fistAttack1Candidate.source?.jointPinned?.sourceJoints) === JSON.stringify(['ArmR', 'ForearmR', 'HandR']), 'FistAttack1 candidate must source FPS ArmR/ForearmR/HandR joint pins');
assert(JSON.stringify(fistAttack1Candidate.source?.jointPinned?.targetJoints) === JSON.stringify(['RightArm', 'RightForeArm', 'RightHand']), 'FistAttack1 candidate must target Meshy RightArm/RightForeArm/RightHand joint pins');
assert(JSON.stringify(fistAttack1Candidate.source?.jointPinned?.solverAuthoredBones) === JSON.stringify(['RightArm', 'RightForeArm']), 'FistAttack1 joint pin solve must author only RightArm/RightForeArm; RightHand remains fist orientation');
assert(fistAttack1Candidate.guardReport?.jointPinned?.status === 'PASS', 'FistAttack1 candidate must pass joint-pinned guardrail');
assert((fistAttack1Candidate.guardReport?.jointPinned?.report || []).every((entry) => entry.wristWorldError <= 0.01), 'FistAttack1 wrist joint pin must stay near FPS-derived target');
assert(fistAttack1Candidate.source?.acceptanceRead?.includes('fist/knuckle orientation is the visual target'), 'FistAttack1 candidate must document fist/knuckle orientation as the visual target');
assert(davinLowBackKickCandidate.schema === 'pose-lab-v2-davin-lowbackkick-candidate-v1', 'Davin LowBackKick candidate must use its quarantine preview schema');
assert(davinLowBackKickCandidate.source?.sourcePoseclip?.endsWith('ares_lowbackkick_sf2.poseclip.json'), 'Davin LowBackKick candidate must cite the old Ares SF2 poseclip source');
assert(davinLowBackKickCandidate.source?.method === 'direct-core-bone-quaternion-transfer-from-ares-mixamorig-to-davin-meshy-core', 'Davin LowBackKick candidate must be the shared-bone rotation transfer, not an accepted bake');
assert(davinLowBackKickCandidate.status === 'quarantined-review' && JSON.stringify(davinLowBackKickCandidate.source?.retargetPolicy?.channels || []) === JSON.stringify(['quaternion']) && JSON.stringify(davinLowBackKickCandidate.source?.retargetPolicy?.ignoredChannels || []) === JSON.stringify(['position', 'scale']), 'Davin LowBackKick candidate must remain rotation-only and quarantined');
assert(davinLowBackKickCandidate.source?.weaponless === true && davinLowBackKickCandidate.frames?.length === 8, 'Davin LowBackKick candidate must expose eight weaponless SF2 timing frames');
assert(davinIdleCandidate.schema === 'pose-lab-v2-davin-idle-candidate-v1', 'Davin idle candidate must use its screenshot-idle schema');
assert(davinIdleCandidate.status === 'failed-diagnostic' && davinIdleCandidate.source?.sourceScreenshot?.endsWith('Screenshot_20260716-182009.png'), 'Davin idle candidate must cite the target screenshot source and remain failed-diagnostic after the red visual review');
assert(davinIdleCandidate.source?.method === 'failed-world-space-ik-diagnostic-replaced-by-screen-space-projection-required' && davinIdleCandidate.source?.authoringControls?.runtimeIk === false && davinIdleCandidate.source?.authoringControls?.openPose === false, 'Davin idle candidate must record the failed world-space IK diagnosis, with no runtime IK or OpenPose dependency');
assert(JSON.stringify(Object.keys(davinIdleCandidate.source?.authoringControls?.temporaryIkTargets || {}).sort()) === JSON.stringify(['LeftHand', 'LeftToeBase', 'RightHand', 'RightToeBase']) && davinIdleCandidate.guardReport?.visualAcceptance === 'failed-local-screenshot-review', 'Davin idle candidate must preserve the failed toe/wing IK evidence and failed visual verdict');
assert(davinIdleCandidate.source?.targetModel?.endsWith('davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb') && davinIdleCandidate.frames?.length === 2, 'Davin idle candidate must target the tail3 runtime asset and expose idle/idleHold keys');

assert(davinLowBackKickCandidate.primeKeys?.contact === 0.3 && davinLowBackKickCandidate.primeKeys?.settle === 0.66667, 'Davin LowBackKick candidate must preserve LowBackKick contact and settle anchors');
assert(tipBasisCandidate.source?.method === 'meshy-authored-fpv-tip-basis', 'Attack1 tip-basis candidate must use the FPV tip-basis method');
assert(tipBasisCandidate.source?.baseCandidate === 'attack1-candidate-1', 'Attack1 tip-basis candidate must record its base candidate');
assert(tipBasisCandidate.source?.tipBasis?.sourceCamera === 'FPSPlayer.Camera', 'Attack1 tip-basis source must use the FPS Camera bone');
assert(tipBasisCandidate.source?.tipBasis?.sourceSocket === 'WeaponR', 'Attack1 tip-basis source must use FPS WeaponR as reference evidence');
assert(tipBasisCandidate.source?.tipBasis?.targetCamera === 'Meshy runtime FPV', 'Attack1 tip-basis target must use the Meshy runtime FPV camera');
assert(Array.isArray(tipBasisCandidate.source?.tipBasis?.solverAuthoredBones) && tipBasisCandidate.source.tipBasis.solverAuthoredBones.length === 1 && tipBasisCandidate.source.tipBasis.solverAuthoredBones[0] === 'RightHand', 'Attack1 tip-basis solver must only author RightHand');
assert(tipBasisCandidate.source?.tipBasis?.allowedOutput === 'RightHand quaternion only', 'Attack1 tip-basis solver must forbid non-hand outputs');
assert(tipBasisCandidate.label?.includes('tip-basis'), 'Attack1 tip-basis candidate remains a named diagnostic artifact');
assert(jointPinnedCandidate.source?.method === 'meshy-world-joint-pinned-from-fps-weaponr', 'Attack1 joint-pinned candidate must use calibrated world joint pinning');
assert(jointPinnedCandidate.source?.jointPinned?.sourceSocket === 'WeaponR', 'Attack1 joint-pinned candidate must use FPS WeaponR as source socket evidence');
assert(JSON.stringify(jointPinnedCandidate.source?.jointPinned?.sourceJoints) === JSON.stringify(['ArmR', 'ForearmR', 'HandR']), 'Attack1 joint-pinned candidate must source FPS right-arm joints');
assert(JSON.stringify(jointPinnedCandidate.source?.jointPinned?.targetJoints) === JSON.stringify(['RightArm', 'RightForeArm', 'RightHand']), 'Attack1 joint-pinned candidate must target Meshy right-arm joints');
assert(JSON.stringify(jointPinnedCandidate.source?.jointPinned?.solverAuthoredBones) === JSON.stringify(['RightArm', 'RightForeArm', 'RightHand']), 'Attack1 joint-pinned solver must only author right-arm bones');
assert(jointPinnedCandidate.guardReport?.jointPinned?.status === 'PASS', 'Attack1 joint-pinned candidate must pass world joint/socket guard');
const jointPinnedActiveFrames = jointPinnedCandidate.guardReport?.jointPinned?.report?.filter((entry) => !entry.endpoint) || [];
assert(jointPinnedActiveFrames.length > 10, 'Attack1 joint-pinned candidate must sample source key times beyond prime frames');
assert(jointPinnedActiveFrames.every((entry) => entry.elbowWorldError <= jointPinnedCandidate.source.jointPinned.thresholds.elbowWorldError), 'Attack1 joint-pinned elbow world error must stay under threshold');
assert(jointPinnedActiveFrames.every((entry) => entry.wristWorldError <= jointPinnedCandidate.source.jointPinned.thresholds.wristWorldError), 'Attack1 joint-pinned wrist world error must stay under threshold');
assert(jointPinnedActiveFrames.every((entry) => entry.bladeTipWorldError <= jointPinnedCandidate.source.jointPinned.thresholds.bladeTipWorldError), 'Attack1 joint-pinned blade tip world error must stay under threshold');
assert(jointPinnedActiveFrames.every((entry) => entry.bladeAngleErrorDeg <= jointPinnedCandidate.source.jointPinned.thresholds.bladeAngleDeg), 'Attack1 joint-pinned blade angle error must stay under threshold');
assert(!attackCandidateSource.includes('SaberGrip') && !attackCandidateSource.includes('WeaponR.quaternion'), 'Attack1 candidate module must not animate SaberGrip or WeaponR tracks');
assert(!attack2CandidateSource.includes('SaberGrip') && !attack2CandidateSource.includes('WeaponR.quaternion'), 'Attack2 candidate module must not animate SaberGrip or WeaponR tracks');
assert(!fistReadyCandidateSource.includes('SaberGrip') && !fistReadyCandidateSource.includes('WeaponR.quaternion'), 'FistReady candidate module must not animate SaberGrip or WeaponR tracks');
assert(!fistAttack1CandidateSource.includes('SaberGrip') && !fistAttack1CandidateSource.includes('WeaponR.quaternion'), 'FistAttack1 candidate module must not animate SaberGrip or WeaponR tracks');
assert(!tipBasisCandidateSource.includes('SaberGrip.quaternion') && !tipBasisCandidateSource.includes('WeaponR.quaternion'), 'Attack1 tip-basis module must not animate SaberGrip or WeaponR tracks');
assert(!jointPinnedCandidateSource.includes('SaberGrip.quaternion') && !jointPinnedCandidateSource.includes('WeaponR.quaternion'), 'Attack1 joint-pinned module must not animate SaberGrip or WeaponR tracks');
assert(!read('scripts/bake-attack1-candidate.mjs').includes('applyOrientationBake') && !read('scripts/bake-attack1-candidate.mjs').includes('bakeCurrentFpsPoseToMeshy'), 'Attack1 candidate bake must not retarget FPS quaternions into Meshy');
assert(readme.includes('Visual Verification Doctrine'), 'README must link the visual verification doctrine');
assert(readme.includes('Davin Tail Chain') && readme.includes('Tail01') && readme.includes('Tail02') && readme.includes('Tail03') && readme.includes('npm run review:davin-tail-mask'), 'README must document the Davin three-segment tail chain authoring and mask diagnostic lane');
assert(readme.includes('Davin Screenshot Idle Lane') && readme.includes('npm run review:davin-idle') && readme.includes('screen-space projection') && readme.includes('No browser runtime IK or OpenPose dependency'), 'README must document the failed screenshot idle lane, projection diagnostic, and dependency boundary');
assert(readme.includes('Davin LowBackKick Viability Lane') && readme.includes('?model=davin&pose=lowbackkick') && readme.includes('not the hosted visual truth lane'), 'README must document the Davin LowBackKick quarantined viability route and local diagnostic limit');
assert(readme.includes('Attack Authoring Learnings'), 'README must link the attack authoring learning note');
assert(readme.includes('They are not visual acceptance and cannot close a') && readme.includes('screenshot-red build'), 'README must state smoke/source checks are not visual acceptance');
assert(readme.includes('npm run validate:crimson-sword-intake') && readme.includes('npm run accept:crimson-sword') && readme.includes('Only `npm run accept:crimson-sword` can pass Crimson sword visual acceptance'), 'README must split Crimson intake guardrails from cloud visual acceptance');
assert(visualDoctrine.includes('Human-visible truth is the acceptance gate'), 'visual doctrine must preserve human-visible truth as acceptance gate');
assert(visualDoctrine.includes('Local render is agent eyesight') && visualDoctrine.includes('not final acceptance'), 'visual doctrine must classify local render as diagnostic eyesight, not final acceptance');
assert(visualDoctrine.includes('`npm run smoke`') && visualDoctrine.includes('not visual acceptance'), 'visual doctrine must forbid smoke-as-visual-acceptance claims');
assert(exists('vendor/three/build/three.module.js'), 'missing vendored Three module');
assert(exists('vendor/three/examples/jsm/loaders/GLTFLoader.js'), 'missing vendored GLTFLoader');
assert(exists('vendor/three/examples/jsm/controls/OrbitControls.js'), 'missing vendored OrbitControls');
assert(exists('vendor/three/examples/jsm/utils/BufferGeometryUtils.js'), 'missing vendored BufferGeometryUtils');
assert(main.includes("meshy_apose_walking_with_skin.glb"), 'app must reference Meshy GLB');
assert(main.includes("meshy_real_sabre.glb"), 'app must reference real sabre GLB');
const fpvVisibleBonesMatch = main.match(/const FPV_VISIBLE_BONES = new Set\(\[([\s\S]*?)\]\);/);
assert(Boolean(fpvVisibleBonesMatch), 'runtime must declare the FPV visible bone mask');
const fpvVisibleBones = fpvVisibleBonesMatch
  ? [...fpvVisibleBonesMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
  : [];
for (const bone of ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand']) {
  assert(fpvVisibleBones.includes(bone), `FPV mask must still show ${bone}`);
}
assert(main.includes('const MESHY_PBR_TEXTURES = {') && main.includes('character_sheet_pbr/normal.png'), 'app must reference salvaged Meshy Character Sheet PBR texture channels');
assert(main.includes('davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb') && main.includes("label: 'Davin Wingsworth'") && main.includes("default: 'davin'") && main.includes('Tail01/Tail02/Tail03'), 'Davin Wingsworth Kestrel Man must be the default imported character profile with the derived tail chain runtime asset');
assert(main.includes("ares_rigged_diffuse.glb") && main.includes("security_titan_rigged_diffuse.glb"), 'app must reference imported Ares character models');
assert(main.includes('const MIXAMO_BONE_MAP = Object.freeze') && main.includes("RightHand: 'mixamorig:RightHand'"), 'app must map Pose Lab logical bones onto Mixamo imported rigs');
assert(main.includes('function findPoseBone') && main.includes('activeBoneName(logicalName)'), 'app must resolve pose bones through active character profiles');
assert(main.includes('supportsBakedPoseStates: false') && main.includes('imported rigged Ares diffuse authoring model'), 'imported Ares profiles must remain manual pose-authoring surfaces, not Meshy baked-pose targets');
assert(main.includes('const textureLoader = new THREE.TextureLoader()'), 'app must load Meshy PBR channels through Three TextureLoader');
assert(main.includes('data-boot-panel') && main.includes('function setBootPhase') && main.includes('function markBootFailed'), 'app must expose visible boot phases instead of silent blank/loading states');
assert(main.includes("document.body.dataset.firstFrame = '1'"), 'app must mark first rendered frame for render diagnostics');
assert(main.includes('async function applyMeshyPbrTextures') && main.includes('applyMeshyPbrToMaterial'), 'app must apply salvaged Meshy PBR channels to character materials');
assert(main.includes('material.map = textures.map') && main.includes('material.emissiveMap = textures.emissiveMap') && main.includes('material.metalnessMap = textures.metallicRoughnessMap') && main.includes('material.normalMap = textures.normalMap') && main.includes('material.roughnessMap = textures.metallicRoughnessMap'), 'app must assign full Meshy PBR material channels');
assert(!main.includes('fpsplayer_meshy') && !main.includes('0615041256'), 'app must not use the old FPSPlayer Meshy texture set');
assert(main.includes('texture.flipY = false') && main.includes('THREE.SRGBColorSpace'), 'Meshy PBR textures must use GLTF UV orientation and sRGB color maps');
assert(main.includes('for (const entry of fpvBodyMasks)') && main.includes('applyMeshyPbrToMaterial(material, textures)'), 'FPV arm-mask materials must receive the same Meshy PBR channels as the full body');
assert(!main.includes("import { READY_POSE_PRESET } from './ready-pose.js'"), 'Ready pose preset must not be statically imported because browser module cache can stale it');
assert(main.includes("import { POSE_STATUS } from './pose-status.js'"), 'runtime must read pose-status.js instead of hardcoding accepted pose modules');
assert(main.includes('ATTACK1_REVIEW_CANDIDATES') && main.includes('DAVIN_IDLE_REVIEW_CANDIDATES') && main.includes('LOWBACKKICK_REVIEW_CANDIDATES') && main.includes('SABER_GRIP_LOCAL') && main.includes("from './review-constants.js'"), 'runtime must import shared review constants for saber grip, Attack1 previews, and Davin LowBackKick previews');
assert(main.includes('REQUESTED_LOWBACKKICK_REVIEW') && main.includes("['lowbackkick', 'low-back-kick', 'low_back_kick']") && main.includes("poseState = 'lowBackKick'"), 'runtime must expose a Davin-only LowBackKick candidate review route');
assert(reviewConstantsSource.includes('LOWBACKKICK_REVIEW_CANDIDATES') && reviewConstantsSource.includes('davin-lowbackkick-ares-transfer-1'), 'review constants must register the Davin LowBackKick candidate module');
assert(reviewConstantsSource.includes('DAVIN_IDLE_REVIEW_CANDIDATES') && reviewConstantsSource.includes('davin-idle-screenshot-1'), 'review constants must register the Davin screenshot idle candidate module');
assert(main.includes('async function loadPosePresets') && main.includes('readyStatus.module') && main.includes("URL_PARAMS.get('cacheBust')"), 'Ready pose preset must be dynamically imported from pose-status.js with the page cacheBust');
assert(!main.includes("import(`./attack1-pose.js${suffix}`)") && !main.includes('ATTACK1_POSE_SEQUENCE'), 'runtime must not import contaminated Attack1 generated pose data');
assert(main.includes('data-pose-state="rest"') && main.includes('data-pose-state="ready"') && main.includes('data-pose-state="attack1"'), 'app must expose Rest, Ready, and Attack1 pose states');
assert(main.includes('function initialPoseStateFromUrl') && main.includes("pose === 'ready'") && main.includes('REQUESTED_ATTACK_QUARANTINED') && main.includes("return 'attack1'"), 'cloud review URL must be able to boot directly into Ready or quarantined Attack1');
assert(main.includes('function initialViewModeFromUrl') && main.includes("URL_PARAMS.get('view') === 'fpv'") && main.includes('setViewMode(initialViewModeFromUrl())'), 'cloud review URL must be able to boot directly into FPV view');
assert(main.includes("let poseState = 'rest'") && main.includes('function applyReadyPose') && main.includes("poseState = 'ready'"), 'runtime must switch to baked Ready without animation retargeting');
assert(main.includes('function applyAttackPose') && main.includes("poseState = 'attack1'") && main.includes('Attack1 quarantined'), 'Attack1 must remain selectable but quarantined until a clean bake exists');
assert(main.includes('const candidates = REQUESTED_IDLE_REVIEW ? DAVIN_IDLE_REVIEW_CANDIDATES : REQUESTED_LOWBACKKICK_REVIEW ? LOWBACKKICK_REVIEW_CANDIDATES : ATTACK1_REVIEW_CANDIDATES') && main.includes('candidate preview') && main.includes('not accepted repo truth') && main.includes('failed diagnostic, not accepted repo truth') && main.includes('debugBones'), 'runtime must allow explicit candidate preview without accepting Attack1, LowBackKick, or screenshot Idle, and keep debug bones opt-in');
assert(main.includes('function sequenceFrameAt') && main.includes('function applyAttackSequenceAt'), 'Attack1 candidate preview must play baked frames only');
assert(main.includes('data-attack-review') && main.includes('data-attack-review-toggle') && main.includes('data-attack-review-close') && main.includes('data-attack-play') && main.includes('data-attack-pause') && main.includes('data-attack-scrub') && main.includes('data-attack-primes'), 'Attack1 candidate preview must expose closable play/pause, scrub, and prime-key controls');
assert(main.includes('data-attack-save-key') && main.includes('data-attack-export'), 'Attack1 manual authoring must expose save-key and whole-animation export controls');
assert(main.includes("schema: 'pose-lab-v2-manual-animation-v1'") && main.includes("seed: 'blank-ready-per-key'") && main.includes('candidateFramesUsed: false'), 'Attack1 manual authoring must export a blank-Ready whole-animation draft that does not use candidate frames');
assert(main.includes('function createManualAttackDraft') && main.includes('applyReadyPose()') && main.includes('snapshotPoseBones()'), 'Attack1 manual draft keys must initialize from accepted Ready and snapshot the full curated pose state');
assert(main.includes('function saveManualAttackKey') && main.includes('function exportManualAttackDraft'), 'Attack1 manual authoring must save per-key poses and export the whole animation');
assert(main.includes('function useManualAttackAuthoring') && main.includes("return ACTIVE_CHARACTER.supportsBakedPoseStates && !REQUESTED_ATTACK2_QUARANTINED && (REQUESTED_MANUAL_ATTACK || !REQUESTED_CANDIDATE)"), 'Attack1 without an explicit candidate must enter blank manual authoring while Attack2 requires an explicit candidate');
assert(main.includes("const WORLD_SOCKET_REVIEW = URL_PARAMS.get('worldSocket') === '1'") && main.includes('data-tip-match-overlay') && main.includes('function updateTipMatchOverlay') && main.includes('function liveJointPinnedProbe') && main.includes('LIVE FAIL'), 'Attack1 joint-pinned preview must expose an explicit live world-socket error overlay');
assert(main.includes('function setAttackReviewOpen') && main.includes('attackReviewOpen = Boolean(open && canExposeAttackReview() && (REQUESTED_CANDIDATE || manualAttackDraft || useManualAttackAuthoring()))') && main.includes('let attackReviewOpen = Boolean(canExposeAttackReview() && (REQUESTED_MANUAL_ATTACK || REVIEW_CONTROLS_OPEN))') && main.includes('attackReviewPanel.hidden = !(active && attackReviewOpen)'), 'Attack1 controls must be toggleable and review controls must be closed by default unless requested');
assert(main.includes('function setupAttackReviewControls') && main.includes('function setAttackReviewTime') && main.includes('function playAttackReview') && main.includes('function pauseAttackReview'), 'Attack1 candidate preview controls must be wired to playback and frozen-frame review');
assert(main.includes('attackPoseFixedTime === null') && main.includes('attackPoseCurrentTime'), 'Attack1 candidate preview must distinguish playing animation from frozen inspection frames');
assert(!main.includes('updatePoseAnimation(performance.now())') && !main.includes('attack1 playing') && !main.includes('attack1 frozen at'), 'runtime must not play the contaminated Attack1 bake');
assert(attackReviewUrls.includes('animated loop') && attackReviewUrls.includes('time: null'), 'Attack1 review URLs must include an animated loop URL before frozen frames');
assert(!main.includes('READY_RIGHT_WRIST_ROLL_DEG') && !main.includes('rollReadyRightWrist'), 'Ready must not apply a hidden runtime wrist-roll patch');
assert(main.includes("source-oriented OneHandReady, sabre follows RightHand FK"), 'Ready state must report source-orientation bake and FK saber ownership');
assert(readyPose.includes("schema\": \"pose-lab-v2-ready-pose-v1"), 'Ready pose preset must use the v2 baked pose schema');
assert(createHash('sha256').update(readyPose).digest('hex') === '8d8e070f0fe88001917c88d885052085286e85d56aa0081c13b4fce35dfc011d', 'Ready pose preset must remain the clean rollback baseline');
assert(readyPose.includes("clip\": \"OneHandReady") && readyPose.includes("sampleTime\": 1.25"), 'Ready pose preset must be baked from FPS OneHandReady at the held pose sample');
assert(readyPose.includes('"RightHand"') && readyPose.includes('"LeftHand"') && readyPose.includes('"RightForeArm"'), 'Ready pose preset must include upper-body hand and forearm bones');
assert(readyPose.includes('"method": "orientation-first-retarget-with-pins"'), 'Ready pose preset must use source-orientation retargeting guided by pins');
assert(readyPose.includes('"retargetedBones"') && readyPose.includes('"RightArm"') && readyPose.includes('"RightForeArm"') && readyPose.includes('"RightHand"'), 'Ready preset must record orientation-retargeted arm/forearm/hand bones');
assert(!exists('scripts/bake-pose-sequence.mjs') || !pkg.scripts?.['bake:attack1'], 'Attack1 bake experiments must not be wired as accepted repo output');
assert(!main.includes('applyTwoBonePin') && !main.includes('solveTwoBoneIk'), 'runtime must not use IK/two-bone hand pinning for Attack1');
assert(main.includes('object.position.set(-0.39454, 0.71404, 0.32817)'), 'default sabre position must match the latest authored export');
assert(main.includes('THREE.MathUtils.degToRad(160.077)') && main.includes('THREE.MathUtils.degToRad(83.685)') && main.includes('THREE.MathUtils.degToRad(-135.981)'), 'default sabre rotation must match the latest authored export');
assert(main.includes('object.scale.setScalar(0.48)'), 'default sabre scale must match the latest authored export');
assert(main.includes("findRequiredPoseBone('RightHand')"), 'runtime saber grip must parent under the profile-resolved real RightHand bone');
assert(reviewConstantsSource.includes('export const SABER_GRIP_LOCAL = {') && reviewConstantsSource.includes('position: [8.52296, 28.41254, -24.44467]'), 'SaberGrip must use explicit authored RightHand-local placement from shared review constants');
assert(reviewConstantsSource.includes('SABRE_REVIEW_LOCAL_AXIS') && reviewConstantsSource.includes('ATTACK1_REVIEW_CANDIDATES'), 'review constants must expose blade axis and candidate manifest');
assert(reviewConstantsSource.includes('attack1-tip-match-1') && reviewConstantsSource.includes('failed diagnostic') && reviewConstantsSource.includes('attack1-tip-basis-2') && reviewConstantsSource.includes('failed diagnostic') && reviewConstantsSource.includes('attack1-joint-pinned-3') && reviewConstantsSource.includes('ATTACK1_JOINT_PINNED_SEQUENCE'), 'review constants must register failed diagnostics and current joint-pinned preview candidate');
assert(reviewConstantsSource.includes('fist-ready-candidate-1') && reviewConstantsSource.includes('FIST_READY_POSE_SEQUENCE') && reviewConstantsSource.includes('weaponless'), 'review constants must register the weaponless FistReady preview candidate');
assert(reviewConstantsSource.includes('fist-attack1-candidate-1') && reviewConstantsSource.includes('FIST_ATTACK1_POSE_SEQUENCE') && reviewConstantsSource.includes('weaponless'), 'review constants must register the weaponless FistAttack1 preview candidate');
assert(main.includes("grip.name = 'SaberGrip'") && main.includes('rightHand.add(grip)') && main.includes('grip.add(sabreRoot)'), 'real sabre mesh must be parented through explicit local SaberGrip FK');
assert(main.includes('function activeSwordLocal()') && main.includes('sabreRoot.position.fromArray(swordLocal.position)') && main.includes('sabreRoot.scale.fromArray(swordLocal.scale)') && reviewConstantsSource.includes('export const CRIMSON_SWORD_LOCAL = {') && reviewConstantsSource.includes('position: [-1.98175, -1.31896, -7.90654]') && reviewConstantsSource.includes('position: [12.38741, 13.39693, -1.51078]'), 'Crimson Arborblade swordLocal calibration must include the palm-forward hilt offset');
assert(!main.includes('rightHand.attach(grip)') && !main.includes('grip.attach(sabreRoot)'), 'SaberGrip must not preserve world placement through Object3D.attach');
assert(main.includes('function editableSaber()') && main.includes('return saberGrip || sabreRoot'), 'direct transforms must target SaberGrip after hand parenting');
assert(main.includes('function updateSaberAttachmentProof()') && main.includes('saberAttachmentStatus') && main.includes('hiltToHandDistance'), 'runtime must measure whether the sword hilt is attached to the active RightHand');
assert(main.includes('applyCrimsonSwordReviewMaterial') && main.includes('CrimsonArborbladeVisibleSteel'), 'runtime must lift Crimson Arborblade material so the real sword is visible on the dark review canvas');
assert(main.includes('dataset.crimsonSocketProof') && main.includes('visibleInViewport') && main.includes('screenLengthPx'), 'runtime must expose browser-side Crimson socket proof for cloud evidence reconciliation');
assert(main.includes('supportsBakedPoseStates: false') && main.includes('explicitCandidateReview') && main.includes('function canExposeAttackReview()'), 'Crimson route must keep baked Attack1 disabled while allowing explicit quarantined attack review candidates');
assert(main.includes("parentBone: 'RightHand'"), 'export must report SaberGrip as RightHand-owned');
assert(main.includes("let toolMode = 'saber'") && main.includes('data-tool="saber"') && main.includes('data-tool="pose"'), 'app must distinguish top-level Saber and Pose modes');
assert(main.includes('const POSE_BONE_NAMES = [') && main.includes("'RightHand'") && main.includes("'LeftFoot'"), 'Pose mode must expose curated real Meshy body bones');
assert(main.includes('function setupPoseHandles') && main.includes('PoseHandle:') && main.includes('function pickPoseHandle'), 'Pose mode must create visible selectable bone handles');
assert(main.includes('function updateOctahedralBoneGeometry') && main.includes('poseBoneTailPosition') && main.includes('handle.userData.head') && main.includes('handle.userData.tail'), 'Pose handles must render Blender-style head-to-tail octahedral bone bodies');
assert(main.includes('const FPV_POSE_HANDLE_NAMES = new Set(POSE_BONE_NAMES)') && main.includes('const FIST_CONTROL_BONE_NAMES = ['), 'FPV pose mode must show curated body handles plus fist controls when fist review is active');
assert(!main.includes('new THREE.OctahedronGeometry(1, 0)') && !main.includes('poseHandleWorldPosition') && !main.includes('position.lerp(objectWorldPosition'), 'Pose handles must not regress to point markers or clever midpoint widgets');
assert(main.includes('raycaster.intersectObjects(visibleHandles, false)') && main.includes('function projectedHandlePickInfo') && main.includes('function pointInScreenTriangle'), 'Pose handle picking must raycast visible octahedral bone meshes first, then use projected envelope fallback');
assert(!main.includes('function posePickPriority') && !main.includes('screenArea'), 'Pose handle picking must not use clever priority scoring that can make visible bones unselectable');
assert(!main.includes('worldToScreenPixels(handle.userData.head)') && !main.includes('worldToScreenPixels(handle.userData.tail)'), 'Pose handle picking must not regress to head-tail-only centerline selection');
assert(main.includes("viewMode !== 'firstPerson' || fpvPoseHandleVisible(name)") && main.includes('function fpvPoseHandleVisible'), 'FPV pose mode must use the explicit FPV-visible skeleton and fist-control handle set');
assert(main.includes('selectedPoseBone') && main.includes('function resetPose') && main.includes("data-action=\"reset-pose\""), 'Pose mode must track selection and reset curated bone rotations');
assert(main.includes('const toolState = {') && main.includes("pose: { mode: 'rotate', axis: 'screen' }"), 'Saber and Pose modes must preserve their own active transform mode and axis');
assert(!main.includes("toolMode === 'pose' ? 'rotate' : next") && !main.includes('button.hidden = toolMode === \'pose\''), 'Pose mode must not be a rotate-only island');
assert(main.includes('function editableTarget()') && main.includes("return toolMode === 'pose' ? selectedPoseBone : editableSaber()"), 'Pose and Saber transforms must use the same editable-target pipeline');
assert(main.includes('function moveEditableByGesture') && main.includes('function rotateEditableByGesture') && main.includes('function scaleEditableByDelta'), 'Move/Rotate/Scale helpers must work for both saber object and selected bones');
assert(main.includes('function applyEditableGestureDelta') && main.includes('applyEditableGestureDelta(dx, dy, gesture)') && main.includes('applyEditableGestureDelta(dx, dy, touchGesture)'), 'Pointer and touch drags must route through shared transform logic');
assert(main.includes('function beginTwoFingerPose') && !main.includes('function rotatePoseBoneByTwist') && !main.includes('function poseBoneRollAxis'), 'Pose two-finger input must use the shared object-mode Rotate/Scale path, not a separate bone-roll path');
assert(main.includes('beginTwoFingerPose(points)') && main.includes('handleTwoFingerTouch(points)'), 'two-finger pose touch must use the same Rotate/Scale path as saber touch');
assert(main.includes("event.pointerType === 'touch' && toolMode === 'pose'") && main.includes('stopEvent(event);'), 'touch pointer events in Pose mode must not clear selected bones before native two-finger touch handling');
assert(main.includes("points.length >= 2 && toolMode === 'pose' && selectedPoseBone"), 'Pose two-finger touch must preempt camera pan whenever a bone is selected');
assert(main.includes('function consumePoseEmptyDoubleTap') && main.includes('pose: bone deselected'), 'Pose mode must expose double-tap empty-canvas deselect');
assert(main.includes('function beginPoseEmptyTouch') && main.includes('beginPoseEmptyTouch(points[0])'), 'selected Pose empty touch must reserve the gesture instead of starting camera pan');
assert(!main.includes('selectedPoseBone = null;\n    updatePoseHandles();\n    suppressTouchPointerEvents = true;\n    beginCameraTouch(points);'), 'empty Pose touch must not clear selected bone before a second finger can start twist');
assert(!main.includes('pointers.delete(event.pointerId);\n      selectedPoseBone = null;\n      updatePoseHandles();'), 'empty Pose pointer miss must not clear selected bone or fall through to camera');
assert(main.includes("vanguard: './assets/vanguard/vanguard_rigged_animations.glb'") && main.includes('VANGUARD_BONE_MAP') && main.includes('supportsAnimationClips: true'), 'runtime must register Vanguard as an imported animated character');
assert(main.includes('supportsAnimationClips: true') && main.includes('importedAnimationMixer') && main.includes('clipAction(clip)'), 'imported model lane must support embedded GLB animation clip playback');
assert(main.includes('REQUESTED_IMPORTED_CLIP') && main.includes('data-cycle-animation') && main.includes('cycleImportedAnimation'), 'Vanguard clips must be selectable by URL and UI cycle control');
assert(main.includes('importedRootMotionBone') && main.includes('function suppressImportedRootMotion') && main.includes('applyInPoseLab: false'), 'Vanguard browser playback must suppress saved root motion instead of applying it');
assert(main.includes('function vanguardPaletteColor') && main.includes('0x75c9ff') && main.includes('0x123f2f') && main.includes('0xc92f2f') && main.includes('0x36fff3'), 'Vanguard runtime must apply light blue plates, dark green underarmor, red feathers, and cyan eyeholes');
assert(main.includes('ACTIVE_CHARACTER.supportsBakedPoseStates') && main.includes('loadPosePresets({ announce: false })'), 'Meshy baked pose loading must stay gated to baked-pose characters');
assert(!readyPose.includes('AnimationMixer') && !readyPose.includes('clipAction'), 'v2 Ready must stay baked-pose data only, not runtime animation playback');
assert(!main.includes("import './styles.css'"), 'browser-native ESM must not import CSS without a bundler');
assert(main.includes('pickSabre') && main.includes('startGesture') && main.includes('updateGesture'), 'app must use visible direct saber gestures');
assert(main.includes('function handleTouchStart') && main.includes('function handleTouchMove') && main.includes('function handleTouchEnd'), 'mobile saber editing must use native touch handlers, not pointer-only guesses');
assert(main.includes("canvas.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false })"), 'touchstart must be non-passive capture so saber gestures can stop camera/browser handling');
assert(main.includes('let suppressTouchPointerEvents = false') && main.includes('event.pointerType === \'touch\' && suppressTouchPointerEvents'), 'owned native touch gestures must suppress duplicate touch pointer events');
assert(main.includes("const DEBUG_TOUCH = URL_PARAMS.get('debugTouch') === '1'") && main.includes("const DEBUG_READY = URL_PARAMS.get('debugReady') === '1'") && main.includes("const DEBUG_READY_DELTA = URL_PARAMS.get('debugReadyDelta') === '1'"), 'debug proof UIs must be independently gated behind debugTouch/debugReady/debugReadyDelta flags');
assert(!main.includes('AUTO_TOUCH_PROBE') && !main.includes('requestAnimationFrame(runTouchProbe)'), 'touch probe must not auto-run because it mutates pose state');
assert(main.includes('data-touch-proof') && main.includes('data-touch-proof-readout') && main.includes('Run Touch Probe'), 'debugTouch mode must expose a visible interaction proof panel');
assert(main.includes('data-ready-proof') && main.includes('data-ready-proof-readout') && main.includes('function updateReadyProof'), 'debugReady mode must expose a non-mutating Ready proof panel');
assert(main.includes('class="primary-rail"') && main.includes('class="control-dock"'), 'mobile UI must separate primary review controls from secondary editor panels');
assert(main.includes('data-cycle-character>Model: ${ACTIVE_CHARACTER.label}</button>') && main.indexOf('data-cycle-character') < main.indexOf('data-cycle-tool'), 'Model control must remain visible before Tool in the primary rail');
assert(main.includes('data-panel="model"') && main.includes('CHARACTER_KEYS.map(modelButtonHtml)') && main.includes('modelButtons.forEach'), 'Tools dock must expose direct model switching buttons');
assert(main.includes('data-cycle-tool') && main.includes('data-cycle-pose-state') && main.includes('data-cycle-view-mode') && main.includes('data-dock-toggle'), 'default mobile UI must use compact cycle controls plus one Tools opener');
assert(main.includes('data-fpv-settings-toggle') && main.includes('data-fpv-settings') && main.includes('data-fpv-nudge="forward"') && main.includes('data-fpv-nudge="back"') && main.includes('data-fpv-nudge="up"') && main.includes('data-fpv-nudge="down"'), 'FPV mode must expose a gear settings panel with forward/back/up/down nudges');
assert(main.includes('data-fpv-fov') && main.includes('data-fpv-fov-output') && main.includes('function setFpvFov'), 'FPV gear panel must expose a live FOV slider');
assert(!main.includes('data-fpv-nudge="left"') && !main.includes('data-fpv-nudge="right"'), 'FPV nudge panel must not expose left/right movement controls');
assert(main.includes('>↑</button>') && main.includes('>↓</button>') && main.includes('>⇧</button>') && main.includes('>⇩</button>'), 'FPV nudge controls must use arrow symbols instead of WASD/QE labels');
assert(main.includes('FPV_NUDGE_STEP = 0.01') && main.includes('FPV_NUDGE_HOLD_SPEED = 0.12') && main.includes('startFpvNudge') && main.includes('runFpvNudgeHold'), 'FPV nudge controls must support tap nudges and slow hold movement');
assert(main.includes('fpvSettingsExport') && main.includes('data-fpv-copy') && main.includes('data-fpv-reset'), 'FPV settings must expose copy and reset actions');
assert(!main.includes('localStorage'), 'FPV camera tweaks must stay session-only and must not use localStorage');
assert(main.includes('class="control-dock" aria-label="Secondary editor controls" hidden'), 'secondary control dock must be closed by default so the canvas is not covered on load');
assert(main.includes('data-panel-toggle="model"') && main.includes('data-panel-toggle="transform"') && main.includes('data-panel-toggle="view"') && main.includes('data-panel-toggle="export"') && main.includes('data-panel-toggle="debug"'), 'mobile UI must expose collapsible Model/Transform/View/Export/Debug panels');
assert(main.includes('function setControlPanel') && main.includes('controlPanels') && main.includes('element.hidden = !active'), 'mobile UI panels must be single-open and hide inactive panel bodies');
assert(main.includes("let dockOpen = ACTIVE_CHARACTER.key === 'crimson'") && main.includes("let activePanel = ACTIVE_CHARACTER.key === 'crimson' ? 'model' : null") && main.includes('function setDockOpen'), 'mobile UI must keep an explicit dock open/close state and open Crimson model tools by default so model switching remains reachable');
assert(main.indexOf('data-mode="move"') > main.indexOf('data-panel="transform"'), 'Move/Rotate/Scale controls must live inside the Transform panel, not the always-visible primary rail');
assert(main.indexOf('data-camera-view="front"') > main.indexOf('data-panel="view"'), 'camera snap controls must live inside the View panel, not the always-visible primary rail');
assert(!main.includes('<div class="rail-group" aria-label="Tool">'), 'default primary rail must not expose paired mode button groups');
assert(main.includes('rightHandAppliedMatchesPreset') && main.includes('rightHandDiffersFromRest') && main.includes('rightHandAppliedQuaternion'), 'debugReady proof must report whether Ready RightHand actually applied');
assert(main.includes('readyDeltaMarkers') && main.includes('updateReadyDeltaMarkers') && main.includes('worldToScreenPixels'), 'debugReadyDelta mode must render Rest/Ready visible comparison markers');
assert(main.includes('rightHandWorldDelta') && main.includes('rightHandScreenDeltaPx') && main.includes('sabreScreenDeltaPx'), 'debugReadyDelta proof must report world and screen-space deltas');
assert(main.includes('rightHandQuaternionAngleDeg') && main.includes('rightHandAxisScreenDeltaPx') && main.includes('sabreBladeAxisAngleDeg') && main.includes('sabreBladeAxisScreenDeltaPx'), 'debugReadyDelta proof must report orientation and blade-axis deltas, not just positions');
assert(main.includes('orientationDeltaPass') && main.includes('NO_VISIBLE_ORIENTATION_DELTA') && main.includes('VISIBLE_ORIENTATION_DELTA'), 'debugReadyDelta proof must expose orientation-aware pass/fail states');
assert(!main.includes('const visibleDeltaPass = handScreenDelta > 1 || sabreScreenDelta > 1'), 'debugReadyDelta proof must not be position-only because wrist rotation can be visually important without moving the hand origin');
assert(main.includes('function runTouchProbe') && main.includes("probe: passed ? 'PASS' : 'FAIL'"), 'debugTouch mode must run a visible PASS/FAIL touch probe');
assert(main.includes('bone.position.copy(bonePositionBefore)') && main.includes('bone.quaternion.copy(boneQuaternionBefore)') && main.includes('bone.scale.copy(boneScaleBefore)'), 'touch probe must restore bone transforms after measuring controls');
assert(main.includes('cameraMovedDuringPoseTouch') && main.includes('boneQuaternionChanged') && main.includes('bonePositionChanged') && main.includes('boneScaleChanged'), 'touch probe must measure camera stability plus bone Move/Rotate/Scale changes');
assert(main.includes("setMode('move')") && main.includes("setMode('rotate')") && main.includes("setMode('scale')"), 'touch probe must exercise all object-mode controls against a selected bone');
assert(main.includes("gestureKindAfterStart === 'two-pose'"), 'touch probe must still verify two-pose ownership');
assert(main.includes('function blockPoseTouchPointer') && main.includes("event.pointerType !== 'touch' || toolMode !== 'pose' || !suppressTouchPointerEvents"), 'Pose mode must only firewall duplicate touch pointer events after the app owns a native touch gesture');
assert(main.includes('blockPoseTouchPointer') && main.includes('stopPropagation()'), 'Pose touch pointer firewall must not stopImmediatePropagation before app gesture handlers can pick visible bones');
assert(!main.includes("function blockPoseTouchPointer(event) {\n  if (event.pointerType !== 'touch' || toolMode !== 'pose') return;"), 'Pose touch pointer firewall must not regress to blocking all pose touch pointerdown events before bone picking');
assert(main.indexOf("canvas.addEventListener('pointerdown', blockPoseTouchPointer") >= 0 && main.indexOf("canvas.addEventListener('pointerdown', blockPoseTouchPointer") < main.indexOf('new OrbitControls(camera, canvas)'), 'Pose touch pointer firewall must register before OrbitControls');
assert(main.includes('cycleMode') && main.includes('tapCanCycle'), 'selected sabre tap must cycle transform mode like the TFTM tuner');
assert(main.includes('snapCamera') && main.includes('data-camera-view'), 'app must expose TFTM-style camera snap controls');
assert(main.includes('data-action="camera"') && main.includes('function leaveSaberEdit'), 'app must expose an explicit Camera/deselect escape from saber editing');
assert(main.includes('data-view-mode="orbit"') && main.includes('data-view-mode="firstPerson"'), 'app must expose Orbit/FPV camera mode buttons');
assert(main.includes('const firstPersonCameraConfig = {') && main.includes("cameraMode: 'head-forward'") && main.includes("anchor: 'Head'") && main.includes("fallbackAnchor: 'Spine02'"), 'FPV mode must use the Meshy head-forward camera contract from Pose Lab');
assert(main.includes('headForwardOffset: 0.15') && main.includes('headCameraYOffset: -0.07') && main.includes('lookForward: 1.35'), 'FPV camera must use the latest authored head-forward placement');
assert(main.includes('fov: 112') && main.includes('near: 0.055'), 'FPV camera must keep the original wide arm-visible framing');
assert(main.includes('FPV_VISIBLE_BONES') && main.includes('createFpvArmMask') && main.includes('updateFpvBodyMasks'), 'FPV mode must mask chest by replacing the full body with an arm-only skinned mesh');
assert(main.includes("fistHands: './assets/meshy/meshy_fist_hands.glb'") && main.includes('FIST_VISUAL_REVIEW') && main.includes('attachFistHandsToMeshy'), 'fist routes must load the real Meshy-derived fist hands asset and attach it to hand bones');
assert(main.includes('ensureFistControlBones') && main.includes('RightFistMitten01') && main.includes('RightFistThumb02') && main.includes('LeftFistMitten01') && main.includes('LeftFistThumb02'), 'fist review must expose selectable mitten and thumb control bones under the hand bones');
assert(main.includes("['fist', 'fistready', 'fist-ready'].includes(pose)") && main.includes("return 'fistReady'") && main.includes("Pose: ${POSE_STATE_LABELS[poseState] || 'Custom'}") && main.includes('data-cycle-animation'), 'FPV review must expose pose and imported-animation selection while booting fist routes into FistReady');
assert(main.includes('FPV_VISIBLE_BONES_FIST_REPLACEMENT') && main.includes('FIST_VISUAL_REVIEW ? FPV_VISIBLE_BONES_FIST_REPLACEMENT : FPV_VISIBLE_BONES'), 'fist review FPV mask must replace original hand vertices with the derived fist asset');
assert(!main.includes('hideBones') && !main.includes('hideScale') && !main.includes('firstPersonCameraConfig.hide') && !main.includes('setFirstPersonHeadMask'), 'FPV chest mask must not use old hide/scale/head-mask hacks');
assert(main.includes('fpvCamera') && main.includes('fpvArmMaskActive') && main.includes('fullBodyVisible'), 'debug proof must report FPV camera placement and body-mask state');
assert(main.includes('function setViewMode') && main.includes('function updateFirstPersonCamera') && main.includes("document.body.classList.add('is-fpv')"), 'FPV mode must switch the live camera from orbit controls to head-forward first-person view');
assert(main.includes("if (viewMode === 'orbit') controls.update();") && main.includes('else updateFirstPersonCamera();'), 'animation loop must keep FPV camera synced to the posed head bone');
assert(css.includes('body.is-fpv .primary-rail button:not([data-cycle-character]):not([data-cycle-tool]):not([data-cycle-pose-state]):not([data-cycle-view-mode]):not([data-fpv-settings-toggle]):not([data-attack-review-toggle])') && css.includes('body.is-fpv .primary-rail button[data-cycle-character]') && css.includes('body.is-fpv .primary-rail button[data-cycle-tool]') && css.includes('body.is-fpv .primary-rail button[data-cycle-pose-state]') && css.includes('body.is-fpv .primary-rail button[data-cycle-view-mode]') && css.includes('body.is-fpv .primary-rail button[data-fpv-settings-toggle]') && css.includes('body.is-fpv .primary-rail button[data-attack-review-toggle]') && css.includes('body.is-fpv .control-dock'), 'FPV mode must hide edit chrome while keeping Model, Tool, Clip, View, gear, and Attack controls reachable');
assert(!css.includes('body.is-fpv .primary-rail button:not([data-view-mode])'), 'FPV mode must not target hidden compatibility view buttons as the only visible escape');
assert(css.includes('.fpv-settings-button') && css.includes('.fpv-settings') && css.includes('.fpv-nudge-grid') && css.includes('.fpv-slider'), 'FPV settings must have compact dedicated mobile styling');
assert(css.includes('.viewport') && css.includes('.control-dock') && css.includes('max-height: 42vh'), 'mobile layout must keep the 3D viewport visible while dock panels scroll below it');
assert(css.includes('.attack-review') && css.includes('top: 68px') && css.includes('body.is-fpv .attack-review') && css.includes('top: 56px') && css.includes('.attack-review-close') && css.includes('.attack-primes') && css.includes('pointer-events: auto'), 'Attack1 candidate review controls must be top-visible, touchable, closable, and reachable in FPV');
assert(css.includes('.control-dock[hidden]') && css.includes('.hidden-actions'), 'closed dock and compatibility action buttons must be visually hidden by default');
assert(main.includes('function beginCameraTouch') && main.includes("kind: points.length >= 2 ? 'two-camera' : 'one-camera'"), 'mobile camera touch must be handled directly, not delegated to OrbitControls');
assert(main.includes("leaveSaberEdit('camera: empty touch orbit')") && main.includes('beginCameraTouch(points)'), 'empty canvas touch must deselect the sabre and start one-finger camera orbit');
assert(main.includes('function orbitCameraByDelta') && main.includes('function zoomCameraByDelta') && main.includes('function panCameraByDelta'), 'mobile camera must support one-finger orbit and two-finger zoom/pan');
assert(main.includes('data-axis="screen"') && main.includes('data-axis="all"') && main.includes('data-axis="x"') && main.includes('data-axis="y"') && main.includes('data-axis="z"'), 'app must expose TFTM-style split axis controls');
assert(main.includes("let currentAxis = 'screen'") && main.includes("currentAxis = mode === 'scale' ? 'all' : 'screen'"), 'mode changes must reset axis to Screen or All');
assert(main.includes('function moveEditableByGesture') && main.includes('function rotateEditableByGesture') && main.includes('function scaleEditableByDelta'), 'saber and bone transforms must route through shared split-axis helpers');
assert(main.includes('rotateSabreAroundAxis(basis.up.clone(), dx * 0.007)') && main.includes('rotateSabreAroundAxis(basis.right.clone(), dy * 0.007)'), 'saber screen rotation must target SaberGrip, not the child mesh directly');
assert(main.includes("if (mode === 'scale' && lastPinchDistance > 0)") && main.includes("if (mode === 'rotate' && Number.isFinite(lastTwistAngle))"), 'two-finger gestures must be gated to Scale and Rotate modes');
assert(main.includes("const axis = currentAxis === 'screen' ? touchGesture.forward.clone() : worldAxisVector(currentAxis)"), 'two-finger rotate must default to screen roll from the native touch basis');
assert(main.includes("two-finger camera gesture ignored in Move"), 'Move mode must not transform the saber with two-finger gestures');
assert(main.includes('function saberTransformClaimsEmptyGesture()') && main.includes("if (!hit && !saberTransformClaimsEmptyGesture())") && main.includes("&& (selected || mode === 'rotate' || mode === 'scale')") && main.includes('beginTwoFingerSabre(points)'), 'Saber Rotate/Scale must claim canvas gestures instead of falling through to camera when the thin sword pick misses');
assert(main.includes('function beginSingleTouchSabre') && main.includes("kind: 'single-sabre'"), 'one-finger touch on the real saber must directly edit the selected mesh');
assert(main.includes('function beginTwoFingerSabre') && main.includes("kind: 'two-sabre'"), 'two-finger touch must have a direct saber transform path');
assert(!main.includes('GESTURE_OWNER'), 'failed pointer-owner experiment must not remain in the clean mobile touch path');
assert(main.includes("canvas.addEventListener('pointerdown', startGesture, { capture: true })"), 'saber gesture pointerdown must capture before OrbitControls');
assert(main.includes('event.stopImmediatePropagation();'), 'owned saber gestures must stop OrbitControls from stealing active two-finger edits');
assert(main.includes("schema: 'pose-lab-v2-sabre-transform-v1'"), 'app must export a compact saber transform');

if (exists('dist')) {
  assert(exists('dist/index.html'), 'dist must include index.html');
  assert(exists('dist/src/main.js'), 'dist must include the app module at /src/main.js under the repo path');
  assert(exists('dist/src/pose-status.js'), 'dist must include pose-status.js');
  assert(exists('dist/src/review-constants.js'), 'dist must include shared review constants');
  assert(exists('dist/src/fist-ready-pose.js'), 'dist must include FistReady pose preset');
  assert(exists('dist/src/review-candidates/attack1-candidate-1.js'), 'dist must include Attack1 candidate preview module');
  assert(exists('dist/src/review-candidates/attack2-candidate-1.js'), 'dist must include Attack2 candidate preview module');
  assert(exists('dist/src/review-candidates/attack1-tip-match-1.js'), 'dist must include Attack1 tip-match candidate preview module');
  assert(exists('dist/src/review-candidates/attack1-tip-basis-2.js'), 'dist must include Attack1 tip-basis candidate preview module');
  assert(exists('dist/src/review-candidates/attack1-joint-pinned-3.js'), 'dist must include Attack1 joint-pinned candidate preview module');
  assert(exists('dist/src/review-candidates/crimson-light-attack1-vanguard-2.js'), 'dist must include Crimson light Attack1 Vanguard v2 candidate preview module');
  assert(exists('dist/assets/crimson/crimson_light_attack1_weapon_baseline.json'), 'dist must expose Crimson light Attack1 saved weapon baseline');
  assert(exists('dist/src/review-candidates/fist-ready-candidate-1.js'), 'dist must include FistReady candidate preview module');
  assert(exists('dist/src/review-candidates/fist-attack1-candidate-1.js'), 'dist must include FistAttack1 candidate preview module');
  assert(exists('dist/src/review-candidates/davin-lowbackkick-ares-transfer-1.js'), 'dist must include Davin LowBackKick candidate preview module');
  assert(exists('dist/src/review-candidates/davin-idle-screenshot-1.js'), 'dist must include Davin screenshot idle candidate preview module');
  assert(!exists('dist/src/attack1-pose.js'), 'dist must not ship the contaminated Attack1 pose sequence');
  assert(exists('dist/vendor/three/build/three.module.js'), 'dist must include vendored Three');
  assert(exists('dist/vendor/three/examples/jsm/loaders/GLTFLoader.js'), 'dist must include vendored GLTFLoader');
  assert(exists('dist/vendor/three/examples/jsm/controls/OrbitControls.js'), 'dist must include vendored OrbitControls');
  assert(exists('dist/vendor/three/examples/jsm/utils/BufferGeometryUtils.js'), 'dist must include vendored BufferGeometryUtils');
  assert(exists('dist/assets/meshy/meshy_apose_walking_with_skin.glb'), 'dist must expose Meshy GLB at /assets/meshy');
  assert(exists('dist/assets/meshy/meshy_real_sabre.glb'), 'dist must expose real sabre GLB at /assets/meshy');
  assert(exists('dist/assets/meshy/meshy_fist_hands.glb'), 'dist must expose Meshy-derived fist hands GLB at /assets/meshy');
  assert(exists('dist/assets/vanguard/vanguard_rigged_animations.glb'), 'dist must expose Vanguard runtime GLB at /assets/vanguard');
  assert(exists('dist/assets/vanguard/vanguard_manifest.json'), 'dist must expose Vanguard runtime manifest at /assets/vanguard');
  assert(exists('dist/assets/vanguard/vanguard_root_motion.json'), 'dist must expose Vanguard root motion sidecar at /assets/vanguard');
  assert(exists('dist/assets/crimson/crimson_plume_knight_rigged_pbr.glb'), 'dist must expose Crimson runtime GLB at /assets/crimson');
  assert(exists('dist/assets/crimson/arborblade_sword.glb'), 'dist must expose Arborblade sword GLB at /assets/crimson');
  assert(exists('dist/assets/crimson/crimson_manifest.json'), 'dist must expose Crimson runtime manifest at /assets/crimson');
  assert(exists('dist/assets/crimson/crimson_sword_calibration.json'), 'dist must expose Crimson sword calibration at /assets/crimson');
  assert(exists('dist/assets/crimson/vanguard_swordattack1_reference.json'), 'dist must expose Crimson Vanguard SwordAttack1 reference at /assets/crimson');
  assert(exists('dist/assets/meshy/character_sheet_pbr/base_color.jpg'), 'dist must expose Meshy Character Sheet base color texture');
  assert(exists('dist/assets/meshy/character_sheet_pbr/emissive.jpg'), 'dist must expose Meshy Character Sheet emission texture');
  assert(exists('dist/assets/meshy/character_sheet_pbr/metallic_roughness.jpg'), 'dist must expose Meshy Character Sheet metallic-roughness texture');
  assert(exists('dist/assets/meshy/character_sheet_pbr/normal.png'), 'dist must expose Meshy Character Sheet normal texture');
}

for (const file of [
  'src/main.js',
  'src/review-constants.js',
  'src/fist-ready-pose.js',
  'src/review-candidates/attack1-candidate-1.js',
  'src/review-candidates/attack2-candidate-1.js',
  'src/review-candidates/fist-ready-candidate-1.js',
  'src/review-candidates/fist-attack1-candidate-1.js',
  'src/review-candidates/attack1-tip-match-1.js',
  'src/review-candidates/attack1-tip-basis-2.js',
  'src/review-candidates/attack1-joint-pinned-3.js',
  'src/review-candidates/crimson-light-attack1-vanguard-2.js',
  'vendor/three/examples/jsm/loaders/GLTFLoader.js',
  'vendor/three/examples/jsm/controls/OrbitControls.js',
  'vendor/three/examples/jsm/utils/BufferGeometryUtils.js',
  'tools/import_vanguard/export_vanguard_glb.py',
  'tools/import_vanguard/export_vanguard_root_motion.py',
]) {
  assertRelativeImportsResolve(file);
}

for (const forbidden of [
  'weapon-numeric-grid',
  'weapon-nudge-grid',
  'debugBridge',
  'retarget',
  'WeaponR',
  'WeaponGrip',
  'visual_truth',
  'pose_lab_case',
  'metric acceptance',
  'vite',
  'esbuild',
]) {
  assert(!main.includes(forbidden), `app source must not include Pose Lab poison marker: ${forbidden}`);
  assert(!html.includes(forbidden), `HTML must not include Pose Lab poison marker: ${forbidden}`);
  assert(!css.includes(forbidden), `CSS must not include Pose Lab poison marker: ${forbidden}`);
}

const crimsonBlenderRenderSource = read('tools/import_crimson/render_crimson_sword_calibration_blender.py');
assert(crimsonBlenderRenderSource.includes('crimson_model_viewer_constraints.json') && crimsonBlenderRenderSource.includes('contract_hash'), 'Crimson Blender diagnostic must read and record the model-viewer constraint contract');
assert(!crimsonBlenderRenderSource.includes('obj.scale = (0.82, 0.82, 0.82)') && !crimsonBlenderRenderSource.includes('obj.location = hand'), 'Crimson Blender diagnostic must not reintroduce independent sword scale or hand-head placement');

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checked: [
    'real-meshy-character-asset',
    'real-sabre-asset',
    'direct-visible-sabre-gestures',
    'no-pose-lab-runtime-markers',
    'no-text-field-authoring',
  ],
}, null, 2));

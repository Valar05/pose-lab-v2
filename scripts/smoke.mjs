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
const poseStatusSource = read('src/pose-status.js');
const reviewConstantsSource = read('src/review-constants.js');
const attackCandidateSource = read('src/review-candidates/attack1-candidate-1.js');
const tipBasisCandidateSource = read('src/review-candidates/attack1-tip-basis-2.js');
const jointPinnedCandidateSource = read('src/review-candidates/attack1-joint-pinned-3.js');
const attackReviewUrls = read('tools/attack1_review_urls.mjs');
const html = read('index.html');
const css = read('src/styles.css');
const readme = read('README.md');
const visualDoctrine = read('docs/VISUAL_VERIFICATION_DOCTRINE.md');
const pkg = JSON.parse(read('package.json'));
const importFromRegex = /from\s+['"]([^'"]+)['"]/g;
const moduleExportRegex = /export const \w+ = (.*);\s*$/s;

function parseExportedObject(source, label) {
  const match = source.match(moduleExportRegex);
  assert(Boolean(match), `${label} must export a plain object literal`);
  if (!match) return {};
  return JSON.parse(match[1]);
}

const readyPreset = parseExportedObject(readyPose, 'Ready pose preset');
const poseStatus = parseExportedObject(poseStatusSource, 'Pose status manifest');
const attackCandidate = parseExportedObject(attackCandidateSource, 'Attack1 candidate preview');
const tipBasisCandidate = parseExportedObject(tipBasisCandidateSource, 'Attack1 tip-basis candidate preview');
const jointPinnedCandidate = parseExportedObject(jointPinnedCandidateSource, 'Attack1 joint-pinned candidate preview');
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

assert(exists('public/assets/meshy/meshy_apose_walking_with_skin.glb'), 'missing Meshy A-pose/walking GLB');
assert(exists('public/assets/meshy/meshy_real_sabre.glb'), 'missing real sabre GLB');
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
assert(html.includes('loading Meshy character and real sabre'), 'HTML shell must not be blank before JS boots');
assert(!html.includes('src="/src/main.js"'), 'GitHub Pages build must not use a root-relative module path');
assert(html.includes("new URLSearchParams(window.location.search)") && html.includes("startupParams.get('cacheBust')"), 'HTML boot must propagate cacheBust into subresources');
assert(html.includes('"three": "./vendor/three/build/three.module.js"'), 'HTML must use same-origin vendored Three dependency');
assert(html.includes('"three/examples/jsm/": "./vendor/three/examples/jsm/"'), 'HTML must use same-origin vendored Three examples');
assert(!html.includes('cdn.jsdelivr.net'), 'runtime must not depend on a CDN before the app can render');
assert(!pkg.dependencies, 'repo must not require npm install dependencies for local build');
assert(pkg.scripts?.build === 'node scripts/build.mjs', 'build must be static and native-binary free');
assert(pkg.scripts?.['bake:ready'] === 'node scripts/bake-ready-pose.mjs', 'Ready pose bake script must be explicit and reproducible');
assert(pkg.scripts?.['bake:attack1:candidate'] === 'node scripts/bake-attack1-candidate.mjs', 'Attack1 candidate bake must be explicit and quarantine-only');
assert(pkg.scripts?.['bake:attack1:tip-match'] === 'node scripts/bake-attack1-tip-match-candidate.mjs', 'Attack1 tip-match candidate bake must be explicit and quarantine-only');
assert(pkg.scripts?.['bake:attack1:tip-basis'] === 'node scripts/bake-attack1-tip-basis-candidate.mjs', 'Attack1 tip-basis candidate bake must be explicit and quarantine-only');
assert(pkg.scripts?.['bake:attack1:joint-pinned'] === 'node scripts/bake-attack1-joint-pinned-candidate.mjs', 'Attack1 joint-pinned candidate bake must be explicit and quarantine-only');
assert(pkg.scripts?.['reference:attack1:fps'] === 'node scripts/fps-attack1-reference.mjs', 'FPS Attack1 reference extraction must be explicit and separate from Meshy authoring');
assert(!pkg.scripts?.['bake:attack1'] && !pkg.scripts?.['diagnose:blade'], 'official scripts must not regenerate or bless the quarantined Attack1 pose');
assert(pkg.scripts?.['promote:animation'] === 'node tools/promote_animation_candidate.mjs', 'animation promotion must use the explicit promotion gate');
assert(pkg.scripts?.['review:attack1'] === 'node tools/attack1_review_urls.mjs', 'Attack1 review URLs must remain available');
assert(exists('tools/promote_animation_candidate.mjs'), 'missing animation promotion gate');
assert(exists('tools/attack1_review_urls.mjs'), 'missing Attack1 review URL printer');
assert(exists('scripts/bake-attack1-candidate.mjs'), 'missing Attack1 candidate bake script');
assert(exists('scripts/bake-attack1-tip-match-candidate.mjs'), 'missing Attack1 tip-match candidate bake script');
assert(exists('scripts/bake-attack1-tip-basis-candidate.mjs'), 'missing Attack1 tip-basis candidate bake script');
assert(exists('scripts/bake-attack1-joint-pinned-candidate.mjs'), 'missing Attack1 joint-pinned candidate bake script');
assert(exists('scripts/fps-attack1-reference.mjs'), 'missing FPS Attack1 reference extractor');
assert(attackReviewUrls.includes('wakeBrowser: false') && !attackReviewUrls.includes('termux-open-url') && !attackReviewUrls.includes('am start'), 'Attack1 review URL printer must output exact URLs only and never wake a browser');
assert(attackReviewUrls.includes('attack1-candidate-1') && attackReviewUrls.includes('attack1-joint-pinned-3') && attackReviewUrls.includes('worldSocket') && !attackReviewUrls.includes('attack1-tip-basis-2') && !attackReviewUrls.includes('attack1-tip-match-1') && attackReviewUrls.includes('anticipation') && attackReviewUrls.includes('contact') && attackReviewUrls.includes('recoil'), 'Attack1 review URLs must target candidate prime keys and joint-pinned world-socket overlay URLs');
assert(!exists('src/attack1-pose.js'), 'contaminated Attack1 generated pose data must not be shipped as repo truth');
assert(exists('src/review-candidates/attack1-candidate-1.js'), 'Attack1 candidate 1 must be available as a preview module');
assert(exists('src/review-candidates/attack1-tip-match-1.js'), 'Attack1 tip-match candidate 1 must be available as a preview module');
assert(exists('src/review-candidates/attack1-tip-basis-2.js'), 'Attack1 tip-basis candidate 2 must be available as a preview module');
assert(exists('src/review-candidates/attack1-joint-pinned-3.js'), 'Attack1 joint-pinned candidate 3 must be available as a preview module');
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
assert(!tipBasisCandidateSource.includes('SaberGrip.quaternion') && !tipBasisCandidateSource.includes('WeaponR.quaternion'), 'Attack1 tip-basis module must not animate SaberGrip or WeaponR tracks');
assert(!jointPinnedCandidateSource.includes('SaberGrip.quaternion') && !jointPinnedCandidateSource.includes('WeaponR.quaternion'), 'Attack1 joint-pinned module must not animate SaberGrip or WeaponR tracks');
assert(!read('scripts/bake-attack1-candidate.mjs').includes('applyOrientationBake') && !read('scripts/bake-attack1-candidate.mjs').includes('bakeCurrentFpsPoseToMeshy'), 'Attack1 candidate bake must not retarget FPS quaternions into Meshy');
assert(readme.includes('Visual Verification Doctrine'), 'README must link the visual verification doctrine');
assert(readme.includes('They are not visual acceptance and cannot close a') && readme.includes('screenshot-red build'), 'README must state smoke/source checks are not visual acceptance');
assert(visualDoctrine.includes('Human-visible truth is the acceptance gate'), 'visual doctrine must preserve human-visible truth as acceptance gate');
assert(visualDoctrine.includes('Local render is agent eyesight') && visualDoctrine.includes('not final acceptance'), 'visual doctrine must classify local render as diagnostic eyesight, not final acceptance');
assert(visualDoctrine.includes('`npm run smoke`') && visualDoctrine.includes('not visual acceptance'), 'visual doctrine must forbid smoke-as-visual-acceptance claims');
assert(exists('vendor/three/build/three.module.js'), 'missing vendored Three module');
assert(exists('vendor/three/examples/jsm/loaders/GLTFLoader.js'), 'missing vendored GLTFLoader');
assert(exists('vendor/three/examples/jsm/controls/OrbitControls.js'), 'missing vendored OrbitControls');
assert(exists('vendor/three/examples/jsm/utils/BufferGeometryUtils.js'), 'missing vendored BufferGeometryUtils');
assert(main.includes("meshy_apose_walking_with_skin.glb"), 'app must reference Meshy GLB');
assert(main.includes("meshy_real_sabre.glb"), 'app must reference real sabre GLB');
assert(main.includes('const MESHY_PBR_TEXTURES = {') && main.includes('character_sheet_pbr/normal.png'), 'app must reference salvaged Meshy Character Sheet PBR texture channels');
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
assert(main.includes('ATTACK1_REVIEW_CANDIDATES') && main.includes('SABER_GRIP_LOCAL') && main.includes("from './review-constants.js'"), 'runtime must import shared review constants for saber grip and Attack1 previews');
assert(main.includes('async function loadPosePresets') && main.includes('readyStatus.module') && main.includes("URL_PARAMS.get('cacheBust')"), 'Ready pose preset must be dynamically imported from pose-status.js with the page cacheBust');
assert(!main.includes("import(`./attack1-pose.js${suffix}`)") && !main.includes('ATTACK1_POSE_SEQUENCE'), 'runtime must not import contaminated Attack1 generated pose data');
assert(main.includes('data-pose-state="rest"') && main.includes('data-pose-state="ready"') && main.includes('data-pose-state="attack1"'), 'app must expose Rest, Ready, and Attack1 pose states');
assert(main.includes('function initialPoseStateFromUrl') && main.includes("pose === 'ready'") && main.includes('REQUESTED_ATTACK_QUARANTINED') && main.includes("return 'attack1'"), 'cloud review URL must be able to boot directly into Ready or quarantined Attack1');
assert(main.includes('function initialViewModeFromUrl') && main.includes("URL_PARAMS.get('view') === 'fpv'") && main.includes('setViewMode(initialViewModeFromUrl())'), 'cloud review URL must be able to boot directly into FPV view');
assert(main.includes("let poseState = 'rest'") && main.includes('function applyReadyPose') && main.includes("poseState = 'ready'"), 'runtime must switch to baked Ready without animation retargeting');
assert(main.includes('function applyAttackPose') && main.includes("poseState = 'attack1'") && main.includes('Attack1 quarantined'), 'Attack1 must remain selectable but quarantined until a clean bake exists');
assert(main.includes('ATTACK1_REVIEW_CANDIDATES[REQUESTED_CANDIDATE]') && main.includes('Attack1 candidate preview') && main.includes('not accepted repo truth'), 'runtime must allow explicit candidate preview without accepting Attack1');
assert(main.includes('function sequenceFrameAt') && main.includes('function applyAttackSequenceAt'), 'Attack1 candidate preview must play baked frames only');
assert(main.includes('data-attack-review') && main.includes('data-attack-review-toggle') && main.includes('data-attack-review-close') && main.includes('data-attack-play') && main.includes('data-attack-pause') && main.includes('data-attack-scrub') && main.includes('data-attack-primes'), 'Attack1 candidate preview must expose closable play/pause, scrub, and prime-key controls');
assert(main.includes('data-attack-save-key') && main.includes('data-attack-export'), 'Attack1 manual authoring must expose save-key and whole-animation export controls');
assert(main.includes("schema: 'pose-lab-v2-manual-animation-v1'") && main.includes("seed: 'blank-ready-per-key'") && main.includes('candidateFramesUsed: false'), 'Attack1 manual authoring must export a blank-Ready whole-animation draft that does not use candidate frames');
assert(main.includes('function createManualAttackDraft') && main.includes('applyReadyPose()') && main.includes('snapshotPoseBones()'), 'Attack1 manual draft keys must initialize from accepted Ready and snapshot the full curated pose state');
assert(main.includes('function saveManualAttackKey') && main.includes('function exportManualAttackDraft'), 'Attack1 manual authoring must save per-key poses and export the whole animation');
assert(main.includes('function useManualAttackAuthoring') && main.includes('return REQUESTED_MANUAL_ATTACK || !REQUESTED_CANDIDATE'), 'Attack1 without an explicit candidate must enter blank manual authoring');
assert(main.includes("const WORLD_SOCKET_REVIEW = URL_PARAMS.get('worldSocket') === '1'") && main.includes('data-tip-match-overlay') && main.includes('function updateTipMatchOverlay') && main.includes('function liveJointPinnedProbe') && main.includes('LIVE FAIL'), 'Attack1 joint-pinned preview must expose an explicit live world-socket error overlay');
assert(main.includes('function setAttackReviewOpen') && main.includes('attackReviewOpen = Boolean(open && (REQUESTED_CANDIDATE || manualAttackDraft || useManualAttackAuthoring()))') && main.includes('attackReviewPanel.hidden = !(active && attackReviewOpen)'), 'Attack1 controls must be toggleable, not a permanent floating review window');
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
assert(main.includes("findRequiredBone(meshyRoot, 'RightHand')"), 'runtime saber grip must parent under the real Meshy RightHand bone');
assert(reviewConstantsSource.includes('export const SABER_GRIP_LOCAL = {') && reviewConstantsSource.includes('position: [8.52296, 28.41254, -24.44467]'), 'SaberGrip must use explicit authored RightHand-local placement from shared review constants');
assert(reviewConstantsSource.includes('SABRE_REVIEW_LOCAL_AXIS') && reviewConstantsSource.includes('ATTACK1_REVIEW_CANDIDATES'), 'review constants must expose blade axis and candidate manifest');
assert(reviewConstantsSource.includes('attack1-tip-match-1') && reviewConstantsSource.includes('failed diagnostic') && reviewConstantsSource.includes('attack1-tip-basis-2') && reviewConstantsSource.includes('failed diagnostic') && reviewConstantsSource.includes('attack1-joint-pinned-3') && reviewConstantsSource.includes('ATTACK1_JOINT_PINNED_SEQUENCE'), 'review constants must register failed diagnostics and current joint-pinned preview candidate');
assert(main.includes("grip.name = 'SaberGrip'") && main.includes('rightHand.add(grip)') && main.includes('grip.add(sabreRoot)'), 'real sabre mesh must be parented through explicit local SaberGrip FK');
assert(main.includes('sabreRoot.position.set(0, 0, 0)') && main.includes('sabreRoot.quaternion.identity()') && main.includes('sabreRoot.scale.set(1, 1, 1)'), 'sabre mesh local transform under SaberGrip must be identity');
assert(!main.includes('rightHand.attach(grip)') && !main.includes('grip.attach(sabreRoot)'), 'SaberGrip must not preserve world placement through Object3D.attach');
assert(main.includes('function editableSaber()') && main.includes('return saberGrip || sabreRoot'), 'direct transforms must target SaberGrip after hand parenting');
assert(main.includes("parentBone: 'RightHand'"), 'export must report SaberGrip as RightHand-owned');
assert(main.includes("let toolMode = 'saber'") && main.includes('data-tool="saber"') && main.includes('data-tool="pose"'), 'app must distinguish top-level Saber and Pose modes');
assert(main.includes('const POSE_BONE_NAMES = [') && main.includes("'RightHand'") && main.includes("'LeftFoot'"), 'Pose mode must expose curated real Meshy body bones');
assert(main.includes('function setupPoseHandles') && main.includes('PoseHandle:') && main.includes('function pickPoseHandle'), 'Pose mode must create visible selectable bone handles');
assert(main.includes('function updateOctahedralBoneGeometry') && main.includes('poseBoneTailPosition') && main.includes('handle.userData.head') && main.includes('handle.userData.tail'), 'Pose handles must render Blender-style head-to-tail octahedral bone bodies');
assert(main.includes('const FPV_POSE_HANDLE_NAMES = new Set(POSE_BONE_NAMES)'), 'FPV pose mode must show the curated skeleton overlay across the body');
assert(!main.includes('new THREE.OctahedronGeometry(1, 0)') && !main.includes('poseHandleWorldPosition') && !main.includes('position.lerp(objectWorldPosition'), 'Pose handles must not regress to point markers or clever midpoint widgets');
assert(main.includes('raycaster.intersectObjects(visibleHandles, false)') && main.includes('function projectedHandlePickInfo') && main.includes('function pointInScreenTriangle'), 'Pose handle picking must raycast visible octahedral bone meshes first, then use projected envelope fallback');
assert(!main.includes('function posePickPriority') && !main.includes('screenArea'), 'Pose handle picking must not use clever priority scoring that can make visible bones unselectable');
assert(!main.includes('worldToScreenPixels(handle.userData.head)') && !main.includes('worldToScreenPixels(handle.userData.tail)'), 'Pose handle picking must not regress to head-tail-only centerline selection');
assert(main.includes("viewMode !== 'firstPerson' || FPV_POSE_HANDLE_NAMES.has(name)"), 'FPV pose mode must use the explicit FPV-visible skeleton handle set');
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
assert(!main.includes('AnimationMixer') && !main.includes('clipAction') && !main.includes('retarget'), 'v2 Ready must stay baked-pose only, not runtime animation retargeting');
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
assert(main.includes('data-cycle-tool') && main.includes('data-cycle-pose-state') && main.includes('data-cycle-view-mode') && main.includes('data-dock-toggle'), 'default mobile UI must use compact cycle controls plus one Tools opener');
assert(main.includes('data-fpv-settings-toggle') && main.includes('data-fpv-settings') && main.includes('data-fpv-nudge="forward"') && main.includes('data-fpv-nudge="back"') && main.includes('data-fpv-nudge="up"') && main.includes('data-fpv-nudge="down"'), 'FPV mode must expose a gear settings panel with forward/back/up/down nudges');
assert(main.includes('data-fpv-fov') && main.includes('data-fpv-fov-output') && main.includes('function setFpvFov'), 'FPV gear panel must expose a live FOV slider');
assert(!main.includes('data-fpv-nudge="left"') && !main.includes('data-fpv-nudge="right"'), 'FPV nudge panel must not expose left/right movement controls');
assert(main.includes('>↑</button>') && main.includes('>↓</button>') && main.includes('>⇧</button>') && main.includes('>⇩</button>'), 'FPV nudge controls must use arrow symbols instead of WASD/QE labels');
assert(main.includes('FPV_NUDGE_STEP = 0.01') && main.includes('FPV_NUDGE_HOLD_SPEED = 0.12') && main.includes('startFpvNudge') && main.includes('runFpvNudgeHold'), 'FPV nudge controls must support tap nudges and slow hold movement');
assert(main.includes('fpvSettingsExport') && main.includes('data-fpv-copy') && main.includes('data-fpv-reset'), 'FPV settings must expose copy and reset actions');
assert(!main.includes('localStorage'), 'FPV camera tweaks must stay session-only and must not use localStorage');
assert(main.includes('class="control-dock" aria-label="Secondary editor controls" hidden'), 'secondary control dock must be closed by default so the canvas is not covered on load');
assert(main.includes('data-panel-toggle="transform"') && main.includes('data-panel-toggle="view"') && main.includes('data-panel-toggle="export"') && main.includes('data-panel-toggle="debug"'), 'mobile UI must expose collapsible Transform/View/Export/Debug panels');
assert(main.includes('function setControlPanel') && main.includes('controlPanels') && main.includes('element.hidden = !active'), 'mobile UI panels must be single-open and hide inactive panel bodies');
assert(main.includes('let dockOpen = false') && main.includes('let activePanel = null') && main.includes('function setDockOpen'), 'mobile UI must start with no open panel and an explicit dock open/close state');
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
assert(main.includes('LeftShoulder') && main.includes('RightHand') && !main.includes('data-fpv-nudge="left"'), 'FPV arm mask must preserve arms/hands without adding lateral camera controls');
assert(!main.includes('hideBones') && !main.includes('hideScale') && !main.includes('firstPersonCameraConfig.hide') && !main.includes('setFirstPersonHeadMask'), 'FPV chest mask must not use old hide/scale/head-mask hacks');
assert(main.includes('fpvCamera') && main.includes('fpvArmMaskActive') && main.includes('fullBodyVisible'), 'debug proof must report FPV camera placement and body-mask state');
assert(main.includes('function setViewMode') && main.includes('function updateFirstPersonCamera') && main.includes("document.body.classList.add('is-fpv')"), 'FPV mode must switch the live camera from orbit controls to head-forward first-person view');
assert(main.includes("if (viewMode === 'orbit') controls.update();") && main.includes('else updateFirstPersonCamera();'), 'animation loop must keep FPV camera synced to the posed head bone');
assert(css.includes('body.is-fpv .primary-rail button:not([data-cycle-tool]):not([data-cycle-view-mode]):not([data-fpv-settings-toggle]):not([data-attack-review-toggle])') && css.includes('body.is-fpv .primary-rail button[data-cycle-tool]') && css.includes('body.is-fpv .primary-rail button[data-cycle-view-mode]') && css.includes('body.is-fpv .primary-rail button[data-fpv-settings-toggle]') && css.includes('body.is-fpv .primary-rail button[data-attack-review-toggle]') && css.includes('body.is-fpv .control-dock'), 'FPV mode must hide edit chrome while keeping Tool, View, gear, and Attack controls reachable');
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
assert(main.includes('points.length >= 2 && toolMode === \'saber\' && selected && (mode === \'rotate\' || mode === \'scale\')') && main.includes('beginTwoFingerSabre(points)'), 'selected saber must own native two-finger Rotate/Scale anywhere on the canvas');
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
  assert(exists('dist/src/review-candidates/attack1-candidate-1.js'), 'dist must include Attack1 candidate preview module');
  assert(exists('dist/src/review-candidates/attack1-tip-match-1.js'), 'dist must include Attack1 tip-match candidate preview module');
  assert(exists('dist/src/review-candidates/attack1-tip-basis-2.js'), 'dist must include Attack1 tip-basis candidate preview module');
  assert(exists('dist/src/review-candidates/attack1-joint-pinned-3.js'), 'dist must include Attack1 joint-pinned candidate preview module');
  assert(!exists('dist/src/attack1-pose.js'), 'dist must not ship the contaminated Attack1 pose sequence');
  assert(exists('dist/vendor/three/build/three.module.js'), 'dist must include vendored Three');
  assert(exists('dist/vendor/three/examples/jsm/loaders/GLTFLoader.js'), 'dist must include vendored GLTFLoader');
  assert(exists('dist/vendor/three/examples/jsm/controls/OrbitControls.js'), 'dist must include vendored OrbitControls');
  assert(exists('dist/vendor/three/examples/jsm/utils/BufferGeometryUtils.js'), 'dist must include vendored BufferGeometryUtils');
  assert(exists('dist/assets/meshy/meshy_apose_walking_with_skin.glb'), 'dist must expose Meshy GLB at /assets/meshy');
  assert(exists('dist/assets/meshy/meshy_real_sabre.glb'), 'dist must expose real sabre GLB at /assets/meshy');
  assert(exists('dist/assets/meshy/character_sheet_pbr/base_color.jpg'), 'dist must expose Meshy Character Sheet base color texture');
  assert(exists('dist/assets/meshy/character_sheet_pbr/emissive.jpg'), 'dist must expose Meshy Character Sheet emission texture');
  assert(exists('dist/assets/meshy/character_sheet_pbr/metallic_roughness.jpg'), 'dist must expose Meshy Character Sheet metallic-roughness texture');
  assert(exists('dist/assets/meshy/character_sheet_pbr/normal.png'), 'dist must expose Meshy Character Sheet normal texture');
}

for (const file of [
  'src/main.js',
  'src/review-constants.js',
  'src/review-candidates/attack1-candidate-1.js',
  'src/review-candidates/attack1-tip-match-1.js',
  'src/review-candidates/attack1-tip-basis-2.js',
  'src/review-candidates/attack1-joint-pinned-3.js',
  'vendor/three/examples/jsm/loaders/GLTFLoader.js',
  'vendor/three/examples/jsm/controls/OrbitControls.js',
  'vendor/three/examples/jsm/utils/BufferGeometryUtils.js',
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

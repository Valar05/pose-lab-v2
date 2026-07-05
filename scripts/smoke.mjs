import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const main = read('src/main.js');
const readyPose = read('src/ready-pose.js');
const html = read('index.html');
const css = read('src/styles.css');
const pkg = JSON.parse(read('package.json'));
const importFromRegex = /from\s+['"]([^'"]+)['"]/g;

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
assert(html.includes('src="./src/main.js"'), 'HTML must load the minimal app entry with a repo-relative URL');
assert(html.includes('href="./src/styles.css"'), 'HTML must load CSS directly for no-bundler GitHub Pages runtime');
assert(html.includes('loading Meshy character and real sabre'), 'HTML shell must not be blank before JS boots');
assert(!html.includes('src="/src/main.js"'), 'GitHub Pages build must not use a root-relative module path');
assert(html.includes('"three": "./vendor/three/build/three.module.js"'), 'HTML must use same-origin vendored Three dependency');
assert(html.includes('"three/examples/jsm/": "./vendor/three/examples/jsm/"'), 'HTML must use same-origin vendored Three examples');
assert(!html.includes('cdn.jsdelivr.net'), 'runtime must not depend on a CDN before the app can render');
assert(!pkg.dependencies, 'repo must not require npm install dependencies for local build');
assert(pkg.scripts?.build === 'node scripts/build.mjs', 'build must be static and native-binary free');
assert(pkg.scripts?.['bake:ready'] === 'node scripts/bake-ready-pose.mjs', 'Ready pose bake script must be explicit and reproducible');
assert(exists('vendor/three/build/three.module.js'), 'missing vendored Three module');
assert(exists('vendor/three/examples/jsm/loaders/GLTFLoader.js'), 'missing vendored GLTFLoader');
assert(exists('vendor/three/examples/jsm/controls/OrbitControls.js'), 'missing vendored OrbitControls');
assert(exists('vendor/three/examples/jsm/utils/BufferGeometryUtils.js'), 'missing vendored BufferGeometryUtils');
assert(main.includes("meshy_apose_walking_with_skin.glb"), 'app must reference Meshy GLB');
assert(main.includes("meshy_real_sabre.glb"), 'app must reference real sabre GLB');
assert(main.includes("import { READY_POSE_PRESET } from './ready-pose.js'"), 'app must import the baked Ready pose preset');
assert(main.includes('data-pose-state="rest"') && main.includes('data-pose-state="ready"'), 'app must expose Rest and Ready pose states');
assert(main.includes("let poseState = 'rest'") && main.includes('function applyReadyPose') && main.includes("poseState = 'ready'"), 'runtime must switch to baked Ready without animation retargeting');
assert(main.includes("ready pose: baked OneHandReady projection, sabre follows RightHand FK"), 'Ready state must report baked pose plus FK saber ownership');
assert(readyPose.includes("schema\": \"pose-lab-v2-ready-pose-v1"), 'Ready pose preset must use the v2 baked pose schema');
assert(readyPose.includes("clip\": \"OneHandReady") && readyPose.includes("sampleTime\": 1.25"), 'Ready pose preset must be baked from FPS OneHandReady at the held pose sample');
assert(readyPose.includes('"RightHand"') && readyPose.includes('"LeftHand"') && readyPose.includes('"RightForeArm"'), 'Ready pose preset must include upper-body hand and forearm bones');
assert(readyPose.includes('"right": -120') && readyPose.includes('"left": -90'), 'Ready pose preset must preserve the accepted right/left roll offsets');
assert(main.includes('object.position.set(-0.39454, 0.71404, 0.32817)'), 'default sabre position must match the latest authored export');
assert(main.includes('THREE.MathUtils.degToRad(160.077)') && main.includes('THREE.MathUtils.degToRad(83.685)') && main.includes('THREE.MathUtils.degToRad(-135.981)'), 'default sabre rotation must match the latest authored export');
assert(main.includes('object.scale.setScalar(0.48)'), 'default sabre scale must match the latest authored export');
assert(main.includes("findRequiredBone(meshyRoot, 'RightHand')"), 'runtime saber grip must parent under the real Meshy RightHand bone');
assert(main.includes("grip.name = 'SaberGrip'") && main.includes('rightHand.attach(grip)') && main.includes('grip.attach(sabreRoot)'), 'real sabre mesh must be parented through a SaberGrip bone');
assert(main.includes('function editableSaber()') && main.includes('return saberGrip || sabreRoot'), 'direct transforms must target SaberGrip after hand parenting');
assert(main.includes("parentBone: 'RightHand'"), 'export must report SaberGrip as RightHand-owned');
assert(main.includes("let toolMode = 'saber'") && main.includes('data-tool="saber"') && main.includes('data-tool="pose"'), 'app must distinguish top-level Saber and Pose modes');
assert(main.includes('const POSE_BONE_NAMES = [') && main.includes("'RightHand'") && main.includes("'LeftFoot'"), 'Pose mode must expose curated real Meshy body bones');
assert(main.includes('function setupPoseHandles') && main.includes('PoseHandle:') && main.includes('function pickPoseHandle'), 'Pose mode must create visible selectable bone handles');
assert(main.includes('selectedPoseBone') && main.includes('function resetPose') && main.includes("data-action=\"reset-pose\""), 'Pose mode must track selection and reset curated bone rotations');
assert(main.includes('toolMode === \'pose\' ? \'rotate\' : next') && main.includes('rotatePoseBoneByGesture'), 'Pose mode must be rotate-only and not reuse saber move/scale behavior');
assert(!main.includes('AnimationMixer') && !main.includes('clipAction') && !main.includes('retarget'), 'v2 Ready must stay baked-pose only, not runtime animation retargeting');
assert(!main.includes("import './styles.css'"), 'browser-native ESM must not import CSS without a bundler');
assert(main.includes('pickSabre') && main.includes('startGesture') && main.includes('updateGesture'), 'app must use visible direct saber gestures');
assert(main.includes('function handleTouchStart') && main.includes('function handleTouchMove') && main.includes('function handleTouchEnd'), 'mobile saber editing must use native touch handlers, not pointer-only guesses');
assert(main.includes("canvas.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false })"), 'touchstart must be non-passive capture so saber gestures can stop camera/browser handling');
assert(main.includes('let suppressTouchPointerEvents = false') && main.includes('event.pointerType === \'touch\' && suppressTouchPointerEvents'), 'owned native touch gestures must suppress duplicate touch pointer events');
assert(main.includes('cycleMode') && main.includes('tapCanCycle'), 'selected sabre tap must cycle transform mode like the TFTM tuner');
assert(main.includes('snapCamera') && main.includes('data-camera-view'), 'app must expose TFTM-style camera snap controls');
assert(main.includes('data-action="camera"') && main.includes('function leaveSaberEdit'), 'app must expose an explicit Camera/deselect escape from saber editing');
assert(main.includes('function beginCameraTouch') && main.includes("kind: points.length >= 2 ? 'two-camera' : 'one-camera'"), 'mobile camera touch must be handled directly, not delegated to OrbitControls');
assert(main.includes("leaveSaberEdit('camera: empty touch orbit')") && main.includes('beginCameraTouch(points)'), 'empty canvas touch must deselect the sabre and start one-finger camera orbit');
assert(main.includes('function orbitCameraByDelta') && main.includes('function zoomCameraByDelta') && main.includes('function panCameraByDelta'), 'mobile camera must support one-finger orbit and two-finger zoom/pan');
assert(main.includes('data-axis="screen"') && main.includes('data-axis="all"') && main.includes('data-axis="x"') && main.includes('data-axis="y"') && main.includes('data-axis="z"'), 'app must expose TFTM-style split axis controls');
assert(main.includes("let currentAxis = 'screen'") && main.includes("currentAxis = mode === 'scale' ? 'all' : 'screen'"), 'mode changes must reset axis to Screen or All');
assert(main.includes('function moveSabreByGesture') && main.includes('function rotateSabreByGesture') && main.includes('function scaleSabreByDelta'), 'saber transforms must route through split-axis helpers');
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
  assert(exists('dist/vendor/three/build/three.module.js'), 'dist must include vendored Three');
  assert(exists('dist/vendor/three/examples/jsm/loaders/GLTFLoader.js'), 'dist must include vendored GLTFLoader');
  assert(exists('dist/vendor/three/examples/jsm/controls/OrbitControls.js'), 'dist must include vendored OrbitControls');
  assert(exists('dist/vendor/three/examples/jsm/utils/BufferGeometryUtils.js'), 'dist must include vendored BufferGeometryUtils');
  assert(exists('dist/assets/meshy/meshy_apose_walking_with_skin.glb'), 'dist must expose Meshy GLB at /assets/meshy');
  assert(exists('dist/assets/meshy/meshy_real_sabre.glb'), 'dist must expose real sabre GLB at /assets/meshy');
}

for (const file of [
  'src/main.js',
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

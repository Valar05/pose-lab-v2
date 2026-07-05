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
assert(!main.includes("import { READY_POSE_PRESET } from './ready-pose.js'"), 'Ready pose preset must not be statically imported because browser module cache can stale it');
assert(main.includes('async function loadReadyPosePreset') && main.includes("await import(`./ready-pose.js${suffix}`)") && main.includes("URL_PARAMS.get('cacheBust')"), 'Ready pose preset must be dynamically imported with the page cacheBust');
assert(main.includes('data-pose-state="rest"') && main.includes('data-pose-state="ready"'), 'app must expose Rest and Ready pose states');
assert(main.includes('function initialPoseStateFromUrl') && main.includes("URL_PARAMS.get('pose') === 'ready'"), 'cloud review URL must be able to boot directly into Ready pose');
assert(main.includes("let poseState = 'rest'") && main.includes('function applyReadyPose') && main.includes("poseState = 'ready'"), 'runtime must switch to baked Ready without animation retargeting');
assert(!main.includes('READY_RIGHT_WRIST_ROLL_DEG') && !main.includes('rollReadyRightWrist'), 'Ready must not apply a hidden runtime wrist-roll patch');
assert(main.includes("source-oriented OneHandReady, sabre follows RightHand FK"), 'Ready state must report source-orientation bake and FK saber ownership');
assert(readyPose.includes("schema\": \"pose-lab-v2-ready-pose-v1"), 'Ready pose preset must use the v2 baked pose schema');
assert(readyPose.includes("clip\": \"OneHandReady") && readyPose.includes("sampleTime\": 1.25"), 'Ready pose preset must be baked from FPS OneHandReady at the held pose sample');
assert(readyPose.includes('"RightHand"') && readyPose.includes('"LeftHand"') && readyPose.includes('"RightForeArm"'), 'Ready pose preset must include upper-body hand and forearm bones');
assert(readyPose.includes('"method": "orientation-first-retarget-with-pins"'), 'Ready pose preset must use source-orientation retargeting guided by pins');
assert(readyPose.includes('"retargetedBones"') && readyPose.includes('"RightArm"') && readyPose.includes('"RightForeArm"') && readyPose.includes('"RightHand"'), 'Ready preset must record orientation-retargeted arm/forearm/hand bones');
assert(main.includes('object.position.set(-0.39454, 0.71404, 0.32817)'), 'default sabre position must match the latest authored export');
assert(main.includes('THREE.MathUtils.degToRad(160.077)') && main.includes('THREE.MathUtils.degToRad(83.685)') && main.includes('THREE.MathUtils.degToRad(-135.981)'), 'default sabre rotation must match the latest authored export');
assert(main.includes('object.scale.setScalar(0.48)'), 'default sabre scale must match the latest authored export');
assert(main.includes("findRequiredBone(meshyRoot, 'RightHand')"), 'runtime saber grip must parent under the real Meshy RightHand bone');
assert(main.includes('const SABER_GRIP_LOCAL = {') && main.includes('position: [8.52296, 28.41254, -24.44467]'), 'SaberGrip must use explicit authored RightHand-local placement');
assert(main.includes("grip.name = 'SaberGrip'") && main.includes('rightHand.add(grip)') && main.includes('grip.add(sabreRoot)'), 'real sabre mesh must be parented through explicit local SaberGrip FK');
assert(main.includes('sabreRoot.position.set(0, 0, 0)') && main.includes('sabreRoot.quaternion.identity()') && main.includes('sabreRoot.scale.set(1, 1, 1)'), 'sabre mesh local transform under SaberGrip must be identity');
assert(!main.includes('rightHand.attach(grip)') && !main.includes('grip.attach(sabreRoot)'), 'SaberGrip must not preserve world placement through Object3D.attach');
assert(main.includes('function editableSaber()') && main.includes('return saberGrip || sabreRoot'), 'direct transforms must target SaberGrip after hand parenting');
assert(main.includes("parentBone: 'RightHand'"), 'export must report SaberGrip as RightHand-owned');
assert(main.includes("let toolMode = 'saber'") && main.includes('data-tool="saber"') && main.includes('data-tool="pose"'), 'app must distinguish top-level Saber and Pose modes');
assert(main.includes('const POSE_BONE_NAMES = [') && main.includes("'RightHand'") && main.includes("'LeftFoot'"), 'Pose mode must expose curated real Meshy body bones');
assert(main.includes('function setupPoseHandles') && main.includes('PoseHandle:') && main.includes('function pickPoseHandle'), 'Pose mode must create visible selectable bone handles');
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
assert(main.includes('function blockPoseTouchPointer') && main.includes("event.pointerType !== 'touch' || toolMode !== 'pose'"), 'Pose mode must firewall touch pointer events before OrbitControls can pan');
assert(main.includes('blockPoseTouchPointer') && main.includes('stopImmediatePropagation()'), 'Pose touch pointer firewall must stop later OrbitControls listeners');
assert(main.indexOf("canvas.addEventListener('pointerdown', blockPoseTouchPointer") >= 0 && main.indexOf("canvas.addEventListener('pointerdown', blockPoseTouchPointer") < main.indexOf('new OrbitControls(camera, canvas)'), 'Pose touch pointer firewall must register before OrbitControls');
assert(main.includes('cycleMode') && main.includes('tapCanCycle'), 'selected sabre tap must cycle transform mode like the TFTM tuner');
assert(main.includes('snapCamera') && main.includes('data-camera-view'), 'app must expose TFTM-style camera snap controls');
assert(main.includes('data-action="camera"') && main.includes('function leaveSaberEdit'), 'app must expose an explicit Camera/deselect escape from saber editing');
assert(main.includes('data-view-mode="orbit"') && main.includes('data-view-mode="firstPerson"'), 'app must expose Orbit/FPV camera mode buttons');
assert(main.includes('const firstPersonCameraConfig = {') && main.includes("cameraMode: 'head-forward'") && main.includes("anchor: 'Head'") && main.includes("fallbackAnchor: 'Spine02'"), 'FPV mode must use the Meshy head-forward camera contract from Pose Lab');
assert(main.includes('function setViewMode') && main.includes('function updateFirstPersonCamera') && main.includes("document.body.classList.add('is-fpv')"), 'FPV mode must switch the live camera from orbit controls to head-forward first-person view');
assert(main.includes("if (viewMode === 'orbit') controls.update();") && main.includes('else updateFirstPersonCamera();'), 'animation loop must keep FPV camera synced to the posed head bone');
assert(css.includes('body.is-fpv .primary-rail button:not([data-view-mode])') && css.includes('body.is-fpv .control-dock'), 'FPV mode must hide edit chrome while keeping Orbit/FPV controls reachable');
assert(css.includes('.viewport') && css.includes('.control-dock') && css.includes('max-height: 42vh'), 'mobile layout must keep the 3D viewport visible while dock panels scroll below it');
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

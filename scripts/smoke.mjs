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
assert(exists('vendor/three/build/three.module.js'), 'missing vendored Three module');
assert(exists('vendor/three/examples/jsm/loaders/GLTFLoader.js'), 'missing vendored GLTFLoader');
assert(exists('vendor/three/examples/jsm/controls/OrbitControls.js'), 'missing vendored OrbitControls');
assert(exists('vendor/three/examples/jsm/utils/BufferGeometryUtils.js'), 'missing vendored BufferGeometryUtils');
assert(main.includes("meshy_apose_walking_with_skin.glb"), 'app must reference Meshy GLB');
assert(main.includes("meshy_real_sabre.glb"), 'app must reference real sabre GLB');
assert(!main.includes("import './styles.css'"), 'browser-native ESM must not import CSS without a bundler');
assert(main.includes('pickSabre') && main.includes('startGesture') && main.includes('updateGesture'), 'app must use visible direct saber gestures');
assert(main.includes('pickSabre') && main.includes('if (!hit) return false'), 'empty-space drags must stay available for camera orbit after selection');
assert(main.includes('cycleMode') && main.includes('tapCanCycle'), 'selected sabre tap must cycle transform mode like the TFTM tuner');
assert(main.includes('snapCamera') && main.includes('data-camera-view'), 'app must expose TFTM-style camera snap controls');
assert(main.includes('data-axis="screen"') && main.includes('data-axis="all"') && main.includes('data-axis="x"') && main.includes('data-axis="y"') && main.includes('data-axis="z"'), 'app must expose TFTM-style split axis controls');
assert(main.includes("let currentAxis = 'screen'") && main.includes("currentAxis = mode === 'scale' ? 'all' : 'screen'"), 'mode changes must reset axis to Screen or All');
assert(main.includes('function moveSabreByGesture') && main.includes('function rotateSabreByGesture') && main.includes('function scaleSabreByDelta'), 'saber transforms must route through split-axis helpers');
assert(main.includes("if (mode === 'scale' && lastPinchDistance > 0)") && main.includes("if (mode === 'rotate' && Number.isFinite(lastTwistAngle))"), 'two-finger gestures must be gated to Scale and Rotate modes');
assert(main.includes("const axis = currentAxis === 'screen' ? gesture.forward.clone() : worldAxisVector(currentAxis)"), 'two-finger rotate must default to Pose Lab-style screen roll');
assert(main.includes("two-finger camera gesture ignored in Move"), 'Move mode must not transform the saber with two-finger gestures');
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

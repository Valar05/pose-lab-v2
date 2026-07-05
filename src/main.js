import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const ASSETS = {
  meshy: './assets/meshy/meshy_apose_walking_with_skin.glb',
  sabre: './assets/meshy/meshy_real_sabre.glb',
};

const app = document.querySelector('#app');
app.innerHTML = `
  <section class="surface">
    <canvas aria-label="Meshy A-pose saber placement viewport"></canvas>
    <div class="toolbar" aria-label="Saber direct controls">
      <button type="button" data-mode="move" class="active">Move</button>
      <button type="button" data-mode="rotate">Rotate</button>
      <button type="button" data-mode="scale">Scale</button>
      <button type="button" data-axis="screen" class="active">Screen</button>
      <button type="button" data-axis="all" hidden>All</button>
      <button type="button" data-axis="x">X</button>
      <button type="button" data-axis="y">Y</button>
      <button type="button" data-axis="z">Z</button>
      <button type="button" data-action="reset">Reset</button>
      <button type="button" data-action="copy">Copy Export</button>
      <button type="button" data-camera-view="front">Front</button>
      <button type="button" data-camera-view="left">Left</button>
      <button type="button" data-camera-view="top">Top</button>
      <button type="button" data-camera-view="right">Right</button>
      <button type="button" data-camera-view="back">Back</button>
      <span class="status" data-status>loading Meshy and real sabre</span>
    </div>
    <div class="readout">
      <pre data-export aria-label="Saber transform export"></pre>
    </div>
  </section>
`;

const canvas = app.querySelector('canvas');
const statusEl = app.querySelector('[data-status]');
const exportEl = app.querySelector('[data-export]');
const modeButtons = [...app.querySelectorAll('[data-mode]')];
const axisButtons = [...app.querySelectorAll('[data-axis]')];

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101315);
scene.fog = new THREE.Fog(0x101315, 10, 24);

const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 80);
camera.position.set(2.8, 1.75, 4.2);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.95, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.5;
controls.maxDistance = 8;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;

scene.add(new THREE.HemisphereLight(0xfff3d5, 0x263036, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 2.6);
key.position.set(4, 6, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9fbaff, 0.9);
rim.position.set(-4, 2, -5);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(2.3, 64),
  new THREE.MeshStandardMaterial({ color: 0x2c312b, roughness: 0.9, metalness: 0.0 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.02;
scene.add(floor);

const loader = new GLTFLoader();
const root = new THREE.Group();
scene.add(root);

let mode = 'move';
let currentAxis = 'screen';
let meshyRoot = null;
let sabreRoot = null;
let selected = false;
let gesture = null;
const pointers = new Map();
let lastPinchDistance = 0;
let lastTwistAngle = 0;

function normalizeCharacter(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  object.position.sub(center);
  object.position.y += size.y * 0.5;
  const height = Math.max(0.001, size.y);
  object.scale.multiplyScalar(1.75 / height);
  object.traverse((node) => {
    if (node.isMesh) {
      node.frustumCulled = false;
      node.castShadow = false;
      node.receiveShadow = true;
    }
  });
  return object;
}

function prepareSabre(object) {
  object.name = 'real-meshy-sabre';
  object.position.set(0.45, 1.05, 0.05);
  object.rotation.set(THREE.MathUtils.degToRad(90), 0, THREE.MathUtils.degToRad(-55));
  object.scale.setScalar(0.48);
  object.traverse((node) => {
    if (node.isMesh) {
      node.frustumCulled = false;
      node.castShadow = false;
      node.receiveShadow = false;
    }
  });
  return object;
}

async function loadGlb(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

function setMode(next) {
  mode = next;
  currentAxis = mode === 'scale' ? 'all' : 'screen';
  renderControls();
}

function setAxis(next) {
  currentAxis = mode === 'scale' && next === 'screen' ? 'all' : next;
  if (mode !== 'scale' && currentAxis === 'all') currentAxis = 'screen';
  renderControls();
}

function axisLabel() {
  if (currentAxis === 'all') return 'All';
  return currentAxis === 'screen' ? 'Screen' : currentAxis.toUpperCase();
}

function renderControls() {
  modeButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  axisButtons.forEach((button) => {
    const axis = button.dataset.axis || 'screen';
    button.hidden = axis === 'all' && mode !== 'scale';
    button.classList.toggle('active', axis === currentAxis);
  });
  statusEl.textContent = selected
    ? `${mode} / ${axisLabel()}: drag sabre to edit, drag empty space for camera`
    : `${mode} / ${axisLabel()}: tap the visible sabre first`;
}

function cycleMode() {
  setMode(mode === 'move' ? 'rotate' : mode === 'rotate' ? 'scale' : 'move');
}

function exportTransform() {
  if (!sabreRoot) return {};
  const rotationDeg = sabreRoot.rotation.toArray().slice(0, 3)
    .map((value) => Number(THREE.MathUtils.radToDeg(value).toFixed(3)));
  const scale = sabreRoot.scale.toArray().map((value) => Number(value.toFixed(5)));
  return {
    schema: 'pose-lab-v2-sabre-transform-v1',
    assets: {
      meshy: ASSETS.meshy,
      sabre: ASSETS.sabre,
    },
    saberRoot: {
      position: sabreRoot.position.toArray().map((value) => Number(value.toFixed(5))),
      rotationDeg,
      scale,
      uniformScale: Number(sabreRoot.scale.x.toFixed(5)),
    },
  };
}

function updateReadout() {
  exportEl.textContent = JSON.stringify(exportTransform(), null, 2);
}

function resize() {
  const width = Math.max(1, canvas.clientWidth);
  const height = Math.max(1, canvas.clientHeight);
  const pixelRatio = renderer.getPixelRatio();
  if (canvas.width !== Math.floor(width * pixelRatio) || canvas.height !== Math.floor(height * pixelRatio)) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function pickSabre(clientX, clientY) {
  if (!sabreRoot) return null;
  const rect = canvas.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -(((clientY - rect.top) / rect.height) * 2 - 1)
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const meshes = [];
  sabreRoot.traverse((node) => {
    if (node.isMesh) meshes.push(node);
  });
  const hits = raycaster.intersectObjects(meshes, false);
  return hits.length ? hits[0] : null;
}

function cameraBasis() {
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  return { right: right.normalize(), up: up.normalize(), forward: forward.normalize() };
}

function worldAxisVector(axis) {
  if (axis === 'x') return new THREE.Vector3(1, 0, 0);
  if (axis === 'y') return new THREE.Vector3(0, 1, 0);
  if (axis === 'z') return new THREE.Vector3(0, 0, 1);
  return null;
}

function moveSabreByGesture(dx, dy, basis) {
  const amount = 0.0035;
  if (currentAxis === 'screen') {
    const delta = basis.right.clone().multiplyScalar(dx * amount)
      .add(basis.up.clone().multiplyScalar(-dy * amount));
    sabreRoot.position.add(delta);
    return;
  }
  const axis = worldAxisVector(currentAxis);
  if (!axis) return;
  const value = (Math.abs(dx) > Math.abs(dy) ? dx : -dy) * amount;
  sabreRoot.position.add(axis.multiplyScalar(value));
}

function rotateSabreAroundAxis(axis, radians) {
  const delta = new THREE.Quaternion().setFromAxisAngle(axis.normalize(), radians);
  sabreRoot.quaternion.premultiply(delta).normalize();
}

function rotateSabreByGesture(dx, dy, basis) {
  if (currentAxis === 'screen') {
    const yaw = new THREE.Quaternion().setFromAxisAngle(basis.up, dx * 0.007);
    const pitch = new THREE.Quaternion().setFromAxisAngle(basis.right, dy * 0.007);
    sabreRoot.quaternion.premultiply(pitch).premultiply(yaw).normalize();
    return;
  }
  const axis = worldAxisVector(currentAxis);
  if (!axis) return;
  const radians = (Math.abs(dx) > Math.abs(dy) ? dx : -dy) * 0.007;
  rotateSabreAroundAxis(axis, radians);
}

function scaleSabreByDelta(delta) {
  if (currentAxis === 'all' || currentAxis === 'screen') {
    const scalar = Math.max(0.05, Math.min(3, sabreRoot.scale.x + delta));
    sabreRoot.scale.setScalar(scalar);
    return;
  }
  const next = Math.max(0.05, Math.min(3, sabreRoot.scale[currentAxis] + delta));
  sabreRoot.scale[currentAxis] = next;
}

function startGesture(event) {
  if (!sabreRoot) return false;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size >= 2 && selected && (mode === 'rotate' || mode === 'scale')) {
    if (!gesture) {
      const { right, up, forward } = cameraBasis();
      gesture = {
        pointerId: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false,
        tapCanCycle: false,
        multiTouch: true,
        right,
        up,
        forward,
      };
    }
    lastPinchDistance = getPointerDistance();
    lastTwistAngle = getPointerAngle();
    controls.enabled = false;
    canvas.setPointerCapture(event.pointerId);
    statusEl.textContent = mode === 'rotate' ? 'two-finger roll armed' : 'two-finger scale armed';
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }
  const hit = pickSabre(event.clientX, event.clientY);
  if (!hit) {
    pointers.delete(event.pointerId);
    return false;
  }
  const wasSelected = selected;
  selected = true;
  controls.enabled = false;
  canvas.setPointerCapture(event.pointerId);
  const { right, up, forward } = cameraBasis();
  gesture = {
    pointerId: event.pointerId,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: false,
    tapCanCycle: wasSelected,
    right,
    up,
    forward,
  };
  controls.target.copy(sabreRoot.position);
  controls.update();
  statusEl.textContent = `${mode}: editing real sabre`;
  event.preventDefault();
  event.stopImmediatePropagation();
  return true;
}

function updateGesture(event) {
  if (!gesture || !sabreRoot) return false;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size >= 2) {
    handleTwoFingerGesture();
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }
  if (gesture.pointerId !== event.pointerId) return false;
  const dx = event.clientX - gesture.lastX;
  const dy = event.clientY - gesture.lastY;
  if (Math.abs(dx) + Math.abs(dy) < 0.5) return true;

  if (mode === 'move') {
    moveSabreByGesture(dx, dy, gesture);
  } else if (mode === 'scale') {
    scaleSabreByDelta((dx - dy) * 0.004);
  } else {
    rotateSabreByGesture(dx, dy, gesture);
  }

  gesture.lastX = event.clientX;
  gesture.lastY = event.clientY;
  gesture.moved = true;
  updateReadout();
  event.preventDefault();
  event.stopImmediatePropagation();
  return true;
}

function endGesture(event) {
  pointers.delete(event.pointerId);
  if (gesture?.multiTouch && pointers.size < 2) {
    gesture = null;
    controls.enabled = true;
    lastPinchDistance = 0;
    lastTwistAngle = 0;
    updateReadout();
    statusEl.textContent = `${mode}: transform ready; empty-space drag orbits camera`;
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }
  if (gesture?.pointerId !== event.pointerId) return false;
  if (!gesture.moved && gesture.tapCanCycle) cycleMode();
  gesture = null;
  controls.enabled = true;
  if (pointers.size < 2) {
    lastPinchDistance = 0;
    lastTwistAngle = 0;
  }
  updateReadout();
  statusEl.textContent = `${mode}: transform ready; empty-space drag orbits camera`;
  event.preventDefault();
  event.stopImmediatePropagation();
  return true;
}

function getPointerDistance() {
  const points = [...pointers.values()];
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function getPointerAngle() {
  const points = [...pointers.values()];
  if (points.length < 2) return 0;
  return Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
}

function handleTwoFingerGesture() {
  if (!gesture || !sabreRoot) return;
  const distance = getPointerDistance();
  const angle = getPointerAngle();
  if (mode === 'scale' && lastPinchDistance > 0) {
    scaleSabreByDelta((distance - lastPinchDistance) * 0.006);
  }
  if (mode === 'rotate' && Number.isFinite(lastTwistAngle)) {
    const twist = angle - lastTwistAngle;
    const axis = currentAxis === 'screen' ? gesture.forward.clone() : worldAxisVector(currentAxis);
    if (axis) rotateSabreAroundAxis(axis, twist);
  }
  lastPinchDistance = distance;
  lastTwistAngle = angle;
  gesture.moved = true;
  updateReadout();
  statusEl.textContent = mode === 'rotate'
    ? `two-finger roll / ${axisLabel()}`
    : mode === 'scale'
      ? `two-finger scale / ${axisLabel()}`
      : 'two-finger camera gesture ignored in Move';
}

function snapCamera(view) {
  const focus = sabreRoot ? sabreRoot.position.clone() : new THREE.Vector3(0, 0.95, 0);
  const distance = Math.max(2.2, camera.position.distanceTo(controls.target));
  const offsets = {
    front: new THREE.Vector3(0, 0.7, distance),
    back: new THREE.Vector3(0, 0.7, -distance),
    left: new THREE.Vector3(-distance, 0.7, 0),
    right: new THREE.Vector3(distance, 0.7, 0),
    top: new THREE.Vector3(0.01, distance, 0.01),
  };
  controls.target.copy(focus);
  camera.position.copy(focus).add(offsets[view] || offsets.front);
  controls.update();
  statusEl.textContent = `camera: ${view}`;
}

async function boot() {
  const [meshy, sabre] = await Promise.all([loadGlb(ASSETS.meshy), loadGlb(ASSETS.sabre)]);
  meshyRoot = normalizeCharacter(meshy);
  sabreRoot = prepareSabre(sabre);
  root.add(meshyRoot, sabreRoot);
  setMode('move');
  updateReadout();
  statusEl.textContent = 'ready: tap the real sabre, then drag';
}

modeButtons.forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode || 'move'));
});

axisButtons.forEach((button) => {
  button.addEventListener('click', () => setAxis(button.dataset.axis || 'screen'));
});

app.querySelectorAll('[data-camera-view]').forEach((button) => {
  button.addEventListener('click', () => snapCamera(button.dataset.cameraView || 'front'));
});

app.querySelector('[data-action="reset"]').addEventListener('click', () => {
  if (!sabreRoot) return;
  prepareSabre(sabreRoot);
  updateReadout();
  statusEl.textContent = 'reset real sabre transform';
});

app.querySelector('[data-action="copy"]').addEventListener('click', () => {
  navigator.clipboard?.writeText(JSON.stringify(exportTransform(), null, 2)).catch(() => {});
  statusEl.textContent = 'export copied';
});

canvas.addEventListener('pointerdown', startGesture, { capture: true });
canvas.addEventListener('pointermove', updateGesture, { capture: true });
canvas.addEventListener('pointerup', endGesture, { capture: true });
canvas.addEventListener('pointercancel', endGesture, { capture: true });

function animate() {
  resize();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

boot().catch((error) => {
  statusEl.textContent = `load failed: ${error instanceof Error ? error.message : String(error)}`;
});

requestAnimationFrame(animate);

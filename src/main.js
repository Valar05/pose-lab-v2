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
  modeButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  statusEl.textContent = selected
    ? `${mode}: drag sabre to edit, drag empty space for camera`
    : `${mode}: tap the visible sabre first`;
}

function cycleMode() {
  setMode(mode === 'move' ? 'rotate' : mode === 'rotate' ? 'scale' : 'move');
}

function exportTransform() {
  if (!sabreRoot) return {};
  const rotationDeg = sabreRoot.rotation.toArray().slice(0, 3)
    .map((value) => Number(THREE.MathUtils.radToDeg(value).toFixed(3)));
  return {
    schema: 'pose-lab-v2-sabre-transform-v1',
    assets: {
      meshy: ASSETS.meshy,
      sabre: ASSETS.sabre,
    },
    saberRoot: {
      position: sabreRoot.position.toArray().map((value) => Number(value.toFixed(5))),
      rotationDeg,
      scale: Number(sabreRoot.scale.x.toFixed(5)),
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

function startGesture(event) {
  if (!sabreRoot) return false;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2 && gesture) {
    lastPinchDistance = getPointerDistance();
    lastTwistAngle = getPointerAngle();
    controls.enabled = false;
    return true;
  }
  const hit = pickSabre(event.clientX, event.clientY);
  if (!hit) return false;
  const wasSelected = selected;
  selected = true;
  controls.enabled = false;
  canvas.setPointerCapture(event.pointerId);
  const { right, up } = cameraBasis();
  gesture = {
    pointerId: event.pointerId,
    lastX: event.clientX,
    lastY: event.clientY,
    moved: false,
    tapCanCycle: wasSelected,
    right,
    up,
  };
  controls.target.copy(sabreRoot.position);
  controls.update();
  statusEl.textContent = `${mode}: editing real sabre`;
  event.preventDefault();
  return true;
}

function updateGesture(event) {
  if (!gesture || gesture.pointerId !== event.pointerId || !sabreRoot) return false;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size >= 2) {
    handleTwoFingerGesture();
    event.preventDefault();
    return true;
  }
  const dx = event.clientX - gesture.lastX;
  const dy = event.clientY - gesture.lastY;
  if (Math.abs(dx) + Math.abs(dy) < 0.5) return true;

  if (mode === 'move') {
    const delta = gesture.right.clone().multiplyScalar(dx * 0.0035)
      .add(gesture.up.clone().multiplyScalar(-dy * 0.0035));
    sabreRoot.position.add(delta);
  } else if (mode === 'scale') {
    const scalar = Math.max(0.05, Math.min(3, sabreRoot.scale.x * Math.exp((dx - dy) * 0.004)));
    sabreRoot.scale.setScalar(scalar);
  } else {
    const yaw = new THREE.Quaternion().setFromAxisAngle(gesture.up, dx * 0.007);
    const pitch = new THREE.Quaternion().setFromAxisAngle(gesture.right, dy * 0.007);
    sabreRoot.quaternion.premultiply(pitch).premultiply(yaw).normalize();
  }

  gesture.lastX = event.clientX;
  gesture.lastY = event.clientY;
  gesture.moved = true;
  updateReadout();
  event.preventDefault();
  return true;
}

function endGesture(event) {
  pointers.delete(event.pointerId);
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
    const scalar = Math.max(0.05, Math.min(3, sabreRoot.scale.x + (distance - lastPinchDistance) * 0.006));
    sabreRoot.scale.setScalar(scalar);
  }
  if (mode === 'rotate' && Number.isFinite(lastTwistAngle)) {
    sabreRoot.rotateY(angle - lastTwistAngle);
  }
  lastPinchDistance = distance;
  lastTwistAngle = angle;
  gesture.moved = true;
  updateReadout();
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

canvas.addEventListener('pointerdown', startGesture);
canvas.addEventListener('pointermove', updateGesture);
canvas.addEventListener('pointerup', endGesture);
canvas.addEventListener('pointercancel', endGesture);

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

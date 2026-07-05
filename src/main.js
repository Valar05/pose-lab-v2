import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const ASSETS = {
  meshy: './assets/meshy/meshy_apose_walking_with_skin.glb',
  sabre: './assets/meshy/meshy_real_sabre.glb',
};
const URL_PARAMS = new URLSearchParams(window.location.search);
const DEBUG_TOUCH = URL_PARAMS.get('debugTouch') === '1';
const DEBUG_READY = URL_PARAMS.get('debugReady') === '1';
const DEBUG_READY_DELTA = URL_PARAMS.get('debugReadyDelta') === '1';

const app = document.querySelector('#app');
app.innerHTML = `
  <section class="surface">
    <div class="viewport">
      <canvas aria-label="Meshy A-pose saber placement viewport"></canvas>
      <div class="primary-rail" aria-label="Primary review controls">
        <button type="button" data-cycle-tool>Tool: Saber</button>
        <button type="button" data-cycle-pose-state>Pose: Rest</button>
        <button type="button" data-cycle-view-mode>View: Orbit</button>
        <button type="button" data-dock-toggle>Tools</button>
        <span class="status" data-status>loading Meshy and real sabre</span>
      </div>
    </div>
    <div class="control-dock" aria-label="Secondary editor controls" hidden>
      <div class="panel-tabs" aria-label="Control panels">
        <button type="button" data-panel-toggle="transform">Transform</button>
        <button type="button" data-panel-toggle="view">View</button>
        <button type="button" data-panel-toggle="export">Export</button>
        <button type="button" data-panel-toggle="debug" ${DEBUG_TOUCH || DEBUG_READY ? '' : 'hidden'}>Debug</button>
      </div>
      <section class="control-panel" data-panel="transform" aria-label="Transform controls" hidden>
        <div class="panel-row hidden-actions" aria-hidden="true">
          <button type="button" data-tool="saber" class="active" tabindex="-1">Saber</button>
          <button type="button" data-tool="pose" tabindex="-1">Pose</button>
          <button type="button" data-pose-state="rest" class="active" tabindex="-1">Rest</button>
          <button type="button" data-pose-state="ready" tabindex="-1">Ready</button>
          <button type="button" data-view-mode="orbit" class="active" tabindex="-1">Orbit</button>
          <button type="button" data-view-mode="firstPerson" tabindex="-1">FPV</button>
        </div>
        <div class="panel-row">
          <button type="button" data-mode="move" class="active">Move</button>
          <button type="button" data-mode="rotate">Rotate</button>
          <button type="button" data-mode="scale">Scale</button>
          <button type="button" data-axis="screen" class="active">Screen</button>
          <button type="button" data-axis="all" hidden>All</button>
          <button type="button" data-axis="x">X</button>
          <button type="button" data-axis="y">Y</button>
          <button type="button" data-axis="z">Z</button>
        </div>
        <div class="panel-row">
          <button type="button" data-action="reset-saber">Reset Saber</button>
          <button type="button" data-action="reset-pose" hidden>Reset Pose</button>
        </div>
      </section>
      <section class="control-panel" data-panel="view" aria-label="Camera controls" hidden>
        <div class="panel-row">
          <button type="button" data-action="camera">Camera</button>
          <button type="button" data-camera-view="front">Front</button>
          <button type="button" data-camera-view="left">Left</button>
          <button type="button" data-camera-view="top">Top</button>
          <button type="button" data-camera-view="right">Right</button>
          <button type="button" data-camera-view="back">Back</button>
        </div>
      </section>
      <section class="control-panel" data-panel="export" aria-label="Export controls" hidden>
        <div class="panel-row">
          <button type="button" data-action="copy">Copy Export</button>
        </div>
        <pre data-export aria-label="Saber transform export"></pre>
      </section>
      <section class="control-panel" data-panel="debug" aria-label="Debug proof controls" hidden>
        <div class="touch-proof" data-touch-proof ${DEBUG_TOUCH ? '' : 'hidden'}>
          <button type="button" data-action="touch-probe">Run Touch Probe</button>
          <pre data-touch-proof-readout aria-label="Pose touch interaction proof">touch proof: not run</pre>
        </div>
        <div class="ready-proof" data-ready-proof ${DEBUG_READY ? '' : 'hidden'}>
          <pre data-ready-proof-readout aria-label="Ready pose application proof">ready proof: not run</pre>
        </div>
      </section>
    </div>
  </section>
`;

const canvas = app.querySelector('canvas');
const statusEl = app.querySelector('[data-status]');
const exportEl = app.querySelector('[data-export]');
const toolButtons = [...app.querySelectorAll('[data-tool]')];
const viewModeButtons = [...app.querySelectorAll('[data-view-mode]')];
const poseStateButtons = [...app.querySelectorAll('[data-pose-state]')];
const modeButtons = [...app.querySelectorAll('[data-mode]')];
const axisButtons = [...app.querySelectorAll('[data-axis]')];
const panelToggleButtons = [...app.querySelectorAll('[data-panel-toggle]')];
const controlPanels = [...app.querySelectorAll('[data-panel]')];
const resetSaberButton = app.querySelector('[data-action="reset-saber"]');
const resetPoseButton = app.querySelector('[data-action="reset-pose"]');
const touchProofPanel = app.querySelector('[data-touch-proof-readout]');
const touchProbeButton = app.querySelector('[data-action="touch-probe"]');
const readyProofPanel = app.querySelector('[data-ready-proof-readout]');
const dockEl = app.querySelector('.control-dock');
const dockToggleButton = app.querySelector('[data-dock-toggle]');
const cycleToolButton = app.querySelector('[data-cycle-tool]');
const cyclePoseStateButton = app.querySelector('[data-cycle-pose-state]');
const cycleViewModeButton = app.querySelector('[data-cycle-view-mode]');

let toolMode = 'saber';
let viewMode = 'orbit';
let dockOpen = false;
let activePanel = null;
const toolState = {
  saber: { mode: 'move', axis: 'screen' },
  pose: { mode: 'rotate', axis: 'screen' },
};
const touchProof = {
  probe: 'not-run',
  selectedBone: 'none',
  gestureKind: 'none',
  orbitBlocked: false,
  cameraMovedDuringPoseTouch: null,
  boneQuaternionChanged: null,
  bonePositionChanged: null,
  boneScaleChanged: null,
  lastTouchAction: 'none',
};
const readyProof = {
  readyPresetLoaded: false,
  cacheBust: URL_PARAMS.get('cacheBust') || null,
  rightHandPresetQuaternion: null,
  rightHandAppliedQuaternion: null,
  rightHandRestQuaternion: null,
  rightHandAppliedMatchesPreset: null,
  rightHandDiffersFromRest: null,
  rightHandWorldDelta: null,
  rightHandScreenDeltaPx: null,
  rightHandQuaternionAngleDeg: null,
  rightHandAxisScreenDeltaPx: null,
  saberGripWorldDelta: null,
  saberGripQuaternionAngleDeg: null,
  sabreQuaternionAngleDeg: null,
  sabreBladeAxisAngleDeg: null,
  sabreBladeAxisScreenDeltaPx: null,
  orientationDeltaPass: null,
  sabreScreenDeltaPx: null,
  fpvCamera: null,
  visibleDeltaPass: null,
  visibleDeltaStatus: 'not-run',
};

function updateTouchProof(values = {}) {
  Object.assign(touchProof, values, {
    selectedBone: selectedPoseBone?.name || touchProof.selectedBone,
    gestureKind: touchGesture?.kind || touchProof.gestureKind,
  });
  if (!DEBUG_TOUCH || !touchProofPanel) return;
  touchProofPanel.textContent = JSON.stringify(touchProof, null, 2);
}

function updateReadyProof(values = {}) {
  Object.assign(readyProof, values);
  if (!DEBUG_READY || !readyProofPanel) return;
  readyProofPanel.textContent = JSON.stringify(readyProof, null, 2);
}

function blockPoseTouchPointer(event) {
  if (event.pointerType !== 'touch' || toolMode !== 'pose') return;
  updateTouchProof({ orbitBlocked: true, lastTouchAction: 'blocked-touch-pointer' });
  event.preventDefault();
  event.stopImmediatePropagation();
}

canvas.addEventListener('pointerdown', blockPoseTouchPointer, { capture: true });
canvas.addEventListener('pointermove', blockPoseTouchPointer, { capture: true });
canvas.addEventListener('pointerup', blockPoseTouchPointer, { capture: true });
canvas.addEventListener('pointercancel', blockPoseTouchPointer, { capture: true });

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101315);
scene.fog = new THREE.Fog(0x101315, 10, 24);

const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 80);
camera.position.set(2.8, 1.75, 4.2);
const orbitCameraState = {
  fov: 36,
  near: 0.01,
  far: 80,
  position: new THREE.Vector3(2.8, 1.75, 4.2),
  target: new THREE.Vector3(0, 0.95, 0),
  minDistance: 1.5,
  maxDistance: 8,
};
const firstPersonCameraConfig = {
  cameraMode: 'head-forward',
  anchor: 'Head',
  fallbackAnchor: 'Spine02',
  forwardAxis: 'z',
  headForwardOffset: 0.42,
  headCameraYOffset: 0.03,
  lookForward: 1.65,
  lookVertical: 0,
  fov: 98,
  near: 0.04,
};

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.95, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.5;
controls.maxDistance = 8;
controls.touches.ONE = THREE.TOUCH.ROTATE;
controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
controls.addEventListener('change', () => {
  if (viewMode !== 'orbit') return;
  orbitCameraState.position.copy(camera.position);
  orbitCameraState.target.copy(controls.target);
});

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

const POSE_BONE_NAMES = [
  'Hips',
  'Spine02',
  'Spine01',
  'Spine',
  'neck',
  'Head',
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand',
  'LeftUpLeg',
  'LeftLeg',
  'LeftFoot',
  'RightUpLeg',
  'RightLeg',
  'RightFoot',
];
const poseHandleGeometry = new THREE.SphereGeometry(0.035, 12, 8);
const poseHandleMaterial = new THREE.MeshBasicMaterial({ color: 0x68d8ff, depthTest: false, transparent: true, opacity: 0.82 });
const poseHandleSelectedMaterial = new THREE.MeshBasicMaterial({ color: 0xffd45c, depthTest: false, transparent: true, opacity: 0.96 });
const readyDeltaGeometry = new THREE.SphereGeometry(0.045, 12, 8);
const readyRestMaterial = new THREE.MeshBasicMaterial({ color: 0x8b949e, depthTest: false, transparent: true, opacity: 0.72 });
const readyReadyMaterial = new THREE.MeshBasicMaterial({ color: 0x58ff90, depthTest: false, transparent: true, opacity: 0.92 });
const readyLineMaterial = new THREE.LineBasicMaterial({ color: 0x58ff90, depthTest: false, transparent: true, opacity: 0.85 });
const readyRestAxisMaterial = new THREE.LineBasicMaterial({ color: 0x8b949e, depthTest: false, transparent: true, opacity: 0.82 });
const readyReadyAxisMaterial = new THREE.LineBasicMaterial({ color: 0x58ff90, depthTest: false, transparent: true, opacity: 0.96 });
const readySabreAxisMaterial = new THREE.LineBasicMaterial({ color: 0xffd45c, depthTest: false, transparent: true, opacity: 0.96 });
const HAND_AXIS_PROOF_LENGTH = 0.22;
const SABRE_AXIS_PROOF_LENGTH = 0.62;
const SABER_GRIP_LOCAL = {
  position: [8.52296, 28.41254, -24.44467],
  rotationDeg: [32.35, 74.24, -174.11],
  scale: [46.62859, 46.62859, 46.62856],
};

let poseState = 'rest';
let mode = 'move';
let currentAxis = 'screen';
let meshyRoot = null;
let sabreRoot = null;
let saberGrip = null;
let readyPosePreset = null;
let selectedPoseBone = null;
let selected = false;
let gesture = null;
let touchGesture = null;
let suppressTouchPointerEvents = false;
const pointers = new Map();
const poseBones = new Map();
const poseHandles = new Map();
const poseBoneRestQuaternions = new Map();
const readyDeltaMarkers = {
  restHand: new THREE.Mesh(readyDeltaGeometry, readyRestMaterial),
  readyHand: new THREE.Mesh(readyDeltaGeometry, readyReadyMaterial),
  restHilt: new THREE.Mesh(readyDeltaGeometry, readyRestMaterial),
  readyHilt: new THREE.Mesh(readyDeltaGeometry, readyReadyMaterial),
  handLine: new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), readyLineMaterial),
  hiltLine: new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), readyLineMaterial),
  restHandAxis: new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), readyRestAxisMaterial),
  readyHandAxis: new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), readyReadyAxisMaterial),
  restSabreAxis: new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), readyRestAxisMaterial),
  readySabreAxis: new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), readySabreAxisMaterial),
};
for (const marker of Object.values(readyDeltaMarkers)) {
  marker.visible = false;
  marker.renderOrder = 12;
  scene.add(marker);
}
let lastPoseEmptyTap = null;
let lastPinchDistance = 0;
let lastTwistAngle = 0;
let sabreBladeLocalAxisCache = null;

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
  object.position.set(-0.39454, 0.71404, 0.32817);
  object.rotation.set(
    THREE.MathUtils.degToRad(160.077),
    THREE.MathUtils.degToRad(83.685),
    THREE.MathUtils.degToRad(-135.981)
  );
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

function findRequiredBone(object, name) {
  const bone = object?.getObjectByName(name);
  if (!bone) throw new Error(`missing Meshy bone: ${name}`);
  return bone;
}

function findBone(object, name) {
  return name ? object?.getObjectByName(name) || null : null;
}

function objectWorldPosition(object) {
  return object.getWorldPosition(new THREE.Vector3());
}

function objectWorldQuaternion(object) {
  return object.getWorldQuaternion(new THREE.Quaternion());
}

function objectWorldScale(object) {
  return object.getWorldScale(new THREE.Vector3());
}

function localAxisVector(axis) {
  if (axis === 'x') return new THREE.Vector3(1, 0, 0);
  if (axis === '-x') return new THREE.Vector3(-1, 0, 0);
  if (axis === 'y') return new THREE.Vector3(0, 1, 0);
  if (axis === '-y') return new THREE.Vector3(0, -1, 0);
  if (axis === '-z') return new THREE.Vector3(0, 0, -1);
  return new THREE.Vector3(0, 0, 1);
}

function rotationDegFromQuaternion(quaternion) {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
  return euler.toArray().slice(0, 3)
    .map((value) => Number(THREE.MathUtils.radToDeg(value).toFixed(3)));
}

function rotationDegFromEuler(euler) {
  return euler.toArray().slice(0, 3)
    .map((value) => Number(THREE.MathUtils.radToDeg(value).toFixed(3)));
}

function quaternionFromArray(values) {
  return new THREE.Quaternion(
    Number(values?.[0] || 0),
    Number(values?.[1] || 0),
    Number(values?.[2] || 0),
    Number(values?.[3] ?? 1)
  ).normalize();
}

function vectorToFixedArray(vector) {
  return vector.toArray().map((value) => Number(value.toFixed(5)));
}

function quaternionToFixedArray(quaternion) {
  return quaternion.toArray().map((value) => Number(value.toFixed(6)));
}

function quaternionArraysClose(a, b, epsilon = 0.00001) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((value, index) => Math.abs(value - b[index]) <= epsilon);
}

function fixedNumber(value, places = 3) {
  return Number(value.toFixed(places));
}

function quaternionAngleDeg(a, b) {
  return fixedNumber(THREE.MathUtils.radToDeg(a.angleTo(b)), 4);
}

function vectorAngleDeg(a, b) {
  const angle = a.lengthSq() > 0 && b.lengthSq() > 0 ? a.angleTo(b) : 0;
  return fixedNumber(THREE.MathUtils.radToDeg(angle), 4);
}

function worldToScreenPixels(position) {
  const projected = position.clone().project(camera);
  const rect = canvas.getBoundingClientRect();
  return new THREE.Vector2(
    (projected.x * 0.5 + 0.5) * rect.width,
    (-projected.y * 0.5 + 0.5) * rect.height
  );
}

function localBoundsForObject(object) {
  object.updateMatrixWorld(true);
  const inverseRoot = object.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();
  object.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    const geometryBox = node.geometry.boundingBox;
    for (const x of [geometryBox.min.x, geometryBox.max.x]) {
      for (const y of [geometryBox.min.y, geometryBox.max.y]) {
        for (const z of [geometryBox.min.z, geometryBox.max.z]) {
          corner.set(x, y, z).applyMatrix4(node.matrixWorld).applyMatrix4(inverseRoot);
          box.expandByPoint(corner);
        }
      }
    }
  });
  return box;
}

function sabreBladeLocalAxis() {
  if (sabreBladeLocalAxisCache) return sabreBladeLocalAxisCache.clone();
  if (!sabreRoot) return new THREE.Vector3(0, 1, 0);
  const box = localBoundsForObject(sabreRoot);
  const size = box.getSize(new THREE.Vector3());
  if (size.x >= size.y && size.x >= size.z) sabreBladeLocalAxisCache = new THREE.Vector3(1, 0, 0);
  else if (size.y >= size.x && size.y >= size.z) sabreBladeLocalAxisCache = new THREE.Vector3(0, 1, 0);
  else sabreBladeLocalAxisCache = new THREE.Vector3(0, 0, 1);
  return sabreBladeLocalAxisCache.clone();
}

function orientationProbe(position, quaternion, localAxis, length) {
  const direction = localAxis.clone().normalize().applyQuaternion(quaternion).normalize();
  const end = position.clone().add(direction.clone().multiplyScalar(length));
  return {
    end,
    direction,
    screenEnd: worldToScreenPixels(end),
  };
}

function readySnapshot() {
  root.updateMatrixWorld(true);
  const rightHand = poseBones.get('RightHand');
  const handPosition = rightHand ? objectWorldPosition(rightHand) : new THREE.Vector3();
  const hiltPosition = saberGrip ? objectWorldPosition(saberGrip) : objectWorldPosition(sabreRoot);
  const sabrePosition = objectWorldPosition(sabreRoot);
  const handQuaternion = rightHand ? objectWorldQuaternion(rightHand) : new THREE.Quaternion();
  const hiltQuaternion = saberGrip ? objectWorldQuaternion(saberGrip) : new THREE.Quaternion();
  const sabreQuaternion = objectWorldQuaternion(sabreRoot);
  const handAxis = orientationProbe(handPosition, handQuaternion, new THREE.Vector3(0, 0, 1), HAND_AXIS_PROOF_LENGTH);
  const bladeAxis = orientationProbe(sabrePosition, sabreQuaternion, sabreBladeLocalAxis(), SABRE_AXIS_PROOF_LENGTH);
  return {
    handPosition,
    handQuaternion,
    hiltPosition,
    hiltQuaternion,
    sabrePosition,
    sabreQuaternion,
    handScreen: worldToScreenPixels(handPosition),
    hiltScreen: worldToScreenPixels(hiltPosition),
    sabreScreen: worldToScreenPixels(sabrePosition),
    handAxisEnd: handAxis.end,
    handAxisDirection: handAxis.direction,
    handAxisScreenEnd: handAxis.screenEnd,
    sabreBladeAxisEnd: bladeAxis.end,
    sabreBladeDirection: bladeAxis.direction,
    sabreBladeAxisScreenEnd: bladeAxis.screenEnd,
  };
}

function setLineEndpoints(line, a, b) {
  line.geometry.setFromPoints([a, b]);
  line.geometry.computeBoundingSphere();
}

function updateReadyDeltaMarkers(restSnapshot, readySnapshotValue) {
  if (!DEBUG_READY_DELTA) return;
  readyDeltaMarkers.restHand.position.copy(restSnapshot.handPosition);
  readyDeltaMarkers.readyHand.position.copy(readySnapshotValue.handPosition);
  readyDeltaMarkers.restHilt.position.copy(restSnapshot.hiltPosition);
  readyDeltaMarkers.readyHilt.position.copy(readySnapshotValue.hiltPosition);
  setLineEndpoints(readyDeltaMarkers.handLine, restSnapshot.handPosition, readySnapshotValue.handPosition);
  setLineEndpoints(readyDeltaMarkers.hiltLine, restSnapshot.hiltPosition, readySnapshotValue.hiltPosition);
  setLineEndpoints(readyDeltaMarkers.restHandAxis, restSnapshot.handPosition, restSnapshot.handAxisEnd);
  setLineEndpoints(readyDeltaMarkers.readyHandAxis, readySnapshotValue.handPosition, readySnapshotValue.handAxisEnd);
  setLineEndpoints(readyDeltaMarkers.restSabreAxis, restSnapshot.sabrePosition, restSnapshot.sabreBladeAxisEnd);
  setLineEndpoints(readyDeltaMarkers.readySabreAxis, readySnapshotValue.sabrePosition, readySnapshotValue.sabreBladeAxisEnd);
  for (const marker of Object.values(readyDeltaMarkers)) marker.visible = true;
}

function editableSaber() {
  return saberGrip || sabreRoot;
}

function editableTarget() {
  return toolMode === 'pose' ? selectedPoseBone : editableSaber();
}

function attachSaberToRightHand() {
  if (!meshyRoot || !sabreRoot) return;
  const rightHand = findRequiredBone(meshyRoot, 'RightHand');

  const grip = new THREE.Bone();
  grip.name = 'SaberGrip';
  grip.position.fromArray(SABER_GRIP_LOCAL.position);
  grip.rotation.set(
    THREE.MathUtils.degToRad(SABER_GRIP_LOCAL.rotationDeg[0]),
    THREE.MathUtils.degToRad(SABER_GRIP_LOCAL.rotationDeg[1]),
    THREE.MathUtils.degToRad(SABER_GRIP_LOCAL.rotationDeg[2])
  );
  grip.scale.fromArray(SABER_GRIP_LOCAL.scale);

  rightHand.add(grip);
  sabreRoot.position.set(0, 0, 0);
  sabreRoot.quaternion.identity();
  sabreRoot.scale.set(1, 1, 1);
  grip.add(sabreRoot);
  saberGrip = grip;
  root.updateMatrixWorld(true);
}

function resetSaberPlacement() {
  if (!sabreRoot) return;
  root.attach(sabreRoot);
  if (saberGrip?.parent) saberGrip.parent.remove(saberGrip);
  saberGrip = null;
  prepareSabre(sabreRoot);
  attachSaberToRightHand();
}

function setupPoseHandles() {
  if (!meshyRoot) return;
  poseBones.clear();
  poseHandles.clear();
  poseBoneRestQuaternions.clear();
  for (const name of POSE_BONE_NAMES) {
    const bone = findRequiredBone(meshyRoot, name);
    poseBones.set(name, bone);
    poseBoneRestQuaternions.set(name, bone.quaternion.clone());
    const handle = new THREE.Mesh(poseHandleGeometry, poseHandleMaterial);
    handle.name = `PoseHandle:${name}`;
    handle.userData.poseBoneName = name;
    handle.renderOrder = 10;
    handle.visible = false;
    scene.add(handle);
    poseHandles.set(name, handle);
  }
  updatePoseHandles();
}

function updatePoseHandles() {
  if (!poseHandles.size) return;
  for (const [name, handle] of poseHandles) {
    const bone = poseBones.get(name);
    handle.visible = toolMode === 'pose';
    if (!bone) continue;
    handle.position.copy(objectWorldPosition(bone));
    handle.quaternion.copy(camera.quaternion);
    handle.material = selectedPoseBone?.name === name ? poseHandleSelectedMaterial : poseHandleMaterial;
  }
}

function resetPose() {
  for (const [name, bone] of poseBones) {
    const rest = poseBoneRestQuaternions.get(name);
    if (rest) bone.quaternion.copy(rest);
  }
  poseState = 'rest';
  selectedPoseBone = null;
  root.updateMatrixWorld(true);
  updatePoseHandles();
}

function applyReadyPose() {
  for (const [name, values] of Object.entries(readyPosePreset?.bones || {})) {
    const bone = poseBones.get(name);
    if (bone) bone.quaternion.copy(quaternionFromArray(values));
  }
  poseState = 'ready';
  root.updateMatrixWorld(true);
  updatePoseHandles();
  const rightHand = poseBones.get('RightHand');
  const rightHandRest = poseBoneRestQuaternions.get('RightHand');
  const applied = rightHand ? quaternionToFixedArray(rightHand.quaternion) : null;
  const rest = rightHandRest ? quaternionToFixedArray(rightHandRest) : null;
  const preset = readyPosePreset?.bones?.RightHand || null;
  updateReadyProof({
    rightHandPresetQuaternion: preset,
    rightHandAppliedQuaternion: applied,
    rightHandRestQuaternion: rest,
    rightHandAppliedMatchesPreset: quaternionArraysClose(applied, preset),
    rightHandDiffersFromRest: !quaternionArraysClose(applied, rest),
  });
}

function setPoseState(next) {
  if (next === 'ready') {
    resetPose();
    const restSnapshot = readySnapshot();
    applyReadyPose();
    const appliedSnapshot = readySnapshot();
    const handWorldDelta = appliedSnapshot.handPosition.distanceTo(restSnapshot.handPosition);
    const handScreenDelta = appliedSnapshot.handScreen.distanceTo(restSnapshot.handScreen);
    const hiltWorldDelta = appliedSnapshot.hiltPosition.distanceTo(restSnapshot.hiltPosition);
    const sabreScreenDelta = appliedSnapshot.sabreScreen.distanceTo(restSnapshot.sabreScreen);
    const rightHandQuaternionAngle = quaternionAngleDeg(restSnapshot.handQuaternion, appliedSnapshot.handQuaternion);
    const saberGripQuaternionAngle = quaternionAngleDeg(restSnapshot.hiltQuaternion, appliedSnapshot.hiltQuaternion);
    const sabreQuaternionAngle = quaternionAngleDeg(restSnapshot.sabreQuaternion, appliedSnapshot.sabreQuaternion);
    const rightHandAxisScreenDelta = appliedSnapshot.handAxisScreenEnd.distanceTo(restSnapshot.handAxisScreenEnd);
    const sabreBladeAxisAngle = vectorAngleDeg(restSnapshot.sabreBladeDirection, appliedSnapshot.sabreBladeDirection);
    const sabreBladeAxisScreenDelta = appliedSnapshot.sabreBladeAxisScreenEnd.distanceTo(restSnapshot.sabreBladeAxisScreenEnd);
    const positionDeltaPass = handScreenDelta > 1 || sabreScreenDelta > 1;
    const orientationDeltaPass = rightHandQuaternionAngle > 0.25
      || saberGripQuaternionAngle > 0.25
      || sabreQuaternionAngle > 0.25
      || rightHandAxisScreenDelta > 1
      || sabreBladeAxisAngle > 0.25
      || sabreBladeAxisScreenDelta > 1;
    const visibleDeltaPass = positionDeltaPass || orientationDeltaPass;
    updateReadyDeltaMarkers(restSnapshot, appliedSnapshot);
    updateReadyProof({
      rightHandWorldDelta: fixedNumber(handWorldDelta, 6),
      rightHandScreenDeltaPx: fixedNumber(handScreenDelta, 3),
      rightHandQuaternionAngleDeg: rightHandQuaternionAngle,
      rightHandAxisScreenDeltaPx: fixedNumber(rightHandAxisScreenDelta, 3),
      saberGripWorldDelta: fixedNumber(hiltWorldDelta, 6),
      saberGripQuaternionAngleDeg: saberGripQuaternionAngle,
      sabreQuaternionAngleDeg: sabreQuaternionAngle,
      sabreBladeAxisAngleDeg: sabreBladeAxisAngle,
      sabreBladeAxisScreenDeltaPx: fixedNumber(sabreBladeAxisScreenDelta, 3),
      orientationDeltaPass,
      sabreScreenDeltaPx: fixedNumber(sabreScreenDelta, 3),
      visibleDeltaPass,
      visibleDeltaStatus: visibleDeltaPass
        ? positionDeltaPass
          ? 'VISIBLE_POSITION_DELTA'
          : 'VISIBLE_ORIENTATION_DELTA'
        : 'NO_VISIBLE_ORIENTATION_DELTA',
    });
    statusEl.textContent = 'ready pose: source-oriented OneHandReady, sabre follows RightHand FK';
  } else {
    resetPose();
    statusEl.textContent = 'rest pose: golden Meshy A-pose restored';
  }
  renderControls();
  updateReadout();
}

function initialPoseStateFromUrl() {
  return URL_PARAMS.get('pose') === 'ready' ? 'ready' : 'rest';
}

async function loadGlb(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

async function loadReadyPosePreset() {
  const cacheBust = URL_PARAMS.get('cacheBust');
  const suffix = cacheBust ? `?cacheBust=${encodeURIComponent(cacheBust)}` : '';
  const module = await import(`./ready-pose.js${suffix}`);
  readyPosePreset = module.READY_POSE_PRESET;
  updateReadyProof({
    readyPresetLoaded: Boolean(readyPosePreset),
    rightHandPresetQuaternion: readyPosePreset?.bones?.RightHand || null,
  });
}

function setMode(next) {
  mode = next === 'scale' || next === 'rotate' ? next : 'move';
  currentAxis = mode === 'scale' ? 'all' : 'screen';
  toolState[toolMode] = { mode, axis: currentAxis };
  renderControls();
}

function setToolMode(next) {
  toolState[toolMode] = { mode, axis: currentAxis };
  toolMode = next === 'pose' ? 'pose' : 'saber';
  mode = toolState[toolMode].mode;
  currentAxis = toolState[toolMode].axis;
  if (toolMode === 'pose') {
    leaveSaberEdit('pose: tap a bone handle');
  } else {
    selectedPoseBone = null;
  }
  updatePoseHandles();
  renderControls();
}

function setAxis(next) {
  currentAxis = next;
  currentAxis = mode === 'scale' && currentAxis === 'screen' ? 'all' : currentAxis;
  if (mode !== 'scale' && currentAxis === 'all') currentAxis = 'screen';
  toolState[toolMode] = { mode, axis: currentAxis };
  renderControls();
}

function axisLabel() {
  if (currentAxis === 'all') return 'All';
  return currentAxis === 'screen' ? 'Screen' : currentAxis.toUpperCase();
}

function setDockOpen(open, panel = activePanel || 'transform') {
  dockOpen = Boolean(open);
  if (!dockOpen) activePanel = null;
  else activePanel = controlPanels.some((element) => element.dataset.panel === panel) ? panel : 'transform';
  dockEl.hidden = !dockOpen;
  dockToggleButton.classList.toggle('active', dockOpen);
  setControlPanel(activePanel);
}

function setControlPanel(next) {
  if (!dockOpen || !next) {
    activePanel = null;
    for (const button of panelToggleButtons) button.classList.remove('active');
    for (const element of controlPanels) {
      element.hidden = true;
      element.classList.remove('active');
    }
    return;
  }
  activePanel = controlPanels.some((element) => element.dataset.panel === next) ? next : 'transform';
  for (const button of panelToggleButtons) {
    button.classList.toggle('active', button.dataset.panelToggle === activePanel);
  }
  for (const element of controlPanels) {
    const active = element.dataset.panel === activePanel;
    element.hidden = !active;
    element.classList.toggle('active', active);
  }
}

function renderControls() {
  toolButtons.forEach((button) => button.classList.toggle('active', button.dataset.tool === toolMode));
  viewModeButtons.forEach((button) => button.classList.toggle('active', button.dataset.viewMode === viewMode));
  poseStateButtons.forEach((button) => button.classList.toggle('active', button.dataset.poseState === poseState));
  modeButtons.forEach((button) => button.classList.toggle('active', button.dataset.mode === mode));
  axisButtons.forEach((button) => {
    const axis = button.dataset.axis || 'screen';
    button.hidden = axis === 'all' && mode !== 'scale';
    button.classList.toggle('active', axis === currentAxis);
  });
  resetSaberButton.hidden = toolMode !== 'saber';
  resetPoseButton.hidden = toolMode !== 'pose';
  panelToggleButtons.forEach((button) => button.classList.toggle('active', button.dataset.panelToggle === activePanel));
  dockEl.hidden = !dockOpen;
  dockToggleButton.classList.toggle('active', dockOpen);
  cycleToolButton.textContent = `Tool: ${toolMode === 'pose' ? 'Pose' : 'Saber'}`;
  cyclePoseStateButton.textContent = `Pose: ${poseState === 'ready' ? 'Ready' : 'Rest'}`;
  cycleViewModeButton.textContent = `View: ${viewMode === 'firstPerson' ? 'FPV' : 'Orbit'}`;
  statusEl.textContent = toolMode === 'pose'
    ? selectedPoseBone
      ? `${mode} / ${axisLabel()}: editing ${selectedPoseBone.name}`
      : `pose / ${axisLabel()}: tap a blue bone handle`
    : selected
    ? `${mode} / ${axisLabel()}: drag sabre to edit, drag empty space for camera`
    : `${mode} / ${axisLabel()}: tap the visible sabre first`;
}

function applyOrbitCamera() {
  viewMode = 'orbit';
  document.body.classList.remove('is-fpv');
  controls.enabled = true;
  camera.fov = orbitCameraState.fov;
  camera.near = orbitCameraState.near;
  camera.far = orbitCameraState.far;
  controls.minDistance = orbitCameraState.minDistance;
  controls.maxDistance = orbitCameraState.maxDistance;
  camera.position.copy(orbitCameraState.position);
  controls.target.copy(orbitCameraState.target);
  camera.updateProjectionMatrix();
  controls.update();
}

function updateFirstPersonCamera() {
  if (viewMode !== 'firstPerson' || !meshyRoot) return;
  const anchor = findBone(meshyRoot, firstPersonCameraConfig.anchor)
    || findBone(meshyRoot, firstPersonCameraConfig.fallbackAnchor);
  if (!anchor) return;
  root.updateMatrixWorld(true);
  const anchorPosition = objectWorldPosition(anchor);
  const anchorQuaternion = objectWorldQuaternion(anchor);
  const forward = localAxisVector(firstPersonCameraConfig.forwardAxis)
    .applyQuaternion(anchorQuaternion)
    .normalize();
  const position = anchorPosition.clone()
    .add(forward.clone().multiplyScalar(firstPersonCameraConfig.headForwardOffset))
    .add(new THREE.Vector3(0, firstPersonCameraConfig.headCameraYOffset, 0));
  const target = anchorPosition.clone()
    .add(forward.clone().multiplyScalar(firstPersonCameraConfig.lookForward))
    .add(new THREE.Vector3(0, firstPersonCameraConfig.lookVertical, 0));
  camera.position.copy(position);
  camera.up.set(0, 1, 0);
  camera.lookAt(target);
  camera.fov = firstPersonCameraConfig.fov;
  camera.near = firstPersonCameraConfig.near;
  camera.far = orbitCameraState.far;
  camera.updateProjectionMatrix();
  updateReadyProof({
    fpvCamera: {
      cameraWorldPosition: vectorToFixedArray(camera.position),
      headWorldPosition: vectorToFixedArray(anchorPosition),
      headDistance: fixedNumber(camera.position.distanceTo(anchorPosition), 5),
      fov: firstPersonCameraConfig.fov,
      near: firstPersonCameraConfig.near,
      bodyMeshesHidden: false,
    },
  });
}

function setViewMode(next) {
  if (next === 'firstPerson') {
    viewMode = 'firstPerson';
    controls.enabled = false;
    document.body.classList.add('is-fpv');
    setDockOpen(false);
    updateFirstPersonCamera();
    statusEl.textContent = 'camera: FPV head-forward';
  } else {
    applyOrbitCamera();
    statusEl.textContent = 'camera: orbit';
  }
  renderControls();
  updateReadout();
}

function leaveSaberEdit(message = 'camera: sabre deselected') {
  selected = false;
  gesture = null;
  touchGesture = null;
  suppressTouchPointerEvents = false;
  pointers.clear();
  controls.enabled = true;
  lastPinchDistance = 0;
  lastTwistAngle = 0;
  renderControls();
  statusEl.textContent = message;
}

function cycleMode() {
  setMode(mode === 'move' ? 'rotate' : mode === 'rotate' ? 'scale' : 'move');
}

function exportTransform() {
  if (!sabreRoot) return {};
  root.updateMatrixWorld(true);
  const rotationDeg = rotationDegFromQuaternion(objectWorldQuaternion(sabreRoot));
  const scale = objectWorldScale(sabreRoot).toArray().map((value) => Number(value.toFixed(5)));
  const saberGripLocal = saberGrip ? {
    parentBone: 'RightHand',
    position: saberGrip.position.toArray().map((value) => Number(value.toFixed(5))),
    rotationDeg: rotationDegFromEuler(saberGrip.rotation),
    scale: saberGrip.scale.toArray().map((value) => Number(value.toFixed(5))),
  } : null;
  const sabreLocal = sabreRoot ? {
    position: vectorToFixedArray(sabreRoot.position),
    rotationDeg: rotationDegFromEuler(sabreRoot.rotation),
    scale: vectorToFixedArray(sabreRoot.scale),
  } : null;
  const poseBonesExport = {};
  for (const [name, bone] of poseBones) {
    const rest = poseBoneRestQuaternions.get(name);
    if (!rest || bone.quaternion.angleTo(rest) < 0.0001) continue;
    poseBonesExport[name] = {
      rotationDeg: rotationDegFromEuler(bone.rotation),
    };
  }
  return {
    schema: 'pose-lab-v2-sabre-transform-v1',
    toolMode,
    assets: {
      meshy: ASSETS.meshy,
      sabre: ASSETS.sabre,
    },
    saberRoot: {
      position: objectWorldPosition(sabreRoot).toArray().map((value) => Number(value.toFixed(5))),
      rotationDeg,
      scale,
      uniformScale: Number(scale[0].toFixed(5)),
    },
    saberGrip: saberGripLocal,
    sabreLocal,
    pose: {
      state: poseState,
      readyPreset: readyPosePreset?.label || null,
      selectedBone: selectedPoseBone?.name || null,
      bones: poseBonesExport,
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

function pickPoseHandle(clientX, clientY) {
  if (!poseHandles.size) return null;
  const rect = canvas.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -(((clientY - rect.top) / rect.height) * 2 - 1)
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects([...poseHandles.values()].filter((handle) => handle.visible), false);
  if (!hits.length) return null;
  const name = hits[0].object.userData.poseBoneName;
  return poseBones.get(name) || null;
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

function moveEditableByGesture(dx, dy, basis) {
  const target = editableTarget();
  if (!target) return;
  const amount = 0.0035;
  if (currentAxis === 'screen') {
    const delta = basis.right.clone().multiplyScalar(dx * amount)
      .add(basis.up.clone().multiplyScalar(-dy * amount));
    moveObjectInWorld(target, delta);
    return;
  }
  const axis = worldAxisVector(currentAxis);
  if (!axis) return;
  const value = (Math.abs(dx) > Math.abs(dy) ? dx : -dy) * amount;
  moveObjectInWorld(target, axis.multiplyScalar(value));
}

function moveObjectInWorld(object, delta) {
  const position = objectWorldPosition(object).add(delta);
  if (object.parent) object.parent.worldToLocal(position);
  object.position.copy(position);
  object.updateMatrixWorld(true);
}

function rotateSabreAroundAxis(axis, radians) {
  const target = editableTarget();
  if (!target) return;
  const delta = new THREE.Quaternion().setFromAxisAngle(axis.normalize(), radians);
  const worldQuaternion = objectWorldQuaternion(target).premultiply(delta).normalize();
  if (target.parent) {
    const parentWorldQuaternion = objectWorldQuaternion(target.parent).invert();
    target.quaternion.copy(parentWorldQuaternion.multiply(worldQuaternion)).normalize();
  } else {
    target.quaternion.copy(worldQuaternion);
  }
  target.updateMatrixWorld(true);
}

function rotateEditableByGesture(dx, dy, basis) {
  if (toolMode === 'pose' && !selectedPoseBone) return;
  if (toolMode === 'pose') poseState = 'custom';
  if (currentAxis === 'screen') {
    rotateSabreAroundAxis(basis.up.clone(), dx * 0.007);
    rotateSabreAroundAxis(basis.right.clone(), dy * 0.007);
    updatePoseHandles();
    return;
  }
  const axis = worldAxisVector(currentAxis);
  if (!axis) return;
  const radians = (Math.abs(dx) > Math.abs(dy) ? dx : -dy) * 0.007;
  rotateSabreAroundAxis(axis, radians);
  updatePoseHandles();
}

function scaleEditableByDelta(delta) {
  const target = editableTarget();
  if (!target) return;
  if (toolMode === 'pose') poseState = 'custom';
  if (currentAxis === 'all' || currentAxis === 'screen') {
    const scalar = Math.max(0.05, Math.min(3, target.scale.x + delta));
    target.scale.setScalar(scalar);
    return;
  }
  const next = Math.max(0.05, Math.min(3, target.scale[currentAxis] + delta));
  target.scale[currentAxis] = next;
}

function applyEditableGestureDelta(dx, dy, basis) {
  if (mode === 'move') {
    moveEditableByGesture(dx, dy, basis);
  } else if (mode === 'scale') {
    scaleEditableByDelta((dx - dy) * 0.004);
  } else {
    rotateEditableByGesture(dx, dy, basis);
  }
}

function orbitCameraByDelta(dx, dy) {
  const offset = camera.position.clone().sub(controls.target);
  const spherical = new THREE.Spherical().setFromVector3(offset);
  spherical.theta -= dx * 0.006;
  spherical.phi = THREE.MathUtils.clamp(spherical.phi - dy * 0.0045, 0.18, Math.PI - 0.18);
  offset.setFromSpherical(spherical);
  camera.position.copy(controls.target).add(offset);
  controls.update();
}

function zoomCameraByDelta(delta) {
  const offset = camera.position.clone().sub(controls.target);
  const scale = THREE.MathUtils.clamp(1 - delta * 0.003, 0.82, 1.18);
  const nextLength = THREE.MathUtils.clamp(offset.length() * scale, controls.minDistance, controls.maxDistance);
  offset.setLength(nextLength);
  camera.position.copy(controls.target).add(offset);
  controls.update();
}

function panCameraByDelta(dx, dy) {
  const { right, up } = cameraBasis();
  const distance = camera.position.distanceTo(controls.target);
  const amount = distance * 0.0012;
  const delta = right.multiplyScalar(-dx * amount).add(up.multiplyScalar(dy * amount));
  camera.position.add(delta);
  controls.target.add(delta);
  controls.update();
}

function stopEvent(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

function capturePointer(pointerId) {
  if (canvas.hasPointerCapture?.(pointerId)) return;
  canvas.setPointerCapture(pointerId);
}

function releasePointer(pointerId) {
  if (!canvas.hasPointerCapture?.(pointerId)) return;
  canvas.releasePointerCapture(pointerId);
}

function touchPoints(event) {
  return [...event.touches].map((touch) => ({ x: touch.clientX, y: touch.clientY }));
}

function touchDistance(points) {
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function touchAngle(points) {
  if (points.length < 2) return 0;
  return Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
}

function beginSingleTouchSabre(touch, hit) {
  if (toolMode === 'pose') {
    const bone = pickPoseHandle(touch.clientX, touch.clientY);
    if (!bone) return false;
    selectedPoseBone = bone;
    const { right, up, forward } = cameraBasis();
    touchGesture = {
      kind: 'single-pose',
      lastX: touch.clientX,
      lastY: touch.clientY,
      moved: false,
      tapCanCycle: false,
      right,
      up,
      forward,
    };
    controls.enabled = false;
    updatePoseHandles();
    statusEl.textContent = `pose: ${mode} ${bone.name}`;
    return true;
  }
  const wasSelected = selected && hit;
  selected = true;
  const { right, up, forward } = cameraBasis();
  touchGesture = {
    kind: 'single-sabre',
    lastX: touch.clientX,
    lastY: touch.clientY,
    moved: false,
    tapCanCycle: wasSelected,
    right,
    up,
    forward,
  };
  controls.enabled = false;
  controls.target.copy(objectWorldPosition(sabreRoot));
  controls.update();
  statusEl.textContent = `${mode}: touch editing real sabre`;
}

function beginTwoFingerSabre(points) {
  const { right, up, forward } = cameraBasis();
  touchGesture = {
    kind: 'two-sabre',
    moved: false,
    tapCanCycle: false,
    right,
    up,
    forward,
  };
  lastPinchDistance = touchDistance(points);
  lastTwistAngle = touchAngle(points);
  controls.enabled = false;
  statusEl.textContent = mode === 'rotate' ? 'two-finger roll armed' : 'two-finger scale armed';
}

function beginTwoFingerPose(points) {
  const { right, up, forward } = cameraBasis();
  touchGesture = {
    kind: 'two-pose',
    moved: false,
    tapCanCycle: false,
    right,
    up,
    forward,
  };
  lastTwistAngle = touchAngle(points);
  lastPinchDistance = touchDistance(points);
  controls.enabled = false;
  statusEl.textContent = `pose: two-finger ${mode} ${selectedPoseBone?.name || ''}`;
  updateTouchProof({ lastTouchAction: 'two-finger-pose-start' });
}

function beginPoseEmptyTouch(point) {
  touchGesture = {
    kind: 'pose-empty',
    lastX: point.x,
    lastY: point.y,
    moved: false,
    tapCanCycle: false,
  };
  controls.enabled = false;
  statusEl.textContent = 'pose: selected bone kept; double-tap empty space to deselect';
  updateTouchProof({ lastTouchAction: 'empty-hold' });
}

function beginCameraTouch(points) {
  touchGesture = {
    kind: points.length >= 2 ? 'two-camera' : 'one-camera',
    lastX: points[0].x,
    lastY: points[0].y,
    moved: false,
    tapCanCycle: false,
  };
  lastPinchDistance = touchDistance(points);
  controls.enabled = false;
  statusEl.textContent = points.length >= 2 ? 'camera: pinch zoom / drag pan' : 'camera: one-finger orbit';
}

function consumePoseEmptyDoubleTap(point) {
  const now = performance.now();
  const previous = lastPoseEmptyTap;
  lastPoseEmptyTap = { x: point.x, y: point.y, time: now };
  if (!previous) return false;
  const elapsed = now - previous.time;
  const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
  if (elapsed > 360 || distance > 36) return false;
  selectedPoseBone = null;
  lastPoseEmptyTap = null;
  updatePoseHandles();
  statusEl.textContent = 'pose: bone deselected';
  updateTouchProof({ selectedBone: 'none', lastTouchAction: 'double-tap-deselect' });
  return true;
}

function handleTouchStart(event) {
  if (!sabreRoot) return false;
  const points = touchPoints(event);
  if (points.length >= 2 && toolMode === 'pose' && selectedPoseBone) {
    suppressTouchPointerEvents = true;
    beginTwoFingerPose(points);
    stopEvent(event);
    return true;
  }
  if (points.length >= 2 && toolMode === 'saber' && selected && (mode === 'rotate' || mode === 'scale')) {
    suppressTouchPointerEvents = true;
    beginTwoFingerSabre(points);
    stopEvent(event);
    return true;
  }
  if (points.length >= 2) {
    leaveSaberEdit('camera: two-finger gesture');
    suppressTouchPointerEvents = true;
    beginCameraTouch(points);
    stopEvent(event);
    return true;
  }
  if (points.length !== 1) return false;
  const touch = event.touches[0];
  if (toolMode === 'pose') {
    const started = beginSingleTouchSabre(touch, null);
    if (started) {
      lastPoseEmptyTap = null;
      suppressTouchPointerEvents = true;
      stopEvent(event);
      return true;
    }
    if (consumePoseEmptyDoubleTap(points[0])) {
      suppressTouchPointerEvents = true;
      stopEvent(event);
      return true;
    }
    suppressTouchPointerEvents = true;
    if (selectedPoseBone) {
      beginPoseEmptyTouch(points[0]);
    } else {
      beginCameraTouch(points);
    }
    stopEvent(event);
    return true;
  }
  const hit = pickSabre(touch.clientX, touch.clientY);
  if (!hit) {
    leaveSaberEdit('camera: empty touch orbit');
    suppressTouchPointerEvents = true;
    beginCameraTouch(points);
    stopEvent(event);
    return true;
  }
  suppressTouchPointerEvents = true;
  beginSingleTouchSabre(touch, hit);
  stopEvent(event);
  return true;
}

function handleTouchMove(event) {
  if (!sabreRoot || !touchGesture) return false;
  const points = touchPoints(event);
  if (points.length >= 2 && toolMode === 'pose' && selectedPoseBone) {
    if (touchGesture.kind !== 'two-pose') beginTwoFingerPose(points);
    handleTwoFingerTouch(points);
    updatePoseHandles();
    updateReadout();
    statusEl.textContent = `pose: two-finger ${mode} ${selectedPoseBone.name}`;
    updateTouchProof({ lastTouchAction: 'two-finger-twist' });
    stopEvent(event);
    return true;
  }
  if (points.length >= 2 && toolMode === 'saber' && selected && (mode === 'rotate' || mode === 'scale')) {
    if (touchGesture.kind !== 'two-sabre') beginTwoFingerSabre(points);
    handleTwoFingerTouch(points);
    stopEvent(event);
    return true;
  }
  if (touchGesture.kind === 'one-camera' && points.length === 1) {
    const point = points[0];
    const dx = point.x - touchGesture.lastX;
    const dy = point.y - touchGesture.lastY;
    orbitCameraByDelta(dx, dy);
    touchGesture.lastX = point.x;
    touchGesture.lastY = point.y;
    touchGesture.moved = true;
    statusEl.textContent = 'camera: one-finger orbit';
    stopEvent(event);
    return true;
  }
  if (touchGesture.kind === 'two-camera' && points.length >= 2) {
    const distance = touchDistance(points);
    const center = {
      x: (points[0].x + points[1].x) * 0.5,
      y: (points[0].y + points[1].y) * 0.5,
    };
    if (lastPinchDistance > 0) zoomCameraByDelta(distance - lastPinchDistance);
    panCameraByDelta(center.x - touchGesture.lastX, center.y - touchGesture.lastY);
    lastPinchDistance = distance;
    touchGesture.lastX = center.x;
    touchGesture.lastY = center.y;
    touchGesture.moved = true;
    statusEl.textContent = 'camera: pinch zoom / drag pan';
    stopEvent(event);
    return true;
  }
  if (touchGesture.kind === 'single-pose' && points.length === 1) {
    const point = points[0];
    const dx = point.x - touchGesture.lastX;
    const dy = point.y - touchGesture.lastY;
    if (Math.abs(dx) + Math.abs(dy) >= 0.5) {
      applyEditableGestureDelta(dx, dy, touchGesture);
      touchGesture.lastX = point.x;
      touchGesture.lastY = point.y;
      touchGesture.moved = true;
      updateReadout();
    }
    stopEvent(event);
    return true;
  }
  if (touchGesture.kind === 'pose-empty') {
    touchGesture.moved = true;
    statusEl.textContent = 'pose: selected bone kept; double-tap empty space to deselect';
    stopEvent(event);
    return true;
  }
  if (touchGesture.kind !== 'single-sabre' || points.length !== 1) return false;
  const point = points[0];
  const dx = point.x - touchGesture.lastX;
  const dy = point.y - touchGesture.lastY;
  if (Math.abs(dx) + Math.abs(dy) < 0.5) {
    stopEvent(event);
    return true;
  }
  if (mode === 'move') {
    moveEditableByGesture(dx, dy, touchGesture);
  } else if (mode === 'scale') {
    scaleEditableByDelta((dx - dy) * 0.004);
  } else {
    rotateEditableByGesture(dx, dy, touchGesture);
  }
  touchGesture.lastX = point.x;
  touchGesture.lastY = point.y;
  touchGesture.moved = true;
  updateReadout();
  stopEvent(event);
  return true;
}

function handleTouchEnd(event) {
  if (!touchGesture) {
    suppressTouchPointerEvents = false;
    return false;
  }
  if (!touchGesture.moved && touchGesture.tapCanCycle) cycleMode();
  touchGesture = null;
  suppressTouchPointerEvents = false;
  controls.enabled = true;
  lastPinchDistance = 0;
  lastTwistAngle = 0;
  updateReadout();
  statusEl.textContent = `${mode}: transform ready; empty-space drag orbits camera`;
  stopEvent(event);
  return true;
}

function makeSyntheticTouchEvent(points) {
  return {
    touches: points.map((point) => ({ clientX: point.x, clientY: point.y })),
    preventDefault() {},
    stopImmediatePropagation() {},
  };
}

function makeSyntheticPointerEvent() {
  return {
    pointerType: 'touch',
    preventDefault() {},
    stopImmediatePropagation() {},
  };
}

function runTouchProbe() {
  if (!meshyRoot || !poseBones.size) {
    updateTouchProof({ probe: 'FAIL', lastTouchAction: 'probe missing pose bones' });
    return;
  }
  const previousToolMode = toolMode;
  const previousMode = mode;
  const previousAxis = currentAxis;
  const previousPoseState = poseState;
  const previousSelectedBone = selectedPoseBone;
  const previousGesture = gesture;
  const previousTouchGesture = touchGesture;
  setToolMode('pose');
  setMode('rotate');
  const bone = poseBones.get('RightHand') || poseBones.get('RightForeArm');
  if (!bone) {
    updateTouchProof({ probe: 'FAIL', lastTouchAction: 'probe missing RightHand' });
    return;
  }
  selectedPoseBone = bone;
  updatePoseHandles();
  root.updateMatrixWorld(true);
  const cameraPositionBefore = camera.position.clone();
  const cameraTargetBefore = controls.target.clone();
  const bonePositionBefore = bone.position.clone();
  const boneQuaternionBefore = bone.quaternion.clone();
  const boneScaleBefore = bone.scale.clone();

  setMode('move');
  applyEditableGestureDelta(32, -18, cameraBasis());
  const bonePositionChanged = bone.position.distanceTo(bonePositionBefore) > 1e-6;

  setMode('rotate');
  blockPoseTouchPointer(makeSyntheticPointerEvent());
  handleTouchStart(makeSyntheticTouchEvent([
    { x: 120, y: 120 },
    { x: 180, y: 120 },
  ]));
  const gestureKindAfterStart = touchGesture?.kind || 'none';
  handleTouchMove(makeSyntheticTouchEvent([
    { x: 120, y: 120 },
    { x: 168, y: 152 },
  ]));

  setMode('scale');
  beginTwoFingerPose([
    { x: 120, y: 120 },
    { x: 180, y: 120 },
  ]);
  handleTwoFingerTouch([
    { x: 120, y: 120 },
    { x: 205, y: 120 },
  ]);

  const cameraMoved = camera.position.distanceTo(cameraPositionBefore) > 1e-8
    || controls.target.distanceTo(cameraTargetBefore) > 1e-8;
  const boneChanged = bone.quaternion.angleTo(boneQuaternionBefore) > 1e-6;
  const boneScaleChanged = bone.scale.distanceTo(boneScaleBefore) > 1e-6;
  const selectedStayed = selectedPoseBone === bone;
  const passed = selectedStayed && gestureKindAfterStart === 'two-pose' && !cameraMoved
    && boneChanged && bonePositionChanged && boneScaleChanged;
  bone.position.copy(bonePositionBefore);
  bone.quaternion.copy(boneQuaternionBefore);
  bone.scale.copy(boneScaleBefore);
  camera.position.copy(cameraPositionBefore);
  controls.target.copy(cameraTargetBefore);
  controls.update();
  toolMode = previousToolMode;
  mode = previousMode;
  currentAxis = previousAxis;
  poseState = previousPoseState;
  selectedPoseBone = previousSelectedBone;
  gesture = previousGesture;
  touchGesture = previousTouchGesture;
  controls.enabled = true;
  root.updateMatrixWorld(true);
  updatePoseHandles();
  updateTouchProof({
    probe: passed ? 'PASS' : 'FAIL',
    selectedBone: selectedPoseBone?.name || 'none',
    gestureKind: gestureKindAfterStart,
    cameraMovedDuringPoseTouch: cameraMoved,
    boneQuaternionChanged: boneChanged,
    bonePositionChanged,
    boneScaleChanged,
    lastTouchAction: passed ? 'probe pass' : 'probe fail',
  });
  updateReadout();
  statusEl.textContent = `touch probe: ${passed ? 'PASS' : 'FAIL'}`;
}

function startGesture(event) {
  if (!sabreRoot) return false;
  if (event.pointerType === 'touch' && suppressTouchPointerEvents) {
    stopEvent(event);
    return true;
  }
  if (event.pointerType === 'touch' && toolMode === 'pose') {
    stopEvent(event);
    return true;
  }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (toolMode === 'pose') {
    const bone = pickPoseHandle(event.clientX, event.clientY);
    if (!bone) {
      pointers.delete(event.pointerId);
      if (selectedPoseBone) {
        statusEl.textContent = 'pose: selected bone kept; double-tap empty space to deselect';
        stopEvent(event);
        return true;
      }
      return false;
    }
    selectedPoseBone = bone;
    controls.enabled = false;
    capturePointer(event.pointerId);
    const { right, up, forward } = cameraBasis();
    gesture = {
      pointerId: event.pointerId,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
      tapCanCycle: false,
      right,
      up,
      forward,
    };
    updatePoseHandles();
    statusEl.textContent = `pose: ${mode} ${bone.name}`;
    stopEvent(event);
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
  capturePointer(event.pointerId);
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
  controls.target.copy(objectWorldPosition(sabreRoot));
  controls.update();
  statusEl.textContent = `${mode}: editing real sabre`;
  stopEvent(event);
  return true;
}

function updateGesture(event) {
  if (event.pointerType === 'touch' && suppressTouchPointerEvents) {
    stopEvent(event);
    return true;
  }
  if (!sabreRoot || !pointers.has(event.pointerId)) return false;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (!gesture) return false;
  if (gesture.pointerId !== event.pointerId) return false;
  const dx = event.clientX - gesture.lastX;
  const dy = event.clientY - gesture.lastY;
  if (Math.abs(dx) + Math.abs(dy) < 0.5) return true;

  applyEditableGestureDelta(dx, dy, gesture);

  gesture.lastX = event.clientX;
  gesture.lastY = event.clientY;
  gesture.moved = true;
  updatePoseHandles();
  updateReadout();
  stopEvent(event);
  return true;
}

function endGesture(event) {
  if (event.pointerType === 'touch' && suppressTouchPointerEvents) {
    stopEvent(event);
    return true;
  }
  const wasTracked = pointers.has(event.pointerId);
  pointers.delete(event.pointerId);
  releasePointer(event.pointerId);
  if (gesture?.pointerId !== event.pointerId) return wasTracked;
  if (!gesture.moved && gesture.tapCanCycle) cycleMode();
  gesture = null;
  controls.enabled = true;
  if (pointers.size < 2) {
    lastPinchDistance = 0;
    lastTwistAngle = 0;
  }
  updateReadout();
  statusEl.textContent = `${mode}: transform ready; empty-space drag orbits camera`;
  stopEvent(event);
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

function handleTwoFingerTouch(points) {
  if (!touchGesture || !editableTarget()) return;
  const distance = touchDistance(points);
  const angle = touchAngle(points);
  if (mode === 'scale' && lastPinchDistance > 0) {
    scaleEditableByDelta((distance - lastPinchDistance) * 0.006);
  }
  if (mode === 'rotate' && Number.isFinite(lastTwistAngle)) {
    const twist = angle - lastTwistAngle;
    const axis = currentAxis === 'screen' ? touchGesture.forward.clone() : worldAxisVector(currentAxis);
    if (axis) rotateSabreAroundAxis(axis, twist);
  }
  lastPinchDistance = distance;
  lastTwistAngle = angle;
  touchGesture.moved = true;
  updateReadout();
  statusEl.textContent = mode === 'rotate'
    ? `two-finger roll / ${axisLabel()}`
    : mode === 'scale'
      ? `two-finger scale / ${axisLabel()}`
      : 'two-finger camera gesture ignored in Move';
}

function snapCamera(view) {
  if (viewMode !== 'orbit') setViewMode('orbit');
  const focus = sabreRoot ? objectWorldPosition(sabreRoot) : new THREE.Vector3(0, 0.95, 0);
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
  orbitCameraState.position.copy(camera.position);
  orbitCameraState.target.copy(controls.target);
  controls.update();
  statusEl.textContent = `camera: ${view}`;
}

async function boot() {
  const [meshy, sabre] = await Promise.all([loadGlb(ASSETS.meshy), loadGlb(ASSETS.sabre), loadReadyPosePreset()]);
  meshyRoot = normalizeCharacter(meshy);
  sabreRoot = prepareSabre(sabre);
  root.add(meshyRoot, sabreRoot);
  attachSaberToRightHand();
  setupPoseHandles();
  setMode('move');
  setPoseState(initialPoseStateFromUrl());
  if (poseState === 'rest') statusEl.textContent = 'ready: tap the real sabre, then drag';
}

toolButtons.forEach((button) => {
  button.addEventListener('click', () => setToolMode(button.dataset.tool || 'saber'));
});

cycleToolButton.addEventListener('click', () => setToolMode(toolMode === 'saber' ? 'pose' : 'saber'));

viewModeButtons.forEach((button) => {
  button.addEventListener('click', () => setViewMode(button.dataset.viewMode || 'orbit'));
});

cycleViewModeButton.addEventListener('click', () => setViewMode(viewMode === 'orbit' ? 'firstPerson' : 'orbit'));

poseStateButtons.forEach((button) => {
  button.addEventListener('click', () => setPoseState(button.dataset.poseState || 'rest'));
});

cyclePoseStateButton.addEventListener('click', () => setPoseState(poseState === 'rest' ? 'ready' : 'rest'));

modeButtons.forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode || 'move'));
});

axisButtons.forEach((button) => {
  button.addEventListener('click', () => setAxis(button.dataset.axis || 'screen'));
});

dockToggleButton.addEventListener('click', () => setDockOpen(!dockOpen));

panelToggleButtons.forEach((button) => {
  button.addEventListener('click', () => setDockOpen(true, button.dataset.panelToggle || 'transform'));
});

app.querySelectorAll('[data-camera-view]').forEach((button) => {
  button.addEventListener('click', () => snapCamera(button.dataset.cameraView || 'front'));
});

resetSaberButton.addEventListener('click', () => {
  if (!sabreRoot) return;
  resetSaberPlacement();
  updateReadout();
  statusEl.textContent = 'reset real sabre transform';
});

resetPoseButton.addEventListener('click', () => {
  resetPose();
  renderControls();
  updateReadout();
  statusEl.textContent = 'reset pose bones';
});

app.querySelector('[data-action="camera"]').addEventListener('click', () => {
  if (viewMode !== 'orbit') setViewMode('orbit');
  leaveSaberEdit();
});

app.querySelector('[data-action="copy"]').addEventListener('click', () => {
  navigator.clipboard?.writeText(JSON.stringify(exportTransform(), null, 2)).catch(() => {});
  statusEl.textContent = 'export copied';
});

touchProbeButton?.addEventListener('click', runTouchProbe);
updateTouchProof();
updateReadyProof();

canvas.addEventListener('pointerdown', startGesture, { capture: true });
canvas.addEventListener('pointermove', updateGesture, { capture: true });
canvas.addEventListener('pointerup', endGesture, { capture: true });
canvas.addEventListener('pointercancel', endGesture, { capture: true });
canvas.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { capture: true, passive: false });
canvas.addEventListener('touchcancel', handleTouchEnd, { capture: true, passive: false });

function animate() {
  resize();
  if (viewMode === 'orbit') controls.update();
  else updateFirstPersonCamera();
  updatePoseHandles();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

boot().catch((error) => {
  statusEl.textContent = `load failed: ${error instanceof Error ? error.message : String(error)}`;
});

requestAnimationFrame(animate);

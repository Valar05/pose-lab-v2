import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { POSE_STATUS } from './pose-status.js';
import { ATTACK1_REVIEW_CANDIDATES, CRIMSON_SABER_GRIP_LOCAL, CRIMSON_SWORD_LOCAL, DAVIN_IDLE_REVIEW_CANDIDATES, LOWBACKKICK_REVIEW_CANDIDATES, SABER_GRIP_LOCAL } from './review-constants.js';

const URL_PARAMS = new URLSearchParams(window.location.search);
const CRIMSON_ASSET_QUALITY = URL_PARAMS.get('quality') === 'source' ? 'source' : 'review';

const ASSETS = {
  meshy: './assets/meshy/meshy_apose_walking_with_skin.glb',
  sabre: './assets/meshy/meshy_real_sabre.glb',
  crimsonSource: './assets/crimson/crimson_plume_knight_rigged_pbr.glb',
  arborbladeSource: './assets/crimson/arborblade_sword.glb',
  crimsonReview: './assets/crimson/crimson_plume_knight_rigged_pbr_review.glb',
  crimsonBvhIdle: './assets/crimson/experiments/crimson_org_bvh_idle_transfer.glb',
  crimsonSaneGuard: './assets/crimson/experiments/crimson_sane_guard_idle.glb',
  arborbladeReview: './assets/crimson/arborblade_sword_review.glb',
  crimson: CRIMSON_ASSET_QUALITY === 'source' ? './assets/crimson/crimson_plume_knight_rigged_pbr.glb' : './assets/crimson/crimson_plume_knight_rigged_pbr_review.glb',
  arborblade: CRIMSON_ASSET_QUALITY === 'source' ? './assets/crimson/arborblade_sword.glb' : './assets/crimson/arborblade_sword_review.glb',
  fistHands: './assets/meshy/meshy_fist_hands.glb',
  davin: './assets/davin/davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb',
  ares: './assets/ares/ares_rigged_diffuse.glb',
  securityTitan: './assets/ares/security_titan_rigged_diffuse.glb',
  vanguard: './assets/vanguard/vanguard_rigged_animations.glb',
};
const MIXAMO_BONE_MAP = Object.freeze({
  Hips: 'mixamorig:Hips',
  Spine: 'mixamorig:Spine',
  Spine01: 'mixamorig:Spine1',
  Spine02: 'mixamorig:Spine2',
  neck: 'mixamorig:Neck',
  Head: 'mixamorig:Head',
  LeftShoulder: 'mixamorig:LeftShoulder',
  LeftArm: 'mixamorig:LeftArm',
  LeftForeArm: 'mixamorig:LeftForeArm',
  LeftHand: 'mixamorig:LeftHand',
  RightShoulder: 'mixamorig:RightShoulder',
  RightArm: 'mixamorig:RightArm',
  RightForeArm: 'mixamorig:RightForeArm',
  RightHand: 'mixamorig:RightHand',
  LeftUpLeg: 'mixamorig:LeftUpLeg',
  LeftLeg: 'mixamorig:LeftLeg',
  LeftFoot: 'mixamorig:LeftFoot',
  RightUpLeg: 'mixamorig:RightUpLeg',
  RightLeg: 'mixamorig:RightLeg',
  RightFoot: 'mixamorig:RightFoot',
});
const VANGUARD_BONE_MAP = Object.freeze({
  Hips: 'hips',
  Spine: 'spine',
  Spine01: 'spine',
  Spine02: 'chest',
  neck: 'neck',
  Head: 'head',
  LeftShoulder: 'shoulder.L',
  LeftArm: 'upper_arm.fk.L',
  LeftForeArm: 'forearm.fk.L',
  LeftHand: 'hand.fk.L',
  RightShoulder: 'shoulder.R',
  RightArm: 'upper_arm.fk.R',
  RightForeArm: 'forearm.fk.R',
  RightHand: 'hand.fk.R',
  LeftUpLeg: 'thigh.fk.L',
  LeftLeg: 'shin.fk.L',
  LeftFoot: 'foot.fk.L',
  RightUpLeg: 'thigh.fk.R',
  RightLeg: 'shin.fk.R',
  RightFoot: 'foot.fk.R',
});
const CHARACTER_ASSETS = Object.freeze({
  davin: {
    key: 'davin',
    label: 'Davin Wingsworth',
    asset: ASSETS.davin,
    source: '/storage/emulated/0/Download/Meshy_AI_Sky_Patrol_Hawk_biped.zip + /storage/emulated/0/Download/Meshy_AI_Sky_Patrol_Hawk_0716213205_texture.glb',
    role: 'merged rigged Kestrel Man manual pose-authoring model with full PBR material channels and Tail01/Tail02/Tail03 spring-bone-ready tail chain',
    boneMap: {},
    supportsSaber: false,
    supportsBakedPoseStates: false,
    supportsFistHands: false,
  },
  'crimson-bvh': {
    key: 'crimson-bvh',
    label: 'Vanguard → Crimson · ORG BVH Idle (experimental)',
    asset: ASSETS.crimsonBvhIdle,
    source: 'GitHub Actions run 30056653609 from a07dc8e anatomical-segment transfer; review GLB sha256 ecec8e92e1e7dbf8907cbaf6b23d34411dc790121415a8dfe24637aa4f744a2d',
    role: 'Experimental ORG-only BVH Idle transfer. Foot midpoint drift: 4.37 cm. Contact stabilization has not been applied.',
    boneMap: {},
    supportsSaber: false,
    supportsBakedPoseStates: false,
    supportsFistHands: false,
    supportsAnimationClips: true,
    autoPlayAnimation: true,
    defaultClip: 'CrimsonCanonicalIdle',
  },
  'crimson-sane': {
    key: 'crimson-sane',
    label: 'Crimson · Direct Guard Idle',
    asset: ASSETS.crimsonSaneGuard,
    saberAsset: ASSETS.arborblade,
    saberName: 'real-arborblade-sword',
    saberGripLocal: CRIMSON_SABER_GRIP_LOCAL,
    swordLocal: CRIMSON_SWORD_LOCAL,
    source: 'Directly authored on Crimson; no BVH or source-motion import',
    role: 'Quarantined direct-authored guarded idle with planted feet and rigid two-hand Arborblade targets.',
    boneMap: {},
    supportsSaber: true,
    supportsBakedPoseStates: false,
    supportsFistHands: false,
    supportsAnimationClips: true,
    autoPlayAnimation: true,
    defaultClip: 'CrimsonSaneGuardIdle',
  },
  crimson: {
    key: 'crimson',
    label: 'Crimson Knight',
    asset: ASSETS.crimson,
    saberAsset: ASSETS.arborblade,
    saberName: 'real-arborblade-sword',
    saberGripLocal: CRIMSON_SABER_GRIP_LOCAL,
    swordLocal: CRIMSON_SWORD_LOCAL,
    source: '/storage/emulated/0/Download/Meshy_AI_Crimson_Plume_Knight_biped.zip + /storage/emulated/0/Download/Meshy_AI_Crimson_Plume_Knight_0717211804_texture.glb + /storage/emulated/0/Download/Meshy_AI_Arborblade_0717211756_texture.glb',
    role: `Crimson Plume Knight rigged locomotion/PBR authoring model with real Arborblade sword calibration baseline; default quality=${CRIMSON_ASSET_QUALITY}, use quality=source for full imported GLBs`,
    boneMap: {},
    supportsSaber: true,
    supportsBakedPoseStates: false,
    supportsFistHands: false,
    supportsAnimationClips: true,
    autoPlayAnimation: false,
    supportsAttackReview: true,
    defaultClip: null,
  },
  meshy: {
    key: 'meshy',
    label: 'Meshy',
    asset: ASSETS.meshy,
    source: '../pose-lab/assets/models/meshy_character_sheet/animated/Meshy_AI_Meshy_Character_Sheet_biped_Animation_Walking_withSkin.glb',
    role: 'accepted Meshy saber-placement baseline',
    boneMap: {},
    supportsSaber: true,
    supportsBakedPoseStates: true,
    supportsFistHands: true,
    pbr: 'meshy-character-sheet',
  },
  ares: {
    key: 'ares',
    label: 'Ares',
    asset: ASSETS.ares,
    source: '../gravity-fist-threejs/assets/models/Ares.glb',
    role: 'imported rigged Ares diffuse authoring model',
    boneMap: MIXAMO_BONE_MAP,
    supportsSaber: false,
    supportsBakedPoseStates: false,
    supportsFistHands: false,
  },
  'security-titan': {
    key: 'security-titan',
    label: 'SecurityTitan',
    asset: ASSETS.securityTitan,
    source: '../gravity-fist-threejs/assets/models/SecurityTitan.glb',
    role: 'imported rigged SecurityTitan diffuse authoring model',
    boneMap: MIXAMO_BONE_MAP,
    supportsSaber: false,
    supportsBakedPoseStates: false,
    supportsFistHands: false,
  },
  vanguard: {
    key: 'vanguard',
    label: 'Vanguard',
    asset: ASSETS.vanguard,
    source: '/storage/emulated/0/Download/Vanguard.blend',
    role: 'imported Rigify-style Vanguard model with embedded sword, body mesh, and 20 source animation actions',
    boneMap: VANGUARD_BONE_MAP,
    supportsSaber: false,
    supportsBakedPoseStates: false,
    supportsFistHands: false,
    supportsAnimationClips: true,
    defaultClip: 'Idle',
  },
});
const CHARACTER_KEY_ALIASES = Object.freeze({
  default: 'davin',
  davin: 'davin',
  'davin-wingsworth': 'davin',
  wingsworth: 'davin',
  kestrel: 'davin',
  'kestrel-man': 'davin',
  hawk: 'davin',
  crimson: 'crimson',
  'crimson-bvh': 'crimson-bvh',
  'org-bvh-idle': 'crimson-bvh',
  'vanguard-crimson-idle': 'crimson-bvh',
  'crimson-sane': 'crimson-sane',
  'crimson-guard': 'crimson-sane',
  'crimson-knight': 'crimson',
  'crimson-plume': 'crimson',
  arborblade: 'crimson',
  meshy: 'meshy',
  ares: 'ares',
  aresDiffuse: 'ares',
  'ares-diffuse': 'ares',
  security: 'security-titan',
  titan: 'security-titan',
  securityTitan: 'security-titan',
  'security-titan': 'security-titan',
  vanguard: 'vanguard',
  Vanguard: 'vanguard',
  guard: 'vanguard',
});
const CHARACTER_KEYS = Object.freeze(Object.keys(CHARACTER_ASSETS));
const MESHY_PBR_TEXTURES = {
  map: './assets/meshy/character_sheet_pbr/base_color.jpg',
  emissiveMap: './assets/meshy/character_sheet_pbr/emissive.jpg',
  metallicRoughnessMap: './assets/meshy/character_sheet_pbr/metallic_roughness.jpg',
  normalMap: './assets/meshy/character_sheet_pbr/normal.png',
};
const REQUESTED_CHARACTER_KEY = CHARACTER_KEY_ALIASES[URL_PARAMS.get('model')]
  || CHARACTER_KEY_ALIASES[URL_PARAMS.get('character')]
  || 'davin';
const ACTIVE_CHARACTER = CHARACTER_ASSETS[REQUESTED_CHARACTER_KEY] || CHARACTER_ASSETS.meshy;
const IS_CRIMSON_BVH_REVIEW = ACTIVE_CHARACTER.key === 'crimson-bvh';

function modelButtonHtml(key) {
  const character = CHARACTER_ASSETS[key];
  const active = key === ACTIVE_CHARACTER.key ? ' class="active"' : '';
  return `<button type="button" data-model-key="${key}"${active}>${character.label}</button>`;
}
const IS_MESHY_CHARACTER = ACTIVE_CHARACTER.key === 'meshy';
const DEBUG_TOUCH = URL_PARAMS.get('debugTouch') === '1';
const DEBUG_READY = URL_PARAMS.get('debugReady') === '1';
const DEBUG_READY_DELTA = URL_PARAMS.get('debugReadyDelta') === '1';
const TIP_BASIS_REVIEW = URL_PARAMS.get('tipBasis') === '1';
const WORLD_SOCKET_REVIEW = URL_PARAMS.get('worldSocket') === '1';
const DEBUG_BONES = URL_PARAMS.get('debugBones') === '1';
const DEBUG_LANDMARKS = URL_PARAMS.get('debugLandmarks') === '1';
const REVIEW_CONTROLS_OPEN = URL_PARAMS.get('reviewControls') === '1';
const POSE_STATE_ORDER = ['rest', 'ready', 'fistReady', 'sharedRest', 'attack1'];
const IMPORTED_POSE_STATE_ORDER = ['rest'];
function activePoseStateOrder() {
  if (ACTIVE_CHARACTER.supportsBakedPoseStates) return POSE_STATE_ORDER;
  if (REQUESTED_ATTACK_QUARANTINED && REQUESTED_CANDIDATE && ACTIVE_CHARACTER.supportsAttackReview !== false) return ['rest', 'attack1'];
  if (REQUESTED_IDLE_REVIEW) return ['rest', 'idle'];
  return REQUESTED_LOWBACKKICK_REVIEW ? ['rest', 'lowBackKick'] : IMPORTED_POSE_STATE_ORDER;
}
const POSE_STATE_LABELS = {
  rest: 'Rest',
  ready: 'Ready',
  fistReady: 'FistReady',
  attack1: 'Attack1',
  sharedRest: 'SharedRest',
  lowBackKick: 'LowBackKick',
  idle: 'Idle',
  custom: 'Custom',
};
const REQUESTED_POSE = URL_PARAMS.get('pose');
const REQUESTED_SHARED_REST = ACTIVE_CHARACTER.key === 'crimson'
  && ['shared-rest', 'sharedrest', 'vanguard-rest', 'sword-rest'].includes(String(REQUESTED_POSE || '').toLowerCase());
const REQUESTED_IMPORTED_CLIP = URL_PARAMS.get('clip') || URL_PARAMS.get('animation') || URL_PARAMS.get('anim') || null;
const REQUESTED_LOWBACKKICK_REVIEW = ACTIVE_CHARACTER.key === 'davin'
  && ['lowbackkick', 'low-back-kick', 'low_back_kick'].includes(String(REQUESTED_POSE || '').toLowerCase());
const REQUESTED_IDLE_REVIEW = ACTIVE_CHARACTER.key === 'davin'
  && ['idle', 'screenshot-idle', 'idle-screenshot'].includes(String(REQUESTED_POSE || '').toLowerCase());
const LOWBACKKICK_DEFAULT_CANDIDATE = 'davin-lowbackkick-ares-transfer-1';
const IDLE_DEFAULT_CANDIDATE = 'davin-idle-screenshot-1';
const SHARED_REST_DEFAULT_CANDIDATE = 'crimson-light-attack1-vanguard-3';
const REQUESTED_CANDIDATE = URL_PARAMS.get('candidate') || (REQUESTED_SHARED_REST ? SHARED_REST_DEFAULT_CANDIDATE : REQUESTED_LOWBACKKICK_REVIEW ? LOWBACKKICK_DEFAULT_CANDIDATE : REQUESTED_IDLE_REVIEW ? IDLE_DEFAULT_CANDIDATE : null);
const REQUESTED_ATTACK_TIME = URL_PARAMS.get('attackTime');
const REQUESTED_MANUAL_ATTACK = URL_PARAMS.get('manual') === '1' || URL_PARAMS.get('edit') === 'manual';
const REQUESTED_ATTACK_QUARANTINED = ['attack1', 'attack', 'onehandattack1'].includes(String(REQUESTED_POSE || '').toLowerCase());
const REQUESTED_ATTACK2_QUARANTINED = ['attack2', 'onehandattack2'].includes(String(REQUESTED_POSE || '').toLowerCase());
const REQUESTED_ATTACK_LABEL = REQUESTED_IDLE_REVIEW ? 'Idle' : REQUESTED_LOWBACKKICK_REVIEW ? 'LowBackKick' : REQUESTED_ATTACK2_QUARANTINED ? 'Attack2' : 'Attack1';
const FIST_VISUAL_REVIEW = URL_PARAMS.get('fistHands') === '1'
  || String(REQUESTED_CANDIDATE || '').startsWith('fist-')
  || ['fist', 'fistready', 'fist-ready'].includes(String(REQUESTED_POSE || '').toLowerCase());
const MANUAL_ATTACK_KEYS = Object.freeze({
  start: 0,
  anticipation: 0.25,
  contact: 0.458333,
  followThrough: 0.75,
  recoil: 1,
  end: 1.25,
});
const MANUAL_ATTACK_DURATION = 1.25;

function poseStatus(name) {
  return POSE_STATUS[name] || { status: 'missing' };
}

function poseIsAccepted(name) {
  return poseStatus(name).status === 'accepted';
}

function useManualAttackAuthoring() {
  return ACTIVE_CHARACTER.supportsBakedPoseStates && !REQUESTED_ATTACK2_QUARANTINED && (REQUESTED_MANUAL_ATTACK || !REQUESTED_CANDIDATE);
}

function canExposeAttackReview() {
  if (REQUESTED_SHARED_REST) return false;
  if (ACTIVE_CHARACTER.supportsAttackReview === false) return false;
  return ACTIVE_CHARACTER.supportsBakedPoseStates || Boolean(REQUESTED_CANDIDATE);
}

const app = document.querySelector('#app');
app.innerHTML = `
  <section class="surface">
    <div class="boot-panel" data-boot-panel>
      <strong>Pose Lab V2</strong>
      <span data-boot-phase>booting module</span>
    </div>
    <div class="viewport">
      <canvas aria-label="${ACTIVE_CHARACTER.label} pose viewport"></canvas>
      <div class="primary-rail" aria-label="Primary review controls">
        <button type="button" data-cycle-character>Model: ${ACTIVE_CHARACTER.label}</button>
        <button type="button" data-cycle-tool>Tool: Saber</button>
        <button type="button" data-cycle-pose-state>Pose: Rest</button>
        <button type="button" data-cycle-animation hidden>Anim: None</button>
        <button type="button" data-cycle-view-mode>View: Orbit</button>
        <button type="button" class="fpv-settings-button" data-fpv-settings-toggle aria-label="FPV camera settings" title="FPV camera settings">⚙</button>
        <button type="button" data-attack-review-toggle ${canExposeAttackReview() ? '' : 'hidden'} aria-label="Attack playback controls">Attack</button>
        <button type="button" data-dock-toggle>Tools</button>
        <span class="status" data-status>loading ${ACTIVE_CHARACTER.label}</span>
      </div>
      <div class="attack-review" data-attack-review hidden aria-label="Attack candidate review controls">
        <div class="attack-review-row">
          <button type="button" data-attack-play>Play</button>
          <button type="button" data-attack-pause>Pause</button>
          <output data-attack-time>0.000s</output>
          <button type="button" data-attack-save-key>Save Key</button>
          <button type="button" data-attack-export>Export Clip</button>
          <button type="button" class="attack-review-close" data-attack-review-close aria-label="Close attack playback controls">Close</button>
        </div>
        <input type="range" min="0" max="1.25" step="0.041667" value="0" data-attack-scrub aria-label="Attack time scrubber" />
        <div class="attack-primes" data-attack-primes aria-label="Attack prime keys"></div>
      </div>
      <div class="tip-match-overlay" data-tip-match-overlay hidden aria-label="Tip match review overlay">
        <span class="tip-dot tip-dot-target" data-tip-target></span>
        <span class="tip-dot tip-dot-actual" data-tip-actual></span>
        <span class="tip-dot tip-dot-hilt" data-tip-hilt></span>
        <output data-tip-match-readout></output>
      </div>
      <div class="fpv-settings" data-fpv-settings hidden aria-label="FPV camera nudge controls">
        <div class="fpv-nudge-grid" aria-label="FPV camera position">
          <button type="button" data-fpv-nudge="forward" aria-label="Move FPV camera forward">↑</button>
          <button type="button" data-fpv-nudge="up" aria-label="Move FPV camera up">⇧</button>
          <button type="button" data-fpv-nudge="back" aria-label="Move FPV camera back">↓</button>
          <button type="button" data-fpv-nudge="down" aria-label="Move FPV camera down">⇩</button>
        </div>
        <label class="fpv-slider">
          <span>FOV <output data-fpv-fov-output>112</output></span>
          <input type="range" min="70" max="125" step="1" value="112" data-fpv-fov aria-label="FPV field of view" />
        </label>
        <div class="fpv-settings-actions">
          <button type="button" data-fpv-reset>Reset</button>
          <button type="button" data-fpv-copy>Copy</button>
        </div>
        <pre data-fpv-settings-readout aria-label="FPV camera constants"></pre>
      </div>
    </div>
    <div class="control-dock" aria-label="Secondary editor controls" hidden>
      <div class="panel-tabs" aria-label="Control panels">
        <button type="button" data-panel-toggle="model">Model</button>
        <button type="button" data-panel-toggle="transform">Transform</button>
        <button type="button" data-panel-toggle="view">View</button>
        <button type="button" data-panel-toggle="export">Export</button>
        <button type="button" data-panel-toggle="debug" ${DEBUG_TOUCH || DEBUG_READY ? '' : 'hidden'}>Debug</button>
      </div>
      <section class="control-panel" data-panel="model" aria-label="Model controls" hidden>
        <div class="panel-row model-switcher" aria-label="Model switcher">
          ${CHARACTER_KEYS.map(modelButtonHtml).join('')}
        </div>
      </section>
      <section class="control-panel" data-panel="transform" aria-label="Transform controls" hidden>
        <div class="panel-row hidden-actions" aria-hidden="true">
          <button type="button" data-tool="saber" class="active" tabindex="-1" ${ACTIVE_CHARACTER.supportsSaber ? '' : 'hidden'}>Saber</button>
          <button type="button" data-tool="pose" tabindex="-1">Pose</button>
          <button type="button" data-pose-state="rest" class="active" tabindex="-1">Rest</button>
          <button type="button" data-pose-state="ready" tabindex="-1">Ready</button>
          <button type="button" data-pose-state="fistReady" tabindex="-1">FistReady</button>
          <button type="button" data-pose-state="attack1" tabindex="-1">Attack1</button>
          <button type="button" data-pose-state="lowBackKick" tabindex="-1">LowBackKick</button>
          <button type="button" data-pose-state="idle" tabindex="-1">Idle</button>
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
const bootPanel = app.querySelector('[data-boot-panel]');
const bootPhaseEl = app.querySelector('[data-boot-phase]');
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
const cycleCharacterButton = app.querySelector('[data-cycle-character]');
const modelButtons = Array.from(app.querySelectorAll('[data-model-key]'));
const dockToggleButton = app.querySelector('[data-dock-toggle]');
const cycleToolButton = app.querySelector('[data-cycle-tool]');
const cyclePoseStateButton = app.querySelector('[data-cycle-pose-state]');
const cycleAnimationButton = app.querySelector('[data-cycle-animation]');
const cycleViewModeButton = app.querySelector('[data-cycle-view-mode]');
const fpvSettingsToggle = app.querySelector('[data-fpv-settings-toggle]');
const fpvSettingsPanel = app.querySelector('[data-fpv-settings]');
const fpvSettingsReadout = app.querySelector('[data-fpv-settings-readout]');
const fpvNudgeButtons = [...app.querySelectorAll('[data-fpv-nudge]')];
const fpvResetButton = app.querySelector('[data-fpv-reset]');
const fpvCopyButton = app.querySelector('[data-fpv-copy]');
const fpvFovInput = app.querySelector('[data-fpv-fov]');
const fpvFovOutput = app.querySelector('[data-fpv-fov-output]');
const attackReviewPanel = app.querySelector('[data-attack-review]');
const attackReviewToggle = app.querySelector('[data-attack-review-toggle]');
const attackReviewClose = app.querySelector('[data-attack-review-close]');
const attackPlayButton = app.querySelector('[data-attack-play]');
const attackPauseButton = app.querySelector('[data-attack-pause]');
const attackSaveKeyButton = app.querySelector('[data-attack-save-key]');
const attackExportButton = app.querySelector('[data-attack-export]');
const attackScrubInput = app.querySelector('[data-attack-scrub]');
const attackTimeOutput = app.querySelector('[data-attack-time]');
const attackPrimesEl = app.querySelector('[data-attack-primes]');
const tipMatchOverlay = app.querySelector('[data-tip-match-overlay]');
const tipTargetDot = app.querySelector('[data-tip-target]');
const tipActualDot = app.querySelector('[data-tip-actual]');
const tipHiltDot = app.querySelector('[data-tip-hilt]');
const tipMatchReadout = app.querySelector('[data-tip-match-readout]');

let toolMode = 'saber';
let viewMode = 'orbit';
let dockOpen = ACTIVE_CHARACTER.key === 'crimson';
let activePanel = ACTIVE_CHARACTER.key === 'crimson' ? 'model' : null;
let fpvSettingsOpen = false;
let fpvNudgeState = null;
let fpvNudgeHoldTimer = null;
let fpvNudgeRaf = null;
let attackReviewOpen = Boolean(canExposeAttackReview() && (REQUESTED_MANUAL_ATTACK || REVIEW_CONTROLS_OPEN));
const fpvBodyMasks = [];
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
const saberAttachmentProof = {
  status: 'not-run',
  parentBone: null,
  hiltToHandDistance: null,
  swordWorldScale: null,
  bladeWorldLength: null,
  bladeWorldDirection: null,
  hiltScreen: null,
  tipScreen: null,
  screenLengthPx: null,
  screenBounds: null,
  visibleInViewport: false,
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
  if (event.pointerType !== 'touch' || toolMode !== 'pose' || !suppressTouchPointerEvents) return;
  updateTouchProof({ orbitBlocked: true, lastTouchAction: 'blocked-duplicate-touch-pointer' });
  event.preventDefault();
  event.stopPropagation();
}

canvas.addEventListener('pointerdown', blockPoseTouchPointer, { capture: true });
canvas.addEventListener('pointermove', blockPoseTouchPointer, { capture: true });
canvas.addEventListener('pointerup', blockPoseTouchPointer, { capture: true });
canvas.addEventListener('pointercancel', blockPoseTouchPointer, { capture: true });

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
canvas.addEventListener('webglcontextlost', () => {
  document.body.dataset.webglContextLost = '1';
});
canvas.addEventListener('webglcontextrestored', () => {
  document.body.dataset.webglContextRestored = '1';
});
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
  headForwardOffset: 0.15,
  headCameraYOffset: -0.07,
  lookForward: 1.35,
  lookVertical: 0,
  fov: 112,
  near: 0.055,
};
const FPV_CAMERA_DEFAULTS = Object.freeze({
  headForwardOffset: firstPersonCameraConfig.headForwardOffset,
  headCameraYOffset: firstPersonCameraConfig.headCameraYOffset,
  lookForward: firstPersonCameraConfig.lookForward,
  lookVertical: firstPersonCameraConfig.lookVertical,
  fov: firstPersonCameraConfig.fov,
  near: firstPersonCameraConfig.near,
});
const FPV_NUDGE_STEP = 0.01;
const FPV_NUDGE_HOLD_DELAY_MS = 220;
const FPV_NUDGE_HOLD_SPEED = 0.12;
const FPV_VISIBLE_BONES = new Set([
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'LeftHand',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
  'RightHand',
]);
const FPV_VISIBLE_BONES_FIST_REPLACEMENT = new Set([
  'LeftShoulder',
  'LeftArm',
  'LeftForeArm',
  'RightShoulder',
  'RightArm',
  'RightForeArm',
]);

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
const textureLoader = new THREE.TextureLoader();
const root = new THREE.Group();
scene.add(root);
let firstFrameRendered = false;
let meshyPbrTextures = null;
let fpvBodyMasksReady = false;
const bootTimings = {};
const bootStartedAt = performance.now();

function markBootTiming(name) {
  if (bootTimings[name] !== undefined) return;
  bootTimings[name] = fixedNumber(performance.now() - bootStartedAt, 1);
  document.body.dataset[`bootTiming${name[0].toUpperCase()}${name.slice(1)}`] = String(bootTimings[name]);
  document.body.dataset.bootTimings = JSON.stringify(bootTimings);
}

function updateReviewReady() {
  if (document.body.dataset.reviewReady === '1' || document.body.dataset.bootFailed === '1') return;
  const saberOk = !ACTIVE_CHARACTER.supportsSaber || (saberAttachmentProof.status === 'attached' && saberAttachmentProof.visibleInViewport === true);
  const candidateOk = !REQUESTED_CANDIDATE || Boolean(attackPoseSequence);
  const poseOk = !REQUESTED_ATTACK_QUARANTINED || poseState === 'attack1';
  if (firstFrameRendered && document.body.dataset.bootReady === '1' && saberOk && candidateOk && poseOk) {
    markBootTiming('reviewReady');
    document.body.dataset.reviewReady = '1';
    document.body.dataset.reviewAssetQuality = CRIMSON_ASSET_QUALITY;
    document.body.dataset.reviewPoseState = poseState;
  }
}

function setBootPhase(message) {
  document.body.dataset.bootState = message;
  if (bootPhaseEl) bootPhaseEl.textContent = message;
  if (statusEl) statusEl.textContent = message;
}

function markBootReady() {
  markBootTiming('bootReady');
  document.body.dataset.bootReady = '1';
  bootPanel.hidden = true;
}

function markBootFailed(label, error) {
  const detail = error instanceof Error ? error.message : String(error || '');
  document.body.dataset.bootFailed = '1';
  if (bootPanel) bootPanel.hidden = false;
  if (bootPhaseEl) bootPhaseEl.textContent = `${label}: ${detail}`;
  if (statusEl) statusEl.textContent = `${label}: ${detail}`;
}

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
const FPV_POSE_HANDLE_NAMES = new Set(POSE_BONE_NAMES);
const FIST_CONTROL_BONE_NAMES = [
  'RightFistMitten01',
  'RightFistMitten02',
  'RightFistMitten03',
  'RightFistThumb01',
  'RightFistThumb02',
  'LeftFistMitten01',
  'LeftFistMitten02',
  'LeftFistMitten03',
  'LeftFistThumb01',
  'LeftFistThumb02',
];
const FIST_HAND_CONTROL_CONFIGS = [
  {
    objectName: 'RightMeshyFistHand',
    boneName: 'RightHand',
    center: [0.8, 0.85, -11.52],
    controls: [
      { name: 'RightFistMitten01', parent: 'RightHand', position: [0.8, 0.85, -11.52] },
      { name: 'RightFistMitten02', parent: 'RightFistMitten01', position: [0, 1.65, -1.15] },
      { name: 'RightFistMitten03', parent: 'RightFistMitten02', position: [0, 1.35, -1.05] },
      { name: 'RightFistThumb01', parent: 'RightFistMitten01', position: [3.1, -0.65, 0.5] },
      { name: 'RightFistThumb02', parent: 'RightFistThumb01', position: [1.35, -0.45, -0.65] },
    ],
  },
  {
    objectName: 'LeftMeshyFistHand',
    boneName: 'LeftHand',
    center: [-0.8, 0.85, -11.52],
    controls: [
      { name: 'LeftFistMitten01', parent: 'LeftHand', position: [-0.8, 0.85, -11.52] },
      { name: 'LeftFistMitten02', parent: 'LeftFistMitten01', position: [0, 1.65, -1.15] },
      { name: 'LeftFistMitten03', parent: 'LeftFistMitten02', position: [0, 1.35, -1.05] },
      { name: 'LeftFistThumb01', parent: 'LeftFistMitten01', position: [-3.1, -0.65, 0.5] },
      { name: 'LeftFistThumb02', parent: 'LeftFistThumb01', position: [-1.35, -0.45, -0.65] },
    ],
  },
];
const POSE_HANDLE_PICK_RADIUS_PX = 58;
const POSE_HANDLE_POSITION_FLOATS = 8 * 3 * 3;
const poseHandleMaterial = new THREE.MeshBasicMaterial({
  color: 0x68d8ff,
  depthTest: false,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.42,
});
const readyDeltaGeometry = new THREE.SphereGeometry(0.045, 12, 8);
const readyRestMaterial = new THREE.MeshBasicMaterial({ color: 0x8b949e, depthTest: false, transparent: true, opacity: 0.72 });
const readyReadyMaterial = new THREE.MeshBasicMaterial({ color: 0x58ff90, depthTest: false, transparent: true, opacity: 0.92 });
const readyLineMaterial = new THREE.LineBasicMaterial({ color: 0x58ff90, depthTest: false, transparent: true, opacity: 0.85 });
const readyRestAxisMaterial = new THREE.LineBasicMaterial({ color: 0x8b949e, depthTest: false, transparent: true, opacity: 0.82 });
const readyReadyAxisMaterial = new THREE.LineBasicMaterial({ color: 0x58ff90, depthTest: false, transparent: true, opacity: 0.96 });
const readySabreAxisMaterial = new THREE.LineBasicMaterial({ color: 0xffd45c, depthTest: false, transparent: true, opacity: 0.96 });
const HAND_AXIS_PROOF_LENGTH = 0.22;
const SABRE_AXIS_PROOF_LENGTH = 0.62;
let poseState = 'rest';
let mode = 'move';
let currentAxis = 'screen';
let meshyRoot = null;
let sabreRoot = null;
let saberGrip = null;
let fistHandsRoot = null;
const fistHandVisuals = [];
const fistHandControlBones = new Map();
let readyPosePreset = null;
let fistReadyPosePreset = null;
let attackPoseSequence = null;
let attackPoseStartedAt = null;
let attackPoseFixedTime = null;
let attackPoseCurrentTime = 0;
let importedAnimationMixer = null;
let importedAnimationClips = [];
let importedAnimationAction = null;
let activeImportedAnimationClip = null;
let importedRootMotionBone = null;
let importedRootMotionRestPosition = null;
const importedAnimationClock = new THREE.Clock();
let manualAttackDraft = null;
let manualAttackSelectedKey = 'start';
let manualAttackDirty = false;
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

function activeSaberGripLocal() {
  return ACTIVE_CHARACTER.saberGripLocal || SABER_GRIP_LOCAL;
}

function activeSwordLocal() {
  return ACTIVE_CHARACTER.swordLocal || { position: [0, 0, 0], rotationDeg: [0, 0, 0], scale: [1, 1, 1] };
}

function activeSaberTipLocalPoint() {
  return ACTIVE_CHARACTER.key.startsWith('crimson') ? [0, 0, 0.618789] : null;
}

function activeSaberHiltLocalPoint() {
  return ACTIVE_CHARACTER.key.startsWith('crimson') ? [0, 0, 0] : null;
}

function activeSaberAsset() {
  return ACTIVE_CHARACTER.saberAsset || ASSETS.sabre;
}

function dominantSkinBoneName(skinnedMesh, vertexIndex) {
  const skinIndex = skinnedMesh.geometry?.attributes?.skinIndex;
  const skinWeight = skinnedMesh.geometry?.attributes?.skinWeight;
  if (!skinIndex || !skinWeight) return null;
  let bestBoneIndex = -1;
  let bestWeight = -1;
  for (let slot = 0; slot < 4; slot += 1) {
    const weight = skinWeight.getComponent(vertexIndex, slot);
    if (weight > bestWeight) {
      bestWeight = weight;
      bestBoneIndex = skinIndex.getComponent(vertexIndex, slot);
    }
  }
  return skinnedMesh.skeleton?.bones?.[bestBoneIndex]?.name || null;
}

function createFpvArmMask(skinnedMesh) {
  if (!skinnedMesh.isSkinnedMesh || !skinnedMesh.geometry?.attributes?.position || !skinnedMesh.skeleton) return null;
  const sourceGeometry = skinnedMesh.geometry;
  const positionCount = sourceGeometry.attributes.position.count;
  const sourceIndex = sourceGeometry.index?.array || null;
  const isVisibleVertex = new Array(positionCount);
  for (let index = 0; index < positionCount; index += 1) {
    const visibleBones = FIST_VISUAL_REVIEW ? FPV_VISIBLE_BONES_FIST_REPLACEMENT : FPV_VISIBLE_BONES;
    isVisibleVertex[index] = visibleBones.has(dominantSkinBoneName(skinnedMesh, index));
  }
  const keptIndices = [];
  const sourceLength = sourceIndex ? sourceIndex.length : positionCount;
  for (let i = 0; i < sourceLength; i += 3) {
    const a = sourceIndex ? sourceIndex[i] : i;
    const b = sourceIndex ? sourceIndex[i + 1] : i + 1;
    const c = sourceIndex ? sourceIndex[i + 2] : i + 2;
    if (isVisibleVertex[a] && isVisibleVertex[b] && isVisibleVertex[c]) keptIndices.push(a, b, c);
  }
  if (!keptIndices.length) return null;
  const geometry = sourceGeometry.clone();
  geometry.clearGroups();
  geometry.setIndex(new THREE.Uint32BufferAttribute(keptIndices, 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = Array.isArray(skinnedMesh.material)
    ? skinnedMesh.material[0].clone()
    : skinnedMesh.material.clone();
  material.name = `${material.name || skinnedMesh.name}-fpv-arms`;
  material.depthWrite = true;
  const mask = new THREE.SkinnedMesh(geometry, material);
  mask.name = `${skinnedMesh.name || 'Meshy'}-FPV-arms`;
  mask.frustumCulled = false;
  mask.castShadow = false;
  mask.receiveShadow = true;
  mask.bind(skinnedMesh.skeleton, skinnedMesh.bindMatrix);
  mask.bindMatrixInverse.copy(skinnedMesh.bindMatrixInverse);
  mask.visible = false;
  return mask;
}

function updateFpvBodyMasks() {
  const fpv = viewMode === 'firstPerson';
  for (const entry of fpvBodyMasks) {
    entry.source.visible = !fpv;
    entry.mask.visible = fpv;
  }
  for (const visual of fistHandVisuals) {
    visual.visible = FIST_VISUAL_REVIEW;
  }
}

function applyMeshyPbrToMaterial(material, textures) {
  if (!material || !textures) return;
  material.map = textures.map;
  material.emissiveMap = textures.emissiveMap;
  material.metalnessMap = textures.metallicRoughnessMap;
  material.normalMap = textures.normalMap;
  material.roughnessMap = textures.metallicRoughnessMap;
  if (material.emissive?.set) material.emissive.set(0xffffff);
  material.metalness = 1;
  material.roughness = 1;
  material.needsUpdate = true;
}

function applyMeshyPbrToFpvMasks() {
  if (!meshyPbrTextures) return;
  for (const entry of fpvBodyMasks) {
    const materials = Array.isArray(entry.mask.material) ? entry.mask.material : [entry.mask.material];
    for (const material of materials) applyMeshyPbrToMaterial(material, meshyPbrTextures);
  }
}

function vanguardPaletteColor(position, bounds) {
  const height = (position.y - bounds.min.y) / Math.max(0.0001, bounds.max.y - bounds.min.y);
  const width = Math.abs(position.x) / Math.max(0.0001, Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)));
  const depth = (position.z - bounds.min.z) / Math.max(0.0001, bounds.max.z - bounds.min.z);
  const lightBluePlate = new THREE.Color(0x75c9ff);
  const darkGreenUnderarmor = new THREE.Color(0x123f2f);
  const redFeather = new THREE.Color(0xc92f2f);
  const cyanEyehole = new THREE.Color(0x36fff3);
  const shadowBlue = new THREE.Color(0x3e8fc4);

  if (height > 0.72 && depth > 0.72 && width > 0.08 && width < 0.34) return cyanEyehole;
  if (height > 0.82 && (depth < 0.55 || width > 0.32)) return redFeather;
  if ((height < 0.36 && width < 0.34) || (height > 0.34 && height < 0.68 && width < 0.18) || (height > 0.43 && width > 0.58)) return darkGreenUnderarmor;
  if (depth < 0.18 && height < 0.72) return shadowBlue;
  return lightBluePlate;
}

function applyVanguardBodyPalette(mesh) {
  const position = mesh.geometry?.attributes?.position;
  if (!position) return;
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox;
  const colors = new Float32Array(position.count * 3);
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const color = vanguardPaletteColor(vertex, bounds);
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  mesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.material = new THREE.MeshStandardMaterial({
    name: 'VanguardRecoveredPalette',
    vertexColors: true,
    roughness: 0.62,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
}

function applyVanguardMaterialRecovery(object) {
  if (ACTIVE_CHARACTER.key !== 'vanguard') return;
  object.traverse((node) => {
    if (!node.isMesh) return;
    if (node.name === 'Body' || node.material?.name === 'VanguardBody') {
      applyVanguardBodyPalette(node);
      return;
    }
    if (node.name === 'Long_Sword' || node.material?.name === 'LowPolyProps') {
      node.material = new THREE.MeshStandardMaterial({
        name: 'VanguardRecoveredSteel',
        color: 0xb8b1a2,
        roughness: 0.38,
        metalness: 0.52,
        side: THREE.DoubleSide,
      });
    }
  });
}

function applyCrimsonSwordReviewMaterial(object) {
  if (ACTIVE_CHARACTER.key !== 'crimson') return;
  object.traverse((node) => {
    if (!node.isMesh) return;
    node.material = new THREE.MeshStandardMaterial({
      name: 'CrimsonArborbladeVisibleSteel',
      color: 0xc8d6df,
      emissive: 0x182a30,
      roughness: 0.34,
      metalness: 0.78,
      side: THREE.DoubleSide,
    });
    node.renderOrder = 3;
  });
}

function ensureFpvBodyMasks() {
  if (fpvBodyMasksReady || !meshyRoot) return;
  fpvBodyMasksReady = true;
  const armMasks = [];
  meshyRoot.traverse((node) => {
    if (!node.isSkinnedMesh) return;
    const mask = createFpvArmMask(node);
    if (mask) armMasks.push({ source: node, mask });
  });
  for (const entry of armMasks) {
    entry.source.parent?.add(entry.mask);
    fpvBodyMasks.push(entry);
  }
  applyMeshyPbrToFpvMasks();
  updateFpvBodyMasks();
}

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
  object.name = ACTIVE_CHARACTER.saberName || 'real-meshy-sabre';
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
  applyCrimsonSwordReviewMaterial(object);
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

function activeBoneName(logicalName) {
  return ACTIVE_CHARACTER.boneMap?.[logicalName] || logicalName;
}

function findPoseBone(logicalName) {
  return findBone(meshyRoot, activeBoneName(logicalName)) || findBone(meshyRoot, logicalName);
}

function findRequiredPoseBone(logicalName) {
  const bone = findPoseBone(logicalName);
  if (!bone) throw new Error(`missing ${ACTIVE_CHARACTER.label} bone: ${activeBoneName(logicalName)}`);
  return bone;
}

function poseBoneLabel(bone, logicalName = null) {
  return logicalName && bone?.name !== logicalName ? `${logicalName} (${bone.name})` : bone?.name || logicalName || 'none';
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

function worldBoundsForObject(object) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();
  object.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    const geometryBox = node.geometry.boundingBox;
    for (const x of [geometryBox.min.x, geometryBox.max.x]) {
      for (const y of [geometryBox.min.y, geometryBox.max.y]) {
        for (const z of [geometryBox.min.z, geometryBox.max.z]) {
          corner.set(x, y, z).applyMatrix4(node.matrixWorld);
          box.expandByPoint(corner);
        }
      }
    }
  });
  return box;
}

function screenBoundsForWorldBox(box) {
  const rect = canvas.getBoundingClientRect();
  if (box.isEmpty()) return null;
  const min = new THREE.Vector2(Infinity, Infinity);
  const max = new THREE.Vector2(-Infinity, -Infinity);
  const point = new THREE.Vector3();
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        point.set(x, y, z);
        const screen = worldToScreenPixels(point);
        min.x = Math.min(min.x, screen.x);
        min.y = Math.min(min.y, screen.y);
        max.x = Math.max(max.x, screen.x);
        max.y = Math.max(max.y, screen.y);
      }
    }
  }
  return {
    min: [fixedNumber(min.x, 1), fixedNumber(min.y, 1)],
    max: [fixedNumber(max.x, 1), fixedNumber(max.y, 1)],
    size: [fixedNumber(max.x - min.x, 1), fixedNumber(max.y - min.y, 1)],
    intersectsViewport: max.x >= 0 && max.y >= 0 && min.x <= rect.width && min.y <= rect.height,
  };
}

function updateSaberAttachmentProof() {
  if (!ACTIVE_CHARACTER.supportsSaber || !saberGrip || !sabreRoot) return;
  root.updateMatrixWorld(true);
  const hand = findPoseBone('RightHand');
  const hiltLocal = activeSaberHiltLocalPoint();
  const hilt = Array.isArray(hiltLocal)
    ? sabreRoot.localToWorld(new THREE.Vector3(...hiltLocal))
    : objectWorldPosition(sabreRoot);
  const handPosition = hand ? objectWorldPosition(hand) : null;
  const swordScale = objectWorldScale(sabreRoot);
  const tipLocal = activeSaberTipLocalPoint();
  const tip = Array.isArray(tipLocal)
    ? sabreRoot.localToWorld(new THREE.Vector3(...tipLocal))
    : orientationProbe(objectWorldPosition(sabreRoot), objectWorldQuaternion(sabreRoot), sabreBladeLocalAxis(), SABRE_AXIS_PROOF_LENGTH).end;
  const bladeVector = tip.clone().sub(hilt);
  const hiltScreen = worldToScreenPixels(hilt);
  const tipScreen = worldToScreenPixels(tip);
  const screenBounds = screenBoundsForWorldBox(worldBoundsForObject(sabreRoot));
  const screenLengthPx = hiltScreen.distanceTo(tipScreen);
  saberAttachmentProof.status = hand && saberGrip.parent === hand ? 'attached' : 'detached';
  saberAttachmentProof.parentBone = saberGrip.parent?.name || null;
  saberAttachmentProof.hiltToHandDistance = handPosition ? fixedNumber(hilt.distanceTo(handPosition), 5) : null;
  saberAttachmentProof.swordWorldScale = vectorToFixedArray(swordScale);
  saberAttachmentProof.bladeWorldLength = fixedNumber(bladeVector.length(), 5);
  saberAttachmentProof.bladeWorldDirection = vectorToFixedArray(bladeVector.normalize());
  saberAttachmentProof.hiltScreen = [fixedNumber(hiltScreen.x, 1), fixedNumber(hiltScreen.y, 1)];
  saberAttachmentProof.tipScreen = [fixedNumber(tipScreen.x, 1), fixedNumber(tipScreen.y, 1)];
  saberAttachmentProof.screenLengthPx = fixedNumber(screenLengthPx, 1);
  saberAttachmentProof.screenBounds = screenBounds;
  saberAttachmentProof.visibleInViewport = Boolean(screenBounds?.intersectsViewport && screenLengthPx >= 12);
  document.body.dataset.saberAttachmentStatus = saberAttachmentProof.status;
  document.body.dataset.saberAttachmentParent = saberAttachmentProof.parentBone || '';
  document.body.dataset.saberAttachmentDistance = String(saberAttachmentProof.hiltToHandDistance ?? '');
  document.body.dataset.saberWorldScale = JSON.stringify(saberAttachmentProof.swordWorldScale);
  document.body.dataset.saberBladeWorldLength = String(saberAttachmentProof.bladeWorldLength ?? '');
  document.body.dataset.saberScreenLengthPx = String(saberAttachmentProof.screenLengthPx ?? '');
  document.body.dataset.saberVisibleInViewport = String(saberAttachmentProof.visibleInViewport);
  document.body.dataset.crimsonSocketProof = JSON.stringify(saberAttachmentProof);
}

function readySnapshot() {
  root.updateMatrixWorld(true);
  const rightHand = poseBones.get('RightHand');
  const handPosition = rightHand ? objectWorldPosition(rightHand) : new THREE.Vector3();
  const hiltPosition = saberGrip ? objectWorldPosition(saberGrip) : handPosition.clone();
  const sabrePosition = sabreRoot ? objectWorldPosition(sabreRoot) : hiltPosition.clone();
  const handQuaternion = rightHand ? objectWorldQuaternion(rightHand) : new THREE.Quaternion();
  const hiltQuaternion = saberGrip ? objectWorldQuaternion(saberGrip) : new THREE.Quaternion();
  const sabreQuaternion = sabreRoot ? objectWorldQuaternion(sabreRoot) : hiltQuaternion.clone();
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

function setSabreReviewVisible(visible) {
  if (!sabreRoot) return;
  const next = Boolean(visible);
  sabreRoot.visible = next;
  if (saberGrip) saberGrip.visible = next;
}

function editableTarget() {
  return toolMode === 'pose' ? selectedPoseBone : editableSaber();
}

function saberTransformClaimsEmptyGesture() {
  return toolMode === 'saber'
    && ACTIVE_CHARACTER.supportsSaber
    && Boolean(sabreRoot)
    && (selected || mode === 'rotate' || mode === 'scale');
}

function attachSaberToRightHand() {
  if (!meshyRoot || !sabreRoot) return;
  if (!ACTIVE_CHARACTER.supportsSaber) return;
  const rightHand = findRequiredPoseBone('RightHand');

  const grip = new THREE.Bone();
  grip.name = 'SaberGrip';
  const gripLocal = activeSaberGripLocal();
  grip.position.fromArray(gripLocal.position);
  grip.rotation.set(
    THREE.MathUtils.degToRad(gripLocal.rotationDeg[0]),
    THREE.MathUtils.degToRad(gripLocal.rotationDeg[1]),
    THREE.MathUtils.degToRad(gripLocal.rotationDeg[2])
  );
  grip.scale.fromArray(gripLocal.scale);

  rightHand.add(grip);
  const swordLocal = activeSwordLocal();
  sabreRoot.position.fromArray(swordLocal.position);
  sabreRoot.rotation.set(
    THREE.MathUtils.degToRad(swordLocal.rotationDeg[0]),
    THREE.MathUtils.degToRad(swordLocal.rotationDeg[1]),
    THREE.MathUtils.degToRad(swordLocal.rotationDeg[2])
  );
  sabreRoot.scale.fromArray(swordLocal.scale);
  grip.add(sabreRoot);
  saberGrip = grip;
  root.updateMatrixWorld(true);
  updateSaberAttachmentProof();
}

function resetSaberPlacement() {
  if (!sabreRoot) return;
  root.attach(sabreRoot);
  if (saberGrip?.parent) saberGrip.parent.remove(saberGrip);
  saberGrip = null;
  prepareSabre(sabreRoot);
  attachSaberToRightHand();
}

function ensureFistControlBones(config) {
  const hand = findPoseBone(config.boneName);
  if (!hand) return null;
  const controlsByName = new Map([[config.boneName, hand]]);
  for (const entry of config.controls) {
    const parent = controlsByName.get(entry.parent) || findPoseBone(entry.parent);
    if (!parent) continue;
    let bone = parent.children.find((child) => child.isBone && child.name === entry.name);
    if (!bone) {
      bone = new THREE.Bone();
      bone.name = entry.name;
      parent.add(bone);
    }
    bone.position.fromArray(entry.position);
    bone.quaternion.identity();
    bone.scale.set(1, 1, 1);
    bone.userData.poseLabV2FistControl = true;
    controlsByName.set(entry.name, bone);
    fistHandControlBones.set(entry.name, bone);
  }
  return controlsByName.get(config.controls[0]?.name) || null;
}

function attachFistHandsToMeshy(object) {
  if (!meshyRoot || !object) return;
  fistHandsRoot = object;
  object.name = 'meshy-derived-fist-hands';
  object.traverse((node) => {
    if (node.isMesh) {
      node.frustumCulled = false;
      node.castShadow = false;
      node.receiveShadow = true;
    }
  });
  fistHandVisuals.length = 0;
  fistHandControlBones.clear();
  for (const config of FIST_HAND_CONTROL_CONFIGS) {
    const visual = object.getObjectByName(config.objectName);
    const rootControl = ensureFistControlBones(config);
    if (!visual || !rootControl) continue;
    rootControl.add(visual);
    visual.position.set(-config.center[0], -config.center[1], -config.center[2]);
    visual.quaternion.identity();
    visual.scale.set(1, 1, 1);
    visual.userData.poseLabV2ParentBone = rootControl.name;
    fistHandVisuals.push(visual);
  }
  setupPoseHandles();
  updateFpvBodyMasks();
  document.body.dataset.fistHandsReady = fistHandVisuals.length ? '1' : '0';
  document.body.dataset.fistControlsReady = fistHandControlBones.size ? '1' : '0';
}

function activePoseHandleNames() {
  return FIST_VISUAL_REVIEW && ACTIVE_CHARACTER.supportsFistHands && fistHandControlBones.size
    ? [...POSE_BONE_NAMES, ...FIST_CONTROL_BONE_NAMES]
    : POSE_BONE_NAMES;
}

function fpvPoseHandleVisible(name) {
  return FPV_POSE_HANDLE_NAMES.has(name) || fistHandControlBones.has(name);
}

function setupPoseHandles() {
  if (!meshyRoot) return;
  for (const handle of poseHandles.values()) scene.remove(handle);
  poseBones.clear();
  poseHandles.clear();
  poseBoneRestQuaternions.clear();
  for (const name of activePoseHandleNames()) {
    const bone = findPoseBone(name);
    if (!bone) continue;
    poseBones.set(name, bone);
    bone.userData.poseLabV2LogicalName = name;
    poseBoneRestQuaternions.set(name, bone.quaternion.clone());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(POSE_HANDLE_POSITION_FLOATS), 3));
    const handle = new THREE.Mesh(geometry, poseHandleMaterial.clone());
    handle.name = `PoseHandle:${name}`;
    handle.userData.poseBoneName = name;
    handle.userData.head = new THREE.Vector3();
    handle.userData.tail = new THREE.Vector3();
    handle.renderOrder = 14;
    handle.frustumCulled = false;
    handle.visible = false;
    scene.add(handle);
    poseHandles.set(name, handle);
  }
  updatePoseHandles();
}

function firstPoseBoneChild(bone) {
  return bone.children.find((child) => child.isBone && poseBones.has(child.name))
    || bone.children.find((child) => child.isBone)
    || null;
}

function poseBoneTailPosition(bone, head) {
  const child = firstPoseBoneChild(bone);
  if (child) return objectWorldPosition(child);
  const parent = bone.parent?.isBone ? objectWorldPosition(bone.parent) : null;
  const direction = parent
    ? head.clone().sub(parent)
    : new THREE.Vector3(0, 0.12, 0);
  if (direction.lengthSq() < 0.000001) direction.set(0, 0.12, 0);
  const length = THREE.MathUtils.clamp(direction.length() * 0.52, 0.08, 0.18);
  return head.clone().add(direction.normalize().multiplyScalar(length));
}

function updateOctahedralBoneGeometry(handle, head, tail) {
  const axis = tail.clone().sub(head);
  const length = axis.length();
  if (length < 0.0001) return;
  const direction = axis.normalize();
  const cameraForward = new THREE.Vector3();
  camera.getWorldDirection(cameraForward);
  let side = direction.clone().cross(cameraForward);
  if (side.lengthSq() < 0.0001) side = direction.clone().cross(new THREE.Vector3(0, 1, 0));
  if (side.lengthSq() < 0.0001) side = new THREE.Vector3(1, 0, 0);
  side.normalize();
  const up = side.clone().cross(direction).normalize();
  const radius = THREE.MathUtils.clamp(length * 0.16, 0.018, 0.07);
  const center = head.clone().lerp(tail, 0.46);
  const equator = [
    center.clone().add(side.clone().multiplyScalar(radius)),
    center.clone().add(up.clone().multiplyScalar(radius)),
    center.clone().add(side.clone().multiplyScalar(-radius)),
    center.clone().add(up.clone().multiplyScalar(-radius)),
  ];
  const triangles = [];
  for (let index = 0; index < equator.length; index += 1) {
    const next = (index + 1) % equator.length;
    triangles.push(head, equator[index], equator[next]);
    triangles.push(tail, equator[next], equator[index]);
  }
  const positions = handle.geometry.attributes.position.array;
  let offset = 0;
  for (const vertex of triangles) {
    positions[offset++] = vertex.x;
    positions[offset++] = vertex.y;
    positions[offset++] = vertex.z;
  }
  handle.geometry.attributes.position.needsUpdate = true;
  handle.geometry.computeBoundingSphere();
  handle.userData.head.copy(head);
  handle.userData.tail.copy(tail);
}

function updatePoseHandles() {
  if (!poseHandles.size) return;
  for (const [name, handle] of poseHandles) {
    const bone = poseBones.get(name);
    handle.visible = toolMode === 'pose' && (!isSequenceReviewState() || DEBUG_BONES) && (viewMode !== 'firstPerson' || fpvPoseHandleVisible(name));
    if (!bone) continue;
    const head = objectWorldPosition(bone);
    const tail = poseBoneTailPosition(bone, head);
    updateOctahedralBoneGeometry(handle, head, tail);
    if (handle.material) {
      handle.material.opacity = selectedPoseBone?.name === name ? 0.72 : 0.42;
      handle.material.color.setHex(selectedPoseBone?.name === name ? 0xffd45c : 0x68d8ff);
    }
  }
}

function stopPoseAnimation() {
  attackPoseStartedAt = null;
  attackPoseFixedTime = null;
  attackPoseCurrentTime = 0;
  updateAttackReviewControls();
}

function applyPoseBones(bones = {}) {
  for (const [name, values] of Object.entries(bones)) {
    const bone = poseBones.get(name);
    if (bone) bone.quaternion.copy(quaternionFromArray(values));
  }
  root.updateMatrixWorld(true);
  updatePoseHandles();
}

function snapshotPoseBones() {
  const bones = {};
  for (const [name, bone] of poseBones) {
    bones[name] = quaternionToFixedArray(bone.quaternion);
  }
  return bones;
}

function snapshotSaberFk() {
  return {
    saberGrip: saberGrip ? {
      parentBone: 'RightHand',
      position: vectorToFixedArray(saberGrip.position),
      quaternion: quaternionToFixedArray(saberGrip.quaternion),
      rotationDeg: rotationDegFromEuler(saberGrip.rotation),
      scale: vectorToFixedArray(saberGrip.scale),
    } : null,
    sabreLocal: sabreRoot ? {
      position: vectorToFixedArray(sabreRoot.position),
      quaternion: quaternionToFixedArray(sabreRoot.quaternion),
      rotationDeg: rotationDegFromEuler(sabreRoot.rotation),
      scale: vectorToFixedArray(sabreRoot.scale),
    } : null,
  };
}

function applySaberFkSnapshot(snapshot = {}) {
  if (saberGrip && snapshot.saberGrip) {
    saberGrip.position.fromArray(snapshot.saberGrip.position || [0, 0, 0]);
    saberGrip.quaternion.copy(quaternionFromArray(snapshot.saberGrip.quaternion));
    saberGrip.scale.fromArray(snapshot.saberGrip.scale || [1, 1, 1]);
  }
  if (sabreRoot && snapshot.sabreLocal) {
    sabreRoot.position.fromArray(snapshot.sabreLocal.position || [0, 0, 0]);
    sabreRoot.quaternion.copy(quaternionFromArray(snapshot.sabreLocal.quaternion));
    sabreRoot.scale.fromArray(snapshot.sabreLocal.scale || [1, 1, 1]);
  }
  root.updateMatrixWorld(true);
}

function markCustomPose() {
  if (poseState === 'attack1' && manualAttackDraft) {
    manualAttackDirty = true;
    updateAttackReviewControls();
    return;
  }
  stopPoseAnimation();
  poseState = 'custom';
}

function resetPose() {
  stopPoseAnimation();
  setSabreReviewVisible(true);
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
  if (!ACTIVE_CHARACTER.supportsBakedPoseStates) {
    resetPose();
    statusEl.textContent = `${ACTIVE_CHARACTER.label}: baked Meshy Ready is disabled; use Pose mode to author manually`;
    return;
  }
  setSabreReviewVisible(true);
  applyPoseBones(readyPosePreset?.bones || {});
  poseState = 'ready';
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

function applyLowBackKickPose() {
  resetPose();
  if (attackPoseSequence && REQUESTED_CANDIDATE) {
    poseState = 'lowBackKick';
    setSabreReviewVisible(false);
    attackPoseFixedTime = Number.isFinite(Number(REQUESTED_ATTACK_TIME)) ? Number(REQUESTED_ATTACK_TIME) : null;
    attackPoseCurrentTime = attackPoseFixedTime ?? 0;
    attackPoseStartedAt = performance.now() - attackPoseCurrentTime * 1000;
    applyAttackSequenceAt(attackPoseCurrentTime);
    setToolMode('pose');
    setMode('rotate');
    setupAttackReviewControls();
    setAttackReviewOpen(REVIEW_CONTROLS_OPEN);
    statusEl.textContent = `LowBackKick candidate preview: ${REQUESTED_CANDIDATE}; not accepted repo truth${DEBUG_BONES ? '; debug bones visible' : ''}`;
    return;
  }
  setToolMode('pose');
  setMode('rotate');
  poseState = 'lowBackKick';
  statusEl.textContent = 'LowBackKick candidate missing; showing Davin rest pose';
}

function applyIdlePose() {
  resetPose();
  if (attackPoseSequence && REQUESTED_CANDIDATE) {
    poseState = 'idle';
    setSabreReviewVisible(false);
    attackPoseFixedTime = Number.isFinite(Number(REQUESTED_ATTACK_TIME)) ? Number(REQUESTED_ATTACK_TIME) : 0;
    attackPoseCurrentTime = attackPoseFixedTime;
    attackPoseStartedAt = performance.now() - attackPoseCurrentTime * 1000;
    applyAttackSequenceAt(attackPoseCurrentTime);
    setToolMode('pose');
    setMode('rotate');
    setupAttackReviewControls();
    setAttackReviewOpen(REVIEW_CONTROLS_OPEN);
    statusEl.textContent = `Idle screenshot candidate preview: ${REQUESTED_CANDIDATE}; failed diagnostic, not accepted repo truth${DEBUG_BONES ? '; debug bones visible' : ''}`;
    return;
  }
  setToolMode('pose');
  setMode('rotate');
  poseState = 'idle';
  statusEl.textContent = 'Idle candidate missing; showing Davin rest pose';
}


function applySharedRestPose() {
  resetPose();
  if (!attackPoseSequence) {
    setToolMode('pose');
    setMode('rotate');
    poseState = 'sharedRest';
    statusEl.textContent = 'SharedRest candidate missing; showing Crimson rest pose';
    return;
  }
  poseState = 'sharedRest';
  setSabreReviewVisible(true);
  attackPoseFixedTime = 0;
  attackPoseCurrentTime = 0;
  attackPoseStartedAt = null;
  applyAttackSequenceAt(0);
  setToolMode('pose');
  setMode('rotate');
  setAttackReviewOpen(false);
  statusEl.textContent = `SharedRest static pose: ${REQUESTED_CANDIDATE}; no animation playback`;
}

function applyAttackPose() {
  const candidateId = REQUESTED_CANDIDATE;
  const explicitCandidateReview = Boolean(attackPoseSequence && candidateId && ACTIVE_CHARACTER.supportsAttackReview !== false);
  if (!ACTIVE_CHARACTER.supportsBakedPoseStates && !explicitCandidateReview) {
    resetPose();
    setToolMode('pose');
    setMode('rotate');
    statusEl.textContent = `${ACTIVE_CHARACTER.label}: imported model pose authoring only`;
    return;
  }
  const status = poseStatus('attack1');
  resetPose();
  if (useManualAttackAuthoring()) {
    setSabreReviewVisible(true);
    createManualAttackDraft();
    poseState = 'attack1';
    attackPoseFixedTime = 0;
    attackPoseCurrentTime = 0;
    attackPoseStartedAt = null;
    manualAttackSelectedKey = 'start';
    applyManualAttackKey(manualAttackSelectedKey);
    setToolMode('pose');
    setMode('rotate');
    setupAttackReviewControls();
    setAttackReviewOpen(true);
    statusEl.textContent = 'Attack1 manual draft: blank Ready keys';
    return;
  }
  if (attackPoseSequence && candidateId) {
    poseState = 'attack1';
    setSabreReviewVisible(!attackPoseSequence.source?.weaponless);
    attackPoseFixedTime = Number.isFinite(Number(REQUESTED_ATTACK_TIME)) ? Number(REQUESTED_ATTACK_TIME) : null;
    attackPoseCurrentTime = attackPoseFixedTime ?? 0;
    attackPoseStartedAt = performance.now() - attackPoseCurrentTime * 1000;
    applyAttackSequenceAt(attackPoseCurrentTime);
    setupAttackReviewControls();
    statusEl.textContent = `${REQUESTED_ATTACK_LABEL} candidate preview: ${candidateId}; not accepted repo truth`;
    return;
  }
  if (status.fallback === 'ready' && poseIsAccepted('ready')) applyReadyPose();
  poseState = 'attack1';
  statusEl.textContent = `Attack1 ${status.status}: ${status.reason || 'no accepted Attack1 bake is shipped'}; showing ${status.fallback || 'Ready'} fallback`;
}

function manualAttackKeyLabels() {
  return Object.keys(MANUAL_ATTACK_KEYS);
}

function createManualAttackDraft() {
  if (manualAttackDraft) return manualAttackDraft;
  resetPose();
  applyReadyPose();
  const readyBones = snapshotPoseBones();
  const readySaber = snapshotSaberFk();
  const keys = {};
  for (const [label, time] of Object.entries(MANUAL_ATTACK_KEYS)) {
    keys[label] = {
      label,
      time,
      saved: false,
      bones: structuredClone(readyBones),
      saberGrip: structuredClone(readySaber.saberGrip),
      sabreLocal: structuredClone(readySaber.sabreLocal),
    };
  }
  manualAttackDraft = {
    schema: 'pose-lab-v2-manual-animation-v1',
    label: 'Attack1 manual blank-Ready draft',
    source: {
      readyPreset: readyPosePreset?.label || null,
      seed: 'blank-ready-per-key',
      candidateFramesUsed: false,
    },
    duration: MANUAL_ATTACK_DURATION,
    primeKeys: { ...MANUAL_ATTACK_KEYS },
    keys,
  };
  return manualAttackDraft;
}

function manualFrameFromKey(key) {
  return {
    time: key.time,
    bones: structuredClone(key.bones || {}),
    saberGrip: structuredClone(key.saberGrip || null),
    sabreLocal: structuredClone(key.sabreLocal || null),
  };
}

function manualAttackFrames() {
  if (!manualAttackDraft) return [];
  return manualAttackKeyLabels()
    .map((label) => manualAttackDraft.keys[label])
    .filter(Boolean)
    .sort((a, b) => a.time - b.time)
    .map(manualFrameFromKey);
}

function interpolateObjectSnapshot(a, b, alpha) {
  if (!a || !b) return structuredClone(a || b || null);
  const position = new THREE.Vector3().fromArray(a.position || [0, 0, 0])
    .lerp(new THREE.Vector3().fromArray(b.position || [0, 0, 0]), alpha);
  const scale = new THREE.Vector3().fromArray(a.scale || [1, 1, 1])
    .lerp(new THREE.Vector3().fromArray(b.scale || [1, 1, 1]), alpha);
  const quaternion = quaternionFromArray(a.quaternion).slerp(quaternionFromArray(b.quaternion), alpha).normalize();
  return {
    parentBone: a.parentBone || b.parentBone,
    position: vectorToFixedArray(position),
    quaternion: quaternionToFixedArray(quaternion),
    rotationDeg: rotationDegFromQuaternion(quaternion),
    scale: vectorToFixedArray(scale),
  };
}

function manualAttackFrameAt(time) {
  const frames = manualAttackFrames();
  if (!frames.length) return null;
  if (frames.length === 1 || time <= frames[0].time) return frames[0];
  const normalizedTime = MANUAL_ATTACK_DURATION > 0
    ? ((time % MANUAL_ATTACK_DURATION) + MANUAL_ATTACK_DURATION) % MANUAL_ATTACK_DURATION
    : time;
  for (let i = 1; i < frames.length; i += 1) {
    const previous = frames[i - 1];
    const next = frames[i];
    if (normalizedTime <= next.time) {
      const span = Math.max(0.000001, next.time - previous.time);
      const alpha = THREE.MathUtils.clamp((normalizedTime - previous.time) / span, 0, 1);
      return {
        time: normalizedTime,
        bones: interpolatePoseBones(previous.bones, next.bones, alpha),
        saberGrip: interpolateObjectSnapshot(previous.saberGrip, next.saberGrip, alpha),
        sabreLocal: interpolateObjectSnapshot(previous.sabreLocal, next.sabreLocal, alpha),
      };
    }
  }
  return frames[frames.length - 1];
}

function applyManualAttackFrameAt(time) {
  const frame = manualAttackFrameAt(time);
  if (!frame) return;
  attackPoseCurrentTime = frame.time;
  applyPoseBones(frame.bones || {});
  applySaberFkSnapshot(frame);
  updateAttackReviewControls();
}

function applyManualAttackKey(label) {
  createManualAttackDraft();
  if (manualAttackDirty && label !== manualAttackSelectedKey) persistManualAttackKey({ silent: true });
  const key = manualAttackDraft.keys[label];
  if (!key) return;
  manualAttackSelectedKey = label;
  attackPoseFixedTime = key.time;
  attackPoseCurrentTime = key.time;
  attackPoseStartedAt = null;
  applyPoseBones(key.bones || {});
  applySaberFkSnapshot(key);
  manualAttackDirty = false;
  updateAttackReviewControls();
  updateReadout();
}

function persistManualAttackKey({ silent = false } = {}) {
  if (!manualAttackDraft) createManualAttackDraft();
  const key = manualAttackDraft.keys[manualAttackSelectedKey];
  if (!key) return false;
  key.bones = snapshotPoseBones();
  Object.assign(key, snapshotSaberFk(), { saved: true });
  manualAttackDirty = false;
  updateAttackReviewControls();
  updateReadout();
  if (!silent) statusEl.textContent = `Attack1 manual: saved ${manualAttackSelectedKey}`;
  return true;
}

function saveManualAttackKey() {
  persistManualAttackKey();
}

function sequenceFrameAt(sequence, time) {
  const frames = sequence?.frames || [];
  if (!frames.length) return null;
  if (frames.length === 1 || time <= frames[0].time) return frames[0];
  const duration = sequence.source?.duration || frames[frames.length - 1].time || 0;
  const normalizedTime = duration > 0 ? ((time % duration) + duration) % duration : time;
  for (let i = 1; i < frames.length; i += 1) {
    const previous = frames[i - 1];
    const next = frames[i];
    if (normalizedTime <= next.time) {
      const span = Math.max(0.000001, next.time - previous.time);
      const alpha = THREE.MathUtils.clamp((normalizedTime - previous.time) / span, 0, 1);
      return { time: normalizedTime, bones: interpolatePoseBones(previous.bones, next.bones, alpha) };
    }
  }
  return frames[frames.length - 1];
}

function interpolatePoseBones(a = {}, b = {}, alpha = 0) {
  const bones = {};
  const names = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const name of names) {
    const left = a[name];
    const right = b[name] || left;
    if (!left || !right) continue;
    bones[name] = quaternionToFixedArray(quaternionFromArray(left).slerp(quaternionFromArray(right), alpha).normalize());
  }
  return bones;
}

function applyAttackSequenceAt(time) {
  const frame = sequenceFrameAt(attackPoseSequence, time);
  if (!frame) return;
  setSabreReviewVisible(!attackPoseSequence?.source?.weaponless);
  attackPoseCurrentTime = frame.time;
  applyPoseBones(frame.bones || {});
  updateAttackReviewControls();
}

function attackDuration() {
  if (manualAttackDraft) return manualAttackDraft.duration || MANUAL_ATTACK_DURATION;
  return attackPoseSequence?.source?.duration || attackPoseSequence?.frames?.at(-1)?.time || 0;
}

function setAttackReviewTime(time) {
  const duration = attackDuration();
  const next = THREE.MathUtils.clamp(Number(time) || 0, 0, duration || 0);
  if (manualAttackDirty) persistManualAttackKey({ silent: true });
  attackPoseFixedTime = next;
  attackPoseStartedAt = performance.now() - next * 1000;
  if (manualAttackDraft) {
    applyManualAttackFrameAt(next);
    statusEl.textContent = `Attack1 manual draft: ${next.toFixed(3)}s`;
    return;
  }
  applyAttackSequenceAt(next);
  statusEl.textContent = `${REQUESTED_ATTACK_LABEL} candidate preview: ${REQUESTED_CANDIDATE}; ${next.toFixed(3)}s`;
}

function playAttackReview() {
  if (!attackPoseSequence && !manualAttackDraft) return;
  if (manualAttackDirty) persistManualAttackKey({ silent: true });
  attackPoseFixedTime = null;
  attackPoseStartedAt = performance.now() - attackPoseCurrentTime * 1000;
  updateAttackReviewControls();
  statusEl.textContent = manualAttackDraft
    ? 'Attack1 manual draft: playing preview'
    : `${REQUESTED_ATTACK_LABEL} candidate preview: ${REQUESTED_CANDIDATE}; playing`;
}

function pauseAttackReview() {
  if (!attackPoseSequence && !manualAttackDraft) return;
  attackPoseFixedTime = attackPoseCurrentTime;
  updateAttackReviewControls();
  statusEl.textContent = manualAttackDraft
    ? `Attack1 manual draft: paused ${attackPoseCurrentTime.toFixed(3)}s`
    : `${REQUESTED_ATTACK_LABEL} candidate preview: ${REQUESTED_CANDIDATE}; paused ${attackPoseCurrentTime.toFixed(3)}s`;
}

function setAttackReviewOpen(open) {
  attackReviewOpen = Boolean(open && canExposeAttackReview() && (REQUESTED_CANDIDATE || manualAttackDraft || useManualAttackAuthoring()));
  updateAttackReviewControls();
}

function setupAttackReviewControls() {
  if (!attackReviewPanel || (!attackPoseSequence && !manualAttackDraft)) return;
  const duration = attackDuration();
  attackScrubInput.max = String(duration || 1.25);
  attackScrubInput.step = String(1 / 24);
  attackPrimesEl.innerHTML = '';
  const primeKeys = manualAttackDraft?.primeKeys || attackPoseSequence?.primeKeys || {};
  for (const [label, time] of Object.entries(primeKeys)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.attackPrime = label;
    button.dataset.attackTime = String(time);
    button.textContent = label;
    button.addEventListener('click', () => {
      if (manualAttackDraft) applyManualAttackKey(label);
      else setAttackReviewTime(time);
    });
    attackPrimesEl.append(button);
  }
  updateAttackReviewControls();
}

function updateAttackReviewControls() {
  if (!attackReviewPanel) return;
  const active = Boolean((attackPoseSequence || manualAttackDraft) && isSequenceReviewState());
  if (attackReviewToggle) {
    attackReviewToggle.hidden = !Boolean(canExposeAttackReview() && (REQUESTED_CANDIDATE || manualAttackDraft || useManualAttackAuthoring()));
    attackReviewToggle.classList.toggle('active', active && attackReviewOpen);
    attackReviewToggle.textContent = manualAttackDraft ? 'Keys' : REQUESTED_ATTACK_LABEL;
  }
  attackReviewPanel.hidden = !(active && attackReviewOpen);
  if (!active) return;
  const time = attackPoseCurrentTime || 0;
  attackScrubInput.value = String(time);
  attackTimeOutput.value = `${time.toFixed(3)}s`;
  attackPlayButton.classList.toggle('active', attackPoseFixedTime === null);
  attackPauseButton.classList.toggle('active', attackPoseFixedTime !== null);
  if (attackSaveKeyButton) attackSaveKeyButton.hidden = !manualAttackDraft;
  if (attackExportButton) attackExportButton.hidden = !manualAttackDraft;
  for (const button of attackPrimesEl.querySelectorAll('[data-attack-prime]')) {
    const primeTime = Number(button.dataset.attackTime);
    button.classList.toggle('active', Math.abs(primeTime - time) < 0.025);
    if (manualAttackDraft) {
      const label = button.dataset.attackPrime;
      button.classList.toggle('saved', Boolean(manualAttackDraft.keys[label]?.saved));
      button.textContent = `${label}${manualAttackDirty && label === manualAttackSelectedKey ? '*' : ''}`;
    }
  }
  updateTipMatchOverlay();
}

function tipBasisReportAt(time) {
  const report = attackPoseSequence?.guardReport?.tipBasis?.report || [];
  if (!report.length) return null;
  let best = report[0];
  let bestDistance = Math.abs((best.time || 0) - time);
  for (const entry of report) {
    const distance = Math.abs((entry.time || 0) - time);
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
    }
  }
  return best;
}

function jointPinnedReportAt(time) {
  const report = attackPoseSequence?.guardReport?.jointPinned?.report || [];
  if (!report.length) return null;
  let best = report[0];
  let bestDistance = Math.abs((best.time || 0) - time);
  for (const entry of report) {
    const distance = Math.abs((entry.time || 0) - time);
    if (distance < bestDistance) {
      best = entry;
      bestDistance = distance;
    }
  }
  return best;
}

function placeTipDot(dot, point) {
  if (!dot || !Array.isArray(point)) return;
  dot.style.transform = `translate(${Number(point[0]).toFixed(1)}px, ${Number(point[1]).toFixed(1)}px)`;
}

function liveJointPinnedProbe(entry) {
  if (!saberGrip || !sabreRoot || !entry) return null;
  root.updateMatrixWorld(true);
  const elbow = poseBones.get('RightForeArm')?.getWorldPosition(new THREE.Vector3());
  const wrist = poseBones.get('RightHand')?.getWorldPosition(new THREE.Vector3());
  if (!elbow || !wrist) return null;
  const tipLocalPoint = attackPoseSequence?.source?.jointPinned?.tipLocalPoint;
  const hiltWorld = objectWorldPosition(saberGrip);
  const tipWorld = Array.isArray(tipLocalPoint)
    ? sabreRoot.localToWorld(new THREE.Vector3(...tipLocalPoint))
    : orientationProbe(objectWorldPosition(sabreRoot), objectWorldQuaternion(sabreRoot), sabreBladeLocalAxis(), SABRE_AXIS_PROOF_LENGTH).end;
  const targetElbow = new THREE.Vector3(...entry.targetElbowWorld);
  const targetWrist = new THREE.Vector3(...entry.targetWristWorld);
  const targetTip = new THREE.Vector3(...entry.desiredTipWorld);
  const targetBlade = new THREE.Vector3(...entry.targetBladeDirectionWorld).normalize();
  const actualBlade = tipWorld.clone().sub(hiltWorld).normalize();
  const thresholds = attackPoseSequence?.source?.jointPinned?.thresholds || {};
  const elbowWorldError = elbow.distanceTo(targetElbow);
  const wristWorldError = wrist.distanceTo(targetWrist);
  const bladeTipWorldError = tipWorld.distanceTo(targetTip);
  const bladeAngleErrorDeg = vectorAngleDeg(actualBlade, targetBlade);
  const pass = elbowWorldError <= (thresholds.elbowWorldError ?? 0)
    && wristWorldError <= (thresholds.wristWorldError ?? 0)
    && bladeTipWorldError <= (thresholds.bladeTipWorldError ?? 0)
    && bladeAngleErrorDeg <= (thresholds.bladeAngleDeg ?? 0);
  return {
    hiltScreen: worldToScreenPixels(hiltWorld),
    tipScreen: worldToScreenPixels(tipWorld),
    targetTipScreen: worldToScreenPixels(targetTip),
    elbowWorldError,
    wristWorldError,
    bladeTipWorldError,
    bladeAngleErrorDeg,
    pass,
  };
}

function liveTipBasisProbe(entry) {
  if (!saberGrip || !sabreRoot) return null;
  root.updateMatrixWorld(true);
  const tipLocalPoint = entry?.source?.tipLocalPoint || attackPoseSequence?.source?.tipBasis?.tipLocalPoint;
  const hiltWorld = objectWorldPosition(saberGrip);
  const tipWorld = Array.isArray(tipLocalPoint)
    ? sabreRoot.localToWorld(new THREE.Vector3(...tipLocalPoint))
    : orientationProbe(objectWorldPosition(sabreRoot), objectWorldQuaternion(sabreRoot), sabreBladeLocalAxis(), SABRE_AXIS_PROOF_LENGTH).end;
  const hiltScreen = worldToScreenPixels(hiltWorld);
  const tipScreen = worldToScreenPixels(tipWorld);
  const tipMinusHilt = tipScreen.clone().sub(hiltScreen);
  const sourceViewport = attackPoseSequence?.source?.tipBasis?.viewport;
  const rect = canvas.getBoundingClientRect();
  const desired = Array.isArray(entry?.desiredTipMinusHilt) && Array.isArray(sourceViewport)
    ? new THREE.Vector2(
      entry.desiredTipMinusHilt[0] * rect.width / sourceViewport[0],
      entry.desiredTipMinusHilt[1] * rect.height / sourceViewport[1]
    )
    : Array.isArray(entry?.desiredTipMinusHilt)
      ? new THREE.Vector2(...entry.desiredTipMinusHilt)
      : tipMinusHilt.clone();
  const targetTipScreen = hiltScreen.clone().add(desired);
  return {
    hiltScreen,
    tipScreen,
    targetTipScreen,
    tipMinusHilt,
    errorPx: tipMinusHilt.distanceTo(desired),
  };
}

function updateTipMatchOverlay() {
  const active = Boolean(poseState === 'attack1' && (
    (TIP_BASIS_REVIEW && attackPoseSequence?.guardReport?.tipBasis)
    || (WORLD_SOCKET_REVIEW && attackPoseSequence?.guardReport?.jointPinned)
  ));
  if (!tipMatchOverlay) return;
  tipMatchOverlay.hidden = !active;
  if (!active) return;
  if (WORLD_SOCKET_REVIEW && attackPoseSequence?.guardReport?.jointPinned) {
    const entry = jointPinnedReportAt(attackPoseCurrentTime || 0);
    const live = liveJointPinnedProbe(entry);
    if (!entry || !live) {
      tipMatchReadout.value = 'world-socket: no live joint probe';
      return;
    }
    placeTipDot(tipTargetDot, live.targetTipScreen.toArray());
    placeTipDot(tipActualDot, live.tipScreen.toArray());
    placeTipDot(tipHiltDot, live.hiltScreen.toArray());
    tipMatchReadout.value = `${entry.label}: ${live.pass ? 'LIVE PASS' : 'LIVE FAIL'} elbow ${fixedNumber(live.elbowWorldError, 3)} wrist ${fixedNumber(live.wristWorldError, 3)} tip ${fixedNumber(live.bladeTipWorldError, 3)} angle ${fixedNumber(live.bladeAngleErrorDeg, 1)}deg`;
    return;
  }
  const entry = tipBasisReportAt(attackPoseCurrentTime || 0);
  if (!entry) {
    tipMatchReadout.value = 'tip-basis: no report';
    return;
  }
  const live = liveTipBasisProbe(entry);
  if (!live) {
    tipMatchReadout.value = 'tip-basis: no live sabre probe';
    return;
  }
  placeTipDot(tipTargetDot, live.targetTipScreen.toArray());
  placeTipDot(tipActualDot, live.tipScreen.toArray());
  placeTipDot(tipHiltDot, live.hiltScreen.toArray());
  const vector = live.tipMinusHilt.toArray().map((value) => fixedNumber(value, 1));
  const status = attackPoseSequence.guardReport.tipBasis.predicates?.status || 'UNKNOWN';
  tipMatchReadout.value = `${entry.label}: live ${vector.join(', ')} target ${entry.desiredTipMinusHilt.join(', ')} error ${fixedNumber(live.errorPx, 1)}px ${status}`;
}

function setPoseState(next) {
  if (next === 'ready') {
    resetPose();
    const canMeasureSaberDelta = Boolean(sabreRoot);
    const restSnapshot = canMeasureSaberDelta ? readySnapshot() : null;
    applyReadyPose();
    if (canMeasureSaberDelta) {
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
    }
    statusEl.textContent = 'ready pose: source-oriented OneHandReady, sabre follows RightHand FK';
  } else if (next === 'fistReady') {
    if (!ACTIVE_CHARACTER.supportsFistHands) {
      resetPose();
      setToolMode('pose');
      setMode('rotate');
      statusEl.textContent = `${ACTIVE_CHARACTER.label}: fist hands are Meshy-only; author this rig in Rest`;
      renderControls();
      updateReadout();
      return;
    }
    resetPose();
    setSabreReviewVisible(false);
    applyPoseBones(fistReadyPosePreset?.bones || readyPosePreset?.bones || {});
    poseState = 'fistReady';
    setToolMode('pose');
    setMode('rotate');
    statusEl.textContent = 'fist ready: Meshy-derived fist controls editable in FPV';
  } else if (next === 'sharedRest') {
    applySharedRestPose();
  } else if (next === 'attack1') {
    applyAttackPose();
  } else if (next === 'lowBackKick') {
    applyLowBackKickPose();
  } else if (next === 'idle') {
    applyIdlePose();
  } else {
    resetPose();
    statusEl.textContent = 'rest pose: golden Meshy A-pose restored';
  }
  renderControls();
  updateReadout();
}

function initialPoseStateFromUrl() {
  const pose = String(URL_PARAMS.get('pose') || '').toLowerCase();
  if (pose === 'ready') return 'ready';
  if (ACTIVE_CHARACTER.supportsFistHands && (FIST_VISUAL_REVIEW || ['fist', 'fistready', 'fist-ready'].includes(pose))) return 'fistReady';
  if (REQUESTED_SHARED_REST) return 'sharedRest';
  if (REQUESTED_IDLE_REVIEW) return 'idle';
  if (REQUESTED_LOWBACKKICK_REVIEW) return 'lowBackKick';
  if ((ACTIVE_CHARACTER.supportsBakedPoseStates || (REQUESTED_CANDIDATE && ACTIVE_CHARACTER.supportsAttackReview !== false)) && (REQUESTED_ATTACK_QUARANTINED || REQUESTED_ATTACK2_QUARANTINED)) return 'attack1';
  return 'rest';
}

function initialViewModeFromUrl() {
  return URL_PARAMS.get('view') === 'fpv' || URL_PARAMS.get('view') === 'firstPerson'
    ? 'firstPerson'
    : 'orbit';
}

async function loadGltf(url, { announce = true, label = null } = {}) {
  if (announce) setBootPhase(label || `loading ${url.split('/').pop()}`);
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      (error) => reject(new Error(`failed ${url}: ${error?.message || error}`))
    );
  });
}

async function loadGlb(url, options = {}) {
  const gltf = await loadGltf(url, options);
  return gltf.scene;
}

async function loadTexture(url, colorSpace = null, announce = true) {
  if (announce) setBootPhase(`loading ${url.split('/').pop()}`);
  return new Promise((resolve, reject) => {
    textureLoader.load(url, (texture) => {
      texture.flipY = false;
      if (colorSpace) texture.colorSpace = colorSpace;
      resolve(texture);
    }, undefined, (error) => reject(new Error(`failed ${url}: ${error?.message || error}`)));
  });
}

async function loadMeshyPbrTextures({ announce = true } = {}) {
  if (announce) setBootPhase('loading Meshy PBR textures');
  const entries = await Promise.all(Object.entries(MESHY_PBR_TEXTURES).map(async ([slot, url]) => {
    const colorSpace = slot === 'map' || slot === 'emissiveMap' ? THREE.SRGBColorSpace : null;
    return [slot, await loadTexture(url, colorSpace, announce)];
  }));
  return Object.fromEntries(entries);
}

function eachMeshyMaterial(object, callback) {
  object.traverse((node) => {
    if (!node.isMesh || !node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) callback(material);
  });
}

async function applyMeshyPbrTextures(object, options = {}) {
  if (!IS_MESHY_CHARACTER) return;
  meshyPbrTextures = await loadMeshyPbrTextures(options);
  eachMeshyMaterial(object, (material) => applyMeshyPbrToMaterial(material, meshyPbrTextures));
  applyMeshyPbrToFpvMasks();
}

async function loadPosePresets({ announce = true } = {}) {
  if (announce) setBootPhase('loading baked poses');
  const cacheBust = URL_PARAMS.get('cacheBust');
  const suffix = cacheBust ? `?cacheBust=${encodeURIComponent(cacheBust)}` : '';
  const readyStatus = poseStatus('ready');
  if (readyStatus.status !== 'accepted' || !readyStatus.module || !readyStatus.exportName) {
    throw new Error('Ready pose is not accepted in pose-status.js');
  }
  const readyModule = await import(`${readyStatus.module}${suffix}`);
  readyPosePreset = readyModule[readyStatus.exportName];
  const fistReadyModule = await import(`./fist-ready-pose.js${suffix}`);
  fistReadyPosePreset = fistReadyModule.FIST_READY_POSE_PRESET;
  updateReadyProof({
    readyPresetLoaded: Boolean(readyPosePreset),
    rightHandPresetQuaternion: readyPosePreset?.bones?.RightHand || null,
  });
}

async function loadReviewCandidate() {
  const cacheBust = URL_PARAMS.get('cacheBust');
  const suffix = cacheBust ? `?cacheBust=${encodeURIComponent(cacheBust)}` : '';
  const candidates = REQUESTED_IDLE_REVIEW ? DAVIN_IDLE_REVIEW_CANDIDATES : REQUESTED_LOWBACKKICK_REVIEW ? LOWBACKKICK_REVIEW_CANDIDATES : ATTACK1_REVIEW_CANDIDATES;
  const candidate = candidates[REQUESTED_CANDIDATE];
  if (!candidate) return;
  const shouldLoad = REQUESTED_SHARED_REST || REQUESTED_IDLE_REVIEW || REQUESTED_LOWBACKKICK_REVIEW || REQUESTED_ATTACK_QUARANTINED || REQUESTED_ATTACK2_QUARANTINED;
  if (!shouldLoad) return;
  const candidateModule = await import(`${candidate.module}${suffix}`);
  attackPoseSequence = candidateModule[candidate.exportName];
  if (!attackPoseSequence?.frames?.length) throw new Error(`${REQUESTED_ATTACK_LABEL} review candidate ${REQUESTED_CANDIDATE} has no frames`);
  markBootTiming('candidateLoaded');
}

function isSequenceReviewState() {
  return poseState === 'attack1' || poseState === 'lowBackKick' || poseState === 'idle';
}

function importedClipNames() {
  return importedAnimationClips.map((clip) => clip.name).filter(Boolean);
}

function importedClipByName(name) {
  const lower = String(name || '').toLowerCase();
  return importedAnimationClips.find((clip) => clip.name.toLowerCase() === lower) || null;
}

function stopImportedAnimation() {
  importedAnimationAction?.stop();
  importedAnimationAction = null;
  activeImportedAnimationClip = null;
}

function playImportedAnimation(name = null) {
  if (!importedAnimationMixer || !importedAnimationClips.length) return false;
  const clip = importedClipByName(name) || (ACTIVE_CHARACTER.defaultClip ? importedClipByName(ACTIVE_CHARACTER.defaultClip) : null) || importedAnimationClips[0];
  if (!clip) return false;
  importedAnimationAction?.stop();
  importedAnimationAction = importedAnimationMixer.clipAction(clip);
  importedAnimationAction.reset();
  importedAnimationAction.play();
  activeImportedAnimationClip = clip;
  importedAnimationClock.start();
  statusEl.textContent = `${ACTIVE_CHARACTER.label}: playing ${clip.name}`;
  renderControls();
  updateReadout();
  return true;
}

function setupImportedAnimations(gltf) {
  importedAnimationClips = ACTIVE_CHARACTER.supportsAnimationClips ? [...(gltf.animations || [])] : [];
  if (!importedAnimationClips.length) return;
  importedRootMotionBone = ACTIVE_CHARACTER.key === 'vanguard' ? meshyRoot.getObjectByName('root') : null;
  importedRootMotionRestPosition = importedRootMotionBone ? importedRootMotionBone.position.clone() : null;
  importedAnimationMixer = new THREE.AnimationMixer(meshyRoot);
  if (REQUESTED_IMPORTED_CLIP || ACTIVE_CHARACTER.autoPlayAnimation) playImportedAnimation(REQUESTED_IMPORTED_CLIP);
}


function suppressImportedRootMotion() {
  if (!importedRootMotionBone || !importedRootMotionRestPosition) return;
  importedRootMotionBone.position.copy(importedRootMotionRestPosition);
  importedRootMotionBone.updateMatrixWorld(true);
}

function cycleImportedAnimation() {
  if (!importedAnimationClips.length) return;
  const currentIndex = importedAnimationClips.findIndex((clip) => clip === activeImportedAnimationClip);
  const next = importedAnimationClips[(Math.max(0, currentIndex) + 1) % importedAnimationClips.length];
  playImportedAnimation(next.name);
}

function setMode(next) {
  mode = next === 'scale' || next === 'rotate' ? next : 'move';
  currentAxis = mode === 'scale' ? 'all' : 'screen';
  toolState[toolMode] = { mode, axis: currentAxis };
  renderControls();
}

function switchModel(nextKey) {
  if (!CHARACTER_ASSETS[nextKey] || nextKey === ACTIVE_CHARACTER.key) return;
  const params = new URLSearchParams(window.location.search);
  params.set('model', nextKey);
  params.delete('candidate');
  params.delete('fistHands');
  if (!CHARACTER_ASSETS[nextKey].supportsBakedPoseStates) params.delete('pose');
  window.location.search = params.toString();
}

function setToolMode(next) {
  toolState[toolMode] = { mode, axis: currentAxis };
  toolMode = next === 'pose' || !ACTIVE_CHARACTER.supportsSaber ? 'pose' : 'saber';
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

function setDockOpen(open, panel = activePanel || (ACTIVE_CHARACTER.key === 'crimson' ? 'model' : 'transform')) {
  dockOpen = Boolean(open);
  if (!dockOpen) activePanel = null;
  else activePanel = controlPanels.some((element) => element.dataset.panel === panel) ? panel : (ACTIVE_CHARACTER.key === 'crimson' ? 'model' : 'transform');
  dockEl.hidden = !dockOpen;
  dockToggleButton.classList.toggle('active', dockOpen);
  setControlPanel(activePanel);
}

function setControlPanel(next) {
  const defaultPanel = ACTIVE_CHARACTER.key === 'crimson' ? 'model' : 'transform';
  if (!dockOpen || !next) {
    activePanel = null;
    for (const button of panelToggleButtons) button.classList.remove('active');
    for (const element of controlPanels) {
      element.hidden = true;
      element.classList.remove('active');
    }
    return;
  }
  activePanel = controlPanels.some((element) => element.dataset.panel === next) ? next : defaultPanel;
  for (const button of panelToggleButtons) {
    button.classList.toggle('active', button.dataset.panelToggle === activePanel);
  }
  for (const element of controlPanels) {
    const active = element.dataset.panel === activePanel;
    element.hidden = !active;
    element.classList.toggle('active', active);
  }
}

function fpvSettingsExport() {
  return {
    cameraMode: firstPersonCameraConfig.cameraMode,
    anchor: firstPersonCameraConfig.anchor,
    fallbackAnchor: firstPersonCameraConfig.fallbackAnchor,
    forwardAxis: firstPersonCameraConfig.forwardAxis,
    headForwardOffset: fixedNumber(firstPersonCameraConfig.headForwardOffset, 4),
    headCameraYOffset: fixedNumber(firstPersonCameraConfig.headCameraYOffset, 4),
    lookForward: fixedNumber(firstPersonCameraConfig.lookForward, 4),
    lookVertical: fixedNumber(firstPersonCameraConfig.lookVertical, 4),
    fov: firstPersonCameraConfig.fov,
    near: firstPersonCameraConfig.near,
  };
}

function updateFpvSettingsReadout() {
  if (fpvFovInput) fpvFovInput.value = String(firstPersonCameraConfig.fov);
  if (fpvFovOutput) fpvFovOutput.value = String(firstPersonCameraConfig.fov);
  if (!fpvSettingsReadout) return;
  fpvSettingsReadout.textContent = JSON.stringify(fpvSettingsExport(), null, 2);
}

function setFpvSettingsOpen(open) {
  fpvSettingsOpen = Boolean(open) && viewMode === 'firstPerson';
  if (fpvSettingsPanel) fpvSettingsPanel.hidden = !fpvSettingsOpen;
  if (fpvSettingsToggle) fpvSettingsToggle.classList.toggle('active', fpvSettingsOpen);
  updateFpvSettingsReadout();
}

function applyFpvNudge(direction, amount) {
  if (direction === 'forward') firstPersonCameraConfig.headForwardOffset += amount;
  if (direction === 'back') firstPersonCameraConfig.headForwardOffset -= amount;
  if (direction === 'up') firstPersonCameraConfig.headCameraYOffset += amount;
  if (direction === 'down') firstPersonCameraConfig.headCameraYOffset -= amount;
  firstPersonCameraConfig.headForwardOffset = fixedNumber(firstPersonCameraConfig.headForwardOffset, 4);
  firstPersonCameraConfig.headCameraYOffset = fixedNumber(firstPersonCameraConfig.headCameraYOffset, 4);
  updateFirstPersonCamera();
  updateFpvSettingsReadout();
  statusEl.textContent = `fpv camera: ${direction}`;
}

function stopFpvNudge() {
  if (fpvNudgeHoldTimer) window.clearTimeout(fpvNudgeHoldTimer);
  if (fpvNudgeRaf) window.cancelAnimationFrame(fpvNudgeRaf);
  fpvNudgeHoldTimer = null;
  fpvNudgeRaf = null;
  fpvNudgeState = null;
}

function runFpvNudgeHold(timestamp) {
  if (!fpvNudgeState) return;
  const deltaSeconds = Math.min(0.08, Math.max(0, (timestamp - fpvNudgeState.lastTimestamp) / 1000));
  fpvNudgeState.lastTimestamp = timestamp;
  applyFpvNudge(fpvNudgeState.direction, FPV_NUDGE_HOLD_SPEED * deltaSeconds);
  fpvNudgeRaf = window.requestAnimationFrame(runFpvNudgeHold);
}

function startFpvNudge(direction, event) {
  if (viewMode !== 'firstPerson') return;
  stopFpvNudge();
  fpvNudgeState = { direction, lastTimestamp: 0 };
  applyFpvNudge(direction, FPV_NUDGE_STEP);
  if (event?.currentTarget?.setPointerCapture && event.pointerId !== undefined) {
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  fpvNudgeHoldTimer = window.setTimeout(() => {
    if (!fpvNudgeState) return;
    fpvNudgeState.lastTimestamp = performance.now();
    fpvNudgeRaf = window.requestAnimationFrame(runFpvNudgeHold);
  }, FPV_NUDGE_HOLD_DELAY_MS);
}

function resetFpvCameraSettings() {
  Object.assign(firstPersonCameraConfig, FPV_CAMERA_DEFAULTS);
  updateFirstPersonCamera();
  updateFpvSettingsReadout();
  statusEl.textContent = 'fpv camera: reset';
}

function setFpvFov(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return;
  firstPersonCameraConfig.fov = Math.max(70, Math.min(125, Math.round(next)));
  updateFirstPersonCamera();
  updateFpvSettingsReadout();
  statusEl.textContent = `fpv camera: fov ${firstPersonCameraConfig.fov}`;
}

function renderControls() {
  if (cycleCharacterButton) {
    cycleCharacterButton.textContent = `Model: ${ACTIVE_CHARACTER.label}`;
    cycleCharacterButton.hidden = false;
    cycleCharacterButton.setAttribute('aria-label', `Current model: ${ACTIVE_CHARACTER.label}; tap to switch model`);
  }
  modelButtons.forEach((button) => button.classList.toggle('active', button.dataset.modelKey === ACTIVE_CHARACTER.key));
  toolButtons.forEach((button) => {
    if (button.dataset.tool === 'saber') button.hidden = !ACTIVE_CHARACTER.supportsSaber;
    button.classList.toggle('active', button.dataset.tool === toolMode);
  });
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
  if (viewMode !== 'firstPerson') {
    fpvSettingsToggle.hidden = true;
    setFpvSettingsOpen(false);
  }
  else {
    fpvSettingsToggle.hidden = false;
    if (fpvSettingsPanel) fpvSettingsPanel.hidden = !fpvSettingsOpen;
    fpvSettingsToggle.classList.toggle('active', fpvSettingsOpen);
  }
  cycleToolButton.hidden = !ACTIVE_CHARACTER.supportsSaber;
  cycleToolButton.textContent = `Tool: ${toolMode === 'pose' ? 'Pose' : 'Saber'}`;
  cyclePoseStateButton.textContent = `Pose: ${POSE_STATE_LABELS[poseState] || 'Custom'}`;
  if (cycleAnimationButton) {
    cycleAnimationButton.hidden = !importedAnimationClips.length;
    cycleAnimationButton.textContent = `Anim: ${activeImportedAnimationClip?.name || 'None'}`;
  }
  cycleViewModeButton.textContent = `View: ${viewMode === 'firstPerson' ? 'FPV' : 'Orbit'}`;
  updateAttackReviewControls();
  if (poseState === 'attack1' && manualAttackDraft) {
    statusEl.textContent = `Attack1 manual: ${manualAttackSelectedKey}${manualAttackDirty ? ' unsaved' : ''}`;
    return;
  }
  if (isSequenceReviewState() && attackPoseSequence) {
    statusEl.textContent = `${REQUESTED_ATTACK_LABEL} candidate preview: ${REQUESTED_CANDIDATE}; ${attackPoseFixedTime === null ? 'playing' : `${attackPoseCurrentTime.toFixed(3)}s`}`;
    return;
  }
  statusEl.textContent = toolMode === 'pose'
    ? selectedPoseBone
      ? `${mode} / ${axisLabel()}: editing ${poseBoneLabel(selectedPoseBone, selectedPoseBone.userData.poseLabV2LogicalName)}`
      : `pose / ${axisLabel()}: tap a blue bone handle`
    : selected
    ? mode === 'move'
      ? `${mode} / ${axisLabel()}: drag sabre to edit, drag empty space for camera`
      : `${mode} / ${axisLabel()}: drag canvas to edit selected sabre; Camera tool or Move empty-space drag orbits`
    : mode === 'move'
      ? `${mode} / ${axisLabel()}: tap the visible sabre first`
      : `${mode} / ${axisLabel()}: drag canvas to edit sabre; no precise pick required`;
}

function applyOrbitCamera() {
  viewMode = 'orbit';
  document.body.classList.remove('is-fpv');
  updateFpvBodyMasks();
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
  const anchor = findPoseBone(firstPersonCameraConfig.anchor)
    || findPoseBone(firstPersonCameraConfig.fallbackAnchor);
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
      fpvArmMaskActive: fpvBodyMasks.some((entry) => entry.mask.visible),
      fullBodyVisible: fpvBodyMasks.every((entry) => entry.source.visible),
    },
  });
}

function setViewMode(next) {
  if (next === 'firstPerson') {
    viewMode = 'firstPerson';
    controls.enabled = false;
    document.body.classList.add('is-fpv');
    ensureFpvBodyMasks();
    updateFpvBodyMasks();
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
  controls.enabled = viewMode === 'orbit';
  lastPinchDistance = 0;
  lastTwistAngle = 0;
  renderControls();
  statusEl.textContent = message;
}

function cycleMode() {
  setMode(mode === 'move' ? 'rotate' : mode === 'rotate' ? 'scale' : 'move');
}

function exportTransform() {
  if (manualAttackDraft) {
    if (manualAttackDirty) persistManualAttackKey({ silent: true });
    return exportManualAttackDraft();
  }
  root.updateMatrixWorld(true);
  const rotationDeg = sabreRoot ? rotationDegFromQuaternion(objectWorldQuaternion(sabreRoot)) : null;
  const scale = sabreRoot ? objectWorldScale(sabreRoot).toArray().map((value) => Number(value.toFixed(5))) : null;
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
      character: ACTIVE_CHARACTER.asset,
      characterKey: ACTIVE_CHARACTER.key,
      characterLabel: ACTIVE_CHARACTER.label,
      source: ACTIVE_CHARACTER.source,
      meshy: ASSETS.meshy,
      sabre: activeSaberAsset(),
      animations: importedClipNames(),
      activeAnimation: activeImportedAnimationClip?.name || null,
      rootMotion: ACTIVE_CHARACTER.key === 'vanguard' ? {
        sidecar: './assets/vanguard/vanguard_root_motion.json',
        applyInPoseLab: false,
        suppressedBone: importedRootMotionBone?.name || null,
      } : null,
    },
    saberRoot: sabreRoot ? {
      position: objectWorldPosition(sabreRoot).toArray().map((value) => Number(value.toFixed(5))),
      rotationDeg,
      scale,
      uniformScale: Number(scale[0].toFixed(5)),
    } : null,
    saberGrip: saberGripLocal,
    sabreLocal,
    pose: {
      state: poseState,
      readyPreset: readyPosePreset?.label || null,
      attackPreset: attackPoseSequence?.label || null,
      selectedBone: selectedPoseBone?.name || null,
      bones: poseBonesExport,
    },
  };
}

function exportManualAttackDraft() {
  const keys = {};
  for (const label of manualAttackKeyLabels()) {
    const key = manualAttackDraft.keys[label];
    if (!key) continue;
    keys[label] = {
      time: key.time,
      saved: Boolean(key.saved),
      bones: structuredClone(key.bones || {}),
      saberGrip: structuredClone(key.saberGrip || null),
      sabreLocal: structuredClone(key.sabreLocal || null),
    };
  }
  return {
    schema: 'pose-lab-v2-manual-animation-v1',
    toolMode,
    status: 'manual-review',
    label: 'Attack1 manual blank-Ready draft',
    assets: {
      character: ACTIVE_CHARACTER.asset,
      characterKey: ACTIVE_CHARACTER.key,
      characterLabel: ACTIVE_CHARACTER.label,
      source: ACTIVE_CHARACTER.source,
      meshy: ASSETS.meshy,
      sabre: activeSaberAsset(),
    },
    source: {
      readyPreset: readyPosePreset?.label || null,
      seed: 'blank-ready-per-key',
      candidateFramesUsed: false,
    },
    duration: manualAttackDraft.duration,
    primeKeys: { ...manualAttackDraft.primeKeys },
    selectedKey: manualAttackSelectedKey,
    dirty: manualAttackDirty,
    keys,
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
  root.updateMatrixWorld(true);
  updatePoseHandles();
  const pointer = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -(((clientY - rect.top) / rect.height) * 2 - 1)
  );
  const visibleHandles = [...poseHandles.values()].filter((handle) => handle.visible);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(visibleHandles, false);
  if (hits.length) {
    const name = hits[0].object.userData.poseBoneName;
    return poseBones.get(name) || null;
  }
  const point = new THREE.Vector2(clientX - rect.left, clientY - rect.top);
  let best = null;
  let bestDistance = Infinity;
  for (const [name, handle] of poseHandles) {
    if (!handle.visible) continue;
    const pick = projectedHandlePickInfo(handle, point, rect);
    const distance = pick.distance;
    if (distance < bestDistance) {
      best = name;
      bestDistance = distance;
    }
  }
  if (!best || bestDistance > POSE_HANDLE_PICK_RADIUS_PX) return null;
  return poseBones.get(best) || null;
}

function projectedHandlePickInfo(handle, point, rect) {
  const positions = handle.geometry?.attributes?.position?.array;
  if (!positions) return { distance: Infinity, inside: false };
  let bestDistance = Infinity;
  let inside = false;
  for (let index = 0; index < positions.length; index += 9) {
    const a = worldToScreenPixels(new THREE.Vector3(positions[index], positions[index + 1], positions[index + 2]));
    const b = worldToScreenPixels(new THREE.Vector3(positions[index + 3], positions[index + 4], positions[index + 5]));
    const c = worldToScreenPixels(new THREE.Vector3(positions[index + 6], positions[index + 7], positions[index + 8]));
    if (pointInScreenTriangle(point, a, b, c)) inside = true;
    bestDistance = Math.min(
      bestDistance,
      pointToScreenSegmentDistance(point, a, b),
      pointToScreenSegmentDistance(point, b, c),
      pointToScreenSegmentDistance(point, c, a)
    );
  }
  return { distance: inside ? 0 : bestDistance, inside };
}

function pointInScreenTriangle(point, a, b, c) {
  const area = signedScreenTriangleArea(a, b, c);
  if (Math.abs(area) < 0.000001) return false;
  const ab = signedScreenTriangleArea(point, a, b);
  const bc = signedScreenTriangleArea(point, b, c);
  const ca = signedScreenTriangleArea(point, c, a);
  const hasNegative = ab < 0 || bc < 0 || ca < 0;
  const hasPositive = ab > 0 || bc > 0 || ca > 0;
  return !(hasNegative && hasPositive);
}

function signedScreenTriangleArea(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function pointToScreenSegmentDistance(point, a, b) {
  const segment = b.clone().sub(a);
  const lengthSq = segment.lengthSq();
  if (lengthSq <= 0.000001) return point.distanceTo(a);
  const alpha = THREE.MathUtils.clamp(point.clone().sub(a).dot(segment) / lengthSq, 0, 1);
  return point.distanceTo(a.clone().add(segment.multiplyScalar(alpha)));
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
  if (toolMode === 'pose') markCustomPose();
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
  if (toolMode === 'pose') markCustomPose();
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
  if (poseState === 'attack1' && manualAttackDraft) {
    manualAttackDirty = true;
    updateAttackReviewControls();
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
    statusEl.textContent = `pose: ${mode} ${poseBoneLabel(bone, bone.userData.poseLabV2LogicalName)}`;
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
  statusEl.textContent = `pose: two-finger ${mode} ${poseBoneLabel(selectedPoseBone, selectedPoseBone?.userData.poseLabV2LogicalName)}`;
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
  if (!sabreRoot && toolMode !== 'pose') return false;
  const points = touchPoints(event);
  if (points.length >= 2 && toolMode === 'pose' && selectedPoseBone) {
    suppressTouchPointerEvents = true;
    beginTwoFingerPose(points);
    stopEvent(event);
    return true;
  }
  if (points.length >= 2 && toolMode === 'saber' && (selected || mode === 'rotate' || mode === 'scale') && (mode === 'rotate' || mode === 'scale')) {
    selected = true;
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
  if (!hit && !saberTransformClaimsEmptyGesture()) {
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
  if ((!sabreRoot && toolMode !== 'pose') || !touchGesture) return false;
  const points = touchPoints(event);
  if (points.length >= 2 && toolMode === 'pose' && selectedPoseBone) {
    if (touchGesture.kind !== 'two-pose') beginTwoFingerPose(points);
    handleTwoFingerTouch(points);
    updatePoseHandles();
    updateReadout();
    statusEl.textContent = `pose: two-finger ${mode} ${poseBoneLabel(selectedPoseBone, selectedPoseBone?.userData.poseLabV2LogicalName)}`;
    updateTouchProof({ lastTouchAction: 'two-finger-twist' });
    stopEvent(event);
    return true;
  }
  if (points.length >= 2 && toolMode === 'saber' && (selected || mode === 'rotate' || mode === 'scale') && (mode === 'rotate' || mode === 'scale')) {
    selected = true;
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
  controls.enabled = viewMode === 'orbit';
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
  controls.enabled = viewMode === 'orbit';
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
  if (!sabreRoot && toolMode !== 'pose') return false;
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
    statusEl.textContent = `pose: ${mode} ${poseBoneLabel(bone, bone.userData.poseLabV2LogicalName)}`;
    stopEvent(event);
    return true;
  }
  const hit = pickSabre(event.clientX, event.clientY);
  if (!hit && !saberTransformClaimsEmptyGesture()) {
    pointers.delete(event.pointerId);
    return false;
  }
  const wasSelected = selected && Boolean(hit);
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
  if ((!sabreRoot && toolMode !== 'pose') || !pointers.has(event.pointerId)) return false;
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
  controls.enabled = viewMode === 'orbit';
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
  if (poseState === 'attack1' && manualAttackDraft) {
    manualAttackDirty = true;
    updateAttackReviewControls();
  }
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
  markBootTiming('bootStart');
  const requestedPoseState = initialPoseStateFromUrl();
  setBootPhase(`loading ${ACTIVE_CHARACTER.label}`);
  const characterPromise = loadGltf(ACTIVE_CHARACTER.asset, { announce: false });
  const sabrePromise = ACTIVE_CHARACTER.supportsSaber
    ? loadGlb(activeSaberAsset(), { announce: false })
    : Promise.resolve(null);
  const posePromise = Promise.all([
    ACTIVE_CHARACTER.supportsBakedPoseStates
      ? loadPosePresets({ announce: false })
      : Promise.resolve(null),
    loadReviewCandidate(),
  ]);
  const fistHandsPromise = FIST_VISUAL_REVIEW && ACTIVE_CHARACTER.supportsFistHands
    ? loadGlb(ASSETS.fistHands, { announce: false })
    : Promise.resolve(null);

  const characterGltf = await characterPromise;
  markBootTiming('characterLoaded');
  const meshy = characterGltf.scene;
  setBootPhase(`showing ${ACTIVE_CHARACTER.label}`);
  meshyRoot = normalizeCharacter(meshy);
  applyVanguardMaterialRecovery(meshyRoot);
  root.add(meshyRoot);
  setupPoseHandles();
  setupImportedAnimations(characterGltf);
  setMode('move');
  if (ACTIVE_CHARACTER.key === 'crimson') setDockOpen(true, 'model');
  setPoseState('rest');
  setViewMode(initialViewModeFromUrl());
  markBootReady();
  if (!ACTIVE_CHARACTER.supportsSaber) setToolMode('pose');
  statusEl.textContent = ACTIVE_CHARACTER.supportsSaber
    ? 'character visible; loading sabre and pose'
    : `${ACTIVE_CHARACTER.label} visible; pose handles ready`;

  applyMeshyPbrTextures(meshyRoot, { announce: false })
    .then(() => {
      document.body.dataset.pbrReady = '1';
    })
    .catch((error) => {
      document.body.dataset.pbrFailed = error?.message || String(error || 'unknown PBR error');
      console.warn('Meshy PBR texture load failed after boot', error);
    });

  Promise.all([sabrePromise, posePromise, fistHandsPromise])
    .then(([sabre, _posePresets, fistHands]) => {
      if (sabre) {
        markBootTiming('saberLoaded');
        sabreRoot = prepareSabre(sabre);
        root.add(sabreRoot);
        attachSaberToRightHand();
        markBootTiming('saberAttached');
      }
      if (fistHands) attachFistHandsToMeshy(fistHands);
      setPoseState(requestedPoseState);
      updateReviewReady();
      if (IS_CRIMSON_BVH_REVIEW) {
        statusEl.textContent = 'Experimental ORG BVH Idle · foot midpoint drift 4.37 cm · contact stabilization not applied';
      } else if (useManualAttackAuthoring() && poseState === 'attack1') {
        statusEl.textContent = 'Attack1 manual draft: blank Ready keys';
      } else if (attackPoseSequence && REQUESTED_CANDIDATE && isSequenceReviewState()) {
        statusEl.textContent = `${REQUESTED_ATTACK_LABEL} candidate preview: ${REQUESTED_CANDIDATE}; ${attackPoseFixedTime === null ? 'playing' : `${attackPoseCurrentTime.toFixed(3)}s`}`;
      } else if (REQUESTED_LOWBACKKICK_REVIEW) {
        statusEl.textContent = `LowBackKick candidate preview: ${REQUESTED_CANDIDATE}; not accepted repo truth`;
      } else if (REQUESTED_ATTACK_QUARANTINED) {
        statusEl.textContent = 'Attack1 quarantined: no accepted Attack1 bake is shipped; showing Ready fallback';
      } else {
        statusEl.textContent = poseState === 'rest'
          ? ACTIVE_CHARACTER.supportsSaber ? 'ready: tap the real sabre, then drag' : `${ACTIVE_CHARACTER.label}: pose handles ready`
          : `${POSE_STATE_LABELS[poseState] || 'Pose'} ready`;
      }
    })
    .catch((error) => {
      document.body.dataset.sabrePoseFailed = error?.message || String(error || 'unknown sabre/pose error');
      statusEl.textContent = `sabre, fist, or pose load failed: ${error?.message || error}`;
      console.error('Sabre, fist, or pose load failed after first visual', error);
    });
}

toolButtons.forEach((button) => {
  button.addEventListener('click', () => setToolMode(button.dataset.tool || 'saber'));
});

cycleCharacterButton?.addEventListener('click', () => {
  const currentIndex = CHARACTER_KEYS.indexOf(ACTIVE_CHARACTER.key);
  const nextKey = CHARACTER_KEYS[(Math.max(0, currentIndex) + 1) % CHARACTER_KEYS.length];
  switchModel(nextKey);
});

modelButtons.forEach((button) => {
  button.addEventListener('click', () => switchModel(button.dataset.modelKey));
});

cycleToolButton.addEventListener('click', () => setToolMode(toolMode === 'saber' ? 'pose' : 'saber'));

viewModeButtons.forEach((button) => {
  button.addEventListener('click', () => setViewMode(button.dataset.viewMode || 'orbit'));
});

cycleViewModeButton.addEventListener('click', () => setViewMode(viewMode === 'orbit' ? 'firstPerson' : 'orbit'));

fpvSettingsToggle.addEventListener('click', () => setFpvSettingsOpen(!fpvSettingsOpen));

for (const button of fpvNudgeButtons) {
  button.addEventListener('pointerdown', (event) => {
    startFpvNudge(button.dataset.fpvNudge, event);
    stopEvent(event);
  });
  button.addEventListener('pointerup', (event) => {
    stopFpvNudge();
    stopEvent(event);
  });
  button.addEventListener('pointercancel', stopFpvNudge);
  button.addEventListener('pointerleave', stopFpvNudge);
  button.addEventListener('lostpointercapture', stopFpvNudge);
}

fpvResetButton.addEventListener('click', () => resetFpvCameraSettings());
fpvCopyButton.addEventListener('click', () => {
  navigator.clipboard?.writeText(JSON.stringify(fpvSettingsExport(), null, 2)).catch(() => {});
  statusEl.textContent = 'fpv camera: copied';
});
fpvFovInput.addEventListener('input', () => setFpvFov(fpvFovInput.value));
attackReviewToggle.addEventListener('click', () => setAttackReviewOpen(!attackReviewOpen));
attackReviewClose.addEventListener('click', () => setAttackReviewOpen(false));
attackPlayButton.addEventListener('click', playAttackReview);
attackPauseButton.addEventListener('click', pauseAttackReview);
attackSaveKeyButton.addEventListener('click', saveManualAttackKey);
attackExportButton.addEventListener('click', () => {
  navigator.clipboard?.writeText(JSON.stringify(exportTransform(), null, 2)).catch(() => {});
  statusEl.textContent = 'Attack1 manual: animation export copied';
});
attackScrubInput.addEventListener('input', () => setAttackReviewTime(attackScrubInput.value));

poseStateButtons.forEach((button) => {
  button.addEventListener('click', () => setPoseState(button.dataset.poseState || 'rest'));
});

cyclePoseStateButton.addEventListener('click', () => {
  const order = activePoseStateOrder();
  const current = order.includes(poseState) ? poseState : 'rest';
  const next = order[(order.indexOf(current) + 1) % order.length];
  setPoseState(next);
});
cycleAnimationButton?.addEventListener('click', cycleImportedAnimation);

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
  const importedAnimationDelta = importedAnimationClock.getDelta();
  if (importedAnimationMixer && importedAnimationDelta > 0) {
    importedAnimationMixer.update(importedAnimationDelta);
    suppressImportedRootMotion();
  }
  updateSaberAttachmentProof();
  if (poseState === 'attack1' && manualAttackDraft && attackPoseFixedTime === null) {
    const elapsed = (performance.now() - (attackPoseStartedAt ?? performance.now())) / 1000;
    applyManualAttackFrameAt(elapsed);
  } else if (isSequenceReviewState() && attackPoseSequence) {
    const elapsed = attackPoseFixedTime ?? ((performance.now() - (attackPoseStartedAt ?? performance.now())) / 1000);
    applyAttackSequenceAt(elapsed);
  }
  if (viewMode === 'orbit') controls.update();
  else updateFirstPersonCamera();
  updatePoseHandles();
  renderer.render(scene, camera);
  if (!firstFrameRendered) {
    firstFrameRendered = true;
    document.body.dataset.firstFrame = '1';
    markBootTiming('firstFrame');
  }
  updateReviewReady();
  requestAnimationFrame(animate);
}

boot().catch((error) => {
  markBootFailed('load failed', error);
});

requestAnimationFrame(animate);

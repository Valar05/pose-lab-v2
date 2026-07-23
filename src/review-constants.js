import { CRIMSON_COMBAT_READY_VANGUARD_FRAME0_4_SEQUENCE } from './review-candidates/crimson-combat-ready-vanguard-frame0-4.js';

const CRIMSON_FRAME0_3_REJECTED_POSE_SHA = 'b9ec44d3d17527779334e372a79894b07cbd535c4af54927e0cc638f3b1b6c2f';
const CRIMSON_FRAME0_480EB888_REJECTED_POSE_SHA = 'b5ef5555ba060546f4d6dd3921f09cf0e4251dfac8a346d4db7f4f30858bd554';
export function crimsonFrame04ReviewStatus(sequence) {
  const source = sequence?.source || {};
  const runtimeAuthoring = source.runtimeAuthoring || {};
  const runtimeGates = runtimeAuthoring.gates || {};
  const runtimeViews = runtimeGates.silhouette?.views || {};
  const runtimeBladeDirection = runtimeAuthoring.bladeWorldDirection;
  const gatedBladeDirection = runtimeGates.blade?.actualWorldDirection;
  const hasAuthoredPose = source.exactAuthoredGlb === true
    && source.exactAuthoredBodyGlb === true
    && source.status === 'generated-visual-pending-candidate-parity'
    && /^[a-f0-9]{64}$/.test(source.poseSha256 || '')
    && /^[a-f0-9]{64}$/.test(source.authoredGlbSha256 || '')
    && source.poseSha256 !== CRIMSON_FRAME0_3_REJECTED_POSE_SHA
    && source.poseSha256 !== CRIMSON_FRAME0_480EB888_REJECTED_POSE_SHA
    && runtimeAuthoring.schema === 'pose-lab-v2-crimson-runtime-frame-zero-authoring-v1'
    && runtimeAuthoring.authoredGlb?.sha256 === source.authoredGlbSha256
    && runtimeAuthoring.authoredGlb?.animation === 'CrimsonRuntimeCombatReadyFrameZero'
    && runtimeAuthoring.authoredGlb?.channels?.length === 21
    && JSON.stringify(runtimeAuthoring.viewport) === JSON.stringify([986, 900])
    && runtimeGates.status === 'PASS'
    && runtimeGates.silhouette?.status === 'PASS'
    && ['center', 'left', 'right'].every((view) => runtimeViews[view]?.status === 'PASS')
    && Array.isArray(runtimeBladeDirection)
    && runtimeBladeDirection.length === 3
    && JSON.stringify(runtimeBladeDirection) === JSON.stringify(gatedBladeDirection);
  return hasAuthoredPose ? 'visual-pending' : 'authoring-red';
}

const CRIMSON_FRAME0_4_STATUS = crimsonFrame04ReviewStatus(CRIMSON_COMBAT_READY_VANGUARD_FRAME0_4_SEQUENCE);

export const SABER_GRIP_LOCAL = {
  position: [8.52296, 28.41254, -24.44467],
  rotationDeg: [32.35, 74.24, -174.11],
  scale: [46.62859, 46.62859, 46.62856],
};

export const SABRE_REVIEW_LOCAL_AXIS = [1, 0, 0];

export const CRIMSON_SABER_GRIP_LOCAL = {
  position: [12.38741, 13.39693, -1.51078],
  rotationDeg: [-15.898, 51.654, 83.103],
  scale: [1, 1, 1],
};

export const CRIMSON_SWORD_LOCAL = {
  position: [-1.98175, -1.31896, -7.90654],
  rotationDeg: [90, 30, 0],
  scale: [88, 88, 88],
};

export const CRIMSON_SWORD_REVIEW_LOCAL_AXIS = [0, 0, 1];

export const ATTACK1_REVIEW_CANDIDATES = {
  "crimson-light-attack1-vanguard-4": {
    module: "./review-candidates/crimson-light-attack1-vanguard-4.js",
    exportName: "CRIMSON_LIGHT_ATTACK1_VANGUARD_4_SEQUENCE",
    label: "Crimson light Attack1 v4 (rejected random-bone transfer)",
    characterKey: "crimson",
    status: "rejected",
  },
  "crimson-combat-ready-vanguard-frame0-1": {
    module: "./review-candidates/crimson-combat-ready-vanguard-frame0-1.js",
    exportName: "CRIMSON_COMBAT_READY_VANGUARD_FRAME0_1_SEQUENCE",
    label: "Crimson combat-ready frame zero 1 (rejected: upper-body collapse)",
    characterKey: "crimson",
    status: "rejected",
  },
  "crimson-combat-ready-vanguard-frame0-2": {
    module: "./review-candidates/crimson-combat-ready-vanguard-frame0-2.js",
    exportName: "CRIMSON_COMBAT_READY_VANGUARD_FRAME0_2_SEQUENCE",
    label: "Crimson combat-ready frame zero 2 (rejected: Blender basis exported as glTF local)",
    characterKey: "crimson",
    status: "rejected",
  },
  "crimson-combat-ready-vanguard-frame0-3": {
    module: "./review-candidates/crimson-combat-ready-vanguard-frame0-3.js",
    exportName: "CRIMSON_COMBAT_READY_VANGUARD_FRAME0_3_SEQUENCE",
    label: "Crimson combat-ready frame zero 3 (rejected: arms did not materially improve)",
    characterKey: "crimson",
    status: "rejected",
  },
  "crimson-combat-ready-vanguard-frame0-4": {
    module: "./review-candidates/crimson-combat-ready-vanguard-frame0-4.js",
    exportName: "CRIMSON_COMBAT_READY_VANGUARD_FRAME0_4_SEQUENCE",
    label: CRIMSON_FRAME0_4_STATUS === "visual-pending"
      ? "Crimson combat-ready frame zero 4 (runtime-authored; visual gate pending)"
      : "Crimson combat-ready frame zero 4 (authoring red: generated pose not committed)",
    characterKey: "crimson",
    status: CRIMSON_FRAME0_4_STATUS,
  },
  "attack1-candidate-1": {
    module: "./review-candidates/attack1-candidate-1.js",
    exportName: "ATTACK1_POSE_SEQUENCE",
    label: "Attack1 candidate 1",
  },
  "attack1-tip-match-1": {
    module: "./review-candidates/attack1-tip-match-1.js",
    exportName: "ATTACK1_TIP_MATCH_SEQUENCE",
    label: "Attack1 tip-match candidate 1 (failed diagnostic)",
  },
  "attack1-tip-basis-2": {
    module: "./review-candidates/attack1-tip-basis-2.js",
    exportName: "ATTACK1_TIP_BASIS_SEQUENCE",
    label: "Attack1 tip-basis candidate 2 (failed diagnostic)",
  },
  "attack1-joint-pinned-3": {
    module: "./review-candidates/attack1-joint-pinned-3.js",
    exportName: "ATTACK1_JOINT_PINNED_SEQUENCE",
    label: "Attack1 joint-pinned candidate 3",
  },
  "attack2-candidate-1": {
    module: "./review-candidates/attack2-candidate-1.js",
    exportName: "ATTACK2_POSE_SEQUENCE",
    label: "Attack2 candidate 1",
  },
  "fist-ready-candidate-1": {
    module: "./review-candidates/fist-ready-candidate-1.js",
    exportName: "FIST_READY_POSE_SEQUENCE",
    label: "FistReady candidate 1 (weaponless)",
  },
  "fist-attack1-candidate-1": {
    module: "./review-candidates/fist-attack1-candidate-1.js",
    exportName: "FIST_ATTACK1_POSE_SEQUENCE",
    label: "FistAttack1 candidate 1 (weaponless)",
  },
};

export const REVIEW_CAMERA_CONTRACT = {
  fov: 36,
  near: 0.01,
  far: 80,
  position: [2.8, 1.75, 4.2],
  target: [0, 0.95, 0],
  viewport: [390, 844],
};

export const DAVIN_IDLE_REVIEW_CANDIDATES = {
  "davin-idle-screenshot-1": {
    module: "./review-candidates/davin-idle-screenshot-1.js",
    exportName: "DAVIN_IDLE_SCREENSHOT_1",
    label: "Davin screenshot idle 1 (red diagnostic)",
  },
};

export const LOWBACKKICK_REVIEW_CANDIDATES = {
  "davin-lowbackkick-ares-transfer-1": {
    module: "./review-candidates/davin-lowbackkick-ares-transfer-1.js",
    exportName: "DAVIN_LOWBACKKICK_ARES_TRANSFER_1",
    label: "Davin LowBackKick from Ares SF2 transfer 1",
  },
};

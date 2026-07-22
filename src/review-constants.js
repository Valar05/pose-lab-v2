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
    label: "Crimson light Attack1 v4 (planted-foot visual candidate)",
    characterKey: "crimson",
    status: "visual-pending",
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

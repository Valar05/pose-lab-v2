export const SABER_GRIP_LOCAL = {
  position: [8.52296, 28.41254, -24.44467],
  rotationDeg: [32.35, 74.24, -174.11],
  scale: [46.62859, 46.62859, 46.62856],
};

export const SABRE_REVIEW_LOCAL_AXIS = [1, 0, 0];

export const ATTACK1_REVIEW_CANDIDATES = {
  "attack1-candidate-1": {
    module: "./review-candidates/attack1-candidate-1.js",
    exportName: "ATTACK1_POSE_SEQUENCE",
    label: "Attack1 candidate 1",
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

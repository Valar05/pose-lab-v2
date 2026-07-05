export const READY_POSE_PRESET = {
  "schema": "pose-lab-v2-ready-pose-v1",
  "label": "OneHandReady orientation retargeted from FPSPlayer",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "meshy": "./public/assets/meshy/meshy_apose_walking_with_skin.glb",
    "clip": "OneHandReady",
    "sampleTime": 1.25,
    "projectionFrame": "ShoulderCenter->Spine02",
    "method": "orientation-first-retarget-with-pins",
    "retargetedBones": [
      "RightArm",
      "RightForeArm",
      "RightHand",
      "LeftArm",
      "LeftForeArm",
      "LeftHand"
    ]
  },
  "bones": {
    "Spine02": [
      -0.065296,
      0.002273,
      0.007842,
      0.997833
    ],
    "Spine01": [
      0,
      0,
      0,
      1
    ],
    "Spine": [
      -0.063604,
      -0.000425,
      0.00073,
      0.997975
    ],
    "LeftShoulder": [
      0.522128,
      0.564557,
      -0.472393,
      0.430699
    ],
    "LeftArm": [
      0.479385,
      0.32113,
      0.576089,
      0.578953
    ],
    "LeftForeArm": [
      -0.582117,
      0.084839,
      0.177869,
      0.788863
    ],
    "LeftHand": [
      0.319044,
      0.206595,
      0.165233,
      0.91007
    ],
    "RightShoulder": [
      0.521987,
      -0.564688,
      0.46633,
      0.437256
    ],
    "RightArm": [
      -0.631431,
      0.268394,
      0.431965,
      -0.585376
    ],
    "RightForeArm": [
      -0.669741,
      -0.440047,
      0.282959,
      0.52701
    ],
    "RightHand": [
      -0.361782,
      -0.458697,
      -0.329796,
      0.741583
    ],
    "neck": [
      0.063633,
      -0.003411,
      0.00246,
      0.997965
    ],
    "Head": [
      0.268452,
      -0.000043,
      -0.003185,
      0.963288
    ]
  }
};

export const FIST_READY_POSE_PRESET = {
  "schema": "pose-lab-v2-fist-ready-pose-v1",
  "label": "FistReady orientation retargeted from FPSPlayer",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "meshy": "./public/assets/meshy/meshy_apose_walking_with_skin.glb",
    "clip": "FistReady",
    "sampleTime": 1.25,
    "projectionFrame": "ShoulderCenter->Spine02",
    "method": "orientation-first-retarget-with-joint-and-fpv-screen-pins",
    "retargetedBones": [
      "RightArm",
      "RightForeArm",
      "RightHand",
      "LeftArm",
      "LeftForeArm",
      "LeftHand"
    ],
    "fpvScreenPinned": {
      "sourceCamera": "FPSPlayer.Camera",
      "targetCamera": "Meshy head-forward FPV",
      "right": {
        "target": {
          "RightForeArm": [
            523.697,
            291.716
          ],
          "RightHand": [
            633.422,
            808.429
          ]
        },
        "actual": {
          "RightForeArm": [
            808.997,
            347.307
          ],
          "RightHand": [
            632.795,
            808.093
          ]
        },
        "scorePx": 291.378
      },
      "left": {
        "target": {
          "LeftForeArm": [
            -290.14,
            486.36
          ],
          "LeftHand": [
            -130.079,
            944.694
          ]
        },
        "actual": {
          "LeftForeArm": [
            -563.935,
            496.535
          ],
          "LeftHand": [
            -131.474,
            944.324
          ]
        },
        "scorePx": 275.428
      }
    }
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
      -0.402431,
      0.606438,
      0.571216,
      0.379466
    ],
    "LeftForeArm": [
      -0.695448,
      -0.268381,
      0.460442,
      0.481993
    ],
    "LeftHand": [
      0.002026,
      0.460039,
      0.274099,
      0.844529
    ],
    "RightShoulder": [
      0.521987,
      -0.564688,
      0.46633,
      0.437256
    ],
    "RightArm": [
      0.560643,
      0.451335,
      0.60813,
      -0.334895
    ],
    "RightForeArm": [
      -0.672976,
      -0.697422,
      -0.233658,
      0.078163
    ],
    "RightHand": [
      -0.399564,
      -0.269037,
      -0.401453,
      0.778976
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

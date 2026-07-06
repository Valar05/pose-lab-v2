export const FIST_READY_POSE_PRESET = {
  "schema": "pose-lab-v2-fist-ready-pose-v1",
  "label": "FistReady orientation retargeted from FPSPlayer",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "meshy": "./public/assets/meshy/meshy_apose_walking_with_skin.glb",
    "clip": "FistReady",
    "sampleTime": 1.25,
    "projectionFrame": "FPSPlayer.Camera->Meshy FPV camera",
    "method": "orientation-first-retarget-with-world-joint-pins",
    "retargetedBones": [
      "RightArm",
      "RightForeArm",
      "RightHand",
      "LeftArm",
      "LeftForeArm",
      "LeftHand"
    ],
    "jointPinned": {
      "sourceJoints": {
        "right": [
          "Arm.R",
          "Forearm.R",
          "Hand.R"
        ],
        "left": [
          "Arm.L",
          "Forearm.L",
          "Hand.L"
        ]
      },
      "targetJoints": {
        "right": [
          "RightArm",
          "RightForeArm",
          "RightHand"
        ],
        "left": [
          "LeftArm",
          "LeftForeArm",
          "LeftHand"
        ]
      },
      "targetSpace": "runtime-normalized Meshy world mapped from FPS FistReady camera space",
      "solverAuthoredBones": {
        "right": [
          "RightShoulder",
          "RightArm",
          "RightForeArm"
        ],
        "left": [
          "LeftShoulder",
          "LeftArm",
          "LeftForeArm"
        ]
      },
      "report": {
        "right": {
          "shoulder": [
            0.833639,
            0.353627,
            0.419819,
            0.061206
          ],
          "upper": [
            -0.70073,
            0.067293,
            0.403715,
            -0.584349
          ],
          "lower": [
            -0.612094,
            -0.621631,
            -0.114835,
            0.475109
          ],
          "score": 0.144754,
          "targetUpperWorld": [
            0.04919,
            1.33399,
            0.07451
          ],
          "actualUpperWorld": [
            0.05336,
            1.24247,
            0.10611
          ],
          "upperWorldError": 0.09691,
          "targetElbowWorld": [
            0.20582,
            1.33452,
            -0.04447
          ],
          "actualElbowWorld": [
            0.20401,
            1.37469,
            -0.02249
          ],
          "elbowWorldError": 0.04583,
          "targetWristWorld": [
            0.22115,
            1.57144,
            0.10286
          ],
          "actualWristWorld": [
            0.22093,
            1.56986,
            0.10164
          ],
          "wristWorldError": 0.00202,
          "shoulderRotationFromInputDeg": 125.484,
          "upperRotationFromInputDeg": 35.635,
          "lowerRotationFromInputDeg": 33.484
        },
        "left": {
          "shoulder": [
            0.154338,
            -0.249392,
            -0.83361,
            -0.468057
          ],
          "upper": [
            0.564078,
            0.529408,
            -0.259818,
            0.57796
          ],
          "lower": [
            -0.334154,
            0.575012,
            0.546425,
            0.50904
          ],
          "score": 0.143037,
          "targetUpperWorld": [
            -0.15511,
            1.37134,
            0.09034
          ],
          "actualUpperWorld": [
            -0.10577,
            1.29731,
            0.07264
          ],
          "upperWorldError": 0.09071,
          "targetElbowWorld": [
            -0.31148,
            1.44796,
            -0.00112
          ],
          "actualElbowWorld": [
            -0.27485,
            1.47719,
            0.02098
          ],
          "elbowWorldError": 0.05181,
          "targetWristWorld": [
            -0.17782,
            1.65694,
            0.12747
          ],
          "actualWristWorld": [
            -0.17787,
            1.65668,
            0.12703
          ],
          "wristWorldError": 0.00051,
          "shoulderRotationFromInputDeg": 164.831,
          "upperRotationFromInputDeg": 89.286,
          "lowerRotationFromInputDeg": 8.254
        }
      }
    },
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
            526.738,
            363.86
          ],
          "RightHand": [
            631.62,
            803.397
          ]
        },
        "scorePx": 77.554
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
            -251.181,
            547.079
          ],
          "LeftHand": [
            -129.555,
            942.943
          ]
        },
        "scorePx": 73.971
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
      0.154338,
      -0.249392,
      -0.83361,
      -0.468057
    ],
    "LeftArm": [
      0.564078,
      0.529408,
      -0.259818,
      0.57796
    ],
    "LeftForeArm": [
      -0.334154,
      0.575012,
      0.546425,
      0.50904
    ],
    "LeftHand": [
      -0.186291,
      -0.909138,
      -0.201073,
      -0.313583
    ],
    "RightShoulder": [
      0.833639,
      0.353627,
      0.419819,
      0.061206
    ],
    "RightArm": [
      -0.70073,
      0.067293,
      0.403715,
      -0.584349
    ],
    "RightForeArm": [
      -0.612094,
      -0.621631,
      -0.114835,
      0.475109
    ],
    "RightHand": [
      0.139327,
      -0.806588,
      -0.549002,
      0.169116
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

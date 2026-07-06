export const FIST_READY_POSE_PRESET = {
  "schema": "pose-lab-v2-fist-ready-pose-v1",
  "label": "FistReady orientation retargeted from FPSPlayer",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "meshy": "./public/assets/meshy/meshy_apose_walking_with_skin.glb",
    "clip": "FistReady",
    "sampleTime": 1.25,
    "projectionFrame": "ShoulderCenter->Spine02",
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
      "targetSpace": "runtime-normalized Meshy world: elbow/wrist from FPS FistReady limb vectors anchored at Meshy arm joint",
      "solverAuthoredBones": {
        "right": [
          "RightArm",
          "RightForeArm"
        ],
        "left": [
          "LeftArm",
          "LeftForeArm"
        ]
      },
      "report": {
        "right": {
          "sourceUpperWorldVector": [
            -0.16272,
            -0.11407,
            -0.0523
          ],
          "sourceForeWorldVector": [
            -0.01714,
            0.03537,
            0.28926
          ],
          "targetUpperWorldVector": [
            -0.19604,
            -0.13431,
            -0.01567
          ],
          "targetForeWorldVector": [
            0.03068,
            0.04109,
            0.22617
          ],
          "shoulderWorld": [
            -0.21898,
            1.35825,
            -0.00191
          ],
          "upper": [
            -0.292031,
            0.117644,
            0.036136,
            -0.948458
          ],
          "lower": [
            -0.794854,
            -0.591836,
            0.060242,
            0.119619
          ],
          "score": 0.000897,
          "targetElbowWorld": [
            -0.41502,
            1.22394,
            -0.01758
          ],
          "actualElbowWorld": [
            -0.41528,
            1.2243,
            -0.0174
          ],
          "targetWristWorld": [
            -0.38434,
            1.26502,
            0.20859
          ],
          "actualWristWorld": [
            -0.38459,
            1.26483,
            0.20887
          ],
          "elbowWorldError": 0.00048,
          "wristWorldError": 0.00042,
          "upperRotationFromInputDeg": 86.247,
          "lowerRotationFromInputDeg": 75.303
        },
        "left": {
          "sourceUpperWorldVector": [
            0.16406,
            -0.11928,
            0.03292
          ],
          "sourceForeWorldVector": [
            -0.14062,
            0.02908,
            0.25415
          ],
          "targetUpperWorldVector": [
            0.20612,
            -0.14507,
            0.00913
          ],
          "targetForeWorldVector": [
            -0.07032,
            0.0348,
            0.21614
          ],
          "shoulderWorld": [
            0.22274,
            1.36581,
            -0.00173
          ],
          "upper": [
            0.233574,
            0.482285,
            0.198584,
            0.820615
          ],
          "lower": [
            -0.62695,
            -0.061414,
            0.508328,
            0.587166
          ],
          "score": 0.000505,
          "targetElbowWorld": [
            0.42886,
            1.22074,
            0.00739
          ],
          "actualElbowWorld": [
            0.4289,
            1.22081,
            0.0076
          ],
          "targetWristWorld": [
            0.35854,
            1.25554,
            0.22353
          ],
          "actualWristWorld": [
            0.35829,
            1.25549,
            0.22366
          ],
          "elbowWorldError": 0.00022,
          "wristWorldError": 0.00029,
          "upperRotationFromInputDeg": 69.777,
          "lowerRotationFromInputDeg": 77.824
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
            -955.592,
            -43.46
          ],
          "RightHand": [
            1475.095,
            542.978
          ]
        },
        "scorePx": 2399.326
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
            1644,
            -129.921
          ],
          "LeftHand": [
            -853.894,
            540.786
          ]
        },
        "scorePx": 2858.835
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
      0.233574,
      0.482285,
      0.198584,
      0.820615
    ],
    "LeftForeArm": [
      -0.62695,
      -0.061414,
      0.508328,
      0.587166
    ],
    "LeftHand": [
      -0.059761,
      0.258009,
      0.267513,
      0.926443
    ],
    "RightShoulder": [
      0.521987,
      -0.564688,
      0.46633,
      0.437256
    ],
    "RightArm": [
      -0.292031,
      0.117644,
      0.036136,
      -0.948458
    ],
    "RightForeArm": [
      -0.794854,
      -0.591836,
      0.060242,
      0.119619
    ],
    "RightHand": [
      -0.564714,
      0.418405,
      0.043738,
      0.710016
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

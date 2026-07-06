export const FIST_READY_POSE_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "label": "FistReady candidate 1",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "meshy": "./public/assets/meshy/meshy_apose_walking_with_skin.glb",
    "clip": "FistReady",
    "duration": 1.25,
    "keyCount": 1,
    "method": "orientation-first-retarget-with-world-joint-pins",
    "weaponless": true,
    "note": "Weaponless FistReady baseline for reviewing FPSPlayer fist-family pose before FistAttack1.",
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
  "primeKeys": {
    "ready": 0
  },
  "frames": [
    {
      "label": "ready",
      "time": 0,
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
    }
  ],
  "guardReport": {
    "quarantine": true,
    "weaponless": true,
    "fistReadyBaseline": {
      "status": "REVIEW",
      "rule": "FistAttack1 must use this FistReady target basis, not OneHandReady. FistReady is additionally pinned toward FPS FPV forearm/hand screen positions."
    }
  }
};

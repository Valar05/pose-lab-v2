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

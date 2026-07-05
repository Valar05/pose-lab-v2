export const ATTACK1_POSE_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "label": "Attack1 candidate 1",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "meshy": "./public/assets/meshy/meshy_apose_walking_with_skin.glb",
    "clip": "OneHandAttack1",
    "duration": 1.25,
    "keyCount": 6,
    "method": "meshy-authored-from-fps-handr-reference",
    "retargetedBones": [],
    "authoredBones": [
      "RightArm",
      "RightForeArm",
      "RightHand",
      "LeftArm",
      "LeftForeArm",
      "LeftHand"
    ],
    "fpsReference": {
      "generatedDir": "generated/fps-reference/attack1",
      "note": "FPS key render/description and HandR angular travel are reference only; no FPS quaternion is copied into Meshy.",
      "descriptions": {
        "start": "ready-like source start; weapon begins the attack path",
        "anticipation": "right hand moves viewer-right; left hand moves viewer-right; weapon tip trails left of hilt",
        "contact": "right hand moves viewer-right; left hand moves viewer-right; weapon tip leads right of hilt",
        "followThrough": "right hand mostly holds; left hand mostly holds; weapon tip leads right of hilt",
        "recoil": "right hand mostly holds; left hand mostly holds; weapon tip leads right of hilt",
        "end": "right hand mostly holds; left hand mostly holds; weapon tip leads right of hilt"
      },
      "sourceMotion": {
        "ArmR": {
          "keyedQuaternionTrack": true,
          "keyCount": 31,
          "travelDeg": 254.175,
          "primeDeltasFromStartDeg": {
            "start": 0,
            "anticipation": 99.615,
            "contact": 117.383,
            "followThrough": 3.252,
            "recoil": 0,
            "end": 0
          }
        },
        "ForearmR": {
          "keyedQuaternionTrack": true,
          "keyCount": 31,
          "travelDeg": 233.154,
          "primeDeltasFromStartDeg": {
            "start": 0,
            "anticipation": 108.577,
            "contact": 92.133,
            "followThrough": 17.507,
            "recoil": 17.935,
            "end": 17.935
          }
        },
        "HandR": {
          "keyedQuaternionTrack": true,
          "keyCount": 31,
          "travelDeg": 212.155,
          "primeDeltasFromStartDeg": {
            "start": 0,
            "anticipation": 53.966,
            "contact": 72.053,
            "followThrough": 35.914,
            "recoil": 37.775,
            "end": 37.775
          }
        },
        "WeaponR": {
          "keyedQuaternionTrack": true,
          "keyCount": 31,
          "travelDeg": 91.424,
          "primeDeltasFromStartDeg": {
            "start": 0,
            "anticipation": 24.878,
            "contact": 45.588,
            "followThrough": 0.055,
            "recoil": 0,
            "end": 0
          }
        },
        "ArmL": {
          "keyedQuaternionTrack": true,
          "keyCount": 31,
          "travelDeg": 81.055,
          "primeDeltasFromStartDeg": {
            "start": 0,
            "anticipation": 6.728,
            "contact": 25.259,
            "followThrough": 0.869,
            "recoil": 0,
            "end": 0
          }
        },
        "ForearmL": {
          "keyedQuaternionTrack": true,
          "keyCount": 31,
          "travelDeg": 0,
          "primeDeltasFromStartDeg": {
            "start": 0,
            "anticipation": 0,
            "contact": 0,
            "followThrough": 0,
            "recoil": 0,
            "end": 0
          }
        },
        "HandL": {
          "keyedQuaternionTrack": true,
          "keyCount": 31,
          "travelDeg": 43.621,
          "primeDeltasFromStartDeg": {
            "start": 0,
            "anticipation": 16.475,
            "contact": 15.616,
            "followThrough": 0.538,
            "recoil": 0,
            "end": 0
          }
        }
      }
    },
    "signatureWristTwist": {
      "bakedRightHandRotationTravelDeg": 260,
      "bakedRightForeArmRotationTravelDeg": 41.643,
      "rightHandPrimaryDriver": true,
      "rightHandSaberAxisLocal": [
        -0.270175,
        -0.598948,
        0.753835
      ]
    }
  },
  "primeKeys": {
    "start": 0,
    "anticipation": 0.25,
    "contact": 0.458333,
    "followThrough": 0.75,
    "recoil": 1,
    "end": 1.25
  },
  "guardReport": {
    "authoredGuard": {
      "status": "PASS",
      "rule": "Meshy-authored Attack1 starts/ends at Ready; FPS HandR is the primary reference signal; baked Meshy RightHand rotation dominates arm travel; FPS blade tip never drops below hilt",
      "sourceMotion": {
        "HandR": {
          "keyedQuaternionTrack": true,
          "keyCount": 31,
          "travelDeg": 212.155,
          "primeDeltasFromStartDeg": {
            "start": 0,
            "anticipation": 53.966,
            "contact": 72.053,
            "followThrough": 35.914,
            "recoil": 37.775,
            "end": 37.775
          }
        },
        "WeaponR": {
          "keyedQuaternionTrack": true,
          "keyCount": 31,
          "travelDeg": 91.424,
          "primeDeltasFromStartDeg": {
            "start": 0,
            "anticipation": 24.878,
            "contact": 45.588,
            "followThrough": 0.055,
            "recoil": 0,
            "end": 0
          }
        },
        "sourceWeaponSamples": {
          "start": {
            "hiltScreen": [
              106.662,
              357.741
            ],
            "tipScreen": [
              74.756,
              236.949
            ],
            "tipMinusHilt": [
              -31.906,
              -120.792
            ]
          },
          "anticipation": {
            "hiltScreen": [
              114.206,
              384.684
            ],
            "tipScreen": [
              103.277,
              382.794
            ],
            "tipMinusHilt": [
              -10.929,
              -1.89
            ]
          },
          "contact": {
            "hiltScreen": [
              197.23,
              389.239
            ],
            "tipScreen": [
              362.064,
              347.196
            ],
            "tipMinusHilt": [
              164.834,
              -42.043
            ]
          },
          "followThrough": {
            "hiltScreen": [
              116.154,
              364.636
            ],
            "tipScreen": [
              153.764,
              296.257
            ],
            "tipMinusHilt": [
              37.61,
              -68.379
            ]
          },
          "recoil": {
            "hiltScreen": [
              116.825,
              363.244
            ],
            "tipScreen": [
              158.275,
              295.808
            ],
            "tipMinusHilt": [
              41.45,
              -67.436
            ]
          },
          "end": {
            "hiltScreen": [
              116.825,
              363.244
            ],
            "tipScreen": [
              158.275,
              295.808
            ],
            "tipMinusHilt": [
              41.45,
              -67.436
            ]
          }
        },
        "sourceTipNeverDropsBelowHilt": true
      },
      "bakedMotion": {
        "bakedRightHandTravelDeg": 260,
        "bakedRightForeArmTravelDeg": 41.643,
        "bakedRightArmTravelDeg": 137.843,
        "rightHandSaberAxisLocal": [
          -0.270175,
          -0.598948,
          0.753835
        ]
      },
      "anticipation": {
        "sourceRightHandMovesRightInFpvPx": 14.976,
        "sourceLeftHandMovesRightInFpvPx": 37.289,
        "sourceSabreTipLeftOfHiltPx": 10.929,
        "sourceTipMinusHiltY": -1.89,
        "sourceContactTipMinusHiltY": -42.043
      },
      "failures": []
    },
    "readyEndpointContract": {
      "endpointBones": [
        "Spine02",
        "Spine01",
        "Spine",
        "LeftShoulder",
        "LeftArm",
        "LeftForeArm",
        "LeftHand",
        "RightShoulder",
        "RightArm",
        "RightForeArm",
        "RightHand",
        "neck",
        "Head"
      ],
      "firstMatchesReady": true,
      "lastMatchesReady": true
    }
  },
  "frames": [
    {
      "time": 0,
      "label": "start",
      "note": "accepted Ready baseline",
      "rightHandTwistDeg": 0,
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
          0.522129,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          0.100441,
          0.437689,
          0.552189,
          0.702444
        ],
        "LeftForeArm": [
          -0.517448,
          0.281281,
          0.327324,
          0.73891
        ],
        "LeftHand": [
          -0.086945,
          -0.542548,
          0.130476,
          0.825263
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
          -0.3621,
          0.455331,
          -0.030282,
          0.812798
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
    },
    {
      "time": 0.25,
      "label": "anticipation",
      "note": "authored from visual review: wind up to viewer-right near screen edge; HandR twists so the sabre trails left, not top-right",
      "rightHandTwistDeg": -54,
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
          0.522129,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          0.132864,
          0.347476,
          0.403912,
          0.83574
        ],
        "LeftForeArm": [
          -0.512219,
          0.241997,
          0.325477,
          0.757056
        ],
        "LeftHand": [
          -0.063197,
          -0.545824,
          0.094354,
          0.830168
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.596175,
          0.266099,
          0.649151,
          -0.390346
        ],
        "RightForeArm": [
          -0.630036,
          -0.499357,
          0.301237,
          0.512791
        ],
        "RightHand": [
          -0.370534,
          0.499079,
          -0.459459,
          0.634447
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
    },
    {
      "time": 0.458333,
      "label": "contact",
      "note": "authored from visual review: strike back to viewer-left; opposite HandR rotation from anticipation; left arm exits the FPV frame",
      "rightHandTwistDeg": 76,
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
          0.522129,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          0.0935,
          0.661938,
          0.673284,
          0.315888
        ],
        "LeftForeArm": [
          -0.52259,
          0.394392,
          0.319992,
          0.684807
        ],
        "LeftHand": [
          -0.1339,
          -0.532905,
          0.201906,
          0.810751
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.681331,
          0.253467,
          0.140716,
          -0.672117
        ],
        "RightForeArm": [
          -0.714522,
          -0.349472,
          0.257486,
          0.548662
        ],
        "RightHand": [
          -0.22038,
          0.232177,
          0.562625,
          0.76222
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
    },
    {
      "time": 0.75,
      "label": "followThrough",
      "note": "follow-through inherits the contact-side leftward strike path while the HandR-driven blade stays owned by the hand",
      "rightHandTwistDeg": 42,
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
          0.522129,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          0.077994,
          0.590593,
          0.659642,
          0.458245
        ],
        "LeftForeArm": [
          -0.52402,
          0.355335,
          0.321451,
          0.704137
        ],
        "LeftHand": [
          -0.119905,
          -0.536228,
          0.180614,
          0.815758
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.662669,
          0.262256,
          0.244118,
          -0.657645
        ],
        "RightForeArm": [
          -0.702869,
          -0.376753,
          0.265431,
          0.541829
        ],
        "RightHand": [
          -0.300238,
          0.351379,
          0.313115,
          0.829668
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
    },
    {
      "time": 1,
      "label": "recoil",
      "note": "recoil settles toward Ready while preserving visible hand-driven blade ownership",
      "rightHandTwistDeg": 20,
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
          0.522129,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          0.087009,
          0.481729,
          0.592161,
          0.640087
        ],
        "LeftForeArm": [
          -0.520495,
          0.298687,
          0.324636,
          0.731083
        ],
        "LeftHand": [
          -0.086945,
          -0.542548,
          0.130476,
          0.825263
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.64449,
          0.260041,
          0.377192,
          -0.612157
        ],
        "RightForeArm": [
          -0.681993,
          -0.418944,
          0.280516,
          0.529795
        ],
        "RightHand": [
          -0.338277,
          0.412698,
          0.135598,
          0.834783
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
    },
    {
      "time": 1.25,
      "label": "end",
      "note": "returns to accepted Ready baseline",
      "rightHandTwistDeg": 0,
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
          0.522129,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          0.100441,
          0.437689,
          0.552189,
          0.702444
        ],
        "LeftForeArm": [
          -0.517448,
          0.281281,
          0.327324,
          0.73891
        ],
        "LeftHand": [
          -0.086945,
          -0.542548,
          0.130476,
          0.825263
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
          -0.3621,
          0.455331,
          -0.030282,
          0.812798
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
  ]
};

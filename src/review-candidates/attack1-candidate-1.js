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
      "bakedRightHandRotationTravelDeg": 179.999,
      "bakedRightForeArmRotationTravelDeg": 20.608,
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
        "bakedRightHandTravelDeg": 179.999,
        "bakedRightForeArmTravelDeg": 20.608,
        "bakedRightArmTravelDeg": 58.173,
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
      "note": "FPS reference anticipation: both hands move right in FPV; HandR is the primary driver; sabre tip trails left and stays above hilt",
      "rightHandTwistDeg": 54,
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
          0.111338,
          0.396355,
          0.491502,
          0.767419
        ],
        "LeftForeArm": [
          -0.513979,
          0.263867,
          0.329802,
          0.746613
        ],
        "LeftHand": [
          -0.077463,
          -0.543983,
          0.116053,
          0.827414
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.616879,
          0.265638,
          0.532293,
          -0.515325
        ],
        "RightForeArm": [
          -0.654086,
          -0.465178,
          0.291355,
          0.520475
        ],
        "RightHand": [
          -0.274733,
          0.312327,
          0.405496,
          0.81397
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
      "note": "FPS reference contact: HandR carries the slash; sabre tip leads right and remains above hilt",
      "rightHandTwistDeg": 90,
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
          0.092543,
          0.464966,
          0.579531,
          0.662862
        ],
        "LeftForeArm": [
          -0.517754,
          0.292248,
          0.32921,
          0.733582
        ],
        "LeftHand": [
          -0.0964,
          -0.540948,
          0.144859,
          0.82286
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.647246,
          0.261139,
          0.354795,
          -0.622094
        ],
        "RightForeArm": [
          -0.686459,
          -0.409469,
          0.268834,
          0.537437
        ],
        "RightHand": [
          -0.181437,
          0.176531,
          0.652187,
          0.714542
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
      "note": "FPS reference follow-through: right hand rotation carries the blade past contact without dropping the tip below the hilt",
      "rightHandTwistDeg": 36,
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
          0.093896,
          0.454357,
          0.5666,
          0.680961
        ],
        "LeftForeArm": [
          -0.517754,
          0.292248,
          0.32921,
          0.733582
        ],
        "LeftHand": [
          -0.091676,
          -0.541768,
          0.137673,
          0.824093
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.64081,
          0.26513,
          0.382947,
          -0.610263
        ],
        "RightForeArm": [
          -0.678311,
          -0.424879,
          0.275882,
          0.532222
        ],
        "RightHand": [
          -0.311773,
          0.369487,
          0.265574,
          0.834115
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
      "rightHandTwistDeg": 24,
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
          0.102622,
          0.427219,
          0.537877,
          0.719472
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
          -0.623316,
          0.272437,
          0.468652,
          -0.563578
        ],
        "RightForeArm": [
          -0.660756,
          -0.454961,
          0.290062,
          0.521801
        ],
        "RightHand": [
          -0.33225,
          0.402618,
          0.168439,
          0.836144
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

export const ATTACK1_POSE_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "label": "Attack1 candidate 1",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "meshy": "./public/assets/meshy/meshy_apose_walking_with_skin.glb",
    "clip": "OneHandAttack1",
    "duration": 1.25,
    "keyCount": 8,
    "method": "meshy-manual-user-anticipation-contact-with-generated-recovery",
    "retargetedBones": [],
    "authoredBones": [
      "Spine02",
      "RightArm",
      "RightForeArm",
      "RightHand",
      "LeftArm",
      "LeftForeArm"
    ],
    "generatedBones": {
      "anticipationHold": "duplicate(anticipation)",
      "contactHold": "duplicate(contact)",
      "followThrough": "slerp(contact, ready, 0.18)",
      "recoil": "slerp(contact, ready, 0.68)",
      "end": "ready"
    },
    "fpsReference": {
      "generatedDir": "generated/fps-reference/attack1",
      "note": "FPS key render/description and HandR angular travel are reference only. Anticipation/contact came from user manual authoring; generated recovery keys are slerped toward Ready.",
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
      "bakedRightHandRotationTravelDeg": 284.832,
      "bakedRightForeArmRotationTravelDeg": 293.428,
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
    "anticipation": 0.18,
    "anticipationHold": 0.3,
    "contact": 0.38,
    "contactHold": 0.5,
    "followThrough": 0.7,
    "recoil": 0.95,
    "end": 1.25
  },
  "guardReport": {
    "authoredGuard": {
      "status": "PASS",
      "rule": "Manual Attack1 candidate starts/ends at Ready; user anticipation/contact are preserved; generated recovery returns toward Ready; FPS blade tip reference never drops below hilt",
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
        "bakedRightHandTravelDeg": 284.832,
        "bakedRightForeArmTravelDeg": 293.428,
        "bakedRightArmTravelDeg": 85.134,
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
      "generated": false,
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
      "time": 0.18,
      "label": "anticipation",
      "note": "user-authored manual key: anticipation keeps Ready base, adjusts LeftForeArm, RightForeArm, and RightHand so the sabre trails left",
      "generated": false,
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
          -0.579859,
          0.274347,
          0.40318,
          0.652643
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
          0.505157,
          0.141278,
          -0.800455,
          -0.290048
        ],
        "RightHand": [
          -0.346474,
          0.084827,
          -0.383407,
          0.851915
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
      "time": 0.3,
      "label": "anticipationHold",
      "note": "SF2-style moving read hold: keep the user-authored anticipation visible before the snap",
      "generated": false,
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
          -0.579859,
          0.274347,
          0.40318,
          0.652643
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
          0.505157,
          0.141278,
          -0.800455,
          -0.290048
        ],
        "RightHand": [
          -0.346474,
          0.084827,
          -0.383407,
          0.851915
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
      "time": 0.38,
      "label": "contact",
      "note": "user-authored manual key: contact drives the strike with Spine02, LeftArm, RightArm, RightForeArm, and RightHand",
      "generated": false,
      "bones": {
        "Spine02": [
          -0.369923,
          -0.032504,
          0.083378,
          0.924742
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
          -0.348211,
          -0.80149,
          0.141502,
          -0.465123
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
          0.463915,
          -0.355768,
          -0.697378,
          0.414579
        ],
        "RightForeArm": [
          -0.543052,
          -0.505096,
          -0.289738,
          0.604999
        ],
        "RightHand": [
          0.126043,
          0.905519,
          -0.06231,
          0.400332
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
      "time": 0.5,
      "label": "contactHold",
      "note": "SF2-style impact hold: keep the user-authored contact readable instead of passing through it",
      "generated": false,
      "bones": {
        "Spine02": [
          -0.369923,
          -0.032504,
          0.083378,
          0.924742
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
          -0.348211,
          -0.80149,
          0.141502,
          -0.465123
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
          0.463915,
          -0.355768,
          -0.697378,
          0.414579
        ],
        "RightForeArm": [
          -0.543052,
          -0.505096,
          -0.289738,
          0.604999
        ],
        "RightHand": [
          0.126043,
          0.905519,
          -0.06231,
          0.400332
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
      "time": 0.7,
      "label": "followThrough",
      "note": "generated from user contact toward Ready; overcommitted follow-through stays close to contact before recovery",
      "generated": true,
      "bones": {
        "Spine02": [
          -0.317065,
          -0.026393,
          0.070205,
          0.945434
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
          -0.319138,
          -0.776879,
          0.008192,
          -0.542718
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
          0.499492,
          -0.343329,
          -0.65567,
          0.450255
        ],
        "RightForeArm": [
          -0.582431,
          -0.50678,
          -0.188409,
          0.607001
        ],
        "RightHand": [
          0.034699,
          0.861403,
          -0.059064,
          0.503282
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
      "time": 0.95,
      "label": "recoil",
      "note": "generated from user contact toward Ready; recoil settles but remains on the same hand-owned path",
      "generated": true,
      "bones": {
        "Spine02": [
          -0.165102,
          -0.009008,
          0.032493,
          0.9857
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
          -0.199132,
          -0.609371,
          -0.352765,
          -0.681594
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
          0.586247,
          -0.300988,
          -0.525186,
          0.538424
        ],
        "RightForeArm": [
          -0.654537,
          -0.480213,
          0.100936,
          0.575142
        ],
        "RightHand": [
          -0.21687,
          0.648649,
          -0.043876,
          0.728215
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
      "generated": false,
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

export const FIST_ATTACK1_POSE_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "label": "FistAttack1 candidate 1",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "clip": "FistAttack1",
    "readyClip": "FistReady",
    "duration": 0.708333,
    "keyCount": 6,
    "method": "fps-fist-ready-local-deltas-over-meshy-ready",
    "weaponless": true,
    "note": "No sabre judgment. This preview exists to inspect FPSPlayer fist orientation and compact right wrist/forearm punch read.",
    "mappedBones": {
      "Spine02": "Spine02",
      "Spine01": "Spine01",
      "Spine": "Spine",
      "LeftArm": "Arm.L",
      "LeftForeArm": "Forearm.L",
      "LeftHand": "Hand.L",
      "RightArm": "Arm.R",
      "RightForeArm": "Forearm.R",
      "RightHand": "Hand.R"
    },
    "sourceMotion": {
      "RightArm": {
        "travelDeg": 78.529
      },
      "RightForeArm": {
        "travelDeg": 194.289
      },
      "RightHand": {
        "travelDeg": 233.24
      },
      "LeftHand": {
        "travelDeg": 179.321
      }
    },
    "acceptanceRead": [
      "fist/knuckle orientation is the visual target",
      "right wrist and forearm roll must read more than shoulder translation",
      "sabre is hidden; this candidate is not weapon acceptance"
    ]
  },
  "primeKeys": {
    "start": 0,
    "windup": 0.125,
    "contact": 0.25,
    "followThrough": 0.375,
    "recoil": 0.542,
    "end": 0.708333
  },
  "frames": [
    {
      "label": "start",
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
          0.522129,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          -0.115569,
          -0.405842,
          -0.561826,
          -0.711539
        ],
        "LeftForeArm": [
          -0.517448,
          0.281281,
          0.327324,
          0.73891
        ],
        "LeftHand": [
          0.057102,
          -0.446904,
          0.075861,
          0.889529
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
          -0.344513,
          0.411397,
          -0.044819,
          0.842647
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
      },
      "source": {
        "clipTime": 0,
        "mappedBones": {
          "LeftArm": "Arm.L",
          "LeftForeArm": "Forearm.L",
          "LeftHand": "Hand.L",
          "RightArm": "Arm.R",
          "RightForeArm": "Forearm.R",
          "RightHand": "Hand.R"
        }
      }
    },
    {
      "label": "windup",
      "time": 0.125,
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
          -0.223367,
          -0.536292,
          -0.546853,
          -0.602868
        ],
        "LeftForeArm": [
          -0.449532,
          0.357581,
          -0.176652,
          0.799281
        ],
        "LeftHand": [
          -0.153061,
          -0.832893,
          0.141437,
          0.512696
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          0.587666,
          -0.195508,
          -0.478248,
          0.622659
        ],
        "RightForeArm": [
          -0.822442,
          -0.189727,
          -0.146342,
          0.515924
        ],
        "RightHand": [
          -0.146199,
          -0.189225,
          -0.192286,
          0.951759
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
      },
      "source": {
        "clipTime": 0.125,
        "mappedBones": {
          "LeftArm": "Arm.L",
          "LeftForeArm": "Forearm.L",
          "LeftHand": "Hand.L",
          "RightArm": "Arm.R",
          "RightForeArm": "Forearm.R",
          "RightHand": "Hand.R"
        }
      }
    },
    {
      "label": "contact",
      "time": 0.25,
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
          -0.53349,
          0.079419,
          0.200617,
          0.817823
        ],
        "LeftForeArm": [
          0.358825,
          0.457308,
          0.110337,
          0.806189
        ],
        "LeftHand": [
          0.04202,
          -0.481144,
          0.081677,
          0.871816
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.803635,
          0.221108,
          0.348231,
          -0.428972
        ],
        "RightForeArm": [
          -0.917308,
          -0.032857,
          -0.200625,
          0.342369
        ],
        "RightHand": [
          -0.265491,
          0.07156,
          -0.117633,
          0.954231
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
      },
      "source": {
        "clipTime": 0.25,
        "mappedBones": {
          "LeftArm": "Arm.L",
          "LeftForeArm": "Forearm.L",
          "LeftHand": "Hand.L",
          "RightArm": "Arm.R",
          "RightForeArm": "Forearm.R",
          "RightHand": "Hand.R"
        }
      }
    },
    {
      "label": "followThrough",
      "time": 0.375,
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
          -0.400344,
          0.229409,
          0.339114,
          0.819816
        ],
        "LeftForeArm": [
          0.180268,
          0.476532,
          0.051311,
          0.858946
        ],
        "LeftHand": [
          0.002272,
          -0.581735,
          0.095838,
          0.807709
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.773854,
          0.222055,
          0.368657,
          -0.464686
        ],
        "RightForeArm": [
          -0.88441,
          -0.063573,
          -0.191059,
          0.421039
        ],
        "RightHand": [
          -0.149927,
          -0.04066,
          -0.168613,
          0.973364
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
      },
      "source": {
        "clipTime": 0.375,
        "mappedBones": {
          "LeftArm": "Arm.L",
          "LeftForeArm": "Forearm.L",
          "LeftHand": "Hand.L",
          "RightArm": "Arm.R",
          "RightForeArm": "Forearm.R",
          "RightHand": "Hand.R"
        }
      }
    },
    {
      "label": "recoil",
      "time": 0.542,
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
          -0.027056,
          0.455619,
          0.518383,
          0.723159
        ],
        "LeftForeArm": [
          -0.303978,
          0.391105,
          0.060254,
          0.866605
        ],
        "LeftHand": [
          -0.071821,
          -0.638309,
          0.122896,
          0.756505
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.681043,
          0.240534,
          0.415083,
          -0.5532
        ],
        "RightForeArm": [
          -0.833812,
          -0.235626,
          -0.043305,
          0.497355
        ],
        "RightHand": [
          -0.181953,
          0.051944,
          -0.144065,
          0.971308
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
      },
      "source": {
        "clipTime": 0.542,
        "mappedBones": {
          "LeftArm": "Arm.L",
          "LeftForeArm": "Forearm.L",
          "LeftHand": "Hand.L",
          "RightArm": "Arm.R",
          "RightForeArm": "Forearm.R",
          "RightHand": "Hand.R"
        }
      }
    },
    {
      "label": "end",
      "time": 0.708333,
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
      },
      "source": {
        "clipTime": 0.708333,
        "mappedBones": {
          "LeftArm": "Arm.L",
          "LeftForeArm": "Forearm.L",
          "LeftHand": "Hand.L",
          "RightArm": "Arm.R",
          "RightForeArm": "Forearm.R",
          "RightHand": "Hand.R"
        }
      }
    }
  ],
  "guardReport": {
    "quarantine": true,
    "weaponless": true,
    "readyEndpointContract": {
      "firstDiffersFromReady": true,
      "lastReturnsNearReady": false,
      "note": "FistAttack1 is a native short FPS punch and does not need Ready endpoints to match the one-hand saber contract."
    },
    "sourceMotion": {
      "rightHandPrimaryDriver": true,
      "rightHandTravelDeg": 233.24,
      "rightForeArmTravelDeg": 194.289,
      "rightArmTravelDeg": 78.529
    }
  }
};

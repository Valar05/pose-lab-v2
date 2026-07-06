export const FIST_ATTACK1_POSE_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "label": "FistAttack1 candidate 1",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "clip": "FistAttack1",
    "readyClip": "FistReady",
    "duration": 0.708333,
    "keyCount": 6,
    "method": "fps-fist-world-joint-pinned-over-meshy-fist-ready",
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
    "jointPinned": {
      "sourceJoints": [
        "ArmR",
        "ForearmR",
        "HandR"
      ],
      "targetJoints": [
        "RightArm",
        "RightForeArm",
        "RightHand"
      ],
      "targetSpace": "Meshy calibrated world from generated FistReady",
      "solverAuthoredBones": [
        "RightArm",
        "RightForeArm"
      ],
      "handOrientation": "RightHand keeps FPS FistReady->FistAttack1 local orientation delta over Meshy FistReady",
      "calibration": {
        "sourceBasis": "FPS FistAttack1 start ArmR/ForearmR/HandR",
        "targetBasis": "Meshy FistReady RightArm/RightForeArm/RightHand",
        "meshyUpperLength": 0.238156,
        "meshyForeLength": 0.231911
      }
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
          0.522128,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          -0.512315,
          -0.319537,
          -0.588806,
          -0.537343
        ],
        "LeftForeArm": [
          -0.610532,
          0.040579,
          0.095536,
          0.78516
        ],
        "LeftHand": [
          0.149095,
          0.520711,
          0.34775,
          0.765311
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.678619,
          0.416806,
          0.402537,
          -0.451345
        ],
        "RightForeArm": [
          -0.738646,
          -0.34531,
          0.300632,
          0.494756
        ],
        "RightHand": [
          -0.364226,
          -0.303417,
          -0.429757,
          0.768496
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
        },
        "jointPinned": {
          "sourceJoints": [
            "ArmR",
            "ForearmR",
            "HandR"
          ],
          "targetJoints": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "targetElbowWorld": [
            -0.15682,
            1.13255,
            -0.04565
          ],
          "actualElbowWorld": [
            -0.157,
            1.13244,
            -0.04537
          ],
          "targetWristWorld": [
            -0.20454,
            1.14227,
            0.1811
          ],
          "actualWristWorld": [
            -0.20488,
            1.14219,
            0.18134
          ],
          "elbowWorldError": 0.00034,
          "wristWorldError": 0.00042,
          "rightArmRotationFromInputDeg": 27.98,
          "rightForeArmRotationFromInputDeg": 27.266
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
          0.522128,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          -0.617571,
          -0.425392,
          -0.489607,
          -0.444896
        ],
        "LeftForeArm": [
          -0.596418,
          0.162114,
          -0.396222,
          0.678979
        ],
        "LeftHand": [
          -0.17252,
          0.078817,
          0.25958,
          0.946912
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          0.703296,
          -0.307586,
          -0.380263,
          0.515912
        ],
        "RightForeArm": [
          -0.778286,
          -0.235198,
          -0.214961,
          0.541059
        ],
        "RightHand": [
          0.069022,
          -0.658775,
          -0.58994,
          0.461761
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
        },
        "jointPinned": {
          "sourceJoints": [
            "ArmR",
            "ForearmR",
            "HandR"
          ],
          "targetJoints": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "targetElbowWorld": [
            -0.15177,
            1.12982,
            -0.00646
          ],
          "actualElbowWorld": [
            -0.15212,
            1.12971,
            -0.00627
          ],
          "targetWristWorld": [
            -0.15912,
            1.19648,
            0.21554
          ],
          "actualWristWorld": [
            -0.15913,
            1.19687,
            0.21559
          ],
          "elbowWorldError": 0.00041,
          "wristWorldError": 0.00039,
          "rightArmRotationFromInputDeg": 29.252,
          "rightForeArmRotationFromInputDeg": 5.714
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
          0.522128,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          -0.217395,
          0.101912,
          0.509542,
          0.826269
        ],
        "LeftForeArm": [
          0.140026,
          0.511215,
          -0.156013,
          0.833494
        ],
        "LeftHand": [
          0.126746,
          0.493749,
          0.345261,
          0.787999
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.798699,
          0.45963,
          0.120723,
          -0.369114
        ],
        "RightForeArm": [
          -0.853883,
          -0.156461,
          -0.273777,
          0.414064
        ],
        "RightHand": [
          -0.129176,
          -0.54416,
          -0.527708,
          0.639318
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
        },
        "jointPinned": {
          "sourceJoints": [
            "ArmR",
            "ForearmR",
            "HandR"
          ],
          "targetJoints": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "targetElbowWorld": [
            -0.13517,
            1.19117,
            -0.14949
          ],
          "actualElbowWorld": [
            -0.13451,
            1.1914,
            -0.14937
          ],
          "targetWristWorld": [
            -0.1704,
            1.17278,
            0.07899
          ],
          "actualWristWorld": [
            -0.17023,
            1.17278,
            0.07901
          ],
          "elbowWorldError": 0.0007,
          "wristWorldError": 0.00017,
          "rightArmRotationFromInputDeg": 43.407,
          "rightForeArmRotationFromInputDeg": 10.9
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
          0.522128,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          -0.02445,
          0.232089,
          0.570572,
          0.787391
        ],
        "LeftForeArm": [
          -0.039549,
          0.470378,
          -0.220864,
          0.853463
        ],
        "LeftHand": [
          0.062247,
          0.403177,
          0.338375,
          0.847983
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.799914,
          0.444902,
          0.150224,
          -0.373674
        ],
        "RightForeArm": [
          -0.81665,
          -0.174293,
          -0.272253,
          0.478104
        ],
        "RightHand": [
          -0.006319,
          -0.567779,
          -0.607097,
          0.555897
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
        },
        "jointPinned": {
          "sourceJoints": [
            "ArmR",
            "ForearmR",
            "HandR"
          ],
          "targetJoints": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "targetElbowWorld": [
            -0.1309,
            1.18397,
            -0.13825
          ],
          "actualElbowWorld": [
            -0.13065,
            1.18404,
            -0.13818
          ],
          "targetWristWorld": [
            -0.15485,
            1.14656,
            0.08937
          ],
          "actualWristWorld": [
            -0.15459,
            1.14669,
            0.08945
          ],
          "elbowWorldError": 0.00028,
          "wristWorldError": 0.0003,
          "rightArmRotationFromInputDeg": 42.47,
          "rightForeArmRotationFromInputDeg": 9.17
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
          0.522128,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          0.391679,
          0.392519,
          0.570892,
          0.605474
        ],
        "LeftForeArm": [
          -0.465428,
          0.226089,
          -0.200451,
          0.831914
        ],
        "LeftHand": [
          -0.018852,
          0.353345,
          0.299275,
          0.88613
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.792542,
          0.366634,
          0.168579,
          -0.457206
        ],
        "RightForeArm": [
          -0.81191,
          -0.302634,
          -0.157942,
          0.47357
        ],
        "RightHand": [
          -0.071099,
          -0.520064,
          -0.589148,
          0.614316
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
        },
        "jointPinned": {
          "sourceJoints": [
            "ArmR",
            "ForearmR",
            "HandR"
          ],
          "targetJoints": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "targetElbowWorld": [
            -0.1363,
            1.15635,
            -0.0974
          ],
          "actualElbowWorld": [
            -0.13667,
            1.15622,
            -0.09744
          ],
          "targetWristWorld": [
            -0.16579,
            1.13663,
            0.13179
          ],
          "actualWristWorld": [
            -0.16605,
            1.13655,
            0.13176
          ],
          "elbowWorldError": 0.00039,
          "wristWorldError": 0.00027,
          "rightArmRotationFromInputDeg": 40.56,
          "rightForeArmRotationFromInputDeg": 5.65
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
          0.522128,
          0.564557,
          -0.472393,
          0.430699
        ],
        "LeftArm": [
          0.503604,
          0.352194,
          0.572939,
          0.542295
        ],
        "LeftForeArm": [
          -0.610532,
          0.040579,
          0.095536,
          0.78516
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
          -0.794991,
          0.192746,
          -0.044715,
          -0.573444
        ],
        "RightForeArm": [
          -0.796155,
          -0.540948,
          -0.045105,
          0.267355
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
        },
        "jointPinned": {
          "sourceJoints": [
            "ArmR",
            "ForearmR",
            "HandR"
          ],
          "targetJoints": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "targetElbowWorld": [
            -0.14872,
            1.14525,
            -0.08199
          ],
          "actualElbowWorld": [
            -0.14866,
            1.14521,
            -0.08184
          ],
          "targetWristWorld": [
            -0.21166,
            1.11227,
            0.13877
          ],
          "actualWristWorld": [
            -0.21187,
            1.11203,
            0.13881
          ],
          "elbowWorldError": 0.00017,
          "wristWorldError": 0.00032,
          "rightArmRotationFromInputDeg": 61.698,
          "rightForeArmRotationFromInputDeg": 50.903
        }
      }
    }
  ],
  "guardReport": {
    "quarantine": true,
    "weaponless": true,
    "readyEndpointContract": {
      "firstDiffersFromFistReady": true,
      "lastReturnsNearReady": false,
      "note": "FistAttack1 is a native short FPS punch and uses FistReady as its target baseline, not OneHandReady."
    },
    "sourceMotion": {
      "rightHandPrimaryDriver": true,
      "rightHandTravelDeg": 233.24,
      "rightForeArmTravelDeg": 194.289,
      "rightArmTravelDeg": 78.529
    },
    "jointPinned": {
      "status": "PASS",
      "rule": "Meshy right-arm joints are pinned in calibrated world space from FPS ArmR/ForearmR/HandR; no sabre or WeaponR socket is involved.",
      "report": [
        {
          "label": "start",
          "time": 0,
          "sourceJoints": [
            "ArmR",
            "ForearmR",
            "HandR"
          ],
          "targetJoints": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "targetElbowWorld": [
            -0.15682,
            1.13255,
            -0.04565
          ],
          "actualElbowWorld": [
            -0.157,
            1.13244,
            -0.04537
          ],
          "targetWristWorld": [
            -0.20454,
            1.14227,
            0.1811
          ],
          "actualWristWorld": [
            -0.20488,
            1.14219,
            0.18134
          ],
          "elbowWorldError": 0.00034,
          "wristWorldError": 0.00042,
          "rightArmRotationFromInputDeg": 27.98,
          "rightForeArmRotationFromInputDeg": 27.266
        },
        {
          "label": "windup",
          "time": 0.125,
          "sourceJoints": [
            "ArmR",
            "ForearmR",
            "HandR"
          ],
          "targetJoints": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "targetElbowWorld": [
            -0.15177,
            1.12982,
            -0.00646
          ],
          "actualElbowWorld": [
            -0.15212,
            1.12971,
            -0.00627
          ],
          "targetWristWorld": [
            -0.15912,
            1.19648,
            0.21554
          ],
          "actualWristWorld": [
            -0.15913,
            1.19687,
            0.21559
          ],
          "elbowWorldError": 0.00041,
          "wristWorldError": 0.00039,
          "rightArmRotationFromInputDeg": 29.252,
          "rightForeArmRotationFromInputDeg": 5.714
        },
        {
          "label": "contact",
          "time": 0.25,
          "sourceJoints": [
            "ArmR",
            "ForearmR",
            "HandR"
          ],
          "targetJoints": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "targetElbowWorld": [
            -0.13517,
            1.19117,
            -0.14949
          ],
          "actualElbowWorld": [
            -0.13451,
            1.1914,
            -0.14937
          ],
          "targetWristWorld": [
            -0.1704,
            1.17278,
            0.07899
          ],
          "actualWristWorld": [
            -0.17023,
            1.17278,
            0.07901
          ],
          "elbowWorldError": 0.0007,
          "wristWorldError": 0.00017,
          "rightArmRotationFromInputDeg": 43.407,
          "rightForeArmRotationFromInputDeg": 10.9
        },
        {
          "label": "followThrough",
          "time": 0.375,
          "sourceJoints": [
            "ArmR",
            "ForearmR",
            "HandR"
          ],
          "targetJoints": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "targetElbowWorld": [
            -0.1309,
            1.18397,
            -0.13825
          ],
          "actualElbowWorld": [
            -0.13065,
            1.18404,
            -0.13818
          ],
          "targetWristWorld": [
            -0.15485,
            1.14656,
            0.08937
          ],
          "actualWristWorld": [
            -0.15459,
            1.14669,
            0.08945
          ],
          "elbowWorldError": 0.00028,
          "wristWorldError": 0.0003,
          "rightArmRotationFromInputDeg": 42.47,
          "rightForeArmRotationFromInputDeg": 9.17
        },
        {
          "label": "recoil",
          "time": 0.542,
          "sourceJoints": [
            "ArmR",
            "ForearmR",
            "HandR"
          ],
          "targetJoints": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "targetElbowWorld": [
            -0.1363,
            1.15635,
            -0.0974
          ],
          "actualElbowWorld": [
            -0.13667,
            1.15622,
            -0.09744
          ],
          "targetWristWorld": [
            -0.16579,
            1.13663,
            0.13179
          ],
          "actualWristWorld": [
            -0.16605,
            1.13655,
            0.13176
          ],
          "elbowWorldError": 0.00039,
          "wristWorldError": 0.00027,
          "rightArmRotationFromInputDeg": 40.56,
          "rightForeArmRotationFromInputDeg": 5.65
        },
        {
          "label": "end",
          "time": 0.708333,
          "sourceJoints": [
            "ArmR",
            "ForearmR",
            "HandR"
          ],
          "targetJoints": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "targetElbowWorld": [
            -0.14872,
            1.14525,
            -0.08199
          ],
          "actualElbowWorld": [
            -0.14866,
            1.14521,
            -0.08184
          ],
          "targetWristWorld": [
            -0.21166,
            1.11227,
            0.13877
          ],
          "actualWristWorld": [
            -0.21187,
            1.11203,
            0.13881
          ],
          "elbowWorldError": 0.00017,
          "wristWorldError": 0.00032,
          "rightArmRotationFromInputDeg": 61.698,
          "rightForeArmRotationFromInputDeg": 50.903
        }
      ]
    }
  }
};

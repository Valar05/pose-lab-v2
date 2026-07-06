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
          0.396124,
          -0.584057,
          -0.579228,
          -0.407993
        ],
        "LeftForeArm": [
          -0.695448,
          -0.268381,
          0.460442,
          0.481993
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
          0.742217,
          0.393589,
          0.418218,
          -0.34539
        ],
        "RightForeArm": [
          -0.783201,
          -0.563949,
          -0.150231,
          0.21445
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
            -0.12798,
            1.40177,
            0.21383
          ],
          "actualElbowWorld": [
            -0.12808,
            1.40195,
            0.21383
          ],
          "targetWristWorld": [
            -0.18963,
            1.17821,
            0.21505
          ],
          "actualWristWorld": [
            -0.18928,
            1.17827,
            0.21531
          ],
          "elbowWorldError": 0.00021,
          "wristWorldError": 0.00043,
          "rightArmRotationFromInputDeg": 30.944,
          "rightForeArmRotationFromInputDeg": 27.058
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
          0.281329,
          -0.639121,
          -0.661007,
          -0.274676
        ],
        "LeftForeArm": [
          -0.85602,
          0.024347,
          0.065869,
          0.51215
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
          -0.294287,
          -0.173148,
          -0.776585,
          0.529462
        ],
        "RightForeArm": [
          -0.79583,
          -0.211308,
          -0.136058,
          -0.550901
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
            -0.14621,
            1.36831,
            0.22463
          ],
          "actualElbowWorld": [
            -0.14618,
            1.36842,
            0.22462
          ],
          "targetWristWorld": [
            -0.26615,
            1.17162,
            0.19804
          ],
          "actualWristWorld": [
            -0.26582,
            1.17156,
            0.19785
          ],
          "elbowWorldError": 0.00011,
          "wristWorldError": 0.00038,
          "rightArmRotationFromInputDeg": 57.055,
          "rightForeArmRotationFromInputDeg": 55.634
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
          -0.735311,
          0.433775,
          -0.144261,
          0.500345
        ],
        "LeftForeArm": [
          -0.136045,
          0.085491,
          0.061463,
          0.985092
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
          0.348892,
          -0.184189,
          0.765257,
          -0.508656
        ],
        "RightForeArm": [
          -0.848417,
          -0.185635,
          -0.290843,
          -0.40142
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
            -0.13301,
            1.51026,
            0.16002
          ],
          "actualElbowWorld": [
            -0.13267,
            1.50992,
            0.16016
          ],
          "targetWristWorld": [
            -0.18977,
            1.28763,
            0.19165
          ],
          "actualWristWorld": [
            -0.19008,
            1.28741,
            0.19147
          ],
          "elbowWorldError": 0.0005,
          "wristWorldError": 0.00042,
          "rightArmRotationFromInputDeg": 68.701,
          "rightForeArmRotationFromInputDeg": 4.645
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
          -0.709854,
          0.529249,
          0.074634,
          0.458729
        ],
        "LeftForeArm": [
          -0.326002,
          0.083822,
          0.077515,
          0.93845
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
          0.500812,
          -0.039333,
          0.670479,
          -0.545983
        ],
        "RightForeArm": [
          -0.821253,
          -0.379491,
          -0.2578,
          -0.339219
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
            -0.13693,
            1.50121,
            0.16998
          ],
          "actualElbowWorld": [
            -0.13679,
            1.50105,
            0.17005
          ],
          "targetWristWorld": [
            -0.19167,
            1.28226,
            0.22334
          ],
          "actualWristWorld": [
            -0.19196,
            1.28221,
            0.2234
          ],
          "elbowWorldError": 0.00022,
          "wristWorldError": 0.00029,
          "rightArmRotationFromInputDeg": 55.684,
          "rightForeArmRotationFromInputDeg": 23.257
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
          -0.492781,
          0.634279,
          0.478442,
          0.354894
        ],
        "LeftForeArm": [
          -0.696774,
          -0.06434,
          0.209089,
          0.683116
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
          0.623337,
          0.183455,
          0.566749,
          -0.506548
        ],
        "RightForeArm": [
          -0.737275,
          -0.561792,
          -0.374754,
          -0.019356
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
            -0.13486,
            1.45941,
            0.19661
          ],
          "actualElbowWorld": [
            -0.13438,
            1.45912,
            0.19655
          ],
          "targetWristWorld": [
            -0.19548,
            1.23844,
            0.23243
          ],
          "actualWristWorld": [
            -0.19552,
            1.23831,
            0.23242
          ],
          "elbowWorldError": 0.00056,
          "wristWorldError": 0.00014,
          "rightArmRotationFromInputDeg": 36.504,
          "rightForeArmRotationFromInputDeg": 26.298
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
          0.677848,
          0.262339,
          0.51772,
          -0.451294
        ],
        "RightForeArm": [
          -0.767018,
          -0.592434,
          -0.21985,
          0.111228
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
            -0.12598,
            1.43919,
            0.20185
          ],
          "actualElbowWorld": [
            -0.12633,
            1.43927,
            0.20197
          ],
          "targetWristWorld": [
            -0.15125,
            1.21042,
            0.23027
          ],
          "actualWristWorld": [
            -0.15107,
            1.2104,
            0.23012
          ],
          "elbowWorldError": 0.00037,
          "wristWorldError": 0.00024,
          "rightArmRotationFromInputDeg": 30.664,
          "rightForeArmRotationFromInputDeg": 16.68
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
            -0.12798,
            1.40177,
            0.21383
          ],
          "actualElbowWorld": [
            -0.12808,
            1.40195,
            0.21383
          ],
          "targetWristWorld": [
            -0.18963,
            1.17821,
            0.21505
          ],
          "actualWristWorld": [
            -0.18928,
            1.17827,
            0.21531
          ],
          "elbowWorldError": 0.00021,
          "wristWorldError": 0.00043,
          "rightArmRotationFromInputDeg": 30.944,
          "rightForeArmRotationFromInputDeg": 27.058
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
            -0.14621,
            1.36831,
            0.22463
          ],
          "actualElbowWorld": [
            -0.14618,
            1.36842,
            0.22462
          ],
          "targetWristWorld": [
            -0.26615,
            1.17162,
            0.19804
          ],
          "actualWristWorld": [
            -0.26582,
            1.17156,
            0.19785
          ],
          "elbowWorldError": 0.00011,
          "wristWorldError": 0.00038,
          "rightArmRotationFromInputDeg": 57.055,
          "rightForeArmRotationFromInputDeg": 55.634
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
            -0.13301,
            1.51026,
            0.16002
          ],
          "actualElbowWorld": [
            -0.13267,
            1.50992,
            0.16016
          ],
          "targetWristWorld": [
            -0.18977,
            1.28763,
            0.19165
          ],
          "actualWristWorld": [
            -0.19008,
            1.28741,
            0.19147
          ],
          "elbowWorldError": 0.0005,
          "wristWorldError": 0.00042,
          "rightArmRotationFromInputDeg": 68.701,
          "rightForeArmRotationFromInputDeg": 4.645
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
            -0.13693,
            1.50121,
            0.16998
          ],
          "actualElbowWorld": [
            -0.13679,
            1.50105,
            0.17005
          ],
          "targetWristWorld": [
            -0.19167,
            1.28226,
            0.22334
          ],
          "actualWristWorld": [
            -0.19196,
            1.28221,
            0.2234
          ],
          "elbowWorldError": 0.00022,
          "wristWorldError": 0.00029,
          "rightArmRotationFromInputDeg": 55.684,
          "rightForeArmRotationFromInputDeg": 23.257
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
            -0.13486,
            1.45941,
            0.19661
          ],
          "actualElbowWorld": [
            -0.13438,
            1.45912,
            0.19655
          ],
          "targetWristWorld": [
            -0.19548,
            1.23844,
            0.23243
          ],
          "actualWristWorld": [
            -0.19552,
            1.23831,
            0.23242
          ],
          "elbowWorldError": 0.00056,
          "wristWorldError": 0.00014,
          "rightArmRotationFromInputDeg": 36.504,
          "rightForeArmRotationFromInputDeg": 26.298
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
            -0.12598,
            1.43919,
            0.20185
          ],
          "actualElbowWorld": [
            -0.12633,
            1.43927,
            0.20197
          ],
          "targetWristWorld": [
            -0.15125,
            1.21042,
            0.23027
          ],
          "actualWristWorld": [
            -0.15107,
            1.2104,
            0.23012
          ],
          "elbowWorldError": 0.00037,
          "wristWorldError": 0.00024,
          "rightArmRotationFromInputDeg": 30.664,
          "rightForeArmRotationFromInputDeg": 16.68
        }
      ]
    }
  }
};

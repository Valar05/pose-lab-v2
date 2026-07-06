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
          0.154338,
          -0.249392,
          -0.83361,
          -0.468057
        ],
        "LeftArm": [
          -0.591094,
          -0.521706,
          0.236916,
          -0.567716
        ],
        "LeftForeArm": [
          -0.334154,
          0.575012,
          0.546425,
          0.50904
        ],
        "LeftHand": [
          -0.238067,
          -0.90698,
          -0.307421,
          -0.161876
        ],
        "RightShoulder": [
          0.833639,
          0.353627,
          0.419819,
          0.061206
        ],
        "RightArm": [
          -0.762504,
          0.157261,
          0.130304,
          -0.613904
        ],
        "RightForeArm": [
          -0.744831,
          -0.532616,
          -0.284971,
          0.283439
        ],
        "RightHand": [
          0.169814,
          -0.805561,
          -0.554753,
          0.12035
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
            0.19434,
            1.27713,
            -0.08268
          ],
          "actualElbowWorld": [
            0.19441,
            1.27736,
            -0.08259
          ],
          "targetWristWorld": [
            0.20908,
            1.47098,
            0.04376
          ],
          "actualWristWorld": [
            0.20917,
            1.47119,
            0.04388
          ],
          "elbowWorldError": 0.00026,
          "wristWorldError": 0.00026,
          "rightArmRotationFromInputDeg": 34.029,
          "rightForeArmRotationFromInputDeg": 34.744
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
          0.154338,
          -0.249392,
          -0.83361,
          -0.468057
        ],
        "LeftArm": [
          -0.526159,
          -0.639383,
          0.332358,
          -0.451537
        ],
        "LeftForeArm": [
          -0.182434,
          0.593796,
          0.128138,
          0.773114
        ],
        "LeftHand": [
          -0.033843,
          -0.71096,
          -0.226997,
          -0.664728
        ],
        "RightShoulder": [
          0.833639,
          0.353627,
          0.419819,
          0.061206
        ],
        "RightArm": [
          0.734074,
          -0.205526,
          -0.321704,
          0.561606
        ],
        "RightForeArm": [
          -0.711181,
          -0.434986,
          -0.381568,
          0.399268
        ],
        "RightHand": [
          0.490671,
          -0.63838,
          -0.424366,
          -0.414279
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
            0.19218,
            1.31549,
            -0.0731
          ],
          "actualElbowWorld": [
            0.19239,
            1.31565,
            -0.07287
          ],
          "targetWristWorld": [
            0.13737,
            1.50177,
            0.05371
          ],
          "actualWristWorld": [
            0.13724,
            1.50188,
            0.05386
          ],
          "elbowWorldError": 0.00036,
          "wristWorldError": 0.00023,
          "rightArmRotationFromInputDeg": 30.69,
          "rightForeArmRotationFromInputDeg": 22.9
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
          0.154338,
          -0.249392,
          -0.83361,
          -0.468057
        ],
        "LeftArm": [
          0.33417,
          -0.150049,
          -0.083771,
          0.926714
        ],
        "LeftForeArm": [
          0.549924,
          0.341672,
          0.468981,
          0.600751
        ],
        "LeftHand": [
          -0.225575,
          -0.903032,
          -0.305034,
          -0.2015
        ],
        "RightShoulder": [
          0.833639,
          0.353627,
          0.419819,
          0.061206
        ],
        "RightArm": [
          -0.710832,
          0.213695,
          -0.196224,
          -0.64074
        ],
        "RightForeArm": [
          -0.775816,
          -0.438075,
          -0.449533,
          0.064194
        ],
        "RightHand": [
          0.388109,
          -0.754822,
          -0.49959,
          -0.173278
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
            0.138,
            1.17219,
            -0.10511
          ],
          "actualElbowWorld": [
            0.1377,
            1.17226,
            -0.10525
          ],
          "targetWristWorld": [
            0.16717,
            1.37833,
            -0.00296
          ],
          "actualWristWorld": [
            0.16717,
            1.37837,
            -0.0031
          ],
          "elbowWorldError": 0.00034,
          "wristWorldError": 0.00015,
          "rightArmRotationFromInputDeg": 65.067,
          "rightForeArmRotationFromInputDeg": 24.283
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
          0.154338,
          -0.249392,
          -0.83361,
          -0.468057
        ],
        "LeftArm": [
          0.393099,
          0.076217,
          -0.14883,
          0.904165
        ],
        "LeftForeArm": [
          0.40863,
          0.440167,
          0.419394,
          0.680723
        ],
        "LeftHand": [
          -0.185491,
          -0.879163,
          -0.301443,
          -0.319056
        ],
        "RightShoulder": [
          0.833639,
          0.353627,
          0.419819,
          0.061206
        ],
        "RightArm": [
          -0.743209,
          0.268492,
          -0.094312,
          -0.605523
        ],
        "RightForeArm": [
          -0.732663,
          -0.472062,
          -0.451535,
          0.190994
        ],
        "RightHand": [
          0.41439,
          -0.680858,
          -0.509791,
          -0.32377
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
            0.14071,
            1.18563,
            -0.10803
          ],
          "actualElbowWorld": [
            0.14107,
            1.18565,
            -0.10789
          ],
          "targetWristWorld": [
            0.17795,
            1.399,
            -0.02517
          ],
          "actualWristWorld": [
            0.17794,
            1.39917,
            -0.02525
          ],
          "elbowWorldError": 0.00039,
          "wristWorldError": 0.00019,
          "rightArmRotationFromInputDeg": 56.712,
          "rightForeArmRotationFromInputDeg": 28.918
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
          0.154338,
          -0.249392,
          -0.83361,
          -0.468057
        ],
        "LeftArm": [
          0.496345,
          0.470335,
          -0.270286,
          0.67777
        ],
        "LeftForeArm": [
          -0.0604,
          0.578853,
          0.382625,
          0.717551
        ],
        "LeftHand": [
          -0.151591,
          -0.865561,
          -0.248119,
          -0.407751
        ],
        "RightShoulder": [
          0.833639,
          0.353627,
          0.419819,
          0.061206
        ],
        "RightArm": [
          -0.767375,
          0.218624,
          0.004366,
          -0.602761
        ],
        "RightForeArm": [
          -0.718069,
          -0.503718,
          -0.411053,
          0.248355
        ],
        "RightHand": [
          0.372891,
          -0.714612,
          -0.539494,
          -0.243369
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
            0.16455,
            1.22895,
            -0.10406
          ],
          "actualElbowWorld": [
            0.16472,
            1.22854,
            -0.10394
          ],
          "targetWristWorld": [
            0.1912,
            1.4377,
            -0.00662
          ],
          "actualWristWorld": [
            0.19131,
            1.43736,
            -0.00663
          ],
          "elbowWorldError": 0.00046,
          "wristWorldError": 0.00035,
          "rightArmRotationFromInputDeg": 47.817,
          "rightForeArmRotationFromInputDeg": 12.824
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
          -0.760281,
          0.199534,
          0.051645,
          -0.616029
        ],
        "RightForeArm": [
          -0.749498,
          -0.524148,
          -0.27352,
          0.297839
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
            0.18046,
            1.24254,
            -0.0953
          ],
          "actualElbowWorld": [
            0.18061,
            1.24279,
            -0.0952
          ],
          "targetWristWorld": [
            0.23839,
            1.43748,
            0.01618
          ],
          "actualWristWorld": [
            0.23849,
            1.43754,
            0.01663
          ],
          "elbowWorldError": 0.00031,
          "wristWorldError": 0.00047,
          "rightArmRotationFromInputDeg": 44.055,
          "rightForeArmRotationFromInputDeg": 33.526
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
            0.19434,
            1.27713,
            -0.08268
          ],
          "actualElbowWorld": [
            0.19441,
            1.27736,
            -0.08259
          ],
          "targetWristWorld": [
            0.20908,
            1.47098,
            0.04376
          ],
          "actualWristWorld": [
            0.20917,
            1.47119,
            0.04388
          ],
          "elbowWorldError": 0.00026,
          "wristWorldError": 0.00026,
          "rightArmRotationFromInputDeg": 34.029,
          "rightForeArmRotationFromInputDeg": 34.744
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
            0.19218,
            1.31549,
            -0.0731
          ],
          "actualElbowWorld": [
            0.19239,
            1.31565,
            -0.07287
          ],
          "targetWristWorld": [
            0.13737,
            1.50177,
            0.05371
          ],
          "actualWristWorld": [
            0.13724,
            1.50188,
            0.05386
          ],
          "elbowWorldError": 0.00036,
          "wristWorldError": 0.00023,
          "rightArmRotationFromInputDeg": 30.69,
          "rightForeArmRotationFromInputDeg": 22.9
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
            0.138,
            1.17219,
            -0.10511
          ],
          "actualElbowWorld": [
            0.1377,
            1.17226,
            -0.10525
          ],
          "targetWristWorld": [
            0.16717,
            1.37833,
            -0.00296
          ],
          "actualWristWorld": [
            0.16717,
            1.37837,
            -0.0031
          ],
          "elbowWorldError": 0.00034,
          "wristWorldError": 0.00015,
          "rightArmRotationFromInputDeg": 65.067,
          "rightForeArmRotationFromInputDeg": 24.283
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
            0.14071,
            1.18563,
            -0.10803
          ],
          "actualElbowWorld": [
            0.14107,
            1.18565,
            -0.10789
          ],
          "targetWristWorld": [
            0.17795,
            1.399,
            -0.02517
          ],
          "actualWristWorld": [
            0.17794,
            1.39917,
            -0.02525
          ],
          "elbowWorldError": 0.00039,
          "wristWorldError": 0.00019,
          "rightArmRotationFromInputDeg": 56.712,
          "rightForeArmRotationFromInputDeg": 28.918
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
            0.16455,
            1.22895,
            -0.10406
          ],
          "actualElbowWorld": [
            0.16472,
            1.22854,
            -0.10394
          ],
          "targetWristWorld": [
            0.1912,
            1.4377,
            -0.00662
          ],
          "actualWristWorld": [
            0.19131,
            1.43736,
            -0.00663
          ],
          "elbowWorldError": 0.00046,
          "wristWorldError": 0.00035,
          "rightArmRotationFromInputDeg": 47.817,
          "rightForeArmRotationFromInputDeg": 12.824
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
            0.18046,
            1.24254,
            -0.0953
          ],
          "actualElbowWorld": [
            0.18061,
            1.24279,
            -0.0952
          ],
          "targetWristWorld": [
            0.23839,
            1.43748,
            0.01618
          ],
          "actualWristWorld": [
            0.23849,
            1.43754,
            0.01663
          ],
          "elbowWorldError": 0.00031,
          "wristWorldError": 0.00047,
          "rightArmRotationFromInputDeg": 44.055,
          "rightForeArmRotationFromInputDeg": 33.526
        }
      ]
    }
  }
};

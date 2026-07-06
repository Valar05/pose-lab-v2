export const FIST_ATTACK1_POSE_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "label": "FistAttack1 candidate 1",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "clip": "FistAttack1",
    "readyClip": "FistReady",
    "duration": 0.708333,
    "keyCount": 6,
    "method": "fps-fist-world-joint-pinned-over-meshy-ready",
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
      "targetSpace": "Meshy calibrated world from accepted Ready",
      "solverAuthoredBones": [
        "RightArm",
        "RightForeArm"
      ],
      "handOrientation": "RightHand keeps FPS FistReady->FistAttack1 local orientation delta over Meshy Ready",
      "calibration": {
        "sourceBasis": "FPS FistAttack1 start ArmR/ForearmR/HandR",
        "targetBasis": "Meshy Ready RightArm/RightForeArm/RightHand",
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
          -0.700063,
          0.375036,
          0.362515,
          -0.48769
        ],
        "RightForeArm": [
          -0.729509,
          -0.379572,
          0.322965,
          0.468439
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
            -0.15825,
            1.13089,
            -0.03852
          ],
          "actualElbowWorld": [
            -0.15808,
            1.13087,
            -0.03809
          ],
          "targetWristWorld": [
            -0.22817,
            1.14298,
            0.18227
          ],
          "actualWristWorld": [
            -0.2283,
            1.14326,
            0.18259
          ],
          "elbowWorldError": 0.00047,
          "wristWorldError": 0.00044,
          "rightArmRotationFromInputDeg": 20.021,
          "rightForeArmRotationFromInputDeg": 12.695
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
          0.677057,
          -0.32115,
          -0.412967,
          0.517605
        ],
        "RightForeArm": [
          -0.79574,
          -0.194499,
          -0.134795,
          0.557494
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
            -0.15721,
            1.12826,
            0.00098
          ],
          "actualElbowWorld": [
            -0.15761,
            1.12816,
            0.00116
          ],
          "targetWristWorld": [
            -0.18513,
            1.19628,
            0.22093
          ],
          "actualWristWorld": [
            -0.18544,
            1.19634,
            0.22107
          ],
          "elbowWorldError": 0.00045,
          "wristWorldError": 0.00034,
          "rightArmRotationFromInputDeg": 22.689,
          "rightForeArmRotationFromInputDeg": 5.84
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
          -0.760597,
          0.507122,
          0.308901,
          -0.262487
        ],
        "RightForeArm": [
          -0.882479,
          0.016904,
          -0.161088,
          0.441584
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
            -0.1249,
            1.18843,
            -0.13985
          ],
          "actualElbowWorld": [
            -0.12501,
            1.18854,
            -0.14006
          ],
          "targetWristWorld": [
            -0.18326,
            1.17211,
            0.08401
          ],
          "actualWristWorld": [
            -0.18323,
            1.17237,
            0.08384
          ],
          "elbowWorldError": 0.00027,
          "wristWorldError": 0.00031,
          "rightArmRotationFromInputDeg": 38.69,
          "rightForeArmRotationFromInputDeg": 14.088
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
          -0.80909,
          0.422178,
          0.164217,
          -0.374396
        ],
        "RightForeArm": [
          -0.829412,
          -0.15716,
          -0.230675,
          0.483907
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
            -0.12196,
            1.18118,
            -0.12821
          ],
          "actualElbowWorld": [
            -0.12228,
            1.18094,
            -0.12813
          ],
          "targetWristWorld": [
            -0.16946,
            1.14559,
            0.09597
          ],
          "actualWristWorld": [
            -0.16929,
            1.14582,
            0.09624
          ],
          "elbowWorldError": 0.00041,
          "wristWorldError": 0.00039,
          "rightArmRotationFromInputDeg": 34.746,
          "rightForeArmRotationFromInputDeg": 15.085
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
          -0.802394,
          0.333599,
          0.156078,
          -0.469589
        ],
        "RightForeArm": [
          -0.82022,
          -0.31821,
          -0.105524,
          0.463515
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
            -0.13208,
            1.15392,
            -0.08803
          ],
          "actualElbowWorld": [
            -0.13185,
            1.15398,
            -0.08793
          ],
          "targetWristWorld": [
            -0.18483,
            1.13615,
            0.13711
          ],
          "actualWristWorld": [
            -0.18475,
            1.13607,
            0.13716
          ],
          "elbowWorldError": 0.00026,
          "wristWorldError": 0.00012,
          "rightArmRotationFromInputDeg": 35.921,
          "rightForeArmRotationFromInputDeg": 12.57
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
          -0.751912,
          0.384805,
          0.273752,
          -0.460015
        ],
        "RightForeArm": [
          -0.73206,
          -0.386301,
          0.317007,
          0.462997
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
            -0.14625,
            1.1432,
            -0.07391
          ],
          "actualElbowWorld": [
            -0.14625,
            1.14332,
            -0.07426
          ],
          "targetWristWorld": [
            -0.23175,
            1.11293,
            0.13953
          ],
          "actualWristWorld": [
            -0.23157,
            1.1127,
            0.1392
          ],
          "elbowWorldError": 0.00037,
          "wristWorldError": 0.00044,
          "rightArmRotationFromInputDeg": 30.147,
          "rightForeArmRotationFromInputDeg": 12.574
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
            -0.15825,
            1.13089,
            -0.03852
          ],
          "actualElbowWorld": [
            -0.15808,
            1.13087,
            -0.03809
          ],
          "targetWristWorld": [
            -0.22817,
            1.14298,
            0.18227
          ],
          "actualWristWorld": [
            -0.2283,
            1.14326,
            0.18259
          ],
          "elbowWorldError": 0.00047,
          "wristWorldError": 0.00044,
          "rightArmRotationFromInputDeg": 20.021,
          "rightForeArmRotationFromInputDeg": 12.695
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
            -0.15721,
            1.12826,
            0.00098
          ],
          "actualElbowWorld": [
            -0.15761,
            1.12816,
            0.00116
          ],
          "targetWristWorld": [
            -0.18513,
            1.19628,
            0.22093
          ],
          "actualWristWorld": [
            -0.18544,
            1.19634,
            0.22107
          ],
          "elbowWorldError": 0.00045,
          "wristWorldError": 0.00034,
          "rightArmRotationFromInputDeg": 22.689,
          "rightForeArmRotationFromInputDeg": 5.84
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
            -0.1249,
            1.18843,
            -0.13985
          ],
          "actualElbowWorld": [
            -0.12501,
            1.18854,
            -0.14006
          ],
          "targetWristWorld": [
            -0.18326,
            1.17211,
            0.08401
          ],
          "actualWristWorld": [
            -0.18323,
            1.17237,
            0.08384
          ],
          "elbowWorldError": 0.00027,
          "wristWorldError": 0.00031,
          "rightArmRotationFromInputDeg": 38.69,
          "rightForeArmRotationFromInputDeg": 14.088
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
            -0.12196,
            1.18118,
            -0.12821
          ],
          "actualElbowWorld": [
            -0.12228,
            1.18094,
            -0.12813
          ],
          "targetWristWorld": [
            -0.16946,
            1.14559,
            0.09597
          ],
          "actualWristWorld": [
            -0.16929,
            1.14582,
            0.09624
          ],
          "elbowWorldError": 0.00041,
          "wristWorldError": 0.00039,
          "rightArmRotationFromInputDeg": 34.746,
          "rightForeArmRotationFromInputDeg": 15.085
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
            -0.13208,
            1.15392,
            -0.08803
          ],
          "actualElbowWorld": [
            -0.13185,
            1.15398,
            -0.08793
          ],
          "targetWristWorld": [
            -0.18483,
            1.13615,
            0.13711
          ],
          "actualWristWorld": [
            -0.18475,
            1.13607,
            0.13716
          ],
          "elbowWorldError": 0.00026,
          "wristWorldError": 0.00012,
          "rightArmRotationFromInputDeg": 35.921,
          "rightForeArmRotationFromInputDeg": 12.57
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
            -0.14625,
            1.1432,
            -0.07391
          ],
          "actualElbowWorld": [
            -0.14625,
            1.14332,
            -0.07426
          ],
          "targetWristWorld": [
            -0.23175,
            1.11293,
            0.13953
          ],
          "actualWristWorld": [
            -0.23157,
            1.1127,
            0.1392
          ],
          "elbowWorldError": 0.00037,
          "wristWorldError": 0.00044,
          "rightArmRotationFromInputDeg": 30.147,
          "rightForeArmRotationFromInputDeg": 12.574
        }
      ]
    }
  }
};

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
          -0.259398,
          -0.458235,
          -0.211449,
          -0.823421
        ],
        "LeftForeArm": [
          -0.62695,
          -0.061414,
          0.508328,
          0.587166
        ],
        "LeftHand": [
          0.102519,
          0.332813,
          0.321916,
          0.880395
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.307567,
          0.15213,
          -0.079591,
          -0.935908
        ],
        "RightForeArm": [
          -0.795782,
          -0.590587,
          0.06043,
          0.119524
        ],
        "RightHand": [
          -0.552741,
          0.379537,
          0.01759,
          0.741701
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
            -0.40399,
            1.22694,
            -0.07435
          ],
          "actualElbowWorld": [
            -0.40394,
            1.22691,
            -0.07442
          ],
          "targetWristWorld": [
            -0.41979,
            1.2365,
            0.15683
          ],
          "actualWristWorld": [
            -0.41973,
            1.23669,
            0.15675
          ],
          "elbowWorldError": 0.00009,
          "wristWorldError": 0.00021,
          "rightArmRotationFromInputDeg": 14.034,
          "rightForeArmRotationFromInputDeg": 0.18
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
          -0.294439,
          -0.6165,
          -0.177897,
          -0.708227
        ],
        "LeftForeArm": [
          -0.721925,
          0.155838,
          0.055916,
          0.671872
        ],
        "LeftHand": [
          -0.22196,
          -0.141272,
          0.241124,
          0.934149
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          0.316157,
          0.038167,
          0.056526,
          0.946252
        ],
        "RightForeArm": [
          -0.786191,
          -0.587766,
          -0.182468,
          -0.056038
        ],
        "RightHand": [
          -0.359015,
          -0.16108,
          -0.274909,
          0.877261
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
            -0.40587,
            1.21479,
            -0.0367
          ],
          "actualElbowWorld": [
            -0.40587,
            1.21473,
            -0.03641
          ],
          "targetWristWorld": [
            -0.3537,
            1.20869,
            0.18919
          ],
          "actualWristWorld": [
            -0.35349,
            1.20875,
            0.18943
          ],
          "elbowWorldError": 0.00029,
          "wristWorldError": 0.00032,
          "rightArmRotationFromInputDeg": 13.455,
          "rightForeArmRotationFromInputDeg": 53.255
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
          -0.272338,
          -0.118989,
          0.020502,
          0.954596
        ],
        "LeftForeArm": [
          0.083893,
          0.171893,
          0.131393,
          0.972703
        ],
        "LeftHand": [
          0.079403,
          0.301209,
          0.319674,
          0.894861
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.257009,
          -0.025237,
          -0.395302,
          -0.881502
        ],
        "RightForeArm": [
          -0.896694,
          -0.420719,
          -0.011283,
          -0.137143
        ],
        "RightHand": [
          -0.486861,
          0.068743,
          -0.13948,
          0.859527
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
            -0.33829,
            1.24553,
            -0.17448
          ],
          "actualElbowWorld": [
            -0.33805,
            1.24559,
            -0.17467
          ],
          "targetWristWorld": [
            -0.3756,
            1.23319,
            0.05408
          ],
          "actualWristWorld": [
            -0.37579,
            1.23334,
            0.05382
          ],
          "elbowWorldError": 0.00031,
          "wristWorldError": 0.00035,
          "rightArmRotationFromInputDeg": 56.956,
          "rightForeArmRotationFromInputDeg": 51.421
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
          -0.170288,
          0.089592,
          0.091104,
          0.977075
        ],
        "LeftForeArm": [
          -0.111458,
          0.189804,
          0.130646,
          0.966687
        ],
        "LeftHand": [
          0.014039,
          0.198592,
          0.312466,
          0.928832
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.265875,
          -0.047807,
          -0.376055,
          -0.886345
        ],
        "RightForeArm": [
          -0.854705,
          -0.491373,
          -0.101478,
          -0.133169
        ],
        "RightHand": [
          -0.374534,
          -0.022939,
          -0.21808,
          0.90091
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
            -0.34374,
            1.23715,
            -0.16466
          ],
          "actualElbowWorld": [
            -0.3437,
            1.23744,
            -0.16491
          ],
          "targetWristWorld": [
            -0.39449,
            1.20772,
            0.05971
          ],
          "actualWristWorld": [
            -0.39456,
            1.20754,
            0.05937
          ],
          "elbowWorldError": 0.00038,
          "wristWorldError": 0.00039,
          "rightArmRotationFromInputDeg": 53.703,
          "rightForeArmRotationFromInputDeg": 55.33
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
          0.112568,
          0.454156,
          0.173899,
          0.866504
        ],
        "LeftForeArm": [
          -0.548817,
          0.095382,
          0.24097,
          0.794755
        ],
        "LeftHand": [
          -0.073662,
          0.142289,
          0.282536,
          0.945781
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.358152,
          0.226622,
          -0.173134,
          -0.889041
        ],
        "RightForeArm": [
          -0.77316,
          -0.44003,
          -0.29286,
          0.350473
        ],
        "RightHand": [
          -0.409244,
          0.05968,
          -0.171917,
          0.894093
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
            -0.37266,
            1.22532,
            -0.12613
          ],
          "actualElbowWorld": [
            -0.37247,
            1.22527,
            -0.12632
          ],
          "targetWristWorld": [
            -0.4091,
            1.20712,
            0.10218
          ],
          "actualWristWorld": [
            -0.40934,
            1.2068,
            0.1019
          ],
          "elbowWorldError": 0.00027,
          "wristWorldError": 0.00049,
          "rightArmRotationFromInputDeg": 24.183,
          "rightForeArmRotationFromInputDeg": 53.119
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
          -0.313158,
          0.122997,
          -0.173278,
          -0.925623
        ],
        "RightForeArm": [
          -0.795782,
          -0.590587,
          0.06043,
          0.119524
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
            -0.38806,
            1.23015,
            -0.11018
          ],
          "actualElbowWorld": [
            -0.38814,
            1.23033,
            -0.11026
          ],
          "targetWristWorld": [
            -0.44895,
            1.23924,
            0.11342
          ],
          "actualWristWorld": [
            -0.44872,
            1.23921,
            0.11342
          ],
          "elbowWorldError": 0.00022,
          "wristWorldError": 0.00023,
          "rightArmRotationFromInputDeg": 24.314,
          "rightForeArmRotationFromInputDeg": 0.18
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
            -0.40399,
            1.22694,
            -0.07435
          ],
          "actualElbowWorld": [
            -0.40394,
            1.22691,
            -0.07442
          ],
          "targetWristWorld": [
            -0.41979,
            1.2365,
            0.15683
          ],
          "actualWristWorld": [
            -0.41973,
            1.23669,
            0.15675
          ],
          "elbowWorldError": 0.00009,
          "wristWorldError": 0.00021,
          "rightArmRotationFromInputDeg": 14.034,
          "rightForeArmRotationFromInputDeg": 0.18
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
            -0.40587,
            1.21479,
            -0.0367
          ],
          "actualElbowWorld": [
            -0.40587,
            1.21473,
            -0.03641
          ],
          "targetWristWorld": [
            -0.3537,
            1.20869,
            0.18919
          ],
          "actualWristWorld": [
            -0.35349,
            1.20875,
            0.18943
          ],
          "elbowWorldError": 0.00029,
          "wristWorldError": 0.00032,
          "rightArmRotationFromInputDeg": 13.455,
          "rightForeArmRotationFromInputDeg": 53.255
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
            -0.33829,
            1.24553,
            -0.17448
          ],
          "actualElbowWorld": [
            -0.33805,
            1.24559,
            -0.17467
          ],
          "targetWristWorld": [
            -0.3756,
            1.23319,
            0.05408
          ],
          "actualWristWorld": [
            -0.37579,
            1.23334,
            0.05382
          ],
          "elbowWorldError": 0.00031,
          "wristWorldError": 0.00035,
          "rightArmRotationFromInputDeg": 56.956,
          "rightForeArmRotationFromInputDeg": 51.421
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
            -0.34374,
            1.23715,
            -0.16466
          ],
          "actualElbowWorld": [
            -0.3437,
            1.23744,
            -0.16491
          ],
          "targetWristWorld": [
            -0.39449,
            1.20772,
            0.05971
          ],
          "actualWristWorld": [
            -0.39456,
            1.20754,
            0.05937
          ],
          "elbowWorldError": 0.00038,
          "wristWorldError": 0.00039,
          "rightArmRotationFromInputDeg": 53.703,
          "rightForeArmRotationFromInputDeg": 55.33
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
            -0.37266,
            1.22532,
            -0.12613
          ],
          "actualElbowWorld": [
            -0.37247,
            1.22527,
            -0.12632
          ],
          "targetWristWorld": [
            -0.4091,
            1.20712,
            0.10218
          ],
          "actualWristWorld": [
            -0.40934,
            1.2068,
            0.1019
          ],
          "elbowWorldError": 0.00027,
          "wristWorldError": 0.00049,
          "rightArmRotationFromInputDeg": 24.183,
          "rightForeArmRotationFromInputDeg": 53.119
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
            -0.38806,
            1.23015,
            -0.11018
          ],
          "actualElbowWorld": [
            -0.38814,
            1.23033,
            -0.11026
          ],
          "targetWristWorld": [
            -0.44895,
            1.23924,
            0.11342
          ],
          "actualWristWorld": [
            -0.44872,
            1.23921,
            0.11342
          ],
          "elbowWorldError": 0.00022,
          "wristWorldError": 0.00023,
          "rightArmRotationFromInputDeg": 24.314,
          "rightForeArmRotationFromInputDeg": 0.18
        }
      ]
    }
  }
};

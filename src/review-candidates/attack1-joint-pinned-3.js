export const ATTACK1_JOINT_PINNED_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "label": "Attack1 joint-pinned candidate 3",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "meshy": "./public/assets/meshy/meshy_apose_walking_with_skin.glb",
    "clip": "OneHandAttack1",
    "duration": 1.25,
    "keyCount": 31,
    "method": "meshy-world-joint-pinned-from-fps-weaponr",
    "retargetedBones": [],
    "authoredBones": [
      "RightArm",
      "RightForeArm",
      "RightHand"
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
    },
    "baseCandidate": "attack1-candidate-1",
    "jointPinned": {
      "sourceJoints": [
        "ArmR",
        "ForearmR",
        "HandR"
      ],
      "sourceSocket": "WeaponR",
      "targetJoints": [
        "RightArm",
        "RightForeArm",
        "RightHand"
      ],
      "targetSpace": "Meshy calibrated world",
      "allowedOutput": "RightArm, RightForeArm, RightHand quaternions only",
      "solverAuthoredBones": [
        "RightArm",
        "RightForeArm",
        "RightHand"
      ],
      "sampleCount": 31,
      "thresholds": {
        "elbowWorldError": 0.12,
        "wristWorldError": 0.16,
        "bladeTipWorldError": 0.1,
        "bladeAngleDeg": 12,
        "extremeRotationDeg": 160
      },
      "calibration": {
        "sourceBasis": "FPS start ArmR/ForearmR/HandR",
        "targetBasis": "Meshy Ready RightArm/RightForeArm/RightHand",
        "meshyUpperLength": 0.238156,
        "meshyForeLength": 0.231911,
        "sabreBladeLength": 0.507386
      },
      "tipLocalPoint": [
        -0.955609,
        -0.40501,
        -0.200351
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
    },
    "jointPinned": {
      "status": "PASS",
      "rule": "Meshy right-arm joints are pinned in calibrated world space from FPS ArmR/ForearmR/HandR, then RightHand aligns the real sabre to FPS WeaponR blade direction. This is a guardrail, not visual acceptance.",
      "thresholds": {
        "elbowWorldError": 0.12,
        "wristWorldError": 0.16,
        "bladeTipWorldError": 0.1,
        "bladeAngleDeg": 12,
        "extremeRotationDeg": 160
      },
      "report": [
        {
          "label": "start",
          "time": 0,
          "source": {
            "label": "start",
            "time": 0,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              1442.649,
              1712.755
            ],
            "tipScreen": [
              122.23,
              -24.409
            ],
            "tipMinusHilt": [
              -1320.42,
              -1737.165
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.18159,
            1.12697,
            0.04087
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.25633,
            1.16844,
            0.25646
          ],
          "targetBladeDirectionWorld": [
            -0.68879,
            0.48881,
            0.53538
          ],
          "actualBladeDirectionWorld": [
            0.12657,
            0.96453,
            0.23164
          ],
          "desiredTipWorld": [
            -0.49222,
            1.79534,
            0.53851
          ],
          "actualTipWorld": [
            -0.07852,
            2.03672,
            0.38439
          ],
          "hiltWorld": [
            -0.14274,
            1.54733,
            0.26686
          ],
          "elbowWorldError": 0.09932,
          "wristWorldError": 0.09711,
          "bladeTipWorldError": 0.50315,
          "bladeAngleErrorDeg": 59.448,
          "rightArmRotationFromInputDeg": 0,
          "rightForeArmRotationFromInputDeg": 0,
          "rightHandRotationFromInputDeg": 0,
          "endpoint": true
        },
        {
          "label": "source-0.041667",
          "time": 0.041667,
          "source": {
            "label": "source-0.041667",
            "time": 0.041667,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              1711.863,
              1841.438
            ],
            "tipScreen": [
              80.49,
              -0.161
            ],
            "tipMinusHilt": [
              -1631.373,
              -1841.599
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15515,
            1.13443,
            -0.0524
          ],
          "actualElbowWorld": [
            -0.15476,
            1.13433,
            -0.05144
          ],
          "targetWristWorld": [
            -0.23383,
            1.14089,
            0.16566
          ],
          "actualWristWorld": [
            -0.23475,
            1.14102,
            0.16614
          ],
          "targetBladeDirectionWorld": [
            -0.73395,
            0.42755,
            0.52775
          ],
          "actualBladeDirectionWorld": [
            -0.69554,
            0.48516,
            0.52995
          ],
          "desiredTipWorld": [
            -0.81988,
            1.63025,
            0.62669
          ],
          "actualTipWorld": [
            -0.80039,
            1.65948,
            0.6278
          ],
          "hiltWorld": [
            -0.44749,
            1.41332,
            0.35891
          ],
          "elbowWorldError": 0.00105,
          "wristWorldError": 0.00105,
          "bladeTipWorldError": 0.03515,
          "bladeAngleErrorDeg": 3.97,
          "rightArmRotationFromInputDeg": 23.651,
          "rightForeArmRotationFromInputDeg": 15.132,
          "rightHandRotationFromInputDeg": 56.549,
          "endpoint": false
        },
        {
          "label": "source-0.083333",
          "time": 0.083333,
          "source": {
            "label": "source-0.083333",
            "time": 0.083333,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              2305.316,
              2055.559
            ],
            "tipScreen": [
              -15.225,
              41.049
            ],
            "tipMinusHilt": [
              -2320.541,
              -2014.51
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15812,
            1.13059,
            -0.03637
          ],
          "actualElbowWorld": [
            -0.15747,
            1.13082,
            -0.03673
          ],
          "targetWristWorld": [
            -0.25077,
            1.11,
            0.17524
          ],
          "actualWristWorld": [
            -0.24997,
            1.11019,
            0.17494
          ],
          "targetBladeDirectionWorld": [
            -0.82974,
            0.26934,
            0.48887
          ],
          "actualBladeDirectionWorld": [
            -0.82238,
            0.28361,
            0.49321
          ],
          "desiredTipWorld": [
            -0.94634,
            1.44919,
            0.62246
          ],
          "actualTipWorld": [
            -0.94261,
            1.45643,
            0.62466
          ],
          "hiltWorld": [
            -0.52534,
            1.31253,
            0.37441
          ],
          "elbowWorldError": 0.00078,
          "wristWorldError": 0.00088,
          "bladeTipWorldError": 0.00844,
          "bladeAngleErrorDeg": 0.953,
          "rightArmRotationFromInputDeg": 43.263,
          "rightForeArmRotationFromInputDeg": 31.394,
          "rightHandRotationFromInputDeg": 66.504,
          "endpoint": false
        },
        {
          "label": "source-0.125000",
          "time": 0.125,
          "source": {
            "label": "source-0.125000",
            "time": 0.125,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              2101.38,
              1831.024
            ],
            "tipScreen": [
              -124.486,
              14.561
            ],
            "tipMinusHilt": [
              -2225.865,
              -1816.464
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.16375,
            1.12663,
            0.0026
          ],
          "actualElbowWorld": [
            -0.12472,
            1.14177,
            0.02924
          ],
          "targetWristWorld": [
            -0.25704,
            1.0799,
            0.20971
          ],
          "actualWristWorld": [
            -0.25661,
            1.07917,
            0.20944
          ],
          "targetBladeDirectionWorld": [
            -0.87705,
            0.10175,
            0.4695
          ],
          "actualBladeDirectionWorld": [
            -0.8464,
            0.21074,
            0.48908
          ],
          "desiredTipWorld": [
            -0.99775,
            1.30977,
            0.63957
          ],
          "actualTipWorld": [
            -0.9822,
            1.36507,
            0.6495
          ],
          "hiltWorld": [
            -0.55275,
            1.25814,
            0.40135
          ],
          "elbowWorldError": 0.04962,
          "wristWorldError": 0.00089,
          "bladeTipWorldError": 0.0583,
          "bladeAngleErrorDeg": 6.587,
          "rightArmRotationFromInputDeg": 34.784,
          "rightForeArmRotationFromInputDeg": 12.44,
          "rightHandRotationFromInputDeg": 46.481,
          "endpoint": false
        },
        {
          "label": "source-0.166667",
          "time": 0.166667,
          "source": {
            "label": "source-0.166667",
            "time": 0.166667,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              2183.848,
              1706.49
            ],
            "tipScreen": [
              -324.605,
              -24.051
            ],
            "tipMinusHilt": [
              -2508.453,
              -1730.541
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.17747,
            1.13249,
            0.06155
          ],
          "actualElbowWorld": [
            -0.18232,
            1.13056,
            0.05751
          ],
          "targetWristWorld": [
            -0.27828,
            1.03956,
            0.24859
          ],
          "actualWristWorld": [
            -0.27758,
            1.03973,
            0.24845
          ],
          "targetBladeDirectionWorld": [
            -0.89574,
            -0.14381,
            0.42066
          ],
          "actualBladeDirectionWorld": [
            -0.8954,
            -0.14208,
            0.42198
          ],
          "desiredTipWorld": [
            -1.07612,
            1.01047,
            0.65236
          ],
          "actualTipWorld": [
            -1.07595,
            1.01135,
            0.65303
          ],
          "hiltWorld": [
            -0.62163,
            1.08344,
            0.43893
          ],
          "elbowWorldError": 0.00659,
          "wristWorldError": 0.00074,
          "bladeTipWorldError": 0.00112,
          "bladeAngleErrorDeg": 0.126,
          "rightArmRotationFromInputDeg": 33.644,
          "rightForeArmRotationFromInputDeg": 58.676,
          "rightHandRotationFromInputDeg": 73.658,
          "endpoint": false
        },
        {
          "label": "source-0.208333",
          "time": 0.208333,
          "source": {
            "label": "source-0.208333",
            "time": 0.208333,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              2019.693,
              1660.432
            ],
            "tipScreen": [
              -785.99,
              -396.242
            ],
            "tipMinusHilt": [
              -2805.683,
              -2056.675
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.20682,
            1.17679,
            0.15185
          ],
          "actualElbowWorld": [
            -0.24677,
            1.15667,
            0.12183
          ],
          "targetWristWorld": [
            -0.30292,
            1.0559,
            0.32487
          ],
          "actualWristWorld": [
            -0.30232,
            1.05716,
            0.32381
          ],
          "targetBladeDirectionWorld": [
            -0.75972,
            -0.37707,
            0.52976
          ],
          "actualBladeDirectionWorld": [
            -0.75997,
            -0.37571,
            0.53036
          ],
          "desiredTipWorld": [
            -0.96874,
            0.79838,
            0.86294
          ],
          "actualTipWorld": [
            -0.96887,
            0.79907,
            0.86324
          ],
          "hiltWorld": [
            -0.58327,
            0.9897,
            0.59415
          ],
          "elbowWorldError": 0.05388,
          "wristWorldError": 0.00175,
          "bladeTipWorldError": 0.00076,
          "bladeAngleErrorDeg": 0.086,
          "rightArmRotationFromInputDeg": 26.692,
          "rightForeArmRotationFromInputDeg": 61.985,
          "rightHandRotationFromInputDeg": 82.056,
          "endpoint": false
        },
        {
          "label": "anticipation",
          "time": 0.25,
          "source": {
            "label": "anticipation",
            "time": 0.25,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              261.506,
              1665.237
            ],
            "tipScreen": [
              -2401.354,
              8901.717
            ],
            "tipMinusHilt": [
              -2662.86,
              7236.48
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.1862,
            1.411,
            0.228
          ],
          "actualElbowWorld": [
            -0.22073,
            1.38447,
            0.23479
          ],
          "targetWristWorld": [
            -0.18253,
            1.46382,
            0.45379
          ],
          "actualWristWorld": [
            -0.18267,
            1.46294,
            0.44968
          ],
          "targetBladeDirectionWorld": [
            -0.03065,
            0.56205,
            0.82653
          ],
          "actualBladeDirectionWorld": [
            -0.02786,
            0.56345,
            0.82568
          ],
          "desiredTipWorld": [
            -0.13657,
            2.02436,
            1.14555
          ],
          "actualTipWorld": [
            -0.13515,
            2.02507,
            1.14512
          ],
          "hiltWorld": [
            -0.12102,
            1.73918,
            0.72618
          ],
          "elbowWorldError": 0.04407,
          "wristWorldError": 0.00421,
          "bladeTipWorldError": 0.00164,
          "bladeAngleErrorDeg": 0.185,
          "rightArmRotationFromInputDeg": 111.621,
          "rightForeArmRotationFromInputDeg": 79.716,
          "rightHandRotationFromInputDeg": 70.139,
          "endpoint": false
        },
        {
          "label": "source-0.291667",
          "time": 0.291667,
          "source": {
            "label": "source-0.291667",
            "time": 0.291667,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              -269.544,
              1300.167
            ],
            "tipScreen": [
              5661.904,
              -1138.165
            ],
            "tipMinusHilt": [
              5931.449,
              -2438.332
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.11035,
            1.46856,
            0.17906
          ],
          "actualElbowWorld": [
            -0.12334,
            1.4468,
            0.19741
          ],
          "targetWristWorld": [
            -0.09636,
            1.6232,
            0.35132
          ],
          "actualWristWorld": [
            -0.09745,
            1.62083,
            0.3485
          ],
          "targetBladeDirectionWorld": [
            0.10233,
            0.96749,
            -0.23128
          ],
          "actualBladeDirectionWorld": [
            -0.0307,
            0.95789,
            -0.28549
          ],
          "desiredTipWorld": [
            -0.14266,
            2.45928,
            0.06888
          ],
          "actualTipWorld": [
            -0.21016,
            2.45441,
            0.04138
          ],
          "hiltWorld": [
            -0.19458,
            1.96839,
            0.18623
          ],
          "elbowWorldError": 0.03129,
          "wristWorldError": 0.00384,
          "bladeTipWorldError": 0.07305,
          "bladeAngleErrorDeg": 8.256,
          "rightArmRotationFromInputDeg": 107.912,
          "rightForeArmRotationFromInputDeg": 77.18,
          "rightHandRotationFromInputDeg": 58.632,
          "endpoint": false
        },
        {
          "label": "source-0.333333",
          "time": 0.333333,
          "source": {
            "label": "source-0.333333",
            "time": 0.333333,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              -268.126,
              1226.372
            ],
            "tipScreen": [
              5983.833,
              -1041.777
            ],
            "tipMinusHilt": [
              6251.958,
              -2268.149
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.1053,
            1.47204,
            0.17372
          ],
          "actualElbowWorld": [
            -0.1193,
            1.45167,
            0.19317
          ],
          "targetWristWorld": [
            -0.08654,
            1.62989,
            0.34259
          ],
          "actualWristWorld": [
            -0.0869,
            1.62768,
            0.34065
          ],
          "targetBladeDirectionWorld": [
            0.09405,
            0.9631,
            -0.25219
          ],
          "actualBladeDirectionWorld": [
            -0.04429,
            0.95349,
            -0.29815
          ],
          "desiredTipWorld": [
            -0.12799,
            2.45607,
            0.0303
          ],
          "actualTipWorld": [
            -0.19818,
            2.45119,
            0.00698
          ],
          "hiltWorld": [
            -0.17571,
            1.9674,
            0.15826
          ],
          "elbowWorldError": 0.03145,
          "wristWorldError": 0.00296,
          "bladeTipWorldError": 0.07412,
          "bladeAngleErrorDeg": 8.378,
          "rightArmRotationFromInputDeg": 111.696,
          "rightForeArmRotationFromInputDeg": 79.413,
          "rightHandRotationFromInputDeg": 47.013,
          "endpoint": false
        },
        {
          "label": "source-0.375000",
          "time": 0.375,
          "source": {
            "label": "source-0.375000",
            "time": 0.375,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              -272.955,
              1199.583
            ],
            "tipScreen": [
              5604.108,
              -855.814
            ],
            "tipMinusHilt": [
              5877.063,
              -2055.397
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.10313,
            1.47431,
            0.17079
          ],
          "actualElbowWorld": [
            -0.12673,
            1.45289,
            0.19621
          ],
          "targetWristWorld": [
            -0.08248,
            1.63395,
            0.33774
          ],
          "actualWristWorld": [
            -0.08279,
            1.63219,
            0.33657
          ],
          "targetBladeDirectionWorld": [
            0.08579,
            0.96088,
            -0.26333
          ],
          "actualBladeDirectionWorld": [
            -0.05099,
            0.95055,
            -0.30637
          ],
          "desiredTipWorld": [
            -0.12449,
            2.45585,
            0.01237
          ],
          "actualTipWorld": [
            -0.19389,
            2.4506,
            -0.00947
          ],
          "hiltWorld": [
            -0.16801,
            1.96831,
            0.14598
          ],
          "elbowWorldError": 0.04078,
          "wristWorldError": 0.00213,
          "bladeTipWorldError": 0.07294,
          "bladeAngleErrorDeg": 8.244,
          "rightArmRotationFromInputDeg": 111.68,
          "rightForeArmRotationFromInputDeg": 80.126,
          "rightHandRotationFromInputDeg": 40.104,
          "endpoint": false
        },
        {
          "label": "source-0.416667",
          "time": 0.416667,
          "source": {
            "label": "source-0.416667",
            "time": 0.416667,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              -273.081,
              1187.025
            ],
            "tipScreen": [
              5616.64,
              -824.195
            ],
            "tipMinusHilt": [
              5889.72,
              -2011.221
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.10218,
            1.47502,
            0.16967
          ],
          "actualElbowWorld": [
            -0.11531,
            1.45767,
            0.18805
          ],
          "targetWristWorld": [
            -0.08065,
            1.6353,
            0.3359
          ],
          "actualWristWorld": [
            -0.08129,
            1.63398,
            0.33481
          ],
          "targetBladeDirectionWorld": [
            0.08377,
            0.95993,
            -0.26744
          ],
          "actualBladeDirectionWorld": [
            -0.05256,
            0.9496,
            -0.30904
          ],
          "desiredTipWorld": [
            -0.14197,
            2.46144,
            0.02579
          ],
          "actualTipWorld": [
            -0.21114,
            2.4562,
            0.00468
          ],
          "hiltWorld": [
            -0.18447,
            1.97439,
            0.16148
          ],
          "elbowWorldError": 0.02848,
          "wristWorldError": 0.00182,
          "bladeTipWorldError": 0.07251,
          "bladeAngleErrorDeg": 8.195,
          "rightArmRotationFromInputDeg": 112.354,
          "rightForeArmRotationFromInputDeg": 79.931,
          "rightHandRotationFromInputDeg": 54.37,
          "endpoint": false
        },
        {
          "label": "contact",
          "time": 0.458333,
          "source": {
            "label": "contact",
            "time": 0.458333,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              -260.496,
              1156.504
            ],
            "tipScreen": [
              7117.274,
              -1124.957
            ],
            "tipMinusHilt": [
              7377.77,
              -2281.461
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.10034,
            1.47445,
            0.16879
          ],
          "actualElbowWorld": [
            -0.10663,
            1.45771,
            0.18303
          ],
          "targetWristWorld": [
            -0.0766,
            1.63498,
            0.33447
          ],
          "actualWristWorld": [
            -0.07696,
            1.63279,
            0.33219
          ],
          "targetBladeDirectionWorld": [
            0.09084,
            0.95844,
            -0.27044
          ],
          "actualBladeDirectionWorld": [
            -0.04683,
            0.94806,
            -0.31462
          ],
          "desiredTipWorld": [
            -0.14863,
            2.47021,
            0.05564
          ],
          "actualTipWorld": [
            -0.21848,
            2.46495,
            0.03323
          ],
          "hiltWorld": [
            -0.19472,
            1.98392,
            0.19286
          ],
          "elbowWorldError": 0.02287,
          "wristWorldError": 0.00318,
          "bladeTipWorldError": 0.07355,
          "bladeAngleErrorDeg": 8.312,
          "rightArmRotationFromInputDeg": 110.245,
          "rightForeArmRotationFromInputDeg": 78.281,
          "rightHandRotationFromInputDeg": 75.272,
          "endpoint": false
        },
        {
          "label": "source-0.500000",
          "time": 0.5,
          "source": {
            "label": "source-0.500000",
            "time": 0.5,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              -228.897,
              1147.881
            ],
            "tipScreen": [
              -3942.414,
              1729.946
            ],
            "tipMinusHilt": [
              -3713.518,
              582.066
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.09553,
            1.44758,
            0.18111
          ],
          "actualElbowWorld": [
            -0.09492,
            1.4472,
            0.18089
          ],
          "targetWristWorld": [
            -0.07528,
            1.61196,
            0.34345
          ],
          "actualWristWorld": [
            -0.0749,
            1.61176,
            0.34307
          ],
          "targetBladeDirectionWorld": [
            0.22371,
            0.9653,
            -0.13474
          ],
          "actualBladeDirectionWorld": [
            0.13852,
            0.96444,
            -0.22512
          ],
          "desiredTipWorld": [
            0.08934,
            2.44723,
            0.08901
          ],
          "actualTipWorld": [
            0.04611,
            2.44679,
            0.04315
          ],
          "hiltWorld": [
            -0.02417,
            1.95745,
            0.15737
          ],
          "elbowWorldError": 0.00075,
          "wristWorldError": 0.00058,
          "bladeTipWorldError": 0.06302,
          "bladeAngleErrorDeg": 7.121,
          "rightArmRotationFromInputDeg": 126.044,
          "rightForeArmRotationFromInputDeg": 87.026,
          "rightHandRotationFromInputDeg": 21.09,
          "endpoint": false
        },
        {
          "label": "source-0.541667",
          "time": 0.541667,
          "source": {
            "label": "source-0.541667",
            "time": 0.541667,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              -126.094,
              1151.28
            ],
            "tipScreen": [
              -1260.914,
              1378.435
            ],
            "tipMinusHilt": [
              -1134.82,
              227.155
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.09414,
            1.36525,
            0.20078
          ],
          "actualElbowWorld": [
            -0.10587,
            1.35701,
            0.20767
          ],
          "targetWristWorld": [
            -0.08373,
            1.53509,
            0.35836
          ],
          "actualWristWorld": [
            -0.08416,
            1.53349,
            0.35656
          ],
          "targetBladeDirectionWorld": [
            0.31598,
            0.91451,
            0.25264
          ],
          "actualBladeDirectionWorld": [
            0.27734,
            0.95315,
            0.12074
          ],
          "desiredTipWorld": [
            0.16502,
            2.37939,
            0.4316
          ],
          "actualTipWorld": [
            0.14542,
            2.399,
            0.36468
          ],
          "hiltWorld": [
            0.0047,
            1.91538,
            0.30341
          ],
          "elbowWorldError": 0.0159,
          "wristWorldError": 0.00245,
          "bladeTipWorldError": 0.07244,
          "bladeAngleErrorDeg": 8.187,
          "rightArmRotationFromInputDeg": 96.245,
          "rightForeArmRotationFromInputDeg": 50.715,
          "rightHandRotationFromInputDeg": 47.129,
          "endpoint": false
        },
        {
          "label": "source-0.583333",
          "time": 0.583333,
          "source": {
            "label": "source-0.583333",
            "time": 0.583333,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              26.187,
              1156.803
            ],
            "tipScreen": [
              -1559.975,
              2293.257
            ],
            "tipMinusHilt": [
              -1586.162,
              1136.454
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.10442,
            1.27629,
            0.19013
          ],
          "actualElbowWorld": [
            -0.09406,
            1.28219,
            0.18604
          ],
          "targetWristWorld": [
            -0.10301,
            1.43725,
            0.35708
          ],
          "actualWristWorld": [
            -0.10303,
            1.43742,
            0.3581
          ],
          "targetBladeDirectionWorld": [
            0.17709,
            0.85083,
            0.49469
          ],
          "actualBladeDirectionWorld": [
            0.14975,
            0.90694,
            0.39375
          ],
          "desiredTipWorld": [
            0.02939,
            2.25812,
            0.66766
          ],
          "actualTipWorld": [
            0.01551,
            2.28659,
            0.61645
          ],
          "hiltWorld": [
            -0.06047,
            1.82642,
            0.41666
          ],
          "elbowWorldError": 0.0126,
          "wristWorldError": 0.00104,
          "bladeTipWorldError": 0.06022,
          "bladeAngleErrorDeg": 6.804,
          "rightArmRotationFromInputDeg": 61.581,
          "rightForeArmRotationFromInputDeg": 23.929,
          "rightHandRotationFromInputDeg": 53.707,
          "endpoint": false
        },
        {
          "label": "source-0.625000",
          "time": 0.625,
          "source": {
            "label": "source-0.625000",
            "time": 0.625,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              215.065,
              1222.521
            ],
            "tipScreen": [
              -10959.281,
              18769.397
            ],
            "tipMinusHilt": [
              -11174.346,
              17546.877
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.12019,
            1.20424,
            0.15053
          ],
          "actualElbowWorld": [
            -0.12051,
            1.2037,
            0.1502
          ],
          "targetWristWorld": [
            -0.13474,
            1.33741,
            0.33984
          ],
          "actualWristWorld": [
            -0.13522,
            1.33765,
            0.33894
          ],
          "targetBladeDirectionWorld": [
            0.00259,
            0.78836,
            0.61521
          ],
          "actualBladeDirectionWorld": [
            -0.04052,
            0.8379,
            0.54432
          ],
          "desiredTipWorld": [
            -0.20265,
            2.10367,
            0.78476
          ],
          "actualTipWorld": [
            -0.22452,
            2.12881,
            0.74879
          ],
          "hiltWorld": [
            -0.20397,
            1.70367,
            0.47261
          ],
          "elbowWorldError": 0.00071,
          "wristWorldError": 0.00104,
          "bladeTipWorldError": 0.04903,
          "bladeAngleErrorDeg": 5.539,
          "rightArmRotationFromInputDeg": 67.515,
          "rightForeArmRotationFromInputDeg": 48.177,
          "rightHandRotationFromInputDeg": 58.201,
          "endpoint": false
        },
        {
          "label": "source-0.666667",
          "time": 0.666667,
          "source": {
            "label": "source-0.666667",
            "time": 0.666667,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              472.971,
              1301.222
            ],
            "tipScreen": [
              946.756,
              -1511.269
            ],
            "tipMinusHilt": [
              473.785,
              -2812.491
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.13778,
            1.14956,
            0.07918
          ],
          "actualElbowWorld": [
            -0.13889,
            1.1491,
            0.07909
          ],
          "targetWristWorld": [
            -0.17301,
            1.24059,
            0.28955
          ],
          "actualWristWorld": [
            -0.17258,
            1.24058,
            0.28952
          ],
          "targetBladeDirectionWorld": [
            -0.19185,
            0.74713,
            0.63638
          ],
          "actualBladeDirectionWorld": [
            -0.14668,
            0.83412,
            0.53173
          ],
          "desiredTipWorld": [
            -0.30224,
            1.99491,
            0.73371
          ],
          "actualTipWorld": [
            -0.27932,
            2.03904,
            0.6806
          ],
          "hiltWorld": [
            -0.2049,
            1.61583,
            0.41081
          ],
          "elbowWorldError": 0.0012,
          "wristWorldError": 0.00044,
          "bladeTipWorldError": 0.07275,
          "bladeAngleErrorDeg": 8.222,
          "rightArmRotationFromInputDeg": 21.026,
          "rightForeArmRotationFromInputDeg": 1.9,
          "rightHandRotationFromInputDeg": 37.947,
          "endpoint": false
        },
        {
          "label": "source-0.708333",
          "time": 0.708333,
          "source": {
            "label": "source-0.708333",
            "time": 0.708333,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              739.439,
              1352.696
            ],
            "tipScreen": [
              523.108,
              -591.245
            ],
            "tipMinusHilt": [
              -216.331,
              -1943.942
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.14927,
            1.13064,
            0.00542
          ],
          "actualElbowWorld": [
            -0.14996,
            1.13044,
            0.00565
          ],
          "targetWristWorld": [
            -0.20382,
            1.18117,
            0.22508
          ],
          "actualWristWorld": [
            -0.20447,
            1.18108,
            0.22531
          ],
          "targetBladeDirectionWorld": [
            -0.27739,
            0.76621,
            0.57964
          ],
          "actualBladeDirectionWorld": [
            -0.20137,
            0.84762,
            0.49091
          ],
          "desiredTipWorld": [
            -0.37542,
            1.94749,
            0.63358
          ],
          "actualTipWorld": [
            -0.33685,
            1.98879,
            0.58856
          ],
          "hiltWorld": [
            -0.23468,
            1.55872,
            0.33948
          ],
          "elbowWorldError": 0.00076,
          "wristWorldError": 0.00069,
          "bladeTipWorldError": 0.07225,
          "bladeAngleErrorDeg": 8.166,
          "rightArmRotationFromInputDeg": 19.819,
          "rightForeArmRotationFromInputDeg": 14.637,
          "rightHandRotationFromInputDeg": 25.76,
          "endpoint": false
        },
        {
          "label": "followThrough",
          "time": 0.75,
          "source": {
            "label": "followThrough",
            "time": 0.75,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              919.263,
              1363.806
            ],
            "tipScreen": [
              483.975,
              -405.596
            ],
            "tipMinusHilt": [
              -435.288,
              -1769.403
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15356,
            1.13251,
            -0.0404
          ],
          "actualElbowWorld": [
            -0.15296,
            1.13275,
            -0.04074
          ],
          "targetWristWorld": [
            -0.22046,
            1.15801,
            0.18018
          ],
          "actualWristWorld": [
            -0.21976,
            1.15759,
            0.17995
          ],
          "targetBladeDirectionWorld": [
            -0.27068,
            0.80148,
            0.53325
          ],
          "actualBladeDirectionWorld": [
            -0.17725,
            0.86274,
            0.47357
          ],
          "desiredTipWorld": [
            -0.35931,
            1.94172,
            0.56915
          ],
          "actualTipWorld": [
            -0.31191,
            1.9728,
            0.53887
          ],
          "hiltWorld": [
            -0.22197,
            1.53506,
            0.29858
          ],
          "elbowWorldError": 0.00072,
          "wristWorldError": 0.00085,
          "bladeTipWorldError": 0.06427,
          "bladeAngleErrorDeg": 7.262,
          "rightArmRotationFromInputDeg": 21.385,
          "rightForeArmRotationFromInputDeg": 16.598,
          "rightHandRotationFromInputDeg": 20.323,
          "endpoint": false
        },
        {
          "label": "source-0.791667",
          "time": 0.791667,
          "source": {
            "label": "source-0.791667",
            "time": 0.791667,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              977.599,
              1362.229
            ],
            "tipScreen": [
              487.45,
              -373.73
            ],
            "tipMinusHilt": [
              -490.149,
              -1735.959
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.15369,
            1.13532,
            -0.05445
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.22577,
            1.15309,
            0.16526
          ],
          "targetBladeDirectionWorld": [
            -0.25879,
            0.81433,
            0.51952
          ],
          "actualBladeDirectionWorld": [
            -0.17286,
            0.86809,
            0.46534
          ],
          "desiredTipWorld": [
            -0.35685,
            1.94472,
            0.54434
          ],
          "actualTipWorld": [
            -0.31325,
            1.972,
            0.51685
          ],
          "hiltWorld": [
            -0.22554,
            1.53154,
            0.28075
          ],
          "elbowWorldError": 0.00072,
          "wristWorldError": 0.0008,
          "bladeTipWorldError": 0.05832,
          "bladeAngleErrorDeg": 6.589,
          "rightArmRotationFromInputDeg": 25.998,
          "rightForeArmRotationFromInputDeg": 20.6,
          "rightHandRotationFromInputDeg": 17.496,
          "endpoint": false
        },
        {
          "label": "source-0.833333",
          "time": 0.833333,
          "source": {
            "label": "source-0.833333",
            "time": 0.833333,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              977.599,
              1362.229
            ],
            "tipScreen": [
              487.45,
              -373.73
            ],
            "tipMinusHilt": [
              -490.149,
              -1735.959
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.15369,
            1.13532,
            -0.05445
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.22577,
            1.15309,
            0.16526
          ],
          "targetBladeDirectionWorld": [
            -0.25879,
            0.81433,
            0.51952
          ],
          "actualBladeDirectionWorld": [
            -0.17286,
            0.86809,
            0.46534
          ],
          "desiredTipWorld": [
            -0.35685,
            1.94472,
            0.54434
          ],
          "actualTipWorld": [
            -0.31325,
            1.972,
            0.51685
          ],
          "hiltWorld": [
            -0.22554,
            1.53154,
            0.28075
          ],
          "elbowWorldError": 0.00072,
          "wristWorldError": 0.0008,
          "bladeTipWorldError": 0.05832,
          "bladeAngleErrorDeg": 6.589,
          "rightArmRotationFromInputDeg": 25.998,
          "rightForeArmRotationFromInputDeg": 20.6,
          "rightHandRotationFromInputDeg": 17.496,
          "endpoint": false
        },
        {
          "label": "source-0.875000",
          "time": 0.875,
          "source": {
            "label": "source-0.875000",
            "time": 0.875,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              977.599,
              1362.229
            ],
            "tipScreen": [
              487.45,
              -373.73
            ],
            "tipMinusHilt": [
              -490.149,
              -1735.959
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.15369,
            1.13532,
            -0.05445
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.22577,
            1.15309,
            0.16526
          ],
          "targetBladeDirectionWorld": [
            -0.25879,
            0.81433,
            0.51952
          ],
          "actualBladeDirectionWorld": [
            -0.17286,
            0.86809,
            0.46534
          ],
          "desiredTipWorld": [
            -0.35685,
            1.94472,
            0.54434
          ],
          "actualTipWorld": [
            -0.31325,
            1.972,
            0.51685
          ],
          "hiltWorld": [
            -0.22554,
            1.53154,
            0.28075
          ],
          "elbowWorldError": 0.00072,
          "wristWorldError": 0.0008,
          "bladeTipWorldError": 0.05832,
          "bladeAngleErrorDeg": 6.589,
          "rightArmRotationFromInputDeg": 25.998,
          "rightForeArmRotationFromInputDeg": 20.6,
          "rightHandRotationFromInputDeg": 17.496,
          "endpoint": false
        },
        {
          "label": "source-0.916667",
          "time": 0.916667,
          "source": {
            "label": "source-0.916667",
            "time": 0.916667,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              977.599,
              1362.229
            ],
            "tipScreen": [
              487.45,
              -373.73
            ],
            "tipMinusHilt": [
              -490.149,
              -1735.959
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.15369,
            1.13532,
            -0.05445
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.22577,
            1.15309,
            0.16526
          ],
          "targetBladeDirectionWorld": [
            -0.25879,
            0.81433,
            0.51952
          ],
          "actualBladeDirectionWorld": [
            -0.17286,
            0.86809,
            0.46534
          ],
          "desiredTipWorld": [
            -0.35685,
            1.94472,
            0.54434
          ],
          "actualTipWorld": [
            -0.31325,
            1.972,
            0.51685
          ],
          "hiltWorld": [
            -0.22554,
            1.53154,
            0.28075
          ],
          "elbowWorldError": 0.00072,
          "wristWorldError": 0.0008,
          "bladeTipWorldError": 0.05832,
          "bladeAngleErrorDeg": 6.589,
          "rightArmRotationFromInputDeg": 25.998,
          "rightForeArmRotationFromInputDeg": 20.6,
          "rightHandRotationFromInputDeg": 17.496,
          "endpoint": false
        },
        {
          "label": "source-0.958333",
          "time": 0.958333,
          "source": {
            "label": "source-0.958333",
            "time": 0.958333,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              977.599,
              1362.229
            ],
            "tipScreen": [
              487.45,
              -373.73
            ],
            "tipMinusHilt": [
              -490.149,
              -1735.959
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.15369,
            1.13532,
            -0.05445
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.22577,
            1.15309,
            0.16526
          ],
          "targetBladeDirectionWorld": [
            -0.25879,
            0.81433,
            0.51952
          ],
          "actualBladeDirectionWorld": [
            -0.17286,
            0.86809,
            0.46534
          ],
          "desiredTipWorld": [
            -0.35685,
            1.94472,
            0.54434
          ],
          "actualTipWorld": [
            -0.31325,
            1.972,
            0.51685
          ],
          "hiltWorld": [
            -0.22554,
            1.53154,
            0.28075
          ],
          "elbowWorldError": 0.00072,
          "wristWorldError": 0.0008,
          "bladeTipWorldError": 0.05832,
          "bladeAngleErrorDeg": 6.589,
          "rightArmRotationFromInputDeg": 25.998,
          "rightForeArmRotationFromInputDeg": 20.6,
          "rightHandRotationFromInputDeg": 17.496,
          "endpoint": false
        },
        {
          "label": "recoil",
          "time": 1,
          "source": {
            "label": "recoil",
            "time": 1,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              977.599,
              1362.229
            ],
            "tipScreen": [
              487.45,
              -373.73
            ],
            "tipMinusHilt": [
              -490.149,
              -1735.959
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.15369,
            1.13532,
            -0.05445
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.22577,
            1.15309,
            0.16526
          ],
          "targetBladeDirectionWorld": [
            -0.25879,
            0.81433,
            0.51952
          ],
          "actualBladeDirectionWorld": [
            -0.17286,
            0.86809,
            0.46534
          ],
          "desiredTipWorld": [
            -0.35685,
            1.94472,
            0.54434
          ],
          "actualTipWorld": [
            -0.31325,
            1.972,
            0.51685
          ],
          "hiltWorld": [
            -0.22554,
            1.53154,
            0.28075
          ],
          "elbowWorldError": 0.00072,
          "wristWorldError": 0.0008,
          "bladeTipWorldError": 0.05832,
          "bladeAngleErrorDeg": 6.589,
          "rightArmRotationFromInputDeg": 25.998,
          "rightForeArmRotationFromInputDeg": 20.6,
          "rightHandRotationFromInputDeg": 17.496,
          "endpoint": false
        },
        {
          "label": "source-1.041667",
          "time": 1.041667,
          "source": {
            "label": "source-1.041667",
            "time": 1.041667,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              977.599,
              1362.229
            ],
            "tipScreen": [
              487.45,
              -373.73
            ],
            "tipMinusHilt": [
              -490.149,
              -1735.959
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.15369,
            1.13532,
            -0.05445
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.22577,
            1.15309,
            0.16526
          ],
          "targetBladeDirectionWorld": [
            -0.25879,
            0.81433,
            0.51952
          ],
          "actualBladeDirectionWorld": [
            -0.17286,
            0.86809,
            0.46534
          ],
          "desiredTipWorld": [
            -0.35685,
            1.94472,
            0.54434
          ],
          "actualTipWorld": [
            -0.31325,
            1.972,
            0.51685
          ],
          "hiltWorld": [
            -0.22554,
            1.53154,
            0.28075
          ],
          "elbowWorldError": 0.00072,
          "wristWorldError": 0.0008,
          "bladeTipWorldError": 0.05832,
          "bladeAngleErrorDeg": 6.589,
          "rightArmRotationFromInputDeg": 25.998,
          "rightForeArmRotationFromInputDeg": 20.6,
          "rightHandRotationFromInputDeg": 17.496,
          "endpoint": false
        },
        {
          "label": "source-1.083333",
          "time": 1.083333,
          "source": {
            "label": "source-1.083333",
            "time": 1.083333,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              977.599,
              1362.229
            ],
            "tipScreen": [
              487.45,
              -373.73
            ],
            "tipMinusHilt": [
              -490.149,
              -1735.959
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.15369,
            1.13532,
            -0.05445
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.22577,
            1.15309,
            0.16526
          ],
          "targetBladeDirectionWorld": [
            -0.25879,
            0.81433,
            0.51952
          ],
          "actualBladeDirectionWorld": [
            -0.17286,
            0.86809,
            0.46534
          ],
          "desiredTipWorld": [
            -0.35685,
            1.94472,
            0.54434
          ],
          "actualTipWorld": [
            -0.31325,
            1.972,
            0.51685
          ],
          "hiltWorld": [
            -0.22554,
            1.53154,
            0.28075
          ],
          "elbowWorldError": 0.00072,
          "wristWorldError": 0.0008,
          "bladeTipWorldError": 0.05832,
          "bladeAngleErrorDeg": 6.589,
          "rightArmRotationFromInputDeg": 25.998,
          "rightForeArmRotationFromInputDeg": 20.6,
          "rightHandRotationFromInputDeg": 17.496,
          "endpoint": false
        },
        {
          "label": "source-1.125000",
          "time": 1.125,
          "source": {
            "label": "source-1.125000",
            "time": 1.125,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              977.599,
              1362.229
            ],
            "tipScreen": [
              487.45,
              -373.73
            ],
            "tipMinusHilt": [
              -490.149,
              -1735.959
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.15369,
            1.13532,
            -0.05445
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.22577,
            1.15309,
            0.16526
          ],
          "targetBladeDirectionWorld": [
            -0.25879,
            0.81433,
            0.51952
          ],
          "actualBladeDirectionWorld": [
            -0.17286,
            0.86809,
            0.46534
          ],
          "desiredTipWorld": [
            -0.35685,
            1.94472,
            0.54434
          ],
          "actualTipWorld": [
            -0.31325,
            1.972,
            0.51685
          ],
          "hiltWorld": [
            -0.22554,
            1.53154,
            0.28075
          ],
          "elbowWorldError": 0.00072,
          "wristWorldError": 0.0008,
          "bladeTipWorldError": 0.05832,
          "bladeAngleErrorDeg": 6.589,
          "rightArmRotationFromInputDeg": 25.998,
          "rightForeArmRotationFromInputDeg": 20.6,
          "rightHandRotationFromInputDeg": 17.496,
          "endpoint": false
        },
        {
          "label": "source-1.166667",
          "time": 1.166667,
          "source": {
            "label": "source-1.166667",
            "time": 1.166667,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              977.599,
              1362.229
            ],
            "tipScreen": [
              487.45,
              -373.73
            ],
            "tipMinusHilt": [
              -490.149,
              -1735.959
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.15369,
            1.13532,
            -0.05445
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.22577,
            1.15309,
            0.16526
          ],
          "targetBladeDirectionWorld": [
            -0.25879,
            0.81433,
            0.51952
          ],
          "actualBladeDirectionWorld": [
            -0.17286,
            0.86809,
            0.46534
          ],
          "desiredTipWorld": [
            -0.35685,
            1.94472,
            0.54434
          ],
          "actualTipWorld": [
            -0.31325,
            1.972,
            0.51685
          ],
          "hiltWorld": [
            -0.22554,
            1.53154,
            0.28075
          ],
          "elbowWorldError": 0.00072,
          "wristWorldError": 0.0008,
          "bladeTipWorldError": 0.05832,
          "bladeAngleErrorDeg": 6.589,
          "rightArmRotationFromInputDeg": 25.998,
          "rightForeArmRotationFromInputDeg": 20.6,
          "rightHandRotationFromInputDeg": 17.496,
          "endpoint": false
        },
        {
          "label": "source-1.208333",
          "time": 1.208333,
          "source": {
            "label": "source-1.208333",
            "time": 1.208333,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              977.599,
              1362.229
            ],
            "tipScreen": [
              487.45,
              -373.73
            ],
            "tipMinusHilt": [
              -490.149,
              -1735.959
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.15369,
            1.13532,
            -0.05445
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.22577,
            1.15309,
            0.16526
          ],
          "targetBladeDirectionWorld": [
            -0.25879,
            0.81433,
            0.51952
          ],
          "actualBladeDirectionWorld": [
            -0.17286,
            0.86809,
            0.46534
          ],
          "desiredTipWorld": [
            -0.35685,
            1.94472,
            0.54434
          ],
          "actualTipWorld": [
            -0.31325,
            1.972,
            0.51685
          ],
          "hiltWorld": [
            -0.22554,
            1.53154,
            0.28075
          ],
          "elbowWorldError": 0.00072,
          "wristWorldError": 0.0008,
          "bladeTipWorldError": 0.05832,
          "bladeAngleErrorDeg": 6.589,
          "rightArmRotationFromInputDeg": 25.998,
          "rightForeArmRotationFromInputDeg": 20.6,
          "rightHandRotationFromInputDeg": 17.496,
          "endpoint": false
        },
        {
          "label": "end",
          "time": 1.25,
          "source": {
            "label": "end",
            "time": 1.25,
            "sourceCamera": "FPSPlayer.Camera",
            "hiltScreen": [
              977.599,
              1362.229
            ],
            "tipScreen": [
              487.45,
              -373.73
            ],
            "tipMinusHilt": [
              -490.149,
              -1735.959
            ]
          },
          "targetSpace": "Meshy calibrated world",
          "targetElbowWorld": [
            -0.15436,
            1.13509,
            -0.0543
          ],
          "actualElbowWorld": [
            -0.18159,
            1.12697,
            0.04087
          ],
          "targetWristWorld": [
            -0.22528,
            1.15276,
            0.16579
          ],
          "actualWristWorld": [
            -0.25633,
            1.16844,
            0.25646
          ],
          "targetBladeDirectionWorld": [
            -0.25879,
            0.81433,
            0.51952
          ],
          "actualBladeDirectionWorld": [
            0.12657,
            0.96453,
            0.23164
          ],
          "desiredTipWorld": [
            -0.27405,
            1.9605,
            0.53046
          ],
          "actualTipWorld": [
            -0.07852,
            2.03672,
            0.38439
          ],
          "hiltWorld": [
            -0.14274,
            1.54733,
            0.26686
          ],
          "elbowWorldError": 0.09932,
          "wristWorldError": 0.09711,
          "bladeTipWorldError": 0.25568,
          "bladeAngleErrorDeg": 29.187,
          "rightArmRotationFromInputDeg": 0,
          "rightForeArmRotationFromInputDeg": 0,
          "rightHandRotationFromInputDeg": 0,
          "endpoint": true
        }
      ]
    }
  },
  "frames": [
    {
      "time": 0,
      "label": "start",
      "note": "Ready endpoint preserved",
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
      "time": 0.041667,
      "label": "source-0.041667",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.726741,
          0.367689,
          0.313223,
          -0.48841
        ],
        "RightForeArm": [
          -0.746646,
          -0.381532,
          0.316454,
          0.443633
        ],
        "RightHand": [
          0.044471,
          0.617536,
          0.181003,
          0.76414
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
      "time": 0.083333,
      "label": "source-0.083333",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.782948,
          0.180911,
          0.099943,
          -0.58675
        ],
        "RightForeArm": [
          -0.748411,
          -0.549547,
          0.124999,
          0.349649
        ],
        "RightHand": [
          0.109862,
          0.663273,
          0.196948,
          0.71359
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
      "time": 0.125,
      "label": "source-0.125000",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.800303,
          0.104415,
          0.248844,
          -0.535434
        ],
        "RightForeArm": [
          -0.625707,
          -0.512476,
          0.21799,
          0.546205
        ],
        "RightHand": [
          -0.00726,
          0.601746,
          0.090401,
          0.793522
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
      "time": 0.166667,
      "label": "source-0.166667",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.463045,
          0.403747,
          0.61001,
          -0.500465
        ],
        "RightForeArm": [
          -0.306499,
          -0.279766,
          0.38436,
          0.824655
        ],
        "RightHand": [
          0.133797,
          0.741369,
          0.169553,
          0.635391
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
      "time": 0.208333,
      "label": "source-0.208333",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.501746,
          0.133929,
          0.458762,
          -0.721008
        ],
        "RightForeArm": [
          -0.274287,
          -0.574067,
          0.054192,
          0.769595
        ],
        "RightHand": [
          0.289011,
          0.587083,
          0.179039,
          0.734678
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
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          0.262079,
          0.172428,
          0.683112,
          -0.6595
        ],
        "RightForeArm": [
          -0.131069,
          -0.444043,
          0.065804,
          0.883921
        ],
        "RightHand": [
          0.183383,
          0.685361,
          0.000496,
          0.704734
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
      "time": 0.291667,
      "label": "source-0.291667",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.007187,
          -0.221083,
          0.856126,
          -0.467032
        ],
        "RightForeArm": [
          -0.237945,
          -0.228822,
          0.093933,
          0.939255
        ],
        "RightHand": [
          -0.170644,
          0.541316,
          -0.470015,
          0.675975
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
      "time": 0.333333,
      "label": "source-0.333333",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          0.044786,
          -0.203869,
          0.859513,
          -0.46655
        ],
        "RightForeArm": [
          -0.224233,
          -0.205113,
          0.105689,
          0.946825
        ],
        "RightHand": [
          -0.206226,
          0.502616,
          -0.396533,
          0.740007
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
      "time": 0.375,
      "label": "source-0.375000",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          0.053318,
          -0.203422,
          0.850218,
          -0.482603
        ],
        "RightForeArm": [
          -0.231198,
          -0.209189,
          0.066955,
          0.947789
        ],
        "RightHand": [
          -0.220938,
          0.489517,
          -0.343866,
          0.77027
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
      "time": 0.416667,
      "label": "source-0.416667",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          0.028518,
          -0.22667,
          0.864562,
          -0.447593
        ],
        "RightForeArm": [
          -0.216312,
          -0.212833,
          0.10098,
          0.947478
        ],
        "RightHand": [
          -0.189702,
          0.525664,
          -0.446527,
          0.698788
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
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.034323,
          -0.254979,
          0.874322,
          -0.411544
        ],
        "RightForeArm": [
          -0.229123,
          -0.220503,
          0.09979,
          0.942827
        ],
        "RightHand": [
          -0.108675,
          0.571735,
          -0.565357,
          0.584534
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
      "label": "source-0.500000",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          0.244678,
          -0.089814,
          0.854342,
          -0.449628
        ],
        "RightForeArm": [
          -0.081264,
          -0.239805,
          0.264602,
          0.930524
        ],
        "RightHand": [
          -0.259381,
          0.456959,
          -0.181556,
          0.831232
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
      "time": 0.541667,
      "label": "source-0.541667",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.015464,
          -0.005469,
          0.87808,
          -0.478232
        ],
        "RightForeArm": [
          -0.345552,
          -0.372086,
          0.279012,
          0.815045
        ],
        "RightHand": [
          -0.045064,
          0.553358,
          -0.26698,
          0.787709
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
      "time": 0.583333,
      "label": "source-0.583333",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.418564,
          -0.038597,
          0.785636,
          -0.453972
        ],
        "RightForeArm": [
          -0.527408,
          -0.538122,
          0.214719,
          0.621419
        ],
        "RightHand": [
          0.025217,
          0.560603,
          -0.262241,
          0.785059
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
      "time": 0.625,
      "label": "source-0.625000",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.227973,
          0.271517,
          0.82412,
          -0.441738
        ],
        "RightForeArm": [
          -0.593284,
          -0.091143,
          0.297701,
          0.742349
        ],
        "RightHand": [
          0.055858,
          0.609714,
          -0.253572,
          0.748886
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
      "time": 0.666667,
      "label": "source-0.666667",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.578872,
          0.246316,
          0.58811,
          -0.508294
        ],
        "RightForeArm": [
          -0.676945,
          -0.428882,
          0.291658,
          0.522246
        ],
        "RightHand": [
          -0.07295,
          0.597764,
          -0.09626,
          0.792522
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
      "time": 0.708333,
      "label": "source-0.708333",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.624946,
          0.369825,
          0.505124,
          -0.466393
        ],
        "RightForeArm": [
          -0.704239,
          -0.343815,
          0.357062,
          0.508277
        ],
        "RightHand": [
          -0.16325,
          0.559148,
          -0.029289,
          0.812309
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
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.699278,
          0.385154,
          0.377883,
          -0.468904
        ],
        "RightForeArm": [
          -0.74438,
          -0.360848,
          0.33781,
          0.448967
        ],
        "RightHand": [
          -0.212638,
          0.526837,
          0.031597,
          0.822332
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
      "time": 0.791667,
      "label": "source-0.791667",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.688116,
          0.425204,
          0.393048,
          -0.437276
        ],
        "RightForeArm": [
          -0.73763,
          -0.313205,
          0.37263,
          0.467924
        ],
        "RightHand": [
          -0.234605,
          0.51575,
          0.026686,
          0.82356
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
      "time": 0.833333,
      "label": "source-0.833333",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.688116,
          0.425204,
          0.393048,
          -0.437276
        ],
        "RightForeArm": [
          -0.73763,
          -0.313205,
          0.37263,
          0.467924
        ],
        "RightHand": [
          -0.234605,
          0.51575,
          0.026686,
          0.82356
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
      "time": 0.875,
      "label": "source-0.875000",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.688116,
          0.425204,
          0.393048,
          -0.437276
        ],
        "RightForeArm": [
          -0.73763,
          -0.313205,
          0.37263,
          0.467924
        ],
        "RightHand": [
          -0.234605,
          0.51575,
          0.026686,
          0.82356
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
      "time": 0.916667,
      "label": "source-0.916667",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.688116,
          0.425204,
          0.393048,
          -0.437276
        ],
        "RightForeArm": [
          -0.73763,
          -0.313205,
          0.37263,
          0.467924
        ],
        "RightHand": [
          -0.234605,
          0.51575,
          0.026686,
          0.82356
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
      "time": 0.958333,
      "label": "source-0.958333",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.688116,
          0.425204,
          0.393048,
          -0.437276
        ],
        "RightForeArm": [
          -0.73763,
          -0.313205,
          0.37263,
          0.467924
        ],
        "RightHand": [
          -0.234605,
          0.51575,
          0.026686,
          0.82356
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
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.688116,
          0.425204,
          0.393048,
          -0.437276
        ],
        "RightForeArm": [
          -0.73763,
          -0.313205,
          0.37263,
          0.467924
        ],
        "RightHand": [
          -0.234605,
          0.51575,
          0.026686,
          0.82356
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
      "time": 1.041667,
      "label": "source-1.041667",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.688116,
          0.425204,
          0.393048,
          -0.437276
        ],
        "RightForeArm": [
          -0.73763,
          -0.313205,
          0.37263,
          0.467924
        ],
        "RightHand": [
          -0.234605,
          0.51575,
          0.026686,
          0.82356
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
      "time": 1.083333,
      "label": "source-1.083333",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.688116,
          0.425204,
          0.393048,
          -0.437276
        ],
        "RightForeArm": [
          -0.73763,
          -0.313205,
          0.37263,
          0.467924
        ],
        "RightHand": [
          -0.234605,
          0.51575,
          0.026686,
          0.82356
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
      "time": 1.125,
      "label": "source-1.125000",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.688116,
          0.425204,
          0.393048,
          -0.437276
        ],
        "RightForeArm": [
          -0.73763,
          -0.313205,
          0.37263,
          0.467924
        ],
        "RightHand": [
          -0.234605,
          0.51575,
          0.026686,
          0.82356
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
      "time": 1.166667,
      "label": "source-1.166667",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.688116,
          0.425204,
          0.393048,
          -0.437276
        ],
        "RightForeArm": [
          -0.73763,
          -0.313205,
          0.37263,
          0.467924
        ],
        "RightHand": [
          -0.234605,
          0.51575,
          0.026686,
          0.82356
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
      "time": 1.208333,
      "label": "source-1.208333",
      "note": "right-arm joints pinned from FPS source; HandR aligns the real sabre to the calibrated WeaponR world blade",
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
          -0.688116,
          0.425204,
          0.393048,
          -0.437276
        ],
        "RightForeArm": [
          -0.73763,
          -0.313205,
          0.37263,
          0.467924
        ],
        "RightHand": [
          -0.234605,
          0.51575,
          0.026686,
          0.82356
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
      "note": "Ready endpoint preserved",
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

export const ATTACK1_TIP_BASIS_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "label": "Attack1 tip-basis candidate 2",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "meshy": "./public/assets/meshy/meshy_apose_walking_with_skin.glb",
    "clip": "OneHandAttack1",
    "duration": 1.25,
    "keyCount": 6,
    "method": "meshy-authored-fpv-tip-basis",
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
    },
    "baseCandidate": "attack1-candidate-1",
    "tipBasis": {
      "sourceCamera": "FPSPlayer.Camera",
      "sourceSocket": "WeaponR",
      "targetCamera": "Meshy runtime FPV",
      "viewport": [
        390,
        844
      ],
      "allowedOutput": "RightHand quaternion only",
      "solverAuthoredBones": [
        "RightHand"
      ],
      "armPathSource": "Ready plus explicit prime-key choreography deltas; RightHand solver runs after that path is authored.",
      "tipLocalPoint": [
        -0.955609,
        -0.40501,
        -0.200351
      ],
      "choreographyTargets": {
        "anticipation": [
          -92,
          -18
        ],
        "contact": [
          92,
          -18
        ]
      }
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
    "tipBasis": {
      "status": "PASS",
      "rule": "Projected Meshy FPV choreography must read as rightward anticipation with left horizontal blade and reversed right-pointing contact. Metrics are a write gate only, not visual acceptance.",
      "predicates": {
        "status": "PASS",
        "failures": [],
        "thresholds": {
          "anticipationHandRightPx": 35,
          "anticipationShoulderRightPx": 20,
          "horizontalMotionRatio": 1.25,
          "bladeHorizontalRatio": 1.4,
          "bladeSidePx": 40,
          "contactReversePx": 90,
          "contactHandLeftPx": 35,
          "contactShoulderLeftPx": 20,
          "tipBelowTolerancePx": 0,
          "extremeRotationDeg": 145
        }
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
          "targetCamera": "Meshy runtime FPV",
          "desiredTipMinusHilt": [
            -2574.531,
            6545.633
          ],
          "rightShoulderScreen": [
            -531.462,
            -73.607
          ],
          "rightHandScreen": [
            626.105,
            598.157
          ],
          "hiltScreen": [
            2507.495,
            -3577.492
          ],
          "tipScreen": [
            -67.036,
            2968.141
          ],
          "tipMinusHilt": [
            -2574.531,
            6545.633
          ],
          "rightShoulderDeltaFromStart": [
            0,
            0
          ],
          "rightHandDeltaFromStart": [
            0,
            0
          ],
          "rightShoulderDeltaFromAnticipation": [
            0,
            0
          ],
          "rightHandDeltaFromAnticipation": [
            0,
            0
          ],
          "bladeVectorErrorPx": 0,
          "rightHandRotationFromInputDeg": 0
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
          "targetCamera": "Meshy runtime FPV",
          "desiredTipMinusHilt": [
            -92,
            -18
          ],
          "rightShoulderScreen": [
            -358.153,
            34.502
          ],
          "rightHandScreen": [
            2352.067,
            1462.559
          ],
          "hiltScreen": [
            609.547,
            630.962
          ],
          "tipScreen": [
            517.534,
            612.959
          ],
          "tipMinusHilt": [
            -92.013,
            -18.003
          ],
          "rightShoulderDeltaFromStart": [
            173.309,
            108.109
          ],
          "rightHandDeltaFromStart": [
            1725.962,
            864.402
          ],
          "rightShoulderDeltaFromAnticipation": [
            0,
            0
          ],
          "rightHandDeltaFromAnticipation": [
            0,
            0
          ],
          "bladeVectorErrorPx": 0.013,
          "rightHandRotationFromInputDeg": 112.963
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
          "targetCamera": "Meshy runtime FPV",
          "desiredTipMinusHilt": [
            92,
            -18
          ],
          "rightShoulderScreen": [
            -447.696,
            -43.039
          ],
          "rightHandScreen": [
            392.407,
            523.754
          ],
          "hiltScreen": [
            456.379,
            424.784
          ],
          "tipScreen": [
            548.446,
            406.777
          ],
          "tipMinusHilt": [
            92.067,
            -18.007
          ],
          "rightShoulderDeltaFromStart": [
            83.766,
            30.568
          ],
          "rightHandDeltaFromStart": [
            -233.698,
            -74.403
          ],
          "rightShoulderDeltaFromAnticipation": [
            -89.543,
            -77.541
          ],
          "rightHandDeltaFromAnticipation": [
            -1959.66,
            -938.805
          ],
          "bladeVectorErrorPx": 0.068,
          "rightHandRotationFromInputDeg": 137.663
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
          "targetCamera": "Meshy runtime FPV",
          "desiredTipMinusHilt": [
            372.487,
            -1014.129
          ],
          "rightShoulderScreen": [
            -447.696,
            -43.039
          ],
          "rightHandScreen": [
            392.407,
            523.754
          ],
          "hiltScreen": [
            -221.952,
            2450.711
          ],
          "tipScreen": [
            150.536,
            1436.583
          ],
          "tipMinusHilt": [
            372.487,
            -1014.129
          ],
          "rightShoulderDeltaFromStart": [
            83.766,
            30.568
          ],
          "rightHandDeltaFromStart": [
            -233.698,
            -74.403
          ],
          "rightShoulderDeltaFromAnticipation": [
            -89.543,
            -77.541
          ],
          "rightHandDeltaFromAnticipation": [
            -1959.66,
            -938.805
          ],
          "bladeVectorErrorPx": 0.001,
          "rightHandRotationFromInputDeg": 0
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
          "targetCamera": "Meshy runtime FPV",
          "desiredTipMinusHilt": [
            -6029.48,
            14551.119
          ],
          "rightShoulderScreen": [
            -528.34,
            -76.553
          ],
          "rightHandScreen": [
            537.896,
            568.543
          ],
          "hiltScreen": [
            6067.174,
            -12431.905
          ],
          "tipScreen": [
            37.694,
            2119.214
          ],
          "tipMinusHilt": [
            -6029.48,
            14551.119
          ],
          "rightShoulderDeltaFromStart": [
            3.122,
            -2.946
          ],
          "rightHandDeltaFromStart": [
            -88.209,
            -29.614
          ],
          "rightShoulderDeltaFromAnticipation": [
            -170.187,
            -111.055
          ],
          "rightHandDeltaFromAnticipation": [
            -1814.171,
            -894.016
          ],
          "bladeVectorErrorPx": 0,
          "rightHandRotationFromInputDeg": 0
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
          "targetCamera": "Meshy runtime FPV",
          "desiredTipMinusHilt": [
            -2574.531,
            6545.633
          ],
          "rightShoulderScreen": [
            -531.462,
            -73.607
          ],
          "rightHandScreen": [
            626.105,
            598.157
          ],
          "hiltScreen": [
            2507.495,
            -3577.492
          ],
          "tipScreen": [
            -67.036,
            2968.141
          ],
          "tipMinusHilt": [
            -2574.531,
            6545.633
          ],
          "rightShoulderDeltaFromStart": [
            0,
            0
          ],
          "rightHandDeltaFromStart": [
            0,
            0
          ],
          "rightShoulderDeltaFromAnticipation": [
            -173.309,
            -108.109
          ],
          "rightHandDeltaFromAnticipation": [
            -1725.962,
            -864.402
          ],
          "bladeVectorErrorPx": 0,
          "rightHandRotationFromInputDeg": 0
        }
      ]
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
          0.097482,
          0.533506,
          0.652017,
          0.529851
        ],
        "LeftForeArm": [
          -0.520341,
          0.320628,
          0.328034,
          0.720303
        ],
        "LeftHand": [
          -0.110528,
          -0.538239,
          0.166349,
          0.818786
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
          0.528767,
          0.219859,
          -0.296072,
          0.764466
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
          0.233044,
          0.235301,
          0.220972,
          0.91733
        ],
        "LeftForeArm": [
          -0.493354,
          0.168499,
          0.325382,
          0.788883
        ],
        "LeftHand": [
          -0.039328,
          -0.548061,
          0.058053,
          0.833494
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.597879,
          0.281028,
          0.590915,
          -0.463014
        ],
        "RightForeArm": [
          -0.630036,
          -0.499357,
          0.301237,
          0.512791
        ],
        "RightHand": [
          0.69286,
          -0.038978,
          0.247722,
          0.676062
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
          0.17819,
          0.294156,
          0.351835,
          0.870593
        ],
        "LeftForeArm": [
          -0.502876,
          0.207314,
          0.329269,
          0.771828
        ],
        "LeftHand": [
          -0.053661,
          -0.546844,
          0.079852,
          0.831689
        ],
        "RightShoulder": [
          0.521987,
          -0.564688,
          0.46633,
          0.437256
        ],
        "RightArm": [
          -0.597879,
          0.281028,
          0.590915,
          -0.463014
        ],
        "RightForeArm": [
          -0.630036,
          -0.499357,
          0.301237,
          0.512791
        ],
        "RightHand": [
          -0.349088,
          0.431337,
          0.069459,
          0.829012
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
          0.118238,
          0.394351,
          0.504821,
          0.758724
        ],
        "LeftForeArm": [
          -0.513979,
          0.263867,
          0.329802,
          0.746613
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
          -0.618011,
          0.277263,
          0.484048,
          -0.553972
        ],
        "RightForeArm": [
          -0.65676,
          -0.46071,
          0.285498,
          0.524312
        ],
        "RightHand": [
          -0.353858,
          0.439874,
          0.036243,
          0.82461
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

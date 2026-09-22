export const CRIMSON_COMBAT_READY_VANGUARD_FRAME0_4_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "id": "crimson-combat-ready-vanguard-frame0-4",
  "label": "Crimson frame zero arm-projection recovery candidate",
  "primeKeys": {
    "start": 0
  },
  "source": {
    "character": "crimson",
    "sourceCharacter": "vanguard",
    "clip": "SwordAttack1",
    "duration": 0,
    "method": "Three.js model-local bilateral roof-guard projection, then Pin First, Roll Last correction from the exact 3d6a57a9 browser seed",
    "crossRigPoseInputs": [],
    "exactAuthoredGlb": true,
    "poseSha256": "ab63161e7d4e3366182a09102b760a95a9557efde57d02233a0c6defb5279af0",
    "status": "generated-visual-pending-candidate-parity",
    "rejectedBaseline": {
      "candidateId": "crimson-frame-zero-480eb888-rejected",
      "poseSha256": "b5ef5555ba060546f4d6dd3921f09cf0e4251dfac8a346d4db7f4f30858bd554",
      "glbSha256": "4e57cc6a443b6cdd0cae1177357536234e4c4e7de98069e7027af74070bd0b56"
    },
    "limitations": [
      "Crimson has rigid open gauntlet meshes and no finger bones; visible hand closure is unavailable in this asset"
    ],
    "authoredGlbSha256": "017034e3d82c5097c230f662c629d10992a07706a241c2d7362b22cf2340dec7",
    "poseProvenance": {
      "bonesAndHips": "protected center, head, shoulders, legs, and Hips remain exact to 3d6a57a9; both arm chains are authored in the measured browser bone-child basis",
      "sabreLocal": "unchanged mesh-seated 3d6a57a9 transform; sword direction comes from runtime-basis RightHand rotation"
    },
    "authorEligibleBeforeCandidateParity": true,
    "exactAuthoredBodyGlb": true,
    "runtimeAuthoring": {
      "schema": "pose-lab-v2-crimson-runtime-frame-zero-authoring-v1",
      "coordinateSpace": "Three.js normalized character world; exact cloud center camera is 986x900",
      "viewport": [
        986,
        900
      ],
      "seedCommit": "3d6a57a97843",
      "seedPoseSha256": "4db76a74b24d56411d6429c0c5f35bbe77bedbe92bda086d65a162aaea0ab41a",
      "seedBones": {
        "LeftArm": [
          0.55990779,
          0.26694843,
          0.49928895,
          0.60493994
        ],
        "LeftForeArm": [
          -0.27392076,
          0.04690295,
          0.65993593,
          0.69803445
        ],
        "LeftHand": [
          0.02757126,
          0.02789319,
          0.14987648,
          0.98792653
        ],
        "RightArm": [
          0.42171242,
          -0.22056831,
          -0.60507001,
          0.63827779
        ],
        "RightForeArm": [
          -0.19295613,
          -0.06175434,
          -0.76808571,
          0.60745262
        ],
        "RightHand": [
          -0.21967316,
          -0.28517951,
          0.70169022,
          0.61485542
        ]
      },
      "authoredBones": [
        "LeftArm",
        "LeftForeArm",
        "LeftHand",
        "RightArm",
        "RightForeArm",
        "RightHand"
      ],
      "authoredGlb": {
        "animation": "CrimsonRuntimeCombatReadyFrameZero",
        "sha256": "017034e3d82c5097c230f662c629d10992a07706a241c2d7362b22cf2340dec7",
        "byteLength": 17931836,
        "channels": [
          "Head.rotation",
          "Hips.rotation",
          "LeftArm.rotation",
          "LeftFoot.rotation",
          "LeftForeArm.rotation",
          "LeftHand.rotation",
          "LeftLeg.rotation",
          "LeftShoulder.rotation",
          "LeftUpLeg.rotation",
          "RightArm.rotation",
          "RightFoot.rotation",
          "RightForeArm.rotation",
          "RightHand.rotation",
          "RightLeg.rotation",
          "RightShoulder.rotation",
          "RightUpLeg.rotation",
          "Spine.rotation",
          "Spine01.rotation",
          "Spine02.rotation",
          "neck.rotation",
          "Hips.translation"
        ]
      },
      "bladeScreenRotationDeg": 48,
      "highGuardTarget": {
        "lateralShoulders": 0.33,
        "heightTorso": 0.93,
        "depthTorso": -0.18,
        "elbowSpreadShoulders": -0.72,
        "elbowPoleDropTorso": 0.8
      },
      "bladeWorldDirection": [
        0.461269,
        0.146782,
        -0.875035
      ],
      "supportHandMethod": "bilateral high-guard wrist projection with explicit low poles, then exact elbow-circle projection and iterative visible-palm pin",
      "gates": {
        "status": "PASS",
        "angleDeg": 48,
        "checks": {
          "silhouette": true,
          "supportPalmPin": true,
          "vanguardHighGuard": true,
          "leftLowElbow": true,
          "rightLowElbow": true,
          "supportReachReserve": true,
          "supportElbowBend": true,
          "dominantReachReserve": true,
          "dominantElbowBend": true
        },
        "blade": {
          "desiredWorldDirection": [
            0.461269,
            0.146782,
            -0.875035
          ],
          "actualWorldDirection": [
            0.461269,
            0.146782,
            -0.875035
          ],
          "residualAngleDeg": 0.000013
        },
        "supportHand": {
          "palmPinErrorWorld": 2e-8,
          "palmPinErrorTorso": 0,
          "palmToHandleWorld": 0.0430213,
          "handleParameter": 0.15582,
          "reachReserveTorso": 0.204388,
          "elbowAngleDeg": 112.3165
        },
        "lowElbows": {
          "leftDropTorso": 0.454049,
          "rightDropTorso": 0.499487
        },
        "vanguardHighGuard": {
          "intent": "high loaded roof guard beside the helmet with vertically stepped hands",
          "authoredTarget": {
            "lateralShoulders": 0.33,
            "heightTorso": 0.93,
            "depthTorso": -0.18,
            "elbowSpreadShoulders": -0.72,
            "elbowPoleDropTorso": 0.8
          },
          "dominantHandAboveNeckTorso": 0.93,
          "minimumDominantHandAboveNeckTorso": 0.2,
          "supportHandAboveNeckTorso": 0.778274,
          "minimumSupportHandAboveNeckTorso": 0.03,
          "handClusterBesideHeadShoulders": 0.147498,
          "minimumHandClusterBesideHeadShoulders": 0.08,
          "gripStepTorso": 0.151726,
          "minimumGripStepTorso": 0.12,
          "rightWristWorld": [
            0.127444,
            1.572316,
            0.063382
          ],
          "leftWristWorld": [
            0.022659,
            1.514298,
            0.070156
          ],
          "handCenterWorld": [
            0.075052,
            1.543307,
            0.066769
          ]
        },
        "reachAndBend": {
          "leftReachReserveTorso": 0.204388,
          "rightReachReserveTorso": 0.020115,
          "minimumDominantReachReserveTorso": 0.018,
          "leftElbowAngleDeg": 112.3165,
          "rightElbowAngleDeg": 158.9514
        },
        "authoredTravel": {
          "boneLocalDegrees": {
            "LeftArm": 134.3258,
            "LeftForeArm": 71.6106,
            "LeftHand": 38.9692,
            "RightArm": 140.4411,
            "RightForeArm": 86.4083,
            "RightHand": 42.7617
          },
          "leftElbowWorld": 0.428482,
          "leftWristWorld": 0.573269,
          "rightElbowWorld": 0.42192,
          "rightWristWorld": 0.551193
        },
        "silhouette": {
          "status": "PASS",
          "thresholds": {
            "bladeHeadPixels": 12,
            "guardHeadPixels": 8,
            "armHeadPixels": 0,
            "armFaceAdvisoryPixels": 8,
            "handHeadPixels": 8,
            "bladeAuthority": "full weighted helmet and plume hull",
            "guardAuthority": "lower visible face hull through 0.62 of Head-skinned world height",
            "armHandAuthority": "0.66 central aperture of the lower visible face hull",
            "armFaceDisposition": "advisory because Vanguard frame zero intentionally frames the head with opposed forearms; browser pixels remain decisive"
          },
          "views": {
            "center": {
              "status": "PASS",
              "bladeHeadPixels": 23.038,
              "guardHeadPixels": 35.682,
              "minimumArmHeadPixels": 0,
              "minimumHandHeadPixels": 19.555,
              "hands": {
                "left": {
                  "armHeadPixels": 0,
                  "handHeadPixels": 19.555,
                  "elbow": [
                    528.31,
                    345.46
                  ],
                  "wrist": [
                    487.39,
                    297.24
                  ],
                  "bounds": {
                    "left": 465.61,
                    "right": 498.36,
                    "top": 238.22,
                    "bottom": 297.21
                  }
                },
                "right": {
                  "armHeadPixels": 0,
                  "handHeadPixels": 32.949,
                  "elbow": [
                    476.8,
                    334.8
                  ],
                  "wrist": [
                    513.07,
                    281.44
                  ],
                  "bounds": {
                    "left": 479.23,
                    "right": 522.7,
                    "top": 227.21,
                    "bottom": 281.96
                  }
                }
              },
              "headBounds": {
                "left": 443.41,
                "right": 537.76,
                "top": 260.88,
                "bottom": 383.22
              },
              "faceBounds": {
                "left": 443.41,
                "right": 536.99,
                "top": 305.06,
                "bottom": 383.22
              },
              "faceApertureBounds": {
                "left": 457.24,
                "right": 519,
                "top": 314.9,
                "bottom": 366.49
              },
              "bladeBounds": {
                "left": 524.99,
                "right": 695.51,
                "top": 211.27,
                "bottom": 247.14
              },
              "guardBounds": {
                "left": 475.32,
                "right": 515.9,
                "top": 223.93,
                "bottom": 269.94
              },
              "bladeScreen": {
                "hilt": [
                  499.71,
                  246.15
                ],
                "tip": [
                  695.21,
                  211.51
                ]
              }
            },
            "left": {
              "status": "PASS",
              "bladeHeadPixels": 21.264,
              "guardHeadPixels": 35.506,
              "minimumArmHeadPixels": 0,
              "minimumHandHeadPixels": 12.314,
              "hands": {
                "left": {
                  "armHeadPixels": 0,
                  "handHeadPixels": 12.314,
                  "elbow": [
                    481.06,
                    538.36
                  ],
                  "wrist": [
                    505.73,
                    498.74
                  ],
                  "bounds": {
                    "left": 496.3,
                    "right": 530.44,
                    "top": 443.48,
                    "bottom": 499.96
                  }
                },
                "right": {
                  "armHeadPixels": 0,
                  "handHeadPixels": 32.518,
                  "elbow": [
                    515.04,
                    534.98
                  ],
                  "wrist": [
                    503.72,
                    478.97
                  ],
                  "bounds": {
                    "left": 496.3,
                    "right": 532.19,
                    "top": 431.42,
                    "bottom": 479.58
                  }
                }
              },
              "headBounds": {
                "left": 447.16,
                "right": 569.99,
                "top": 462.02,
                "bottom": 577.44
              },
              "faceBounds": {
                "left": 447.16,
                "right": 569.99,
                "top": 502.17,
                "bottom": 577.44
              },
              "faceApertureBounds": {
                "left": 470.92,
                "right": 551.99,
                "top": 510.91,
                "bottom": 560.59
              },
              "bladeBounds": {
                "left": 302.71,
                "right": 466.99,
                "top": 404.6,
                "bottom": 447.96
              },
              "guardBounds": {
                "left": 482.96,
                "right": 513.06,
                "top": 432.04,
                "bottom": 468.63
              },
              "bladeScreen": {
                "hilt": [
                  493,
                  450
                ],
                "tip": [
                  302.88,
                  404.8
                ]
              }
            },
            "right": {
              "status": "PASS",
              "bladeHeadPixels": 19.704,
              "guardHeadPixels": 30.717,
              "minimumArmHeadPixels": 0,
              "minimumHandHeadPixels": 17.478,
              "hands": {
                "left": {
                  "armHeadPixels": 0,
                  "handHeadPixels": 17.478,
                  "elbow": [
                    505.37,
                    548.45
                  ],
                  "wrist": [
                    480.37,
                    496.81
                  ],
                  "bounds": {
                    "left": 456.14,
                    "right": 489.76,
                    "top": 441.45,
                    "bottom": 495.79
                  }
                },
                "right": {
                  "armHeadPixels": 0,
                  "handHeadPixels": 26.877,
                  "elbow": [
                    471.32,
                    530.44
                  ],
                  "wrist": [
                    481.93,
                    486.07
                  ],
                  "bounds": {
                    "left": 453.47,
                    "right": 489.57,
                    "top": 433.07,
                    "bottom": 486.43
                  }
                }
              },
              "headBounds": {
                "left": 417.09,
                "right": 539.7,
                "top": 465.16,
                "bottom": 573.42
              },
              "faceBounds": {
                "left": 417.09,
                "right": 539.7,
                "top": 504.98,
                "bottom": 573.42
              },
              "faceApertureBounds": {
                "left": 435.09,
                "right": 516.01,
                "top": 512.88,
                "bottom": 558.05
              },
              "bladeBounds": {
                "left": 519.87,
                "right": 715.04,
                "top": 428.39,
                "bottom": 454.22
              },
              "guardBounds": {
                "left": 472.61,
                "right": 502.71,
                "top": 426.07,
                "bottom": 475.13
              },
              "bladeScreen": {
                "hilt": [
                  493,
                  450
                ],
                "tip": [
                  714.95,
                  428.99
                ]
              }
            }
          }
        }
      }
    }
  },
  "frames": [
    {
      "label": "start",
      "time": 0,
      "positions": {
        "Hips": [
          8.6e-7,
          81.11399078,
          13.63137913
        ]
      },
      "sabreLocal": {
        "position": [
          0.46006966,
          2.84260845,
          -14.83034801
        ],
        "quaternion": [
          0.68301272,
          0.18301271,
          -0.18301271,
          0.68301266
        ],
        "scale": [
          136.4,
          136.4,
          136.4
        ]
      },
      "bones": {
        "Hips": [
          0.17003511,
          -0.1709258,
          0.03803778,
          0.96975541
        ],
        "LeftUpLeg": [
          0.19854307,
          -0.41406283,
          -0.80501103,
          0.37561947
        ],
        "LeftLeg": [
          -0.33410376,
          0.03376655,
          -0.44762403,
          0.82877451
        ],
        "LeftFoot": [
          -0.13702138,
          0.75687301,
          0.46328914,
          0.44014958
        ],
        "RightUpLeg": [
          0.96765488,
          -0.05471507,
          0.04731341,
          0.24168529
        ],
        "RightLeg": [
          0.46427846,
          -0.0343531,
          0.162108,
          0.87004966
        ],
        "RightFoot": [
          -0.70437181,
          -0.08383036,
          -0.15670966,
          0.6872226
        ],
        "Spine02": [
          -0.20781651,
          0.02448829,
          -0.02784857,
          0.97746462
        ],
        "Spine01": [
          -0.0011393,
          0.03479905,
          0.00238992,
          0.99939084
        ],
        "Spine": [
          -0.01016799,
          0.00562553,
          -0.03483461,
          0.99932557
        ],
        "LeftShoulder": [
          0.54032886,
          0.6212706,
          -0.4316622,
          0.36842278
        ],
        "LeftArm": [
          -0.78908336,
          -0.55638683,
          0.13620442,
          0.22187719
        ],
        "LeftForeArm": [
          0.13236642,
          0.49179387,
          0.5409416,
          0.66932815
        ],
        "LeftHand": [
          0.20629582,
          -0.07100325,
          -0.11927182,
          0.96859425
        ],
        "RightShoulder": [
          0.54176521,
          -0.62001854,
          0.42385703,
          0.3773762
        ],
        "RightArm": [
          -0.22876246,
          -0.42590347,
          0.83437401,
          0.2647526
        ],
        "RightForeArm": [
          0.03300629,
          -0.19672804,
          -0.17964599,
          0.96329433
        ],
        "RightHand": [
          -0.26562399,
          -0.56158668,
          0.45934448,
          0.63487554
        ],
        "neck": [
          0.10416708,
          0.03002633,
          -0.00394118,
          0.99409866
        ],
        "Head": [
          0.06650833,
          -4e-8,
          0,
          0.99778587
        ]
      }
    }
  ]
};

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
    "method": "Three.js model-local Pin First, Roll Last correction from the exact 3d6a57a9 browser seed",
    "crossRigPoseInputs": [],
    "exactAuthoredGlb": true,
    "poseSha256": "3178d548ce6d127f672a727d2fd180eff2b510d10b04d57dfa33e46d1377f464",
    "status": "generated-visual-pending-candidate-parity",
    "rejectedBaseline": {
      "candidateId": "crimson-frame-zero-480eb888-rejected",
      "poseSha256": "b5ef5555ba060546f4d6dd3921f09cf0e4251dfac8a346d4db7f4f30858bd554",
      "glbSha256": "4e57cc6a443b6cdd0cae1177357536234e4c4e7de98069e7027af74070bd0b56"
    },
    "limitations": [
      "Crimson has rigid open gauntlet meshes and no finger bones; visible hand closure is unavailable in this asset"
    ],
    "authoredGlbSha256": "d685642fe4e69ba72a6ad2fae7bd8906361a9908ae6e31fbf84a35c0e79a88ef",
    "poseProvenance": {
      "bonesAndHips": "protected body and right-arm seed remain exact to 3d6a57a9; RightHand and support chain are authored in the browser bone-child basis",
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
        "RightHand"
      ],
      "authoredGlb": {
        "animation": "CrimsonRuntimeCombatReadyFrameZero",
        "sha256": "d685642fe4e69ba72a6ad2fae7bd8906361a9908ae6e31fbf84a35c0e79a88ef",
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
      "bladeScreenRotationDeg": -30,
      "bladeWorldDirection": [
        0.134918,
        0.930165,
        0.341452
      ],
      "supportHandMethod": "explicit low pole plus exact two-bone elbow-circle projection and iterative visible-palm pin",
      "gates": {
        "status": "PASS",
        "angleDeg": -30,
        "checks": {
          "silhouette": true,
          "supportPalmPin": true,
          "leftLowElbow": true,
          "rightLowElbow": true,
          "supportReachReserve": true,
          "supportElbowBend": true
        },
        "blade": {
          "desiredWorldDirection": [
            0.134918,
            0.930166,
            0.341452
          ],
          "actualWorldDirection": [
            0.134918,
            0.930165,
            0.341452
          ],
          "residualAngleDeg": 0.000011
        },
        "supportHand": {
          "palmPinErrorWorld": 2e-8,
          "palmPinErrorTorso": 0,
          "palmToHandleWorld": 0.01903121,
          "handleParameter": 0.223873,
          "reachReserveTorso": 0.430473,
          "elbowAngleDeg": 80.0566
        },
        "lowElbows": {
          "leftDropTorso": 0.081217,
          "rightDropTorso": 0.19667
        },
        "authoredTravel": {
          "boneLocalDegrees": {
            "LeftArm": 11.1397,
            "LeftForeArm": 8.8231,
            "LeftHand": 24.0526,
            "RightHand": 25.903
          },
          "leftElbowWorld": 0.045273,
          "leftWristWorld": 0.045575
        },
        "silhouette": {
          "status": "PASS",
          "thresholds": {
            "bladeHeadPixels": 12,
            "guardHeadPixels": 8,
            "armHeadPixels": 8,
            "handHeadPixels": 8
          },
          "views": {
            "center": {
              "status": "PASS",
              "bladeHeadPixels": 30.105,
              "guardHeadPixels": 47.119,
              "minimumArmHeadPixels": 43.453,
              "minimumHandHeadPixels": 39.903,
              "hands": {
                "left": {
                  "armHeadPixels": 71.023,
                  "handHeadPixels": 56.07
                },
                "right": {
                  "armHeadPixels": 43.453,
                  "handHeadPixels": 39.903
                }
              },
              "bladeScreen": {
                "hilt": [
                  410.92,
                  423.94
                ],
                "tip": [
                  381.99,
                  187.68
                ]
              }
            },
            "left": {
              "status": "PASS",
              "bladeHeadPixels": 26.648,
              "guardHeadPixels": 45.455,
              "minimumArmHeadPixels": 40.451,
              "minimumHandHeadPixels": 37.54,
              "hands": {
                "left": {
                  "armHeadPixels": 65.212,
                  "handHeadPixels": 50.325
                },
                "right": {
                  "armHeadPixels": 40.451,
                  "handHeadPixels": 37.54
                }
              },
              "bladeScreen": {
                "hilt": [
                  493,
                  450
                ],
                "tip": [
                  572.55,
                  231.03
                ]
              }
            },
            "right": {
              "status": "PASS",
              "bladeHeadPixels": 25.863,
              "guardHeadPixels": 46.83,
              "minimumArmHeadPixels": 42.597,
              "minimumHandHeadPixels": 38.053,
              "hands": {
                "left": {
                  "armHeadPixels": 67.932,
                  "handHeadPixels": 45.563
                },
                "right": {
                  "armHeadPixels": 42.597,
                  "handHeadPixels": 38.053
                }
              },
              "bladeScreen": {
                "hilt": [
                  493,
                  450
                ],
                "tip": [
                  409.7,
                  229.65
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
          0.5529443,
          0.33330655,
          0.43289971,
          0.62909234
        ],
        "LeftForeArm": [
          0.30051795,
          -0.03541242,
          -0.70429164,
          -0.64219022
        ],
        "LeftHand": [
          0.18450077,
          0.02996471,
          0.01119209,
          0.98231173
        ],
        "RightShoulder": [
          0.54176521,
          -0.62001854,
          0.42385703,
          0.3773762
        ],
        "RightArm": [
          0.4217124,
          -0.2205683,
          -0.60506999,
          0.63827777
        ],
        "RightForeArm": [
          -0.19295613,
          -0.06175434,
          -0.76808572,
          0.60745263
        ],
        "RightHand": [
          -0.20465012,
          -0.07442142,
          0.77689165,
          0.59077841
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

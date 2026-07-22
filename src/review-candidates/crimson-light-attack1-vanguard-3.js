export const CRIMSON_LIGHT_ATTACK1_VANGUARD_3_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "id": "crimson-light-attack1-vanguard-3",
  "label": "Crimson light attack 1 full-body transfer from Vanguard SwordAttack1",
  "primeKeys": {
    "start": 0,
    "earlyWindup": 0.1,
    "anticipation": 0.183333,
    "snapPrep": 0.283333,
    "contact": 0.383333,
    "contactHold": 0.5,
    "settle": 0.566667,
    "followThrough": 0.62
  },
  "source": {
    "character": "crimson",
    "sourceCharacter": "vanguard",
    "clip": "SwordAttack1",
    "duration": 0.633333,
    "vanguardReference": "public/assets/crimson/vanguard_swordattack1_reference.json",
    "savedWeaponBaseline": "public/assets/crimson/crimson_light_attack1_weapon_baseline.json",
    "previousReviewCandidate": "crimson-light-attack1-vanguard-2",
    "method": "source-local-roll-deltas-plus-body-frame-full-limb-chain-solve",
    "policy": {
      "role": "quarantined review candidate, not accepted repo truth",
      "noRuntimeRetargeting": true,
      "forbiddenUse": "Do not copy Vanguard Weapon.R transforms directly into Crimson as accepted sword orientation.",
      "rootMotion": "Vanguard root motion is preserved in sidecar data and not applied in Pose Lab.",
      "weaponTruth": "SaberGrip and Arborblade local transforms are copied from the saved user sabre-transform export and are invariant across frames."
    },
    "retarget": {
      "sourceLogicalBones": {
        "Hips": "hips",
        "Spine02": "chest",
        "Spine01": "spine",
        "Spine": "spine",
        "neck": "neck",
        "Head": "head",
        "LeftShoulder": "shoulder.L",
        "LeftArm": "upper_arm.fk.L",
        "LeftForeArm": "forearm.fk.L",
        "LeftHand": "hand.fk.L",
        "RightShoulder": "shoulder.R",
        "RightArm": "upper_arm.fk.R",
        "RightForeArm": "forearm.fk.R",
        "RightHand": "hand.fk.R",
        "LeftUpLeg": "thigh.fk.L",
        "LeftLeg": "shin.fk.L",
        "LeftFoot": "foot.fk.L",
        "RightUpLeg": "thigh.fk.R",
        "RightLeg": "shin.fk.R",
        "RightFoot": "foot.fk.R"
      },
      "targetBones": [
        "Hips",
        "Spine02",
        "Spine01",
        "Spine",
        "neck",
        "Head",
        "LeftUpLeg",
        "LeftLeg",
        "LeftFoot",
        "RightUpLeg",
        "RightLeg",
        "RightFoot",
        "LeftShoulder",
        "LeftArm",
        "LeftForeArm",
        "LeftHand",
        "RightShoulder",
        "RightArm",
        "RightForeArm",
        "RightHand"
      ],
      "chainSolves": [
        {
          "name": "rightArm",
          "targetBones": [
            "RightArm",
            "RightForeArm",
            "RightHand"
          ],
          "sourceLimb": "rightArm"
        },
        {
          "name": "leftArm",
          "targetBones": [
            "LeftArm",
            "LeftForeArm",
            "LeftHand"
          ],
          "sourceLimb": "leftArm"
        },
        {
          "name": "rightLeg",
          "targetBones": [
            "RightUpLeg",
            "RightLeg",
            "RightFoot"
          ],
          "sourceLimb": "rightLeg"
        },
        {
          "name": "leftLeg",
          "targetBones": [
            "LeftUpLeg",
            "LeftLeg",
            "LeftFoot"
          ],
          "sourceLimb": "leftLeg"
        }
      ],
      "rollRestoration": "bounded source local quaternion deltas applied before chain solve; clamps recorded per frame",
      "bladeReadability": "mapped Vanguard blade direction is projected toward the review camera plane before right-hand solve so the Arborblade reads as a visible sword, not a camera-axis sliver"
    },
    "savedWeapon": {
      "saberGripLocal": {
        "parentBone": "RightHand",
        "position": [
          12.38741,
          13.39693,
          -1.51078
        ],
        "rotationDeg": [
          -15.898,
          51.654,
          83.103
        ],
        "scale": [
          1,
          1,
          1
        ]
      },
      "sabreLocal": {
        "position": [
          -1.98175,
          -1.31896,
          -7.90654
        ],
        "rotationDeg": [
          90,
          30,
          0
        ],
        "scale": [
          88,
          88,
          88
        ]
      },
      "bladeLocalAxis": [
        0,
        0,
        1
      ]
    },
    "reviewVerdict": "rejected-foot-blind-counterfeit-shared-rest",
    "reviewVerdictReason": "Rejected after screenshot review: SharedRest reused SwordAttack1 start and the leg solver/gates only placed ankle origins, leaving boots visibly wrong."
  },
  "guardReport": {
    "crimsonLightAttack1V3": {
      "status": "FAIL",
      "thresholds": {
        "maxContactBladeAngleDeg": 9,
        "maxChainError": 0.24,
        "bodyTravelDeg": {
          "Hips": 18,
          "Spine02": 24,
          "Spine": 12,
          "LeftArm": 32,
          "LeftForeArm": 22,
          "LeftHand": 16,
          "RightArm": 48,
          "RightForeArm": 40,
          "RightHand": 42,
          "LeftUpLeg": 7,
          "LeftLeg": 5,
          "RightUpLeg": 7,
          "RightLeg": 5
        }
      },
      "bodyTravelDeg": {
        "Hips": 30,
        "Spine02": 74.273,
        "Spine01": 29.778,
        "Spine": 24.787,
        "neck": 1.006,
        "Head": 33.727,
        "LeftUpLeg": 22.196,
        "LeftLeg": 11.815,
        "LeftFoot": 0,
        "RightUpLeg": 16.048,
        "RightLeg": 12.136,
        "RightFoot": 0.006,
        "LeftShoulder": 14.088,
        "LeftArm": 101.668,
        "LeftForeArm": 94.595,
        "LeftHand": 27.638,
        "RightShoulder": 0.159,
        "RightArm": 84.656,
        "RightForeArm": 61.663,
        "RightHand": 171.413
      },
      "startFromSavedBaselineTravel": {
        "Hips": 0.133,
        "Spine02": 0,
        "Spine": 0.136,
        "RightArm": 68.911,
        "RightForeArm": 67.416,
        "RightHand": 88.187,
        "LeftArm": 127.404,
        "LeftForeArm": 53.419,
        "LeftHand": 0.102
      },
      "maxChainError": 0,
      "report": [
        {
          "label": "start",
          "sourceTime": 0,
          "hiltWorld": [
            -0.47883,
            1.69695,
            0.25364
          ],
          "rightHandWorld": [
            -0.36613,
            1.56537,
            0.17943
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0.17365,
            0.98481,
            0
          ],
          "actualBladeDirectionWorld": [
            0.17357,
            0.98482,
            -0.00002
          ],
          "bladeAngleErrorDeg": 0.005,
          "chains": [
            {
              "chain": "rightArm",
              "targetMid": [
                -0.37141,
                1.37877,
                0.11768
              ],
              "actualMid": [
                -0.37141,
                1.37877,
                0.11768
              ],
              "targetEnd": [
                -0.25513,
                1.54774,
                0.22867
              ],
              "actualEnd": [
                -0.25513,
                1.54774,
                0.22867
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 78.177,
              "lowerRotationDeg": 79.027
            },
            {
              "chain": "leftArm",
              "targetMid": [
                0.08389,
                1.40972,
                0.26118
              ],
              "actualMid": [
                0.08389,
                1.40972,
                0.26118
              ],
              "targetEnd": [
                -0.07944,
                1.56883,
                0.26891
              ],
              "actualEnd": [
                -0.07944,
                1.56883,
                0.26891
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 127.404,
              "lowerRotationDeg": 53.42
            },
            {
              "chain": "rightLeg",
              "targetMid": [
                -0.15307,
                0.56564,
                0.2411
              ],
              "actualMid": [
                -0.15307,
                0.56564,
                0.2411
              ],
              "targetEnd": [
                -0.23293,
                0.18758,
                0.29968
              ],
              "actualEnd": [
                -0.23293,
                0.18758,
                0.29968
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 18.928,
              "lowerRotationDeg": 4.626
            },
            {
              "chain": "leftLeg",
              "targetMid": [
                0.1163,
                0.54335,
                0.17638
              ],
              "actualMid": [
                0.1163,
                0.54335,
                0.17638
              ],
              "targetEnd": [
                0.08844,
                0.1573,
                0.19465
              ],
              "actualEnd": [
                0.08844,
                0.1573,
                0.19465
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 7.576,
              "lowerRotationDeg": 7.033
            }
          ],
          "rollClampReport": [],
          "rightArmBladeSolveRotationDeg": {
            "RightHand": 88.187,
            "RightForeArm": 22.441,
            "RightArm": 11.622
          },
          "rightHandBladeSolveAngleDeg": 0.005
        },
        {
          "label": "earlyWindup",
          "sourceTime": 0.1,
          "hiltWorld": [
            -0.13609,
            1.48351,
            0.14566
          ],
          "rightHandWorld": [
            -0.24501,
            1.45982,
            -0.00632
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0.99863,
            0.05234,
            0
          ],
          "actualBladeDirectionWorld": [
            0.99863,
            0.05223,
            0.00008
          ],
          "bladeAngleErrorDeg": 0.008,
          "chains": [
            {
              "chain": "rightArm",
              "targetMid": [
                -0.21645,
                1.29398,
                -0.23437
              ],
              "actualMid": [
                -0.21645,
                1.29398,
                -0.23437
              ],
              "targetEnd": [
                -0.19885,
                1.51369,
                -0.15816
              ],
              "actualEnd": [
                -0.19885,
                1.51369,
                -0.15816
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 125.905,
              "lowerRotationDeg": 56.274
            },
            {
              "chain": "leftArm",
              "targetMid": [
                -0.14927,
                1.49735,
                0.17181
              ],
              "actualMid": [
                -0.14927,
                1.49735,
                0.17181
              ],
              "targetEnd": [
                -0.24769,
                1.64922,
                0.03287
              ],
              "actualEnd": [
                -0.24769,
                1.64922,
                0.03287
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 120.813,
              "lowerRotationDeg": 32.064
            },
            {
              "chain": "rightLeg",
              "targetMid": [
                -0.1505,
                0.55133,
                0.19597
              ],
              "actualMid": [
                -0.1505,
                0.55133,
                0.19597
              ],
              "targetEnd": [
                -0.22336,
                0.16863,
                0.22712
              ],
              "actualEnd": [
                -0.22336,
                0.16863,
                0.22712
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 17.268,
              "lowerRotationDeg": 4.497
            },
            {
              "chain": "leftLeg",
              "targetMid": [
                0.12691,
                0.55625,
                0.21878
              ],
              "actualMid": [
                0.12691,
                0.55625,
                0.21878
              ],
              "targetEnd": [
                0.11687,
                0.16904,
                0.22928
              ],
              "actualEnd": [
                0.11687,
                0.16904,
                0.22928
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 7.523,
              "lowerRotationDeg": 6.761
            }
          ],
          "rollClampReport": [],
          "rightArmBladeSolveRotationDeg": {
            "RightHand": 58.133,
            "RightForeArm": 36.718,
            "RightArm": 14.257
          },
          "rightHandBladeSolveAngleDeg": 0.008
        },
        {
          "label": "anticipation",
          "sourceTime": 0.183333,
          "hiltWorld": [
            -0.12266,
            1.51887,
            0.11805
          ],
          "rightHandWorld": [
            -0.19285,
            1.63137,
            0.25199
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            -0.0349,
            -0.99939,
            0
          ],
          "actualBladeDirectionWorld": [
            -0.03496,
            -0.99939,
            -0.00032
          ],
          "bladeAngleErrorDeg": 0.019,
          "chains": [
            {
              "chain": "rightArm",
              "targetMid": [
                -0.136,
                1.43611,
                0.41888
              ],
              "actualMid": [
                -0.136,
                1.43611,
                0.41888
              ],
              "targetEnd": [
                -0.15128,
                1.65771,
                0.34782
              ],
              "actualEnd": [
                -0.15128,
                1.65771,
                0.34782
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 133.475,
              "lowerRotationDeg": 23.242
            },
            {
              "chain": "leftArm",
              "targetMid": [
                -0.10037,
                1.4993,
                0.05208
              ],
              "actualMid": [
                -0.10037,
                1.4993,
                0.05208
              ],
              "targetEnd": [
                -0.19366,
                1.67632,
                0.16168
              ],
              "actualEnd": [
                -0.19366,
                1.67632,
                0.16168
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 152.707,
              "lowerRotationDeg": 36.828
            },
            {
              "chain": "rightLeg",
              "targetMid": [
                0.03023,
                0.5739,
                0.28781
              ],
              "actualMid": [
                0.03023,
                0.5739,
                0.28781
              ],
              "targetEnd": [
                0.09779,
                0.21583,
                0.4291
              ],
              "actualEnd": [
                0.09779,
                0.21583,
                0.4291
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 24.559,
              "lowerRotationDeg": 14.222
            },
            {
              "chain": "leftLeg",
              "targetMid": [
                0.10173,
                0.54669,
                0.1418
              ],
              "actualMid": [
                0.10173,
                0.54669,
                0.1418
              ],
              "targetEnd": [
                0.1146,
                0.1744,
                0.24847
              ],
              "actualEnd": [
                0.1146,
                0.1744,
                0.24847
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 10.772,
              "lowerRotationDeg": 15.867
            }
          ],
          "rollClampReport": [],
          "rightArmBladeSolveRotationDeg": {
            "RightHand": 62.154,
            "RightForeArm": 19.192,
            "RightArm": 10.873
          },
          "rightHandBladeSolveAngleDeg": 0.019
        },
        {
          "label": "snapPrep",
          "sourceTime": 0.283333,
          "hiltWorld": [
            0.2171,
            0.58473,
            0.17173
          ],
          "rightHandWorld": [
            0.25552,
            0.76772,
            0.1954
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0.67043,
            -0.74198,
            0
          ],
          "actualBladeDirectionWorld": [
            0.67037,
            -0.74203,
            0.00029
          ],
          "bladeAngleErrorDeg": 0.017,
          "chains": [
            {
              "chain": "rightArm",
              "targetMid": [
                0.18907,
                0.9991,
                0.25792
              ],
              "actualMid": [
                0.18907,
                0.9991,
                0.25792
              ],
              "targetEnd": [
                0.11716,
                0.80367,
                0.15292
              ],
              "actualEnd": [
                0.11716,
                0.80367,
                0.15292
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 88.405,
              "lowerRotationDeg": 41.703
            },
            {
              "chain": "leftArm",
              "targetMid": [
                -0.10501,
                1.24012,
                0.01579
              ],
              "actualMid": [
                -0.10501,
                1.24012,
                0.01579
              ],
              "targetEnd": [
                -0.03391,
                1.04306,
                0.10614
              ],
              "actualEnd": [
                -0.03391,
                1.04306,
                0.10614
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 32.309,
              "lowerRotationDeg": 88.852
            },
            {
              "chain": "rightLeg",
              "targetMid": [
                -0.15413,
                0.5892,
                0.28969
              ],
              "actualMid": [
                -0.15413,
                0.5892,
                0.28969
              ],
              "targetEnd": [
                -0.25373,
                0.24941,
                0.45509
              ],
              "actualEnd": [
                -0.25373,
                0.24941,
                0.45509
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 26.45,
              "lowerRotationDeg": 15.047
            },
            {
              "chain": "leftLeg",
              "targetMid": [
                -0.0902,
                0.56941,
                0.16259
              ],
              "actualMid": [
                -0.0902,
                0.56941,
                0.16259
              ],
              "targetEnd": [
                -0.2478,
                0.24263,
                0.2987
              ],
              "actualEnd": [
                -0.2478,
                0.24263,
                0.2987
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 27.004,
              "lowerRotationDeg": 16.447
            }
          ],
          "rollClampReport": [],
          "rightArmBladeSolveRotationDeg": {
            "RightHand": 74.657,
            "RightForeArm": 33.213,
            "RightArm": 10.959
          },
          "rightHandBladeSolveAngleDeg": 0.017
        },
        {
          "label": "contact",
          "sourceTime": 0.383333,
          "hiltWorld": [
            0.22274,
            0.62293,
            0.18577
          ],
          "rightHandWorld": [
            0.25795,
            0.80802,
            0.181
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0.68835,
            -0.72537,
            0
          ],
          "actualBladeDirectionWorld": [
            0.68838,
            -0.72535,
            0.00023
          ],
          "bladeAngleErrorDeg": 0.013,
          "chains": [
            {
              "chain": "rightArm",
              "targetMid": [
                0.18475,
                1.02372,
                0.2528
              ],
              "actualMid": [
                0.18475,
                1.02372,
                0.2528
              ],
              "targetEnd": [
                0.13127,
                0.84734,
                0.10991
              ],
              "actualEnd": [
                0.13127,
                0.84734,
                0.10991
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 90.447,
              "lowerRotationDeg": 30.086
            },
            {
              "chain": "leftArm",
              "targetMid": [
                -0.13999,
                1.28473,
                -0.00809
              ],
              "actualMid": [
                -0.13999,
                1.28473,
                -0.00809
              ],
              "targetEnd": [
                -0.07639,
                1.07664,
                0.06051
              ],
              "actualEnd": [
                -0.07639,
                1.07664,
                0.06051
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 15.934,
              "lowerRotationDeg": 96.688
            },
            {
              "chain": "rightLeg",
              "targetMid": [
                -0.11135,
                0.58204,
                0.2853
              ],
              "actualMid": [
                -0.11135,
                0.58204,
                0.2853
              ],
              "targetEnd": [
                -0.16654,
                0.22911,
                0.44383
              ],
              "actualEnd": [
                -0.16654,
                0.22911,
                0.44383
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 27.44,
              "lowerRotationDeg": 15.063
            },
            {
              "chain": "leftLeg",
              "targetMid": [
                -0.05009,
                0.55184,
                0.1591
              ],
              "actualMid": [
                -0.05009,
                0.55184,
                0.1591
              ],
              "targetEnd": [
                -0.16507,
                0.20567,
                0.28985
              ],
              "actualEnd": [
                -0.16507,
                0.20567,
                0.28985
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 21.582,
              "lowerRotationDeg": 16.511
            }
          ],
          "rollClampReport": [
            {
              "bone": "LeftArm",
              "sourceDeltaDeg": 55.292
            }
          ],
          "rightArmBladeSolveRotationDeg": {
            "RightHand": 88.187,
            "RightForeArm": 33.403,
            "RightArm": 11.602
          },
          "rightHandBladeSolveAngleDeg": 0.013
        },
        {
          "label": "contactHold",
          "sourceTime": 0.5,
          "hiltWorld": [
            0.28262,
            0.99624,
            -0.08399
          ],
          "rightHandWorld": [
            0.2701,
            0.88086,
            0.06451
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0.41945,
            0.90778,
            0
          ],
          "actualBladeDirectionWorld": [
            0.4193,
            0.90785,
            -0.00022
          ],
          "bladeAngleErrorDeg": 0.016,
          "chains": [
            {
              "chain": "rightArm",
              "targetMid": [
                0.24817,
                1.02492,
                0.24518
              ],
              "actualMid": [
                0.24817,
                1.02492,
                0.24518
              ],
              "targetEnd": [
                0.30743,
                0.85826,
                0.09318
              ],
              "actualEnd": [
                0.30743,
                0.85826,
                0.09318
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 77.686,
              "lowerRotationDeg": 15.54
            },
            {
              "chain": "leftArm",
              "targetMid": [
                -0.11492,
                1.19834,
                -0.06141
              ],
              "actualMid": [
                -0.11492,
                1.19834,
                -0.06141
              ],
              "targetEnd": [
                0.00067,
                1.02038,
                0.02238
              ],
              "actualEnd": [
                0.00067,
                1.02038,
                0.02238
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 23.772,
              "lowerRotationDeg": 91.552
            },
            {
              "chain": "rightLeg",
              "targetMid": [
                -0.08868,
                0.58205,
                0.29156
              ],
              "actualMid": [
                -0.08868,
                0.58205,
                0.29156
              ],
              "targetEnd": [
                -0.12887,
                0.22431,
                0.44368
              ],
              "actualEnd": [
                -0.12887,
                0.22431,
                0.44368
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 28.701,
              "lowerRotationDeg": 13.911
            },
            {
              "chain": "leftLeg",
              "targetMid": [
                -0.01567,
                0.53981,
                0.14324
              ],
              "actualMid": [
                -0.01567,
                0.53981,
                0.14324
              ],
              "targetEnd": [
                -0.10854,
                0.18066,
                0.25517
              ],
              "actualEnd": [
                -0.10854,
                0.18066,
                0.25517
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 16.145,
              "lowerRotationDeg": 15.591
            }
          ],
          "rollClampReport": [],
          "rightArmBladeSolveRotationDeg": {
            "RightHand": 44.094,
            "RightForeArm": 30.459,
            "RightArm": 17.567
          },
          "rightHandBladeSolveAngleDeg": 0.016
        },
        {
          "label": "settle",
          "sourceTime": 0.566667,
          "hiltWorld": [
            0.56946,
            1.19022,
            0.56834
          ],
          "rightHandWorld": [
            0.46076,
            1.21749,
            0.4168
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0.90557,
            -0.4242,
            0
          ],
          "actualBladeDirectionWorld": [
            0.90562,
            -0.42409,
            0.0001
          ],
          "bladeAngleErrorDeg": 0.009,
          "chains": [
            {
              "chain": "rightArm",
              "targetMid": [
                0.27442,
                1.1852,
                0.37615
              ],
              "actualMid": [
                0.27442,
                1.1852,
                0.37615
              ],
              "targetEnd": [
                0.50307,
                1.17781,
                0.33082
              ],
              "actualEnd": [
                0.50307,
                1.17781,
                0.33082
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 9.875,
              "lowerRotationDeg": 74.569
            },
            {
              "chain": "leftArm",
              "targetMid": [
                0.15862,
                1.13464,
                -0.00055
              ],
              "actualMid": [
                0.15862,
                1.13464,
                -0.00055
              ],
              "targetEnd": [
                0.26031,
                1.16657,
                0.20117
              ],
              "actualEnd": [
                0.26031,
                1.16657,
                0.20117
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 107.627,
              "lowerRotationDeg": 84.306
            },
            {
              "chain": "rightLeg",
              "targetMid": [
                -0.12187,
                0.59035,
                0.31314
              ],
              "actualMid": [
                -0.12187,
                0.59035,
                0.31314
              ],
              "targetEnd": [
                -0.20068,
                0.22917,
                0.43992
              ],
              "actualEnd": [
                -0.20068,
                0.22917,
                0.43992
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 26.71,
              "lowerRotationDeg": 8.181
            },
            {
              "chain": "leftLeg",
              "targetMid": [
                0.03097,
                0.52944,
                0.12302
              ],
              "actualMid": [
                0.03097,
                0.52944,
                0.12302
              ],
              "targetEnd": [
                -0.05173,
                0.15596,
                0.18479
              ],
              "actualEnd": [
                -0.05173,
                0.15596,
                0.18479
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 10.802,
              "lowerRotationDeg": 10.566
            }
          ],
          "rollClampReport": [],
          "rightArmBladeSolveRotationDeg": {
            "RightHand": 53.291,
            "RightForeArm": 23.82,
            "RightArm": 10.801
          },
          "rightHandBladeSolveAngleDeg": 0.009
        },
        {
          "label": "followThrough",
          "sourceTime": 0.62,
          "hiltWorld": [
            0.16765,
            1.283,
            0.20231
          ],
          "rightHandWorld": [
            0.29663,
            1.16368,
            0.27049
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0.06976,
            0.99756,
            0
          ],
          "actualBladeDirectionWorld": [
            0.06971,
            0.99757,
            0.00022
          ],
          "bladeAngleErrorDeg": 0.013,
          "chains": [
            {
              "chain": "rightArm",
              "targetMid": [
                0.12996,
                1.32579,
                0.40235
              ],
              "actualMid": [
                0.12996,
                1.32579,
                0.40235
              ],
              "targetEnd": [
                0.3617,
                1.34702,
                0.38699
              ],
              "actualEnd": [
                0.3617,
                1.34702,
                0.38699
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 26.896,
              "lowerRotationDeg": 104.442
            },
            {
              "chain": "leftArm",
              "targetMid": [
                0.21351,
                1.20362,
                0.06577
              ],
              "actualMid": [
                0.21351,
                1.20362,
                0.06577
              ],
              "targetEnd": [
                0.22603,
                1.32509,
                0.2585
              ],
              "actualEnd": [
                0.22603,
                1.32509,
                0.2585
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 122.993,
              "lowerRotationDeg": 88.161
            },
            {
              "chain": "rightLeg",
              "targetMid": [
                -0.14446,
                0.59415,
                0.31067
              ],
              "actualMid": [
                -0.14446,
                0.59415,
                0.31067
              ],
              "targetEnd": [
                -0.23303,
                0.22841,
                0.41617
              ],
              "actualEnd": [
                -0.23303,
                0.22841,
                0.41617
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 24.441,
              "lowerRotationDeg": 5.003
            },
            {
              "chain": "leftLeg",
              "targetMid": [
                0.0513,
                0.52637,
                0.12865
              ],
              "actualMid": [
                0.0513,
                0.52637,
                0.12865
              ],
              "targetEnd": [
                -0.01503,
                0.14721,
                0.17318
              ],
              "actualEnd": [
                -0.01503,
                0.14721,
                0.17318
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 12.352,
              "lowerRotationDeg": 7.632
            }
          ],
          "rollClampReport": [],
          "rightArmBladeSolveRotationDeg": {
            "RightHand": 117.625,
            "RightForeArm": 45.192,
            "RightArm": 22.137
          },
          "rightHandBladeSolveAngleDeg": 0.013
        }
      ],
      "guardFailures": [
        "SHARED_REST_IS_COUNTERFEIT_ATTACK_START",
        "FOOT_CONTACT_TRUTH_NOT_SOLVED"
      ],
      "note": "Rejected diagnostic: sword/upper-body metrics are preserved for debugging, but this candidate is not accepted because SharedRest is attack start and feet are foot-blind."
    }
  },
  "frames": [
    {
      "time": 0,
      "label": "start",
      "note": "start: full-body Vanguard SwordAttack1 relationship baked to Crimson; Arborblade socket remains invariant",
      "sourceTime": 0,
      "bones": {
        "Hips": [
          0.133903,
          0.02028,
          0.02028,
          0.990579
        ],
        "Spine02": [
          -0.207512,
          -0.018712,
          -0.021738,
          0.977812
        ],
        "Spine01": [
          0,
          0,
          0,
          1
        ],
        "Spine": [
          -0.106978,
          -0.004,
          0.00345,
          0.994247
        ],
        "neck": [
          0.106977,
          0.004004,
          -0.003446,
          0.994247
        ],
        "Head": [
          0.066509,
          0,
          0,
          0.997786
        ],
        "LeftUpLeg": [
          0.981639,
          0.000749,
          -0.035967,
          0.187326
        ],
        "LeftLeg": [
          0.0345,
          0.028097,
          0.065614,
          0.996853
        ],
        "LeftFoot": [
          -0.412188,
          -0.024893,
          -0.000576,
          0.910759
        ],
        "RightUpLeg": [
          0.951558,
          -0.09924,
          0.071598,
          0.282067
        ],
        "RightLeg": [
          0.07211,
          -0.03426,
          0.017191,
          0.99666
        ],
        "RightFoot": [
          -0.407933,
          0.029799,
          0.005309,
          0.91251
        ],
        "LeftShoulder": [
          0.540329,
          0.62127,
          -0.431662,
          0.368423
        ],
        "LeftArm": [
          -0.079889,
          -0.169475,
          0.844228,
          0.502171
        ],
        "LeftForeArm": [
          -0.339261,
          0.091773,
          0.357423,
          0.865291
        ],
        "LeftHand": [
          0.011524,
          0.077673,
          0.106333,
          0.991225
        ],
        "RightShoulder": [
          0.541765,
          -0.620018,
          0.423857,
          0.377376
        ],
        "RightArm": [
          -0.117934,
          -0.411239,
          -0.162824,
          0.889079
        ],
        "RightForeArm": [
          -0.648629,
          0.239761,
          0.180065,
          0.699551
        ],
        "RightHand": [
          0.457344,
          0.144897,
          0.412663,
          0.774306
        ]
      }
    },
    {
      "time": 0.1,
      "label": "earlyWindup",
      "note": "earlyWindup: full-body Vanguard SwordAttack1 relationship baked to Crimson; Arborblade socket remains invariant",
      "sourceTime": 0.1,
      "bones": {
        "Hips": [
          0.099238,
          -0.124526,
          0.094041,
          0.982752
        ],
        "Spine02": [
          -0.271914,
          -0.283414,
          0.112099,
          0.912783
        ],
        "Spine01": [
          -0.02604,
          -0.114046,
          0.019996,
          0.992933
        ],
        "Spine": [
          -0.127475,
          -0.096412,
          0.009667,
          0.987097
        ],
        "neck": [
          0.112143,
          0.004088,
          -0.00589,
          0.993666
        ],
        "Head": [
          0.057793,
          -0.163337,
          -0.004164,
          0.984867
        ],
        "LeftUpLeg": [
          0.986017,
          -0.028921,
          -0.033051,
          0.160753
        ],
        "LeftLeg": [
          0.036652,
          0.02824,
          0.064438,
          0.996848
        ],
        "LeftFoot": [
          -0.412188,
          -0.024893,
          -0.000576,
          0.910759
        ],
        "RightUpLeg": [
          0.954457,
          -0.132477,
          0.077794,
          0.255753
        ],
        "RightLeg": [
          0.072371,
          -0.034185,
          0.016063,
          0.996662
        ],
        "RightFoot": [
          -0.407933,
          0.029799,
          0.005309,
          0.91251
        ],
        "LeftShoulder": [
          0.518103,
          0.639207,
          -0.443228,
          0.355715
        ],
        "LeftArm": [
          -0.309518,
          -0.058001,
          0.625514,
          0.713839
        ],
        "LeftForeArm": [
          -0.443762,
          -0.070851,
          0.054772,
          0.891659
        ],
        "LeftHand": [
          -0.003678,
          0.118454,
          0.115981,
          0.986156
        ],
        "RightShoulder": [
          0.541765,
          -0.620018,
          0.423857,
          0.377376
        ],
        "RightArm": [
          -0.496143,
          -0.124683,
          -0.45577,
          0.728403
        ],
        "RightForeArm": [
          -0.598872,
          -0.030413,
          -0.271994,
          0.752627
        ],
        "RightHand": [
          -0.112023,
          0.356144,
          0.013486,
          0.927594
        ]
      }
    },
    {
      "time": 0.183333,
      "label": "anticipation",
      "note": "anticipation: full-body Vanguard SwordAttack1 relationship baked to Crimson; Arborblade socket remains invariant",
      "sourceTime": 0.183333,
      "bones": {
        "Hips": [
          0.110592,
          0.277299,
          0.004919,
          0.954385
        ],
        "Spine02": [
          -0.29743,
          0.13376,
          0.071984,
          0.942583
        ],
        "Spine01": [
          0.015004,
          0.21209,
          0.095054,
          0.972501
        ],
        "Spine": [
          -0.092226,
          0.157125,
          0.09741,
          0.978426
        ],
        "neck": [
          0.104246,
          0.003959,
          -0.002154,
          0.994541
        ],
        "Head": [
          0.070296,
          0.248308,
          0.058239,
          0.96437
        ],
        "LeftUpLeg": [
          0.983337,
          -0.055398,
          -0.029262,
          0.170656
        ],
        "LeftLeg": [
          -0.057394,
          0.027415,
          0.04692,
          0.996872
        ],
        "LeftFoot": [
          -0.412188,
          -0.024893,
          -0.000576,
          0.910759
        ],
        "RightUpLeg": [
          0.949846,
          0.037303,
          0.052615,
          0.305996
        ],
        "RightLeg": [
          -0.004886,
          -0.036588,
          0.07397,
          0.996577
        ],
        "RightFoot": [
          -0.407933,
          0.029799,
          0.005309,
          0.91251
        ],
        "LeftShoulder": [
          0.507404,
          0.646588,
          -0.451824,
          0.346872
        ],
        "LeftArm": [
          -0.087984,
          -0.389364,
          0.846594,
          0.352041
        ],
        "LeftForeArm": [
          -0.326773,
          0.097711,
          0.212019,
          0.915816
        ],
        "LeftHand": [
          -0.143157,
          0.25126,
          0.148312,
          0.945716
        ],
        "RightShoulder": [
          0.541765,
          -0.620018,
          0.423857,
          0.377376
        ],
        "RightArm": [
          -0.553937,
          -0.313713,
          0.067235,
          0.768256
        ],
        "RightForeArm": [
          -0.562985,
          0.323138,
          0.134739,
          0.748649
        ],
        "RightHand": [
          -0.463058,
          0.288052,
          -0.196621,
          0.814827
        ]
      }
    },
    {
      "time": 0.283333,
      "label": "snapPrep",
      "note": "snapPrep: full-body Vanguard SwordAttack1 relationship baked to Crimson; Arborblade socket remains invariant",
      "sourceTime": 0.283333,
      "bones": {
        "Hips": [
          0.211609,
          0.222926,
          -0.117222,
          0.944343
        ],
        "Spine02": [
          0.175805,
          0.446278,
          -0.188607,
          0.856946
        ],
        "Spine01": [
          0.099792,
          0.18216,
          -0.14635,
          0.967182
        ],
        "Spine": [
          -0.037184,
          0.169778,
          -0.097708,
          0.979921
        ],
        "neck": [
          0.099165,
          0.003876,
          0.000247,
          0.995063
        ],
        "Head": [
          0.126115,
          0.278214,
          -0.008483,
          0.952166
        ],
        "LeftUpLeg": [
          0.958961,
          -0.187939,
          -0.01006,
          0.212064
        ],
        "LeftLeg": [
          -0.063754,
          0.027984,
          0.03783,
          0.996856
        ],
        "LeftFoot": [
          -0.412188,
          -0.024893,
          -0.000576,
          0.910759
        ],
        "RightUpLeg": [
          0.933045,
          -0.068523,
          0.061805,
          0.347725
        ],
        "RightLeg": [
          -0.018307,
          -0.036123,
          0.071834,
          0.996594
        ],
        "RightFoot": [
          -0.407933,
          0.029799,
          0.005309,
          0.91251
        ],
        "LeftShoulder": [
          0.462391,
          0.671916,
          -0.48786,
          0.310992
        ],
        "LeftArm": [
          0.174353,
          0.464909,
          0.527774,
          0.689141
        ],
        "LeftForeArm": [
          -0.073397,
          -0.065913,
          0.705088,
          0.702225
        ],
        "LeftHand": [
          -0.070784,
          -0.111314,
          0.100983,
          0.986104
        ],
        "RightShoulder": [
          0.541765,
          -0.620018,
          0.423857,
          0.377376
        ],
        "RightArm": [
          0.262183,
          -0.289417,
          -0.634411,
          0.667099
        ],
        "RightForeArm": [
          -0.346516,
          0.200406,
          -0.020306,
          0.916161
        ],
        "RightHand": [
          0.341303,
          0.289619,
          0.416802,
          0.791144
        ]
      }
    },
    {
      "time": 0.383333,
      "label": "contact",
      "note": "contact: full-body Vanguard SwordAttack1 relationship baked to Crimson; Arborblade socket remains invariant",
      "sourceTime": 0.383333,
      "bones": {
        "Hips": [
          0.197773,
          0.229571,
          -0.11493,
          0.946031
        ],
        "Spine02": [
          0.16015,
          0.453557,
          -0.19188,
          0.855465
        ],
        "Spine01": [
          0.087628,
          0.18732,
          -0.152495,
          0.966425
        ],
        "Spine": [
          -0.047948,
          0.174035,
          -0.102233,
          0.978244
        ],
        "neck": [
          0.099165,
          0.003876,
          0.000247,
          0.995063
        ],
        "Head": [
          0.124097,
          0.280334,
          -0.014138,
          0.951742
        ],
        "LeftUpLeg": [
          0.965835,
          -0.13169,
          -0.017304,
          0.222532
        ],
        "LeftLeg": [
          -0.064421,
          0.028059,
          0.036679,
          0.996854
        ],
        "LeftFoot": [
          -0.412188,
          -0.024893,
          -0.000576,
          0.910759
        ],
        "RightUpLeg": [
          0.9352,
          -0.010972,
          0.054583,
          0.349715
        ],
        "RightLeg": [
          -0.018571,
          -0.036112,
          0.071767,
          0.996594
        ],
        "RightFoot": [
          -0.407933,
          0.029799,
          0.005309,
          0.91251
        ],
        "LeftShoulder": [
          0.462391,
          0.671916,
          -0.48786,
          0.310992
        ],
        "LeftArm": [
          0.138403,
          0.479431,
          0.400237,
          0.768636
        ],
        "LeftForeArm": [
          -0.057986,
          -0.082308,
          0.753216,
          0.650023
        ],
        "LeftHand": [
          -0.070784,
          -0.111314,
          0.100983,
          0.986104
        ],
        "RightShoulder": [
          0.541765,
          -0.620018,
          0.423857,
          0.377376
        ],
        "RightArm": [
          0.319055,
          -0.329641,
          -0.618302,
          0.638157
        ],
        "RightForeArm": [
          -0.429645,
          0.235968,
          -0.107708,
          0.864941
        ],
        "RightHand": [
          0.312162,
          0.195384,
          0.540801,
          0.75625
        ]
      }
    },
    {
      "time": 0.5,
      "label": "contactHold",
      "note": "contactHold: full-body Vanguard SwordAttack1 relationship baked to Crimson; Arborblade socket remains invariant",
      "sourceTime": 0.5,
      "bones": {
        "Hips": [
          0.186709,
          0.236406,
          -0.109234,
          0.94727
        ],
        "Spine02": [
          0.11682,
          0.457998,
          -0.207119,
          0.856559
        ],
        "Spine01": [
          0.068252,
          0.200374,
          -0.14209,
          0.966955
        ],
        "Spine": [
          -0.06196,
          0.182245,
          -0.092225,
          0.976956
        ],
        "neck": [
          0.099165,
          0.003876,
          0.000247,
          0.995063
        ],
        "Head": [
          0.118837,
          0.284249,
          -0.017287,
          0.9512
        ],
        "LeftUpLeg": [
          0.972971,
          -0.080643,
          -0.024376,
          0.215014
        ],
        "LeftLeg": [
          -0.054275,
          0.027205,
          0.050495,
          0.996877
        ],
        "LeftFoot": [
          -0.412188,
          -0.024893,
          -0.000576,
          0.910759
        ],
        "RightUpLeg": [
          0.933224,
          0.007282,
          0.05173,
          0.355476
        ],
        "RightLeg": [
          -0.000222,
          -0.036707,
          0.07413,
          0.996573
        ],
        "RightFoot": [
          -0.407933,
          0.029799,
          0.005309,
          0.91251
        ],
        "LeftShoulder": [
          0.480208,
          0.661595,
          -0.477106,
          0.322586
        ],
        "LeftArm": [
          0.033676,
          0.432418,
          0.529006,
          0.729406
        ],
        "LeftForeArm": [
          -0.155231,
          -0.07228,
          0.708065,
          0.685071
        ],
        "LeftHand": [
          -0.056824,
          -0.083179,
          0.101485,
          0.989724
        ],
        "RightShoulder": [
          0.541765,
          -0.620018,
          0.423857,
          0.377376
        ],
        "RightArm": [
          0.307775,
          -0.293628,
          -0.66401,
          0.614938
        ],
        "RightForeArm": [
          -0.456543,
          0.223352,
          -0.241845,
          0.826555
        ],
        "RightHand": [
          -0.228805,
          -0.014524,
          -0.264493,
          0.936739
        ]
      }
    },
    {
      "time": 0.566667,
      "label": "settle",
      "note": "settle: full-body Vanguard SwordAttack1 relationship baked to Crimson; Arborblade socket remains invariant",
      "sourceTime": 0.566667,
      "bones": {
        "Hips": [
          0.176965,
          0.238849,
          -0.109156,
          0.948535
        ],
        "Spine02": [
          0.003921,
          0.44173,
          -0.263,
          0.857724
        ],
        "Spine01": [
          0.032274,
          0.220264,
          -0.099511,
          0.969814
        ],
        "Spine": [
          -0.082041,
          0.190601,
          -0.054718,
          0.976702
        ],
        "neck": [
          0.099165,
          0.003876,
          0.000247,
          0.995063
        ],
        "Head": [
          0.091939,
          0.27238,
          -0.007021,
          0.957762
        ],
        "LeftUpLeg": [
          0.976118,
          -0.005659,
          -0.034175,
          0.21446
        ],
        "LeftLeg": [
          0.002074,
          0.026663,
          0.074104,
          0.996892
        ],
        "LeftFoot": [
          -0.412188,
          -0.024893,
          -0.000576,
          0.910759
        ],
        "RightUpLeg": [
          0.933771,
          -0.049588,
          0.059361,
          0.349412
        ],
        "RightLeg": [
          0.057615,
          -0.036056,
          0.046646,
          0.996596
        ],
        "RightFoot": [
          -0.407933,
          0.029799,
          0.005309,
          0.91251
        ],
        "LeftShoulder": [
          0.536839,
          0.623113,
          -0.43932,
          0.361292
        ],
        "LeftArm": [
          0.232306,
          0.006552,
          0.898981,
          0.371247
        ],
        "LeftForeArm": [
          0.259232,
          0.133954,
          0.553871,
          0.779796
        ],
        "LeftHand": [
          -0.008766,
          0.013714,
          0.102478,
          0.994602
        ],
        "RightShoulder": [
          0.541765,
          -0.620018,
          0.423857,
          0.377376
        ],
        "RightArm": [
          0.430885,
          -0.522216,
          -0.248193,
          0.692842
        ],
        "RightForeArm": [
          -0.524632,
          0.154872,
          0.48444,
          0.682711
        ],
        "RightHand": [
          0.380713,
          -0.14194,
          0.190447,
          0.893667
        ]
      }
    },
    {
      "time": 0.62,
      "label": "followThrough",
      "note": "followThrough: full-body Vanguard SwordAttack1 relationship baked to Crimson; Arborblade socket remains invariant",
      "sourceTime": 0.62,
      "bones": {
        "Hips": [
          0.172017,
          0.232577,
          -0.120945,
          0.949574
        ],
        "Spine02": [
          -0.061685,
          0.373428,
          -0.271314,
          0.884949
        ],
        "Spine01": [
          0.013634,
          0.174866,
          -0.06662,
          0.982241
        ],
        "Spine": [
          -0.094239,
          0.142956,
          -0.030784,
          0.984751
        ],
        "neck": [
          0.099165,
          0.003876,
          0.000247,
          0.995063
        ],
        "Head": [
          0.079537,
          0.249249,
          0.001338,
          0.965167
        ],
        "LeftUpLeg": [
          0.971107,
          0.032528,
          -0.038371,
          0.233283
        ],
        "LeftLeg": [
          0.029578,
          0.027794,
          0.067975,
          0.996861
        ],
        "LeftFoot": [
          -0.412188,
          -0.024893,
          -0.000576,
          0.910759
        ],
        "RightUpLeg": [
          0.939586,
          -0.059686,
          0.062329,
          0.331258
        ],
        "RightLeg": [
          0.071252,
          -0.034477,
          0.020462,
          0.996652
        ],
        "RightFoot": [
          -0.407933,
          0.029799,
          0.005309,
          0.91251
        ],
        "LeftShoulder": [
          0.562667,
          0.602163,
          -0.420046,
          0.379957
        ],
        "LeftArm": [
          0.541807,
          -0.108197,
          0.809029,
          0.200526
        ],
        "LeftForeArm": [
          0.449464,
          0.219774,
          0.318222,
          0.805243
        ],
        "LeftHand": [
          0.014476,
          0.060593,
          0.102552,
          0.992775
        ],
        "RightShoulder": [
          0.541765,
          -0.620018,
          0.423857,
          0.377376
        ],
        "RightArm": [
          0.425158,
          -0.60378,
          -0.257458,
          0.623223
        ],
        "RightForeArm": [
          -0.893701,
          -0.09479,
          0.12909,
          0.419105
        ],
        "RightHand": [
          -0.363264,
          0.511373,
          -0.577008,
          0.523066
        ]
      }
    }
  ]
};

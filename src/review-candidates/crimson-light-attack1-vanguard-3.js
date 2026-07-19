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
      "rollRestoration": "bounded source local quaternion deltas applied before chain solve; clamps recorded per frame"
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
    }
  },
  "guardReport": {
    "crimsonLightAttack1V3": {
      "status": "PASS",
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
        "LeftUpLeg": 27.005,
        "LeftLeg": 16.51,
        "LeftFoot": 0,
        "RightUpLeg": 28.701,
        "RightLeg": 15.063,
        "RightFoot": 0.006,
        "LeftShoulder": 14.088,
        "LeftArm": 154.149,
        "LeftForeArm": 98.419,
        "LeftHand": 27.638,
        "RightShoulder": 0.159,
        "RightArm": 118.816,
        "RightForeArm": 95.885,
        "RightHand": 145.303
      },
      "maxChainError": 0,
      "report": [
        {
          "label": "start",
          "sourceTime": 0,
          "hiltWorld": [
            -0.40974,
            0.80885,
            0.14592
          ],
          "rightHandWorld": [
            -0.43418,
            0.96562,
            0.04421
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0.07005,
            -0.99754,
            0.00221
          ],
          "actualBladeDirectionWorld": [
            0.0645,
            -0.04494,
            0.99691
          ],
          "bladeAngleErrorDeg": 87.045,
          "chains": [],
          "rollClampReport": []
        },
        {
          "label": "earlyWindup",
          "sourceTime": 0.1,
          "hiltWorld": [
            -0.24091,
            1.41485,
            -0.00329
          ],
          "rightHandWorld": [
            -0.19885,
            1.51369,
            -0.15816
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0.14956,
            -0.98086,
            0.12467
          ],
          "actualBladeDirectionWorld": [
            0.14944,
            -0.98083,
            0.12505
          ],
          "bladeAngleErrorDeg": 0.023,
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
          "rightHandBladeSolveRotationDeg": 67.36,
          "rightHandBladeSolveAngleDeg": 0.023
        },
        {
          "label": "anticipation",
          "sourceTime": 0.183333,
          "hiltWorld": [
            -0.05642,
            1.52496,
            0.25347
          ],
          "rightHandWorld": [
            -0.15128,
            1.65771,
            0.34782
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            -0.14882,
            -0.98623,
            0.07215
          ],
          "actualBladeDirectionWorld": [
            -0.1484,
            -0.98628,
            0.07238
          ],
          "bladeAngleErrorDeg": 0.028,
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
          "rightHandBladeSolveRotationDeg": 89.558,
          "rightHandBladeSolveAngleDeg": 0.028
        },
        {
          "label": "snapPrep",
          "sourceTime": 0.283333,
          "hiltWorld": [
            0.00803,
            0.921,
            0.25214
          ],
          "rightHandWorld": [
            0.11716,
            0.80367,
            0.15292
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            -0.87803,
            -0.23248,
            0.41835
          ],
          "actualBladeDirectionWorld": [
            -0.87807,
            -0.23261,
            0.4182
          ],
          "bladeAngleErrorDeg": 0.012,
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
          "rightHandBladeSolveRotationDeg": 140.099,
          "rightHandBladeSolveAngleDeg": 0.012
        },
        {
          "label": "contact",
          "sourceTime": 0.383333,
          "hiltWorld": [
            0.09686,
            0.67766,
            0.18439
          ],
          "rightHandWorld": [
            0.13127,
            0.84734,
            0.10991
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            -0.855,
            -0.2851,
            0.43324
          ],
          "actualBladeDirectionWorld": [
            -0.855,
            -0.28479,
            0.43345
          ],
          "bladeAngleErrorDeg": 0.021,
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
          "rightHandBladeSolveRotationDeg": 113.57,
          "rightHandBladeSolveAngleDeg": 0.021
        },
        {
          "label": "contactHold",
          "sourceTime": 0.5,
          "hiltWorld": [
            0.27873,
            0.74025,
            0.2373
          ],
          "rightHandWorld": [
            0.30743,
            0.85826,
            0.09318
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            -0.89117,
            -0.29151,
            0.34762
          ],
          "actualBladeDirectionWorld": [
            -0.89135,
            -0.29111,
            0.34748
          ],
          "bladeAngleErrorDeg": 0.026,
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
          "rightHandBladeSolveRotationDeg": 110.412,
          "rightHandBladeSolveAngleDeg": 0.026
        },
        {
          "label": "settle",
          "sourceTime": 0.566667,
          "hiltWorld": [
            0.46819,
            1.04631,
            0.46125
          ],
          "rightHandWorld": [
            0.50307,
            1.17781,
            0.33082
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            -0.86641,
            -0.48369,
            0.12403
          ],
          "actualBladeDirectionWorld": [
            -0.86647,
            -0.48348,
            0.12437
          ],
          "bladeAngleErrorDeg": 0.024,
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
          "rightHandBladeSolveRotationDeg": 82.806,
          "rightHandBladeSolveAngleDeg": 0.024
        },
        {
          "label": "followThrough",
          "sourceTime": 0.62,
          "hiltWorld": [
            0.34017,
            1.21413,
            0.51889
          ],
          "rightHandWorld": [
            0.3617,
            1.34702,
            0.38699
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            -0.81926,
            -0.55604,
            0.14008
          ],
          "actualBladeDirectionWorld": [
            -0.8194,
            -0.55574,
            0.14048
          ],
          "bladeAngleErrorDeg": 0.03,
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
          "rightHandBladeSolveRotationDeg": 69.416,
          "rightHandBladeSolveAngleDeg": 0.03
        }
      ],
      "guardFailures": [],
      "note": "Guardrail only: full-body transfer and weapon invariance must still be judged by hosted cloud screenshots."
    }
  },
  "frames": [
    {
      "time": 0,
      "label": "start",
      "note": "start: exact saved Crimson weapon baseline; no source motion applied",
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
          0.99061,
          0.026888,
          -0.041329,
          0.127516
        ],
        "LeftLeg": [
          0.078856,
          0.032454,
          0.02344,
          0.996082
        ],
        "LeftFoot": [
          -0.412188,
          -0.024893,
          -0.000576,
          0.910759
        ],
        "RightUpLeg": [
          0.986701,
          -0.066079,
          0.080837,
          0.124577
        ],
        "RightLeg": [
          0.072182,
          -0.031345,
          -0.023072,
          0.996632
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
          0.42424,
          0.487791,
          0.230177,
          0.727392
        ],
        "LeftForeArm": [
          -0.158949,
          -0.100573,
          -0.003473,
          0.982145
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
          0.434581,
          -0.497353,
          -0.242454,
          0.710631
        ],
        "RightForeArm": [
          -0.174054,
          0.130164,
          0.029152,
          0.97566
        ],
        "RightHand": [
          0.037282,
          -0.100795,
          -0.117858,
          0.987198
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
          -0.45963,
          -0.13036,
          -0.361559,
          0.800638
        ],
        "RightForeArm": [
          -0.673223,
          0.046423,
          0.028234,
          0.73744
        ],
        "RightHand": [
          -0.437415,
          -0.015385,
          -0.386704,
          0.811722
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
          -0.49879,
          -0.39084,
          0.067423,
          0.770653
        ],
        "RightForeArm": [
          -0.449232,
          0.251062,
          0.175004,
          0.839364
        ],
        "RightHand": [
          -0.623643,
          0.277245,
          -0.313986,
          0.660013
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
          0.2601,
          -0.327071,
          -0.685802,
          0.595859
        ],
        "RightForeArm": [
          -0.251609,
          -0.064719,
          -0.063586,
          0.963567
        ],
        "RightHand": [
          0.943985,
          -0.059328,
          0.164306,
          0.279956
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
          0.305381,
          -0.337172,
          -0.68753,
          0.566003
        ],
        "RightForeArm": [
          -0.361586,
          -0.039821,
          -0.125199,
          0.923036
        ],
        "RightHand": [
          0.188775,
          -0.896627,
          0.027208,
          0.399604
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
          0.182589,
          -0.380575,
          -0.654907,
          0.626834
        ],
        "RightForeArm": [
          -0.472885,
          0.073014,
          -0.030269,
          0.877572
        ],
        "RightHand": [
          0.415226,
          -0.762782,
          -0.171254,
          0.465212
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
          0.349466,
          -0.521502,
          -0.241934,
          0.739849
        ],
        "RightForeArm": [
          -0.661875,
          0.125636,
          0.333354,
          0.659554
        ],
        "RightHand": [
          -0.072939,
          -0.473886,
          -0.581069,
          0.657626
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
          0.423597,
          -0.582368,
          -0.07759,
          0.689487
        ],
        "RightForeArm": [
          -0.733276,
          0.088581,
          0.414599,
          0.531571
        ],
        "RightHand": [
          -0.29011,
          -0.305583,
          -0.506352,
          0.752372
        ]
      }
    }
  ]
};

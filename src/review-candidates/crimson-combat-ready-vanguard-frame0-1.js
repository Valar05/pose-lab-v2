export const CRIMSON_COMBAT_READY_VANGUARD_FRAME0_1_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "id": "crimson-combat-ready-vanguard-frame0-1",
  "label": "Crimson combat-ready frame zero from Vanguard bind-to-frame transfer",
  "primeKeys": {
    "start": 0
  },
  "source": {
    "character": "crimson",
    "sourceCharacter": "vanguard",
    "clip": "SwordAttack1",
    "duration": 0,
    "vanguardReference": "public/assets/crimson/vanguard_swordattack1_reference.json",
    "savedWeaponBaseline": "public/assets/crimson/crimson_light_attack1_weapon_baseline.json",
    "sharedRestBaseline": "public/assets/crimson/crimson_shared_rest_baseline.json",
    "sharedRestBaselineSha256": "f71d0c9ddaf86484a9e1b9683c7a8b9aa4d84647107236d0a831ecaf2546d09b",
    "previousReviewCandidate": "crimson-light-attack1-vanguard-4",
    "method": "Vanguard-bind-to-authored-frame-zero-world-delta transfer plus limb-chain reconciliation",
    "policy": {
      "role": "frame-zero-only visual candidate; never animation acceptance",
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
        "LeftToeBase",
        "RightUpLeg",
        "RightLeg",
        "RightFoot",
        "RightToeBase",
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
      "rollRestoration": "absolute Vanguard bind-to-frame-zero world deltas mapped through source and target body bases before chain solve",
      "footPlanting": "leg IK pins each ankle to calibrated rest height; foot world orientation is restored after every solve; heel, toe, penetration, and sole-up metrics are recorded per frame",
      "bladeReadability": "Vanguard frame-zero blade direction is mapped without a hard-coded screen-angle substitute; only RightHand receives bounded alignment"
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
    "crimsonCombatReadyFrameZero1": {
      "status": "REVIEW_REQUIRED",
      "thresholds": {
        "maxContactBladeAngleDeg": 9,
        "maxChainError": 0.24,
        "maxFootOrientationErrorDeg": 0.25,
        "maxContactHeightError": 0.015,
        "minSoleUpDot": 0.999,
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
      "startFromSavedBaselineTravel": {
        "Hips": 63.719,
        "Spine02": 38.427,
        "Spine": 0.136,
        "RightArm": 129.332,
        "RightForeArm": 142.013,
        "RightHand": 87.069,
        "LeftArm": 72.029,
        "LeftForeArm": 57.649,
        "LeftHand": 30.189
      },
      "maxChainError": 0.03282,
      "report": [
        {
          "label": "start",
          "sourceTime": 0,
          "hiltWorld": [
            -0.18398,
            1.40174,
            0.16347
          ],
          "rightHandWorld": [
            -0.04655,
            1.52158,
            0.11579
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0.07005,
            -0.99754,
            0.00221
          ],
          "actualBladeDirectionWorld": [
            0.07005,
            -0.99754,
            0.00221
          ],
          "bladeAngleErrorDeg": 0,
          "chains": [
            {
              "chain": "rightArm",
              "targetMid": [
                -0.16283,
                1.35261,
                0.0048
              ],
              "actualMid": [
                -0.16283,
                1.35261,
                0.0048
              ],
              "targetEnd": [
                -0.04655,
                1.52158,
                0.11579
              ],
              "actualEnd": [
                -0.04655,
                1.52158,
                0.11579
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 85.535,
              "lowerRotationDeg": 53.221
            },
            {
              "chain": "leftArm",
              "targetMid": [
                -0.11035,
                1.43277,
                0.40944
              ],
              "actualMid": [
                -0.11035,
                1.43277,
                0.40944
              ],
              "targetEnd": [
                -0.27368,
                1.59188,
                0.41717
              ],
              "actualEnd": [
                -0.27368,
                1.59188,
                0.41717
              ],
              "midError": 0,
              "endError": 0,
              "upperRotationDeg": 54.237,
              "lowerRotationDeg": 45.615
            },
            {
              "chain": "rightLeg",
              "targetMid": [
                -0.09774,
                0.56098,
                0.16454
              ],
              "actualMid": [
                -0.0856,
                0.55131,
                0.13562
              ],
              "targetEnd": [
                -0.11061,
                0.16146,
                0.14688
              ],
              "actualEnd": [
                -0.11061,
                0.16146,
                0.14688
              ],
              "midError": 0.03282,
              "endError": 0,
              "upperRotationDeg": 17.933,
              "lowerRotationDeg": 10.65
            },
            {
              "chain": "leftLeg",
              "targetMid": [
                0.06834,
                0.54844,
                0.26488
              ],
              "actualMid": [
                0.06352,
                0.54739,
                0.25689
              ],
              "targetEnd": [
                0.04566,
                0.16146,
                0.22722
              ],
              "actualEnd": [
                0.04566,
                0.16146,
                0.22722
              ],
              "midError": 0.00939,
              "endError": 0,
              "upperRotationDeg": 3.831,
              "lowerRotationDeg": 12.112
            }
          ],
          "rollClampReport": [],
          "absoluteSourcePose": [
            {
              "name": "Hips",
              "sourceName": "hips",
              "worldDeltaDeg": 63.718
            },
            {
              "name": "Spine02",
              "sourceName": "chest",
              "worldDeltaDeg": 102.064
            },
            {
              "name": "Spine01",
              "sourceName": "spine",
              "worldDeltaDeg": 83.421
            },
            {
              "name": "Spine",
              "sourceName": "spine",
              "worldDeltaDeg": 83.421
            },
            {
              "name": "neck",
              "sourceName": "neck",
              "worldDeltaDeg": 91.393
            },
            {
              "name": "Head",
              "sourceName": "head",
              "worldDeltaDeg": 81.52
            },
            {
              "name": "LeftUpLeg",
              "sourceName": "thigh.fk.L",
              "worldDeltaDeg": 63.719
            },
            {
              "name": "LeftLeg",
              "sourceName": "shin.fk.L",
              "worldDeltaDeg": 63.718
            },
            {
              "name": "LeftFoot",
              "sourceName": "foot.fk.L",
              "worldDeltaDeg": 63.718
            },
            {
              "name": "RightUpLeg",
              "sourceName": "thigh.fk.R",
              "worldDeltaDeg": 63.718
            },
            {
              "name": "RightLeg",
              "sourceName": "shin.fk.R",
              "worldDeltaDeg": 63.718
            },
            {
              "name": "RightFoot",
              "sourceName": "foot.fk.R",
              "worldDeltaDeg": 63.718
            },
            {
              "name": "LeftShoulder",
              "sourceName": "shoulder.L",
              "worldDeltaDeg": 130.888
            },
            {
              "name": "LeftArm",
              "sourceName": "upper_arm.fk.L",
              "worldDeltaDeg": 160.388
            },
            {
              "name": "LeftForeArm",
              "sourceName": "forearm.fk.L",
              "worldDeltaDeg": 110.018
            },
            {
              "name": "LeftHand",
              "sourceName": "hand.fk.L",
              "worldDeltaDeg": 120.079
            },
            {
              "name": "RightShoulder",
              "sourceName": "shoulder.R",
              "worldDeltaDeg": 109.889
            },
            {
              "name": "RightArm",
              "sourceName": "upper_arm.fk.R",
              "worldDeltaDeg": 106.883
            },
            {
              "name": "RightForeArm",
              "sourceName": "forearm.fk.R",
              "worldDeltaDeg": 72.99
            },
            {
              "name": "RightHand",
              "sourceName": "hand.fk.R",
              "worldDeltaDeg": 109.141
            }
          ],
          "rightHandBladeCorrectionDeg": 52.955,
          "rightHandBladeCorrectionFromAbsoluteDeg": 52.955,
          "feet": {
            "left": {
              "heelWorld": [
                0.0423,
                0,
                0.20559
              ],
              "toeWorld": [
                0.06094,
                0,
                0.32557
              ],
              "heelGroundError": 0,
              "toeGroundError": 0,
              "minGroundClearance": 0,
              "soleNormalWorld": [
                0,
                1,
                0
              ],
              "soleUpDot": 1,
              "orientationErrorDeg": 0
            },
            "right": {
              "heelWorld": [
                -0.10687,
                0,
                0.12537
              ],
              "toeWorld": [
                -0.12765,
                0,
                0.24466
              ],
              "heelGroundError": 0,
              "toeGroundError": 0,
              "minGroundClearance": 0,
              "soleNormalWorld": [
                0.00001,
                1,
                0
              ],
              "soleUpDot": 1,
              "orientationErrorDeg": 0
            }
          }
        }
      ],
      "guardFailures": [],
      "note": "Frame zero is reject-only until Blender and runtime pixels visibly reproduce Vanguard combat readiness. Metrics cannot promote it."
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
          0.092439,
          -0.501444,
          0.112117,
          0.8529
        ],
        "Spine02": [
          -0.20531,
          -0.340927,
          0.040043,
          0.916522
        ],
        "Spine01": [
          0.10639,
          0.50452,
          0.099057,
          0.851075
        ],
        "Spine": [
          -0.106978,
          -0.004,
          0.00345,
          0.994247
        ],
        "neck": [
          -0.000695,
          -0.407328,
          -0.139439,
          0.902574
        ],
        "Head": [
          0.103325,
          0.087137,
          0.048008,
          0.98966
        ],
        "LeftUpLeg": [
          0.990197,
          -0.00549,
          -0.036951,
          0.134587
        ],
        "LeftLeg": [
          0.000182,
          0.025026,
          0.09355,
          0.9953
        ],
        "LeftFoot": [
          -0.290831,
          -0.492712,
          -0.236237,
          0.785394
        ],
        "LeftToeBase": [
          -0.428426,
          -0.033069,
          -0.015693,
          0.902835
        ],
        "RightUpLeg": [
          0.96683,
          0.02661,
          0.059307,
          0.247009
        ],
        "RightLeg": [
          0.071861,
          -0.037972,
          0.069566,
          0.994261
        ],
        "RightFoot": [
          -0.274188,
          -0.467432,
          -0.160666,
          0.824933
        ],
        "RightToeBase": [
          -0.428647,
          0.037052,
          0.017598,
          0.902541
        ],
        "LeftShoulder": [
          -0.76107,
          -0.019038,
          0.090939,
          -0.641982
        ],
        "LeftArm": [
          0.018459,
          0.731762,
          -0.161971,
          0.661777
        ],
        "LeftForeArm": [
          0.260649,
          -0.124811,
          0.418224,
          -0.861146
        ],
        "LeftHand": [
          -0.083363,
          -0.040777,
          0.143557,
          -0.985281
        ],
        "RightShoulder": [
          0.041675,
          -0.764391,
          0.628992,
          0.135419
        ],
        "RightArm": [
          0.514573,
          0.307137,
          -0.763078,
          0.24206
        ],
        "RightForeArm": [
          -0.344723,
          -0.535519,
          -0.679711,
          0.363837
        ],
        "RightHand": [
          0.249404,
          -0.334401,
          -0.67333,
          0.61041
        ]
      }
    }
  ]
};

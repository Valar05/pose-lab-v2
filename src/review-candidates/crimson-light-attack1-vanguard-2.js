export const CRIMSON_LIGHT_ATTACK1_VANGUARD_2_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "id": "crimson-light-attack1-vanguard-2",
  "label": "Crimson light attack 1 from saved weapon baseline and Vanguard timing",
  "primeKeys": {
    "start": 0,
    "anticipation": 0.183333,
    "contact": 0.383333,
    "contactHold": 0.5,
    "followThrough": 0.633333,
    "end": 0.633333
  },
  "source": {
    "character": "crimson",
    "clip": "SwordAttack1",
    "duration": 0.633333,
    "vanguardReference": "public/assets/crimson/vanguard_swordattack1_reference.json",
    "savedWeaponBaseline": "public/assets/crimson/crimson_light_attack1_weapon_baseline.json",
    "previousFailedCandidate": "crimson-light-attack1-vanguard-1",
    "method": "saved-weapon-baseline-full-body-authored-crimson-attack-with-vanguard-timing",
    "policy": {
      "role": "quarantined review candidate, not accepted repo truth",
      "forbiddenUse": "Do not copy Vanguard Weapon.R transforms directly into Crimson as accepted sword orientation.",
      "rootMotion": "Vanguard root motion is preserved in sidecar data and not applied in Pose Lab.",
      "weaponTruth": "SaberGrip and Arborblade local transforms are copied from the saved user sabre-transform export and are invariant across frames."
    },
    "authoredBones": [
      "Hips",
      "Spine02",
      "Spine01",
      "Spine",
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
    "savedWeapon": {
      "saberRootWorld": {
        "position": [
          -0.45401,
          0.881,
          0.1536
        ],
        "rotationDeg": [
          2.581,
          3.698,
          -131.729
        ],
        "scale": [
          0.90588,
          0.90588,
          0.90588
        ],
        "uniformScale": 0.90588
      },
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
    "crimsonLightAttack1V2": {
      "status": "PASS",
      "thresholds": {
        "baselineSwordLocalExact": true,
        "contactBladeForwardAngleDeg": 7,
        "weaponLocalInvariant": true,
        "bodyTravelDeg": {
          "Hips": 14,
          "Spine02": 22,
          "RightArm": 40,
          "RightForeArm": 30,
          "RightHand": 20,
          "LeftArm": 28,
          "LeftUpLeg": 6,
          "RightUpLeg": 8
        }
      },
      "bodyTravelDeg": {
        "Hips": 26.444,
        "Spine02": 33.26,
        "Spine01": 24.233,
        "Spine": 17.095,
        "LeftUpLeg": 12.448,
        "LeftLeg": 12.164,
        "LeftFoot": 6.706,
        "RightUpLeg": 18.155,
        "RightLeg": 17.261,
        "RightFoot": 7.808,
        "LeftShoulder": 21.913,
        "LeftArm": 50.981,
        "LeftForeArm": 21.003,
        "LeftHand": 15.609,
        "RightShoulder": 17.527,
        "RightArm": 65.725,
        "RightForeArm": 43.689,
        "RightHand": 110.591
      },
      "report": [
        {
          "label": "start",
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
          "desiredBladeDirectionWorld": null,
          "actualBladeDirectionWorld": [
            0.0645,
            -0.04494,
            0.99691
          ],
          "bladeAngleErrorDeg": null,
          "time": 0,
          "rightHandSolveRotationDeg": 0
        },
        {
          "label": "anticipation",
          "hiltWorld": [
            -0.53385,
            1.00238,
            -0.08704
          ],
          "rightHandWorld": [
            -0.4045,
            1.12479,
            -0.14874
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            -0.54962,
            0.09993,
            0.82942
          ],
          "actualBladeDirectionWorld": [
            -0.54946,
            0.09992,
            0.82952
          ],
          "bladeAngleErrorDeg": 0.011,
          "time": 0.183333,
          "rightHandSolveRotationDeg": 87.701
        },
        {
          "label": "contact",
          "hiltWorld": [
            -0.4074,
            1.43872,
            0.62931
          ],
          "rightHandWorld": [
            -0.25859,
            1.40315,
            0.51926
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0,
            0,
            1
          ],
          "actualBladeDirectionWorld": [
            0.00012,
            -0.0004,
            1
          ],
          "bladeAngleErrorDeg": 0.024,
          "time": 0.383333,
          "rightHandSolveRotationDeg": 76.691
        },
        {
          "label": "contactHold",
          "hiltWorld": [
            -0.35557,
            1.43274,
            0.66339
          ],
          "rightHandWorld": [
            -0.21542,
            1.39691,
            0.54258
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0.07002,
            -0.02001,
            0.99734
          ],
          "actualBladeDirectionWorld": [
            0.06959,
            -0.0201,
            0.99737
          ],
          "bladeAngleErrorDeg": 0.025,
          "time": 0.5,
          "rightHandSolveRotationDeg": 77.364
        },
        {
          "label": "followThrough",
          "hiltWorld": [
            -0.19699,
            1.26539,
            0.72133
          ],
          "rightHandWorld": [
            -0.13,
            1.37653,
            0.58465
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": [
            0.33986,
            -0.03998,
            0.93962
          ],
          "actualBladeDirectionWorld": [
            0.34025,
            -0.0396,
            0.9395
          ],
          "bladeAngleErrorDeg": 0.032,
          "time": 0.633333,
          "rightHandSolveRotationDeg": 98.923
        },
        {
          "label": "end",
          "hiltWorld": [
            -0.42432,
            0.85132,
            0.28041
          ],
          "rightHandWorld": [
            -0.46682,
            1.01531,
            0.19782
          ],
          "hiltToRightHandDistance": 0.18847,
          "desiredBladeDirectionWorld": null,
          "actualBladeDirectionWorld": [
            0.50105,
            -0.1086,
            0.85858
          ],
          "bladeAngleErrorDeg": null,
          "time": 0.633333,
          "rightHandSolveRotationDeg": 0
        }
      ],
      "note": "Guardrail only: proves saved weapon baseline, invariant local weapon transforms, and minimum full-body bone travel before cloud visual review."
    }
  },
  "frames": [
    {
      "time": 0,
      "label": "start",
      "note": "Saved user weapon/pose baseline. This is not raw Crimson rest.",
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
      "time": 0.183333,
      "label": "anticipation",
      "note": "Full-body windup from saved baseline: weight shifts, hips coil, off hand counterbalances, blade draws back.",
      "bones": {
        "Hips": [
          0.121391,
          -0.115299,
          -0.021605,
          0.985649
        ],
        "Spine02": [
          -0.281272,
          -0.174047,
          0.058058,
          0.941925
        ],
        "Spine01": [
          -0.046645,
          -0.129225,
          0.03162,
          0.990013
        ],
        "Spine": [
          -0.133729,
          -0.088134,
          0.032143,
          0.986568
        ],
        "LeftUpLeg": [
          0.991103,
          0.082041,
          -0.090002,
          0.053699
        ],
        "LeftLeg": [
          -0.02517,
          0.03027,
          0.044133,
          0.99825
        ],
        "LeftFoot": [
          -0.363181,
          -0.034408,
          -0.023646,
          0.930783
        ],
        "RightUpLeg": [
          0.959163,
          -0.116813,
          0.155237,
          0.205578
        ],
        "RightLeg": [
          0.193665,
          -0.030548,
          -0.036188,
          0.979924
        ],
        "RightFoot": [
          -0.437821,
          0.048739,
          0.045498,
          0.896586
        ],
        "LeftShoulder": [
          0.517051,
          0.557333,
          -0.4665,
          0.452124
        ],
        "LeftArm": [
          0.625897,
          0.250957,
          0.08874,
          0.733074
        ],
        "LeftForeArm": [
          -0.006665,
          -0.187312,
          -0.056222,
          0.980667
        ],
        "LeftHand": [
          0.019441,
          0.128113,
          0.20925,
          0.969239
        ],
        "RightShoulder": [
          0.545441,
          -0.537503,
          0.490633,
          0.41577
        ],
        "RightArm": [
          0.323211,
          -0.133249,
          -0.445077,
          0.824431
        ],
        "RightForeArm": [
          -0.494501,
          0.23759,
          0.116128,
          0.82797
        ],
        "RightHand": [
          0.190599,
          -0.800872,
          -0.09971,
          0.558869
        ]
      }
    },
    {
      "time": 0.383333,
      "label": "contact",
      "note": "Whole-body cut: hips and spine unwind, legs brace, right hand carries the saved Arborblade forward.",
      "bones": {
        "Hips": [
          0.160742,
          0.1694,
          0.078367,
          0.969187
        ],
        "Spine02": [
          -0.337947,
          0.141343,
          -0.126306,
          0.921879
        ],
        "Spine01": [
          -0.090895,
          0.126935,
          -0.045838,
          0.986673
        ],
        "Spine": [
          -0.160633,
          0.07771,
          -0.036374,
          0.983278
        ],
        "LeftUpLeg": [
          0.98241,
          -0.012285,
          0.0215,
          0.185088
        ],
        "LeftLeg": [
          0.164414,
          0.038691,
          -0.00528,
          0.985618
        ],
        "LeftFoot": [
          -0.452114,
          -0.009071,
          0.029467,
          0.891427
        ],
        "RightUpLeg": [
          0.999641,
          0.011183,
          0.01652,
          0.017907
        ],
        "RightLeg": [
          -0.06793,
          -0.02606,
          -0.001103,
          0.997349
        ],
        "RightFoot": [
          -0.360585,
          0.014321,
          -0.036941,
          0.931885
        ],
        "LeftShoulder": [
          0.553348,
          0.701588,
          -0.368599,
          0.256349
        ],
        "LeftArm": [
          0.2295,
          0.775219,
          0.237015,
          0.538693
        ],
        "LeftForeArm": [
          -0.07246,
          0.008853,
          0.067249,
          0.995062
        ],
        "LeftHand": [
          0.018115,
          0.009956,
          0.018217,
          0.99962
        ],
        "RightShoulder": [
          0.523416,
          -0.697723,
          0.35875,
          0.332441
        ],
        "RightArm": [
          0.000337,
          -0.763857,
          -0.287476,
          0.577824
        ],
        "RightForeArm": [
          -0.33751,
          -0.06987,
          0.032998,
          0.938145
        ],
        "RightHand": [
          0.563048,
          -0.112416,
          0.329441,
          0.749539
        ]
      }
    },
    {
      "time": 0.5,
      "label": "contactHold",
      "note": "Impact hold: same weapon truth, body still loaded through hips and legs.",
      "bones": {
        "Hips": [
          0.170586,
          0.192924,
          0.091964,
          0.961885
        ],
        "Spine02": [
          -0.346019,
          0.161842,
          -0.144425,
          0.912809
        ],
        "Spine01": [
          -0.09987,
          0.143731,
          -0.048516,
          0.983369
        ],
        "Spine": [
          -0.160873,
          0.094869,
          -0.039097,
          0.981627
        ],
        "LeftUpLeg": [
          0.980592,
          -0.018263,
          0.032319,
          0.192513
        ],
        "LeftLeg": [
          0.172999,
          0.039093,
          -0.005542,
          0.98413
        ],
        "LeftFoot": [
          -0.452114,
          -0.009071,
          0.029467,
          0.891427
        ],
        "RightUpLeg": [
          0.999848,
          0.0125,
          0.008949,
          0.008252
        ],
        "RightLeg": [
          -0.076619,
          -0.025594,
          -0.001361,
          0.996731
        ],
        "RightFoot": [
          -0.360585,
          0.014321,
          -0.036941,
          0.931885
        ],
        "LeftShoulder": [
          0.559103,
          0.706706,
          -0.357466,
          0.245334
        ],
        "LeftArm": [
          0.207991,
          0.782267,
          0.242439,
          0.53481
        ],
        "LeftForeArm": [
          -0.071674,
          0.01816,
          0.07529,
          0.994417
        ],
        "LeftHand": [
          0.019785,
          0.001393,
          0.018045,
          0.99964
        ],
        "RightShoulder": [
          0.529067,
          -0.703942,
          0.348534,
          0.321056
        ],
        "RightArm": [
          -0.003449,
          -0.782006,
          -0.300483,
          0.546045
        ],
        "RightForeArm": [
          -0.317848,
          -0.087575,
          0.025063,
          0.943756
        ],
        "RightHand": [
          0.589468,
          -0.067937,
          0.312441,
          0.741817
        ]
      }
    },
    {
      "time": 0.633333,
      "label": "followThrough",
      "note": "Follow-through: weight and torso continue past contact instead of snapping back to rest.",
      "bones": {
        "Hips": [
          0.151186,
          0.237243,
          0.086824,
          0.955678
        ],
        "Spine02": [
          -0.297539,
          0.213018,
          -0.156646,
          0.917364
        ],
        "Spine01": [
          -0.076712,
          0.187176,
          -0.056011,
          0.977723
        ],
        "Spine": [
          -0.145274,
          0.128699,
          -0.050653,
          0.979677
        ],
        "LeftUpLeg": [
          0.985113,
          -0.001009,
          0.044504,
          0.166046
        ],
        "LeftLeg": [
          0.147531,
          0.03659,
          0.00387,
          0.988373
        ],
        "LeftFoot": [
          -0.44422,
          -0.013234,
          0.022006,
          0.895549
        ],
        "RightUpLeg": [
          0.999386,
          -0.009874,
          -0.011038,
          0.031763
        ],
        "RightLeg": [
          -0.032887,
          -0.028192,
          -0.008788,
          0.999023
        ],
        "RightFoot": [
          -0.376655,
          0.016831,
          -0.02806,
          0.925775
        ],
        "LeftShoulder": [
          0.552183,
          0.721355,
          -0.350258,
          0.228166
        ],
        "LeftArm": [
          0.160804,
          0.786668,
          0.253967,
          0.539256
        ],
        "LeftForeArm": [
          -0.087646,
          0.02868,
          0.07936,
          0.992571
        ],
        "LeftHand": [
          0.021576,
          -0.006795,
          0.000425,
          0.999744
        ],
        "RightShoulder": [
          0.519478,
          -0.721905,
          0.331044,
          0.315287
        ],
        "RightArm": [
          0.042012,
          -0.813995,
          -0.335947,
          0.472004
        ],
        "RightForeArm": [
          -0.25275,
          -0.096712,
          0.015024,
          0.962569
        ],
        "RightHand": [
          0.620942,
          0.497797,
          0.010887,
          0.605401
        ]
      }
    },
    {
      "time": 0.633333,
      "label": "end",
      "note": "Settled recovery toward saved baseline, not raw bind/rest pose.",
      "bones": {
        "Hips": [
          0.133114,
          0.054838,
          0.024941,
          0.989268
        ],
        "Spine02": [
          -0.223572,
          0.022225,
          -0.040332,
          0.973599
        ],
        "Spine01": [
          -0.009025,
          0.034821,
          -0.009025,
          0.999312
        ],
        "Spine": [
          -0.107032,
          0.022028,
          0.000648,
          0.994011
        ],
        "LeftUpLeg": [
          0.988767,
          0.02024,
          -0.030965,
          0.144814
        ],
        "LeftLeg": [
          0.104903,
          0.033056,
          0.022582,
          0.993676
        ],
        "LeftFoot": [
          -0.412188,
          -0.024893,
          -0.000576,
          0.910759
        ],
        "RightUpLeg": [
          0.990835,
          -0.056155,
          0.073041,
          0.098785
        ],
        "RightLeg": [
          0.037356,
          -0.030521,
          -0.024152,
          0.998544
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
          0.401218,
          0.555092,
          0.227545,
          0.692185
        ],
        "LeftForeArm": [
          -0.133873,
          -0.082241,
          0.005455,
          0.987565
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
          0.381746,
          -0.561533,
          -0.259635,
          0.686689
        ],
        "RightForeArm": [
          -0.199513,
          0.102163,
          0.029262,
          0.974116
        ],
        "RightHand": [
          0.037282,
          -0.100795,
          -0.117858,
          0.987198
        ]
      }
    }
  ]
};

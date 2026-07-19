export const CRIMSON_LIGHT_ATTACK1_VANGUARD_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "id": "crimson-light-attack1-vanguard-1",
  "label": "Crimson light attack 1 from Vanguard SwordAttack1",
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
    "sourceGlb": "public/assets/vanguard/vanguard_rigged_animations.glb",
    "crimson": "./assets/crimson/crimson_plume_knight_rigged_pbr.glb",
    "sabre": "./assets/crimson/arborblade_sword.glb",
    "method": "vanguard-timed-crimson-authored-fk-with-bounded-blade-roll-restoration",
    "policy": {
      "role": "quarantined review candidate, not accepted repo truth",
      "forbiddenUse": "Do not copy Vanguard Weapon.R transforms directly into Crimson as accepted sword orientation.",
      "rootMotion": "Vanguard root motion is preserved in sidecar data and not applied in Pose Lab."
    },
    "authoredBones": [
      "Hips",
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
      "RightHand"
    ],
    "preservedSocket": {
      "saberGripLocal": {
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
      "swordLocal": {
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
    "crimsonLightAttack1": {
      "status": "PASS",
      "thresholds": {
        "contactBladeForwardAngleDeg": 7,
        "allBladeTargetAngleDeg": 13,
        "contactHiltTravelMin": 0.005,
        "authoredRightHandTravelMinDeg": 8
      },
      "report": [
        {
          "label": "start",
          "hiltWorld": [
            -0.41306,
            0.81406,
            0.15422
          ],
          "desiredBladeDirectionWorld": [
            0,
            0,
            1
          ],
          "actualBladeDirectionWorld": [
            -0.00031,
            -0.00007,
            1
          ],
          "bladeAngleErrorDeg": 0.018,
          "time": 0,
          "rightHandSolveRotationDeg": 4.716,
          "rollRestoration": {
            "method": "bounded local-axis right-hand solve after body FK; restores blade roll against desired world direction while preserving SaberGrip and Arborblade local transforms",
            "input": "Vanguard SwordAttack1 timing plus frame intent; no direct Weapon.R quaternion copy"
          },
          "hiltTravelFromStart": 0
        },
        {
          "label": "anticipation",
          "hiltWorld": [
            -0.45549,
            1.22949,
            0.17321
          ],
          "desiredBladeDirectionWorld": [
            -0.72011,
            0.18003,
            0.6701
          ],
          "actualBladeDirectionWorld": [
            -0.72005,
            0.18041,
            0.67006
          ],
          "bladeAngleErrorDeg": 0.022,
          "time": 0.183333,
          "rightHandSolveRotationDeg": 127.736,
          "rollRestoration": {
            "method": "bounded local-axis right-hand solve after body FK; restores blade roll against desired world direction while preserving SaberGrip and Arborblade local transforms",
            "input": "Vanguard SwordAttack1 timing plus frame intent; no direct Weapon.R quaternion copy"
          },
          "hiltTravelFromStart": 0.41802
        },
        {
          "label": "contact",
          "hiltWorld": [
            -0.47643,
            1.18234,
            0.46636
          ],
          "desiredBladeDirectionWorld": [
            0,
            0,
            1
          ],
          "actualBladeDirectionWorld": [
            0.00039,
            0.00012,
            1
          ],
          "bladeAngleErrorDeg": 0.024,
          "time": 0.383333,
          "rightHandSolveRotationDeg": 84.438,
          "rollRestoration": {
            "method": "bounded local-axis right-hand solve after body FK; restores blade roll against desired world direction while preserving SaberGrip and Arborblade local transforms",
            "input": "Vanguard SwordAttack1 timing plus frame intent; no direct Weapon.R quaternion copy"
          },
          "hiltTravelFromStart": 0.48691
        },
        {
          "label": "contactHold",
          "hiltWorld": [
            -0.51664,
            1.24857,
            0.49617
          ],
          "desiredBladeDirectionWorld": [
            0.08003,
            -0.03001,
            0.99634
          ],
          "actualBladeDirectionWorld": [
            0.07966,
            -0.03061,
            0.99635
          ],
          "bladeAngleErrorDeg": 0.04,
          "time": 0.5,
          "rightHandSolveRotationDeg": 71.108,
          "rollRestoration": {
            "method": "bounded local-axis right-hand solve after body FK; restores blade roll against desired world direction while preserving SaberGrip and Arborblade local transforms",
            "input": "Vanguard SwordAttack1 timing plus frame intent; no direct Weapon.R quaternion copy"
          },
          "hiltTravelFromStart": 0.56255
        },
        {
          "label": "followThrough",
          "hiltWorld": [
            -0.34842,
            1.1443,
            0.55313
          ],
          "desiredBladeDirectionWorld": [
            0.46013,
            -0.08002,
            0.88424
          ],
          "actualBladeDirectionWorld": [
            0.4603,
            -0.07963,
            0.88419
          ],
          "bladeAngleErrorDeg": 0.025,
          "time": 0.633333,
          "rightHandSolveRotationDeg": 88.986,
          "rollRestoration": {
            "method": "bounded local-axis right-hand solve after body FK; restores blade roll against desired world direction while preserving SaberGrip and Arborblade local transforms",
            "input": "Vanguard SwordAttack1 timing plus frame intent; no direct Weapon.R quaternion copy"
          },
          "hiltTravelFromStart": 0.52189
        },
        {
          "label": "end",
          "hiltWorld": [
            -0.41306,
            0.81406,
            0.15422
          ],
          "desiredBladeDirectionWorld": [
            0,
            0,
            1
          ],
          "actualBladeDirectionWorld": [
            -0.00031,
            -0.00007,
            1
          ],
          "bladeAngleErrorDeg": 0.018,
          "time": 0.633333,
          "rightHandSolveRotationDeg": 4.716,
          "rollRestoration": {
            "method": "bounded local-axis right-hand solve after body FK; restores blade roll against desired world direction while preserving SaberGrip and Arborblade local transforms",
            "input": "Vanguard SwordAttack1 timing plus frame intent; no direct Weapon.R quaternion copy"
          },
          "hiltTravelFromStart": 0
        }
      ],
      "note": "This guard checks generated Crimson pose data and real Arborblade blade axis. It is a diagnostic guardrail, not cloud visual acceptance."
    }
  },
  "frames": [
    {
      "time": 0,
      "label": "start",
      "note": "Crimson rest endpoint; Arborblade socket preserved.",
      "bones": {
        "Hips": [
          0.133903,
          0.02028,
          0.02028,
          0.990579
        ],
        "Spine02": [
          -0.207511,
          -0.018709,
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
          -0.004004,
          0.003446,
          0.994247
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
          0.011527,
          0.07767,
          0.106335,
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
          0.043089,
          -0.060279,
          -0.121205,
          0.989858
        ]
      }
    },
    {
      "time": 0.183333,
      "label": "anticipation",
      "note": "Vanguard-timed backswing: torso coils, elbow bends, blade trails before the cut.",
      "bones": {
        "Hips": [
          0.134891,
          -0.040231,
          0.012068,
          0.98997
        ],
        "Spine02": [
          -0.278264,
          -0.129294,
          0.027329,
          0.95137
        ],
        "Spine01": [
          -0.044212,
          -0.08669,
          0.012487,
          0.995175
        ],
        "Spine": [
          -0.123775,
          -0.073268,
          0.012039,
          0.989528
        ],
        "LeftShoulder": [
          0.529324,
          0.575935,
          -0.453678,
          0.426956
        ],
        "LeftArm": [
          0.624745,
          0.298288,
          0.137005,
          0.708483
        ],
        "LeftForeArm": [
          0.009313,
          -0.168798,
          -0.056271,
          0.983999
        ],
        "LeftHand": [
          0.018253,
          0.07637,
          0.192321,
          0.978186
        ],
        "RightShoulder": [
          0.547231,
          -0.552459,
          0.479846,
          0.406294
        ],
        "RightArm": [
          0.307231,
          -0.143983,
          -0.460021,
          0.820523
        ],
        "RightForeArm": [
          -0.512719,
          0.242516,
          0.091983,
          0.81844
        ],
        "RightHand": [
          0.908242,
          0.028694,
          0.018863,
          0.417035
        ]
      }
    },
    {
      "time": 0.383333,
      "label": "contact",
      "note": "Contact frame: right wrist drives the accepted Arborblade hilt forward; blade axis points world +Z.",
      "bones": {
        "Hips": [
          0.133114,
          0.054838,
          0.024941,
          0.989268
        ],
        "Spine02": [
          -0.331633,
          0.057819,
          -0.077549,
          0.938436
        ],
        "Spine01": [
          -0.088041,
          0.059289,
          -0.022673,
          0.994092
        ],
        "Spine": [
          -0.141901,
          0.029191,
          -0.010274,
          0.989397
        ],
        "LeftShoulder": [
          0.552033,
          0.660133,
          -0.401271,
          0.313792
        ],
        "LeftArm": [
          0.284145,
          0.737726,
          0.240468,
          0.563202
        ],
        "LeftForeArm": [
          -0.074462,
          -0.027172,
          0.052389,
          0.995476
        ],
        "LeftHand": [
          0.006081,
          0.078285,
          0.036932,
          0.996228
        ],
        "RightShoulder": [
          0.525409,
          -0.673038,
          0.386179,
          0.349042
        ],
        "RightArm": [
          0.048261,
          -0.728107,
          -0.284494,
          0.621768
        ],
        "RightForeArm": [
          -0.341756,
          -0.047878,
          0.043349,
          0.937567
        ],
        "RightHand": [
          0.557486,
          0.336369,
          -0.053221,
          0.757122
        ]
      }
    },
    {
      "time": 0.5,
      "label": "contactHold",
      "note": "Held impact: blade remains forward with slight follow-through pressure.",
      "bones": {
        "Hips": [
          0.132658,
          0.072095,
          0.02726,
          0.98816
        ],
        "Spine02": [
          -0.347984,
          0.070572,
          -0.093211,
          0.930182
        ],
        "Spine01": [
          -0.09681,
          0.067756,
          -0.024015,
          0.992704
        ],
        "Spine": [
          -0.150579,
          0.037664,
          -0.011909,
          0.987808
        ],
        "LeftShoulder": [
          0.555366,
          0.663026,
          -0.396143,
          0.308279
        ],
        "LeftArm": [
          0.270556,
          0.748055,
          0.244297,
          0.554556
        ],
        "LeftForeArm": [
          -0.074005,
          -0.018483,
          0.051766,
          0.995742
        ],
        "LeftHand": [
          0.006081,
          0.078285,
          0.036932,
          0.996228
        ],
        "RightShoulder": [
          0.531628,
          -0.679482,
          0.376154,
          0.337911
        ],
        "RightArm": [
          0.024556,
          -0.746889,
          -0.285471,
          0.60005
        ],
        "RightForeArm": [
          -0.321983,
          -0.06867,
          0.02756,
          0.943849
        ],
        "RightHand": [
          0.487293,
          0.200892,
          0.122846,
          0.840891
        ]
      }
    },
    {
      "time": 0.633333,
      "label": "followThrough",
      "note": "Follow-through clamps at Vanguard clip end; no root motion is applied.",
      "bones": {
        "Hips": [
          0.131626,
          0.106538,
          0.031873,
          0.985042
        ],
        "Spine02": [
          -0.306847,
          0.111098,
          -0.109983,
          0.938832
        ],
        "Spine01": [
          -0.07224,
          0.111074,
          -0.033839,
          0.990605
        ],
        "Spine": [
          -0.134086,
          0.071352,
          -0.024351,
          0.988098
        ],
        "LeftShoulder": [
          0.553305,
          0.681161,
          -0.385613,
          0.284915
        ],
        "LeftArm": [
          0.220951,
          0.759111,
          0.261709,
          0.553571
        ],
        "LeftForeArm": [
          -0.089462,
          0.009816,
          0.063605,
          0.993909
        ],
        "LeftHand": [
          0.004714,
          0.078379,
          0.019539,
          0.996721
        ],
        "RightShoulder": [
          0.517307,
          -0.702264,
          0.361638,
          0.329298
        ],
        "RightArm": [
          0.053265,
          -0.790951,
          -0.319825,
          0.518914
        ],
        "RightForeArm": [
          -0.255887,
          -0.080199,
          0.010385,
          0.963318
        ],
        "RightHand": [
          0.338346,
          0.546843,
          -0.181756,
          0.743942
        ]
      }
    },
    {
      "time": 0.633333,
      "label": "end",
      "note": "Endpoint returns to Crimson rest; game root motion remains sidecar-only.",
      "bones": {
        "Hips": [
          0.133903,
          0.02028,
          0.02028,
          0.990579
        ],
        "Spine02": [
          -0.207511,
          -0.018709,
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
          -0.004004,
          0.003446,
          0.994247
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
          0.011527,
          0.07767,
          0.106335,
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
          0.043089,
          -0.060279,
          -0.121205,
          0.989858
        ]
      }
    }
  ]
};

export const ATTACK2_POSE_SEQUENCE = {
  "schema": "pose-lab-v2-attack-candidate-v1",
  "label": "Attack2 candidate 1",
  "source": {
    "fps": "../pose-lab/assets/models/FPSPlayer.glb",
    "meshy": "./public/assets/meshy/meshy_apose_walking_with_skin.glb",
    "clip": "OneHandAttack2",
    "duration": 1.15,
    "keyCount": 8,
    "method": "meshy-combo-backhand-from-attack1-contact-profile",
    "baseCandidate": "attack1-candidate-1",
    "comboStart": "attack1.contactHold",
    "retargetedBones": [],
    "authoredRule": "Attack2 starts from Attack1 contactHold and reverses into a left-to-right backhand slash; wrist/forearm twist preserve edge alignment.",
    "generatedBones": {
      "start": "attack1.contactHold",
      "backhandPrep": "slerp(attack1.contactHold, attack1.anticipationHold, 0.22) + forearm/hand edge twist",
      "prepHold": "duplicate(backhandPrep)",
      "contact": "attack1.anticipationHold + stronger forearm/hand edge twist",
      "contactHold": "duplicate(contact)",
      "followThrough": "slerp(contact, ready, 0.2) + partial edge twist",
      "recoil": "slerp(followThrough, ready, 0.58)",
      "end": "ready"
    }
  },
  "primeKeys": {
    "start": 0,
    "backhandPrep": 0.14,
    "prepHold": 0.24,
    "contact": 0.36,
    "contactHold": 0.48,
    "followThrough": 0.7,
    "recoil": 0.92,
    "end": 1.15
  },
  "guardReport": {
    "comboContract": {
      "status": "PASS",
      "startMatchesAttack1ContactHold": true,
      "noReadyResetAtStart": true,
      "keyCount": 8,
      "rule": "Attack2 is a combo continuation, not a standalone Ready attack."
    }
  },
  "frames": [
    {
      "time": 0,
      "label": "start",
      "note": "combo start: exact Attack1 contactHold, no Ready reset",
      "generated": false,
      "bones": {
        "Spine02": [
          -0.369923,
          -0.032504,
          0.083378,
          0.924742
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
          -0.348211,
          -0.80149,
          0.141502,
          -0.465123
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
          0.463915,
          -0.355768,
          -0.697378,
          0.414579
        ],
        "RightForeArm": [
          -0.543052,
          -0.505096,
          -0.289738,
          0.604999
        ],
        "RightHand": [
          0.126043,
          0.905519,
          -0.06231,
          0.400332
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
      "time": 0.14,
      "label": "backhandPrep",
      "note": "small backhand load from Attack1 contact; blade stays left before rightward slash",
      "generated": true,
      "bones": {
        "Spine02": [
          -0.305164,
          -0.025022,
          0.067243,
          0.949593
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
          -0.311553,
          -0.768715,
          -0.02158,
          -0.558164
        ],
        "LeftForeArm": [
          -0.531979,
          0.280166,
          0.344541,
          0.720969
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
          0.507103,
          -0.340356,
          -0.646,
          0.457917
        ],
        "RightForeArm": [
          -0.552639,
          -0.562461,
          -0.103805,
          0.606178
        ],
        "RightHand": [
          0.194989,
          0.708708,
          -0.404146,
          0.544407
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
      "time": 0.24,
      "label": "prepHold",
      "note": "read hold for the backhand chamber",
      "generated": true,
      "bones": {
        "Spine02": [
          -0.305164,
          -0.025022,
          0.067243,
          0.949593
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
          -0.311553,
          -0.768715,
          -0.02158,
          -0.558164
        ],
        "LeftForeArm": [
          -0.531979,
          0.280166,
          0.344541,
          0.720969
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
          0.507103,
          -0.340356,
          -0.646,
          0.457917
        ],
        "RightForeArm": [
          -0.552639,
          -0.562461,
          -0.103805,
          0.606178
        ],
        "RightHand": [
          0.194989,
          0.708708,
          -0.404146,
          0.544407
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
      "time": 0.36,
      "label": "contact",
      "note": "rightward backhand slash contact with wrist twist for edge alignment",
      "generated": true,
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
          -0.579859,
          0.274347,
          0.40318,
          0.652643
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
          0.441779,
          0.282799,
          -0.680677,
          -0.511405
        ],
        "RightHand": [
          0.297419,
          -0.187518,
          -0.345012,
          0.870256
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
      "time": 0.48,
      "label": "contactHold",
      "note": "impact hold for the rightward backhand slash",
      "generated": true,
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
          -0.579859,
          0.274347,
          0.40318,
          0.652643
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
          0.441779,
          0.282799,
          -0.680677,
          -0.511405
        ],
        "RightHand": [
          0.297419,
          -0.187518,
          -0.345012,
          0.870256
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
      "time": 0.7,
      "label": "followThrough",
      "note": "carry through to the right without dropping saber ownership",
      "generated": true,
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
          -0.56814,
          0.276115,
          0.388522,
          0.670842
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
          0.418469,
          0.419295,
          -0.48623,
          -0.642383
        ],
        "RightHand": [
          0.607954,
          -0.194141,
          -0.237192,
          0.732422
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
      "time": 0.92,
      "label": "recoil",
      "note": "settle from the rightward slash toward combo-ready",
      "generated": true,
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
          -0.539464,
          0.279485,
          0.353504,
          0.711268
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
          0.572315,
          0.437665,
          -0.373916,
          -0.58403
        ],
        "RightHand": [
          0.069082,
          0.21706,
          -0.147713,
          0.962441
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
      "time": 1.15,
      "label": "end",
      "note": "returns to Ready after the two-hit chain",
      "generated": true,
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

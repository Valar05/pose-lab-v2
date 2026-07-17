export const DAVIN_IDLE_SCREENSHOT_1 = {
  "schema": "pose-lab-v2-davin-idle-candidate-v1",
  "label": "Davin Wingsworth screenshot idle 1",
  "status": "quarantined-review",
  "source": {
    "actor": "Davin Wingsworth",
    "targetModel": "./public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr_tail3.glb",
    "sourceScreenshot": "/storage/emulated/0/Pictures/Screenshots/Screenshot_20260716-182009.png",
    "sourceScreenshotSha256": "44e662f7a30619bd2357b42b8ea66a3f903ff61824ff64a5b2509a3a1f6ef55c",
    "sourceScreenshotTimestamp": "2026-07-16T18:20:09-05:00",
    "method": "temporary-blender-ik-solve-baked-to-local-quaternion-candidate",
    "weaponless": true,
    "authoringControls": {
      "runtimeIk": false,
      "openPose": false,
      "temporaryIkTargets": {
        "LeftToeBase": {
          "target": [
            0.43,
            0.12,
            0.03
          ],
          "pole": [
            0.42,
            -0.42,
            0.45
          ],
          "chain": 4,
          "solvedHeadBeforeBake": [
            0.2308,
            0.3143,
            0.6899
          ]
        },
        "RightToeBase": {
          "target": [
            -0.42,
            0.18,
            0.03
          ],
          "pole": [
            -0.42,
            -0.34,
            0.45
          ],
          "chain": 4,
          "solvedHeadBeforeBake": [
            0.4428,
            -0.4747,
            0.6558
          ]
        },
        "LeftHand": {
          "target": [
            0.72,
            -0.1,
            0.92
          ],
          "pole": [
            0.48,
            -0.55,
            1.15
          ],
          "chain": 3,
          "solvedHeadBeforeBake": [
            0.4878,
            0.0856,
            1.2316
          ]
        },
        "RightHand": {
          "target": [
            -0.46,
            -0.22,
            1.03
          ],
          "pole": [
            -0.28,
            -0.62,
            1.28
          ],
          "chain": 3,
          "solvedHeadBeforeBake": [
            -0.3708,
            -0.2668,
            0.9177
          ]
        }
      },
      "fkSeedDegrees": {
        "Hips": [
          0,
          -4,
          -3
        ],
        "Spine": [
          5,
          0,
          3
        ],
        "Spine01": [
          5,
          0,
          3
        ],
        "Spine02": [
          3,
          0,
          2
        ],
        "neck": [
          -4,
          6,
          -4
        ],
        "Head": [
          -5,
          18,
          -7
        ],
        "LeftShoulder": [
          -18,
          0,
          12
        ],
        "LeftArm": [
          -18,
          14,
          24
        ],
        "LeftForeArm": [
          4,
          10,
          20
        ],
        "LeftHand": [
          0,
          6,
          10
        ],
        "RightShoulder": [
          -18,
          0,
          -12
        ],
        "RightArm": [
          -16,
          -12,
          -24
        ],
        "RightForeArm": [
          0,
          -10,
          -20
        ],
        "RightHand": [
          0,
          -6,
          -10
        ],
        "LeftUpLeg": [
          0,
          0,
          0
        ],
        "LeftLeg": [
          0,
          0,
          0
        ],
        "LeftFoot": [
          0,
          0,
          0
        ],
        "LeftToeBase": [
          0,
          0,
          0
        ],
        "RightUpLeg": [
          0,
          0,
          0
        ],
        "RightLeg": [
          0,
          0,
          0
        ],
        "RightFoot": [
          0,
          0,
          0
        ],
        "RightToeBase": [
          0,
          0,
          0
        ],
        "Tail01": [
          -12,
          0,
          -10
        ],
        "Tail02": [
          -15,
          0,
          -9
        ],
        "Tail03": [
          -18,
          0,
          -7
        ]
      }
    },
    "retargetPolicy": {
      "channels": [
        "quaternion"
      ],
      "ignoredChannels": [
        "position",
        "scale"
      ],
      "noRuntimeSolver": true
    },
    "visualContract": [
      "head faces viewer-right in a hawk-cop guard stance",
      "torso leans forward, not a neutral A-pose",
      "screen-left wing sweeps back and open",
      "screen-right wing bends up as a guard",
      "wide crouched talon stance with both feet grounded",
      "tail reads as a low rear fan, driven by Tail01/Tail02/Tail03"
    ]
  },
  "primeKeys": {
    "idle": 0,
    "idleHold": 0.041667
  },
  "guardReport": {
    "status": "QUARANTINED",
    "visualAcceptance": "not-run",
    "phaseCount": 2,
    "mappedBoneCount": 25,
    "note": "IK-assisted screenshot-derived idle pose pass. Local render decides whether to iterate before hosted review."
  },
  "frames": [
    {
      "label": "idle",
      "time": 0,
      "evidenceKey": "davin:idle:screenshot:20260716-182009",
      "sourceExpectedPath": "/storage/emulated/0/Pictures/Screenshots/Screenshot_20260716-182009.png",
      "note": "Target screenshot idle pose, not accepted visual truth.",
      "bones": {
        "Hips": [
          0.098846,
          -0.033985,
          -0.025488,
          0.994196
        ],
        "Spine": [
          -0.08409,
          0.013423,
          0.010171,
          0.996316
        ],
        "Spine01": [
          -0.031586,
          0.015725,
          0.012752,
          0.999296
        ],
        "Spine02": [
          0.075997,
          0.107477,
          0.017699,
          0.991141
        ],
        "neck": [
          0.044515,
          -0.020029,
          -0.012565,
          0.998729
        ],
        "Head": [
          -0.159572,
          -0.051102,
          0.036314,
          0.985194
        ],
        "LeftShoulder": [
          0.069707,
          0.099318,
          0.05559,
          0.991053
        ],
        "LeftArm": [
          0.523268,
          0.18528,
          -0.62746,
          0.546036
        ],
        "LeftForeArm": [
          -0.085368,
          -0.050789,
          0.464548,
          0.879959
        ],
        "LeftHand": [
          0.239046,
          0.044796,
          0.195047,
          0.950162
        ],
        "RightShoulder": [
          0.041753,
          -0.087548,
          -0.039306,
          0.994508
        ],
        "RightArm": [
          -0.481547,
          0.57173,
          -0.438284,
          0.499143
        ],
        "RightForeArm": [
          -0.423251,
          0.507985,
          -0.522226,
          0.5386
        ],
        "RightHand": [
          -0.277427,
          0.215911,
          -0.065255,
          0.933894
        ],
        "LeftUpLeg": [
          0.167755,
          0.285405,
          0.163758,
          0.929293
        ],
        "LeftLeg": [
          0.82281,
          -0.069069,
          0.080586,
          0.558318
        ],
        "LeftFoot": [
          0.193482,
          0.00494,
          0.114752,
          0.974357
        ],
        "LeftToeBase": [
          0.123768,
          -0.057826,
          0.12405,
          0.982827
        ],
        "RightUpLeg": [
          0.463849,
          0.713576,
          -0.47008,
          0.233833
        ],
        "RightLeg": [
          0.255847,
          0.221001,
          0.106863,
          0.93503
        ],
        "RightFoot": [
          0.170949,
          -0.15525,
          0.37318,
          0.89856
        ],
        "RightToeBase": [
          -0.200034,
          -0.320083,
          0.348907,
          0.857787
        ],
        "Tail01": [
          -0.0,
          -0.0,
          0.0,
          1.0
        ],
        "Tail02": [
          0.0,
          0.0,
          0.0,
          1.0
        ],
        "Tail03": [
          0.0,
          0.0,
          -0.0,
          1.0
        ]
      }
    },
    {
      "label": "idleHold",
      "time": 0.041667,
      "evidenceKey": "davin:idle:screenshot:20260716-182009:hold",
      "sourceExpectedPath": "/storage/emulated/0/Pictures/Screenshots/Screenshot_20260716-182009.png",
      "note": "Duplicate hold key for static idle render/playback compatibility.",
      "bones": {
        "Hips": [
          0.098846,
          -0.033985,
          -0.025488,
          0.994196
        ],
        "Spine": [
          -0.08409,
          0.013423,
          0.010171,
          0.996316
        ],
        "Spine01": [
          -0.031586,
          0.015725,
          0.012752,
          0.999296
        ],
        "Spine02": [
          0.075997,
          0.107477,
          0.017699,
          0.991141
        ],
        "neck": [
          0.044515,
          -0.020029,
          -0.012565,
          0.998729
        ],
        "Head": [
          -0.159572,
          -0.051102,
          0.036314,
          0.985194
        ],
        "LeftShoulder": [
          0.069707,
          0.099318,
          0.05559,
          0.991053
        ],
        "LeftArm": [
          0.523268,
          0.18528,
          -0.62746,
          0.546036
        ],
        "LeftForeArm": [
          -0.085368,
          -0.050789,
          0.464548,
          0.879959
        ],
        "LeftHand": [
          0.239046,
          0.044796,
          0.195047,
          0.950162
        ],
        "RightShoulder": [
          0.041753,
          -0.087548,
          -0.039306,
          0.994508
        ],
        "RightArm": [
          -0.481547,
          0.57173,
          -0.438284,
          0.499143
        ],
        "RightForeArm": [
          -0.423251,
          0.507985,
          -0.522226,
          0.5386
        ],
        "RightHand": [
          -0.277427,
          0.215911,
          -0.065255,
          0.933894
        ],
        "LeftUpLeg": [
          0.167755,
          0.285405,
          0.163758,
          0.929293
        ],
        "LeftLeg": [
          0.82281,
          -0.069069,
          0.080586,
          0.558318
        ],
        "LeftFoot": [
          0.193482,
          0.00494,
          0.114752,
          0.974357
        ],
        "LeftToeBase": [
          0.123768,
          -0.057826,
          0.12405,
          0.982827
        ],
        "RightUpLeg": [
          0.463849,
          0.713576,
          -0.47008,
          0.233833
        ],
        "RightLeg": [
          0.255847,
          0.221001,
          0.106863,
          0.93503
        ],
        "RightFoot": [
          0.170949,
          -0.15525,
          0.37318,
          0.89856
        ],
        "RightToeBase": [
          -0.200034,
          -0.320083,
          0.348907,
          0.857787
        ],
        "Tail01": [
          -0.0,
          -0.0,
          0.0,
          1.0
        ],
        "Tail02": [
          0.0,
          0.0,
          0.0,
          1.0
        ],
        "Tail03": [
          0.0,
          0.0,
          -0.0,
          1.0
        ]
      }
    }
  ]
};

export const DAVIN_LOWBACKKICK_ARES_TRANSFER_1 = {
  "schema": "pose-lab-v2-davin-lowbackkick-candidate-v1",
  "label": "Davin LowBackKick from Ares SF2 transfer 1",
  "status": "quarantined-review",
  "source": {
    "actor": "Davin Wingsworth",
    "targetModel": "./public/assets/davin/davin_wingsworth_kestrel_man_rigged_pbr.glb",
    "sourceActor": "Ares",
    "sourcePoseclip": "../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2.poseclip.json",
    "sourcePoseclipSha256": "de3fcd7caaaa2e2c6ed5a904ec5ad0bc555da6f63c8b32cded67ce9ff932ff37",
    "sourceEvidence": "../pose-lab/assets/pose_indexes/ares_lowbackkick_sf2_visual_evidence.json",
    "sourceEvidenceSha256": "b85d3fd83cbfab8ffd08adc64f9c91d93353a30e2dd8337e8449cc32256dc907",
    "sourceClip": "LowBackKick",
    "duration": 0.66667,
    "keyCount": 8,
    "method": "direct-core-bone-quaternion-transfer-from-ares-mixamorig-to-davin-meshy-core",
    "weaponless": true,
    "retargetPolicy": {
      "channels": [
        "quaternion"
      ],
      "ignoredChannels": [
        "position",
        "scale"
      ],
      "sourceExtraBones": "ignored fingers, toes, and end bones for viability pass 1",
      "noRuntimeSolver": true
    },
    "boneMap": {
      "mixamorig:Hips": "Hips",
      "mixamorig:Spine": "Spine",
      "mixamorig:Spine1": "Spine01",
      "mixamorig:Spine2": "Spine02",
      "mixamorig:Neck": "neck",
      "mixamorig:Head": "Head",
      "mixamorig:LeftShoulder": "LeftShoulder",
      "mixamorig:LeftArm": "LeftArm",
      "mixamorig:LeftForeArm": "LeftForeArm",
      "mixamorig:LeftHand": "LeftHand",
      "mixamorig:RightShoulder": "RightShoulder",
      "mixamorig:RightArm": "RightArm",
      "mixamorig:RightForeArm": "RightForeArm",
      "mixamorig:RightHand": "RightHand",
      "mixamorig:LeftUpLeg": "LeftUpLeg",
      "mixamorig:LeftLeg": "LeftLeg",
      "mixamorig:LeftFoot": "LeftFoot",
      "mixamorig:RightUpLeg": "RightUpLeg",
      "mixamorig:RightLeg": "RightLeg",
      "mixamorig:RightFoot": "RightFoot"
    },
    "footPlantRule": {
      "kind": "stationary-support-foot-plant",
      "enabled": true,
      "rootBone": "mixamorig:Hips",
      "windows": [
        {
          "footBone": "mixamorig:LeftFoot",
          "anchorFrame": 0,
          "startFrame": 0,
          "endFrame": 40,
          "reason": "LowBackKick should keep one foot planted the whole time. The planted support leg carries the turn while the kicking leg reaches and retracts."
        }
      ]
    },
    "acceptanceRead": [
      "support foot should appear planted through the turn",
      "windup and anticipationHold must read before the snap",
      "contact/contactHold must read as a low back kick, not a generic leg twist",
      "red if hips, knees, spine, or feet visibly collapse"
    ]
  },
  "primeKeys": {
    "start": 0,
    "windup": 0.08333,
    "anticipation": 0.16667,
    "anticipationHold": 0.21667,
    "contact": 0.3,
    "contactHold": 0.38333,
    "recoil": 0.45,
    "settle": 0.66667
  },
  "guardReport": {
    "status": "QUARANTINED",
    "visualAcceptance": "not-run",
    "phaseCount": 8,
    "mappedBoneCount": 20,
    "note": "This only proves candidate data exists. Rendered contact-sheet review decides viability."
  },
  "frames": [
    {
      "label": "start",
      "time": 0,
      "evidenceKey": "ares:lowbackkick:sf2:f000:start",
      "sourceExpectedPath": "assets/pose_evidence/ares/lowbackkick/sf2/f000_start.png",
      "note": null,
      "bones": {
        "Hips": [
          0.06857,
          -0.304132,
          -0.003907,
          0.950151
        ],
        "Spine": [
          -0.067311,
          0.00404,
          0.017264,
          0.997574
        ],
        "Spine01": [
          0.034929,
          0.000951,
          0.017681,
          0.999233
        ],
        "Spine02": [
          0.034683,
          0.00044,
          0.017927,
          0.999237
        ],
        "neck": [
          0.117715,
          -0.024504,
          -0.018181,
          0.992579
        ],
        "Head": [
          -0.022273,
          -0.193082,
          0.161987,
          0.967462
        ],
        "LeftShoulder": [
          0.647348,
          0.412149,
          -0.510137,
          0.388373
        ],
        "LeftArm": [
          0.23471,
          -0.252737,
          0.202575,
          0.916514
        ],
        "LeftForeArm": [
          -0.021798,
          -0.003867,
          0.798363,
          0.60177
        ],
        "LeftHand": [
          -0.080158,
          0.309317,
          -0.001421,
          0.947574
        ],
        "RightShoulder": [
          0.634262,
          -0.395723,
          0.497404,
          0.440118
        ],
        "RightArm": [
          0.353654,
          0.043579,
          -0.416036,
          0.836626
        ],
        "RightForeArm": [
          -0.010881,
          0.003343,
          -0.827623,
          0.561168
        ],
        "RightHand": [
          -0.050084,
          -0.201748,
          -0.098895,
          0.973144
        ],
        "LeftUpLeg": [
          -0.101803,
          -0.4183,
          -0.888319,
          0.159843
        ],
        "LeftLeg": [
          -0.44234,
          0.033256,
          -0.013538,
          0.896128
        ],
        "LeftFoot": [
          0.51182,
          -0.038438,
          -0.035688,
          0.85749
        ],
        "RightUpLeg": [
          -0.116595,
          0.151977,
          0.969523,
          0.152752
        ],
        "RightLeg": [
          -0.434378,
          0.059211,
          -0.060062,
          0.896774
        ],
        "RightFoot": [
          0.58799,
          0.098321,
          0.153517,
          0.788057
        ]
      }
    },
    {
      "label": "windup",
      "time": 0.08333,
      "evidenceKey": "ares:lowbackkick:sf2:f005:windup",
      "sourceExpectedPath": "assets/pose_evidence/ares/lowbackkick/sf2/f005_windup.png",
      "note": null,
      "bones": {
        "Hips": [
          -0.002519,
          -0.017104,
          -0.10625,
          0.994189
        ],
        "Spine": [
          -0.067311,
          0.00404,
          0.017264,
          0.997574
        ],
        "Spine01": [
          0.034929,
          0.000951,
          0.017681,
          0.999233
        ],
        "Spine02": [
          0.034683,
          0.00044,
          0.017927,
          0.999237
        ],
        "neck": [
          0.117715,
          -0.024504,
          -0.018181,
          0.992579
        ],
        "Head": [
          -0.022273,
          -0.193082,
          0.161987,
          0.967462
        ],
        "LeftShoulder": [
          0.628674,
          0.418379,
          -0.551731,
          0.354007
        ],
        "LeftArm": [
          0.076243,
          0.229546,
          -0.215515,
          0.94607
        ],
        "LeftForeArm": [
          -0.053678,
          0.008043,
          0.436575,
          0.898029
        ],
        "LeftHand": [
          -0.254112,
          0.218781,
          -0.029214,
          0.941652
        ],
        "RightShoulder": [
          0.640218,
          -0.374054,
          0.527909,
          0.414146
        ],
        "RightArm": [
          0.170638,
          0.300566,
          -0.444871,
          0.826216
        ],
        "RightForeArm": [
          -0.043942,
          -0.023077,
          -0.713769,
          0.698621
        ],
        "RightHand": [
          -0.252926,
          -0.167637,
          -0.079314,
          0.949545
        ],
        "LeftUpLeg": [
          -0.002173,
          -0.329396,
          -0.938612,
          0.102475
        ],
        "LeftLeg": [
          -0.444872,
          -0.059759,
          0.08552,
          0.889497
        ],
        "LeftFoot": [
          0.507144,
          -0.260024,
          0.090873,
          0.816661
        ],
        "RightUpLeg": [
          -0.196469,
          -0.20954,
          0.951866,
          0.106977
        ],
        "RightLeg": [
          -0.185308,
          0.064684,
          0.066142,
          0.978316
        ],
        "RightFoot": [
          0.223495,
          0.155341,
          0.180641,
          0.945139
        ]
      }
    },
    {
      "label": "anticipation",
      "time": 0.16667,
      "evidenceKey": "ares:lowbackkick:sf2:f010:anticipation",
      "sourceExpectedPath": "assets/pose_evidence/ares/lowbackkick/sf2/f010_anticipation.png",
      "note": null,
      "bones": {
        "Hips": [
          -0.023751,
          0.049127,
          -0.112122,
          0.992195
        ],
        "Spine": [
          -0.067311,
          0.00404,
          0.017264,
          0.997574
        ],
        "Spine01": [
          0.034929,
          0.000951,
          0.017681,
          0.999233
        ],
        "Spine02": [
          0.034683,
          0.00044,
          0.017927,
          0.999237
        ],
        "neck": [
          0.117715,
          -0.024504,
          -0.018181,
          0.992579
        ],
        "Head": [
          -0.022273,
          -0.193082,
          0.161987,
          0.967462
        ],
        "LeftShoulder": [
          0.626648,
          0.422989,
          -0.545784,
          0.361264
        ],
        "LeftArm": [
          0.037518,
          0.220317,
          -0.146303,
          0.963664
        ],
        "LeftForeArm": [
          -0.054411,
          0.011931,
          0.513867,
          0.856059
        ],
        "LeftHand": [
          -0.317269,
          0.198855,
          -0.006539,
          0.927229
        ],
        "RightShoulder": [
          0.63631,
          -0.379772,
          0.525008,
          0.418629
        ],
        "RightArm": [
          0.159186,
          0.29492,
          -0.403429,
          0.851426
        ],
        "RightForeArm": [
          -0.046011,
          -0.017507,
          -0.610646,
          0.790372
        ],
        "RightHand": [
          -0.196652,
          -0.162706,
          -0.053999,
          0.96537
        ],
        "LeftUpLeg": [
          -0.002797,
          -0.308477,
          -0.945814,
          0.101338
        ],
        "LeftLeg": [
          -0.433116,
          -0.07062,
          0.071294,
          0.895735
        ],
        "LeftFoot": [
          0.517218,
          -0.242699,
          0.100948,
          0.814489
        ],
        "RightUpLeg": [
          -0.222036,
          -0.192603,
          0.947262,
          0.127669
        ],
        "RightLeg": [
          -0.286469,
          0.04102,
          0.054784,
          0.955642
        ],
        "RightFoot": [
          0.154687,
          0.083627,
          0.189271,
          0.966051
        ]
      }
    },
    {
      "label": "anticipationHold",
      "time": 0.21667,
      "evidenceKey": "ares:lowbackkick:sf2:f013:anticipationHold",
      "sourceExpectedPath": "assets/pose_evidence/ares/lowbackkick/sf2/f013_anticipationHold.png",
      "note": null,
      "bones": {
        "Hips": [
          -0.034324,
          0.082189,
          -0.114872,
          0.989379
        ],
        "Spine": [
          -0.067311,
          0.00404,
          0.017264,
          0.997574
        ],
        "Spine01": [
          0.034929,
          0.000951,
          0.017681,
          0.999233
        ],
        "Spine02": [
          0.034683,
          0.00044,
          0.017927,
          0.999237
        ],
        "neck": [
          0.117715,
          -0.024504,
          -0.018181,
          0.992579
        ],
        "Head": [
          -0.022273,
          -0.193082,
          0.161987,
          0.967462
        ],
        "LeftShoulder": [
          0.625648,
          0.425192,
          -0.542898,
          0.364744
        ],
        "LeftArm": [
          0.01859,
          0.215298,
          -0.112249,
          0.969898
        ],
        "LeftForeArm": [
          -0.054619,
          0.013841,
          0.551037,
          0.832576
        ],
        "LeftHand": [
          -0.34825,
          0.18852,
          0.004823,
          0.918237
        ],
        "RightShoulder": [
          0.634315,
          -0.382651,
          0.523528,
          0.420881
        ],
        "RightArm": [
          0.153379,
          0.291814,
          -0.382496,
          0.863143
        ],
        "RightForeArm": [
          -0.046717,
          -0.014597,
          -0.554705,
          0.830606
        ],
        "RightHand": [
          -0.167863,
          -0.159967,
          -0.041103,
          0.971876
        ],
        "LeftUpLeg": [
          -0.003108,
          -0.297974,
          -0.949236,
          0.100758
        ],
        "LeftLeg": [
          -0.427592,
          -0.075695,
          0.064708,
          0.89847
        ],
        "LeftFoot": [
          0.522033,
          -0.23421,
          0.105841,
          0.813281
        ],
        "RightUpLeg": [
          -0.23424,
          -0.18435,
          0.944575,
          0.137571
        ],
        "RightLeg": [
          -0.335827,
          0.029008,
          0.048865,
          0.940208
        ],
        "RightFoot": [
          0.119672,
          0.047439,
          0.192848,
          0.972748
        ]
      }
    },
    {
      "label": "contact",
      "time": 0.3,
      "evidenceKey": "ares:lowbackkick:sf2:f018:contact",
      "sourceExpectedPath": "assets/pose_evidence/ares/lowbackkick/sf2/f018_contact.png",
      "note": null,
      "bones": {
        "Hips": [
          -0.005261,
          0.594609,
          -0.422953,
          0.683757
        ],
        "Spine": [
          -0.067311,
          0.00404,
          0.017264,
          0.997574
        ],
        "Spine01": [
          0.034929,
          0.000951,
          0.017681,
          0.999233
        ],
        "Spine02": [
          0.034683,
          0.00044,
          0.017927,
          0.999237
        ],
        "neck": [
          0.117715,
          -0.024504,
          -0.018181,
          0.992579
        ],
        "Head": [
          -0.022273,
          -0.193082,
          0.161987,
          0.967462
        ],
        "LeftShoulder": [
          0.695987,
          0.348375,
          -0.487344,
          0.395896
        ],
        "LeftArm": [
          -0.0613,
          0.166012,
          0.603857,
          0.7772
        ],
        "LeftForeArm": [
          -0.053976,
          0.023354,
          0.727229,
          0.683871
        ],
        "LeftHand": [
          -0.41703,
          0.391071,
          0.212306,
          0.792512
        ],
        "RightShoulder": [
          0.663,
          -0.324435,
          0.590651,
          0.326044
        ],
        "RightArm": [
          0.383024,
          -0.440587,
          0.153615,
          0.797232
        ],
        "RightForeArm": [
          -0.047147,
          -0.01203,
          -0.504329,
          0.86214
        ],
        "RightHand": [
          0.028322,
          -0.352951,
          0.015841,
          0.935079
        ],
        "LeftUpLeg": [
          0.004873,
          -0.592413,
          -0.768116,
          0.242942
        ],
        "LeftLeg": [
          -0.503612,
          -0.018717,
          0.019344,
          0.863511
        ],
        "LeftFoot": [
          0.620701,
          0.016167,
          0.102207,
          0.777189
        ],
        "RightUpLeg": [
          0.029365,
          0.334395,
          0.903494,
          0.266487
        ],
        "RightLeg": [
          -0.234754,
          -0.00578,
          -0.047736,
          0.970865
        ],
        "RightFoot": [
          0.100866,
          0.089536,
          0.149605,
          0.979504
        ]
      }
    },
    {
      "label": "contactHold",
      "time": 0.38333,
      "evidenceKey": "ares:lowbackkick:sf2:f023:contactHold",
      "sourceExpectedPath": "assets/pose_evidence/ares/lowbackkick/sf2/f023_contactHold.png",
      "note": null,
      "bones": {
        "Hips": [
          -0.005261,
          0.594609,
          -0.422953,
          0.683757
        ],
        "Spine": [
          -0.067311,
          0.00404,
          0.017264,
          0.997574
        ],
        "Spine01": [
          0.034929,
          0.000951,
          0.017681,
          0.999233
        ],
        "Spine02": [
          0.034683,
          0.00044,
          0.017927,
          0.999237
        ],
        "neck": [
          0.117715,
          -0.024504,
          -0.018181,
          0.992579
        ],
        "Head": [
          -0.022273,
          -0.193082,
          0.161987,
          0.967462
        ],
        "LeftShoulder": [
          0.695987,
          0.348375,
          -0.487344,
          0.395896
        ],
        "LeftArm": [
          -0.0613,
          0.166012,
          0.603857,
          0.7772
        ],
        "LeftForeArm": [
          -0.053976,
          0.023354,
          0.727229,
          0.683871
        ],
        "LeftHand": [
          -0.41703,
          0.391071,
          0.212306,
          0.792512
        ],
        "RightShoulder": [
          0.663184,
          -0.323941,
          0.591152,
          0.325253
        ],
        "RightArm": [
          0.383024,
          -0.440587,
          0.153615,
          0.797232
        ],
        "RightForeArm": [
          -0.04715,
          -0.012009,
          -0.503915,
          0.862382
        ],
        "RightHand": [
          0.028322,
          -0.352951,
          0.015841,
          0.935079
        ],
        "LeftUpLeg": [
          0.004873,
          -0.592413,
          -0.768116,
          0.242942
        ],
        "LeftLeg": [
          -0.503612,
          -0.018717,
          0.019344,
          0.863511
        ],
        "LeftFoot": [
          0.620701,
          0.016167,
          0.102207,
          0.777189
        ],
        "RightUpLeg": [
          0.029365,
          0.334395,
          0.903494,
          0.266487
        ],
        "RightLeg": [
          -0.234754,
          -0.00578,
          -0.047736,
          0.970865
        ],
        "RightFoot": [
          0.100866,
          0.089536,
          0.149605,
          0.979504
        ]
      }
    },
    {
      "label": "recoil",
      "time": 0.45,
      "evidenceKey": "ares:lowbackkick:sf2:f027:recoil",
      "sourceExpectedPath": "assets/pose_evidence/ares/lowbackkick/sf2/f027_recoil.png",
      "note": null,
      "bones": {
        "Hips": [
          -0.014013,
          0.060547,
          -0.160337,
          0.985104
        ],
        "Spine": [
          -0.05828,
          0.006698,
          0.014212,
          0.998177
        ],
        "Spine01": [
          0.033779,
          -0.00448,
          0.002372,
          0.999416
        ],
        "Spine02": [
          0.033555,
          -0.004342,
          0.002235,
          0.999425
        ],
        "neck": [
          0.106926,
          0.001616,
          -0.008674,
          0.994228
        ],
        "Head": [
          0.005326,
          -0.035673,
          0.085013,
          0.995727
        ],
        "LeftShoulder": [
          0.674207,
          0.375541,
          -0.508329,
          0.38212
        ],
        "LeftArm": [
          0.173141,
          -0.053524,
          0.362979,
          0.914004
        ],
        "LeftForeArm": [
          -0.038065,
          0.009354,
          0.757264,
          0.651932
        ],
        "LeftHand": [
          -0.179138,
          0.275115,
          0.096487,
          0.939634
        ],
        "RightShoulder": [
          0.642648,
          -0.374262,
          0.540241,
          0.393789
        ],
        "RightArm": [
          0.261053,
          0.106745,
          -0.215402,
          0.934911
        ],
        "RightForeArm": [
          -0.029783,
          -0.004358,
          -0.68136,
          0.731329
        ],
        "RightHand": [
          -0.126111,
          -0.161895,
          -0.047053,
          0.977585
        ],
        "LeftUpLeg": [
          -0.049642,
          -0.396188,
          -0.896139,
          0.193663
        ],
        "LeftLeg": [
          -0.485467,
          -0.019486,
          0.023751,
          0.873715
        ],
        "LeftFoot": [
          0.57252,
          -0.121465,
          0.072888,
          0.807561
        ],
        "RightUpLeg": [
          -0.125755,
          -0.027859,
          0.991608,
          0.011137
        ],
        "RightLeg": [
          -0.565712,
          0.041023,
          -0.107533,
          0.816531
        ],
        "RightFoot": [
          0.662067,
          0.122678,
          0.174912,
          0.718348
        ]
      }
    },
    {
      "label": "settle",
      "time": 0.66667,
      "evidenceKey": "ares:lowbackkick:sf2:f040:settle",
      "sourceExpectedPath": "assets/pose_evidence/ares/lowbackkick/sf2/f040_settle.png",
      "note": null,
      "bones": {
        "Hips": [
          0.06857,
          -0.304132,
          -0.003907,
          0.950151
        ],
        "Spine": [
          -0.067311,
          0.00404,
          0.017264,
          0.997574
        ],
        "Spine01": [
          0.034929,
          0.000951,
          0.017681,
          0.999233
        ],
        "Spine02": [
          0.034683,
          0.00044,
          0.017927,
          0.999237
        ],
        "neck": [
          0.117715,
          -0.024504,
          -0.018181,
          0.992579
        ],
        "Head": [
          -0.022273,
          -0.193082,
          0.161987,
          0.967462
        ],
        "LeftShoulder": [
          0.647348,
          0.412149,
          -0.510137,
          0.388373
        ],
        "LeftArm": [
          0.23471,
          -0.252737,
          0.202575,
          0.916514
        ],
        "LeftForeArm": [
          -0.021798,
          -0.003867,
          0.798363,
          0.60177
        ],
        "LeftHand": [
          -0.080158,
          0.309317,
          -0.001421,
          0.947574
        ],
        "RightShoulder": [
          0.634262,
          -0.395723,
          0.497404,
          0.440118
        ],
        "RightArm": [
          0.353654,
          0.043579,
          -0.416036,
          0.836626
        ],
        "RightForeArm": [
          -0.010881,
          0.003343,
          -0.827623,
          0.561168
        ],
        "RightHand": [
          -0.050084,
          -0.201748,
          -0.098895,
          0.973144
        ],
        "LeftUpLeg": [
          -0.101803,
          -0.4183,
          -0.888319,
          0.159843
        ],
        "LeftLeg": [
          -0.44234,
          0.033256,
          -0.013538,
          0.896128
        ],
        "LeftFoot": [
          0.51182,
          -0.038438,
          -0.035688,
          0.85749
        ],
        "RightUpLeg": [
          -0.116595,
          0.151977,
          0.969523,
          0.152752
        ],
        "RightLeg": [
          -0.434378,
          0.059211,
          -0.060062,
          0.896773
        ],
        "RightFoot": [
          0.58799,
          0.098321,
          0.153517,
          0.788057
        ]
      }
    }
  ]
};

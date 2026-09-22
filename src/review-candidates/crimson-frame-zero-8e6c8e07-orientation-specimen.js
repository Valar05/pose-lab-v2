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
    "method": "Crimson-native authored elbow and wrist projection; two-bone pins first, wrist roll and sword last",
    "crossRigPoseInputs": [],
    "exactAuthoredGlb": true,
    "poseSha256": "4db76a74b24d56411d6429c0c5f35bbe77bedbe92bda086d65a162aaea0ab41a",
    "status": "generated-visual-pending-candidate-parity",
    "rejectedBaseline": {
      "candidateId": "crimson-frame-zero-480eb888-rejected",
      "poseSha256": "b5ef5555ba060546f4d6dd3921f09cf0e4251dfac8a346d4db7f4f30858bd554",
      "glbSha256": "4e57cc6a443b6cdd0cae1177357536234e4c4e7de98069e7027af74070bd0b56"
    },
    "limitations": [
      "Crimson has rigid open gauntlet meshes and no finger bones; visible hand closure is unavailable in this asset"
    ],
    "authoredGlbSha256": "d20a0f8f8f82b94ffbf0b96a10e4aa1326c6915f7346abc29385c89bcc8d734b",
    "poseProvenance": {
      "bonesAndHips": "extracted from authored_frame_zero.glb CrimsonCombatReadyFrameZero animation channels",
      "sabreLocal": "newly baked calibration after blade-direction and two-hand weapon seating solve; not extracted from character GLB"
    },
    "authorEligibleBeforeCandidateParity": true
  },
  "frames": [
    {
      "label": "start",
      "time": 0,
      "positions": {
        "Hips": [
          8.6e-07,
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
          0.55990779,
          0.26694843,
          0.49928895,
          0.60493994
        ],
        "LeftForeArm": [
          -0.27392077,
          0.04690295,
          0.65993595,
          0.69803447
        ],
        "LeftHand": [
          0.02757126,
          0.02789319,
          0.14987648,
          0.98792654
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
          -0.21967316,
          -0.2851795,
          0.7016902,
          0.61485541
        ],
        "neck": [
          0.10416708,
          0.03002633,
          -0.00394118,
          0.99409866
        ],
        "Head": [
          0.06650833,
          -4e-08,
          -0.0,
          0.99778587
        ]
      }
    }
  ]
};

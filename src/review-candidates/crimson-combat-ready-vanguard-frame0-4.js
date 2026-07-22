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
    "poseSha256": "75c69e76f0fe841292c4979e19fefb2f4c4d0bd22aab5eb3296e7a464f90e0c6",
    "status": "generated-visual-pending-candidate-parity",
    "rejectedBaseline": {
      "candidateId": "crimson-frame-zero-480eb888-rejected",
      "poseSha256": "b5ef5555ba060546f4d6dd3921f09cf0e4251dfac8a346d4db7f4f30858bd554",
      "glbSha256": "4e57cc6a443b6cdd0cae1177357536234e4c4e7de98069e7027af74070bd0b56"
    },
    "limitations": [
      "Crimson has rigid open gauntlet meshes and no finger bones; visible hand closure is unavailable in this asset"
    ],
    "authoredGlbSha256": "29a41c72aa7eda0857a1c4c6251b5d755b84e364f921605310053b00417bede5",
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
          -9.12207413,
          11.43897438,
          -7.90325975
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
          0.69112068,
          0.12561512,
          0.59973735,
          0.38325986
        ],
        "LeftForeArm": [
          0.03147558,
          0.00012812,
          0.50429946,
          0.86295503
        ],
        "LeftHand": [
          0.06135889,
          0.04253984,
          0.13654938,
          0.98781568
        ],
        "RightShoulder": [
          0.54176521,
          -0.62001854,
          0.42385703,
          0.3773762
        ],
        "RightArm": [
          0.3081488,
          -0.40513292,
          -0.38849074,
          0.76810586
        ],
        "RightForeArm": [
          -0.68340456,
          -0.07638235,
          -0.60911739,
          0.39509496
        ],
        "RightHand": [
          -0.07566148,
          0.08496813,
          0.51603788,
          0.84897625
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

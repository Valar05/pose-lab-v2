# Unicorn mounted locomotion: color-wrap reference intake

**State:** reference measured; **not a canter performance candidate**. New side-view mounted unicorn game, distinct from Vanguard and Belly of Defiance. Intended authoring/review is existing Pose Lab V2. Do not treat this Git branch, offline exports, or this document as hosted visual acceptance.

## Authority

- Appearance: user-provided 1774 x 887 eight-cell illustration `934732.png`; use to segment the black unicorn and purple-haired mounted rider only. The poses are anatomically unreliable and **must not govern limb movement**.
- Motion: user-provided `934757.mp4`, SHA-256 `b5430cdd1090e90bec22d6964817b6ae852cbb1421776433847b129c814afcba`, 2404 x 1080 capture, 402 captured frames at approximately 57.79 capture fps.
- **Critical:** Frames 0-144 contain a color-coded **walk**, not an established three-beat canter. Visible playback is paused/scrubbed at points. Recording fps is not horse locomotion fps. After frame ~145 the system UI obscures lower-leg evidence. This video is useful to demonstrate four-marker extraction and measure walk placement, **not to drive a canter**.
- Color labels refer to wraps, not reliably near/far-side ownership: hind green; hind red; fore purple; fore red. Both red wraps require spatial disambiguation.

## Observed wrap-centroid pixel landmarks

Original 2404 x 1080 screen coordinates (origin upper-left; +x right, +y down). These are **center of colored wraps**, not hooves or anatomical joints. `angle` is wrap-major-axis angle relative to screen vertical in degrees, positive leaning right toward hoof; **not a knee/hock joint angle**. Blank means obscured.

| Capture frame | hind green x,y / angle | hind red x,y / angle | fore purple x,y / angle | fore red x,y / angle |
|---|---|---|---|---|
| 0 | 1039.9, 953.6 / -3.9 | 1111.7, 967.2 / +1.1 | 1310.2, 966.7 / +21.1 | obscured |
| 40 | 1189.4, 952.6 / +0.7 | 1216.1, 946.5 / +9.7 | 1328.4, 959.4 / -33.3 | 1409.2, 962.6 / +17.5 |
| 60 | 1247.2, 955.2 / +30.6 | 1179.9, 951.1 / -17.3 | 1386.2, 963.9 / +11.9 | obscured |
| 100 | obscured | 1192.7, 886.0 / +8.5 | 1346.3, 905.9 / -23.1 | 1440.4, 904.3 / +25.0 |
| 120 | 1186.4, 909.6 / +20.6 | 1141.9, 916.8 / -3.4 | 1362.1, 931.0 / +12.1 | 1303.8, 920.5 / -21.0 |
| 140 | 1045.4, 917.8 / -9.3 | 1151.2, 930.2 / +32.4 | 1288.1, 929.9 / -25.1 | obscured |

**Same-frame measurements:** fore red vs fore purple centers separate by 80.7 px horizontally at frame 40, 94.1 px at frame 100, and 58.4 px (reversed horizontal order) at frame 120. Do not compare absolute x across different frames as stride length without camera/root stabilization.

## Segmentation and next measurement

1. Use color masks in HSV on the recorded real-horse footage to locate band centroids; reject occluded frames; estimate wrap-axis orientation via image-component PCA. Band axis is a **lower-limb proxy**, not a hoof angle or whole-leg joint rotation.
2. For true rigging measurements, obtain a *continuous side-view actual canter* with visible repeated three beats and suspension, preferably original video frame rate and not a scrubbed phone capture. Identify true knees (fore carpi), fetlocks, hind stifles and hocks separately, using manual keypoint review where occluded.
3. Build one locked root/pelvis, four separate equine leg chains, head/neck, rider-seat anchor, mane/tail/fabric springs and decorative layers. In-place animation: horizontal root motion disabled, planted hooves world-pinned during stance. Use source drawing for materials/appearance only.
4. Export mechanically segmented source PNG layers, editable 2D rig and measured canter action into the *existing* Pose Lab V2 authoring lane. Then obtain the exact hosted review route and human verdict. Nothing in this intake implies steps 3–4 are completed.

## Operating guard

Follow `AGENTS.md`, `docs/POSE_LAB_CAMPAIGN_RULES.md`, `docs/POSE_IS_GOD.md`, `docs/POSE_CAMPAIGN_FRAMEWORK.md`, and sprite-authoring doctrine. Never overwrite locked Vanguard/Belly assets. Treat outputs as quarantined pending the exact hosted Pose Lab V2 review and Drew's verdict. Source video not committed here: the hash is a provenance identifier, not repository asset availability.


## Follow-up recording 934762.mp4: verified colors, no validated canter

- Video SHA-256 `b94fa6ff1f37dc2fec2b52a73f013fbdf4192a51c258f28ae49847c7fdef9b15`; 2404 x 1080 pixels; 359 screen-capture frames over 13.150 seconds. This recording is paused/repeated and pans from side to 3/4 view. Capture frame rates are not gait timing authority.
- The source *also* uses colored wraps: green hind, red hind, purple fore, red fore. Red masks interfere with YouTube's progress bar, so **red automatic matches are unverified and rejected**.
- Around YouTube time 3:59–4:01 the subtitles explicitly say "rise trot and ask for canter". No continuous, repeatable three-beat canter plus suspension can be established from this excerpt.
- All values below are manually inspected HSV-component **colored wrap centroids in source 2404x1080 screen pixels**, *not* measured hooves, limb pivots, knee/hock angles, or stride length.

| Recorded frame | capture time | green hind x,y | purple fore x,y | screen-space purple-minus-green dx,dy |
|---|---|---|---|---|
| 18 | 1.231 s | 936.44,925.06 | 1225.51,933.98 | 289.07, +8.91 px |
| 40 | 1.415 s | 937.76,922.70 | 1224.91,933.52 | 287.15, +10.81 px |
| 70 | 2.666 s | 693.55,940.87 | 991.57,939.47 | 298.02, -1.39 px |
| 100 | 3.753 s | 983.05,931.57 | 1283.07,936.76 | 300.03, +5.18 px |

Frames 18 and 40 are nearly duplicate source poses. The YouTube progress bar at y=896–903 and subtitles obscure distal hoof contacts. Colored-wrap long-axis PCA gives *wrap shape*, not hoof pitch or joint articulation; do not use those axes as rig angles. Inter-band horizontal separation (287–300 pixels in selected views) is *not* a world-space leg length. Gait lead, hoof strikes, and suspension remain **unproven**.

**Result:** Reference evidence only. Existing Pose Lab V2 remains the required delivery surface, source illustration stays appearance-only, horizontal root motion remains disabled. No rig, canter animation, or hosted visual review exists on the basis of this measurement. Require a side-on continuous three-beat canter clip to populate the motion-authority track.

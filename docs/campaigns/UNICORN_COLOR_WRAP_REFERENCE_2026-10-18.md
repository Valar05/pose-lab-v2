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

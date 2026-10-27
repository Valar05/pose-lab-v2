# Pose Lab V2: deterministic sprite scale normalization

This shared Pose Lab feature is a reusable, source-locked measurement engine, not a
Connie-specific script, new application, or generative redrawer. Governed by
AGENTS.md, docs/POSE_LAB_CAMPAIGN_RULES.md, docs/POSE_IS_GOD.md,
docs/POSE_CAMPAIGN_FRAMEWORK.md, and docs/SPRITE_AUTHORING_BOOT.md.

## What can actually be measured

Canvas/foreground pixel bounds, source SHA, explicit cell geometry, landmark
distances, anatomical scale ratios, and whole-frame transforms are deterministic.
Interpreting stylized artwork as a chin, pelvis, foot, or detached flower is not
reliable pixel arithmetic. The engine **requires saved anatomical landmarks**,
confidence, pose/facing, and explicit same-physical-point anchors. A vision pass
may propose these landmarks but cannot silently become calibration authority.
Low-confidence, missing or disagreeing annotations block the transformation.

The analysis records per-frame source size, measured foreground bounds (including
all disconnected ornamentation), anatomical landmarks, distances, frame duration,
pose, facing, anchor, confidence, and issue status. Measured head or torso lengths
are compared to the canonical physical reference; a robust median gives **one
factor per animation sequence**. Excessive ratio disagreement is a hard stop.
Do not fit crouching and extended poses independently by their silhouette boxes.

Pinwheel/other transformations require a saved transformation-to-sequence
relationship and reason, or a documented artistic-exception factor. Whole
frames and all detached ornaments share that one factor. No invented frames.

## Reused Pose Lab infrastructure

- tools/campaigns/campaign_core.py and campaign_common.sh: campaign gates,
  mutable surface, receipts, Git readback. No replacement orchestration.
- tools/campaigns/connie_head_atlas.py: existing black matte conversion and
  crisp Lanczos scaling logic; shared algorithm follows its threshold policy
  without importing Connie-specific filenames or calibration multipliers.
- src/sprite-viewer.js: existing 2D review UI already accepts synchronized
  before/after animations, contact sheets and frame-by-frame stepping. The new
  tool emits its pose-lab-v2-2d-animation-set-v1 schema. No separate UI.
- Historical Swarmling Run repair: one scale per authored animation family.

## Calibration JSON

Schema: pose-lab-sprite-calibration-v1.

Properties: character, measurement policy, canonical, and sequences. Source
records contain:
- name; file (repository-relative); exact sha256; cell [x,y,width,height]
- landmarks with [x,y] global source coordinates: crown, chin, shoulder, hip,
  knee, ankle, foot, as visible and reliably measured
- metric = head (crown-to-chin) or torso (shoulder-to-hip)
- confidence in [0,1], pose, facing, anchor [x,y], anchorLabel
- animation frames additionally have durationMs

A sequence is an object containing id and frames in authored order. The
anchorLabel must be consistent throughout each sequence, with per-frame exact
anchor coordinates. If foreground touches any source-cell edge, analysis blocks
until that frame declares a nonempty edgeContactReview reason confirming the
canonical partition was inspected; silent seam clipping is forbidden. Missing anatomy may name an earlier measured frame through
inheritMeasurementFrom; no anatomy is fabricated for that frame.

Optional global policy: measurement.background = alpha or black;
minimumConfidence = 0.8; maximumSequenceSpread = 0.08.
Black-backed originals use the existing Connie unmatting threshold; dark ink on
black may require reviewed masks. A mathematically non-clipped PNG is not proof
of line-art fidelity.

Optional per-sequence exception:
  artisticException: {scaleFactor: 1.25, reason: "documented art authority"}

Optional intentional transformation:
  transformation: {scaleFromSequence: "run", relativeScale: 1,
                   reason: "authored transformation-to-body relationship"}

The referenced source sequence must precede the transformation. These are
explicit saved artistic decisions, not geometry guesses.

## Run through existing Pose Lab

Install Pillow 11.3.0 in the existing Pose Lab Python environment. From repo root:

~~~sh
python3 tools/sprite_scale_normalization.py analyze \
  --config campaigns/character-calibration.json \
  --report generated/character-scale/measurements.json
~~~

Inspect every ratio, status, landmark and exception. Fix saved calibration
rather than suppressing failure. For a non-destructive quarantined candidate:

~~~sh
python3 tools/sprite_scale_normalization.py preview \
  --config campaigns/character-calibration.json \
  --report generated/character-scale/measurements.json \
  --output public/assets/character/normalization-candidate
~~~

Existing Pose Lab 2D review route:
  ?view=2d&manifest=/assets/character/normalization-candidate/animations.json

The tool writes before/after RGBA frames, contact sheets, animations.json, and
render-receipt.json with per-frame registration and one factor per sequence.
No original file can be overwritten, and nonempty output directories are refused.

After **actual hosted** visual approval, save an approval JSON:
~~~json
{
  "schema": "pose-lab-sprite-normalization-approval-v1",
  "verdict": "approved",
  "analysisSha256": "<actual ANALYSIS_SHA256 reported by analyze>",
  "approvedSequences": ["run"],
  "reviewer": "Drew",
  "reviewUrl": "<exact hosted review URL>"
}
~~~

Then run:

~~~sh
python3 tools/sprite_scale_normalization.py apply \
  --config campaigns/character-calibration.json \
  --report generated/character-scale/measurements.json \
  --approval campaigns/character-scale.approval.json \
  --output public/assets/character/normalization-approved
~~~

All saved config/source/report digests are checked again before apply.
A preview has status quarantined; apply requires an exact approved analysis.
An approval file must come from a human verdict, not an automated green gate.

The existing review UI can compare original and normalized playback. Review
and approval occur on the hosted Pose Lab surface; these commands alone cannot
assert human visual success.

## Connie input collision, October 20, 2026

The four new chat images are **different binaries** from the historical
campaigns/connie-source-measurements-v3.json authority, and the old
public/assets/connie/source directory is missing from GitHub main.

| Role | Uploaded | Historical V3 | Exact attached SHA-256 |
| --- | --- | --- | --- |
| idle | 1152x1536 | 1086x1448 | 7fb56a75e6e02d0bb256469845bbfd57a5aff0e925b1a5216ac1828debec827b |
| ninja run | 1536x864 | 1672x941 | a8a5acfc9eab5c61b3b060e933ec9f91807b463cefd10ed0b5927ad420500b12 |
| rebound/aerial | 1536x512 | 2172x724 | e8796c2de42fef4cdf4265cdfc6d69e90a4409071175e0b98c4bb6b9d1e1fee0 |
| pinwheel | 1536x512 | 2172x724 | 32cab3b7e7deebc2f7607e189fa5790771b6d7bbd942ba27cc442edccbf753cf |

The old annotated head boxes, source partitions, and normalization ratios
must NOT be used on the new art. The attached images need exact, permitted
Git binary ingress, SHA-locked provenance, new visual landmark calibration
and irregular source-cell partition checks before Connie processing.
No source binaries were changed or generated in this campaign. Connie's
normalized atlas and actual hosted contact-sheet verdict remain BLOCKED.

This feature deliberately does not turn the model's opinion about anatomy into
an unreviewed deterministic-looking number.

## Tests and receipts

~~~sh
npm run test:sprite-scale
npm run test:campaign-framework
npm run test:2d
npm run build
npm run smoke
~~~

A dedicated GitHub CI workflow tests deterministic repeatability and existing
Pose Lab review compatibility. Follow campaign V2 receipt ordering after
implementation checks. Guardrail green is not visual green.

# Visual Verification Doctrine

Pose Lab V2 exists because metric-green Pose Lab work repeatedly stayed
human-red. This repo must not repeat that failure.

## Core Rule

Human-visible truth is the acceptance gate. Syntax checks, build checks, smoke
tests, source-string assertions, route checks, asset reachability, and telemetry
are guardrails. They may prove the page can load or explain a failure, but they
do not prove that the Meshy character, hands, pose, camera, or real sabre look
right.

If a screenshot or cloud review is red, the build is red until fresh visual
evidence shows the requested relationship is correct.

## Required Order

1. Read the newest relevant visual evidence first.
2. State the visible read in concrete nouns: Meshy character, hand, sabre,
   blade, camera, pose, controls.
3. Convert each visual correction into a screen-space predicate before editing.
   If the user says "sabre trails left," the predicate is about the projected
   blade tip and hilt in the review camera, not about a guessed local rotation
   sign or wrist-travel metric.
4. Classify every machine check as diagnostic, guardrail, unrelated, or visual
   acceptance.
5. Do not wake the browser or ask the user to inspect a page until the agent has
   eliminated blank, loading, error, missing-mesh, and obvious no-op states.
6. Do not claim green until the hosted review surface visibly shows the
   requested result.

## Visual Predicate Rule

Do not ship rig-space guesses for visual choreography. A visual instruction must
be restated as the relationship a human would see in the active review camera,
then checked against that relationship before commit or deploy.

Examples:

- "trail left" means the projected blade tip is left of the projected hilt.
- "strike left" means the contact pose reverses the anticipation direction and
  sends the blade/hand path viewer-left.
- "held" means the hilt reads as owned by the hand, not merely parented in the
  scene graph.
- "out of frame" means the relevant limb or prop is not visually competing in
  the FPV composition.

Local quaternions, Euler signs, wrist-travel totals, route labels, and source
clip statistics are diagnostics. They cannot substitute for the visible
predicate that came from the user's correction.

## Local Render

Local render is agent eyesight. Use it when tooling exists or when the user asks
for local eyes before wake. It must catch blank screens, loading screens, error
pages, missing meshes, and obvious unchanged visuals before the user is asked to
look.

Local render is not final acceptance for this repo. The hosted cloud page remains
the review surface.

## Smoke Is Not Visual Acceptance

`npm run smoke` is useful because it blocks known poison patterns and missing
assets. It is not visual acceptance. A smoke pass after a screenshot-red report
must be described as a guardrail pass, not progress toward visual green.

If `npm run smoke` could pass while the screenshot still looks wrong, it is not
an acceptance test for that failure.

## No False-Green Reports

A report is false-green if it says or implies success from:

- `node --check`
- `npm run smoke`
- source-string assertions
- route labels
- asset HTTP 200s
- deployment success
- telemetry saying the right mode loaded

while the visible cloud review is blank, loading, missing the sabre, no-op, or
human-red.

When that happens, stop implementation claims, name the visual failure, and fix
the evidence path before making another product change.

## Pose Lab V2 Target

The accepted visible relationship is simple:

- the Meshy character is visible;
- the real sabre mesh is visible;
- the sabre is held by the intended hand or grip;
- the selected pose reads intentionally to a human;
- the camera and controls let the user inspect and adjust the pose without
  hiding the target.

Metrics explain why this failed. They do not decide whether it passed.

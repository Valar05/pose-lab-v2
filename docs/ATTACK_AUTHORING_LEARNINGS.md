# Attack Authoring Learnings

Pose Lab V2 reached usable one-prompt Attack2 output only after narrowing the
problem: preserve the visible saber/hand relationship, use manual Meshy keys as
truth, and use FPS clips as choreography reference instead of retarget truth.

## Current Working Pattern

- `Ready` is the calibration baseline for standalone one-hand attacks.
- Combo attacks may start from the prior attack's contact hold, not from Ready.
- Keep runtime saber ownership boring: `RightHand -> SaberGrip -> sabre mesh`.
- Bake candidates as static review modules under `src/review-candidates/`.
- Keep candidates quarantined until hosted cloud review is human-accepted.
- Use FPS reference for direction, timing, and wrist/blade intent only.
- Preserve user-authored Meshy keys literally; do not reinterpret them through
  Euler deltas or IK.
- For weaponless fist clips, preserve the source limb chain before judging
  hand/fist orientation. Pin Meshy elbow and wrist world joints from mapped FPS
  upper-arm and forearm vectors anchored at the Meshy arm joint; do not use FPV
  screen positions as body targets.

## Attack1 Pattern

Attack1 became functional when it stopped being an evenly smoothed pose blend.

Useful structure:

```text
start -> anticipation -> anticipationHold -> contact -> contactHold -> followThrough -> recoil -> end
```

Why it worked:

- anticipation/contact were manual Meshy keys;
- anticipation/contact holds gave the eye time to read the pose;
- contact moved earlier to create a snap;
- follow-through stayed close to contact before recovery;
- recovery returned toward Ready after the hit read.

## Attack2 Pattern

Attack2 became usable because it was treated as a combo continuation.

Rules:

- start from Attack1 `contactHold`;
- do not reset to Ready at frame zero;
- reverse into a left-to-right backhand slash;
- twist wrist/forearm to preserve edge alignment;
- use the same hold/snap/hold/recover timing language as Attack1.

Current generated profile:

```text
start          = attack1.contactHold
backhandPrep   = slerp(attack1.contactHold, attack1.anticipationHold, 0.22) + edge twist
prepHold       = duplicate(backhandPrep)
contact        = attack1.anticipationHold + stronger edge twist
contactHold    = duplicate(contact)
followThrough  = slerp(contact, ready, 0.2) + partial edge twist
recoil         = slerp(followThrough, ready, 0.58)
end            = ready
```

## Do Not Repeat

- Do not smooth every key evenly; it produces functional but bland motion.
- Do not use tests as proof of visual quality.
- Do not tune the saber independently to hide wrist/arm failure.
- Do not start combo attacks from Ready unless the choreography says so.
- Do not add runtime solvers to make a baked review candidate pass.
- Do not convert FPS FPV screen positions into full-body Meshy IK targets. That
  can make numbers look close while the body raises both arms into nonsense.

## Review Commands

```sh
npm run bake:attack1:candidate
npm run bake:attack2:candidate
npm run build
npm run smoke
npm run review:attacks
```

The review URL commands print cloud URLs only. They do not wake a browser and do
not claim visual acceptance.

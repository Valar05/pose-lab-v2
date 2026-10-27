# Pose Lab V2 2D preservation index (2026-10-27)

**Status:** inventory only. No candidate is promoted or approved by this document.

This is a protective inventory of 2D campaign heads with history divergent from `main`. Do not delete/archive source branches until reconciled content, human acceptance, and runtime parity are established. The GitHub tracking issue is [#48](https://github.com/Valar05/pose-lab-v2/issues/48).

## Source families

| Family | Candidate branch refs (resolve to exact SHA when reviewing) |
|---|---|
| Connie | `feature/deterministic-sprite-scale-normalization-20261020`, `campaign/connie-paper-motion-20261021`, `campaign/connie-panzer-integration-20261025` |
| Panzer | `campaign/panzer-v2-route-parity-20261025`, `campaign/panzer-recompose-v2-20261025`, `campaign/panzer-turret-isolation-v1-20261025` |
| Serin | `codex/serin-unified-locomotion-v1`, `codex/serin-momentum-jump-v1`, `codex/serin-glide-wave-locomotion-v2`, `codex/serin-back-liquid-idle-v1` |
| Vanguard | `fortress/vanguard-approved-run`, `agent/vanguard-walk-actions`, `agent/vanguard-2d-view` |
| Sprite pipeline | `agent/sprite-refinery-mvp`, `feature/two-key-deform-native-20260919`, `transfer/valkyrie-sprite-factory-20260922` |
| Vesper | `codex/vesper-run-v1` |
| Unicorn | `codex/unicorn-reference-measurement-v1` |

## Preservation and merge discipline

1. Read `AGENTS.md`, `docs/POSE_LAB_CAMPAIGN_RULES.md`, `docs/POSE_IS_GOD.md`, and `docs/POSE_CAMPAIGN_FRAMEWORK.md` before mutation.
2. Work from an updated `main` in a disposable worktree. Preserve all dirty working trees.
3. Compare branch *file bytes*, manifests, and prior human acceptance before deciding anything is absent from `main`. Ahead counts alone are not proof of missing content.
4. Keep approved 2D pose/frame/timing/scale/source bytes immutable unless specifically reopened by Drew.
5. Reconcile one character/campaign at a time. Import additively; quarantine unaccepted candidates. Do not merge entire stale branches or replace `motion.html` en bloc.
6. Run campaign checks and build/review the actual hosted Pose Lab V2 URL. A passing CI check cannot replace human visible acceptance.
7. Keep branches and review history until `main` includes the exact accepted deliverables and routes. Document the accepted assets and hashes in the per-campaign contract.

## 3D independence

Boneforge Titan draft PR [#47](https://github.com/Valar05/pose-lab-v2/pull/47) is a separate full-body FPV experiment. Its review/merge must not alter the sprite player, route selectors, or accepted 2D assets.

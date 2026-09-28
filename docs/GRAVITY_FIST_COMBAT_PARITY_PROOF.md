# Gravity Fist Combat Parity Proof 01

## Result

`buffered-standard-chain-cutover` is proven at machine-parity scope.

The target adapter preserves this Gravity Fist rule: while a standard attack is active, one next-standard-attack request may be buffered; it cannot start early; on the first eligible update that reaches or passes the current move's semantic `attack_end`, the request is consumed once and the next ordered standard move starts.

This is a combat-state result. It does not accept animation quality or feel.

## Donor authority

- Repository: `Valar05/gravity-fist`
- Revision: `e89c2adf671b06af4ce6a6c1d3f0118e68a6c274`
- File: `scripts/player.gd`
- Git blob: `47088e150126f99a59fd25cfc6e417d374ad2d80`
- SHA-256: `851aab158c7b5ccedecd6193e5bf11d5fd75e7337d5f5911e8c489b46a16a262`
- Source behavior: tap sets `buffered_attack`; `_do_attack` selects and advances the ordered chain; the buffer may fire only after `_attack_in_progress` is false and combo recovery is clear; `attack_end` closes the current attack.

## Target adapter boundary

The proof uses current Pose Lab main `51ac775612ea0aa1b26e7af7104d0c858f1d0f84` and reads two locked recipes without changing them:

- `horizontal-strike.recipe.json`: semantic cutover is the end of `stab-contact`, 320 ms; complete visual presentation is 650 ms.
- `attack2-uppercut.recipe.json`: next ordered representation.

`src/combat/gravity-buffered-chain-adapter.js` owns combat cutover. The recipes remain presentation data. No pose, exposure, deformation, effect, hitbox, or damage value becomes combat authority.

## Executed proof

Command:

```sh
node tools/test_gravity_buffered_chain_parity.mjs \
  --donor-player /path/to/gravity-fist/scripts/player.gd
```

Observed trace:

```text
0 ms   horizontal strike starts; chain index = 1
200 ms one next attack is buffered; duplicate input remains the same one-slot buffer
319 ms horizontal strike remains active; next attack has not started
320 ms horizontal semantic attack ends
320 ms buffer is consumed once
320 ms uppercut starts; chain index = 2
320 ms horizontal presentation is preempted with 330 ms of visual recovery remaining
```

A second run stretched horizontal presentation from 650 ms to 950 ms while leaving semantic `attack_end` at 320 ms. The next attack still started at the 320 ms boundary. Presentation duration therefore did not acquire combat authority.

## Runtime and human evidence boundary

The ES module executed in the target repository against the target recipe bytes. Donor and target SHA-256 values matched the sealed contract. This proves deterministic state-transition parity in the adapter.

No visual or feel claim is involved, so human review is not required for this verdict. A later playable integration must separately test input delivery, hitboxes, damage, animation readability, hosted/runtime bytes where applicable, and Drew's feel verdict.

## Genuine delta

The mapping of Vanguard Horizontal Slash's semantic end to the end of `stab-contact` is target adapter data. Gravity Fist supplies the buffering and cutover rule, not that target-specific 320 ms value.

## T20 PARITY VERDICT

**PROVEN FOR ONE PROPERTY.** `buffered-standard-chain-cutover` is inherited-by-default: one standard attack may be buffered during an active standard attack; it cannot start before semantic `attack_end`; the first eligible update at or after that boundary consumes it once and starts the next ordered move.

T20 is validated for this property only. It does not yet universalize every Gravity Fist combat behavior, and it does not promote Thirdskin or Pose Lab animation data into combat authority.

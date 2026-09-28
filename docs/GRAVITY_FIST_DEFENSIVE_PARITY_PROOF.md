# Gravity Fist Defensive Parity Proof 02

## Result

`directional-block-early-counter-upgrade` is proven at machine-parity scope.

Gravity Fist does not implement a separate perfect-parry input. It implements one live, directional Block state. A hit from the faced side is denied throughout the 1,000 ms Block. If that hit arrives at or before 500 ms, it additionally ends Block, restores the standard-chain position preserved at Block entry, starts the catalogued Headbutt once, interrupts/stuns the attacker, and clears enemy attack ownership for a 3,000 ms offense lockout. At 501 ms, the same facing hit is an ordinary block: damage is still denied, but no counter or global parry lockout begins. Rear hits and hits after Block expires are not denied.

This is a combat-state result. It does not accept animation, VFX, input feel, hitbox geometry, or balance.

## Donor authority

- Repository: `Valar05/gravity-fist`
- Revision: `e89c2adf671b06af4ce6a6c1d3f0118e68a6c274`
- `scripts/player.gd` blob `47088e150126f99a59fd25cfc6e417d374ad2d80`, SHA-256 `851aab158c7b5ccedecd6193e5bf11d5fd75e7337d5f5911e8c489b46a16a262`
- `scenes/ai_controller.gd` blob `6f1fb8f0db6ea6a7d198c7f284748fee3db59f3f`, SHA-256 `164c9ab759ad1b45a010dd14c7aa5ed22a0a0373435d3b221839e89357b28a86`
- `scenes/ai_conductor.gd` blob `2362fe7ecc15c40ea2baa1f2065cfa82a5d77fd1`, SHA-256 `52da190f771bdb7a64eae4035b2142480d041d13514a09e190adbd1327cb9879`
- `player_attacks.json` blob `54c4b02bc454b86a2c01c7237000befaf03d434d`, SHA-256 `0f1ef578b2d536c2b4ea597a5554ee863d5dd0590b203fbd39265cd3ae7373e5`

### Recovered donor behavior

| Question | Source answer |
|---|---|
| What enables defense? | A recognized horizontal swipe reaches `_handle_horizontal_swipe`; stomp and Superman Punch have contextual priority, otherwise `_start_block(direction_sign)` executes immediately. |
| What state enables parry? | `_is_blocking` must be true and the attacker must be on the faced X side. Parry is the early branch of Block, not a separate state or input. |
| What timing exists? | Block lasts 1.0 s. The counter comparison is inclusive: `_block_elapsed <= 0.5`. |
| What happens on success? | The enemy hit is consumed with no player damage; the attacker is stunned 2.5 s, receives at least 1.0 s attack lockout, loses permission, resets its chain, and exits its attack. Block ends without locomotion; Headbutt starts; the preserved player chain index is restored; all enemy attack ownership is cleared for 3.0 s. |
| What happens after the counter window? | A correctly faced hit remains blocked for the rest of the Block state, including attacker interruption/stun, but it starts no Headbutt and no conductor-wide parry lockout. |
| What happens from behind or after expiry? | `try_block_hit` returns false, so the enemy proceeds to `take_damage`. |
| Is block distinct or fallback? | Block is a distinct timed `_is_blocking` state. The early counter is an upgrade inside it. The ordinary late block is the fallback. |
| What authorizes the counter? | Enemy hit resolution calls `try_block_hit`; a facing hit while block elapsed is within the early window calls `_start_special_counter_attack`. No second player input authorizes it. |
| Can presentation continue? | The successful transition explicitly ends Block before starting Headbutt, so Block presentation cannot remain state authority. Counter presentation/recovery may be shorter or longer than the 0.66 s Headbutt semantic duration in the target, but it cannot change that combat boundary. |
| Buffered or live? | Live. The swipe calls Block directly. No block buffer exists. While Headbutt is active, `_can_cancel_current_special_into_block` rejects another Block, and no rejected input is retained. |

The pinned attack catalog contains `Headbutt` with `attack_end = 0.66`. The proof intentionally does not generalize `_consume_special_attack` fallback behavior to a catalog where Headbutt is absent.

## Target adapter boundary and frozen properties

The target base is Pose Lab `349c5b2c4c249bf9e3d041548c74cc8d75b66453`. Only `src/combat/gravity-defensive-parity-adapter.js` owns the proof state. No production input router or broad combat runtime was added.

The existing `shoulder-charge.recipe.json` is a read-only Vanguard presentation fixture (blob `6f44aad42f96b39187b4ce90d9cae52d06f04e9d`, SHA-256 `4b07e1b35cbf52cd034f7431a425c8f09e89880546464151a8a001f7801d0a7a`, 610 ms). Its heavy-counter framing makes it a useful target-side timing fixture, but it is not reclassified as Headbutt, accepted as the final counter, or promoted into combat authority.

The expanded atlas, shoulder-charge recipe, procedural preview/runtime, review shell, prior T20 adapter, and all accepted/quarantined animation artifacts were locked before implementation. Their hashes are sealed in `campaigns/gravity-defensive-parity.contract.json` and checked by the executable proof.

## Executed traces

Command:

```sh
node tools/test_gravity_defensive_parity.mjs --donor-root /path/to/gravity-fist
```

Boundary traces:

```text
0 ms    live right-facing Block starts; standard-chain index 3 is preserved
500 ms  facing enemy hit is consumed; damage denied
500 ms  Block ends; chain index 3 restored; Headbutt starts exactly once
500 ms  attacker is interrupted/stunned; global enemy offense locked until 3500 ms
500 ms  another Block request is rejected live and is not buffered
1110 ms target 610 ms counter presentation ends; counter semantic remains active
1160 ms Headbutt semantic attack_end; combat returns idle; no rejected Block appears
```

```text
0 ms    live left-facing Block starts
501 ms  facing hit is consumed; damage denied
501 ms  ordinary Block continues; no Headbutt; no global parry lockout
1000 ms Block expires
```

Separate traces prove that a rear hit at 200 ms and a facing hit after the 1,000 ms expiry remain damage-authorized.

## Presentation independence

With the actual 610 ms Vanguard presentation fixture, visuals finish 50 ms before the donor Headbutt semantic end and combat remains countering. In a second proof instance, presentation is stretched to 960 ms; combat still ends at 660 ms after counter start while presentation continues for another 300 ms. Thus animation duration can neither shorten nor extend the combat transition.

This is not a visual acceptance claim. No review URL is required because no animation, pose, atlas, VFX, or visible runtime bytes changed. A later playable integration must separately prove gesture delivery, spatial facing, collision/hitbox behavior, animation mapping, hosted/runtime bytes if applicable, and Drew's feel judgment.

## Genuine target-specific delta

- The final Vanguard defensive gesture and input routing.
- The actual block and counter representations; shoulder charge is only a proof fixture.
- Hitbox geometry and attacker-side calculation in the eventual game runtime.
- Damage, healing, balance, VFX, audio, readability, and feel.
- Whether donor timing values remain final balance values. This proof inherits the state topology and boundary behavior, and pins current donor values for parity; later tuning must be explicit delta rather than silent redesign.

## T20 DEFENSIVE PARITY VERDICT

**PROVEN FOR ONE DEFENSIVE PROPERTY.** `directional-block-early-counter-upgrade` is inherited-by-default: directional Block denies only facing hits while active; a facing hit at or before the inclusive early boundary upgrades that same block into one automatic counter plus global offense lockout; later facing hits remain ordinary blocks; rear and post-expiry hits remain damage-authorized; Block input is live-only and cannot queue through the counter.

Target-specific work remains input mapping, spatial/hitbox integration, visual representation, VFX, audio, balance, and human feel acceptance.

Together with the earlier `buffered-standard-chain-cutover` proof, this validates T20 across both offensive sequencing and defensive hit resolution. That is enough to promote T20 from an untested general hypothesis to a **bounded cross-domain inheritance rule with two concrete proofs**, but not enough to claim that all donor systems transfer unchanged. Every additional inherited property still requires its own source pin, adapter boundary, and parity evidence.

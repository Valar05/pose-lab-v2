# Heady grounded IK v03.1  |  ARTIFACT DELIVERY FIX

Successor to installed v03, which performed the calculation and committed the packet but failed to copy or open any image on Android. This fixes delivery only.

DOES NOT rerun the 13-tick computation, old v05–v07 campaigns, any walking animation, rig, meshes or weights.

The review board contains (A) the earlier v02 textured static three-pose visualization and (B) the v03 numerical 13-tick graph. They are not the same execution; do not imply v03 produced textured dynamic frames.

First invocation (after downloading uniquely named v03.1 zip to Android Downloads) uses INSTALL_AND_DELIVER_v03_1.py as the single bootstrap. It verifies the complete packet and existing installed v03, commits versioned evidence + runner locally, publishes the images to BOTH Android Pictures and Downloads, attempts media scan and termux-open, prints a full summary, then commits the actual delivery receipt in the same repo folder. It never pushes.

Visible output and acceptance are separate. `OPEN_REQUESTED` is only a successful intent dispatch, not proof the user viewed it. File delivery is proven by full SHA256 parity at both public destinations.

Useful persistent repo runner: `bash tools/campaigns/heady_grounded_runtime_v03_1.sh` (redeliver/open only; no recalculation).

Previous v03 local commit is preserved. Verify real source SHA 8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27.

HEADY 03.10.6: Combined weight-isolation evidence + Three.js/WebXR hair physics candidate.

Validated locally:
- original 52-joint source SHA and derived 59-joint GLB SHA
- all six walking chains independently articulate with head fixed
- selected hair has exactly zero measured leg-induced motion
- real source-skinned proof GIF and numerical per-frame receipt

Runtime supplied:
- heady-hair-momentum.js: inertial Verlet point chain, no rest-angle spring
- review.html: Three.js/WebXR browser demo; motion is procedural diagnostic legs, NOT accepted v03.10.4 gait
- base and tapered physics chain toggles; optional rear leg collisions.

NOT claimed:
- full v03.10.4 locomotion/bank replay
- XR headset timing or real browser result
- entire hairstyle selection has human acceptance; mask is conservative
- full mesh/leg collision correctness; capsule/sphere approximations are provisional
- exported baked physics animation or live physically correct sim.

Target: host folder under pose-lab-v2/tools/heady/campaigns/grounded_ik_v03/review_v03_10_6.
Launch viewer over local HTTP, e.g. an already existing Termux HTTP server; file:// won't load GLB with GLTFLoader.

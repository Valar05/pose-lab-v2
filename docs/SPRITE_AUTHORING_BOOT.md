# Pose Lab sprite authoring: mandatory context and source gate

## Scope and ownership

Pose Lab owns **reusable sprite-animation technique**: sparse/single-frame motion, alpha integrity, scale and extraction, deformable materials, failure lessons, and deterministic campaign execution. The specific game repository owns a character's actual appearance, canonical artwork, costume, world/camera requirements and gameplay needs. Organ owns general-purpose deterministic execution. Its older animation records were imported to Pose Lab byte-for-byte as provenance; Organ copies are archival, not a second live authority. Entourage may link projects, not duplicate animation code or art bibles.

## Every sprite authoring turn

1. Read this repository's **actual** current \`AGENTS.md\`, \`docs/POSE_LAB_CAMPAIGN_RULES.md\`, \`docs/POSE_IS_GOD.md\`, \`docs/POSE_CAMPAIGN_FRAMEWORK.md\`, active campaign contract and **relevant original sprite sheet/image itself**. Text summaries and logs saying READ are NOT evidence that the visual source was inspected.
2. Call \`python3 tools/campaigns/sprite_doctrine_boot.py --task TASK --contract campaigns/ACTIVE.contract.json --output PATH\`. For new authored sprite or pose use \`--task sprite-author --character-manifest PATH\` and supply a real, hash-verified CHARACTER reference image.
3. Read the emitted context packet, not merely its path or SHA. It contains actual contents of normative docs, relevant topic doctrine, scope labels and the campaign contract. A shell subprocess cannot inject a packet into ChatGPT context. The model doing the work MUST explicitly consume the packet or read the same authoritative files through its repository connector.
4. Before any image generation, assign **typed, property-specific reference roles**: CHARACTER/IDENTITY, STYLE, POSE/CHOREOGRAPHY, WEAPON, EXAGGERATION, LAYOUT. A pose reference never becomes character/costume authority. Before generation visually inspect canonical art, not just filename and hashes. If reference cannot be viewed, stop and disclose the blocker.
5. Character-specific exemplars (April's one-frame idle and slow jog) are examples of successful **April** techniques, not universal body constraints. A supernatural liquid body may deliberately deform differently from April's planted boots. Preserve exact accepted source identities, no independent scale normalization or downstream compensation for bad source geometry.
6. Current campaign contract owns mutable paths, locked properties, current SHA, and human visual verdict. New candidates remain quarantined until explicit human review of the commissioned Pose Lab V2 runtime.
7. Do not silently revert a rejection: Serin's earlier split-sprite air pose was rejected, and the new single-frame midair source is not yet accepted. Preserve the approved ground wave, snap and original blinking. The current character-specific truth must be read from the active campaign rather than embedded in these universal laws.

## Choosing the topic

\`doctrine/animation/doctrine-index-v1.json\` lists topic types. \`--task auto --contract ...\` performs deterministic task inference for legacy campaign boot; explicit \`--task sprite-author\` or other type is preferred when creating a new asset. Every type always loads the core rules plus the general sparse-motion doctrine, and only relevant additional documents. April exemplars are labeled non-normative. The index is the sole authority for topic-file selection.

## Evidence boundaries

A hash validates bytes, not an artistic match. A context packet validates that correct text was assembled, **not** that an agent read it or that a generated image obeyed it. Unit tests, GitHub Actions, and HTTP responses do not constitute visual acceptance. When working in a conversational executor, use the actual connector to read the packet documents. When working via a terminal, write the packet and pass its contents into the working agent before source mutation. Never claim that an unread packet is a successful context load.

### CLI examples

\`\`\`bash
python3 tools/campaigns/sprite_doctrine_boot.py --task idle --output /tmp/pose-idle-context.md
python3 tools/campaigns/sprite_doctrine_boot.py --task jump --contract campaigns/serin-unified-locomotion-v1.contract.json --output /tmp/pose-jump-context.md
python3 tools/campaigns/sprite_doctrine_boot.py --task sprite-author --character-manifest docs/characters/serin-reference-manifest.json --output /tmp/pose-serin-author-context.md
\`\`\`

The last example is schematic. A character manifest is valid only if the actual referenced art exists at the verified paths and hashes. Do not manufacture a manifest to get past the gate.

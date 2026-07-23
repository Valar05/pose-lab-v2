#!/usr/bin/env python3
"""Exercise the ledger drift gate with one real mutation."""

from __future__ import annotations

import copy
import json

from compare_crimson_orientation_ledgers import canonical, compare, differences
from crimson_orientation_space import load_ledger


ledger = load_ledger()
assert compare(ledger, copy.deepcopy(ledger))["ok"] is True

run_only = copy.deepcopy(ledger)
run_only["createdAt"] = "later"
run_only["probe"]["exportedGlb"]["sha256"] = "different-container"
assert canonical(ledger) == canonical(run_only)

drifted = copy.deepcopy(ledger)
drifted["bones"]["RightArm"]["bendGuidance"]["preferredBendAxis"]["sign"] = 1
paths = differences(canonical(ledger), canonical(drifted))
assert paths == ["$.bones.RightArm.bendGuidance.preferredBendAxis.sign: -1 != 1"]
try:
    compare(ledger, drifted)
except AssertionError as error:
    assert "RightArm.bendGuidance.preferredBendAxis.sign" in str(error)
else:
    raise AssertionError("mutated bend sign did not trip the ledger drift gate")

print(json.dumps({
    "ok": True,
    "check": "crimson-orientation-ledger-comparison",
    "ignoredRunMetadata": ["createdAt", "probe.exportedGlb"],
    "rejectedMutation": "RightArm preferred bend sign",
}, indent=2))

#!/usr/bin/env python3
import json,sys,hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
recipe=ROOT/"public/assets/vanguard/procedural/attack5.recipe.json"
if not recipe.exists(): raise SystemExit("STOP: attack5 recipe missing")
r=json.loads(recipe.read_text())

# Current Attack 5 identity contract
assert r["id"]=="vanguard-attack5-procedural-v1"
assert r["sources"]["coil"]["cell"]==65
assert r["sources"]["drive"]["cell"]==75
assert r["sources"]["finish"]["cell"]==87
assert r["motionAuthority"]["kind"]=="Vanguard-3D-SwordAttack5"
assert r["motionAuthority"]["nativeTotalMs"]==1000
assert sum(int(p["durationMs"]) for p in r["phases"])==1000

# Effect must be one cell, never the whole atlas.
fx=r["sources"][r["effect"]["source"]]
assert fx["kind"]=="effect-atlas-cell", "STOP: Attack5 effect must be one explicit atlas cell"
es=r["effectAtlases"][fx["atlas"]]
assert es["columns"]>1 or es["rows"]>1
assert isinstance(fx["cell"],int)

# No heuristic anchor on authored Attack5 body poses.
for name in ("coil","drive","finish"):
    s=r["sources"][name]
    assert s["anchorMode"]!="ground-contact-center", f"STOP: {name} uses heuristic ground-contact-center"

print("POSE_CAMPAIGN_GUARD_OK")
print("attack5_cells=65,75,87")
print("timing_authority=SwordAttack5")
print("duration_ms=1000")
print("effect_cell="+str(fx["cell"]))

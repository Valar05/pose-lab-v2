#!/usr/bin/env python3
"""Heady v03 repo runner. Original: bash tools/campaigns/heady_grounded_runtime_v03.sh show"""
import sys,json,hashlib,subprocess
from pathlib import Path
mode=sys.argv[1] if len(sys.argv)>1 else 'show'
p=Path(sys.argv[2]).resolve() if len(sys.argv)>2 else Path(__file__).resolve().parent
hashes=json.loads((p/'FILES_SHA256.json').read_text())
for file,want in hashes.items():
    f=p/file
    if not f.is_file() or hashlib.sha256(f.read_bytes()).hexdigest()!=want:
        raise SystemExit('FAIL FILE_MISSING_OR_MODIFIED '+str(f))
r=json.loads((p/'RUNTIME_KINEMATIC_RECEIPT.json').read_text())
if mode=='recompute':
    import tempfile
    with tempfile.TemporaryDirectory(prefix='heady_ik_v03_') as tmp:
        result=subprocess.run([sys.executable,str(p/'grounded_runtime_13tick.py'),str(p/'Meshy_AI_Character_output (1).glb'),tmp],check=False)
        if result.returncode:raise SystemExit('RECOMPUTE_FAILED='+str(result.returncode))
        z=json.loads((Path(tmp)/'RUNTIME_KINEMATIC_RECEIPT.json').read_text())
        print('RECOMPUTED='+z['status'])
elif mode!='show':raise SystemExit('Usage: ... show|recompute')
print('HEADY_GROUNDED_IK_V03='+r['status'])
print('SOURCE='+r['source_sha256'])
print('TICKS='+str(r['steps']))
print('BODY_SHIFT='+str(r['body_final_shift']))
print('SKINNED_FOOT_MAX_DRIFT='+str(r['max_foot_drift']))
print('MIN_SKINNED_VERTEX_Y='+str(r['worst_floor_y']))
print('REAL_ENGINE_PHYSICS=NOT_RUN')
print('ANIMATION=NOT_CREATED')
print('EVIDENCE='+str(p/'Runtime_13Tick_FootLock.png'))
print('STATUS=COMPLETE_OFFDEVICE_EVIDENCE_NO_HUMAN_ACCEPTANCE')

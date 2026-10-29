#!/usr/bin/env python3
from pathlib import Path
import sys,hashlib,json,csv
from PIL import Image
p=Path(__file__).resolve().parent
j=json.loads((p/'RESULT_RECEIPT.json').read_text())
assert j['version']=='03.4.0' and j['original_52_joint_rig_unchanged']
assert hashlib.sha256((p/'Meshy_AI_Character_output (1).glb').read_bytes()).hexdigest()==j['source_sha256']
rows=list(csv.DictReader((p/'OutAndBack_37Ticks.csv').open()))
assert len(rows)==37 and rows[0]['phase']=='PLANTED_OLD' and rows[-1]['phase']=='PLANTED_OLD_RETURNED'
assert {r['phase'] for r in rows}=={'PLANTED_OLD','SWING_OUT','PLANTED_NEW','SWING_BACK','PLANTED_OLD_RETURNED'}
assert j['return_original_world_anchor_error']<.003 and j['five_planted_anchor_drift_max']<.004
assert j['swing_out_peak_lift']>.05 and j['swing_back_peak_lift']>.05
assert all(max(a)>3 for a in j['right_middle_chain_per_bone_angle_variation_deg_xy'])
for name in ['SWING_OUT','SWING_BACK']:
 y=[float(r['target_y']) for r in rows if r['phase']==name]
 assert all(abs(b-a)>1e-6 for a,b in zip(y,y[1:])), 'HOVER_PLATEAU:'+name
with Image.open(p/'HEADY_GroundedIK_OutAndBack_v03_4.gif') as im:
 assert im.n_frames==37
for name, digest in json.loads((p/'FILES_SHA256.json').read_text()).items():
 q=p/name
 assert q.is_file() and hashlib.sha256(q.read_bytes()).hexdigest()==digest,'FILE_HASH_MISMATCH '+name
print('HEADY_V03_4=PASS_ARCHIVE_EVIDENCE_AND_TWO_DIRECTION_STEP_NOT_HUMAN_ACCEPTED')

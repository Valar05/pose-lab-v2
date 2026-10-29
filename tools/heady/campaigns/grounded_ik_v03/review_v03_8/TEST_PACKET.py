from pathlib import Path
import csv,json,hashlib
p=Path(__file__).resolve().parent
rows=list(csv.DictReader((p/'overlap_85ticks.csv').open()))
keys=['left_front','left_middle','left_rear','right_front','right_middle','right_rear']
assert len(rows)==85
assert all(sum(r[k+'_contact']=='SWING' for k in keys)==int(r['swing_count']) for r in rows)
assert sum(int(r['swing_count'])==3 for r in rows)>=40
assert sum(int(r['swing_count'])==2 for r in rows)>0
assert max(int(r['swing_count']) for r in rows)==3
assert all(float(b['root_x'])>float(a['root_x']) for a,b in zip(rows,rows[1:]))
assert abs(float(rows[-1]['root_x'])-.42)<1e-9
assert min(float(r['support_margin_proxy']) for r in rows)>.05
assert max(float(r['stance_drift_max']) for r in rows)<.0002
assert min(float(r['mesh_min_y']) for r in rows)>-.001
for k in keys:assert sum(r[k+'_contact']=='SWING' for r in rows[:24])>0
assert hashlib.sha256((p/'Meshy_AI_Character_output (1).glb').read_bytes()).hexdigest()=='8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27'
rec=json.loads((p/'RESULT_RECEIPT.json').read_text())
assert rec['version']=='03.8.0' and rec['max_simultaneous_swing']==3 and rec['visual_acceptance']=='PENDING'
from PIL import Image
im=Image.open(p/'Heady_v03_8_OverlappingTripod_Candidate.gif');assert im.n_frames>=40
print('HEADY_V038_TEST=PASS_TRIPLE_OVERLAPPING_LIFT_GT_40_FRAMES_WORLD_BODY_MOVES_6_TOES_LOCKED_SOURCE_INTACT')

from pathlib import Path
import json,csv,hashlib
p=Path(__file__).resolve().parent
rows=list(csv.DictReader((p/'tripod_49ticks.csv').open()))
assert len(rows)==49
assert all(float(a['root_x'])<float(b['root_x']) for a,b in zip(rows,rows[1:]))
assert abs(float(rows[-1]['root_x'])-.28)<1e-9
groups={'A':{'left_front','left_rear','right_middle'},'B':{'right_front','right_rear','left_middle'}}
for r in rows:
 s={l for l in groups['A']|groups['B'] if r[l+'_contact']=='SWING'}
 assert s in (set(),groups['A'],groups['B']),(r['tick'],s)
 assert r['swing_group']==('A' if s==groups['A'] else 'B' if s==groups['B'] else 'NONE')
assert any(r['swing_group']=='A' for r in rows) and any(r['swing_group']=='B' for r in rows)
receipt=json.loads((p/'RESULT_RECEIPT.json').read_text())
assert receipt['status']=='SYNCHRONIZED_TRIPOD_CANDIDATE_GENERATED'
assert receipt['source_preserved'] and receipt['visual_acceptance']=='PENDING'
assert hashlib.sha256((p/'Meshy_AI_Character_output (1).glb').read_bytes()).hexdigest()==receipt['source_sha256']
assert receipt['minimum_proxy_margin']>0.05
assert receipt['max_stance_drift']<=0.0002
assert receipt['minimum_mesh_y']>=-0.001
print('HEADY_V036_TEST=PASS THREE_CONCURRENT_SWINGS REAL_ROOT_TRAVEL SOURCE_LOCK FOOT_LOCK')

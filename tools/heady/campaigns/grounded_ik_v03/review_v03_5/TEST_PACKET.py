#!/usr/bin/env python3
"""Independent file/phase/provenance validation, no Blender dependencies."""
import sys,csv,json,hashlib,struct
from pathlib import Path
p=Path(__file__).resolve().parent
src=(p/'Meshy_AI_Character_output (1).glb').read_bytes()
assert hashlib.sha256(src).hexdigest()=='8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27'
assert src[:4]==b'glTF';n,t=struct.unpack_from('<II',src,12);j=json.loads(src[20:20+n]);assert len(j['skins'][0]['joints'])==52 and not j.get('animations')
tr=json.loads((p/'wave_bone_tracks.json').read_text());assert tr['frame_count']==73 and tr['source_sha256']==hashlib.sha256(src).hexdigest()
assert len(tr['angles_by_tick'])==73 and len(tr['root_translations_xyz'])==73
ch=tr['bone_chains'];assert len(ch)==6 and sorted(map(len,ch.values()))==[3,3,3,3,4,4]
rows=list(csv.DictReader((p/'wave_73ticks.csv').open()));assert len(rows)==73
order=['left_rear','right_rear','left_middle','right_middle','left_front','right_front']
assert tr['wave_order']==order
for i,row in enumerate(rows):
 assert int(row['tick'])==i and int(row['stance_count'])>=5 and float(row['stance_drift_max'])<.001
 assert float(row['support_margin_proxy'])>.05 and float(row['mesh_min_y'])>-.001
 if i in (0,36,72):assert abs(float(row['root_x'])-.095*i/36)<1e-8
for t in range(72):
 k=t%36;expected=order[k//6]
 # first frame of each slot counts as swing even at h=0; right-front after 35.
 assert rows[t]['swing']==expected,(t,rows[t]['swing'],expected)
assert (p/'Heady_v03_5_SixLeg_Wave_Candidate.gif').read_bytes()[:3]==b'GIF'
print('TEST_PACKET=PASS');print('SIX_CHAIN_GROUNDED_WAVE=OFFDEVICE_VERIFIED');print('BLENDER_EXECUTED=NO');print('ORIGINAL_HASH='+hashlib.sha256(src).hexdigest())

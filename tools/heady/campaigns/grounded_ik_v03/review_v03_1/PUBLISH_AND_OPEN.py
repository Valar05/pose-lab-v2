#!/usr/bin/env python3
"""Stable v03.1 Pose Lab visual delivery runner. Invocation: python3 PUBLISH_AND_OPEN.py
No model edits, regeneration, destructive operations, or GitHub pushes.
"""
from pathlib import Path
import sys,json,hashlib,subprocess,shutil,os,tempfile
HERE=Path(__file__).resolve().parent
FILES=['Heady_GroundedIK_v03_1_ReviewBoard.png','Rest_and_Three_Poses_v02.png','Foot_Lock_13_Ticks_v03.png','Ground_Collider_Foot_Map_v02.png']

def sha(p):
 h=hashlib.sha256();
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1<<20),b''):h.update(chunk)
 return h.hexdigest()
def validate():
 manifest=json.loads((HERE/'FILES_SHA256.json').read_text())
 for name,expected in manifest.items():
  p=HERE/name
  if not p.is_file() or sha(p)!=expected:raise RuntimeError('PACKET_READBACK_FAIL '+name)
 root=HERE.parents[3]  # Expected ??? use actual repo via ancestor search instead
 p=HERE.parent/'Meshy_AI_Character_output (1).glb'
 if not p.is_file() or sha(p)!='8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27':
  raise RuntimeError('ORIGINAL_52_JOINT_GLB_MISSING_OR_CHANGED')
 old=HERE.parent/'Runtime_13Tick_FootLock.png'
 if not old.is_file() or sha(old)!=sha(HERE/'Foot_Lock_13_Ticks_v03.png'):
  raise RuntimeError('BASELINE_V03_GRAPH_MISMATCH')
 return manifest

def safe_atomic_copy(src,dst):
 dst.parent.mkdir(parents=True,exist_ok=True)
 s=sha(src)
 if dst.exists():
  if not dst.is_file() or sha(dst)!=s:raise RuntimeError('PUBLIC_NAME_COLLISION_DIFFERENT_BYTES '+str(dst))
  return 'EXISTING_VERIFIED',s
 with tempfile.NamedTemporaryFile(mode='wb',dir=dst.parent,prefix='.heady-v03-1-',delete=False) as f:
  temp=Path(f.name)
  with src.open('rb') as stream:shutil.copyfileobj(stream,f)
  f.flush();os.fsync(f.fileno())
 try:
  if sha(temp)!=s:raise RuntimeError('TEMP_READBACK_SHA_MISMATCH')
  os.replace(temp,dst)
 except Exception:
  temp.unlink(missing_ok=True);raise
 if sha(dst)!=s:raise RuntimeError('DELIVERY_READBACK_SHA_MISMATCH '+str(dst))
 return 'COPIED_VERIFIED',s

def run():
 print('CAMPAIGN=HEADY_GROUNDED_IK VERSION=03.1.0 STAGE=PUBLIC_VISUAL_DELIVERY',flush=True)
 print('MODEL_MUTATION=NO NUMERICAL_RERUN=NO REMOTE_PUSH=NO',flush=True)
 validate()
 home=Path.home()
 dirs=[]
 for p in [home/'storage/pictures',home/'storage/downloads']:
  if not p.is_dir():
   raise RuntimeError('TERMUX_STORAGE_LOCATION_MISSING '+str(p)+' (termux-setup-storage may be required)')
  dirs.append(p)
 receipts=[]
 for folder in dirs:
  for name in FILES:
   target=folder/name
   status,digest=safe_atomic_copy(HERE/name,target)
   receipts.append({'path':str(target),'sha256':digest,'status':status})
  print('PUBLIC_DELIVERY_VERIFIED='+str(folder),flush=True)
 target=dirs[0]/FILES[0]
 media=[]
 if shutil.which('termux-media-scan'):
  for item in [dirs[0]/FILES[0],dirs[1]/FILES[0]]:
   try:
    p=subprocess.run(['termux-media-scan',str(item)],capture_output=True,text=True,timeout=25)
    media.append({'target':str(item),'status':'REQUESTED' if p.returncode==0 else 'FAILED','exit_code':p.returncode,'stderr':p.stderr[-220:]})
   except Exception as ex:media.append({'target':str(item),'status':'FAILED','reason':str(ex)})
 else:media.append({'status':'UNAVAILABLE','reason':'termux-media-scan not installed; public file remains addressable'})
 opened={'status':'NOT_REQUESTED','path':str(target)}
 if shutil.which('termux-open'):
  try:
   p=subprocess.run(['termux-open',str(target)],capture_output=True,text=True,timeout=25)
   opened={'status':'OPEN_REQUESTED' if p.returncode==0 else 'OPEN_COMMAND_FAILED','exit_code':p.returncode,'stderr':p.stderr[-300:],'path':str(target)}
  except Exception as ex:opened={'status':'OPEN_COMMAND_FAILED','reason':str(ex),'path':str(target)}
 else:opened={'status':'OPEN_COMMAND_UNAVAILABLE','path':str(target)}
 summary={'campaign':'HEADY_GROUNDED_IK','version':'03.1.0','status':'PUBLISHED_VERIFIED_NEEDS_HUMAN_REVIEW','source_original_untouched':True,'model_mutation':False,'animation_created':False,'published':receipts,'media_scan':media,'viewer':opened,'repo_review_dir':str(HERE),'human_acceptance':'PENDING'}
 # Receipt in repo belongs to installer, not to this runner. Runner prints outcome for immediate visibility.
 print('PUBLIC_IMAGE_COUNT_VERIFIED='+str(len(receipts)))
 print('PICTURES_REVIEW='+str(target))
 print('DOWNLOADS_REVIEW='+str(dirs[1]/FILES[0]))
 print('OPEN='+opened['status'])
 print('MEDIA_SCAN='+','.join(m['status'] for m in media))
 print('REVIEW_STATUS=NEEDS_HUMAN_ACCEPTANCE',flush=True)
 return summary
if __name__=='__main__':
 try:
  result=run();print('MACHINE_RECEIPT='+json.dumps(result,sort_keys=True))
 except Exception as ex:
  print('STATUS=BLOCKED VISUAL_DELIVERY_DIAGNOSIS='+str(ex),flush=True)
  sys.exit(2)

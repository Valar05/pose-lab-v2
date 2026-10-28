#!/usr/bin/env python3
# HEADY_GROUNDED_IK 03.2.0 — ORIGINAL INSTALL/COMMIT/PUBLISH INVOCATION:
# Download `Heady_GroundedIK_v03_2_WorldFixed_Results.zip` to Android Downloads.
# python - <<'PY'
# from pathlib import Path
# import hashlib,zipfile,sys
# p=Path.home()/'storage/downloads/Heady_GroundedIK_v03_2_WorldFixed_Results.zip'
# assert p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()=='<SHA_IN_CHAT_COMMAND>'
# sys.argv=['INSTALL_AND_DELIVER_v03_2.py',str(p)]
# exec(compile(zipfile.ZipFile(p).read('INSTALL_AND_DELIVER_v03_2.py'),'INSTALL_AND_DELIVER_v03_2.py','exec'),{'__name__':'__main__'})
# PY
# Install packet, commit scoped repo changes, publish and attempt viewing in one call.
# No source model regeneration, no accepted animation mutation, no remote push.
from pathlib import Path
import sys,zipfile,hashlib,json,os,tempfile,shutil,subprocess,datetime,traceback
VERSION='03.2.0'
REL='tools/heady/campaigns/grounded_ik_v03/review_v03_2'
BASE='tools/heady/campaigns/grounded_ik_v03'
ZIPNAME='Heady_GroundedIK_v03_2_WorldFixed_Results.zip'
SOURCE='8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27'
PUBLIC=['GROUND_IK_WorldAnchored_BodyMotion.gif','WorldFixed_ThreeStep_Comparison.jpg','Foot_Lock_Residuals_Zoom.png','Static_Pose_Tick_10.png']

def sha(b):return hashlib.sha256(b).hexdigest()
def sha_file(p):
 h=hashlib.sha256();
 with p.open('rb') as stream:
  for b in iter(lambda:stream.read(1<<20),b''):h.update(b)
 return h.hexdigest()
def fatal(e):
 print('CAMPAIGN_STATUS=BLOCKED',flush=True)
 print('LAST_FAILURE='+str(e),flush=True)
 print('OLD_V03_RECOMPUTATION=NOT_ATTEMPTED',flush=True)
 print('GITHUB_PUSH=NOT_ATTEMPTED',flush=True)
 raise SystemExit(2)
def git(repo,*arg,allowed_fail=False):
 r=subprocess.run(['git','-C',str(repo),*arg],capture_output=True,text=True,timeout=45)
 if r.returncode and not allowed_fail:raise RuntimeError('GIT '+str(arg)+' '+r.stderr.strip()[-700:])
 return r

def atomic_write(to,data):
 to.parent.mkdir(parents=True,exist_ok=True)
 if to.exists():
  if not to.is_file() or sha_file(to)!=sha(data):raise RuntimeError('IMMUTABLE_DESTINATION_CONFLICT '+str(to))
  return 'REUSED_VERIFIED'
 with tempfile.NamedTemporaryFile(dir=to.parent,prefix='.heady032-',delete=False) as f:
  tmp=Path(f.name);f.write(data);f.flush();os.fsync(f.fileno())
 try:os.replace(tmp,to)
 except Exception:tmp.unlink(missing_ok=True);raise
 if sha_file(to)!=sha(data):raise RuntimeError('WRITE_READBACK_MISMATCH '+str(to))
 return 'CREATED_VERIFIED'

def checkpoint(repo,relpaths,msg):
 # --only excludes unrelated prior staging. Scope must never include external paths.
 if any(not p.startswith(REL+'/') for p in relpaths):raise RuntimeError('COMMIT_SCOPE_BAD')
 if git(repo,'diff','--cached','--name-only','--',*relpaths).stdout.strip():raise RuntimeError('SCOPE_HAS_UNRELATED_STAGED_CHANGES')
 before=git(repo,'rev-parse','HEAD').stdout.strip()
 status=git(repo,'status','--porcelain','--',*relpaths).stdout.strip()
 if not status:return dict(status='UNCHANGED',head=before)
 git(repo,'add','--',*relpaths)
 r=git(repo,'commit','--only','-m',msg,'--',*relpaths)
 after=git(repo,'rev-parse','HEAD').stdout.strip()
 if after==before:raise RuntimeError('CHECKPOINT_COMMIT_HEAD_UNCHANGED')
 print('LOCAL_COMMIT='+after,flush=True)
 return dict(status='COMMITTED',head=after)

def findzip():
 if len(sys.argv)<2:raise RuntimeError('ZIP_PATH_REQUIRED')
 p=Path(sys.argv[1]).expanduser().resolve()
 if not p.is_file():raise RuntimeError('ZIP_NOT_IN_DOWNLOADS '+str(p))
 return p

def main():
 print('CAMPAIGN=HEADY_GROUNDED_IK VERSION='+VERSION,flush=True)
 print('MISSION=WORLD_FIXED_BODY_TRANSLATION_REVIEW_DELIVERY',flush=True)
 print('NO_OLD_CAMPAIGNS_RUN=TRUE MODEL_UNCHANGED=TRUE GITHUB_PUSH=FALSE',flush=True)
 zip_path=findzip();digest=sha_file(zip_path)
 print('ZIP='+str(zip_path),flush=True)
 print('ZIP_SHA256='+digest,flush=True)
 targets=[]
 if os.getenv('POSE_LAB_REPO'):targets.append(Path(os.environ['POSE_LAB_REPO']))
 targets += [Path.home()/'storage/documents/GodotProjects/pose-lab-v2',Path('/storage/emulated/0/Documents/GodotProjects/pose-lab-v2')]
 repo=next((p.resolve() for p in targets if (p/'AGENTS.md').is_file() and (p/BASE/'SOURCE_PACKET.zip').is_file()),None)
 if not repo:raise RuntimeError('CANONICAL_INSTALLED_POSE_LAB_V03_REPO_NOT_FOUND')
 if Path(git(repo,'rev-parse','--show-toplevel').stdout.strip()).resolve()!=repo:raise RuntimeError('GIT_ROOT_MISMATCH')
 existing=repo/BASE/'Meshy_AI_Character_output (1).glb'
 if not existing.is_file() or sha_file(existing)!=SOURCE:raise RuntimeError('V03_SOURCE_ORIGINAL_MISSING_OR_CHANGED')
 if git(repo,'var','GIT_AUTHOR_IDENT',allowed_fail=True).returncode:raise RuntimeError('GIT_AUTHOR_IDENT_MISSING')
 print('RESOLVED_REPO='+str(repo),flush=True)
 with zipfile.ZipFile(zip_path) as z:
  if z.testzip():raise RuntimeError('ZIP_CORRUPT')
  files=[n for n in z.namelist() if not n.endswith('/')]
  if len(files)!=len(set(files)):raise RuntimeError('DUPLICATE_ZIP_MEMBER')
  if any(n.startswith('/') or '..' in Path(n).parts for n in files):raise RuntimeError('UNSAFE_ZIP_MEMBER')
  allowed=lambda n:n=='INSTALL_AND_DELIVER_v03_2.py' or n.startswith(REL+'/')
  if any(not allowed(n) for n in files):raise RuntimeError('UNEXPECTED_PACKET_MEMBER')
  raw={n:z.read(n) for n in files}
 if raw.get('INSTALL_AND_DELIVER_v03_2.py')!=raw.get(REL+'/INSTALL_AND_DELIVER_v03_2.py'):raise RuntimeError('INSTALLER_REPO_BOOTSTRAP_MISMATCH')
 manifest=json.loads(raw[REL+'/FILES_SHA256.json'])
 for name,h in manifest.items():
  item=REL+'/'+name
  if sha(raw[item])!=h:raise RuntimeError('MANIFEST_HASH_MISMATCH '+item)
 if sha(raw[REL+'/Meshy_AI_Character_output (1).glb'])!=SOURCE:raise RuntimeError('SOURCE_HASH_MISMATCH')
 print('STAGE=INSTALL_COMPLETE_VERSIONED_PACKET',flush=True)
 files_in_repo=[]
 for n,bytes_ in raw.items():
  if n=='INSTALL_AND_DELIVER_v03_2.py':continue
  atomic_write(repo/n,bytes_);files_in_repo.append(n)
 packet_rel=REL+'/WHOLE_DISTRIBUTED_PACKET.zip'
 atomic_write(repo/packet_rel,zip_path.read_bytes());files_in_repo.append(packet_rel)
 for name in files_in_repo:
  if not (repo/name).is_file():raise RuntimeError('PACKET_INSTALL_READBACK_MISSING '+name)
 c1=checkpoint(repo,files_in_repo,'heady: grounded IK v03.2 world-fixed visual proof packet')
 print('STAGE=PUBLISH_VERIFIED_MEDIA',flush=True)
 copied=[]
 for dirname in ['pictures','downloads']:
  dest=Path.home()/'storage'/dirname
  if not dest.is_dir():raise RuntimeError('ANDROID_PUBLIC_FOLDER_INACCESSIBLE '+str(dest))
  for name in PUBLIC:
   origin=repo/REL/name
   target=dest/name
   how=atomic_write(target,origin.read_bytes())
   if sha_file(target)!=sha_file(origin):raise RuntimeError('PUBLIC_MEDIA_HASH_MISMATCH '+str(target))
   copied.append({'path':str(target),'hash':sha_file(target),'result':how})
  print('PUBLIC_'+dirname.upper()+'_VERIFIED='+str(dest),flush=True)
 if len(copied)!=8:raise RuntimeError('EIGHT_FILES_NOT_PUBLISHED')
 media=[]
 if shutil.which('termux-media-scan'):
  for entry in [copied[0]['path'],copied[4]['path']]:
   try:
    p=subprocess.run(['termux-media-scan',entry],capture_output=True,text=True,timeout=20)
    media.append('REQUESTED' if p.returncode==0 else 'FAILED:'+str(p.returncode))
   except Exception as e:media.append('FAILED:'+type(e).__name__)
 else:media.append('UNAVAILABLE')
 viewer='UNAVAILABLE'
 if shutil.which('termux-open'):
  try:
   p=subprocess.run(['termux-open',copied[0]['path']],capture_output=True,text=True,timeout=20)
   viewer='OPEN_REQUESTED_NOT_VISUALLY_CONFIRMED' if p.returncode==0 else 'OPEN_FAILED:'+p.stderr.strip()[-150:]
  except Exception as e:viewer='OPEN_FAILED:'+str(e)
 print('OPEN_REQUEST='+viewer,flush=True)
 print('MEDIA_SCAN='+','.join(media),flush=True)
 # Receipt created AFTER actual publication and readback; cannot assert viewer displayed it.
 result={'campaign':'HEADY_GROUNDED_IK','version':VERSION,'packet_sha256':digest,'status':'MEDIA_COPIED_AND_READBACK_VERIFIED','human_visual_acceptance':'PENDING','numerical_proof':'OFF_DEVICE_STATIC_11_POSITIONS','no_gait':True,'not_physics_engine':True,'published':copied,'viewer':viewer,'media_scan':media,'commit_packet':c1,'git_remote_push':'NOT_ATTEMPTED','previous_v03_commit_preserved':True}
 receipt=REL+'/ANDROID_DELIVERY_RECEIPT_v03_2.json'
 if (repo/receipt).exists():
  prior=json.loads((repo/receipt).read_text())
  if prior.get('version')!=VERSION or prior.get('packet_sha256')!=digest:raise RuntimeError('PRIOR_RECEIPT_CONFLICT')
 else:atomic_write(repo/receipt,(json.dumps(result,indent=2,sort_keys=True)+'\n').encode())
 c2=checkpoint(repo,[receipt],'heady: grounded IK v03.2 public media receipt')
 print('PACKET_LOCAL_COMMIT='+c1['head'],flush=True)
 print('RECEIPT_LOCAL_COMMIT='+c2['head'],flush=True)
 print('PICTURES_GIF='+str(Path.home()/'storage/pictures'/PUBLIC[0]),flush=True)
 print('DOWNLOADS_GIF='+str(Path.home()/'storage/downloads'/PUBLIC[0]),flush=True)
 print('ALL_EIGHT_PUBLIC_FILES_SHA_VERIFIED=TRUE',flush=True)
 print('STATUS=PASS_LOCAL_COMMIT_AND_PUBLIC_VISUAL_DELIVERY',flush=True)
 print('USER_VISUAL_VERDICT=PENDING',flush=True)

if __name__=='__main__':
 try:main()
 except Exception as e:
  print('TRACE='+traceback.format_exc(limit=2).strip()[-1200:],flush=True)
  fatal(type(e).__name__+': '+str(e))

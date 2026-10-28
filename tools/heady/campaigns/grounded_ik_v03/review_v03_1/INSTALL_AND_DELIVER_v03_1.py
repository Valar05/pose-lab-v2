#!/usr/bin/env python3
"""HEADY_GROUNDED_IK v03.1.0  | Original user invocation:
python - <<'PY'
from pathlib import Path
import hashlib,zipfile,sys
p=Path.home()/'storage/downloads/Heady_GroundedIK_RuntimeTick_v03_1_VisualDelivery.zip'
assert p.is_file(),f'ZIP_MISSING: {p}'
assert hashlib.sha256(p.read_bytes()).hexdigest()=='<ZIP_SHA256_FROM_ONE_PASTE_COMMAND>','ZIP_HASH_MISMATCH'
with zipfile.ZipFile(p) as z: code=z.read('INSTALL_AND_DELIVER_v03_1.py')
sys.argv=['INSTALL_AND_DELIVER_v03_1.py',str(p)]
exec(compile(code,'INSTALL_AND_DELIVER_v03_1.py','exec'),{'__name__':'__main__'})
PY
Installs and commits a versioned addendum, validates, copies images to Pictures and Downloads,
requests opening, verifies public outputs, commits receipt. NO RIG ANIMATION OR OLD CAMPAIGN RERUN.
"""
import sys,os,json,hashlib,subprocess,zipfile,tempfile,shutil,datetime
from pathlib import Path
REL='tools/heady/campaigns/grounded_ik_v03/review_v03_1'
BASE='tools/heady/campaigns/grounded_ik_v03'
RUNNER='tools/campaigns/heady_grounded_runtime_v03_1.sh'
SOURCE='8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27'
ZIP_NAME='Heady_GroundedIK_RuntimeTick_v03_1_VisualDelivery.zip'

def fail(msg):
 print('CAMPAIGN_STATUS=BLOCKED',flush=True);print('EXACT_FAILURE='+str(msg),flush=True);sys.exit(2)
def sha(data):return hashlib.sha256(data).hexdigest()
def hash_file(p):
 h=hashlib.sha256();
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1<<20),b''):h.update(b)
 return h.hexdigest()
def git(repo,*args,check=True):
 p=subprocess.run(['git','-C',str(repo),*args],capture_output=True,text=True,timeout=40)
 if check and p.returncode:fail('GIT '+ ' '.join(args)+' '+p.stderr.strip()[-550:])
 return p

def commit_owned(repo,paths,message):
 before=git(repo,'rev-parse','HEAD').stdout.strip()
 changed=git(repo,'status','--porcelain','--',*paths).stdout.strip()
 if not changed:return {'status':'ALREADY_COMMITTED','head':before}
 git(repo,'add','--',*paths)
 git(repo,'commit','--only','-m',message,'--',*paths)
 after=git(repo,'rev-parse','HEAD').stdout.strip()
 if after==before:fail('GIT_COMMIT_DID_NOT_CHANGE_HEAD')
 print('LOCAL_CHECKPOINT_COMMIT='+after,flush=True)
 return {'status':'COMMITTED','head':after}

def atomic_install(dest,data):
 if dest.exists():
  if not dest.is_file() or hash_file(dest)!=sha(data):fail('TARGET_CHANGED_REFUSE_OVERWRITE '+str(dest))
  return False
 dest.parent.mkdir(parents=True,exist_ok=True)
 with tempfile.NamedTemporaryFile(mode='wb',dir=dest.parent,delete=False,prefix='.heady-v03-1-') as h:
  h.write(data);h.flush();os.fsync(h.fileno());tmp=Path(h.name)
 try:os.replace(tmp,dest)
 except Exception:tmp.unlink(missing_ok=True);raise
 if hash_file(dest)!=sha(data):fail('INSTALLED_BYTES_READBACK_MISMATCH '+str(dest))
 return True

def main():
 print('CAMPAIGN=HEADY_GROUNDED_IK VERSION=03.1.0',flush=True)
 print('PURPOSE=FIX_MISSING_ANDROID_PICTURES_DOWNLOADS_AND_OPEN',flush=True)
 print('DOES_NOT_RECOMPUTE=TRUE  OLD_V05_V07_RUN=FALSE  REMOTE_PUSH=FALSE',flush=True)
 if len(sys.argv)<2:fail('ZIP_PATH_NOT_SPECIFIED')
 zip_path=Path(sys.argv[1]).expanduser().resolve()
 print('ZIP_EFFECTIVE_PATH='+str(zip_path),flush=True)
 if not zip_path.is_file():fail('ZIP_MISSING '+str(zip_path))
 print('ZIP_ACTUAL_SHA256='+hash_file(zip_path),flush=True)
 roots=[]
 if os.getenv('POSE_LAB_REPO'):roots.append(Path(os.environ['POSE_LAB_REPO']))
 roots += [Path.home()/'storage/documents/GodotProjects/pose-lab-v2',Path('/storage/emulated/0/Documents/GodotProjects/pose-lab-v2')]
 repo=next((p.resolve() for p in roots if (p/'AGENTS.md').is_file() and (p/'docs/POSE_LAB_CAMPAIGN_RULES.md').is_file() and (p/BASE/'SOURCE_PACKET.zip').is_file()),None)
 if repo is None:fail('INSTALLED_V03_CANONICAL_REPO_NOT_FOUND')
 print('REPO='+str(repo),flush=True)
 if Path(git(repo,'rev-parse','--show-toplevel').stdout.strip()).resolve()!=repo:fail('REPO_NOT_GIT_ROOT')
 if hash_file(repo/BASE/'Meshy_AI_Character_output (1).glb')!=SOURCE:fail('OLDER_V03_SOURCE_GLB_CHANGED')
 if git(repo,'diff','--cached','--name-only','--',REL,RUNNER).stdout.strip():fail('OUR_CAMPAIGN_PATH_HAS_OTHER_STAGED_WORK')
 if git(repo,'status','--porcelain','--',REL,RUNNER).stdout.strip():
  print('EXISTING_CAMPAIGN_FILES_DETECTED_VERIFYING',flush=True)
 if git(repo,'var','GIT_AUTHOR_IDENT',check=False).returncode:fail('GIT_AUTHOR_IDENT_MISSING')
 try:
  with zipfile.ZipFile(zip_path) as z:
   if z.testzip():fail('ZIP_CRC_ERROR')
   infos=[x for x in z.infolist() if not x.is_dir()]
   keys=[x.filename for x in infos]
   if len(set(keys))!=len(keys):fail('DUPLICATE_ZIP_MEMBERS')
   if any(x.startswith('/') or '..' in Path(x).parts for x in keys):fail('UNSAFE_ZIP_MEMBER')
   acceptable=lambda x:x in {'INSTALL_AND_DELIVER_v03_1.py'} or x==RUNNER or x.startswith(REL+'/')
   if any(not acceptable(x) for x in keys):fail('ZIP_UNEXPECTED_MEMBER')
   expected={REL+'/FILES_SHA256.json',REL+'/PUBLISH_AND_OPEN.py',REL+'/Heady_GroundedIK_v03_1_ReviewBoard.png',REL+'/CONTRACT_v03_1.json',REL+'/INSTALL_AND_DELIVER_v03_1.py',RUNNER,'INSTALL_AND_DELIVER_v03_1.py'}
   if not expected.issubset(set(keys)):fail('ZIP_INCOMPLETE')
   raw={k:z.read(k) for k in keys}
 except Exception as e:fail('INVALID_ZIP '+str(e))
 checks=json.loads(raw[REL+'/FILES_SHA256.json'])
 for name,h in checks.items():
  if sha(raw[REL+'/'+name])!=h:fail('INVALID_MANIFEST '+name)
 if raw[REL+'/INSTALL_AND_DELIVER_v03_1.py']!=raw['INSTALL_AND_DELIVER_v03_1.py']:
  fail('INSTALLER_REPO_BYTES_DIFFER_FROM_BOOTSTRAP')
 print('STAGE=INSTALL_VERSIONED_REVIEW_PACKET',flush=True)
 all_paths=[(repo/p,data) for p,data in raw.items() if p!='INSTALL_AND_DELIVER_v03_1.py']
 all_paths.append((repo/REL/'PATCH_PACKET_v03_1.zip',zip_path.read_bytes()))
 for p,data in all_paths:atomic_install(p,data)
 for p,data in all_paths:
  if hash_file(p)!=sha(data):fail('INSTALLED_READBACK_FAIL '+str(p))
 c1=commit_owned(repo,[REL,RUNNER],'pose3d(heady): v03.1 versioned visual review packet')
 print('STAGE=PUBLISH_IMAGES_TO_ANDROID_PUBLIC_MEDIA',flush=True)
 runner=repo/REL/'PUBLISH_AND_OPEN.py'
 outcome=subprocess.run([sys.executable,str(runner)],capture_output=True,text=True,timeout=120)
 print(outcome.stdout,flush=True)
 if outcome.returncode:fail('PUBLIC_DELIVERY_FAILED '+(outcome.stderr or outcome.stdout)[-750:])
 json_lines=[line for line in outcome.stdout.splitlines() if line.startswith('MACHINE_RECEIPT=')]
 if not json_lines:fail('DELIVERY_RECEIPT_LINE_NOT_PRESENT')
 payload=json.loads(json_lines[-1].split('=',1)[1])
 if len(payload['published'])!=8:fail('EXPECTED_EIGHT_PUBLIC_COPIES')
 for entry in payload['published']:
  target=Path(entry['path'])
  if not target.is_file() or hash_file(target)!=entry['sha256']:fail('POST_PUBLIC_READBACK_MISMATCH '+str(target))
 print('STAGE=COMMIT_DELIVERY_RECEIPT',flush=True)
 receipt=repo/REL/'DELIVERY_RECEIPT_v03_1.json'
 payload.update({'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'packet_sha256':hash_file(zip_path),'previous_v03_commit_preserved':True,'previous_v03_commit_expected':'532d24f984aac9b792744e9b27eb7af9baf36408','checkpoint_packet':c1})
 serialized=(json.dumps(payload,indent=2,sort_keys=True)+'\n').encode()
 if not receipt.exists():atomic_install(receipt,serialized)
 else:
  recorded=json.loads(receipt.read_text());
  if recorded.get('version')!='03.1.0':fail('RECEIPT_VERSION_CONFLICT')
 c2=commit_owned(repo,[str(Path(REL)/'DELIVERY_RECEIPT_v03_1.json')],'pose3d(heady): v03.1 verified Android image delivery')
 print('FINAL_RECEIPT_REPO='+str(receipt),flush=True)
 print('GIT_PACKET='+c1['status']+':'+c1['head'])
 print('GIT_RECEIPT='+c2['status']+':'+c2['head'])
 print('STATUS=PASS_IMAGES_COPIED_AND_VERIFIED_OPEN_INTENT_NOT_VISUALLY_CONFIRMED',flush=True)
 print('REVIEW_ACCEPTANCE=PENDING_USER',flush=True)
if __name__=='__main__':
 try:main()
 except Exception as e:fail('UNHANDLED '+type(e).__name__+' '+str(e))

#!/usr/bin/env python3
# HEADY_GROUNDED_IK v03.3.0 — first invocation: use SHA-locked zip bootstrap in accompanying handoff.
# One-shot install + LOCAL scoped Git commits + PUBLIC image publication/open; no model recomputation.
from pathlib import Path
import os,sys,hashlib,zipfile,json,tempfile,subprocess,shutil,traceback,time
CAMPAIGN='HEADY_GROUNDED_IK';VERSION='03.3.0';STAGE='START'
PREFIX='tools/heady/campaigns/grounded_ik_v03/review_v03_3/'
RUNNER='tools/campaigns/heady_grounded_ik_v03_3.sh'
WHOLE=PREFIX+'WHOLE_PACKET_v03_3.zip'
RECEIPT=PREFIX+'ANDROID_DELIVERY_RECEIPT.json'
BOOT='INSTALL_AND_RUN_v03_3.py'
SOURCE='8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27'
REVIEW={
 'HEADY_GroundedIK_OneDeliberateStep_v03_3.gif':'Heady_GroundedIK_v03_3_OneDeliberateStep.gif',
 'ThreeStates_WorldFixed.png':'Heady_GroundedIK_v03_3_ThreeStates.png',
 'Frame_07_SWING.png':'Heady_GroundedIK_v03_3_FootLift.png',
 'LiftAndPlant_Evidence.png':'Heady_GroundedIK_v03_3_LiftEvidence.png',
}
def emit(k,x): print(f'{k}={x}',flush=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def sha_file(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for part in iter(lambda:f.read(1048576),b''): h.update(part)
 return h.hexdigest()
def git(repo,*args,check=True):
 r=subprocess.run(['git','-C',str(repo),*args],capture_output=True,text=True,timeout=90)
 if r.returncode and check:raise RuntimeError('GIT_'+args[0].upper()+': '+r.stderr.strip()[-800:]+' '+r.stdout.strip()[-220:])
 return r
def immutable(path,b):
 path.parent.mkdir(parents=True,exist_ok=True)
 if path.exists():
  if not path.is_file() or sha_file(path)!=sha(b):raise RuntimeError('EXISTING_FILE_CONFLICT '+str(path))
  return 'REUSED'
 with tempfile.NamedTemporaryFile(dir=path.parent,delete=False,prefix='.heady033-') as f:
  tmp=Path(f.name);f.write(b);f.flush();os.fsync(f.fileno())
 try:os.replace(tmp,path)
 finally:tmp.unlink(missing_ok=True)
 if sha_file(path)!=sha(b):raise RuntimeError('FILE_READBACK_MISMATCH '+str(path))
 return 'CREATED'
def repo_find():
 paths=[]
 if os.getenv('POSE_LAB_REPO'):paths.append(Path(os.environ['POSE_LAB_REPO']))
 paths.extend([Path.home()/'storage/documents/GodotProjects/pose-lab-v2',Path('/storage/emulated/0/Documents/GodotProjects/pose-lab-v2')])
 for p in paths:
  try:
   p=p.resolve()
   if (p/'AGENTS.md').is_file() and (p/'docs/POSE_LAB_CAMPAIGN_RULES.md').is_file() and Path(git(p,'rev-parse','--show-toplevel').stdout.strip()).resolve()==p:
    return p
  except Exception:pass
 raise RuntimeError('CANONICAL_POSE_LAB_V2_REPO_NOT_FOUND')
def staged_unrelated(repo):
 s=git(repo,'diff','--cached','--name-only').stdout.splitlines()
 return sorted(x for x in s if not x.startswith(PREFIX) and x!=RUNNER)
def commit_scoped(repo,paths,description,force_paths=()):
 paths=sorted(set(paths));forced=set(force_paths)
 if not paths:raise RuntimeError('EMPTY_CHECKPOINT')
 if any(not(p.startswith(PREFIX) or p==RUNNER) for p in paths):raise RuntimeError('STAGE_OUT_OF_SCOPE')
 # Protect already-staged content for campaign-owned paths from overwrite.
 for path in paths:
  idx=git(repo,'ls-files','--stage','--',path).stdout.strip()
  if idx:
   idx_sha=idx.split()[1];wt_sha=git(repo,'hash-object','--',path).stdout.strip()
   staged_diff=git(repo,'diff','--cached','--name-only','--',path).stdout.strip()
   if staged_diff and idx_sha!=wt_sha:raise RuntimeError('PRESTAGED_CONFLICT '+path)
  if git(repo,'check-ignore','-q','--',path,check=False).returncode==0 and path not in forced:
   raise RuntimeError('IGNORED_NONARCHIVE_PATH '+path)
 before=git(repo,'rev-parse','HEAD').stdout.strip()
 dirty=git(repo,'status','--porcelain','--',*paths).stdout.strip()
 if not dirty:
  historic=git(repo,'log','-1','--format=%H','--',*paths).stdout.strip() or before
  emit('CHECKPOINT_REUSED',description);return historic
 normal=[p for p in paths if p not in forced]
 if normal:git(repo,'add','--',*normal)
 if forced:git(repo,'add','-f','--',*sorted(forced))
 # --only keeps unrelated staged paths entirely out of this local commit.
 git(repo,'commit','--only','-m',description,'--',*paths)
 after=git(repo,'rev-parse','HEAD').stdout.strip()
 if before==after:raise RuntimeError('COMMIT_MISSING')
 emit('LOCAL_COMMIT',after);return after

def main():
 global STAGE
 emit('CAMPAIGN',CAMPAIGN);emit('VERSION',VERSION);emit('MODE','INSTALL_PERSIST_SINGLE_STEP_AND_PUBLISH');emit('GITHUB_PUSH','NEVER')
 emit('OLD_GAIT_REEXECUTION','NO');emit('NO_ON_PHONE_HEAVY_RECOMPUTATION','TRUE')
 STAGE='PACKAGE_PREFLIGHT';emit('STAGE',STAGE)
 if len(sys.argv)!=2:raise RuntimeError('EXPECTED_EXACT_ZIP_PATH')
 path=Path(sys.argv[1]).expanduser().resolve()
 if not path.is_file():raise RuntimeError('ZIP_NOT_PRESENT '+str(path))
 emit('RELEASE_ZIP',str(path));emit('RELEASE_SHA256',sha_file(path))
 with zipfile.ZipFile(path) as z:
  bad=z.testzip()
  if bad:raise RuntimeError('ZIP_CRC_FAILED '+bad)
  names=[x.filename for x in z.infolist() if not x.is_dir()]
  if len(names)!=len(set(names)):raise RuntimeError('DUPLICATE_ZIP_ENTRIES')
  if any(('\\' in n or Path(n).is_absolute() or '..' in Path(n).parts or (n!=BOOT and n!=RUNNER and not n.startswith(PREFIX))) for n in names):raise RuntimeError('ZIP_HAS_UNAUTHORIZED_PATH')
  raw={name:z.read(name) for name in names}
 if BOOT not in raw or raw.get(PREFIX+BOOT)!=raw[BOOT]:raise RuntimeError('INSIDE_INSTALLER_NOT_IDENTICAL')
 for need in [PREFIX+'FILES_SHA256.json',PREFIX+'RESULT_RECEIPT.json',PREFIX+'Meshy_AI_Character_output (1).glb',RUNNER]:
  if need not in raw:raise RuntimeError('ZIP_REQUIRED_MEMBER_MISSING '+need)
 checks=json.loads(raw[PREFIX+'FILES_SHA256.json'])
 for short,h in checks.items():
  key=PREFIX+short
  if key not in raw or sha(raw[key])!=h:raise RuntimeError('ZIP_MEMBER_HASH_FAILED '+short)
 if sha(raw[PREFIX+'Meshy_AI_Character_output (1).glb'])!=SOURCE:raise RuntimeError('SOURCE_GLTF_MISMATCH')
 result=json.loads(raw[PREFIX+'RESULT_RECEIPT.json'])
 if result.get('version')!=VERSION or not result.get('no_repeat_gait') or result.get('step_state')!='CANDIDATE_PENDING_HUMAN_REVIEW':raise RuntimeError('CANDIDATE_CONTRACT_FAILED')
 STAGE='REPO_PREFLIGHT';emit('STAGE',STAGE)
 repo=repo_find();emit('RESOLVED_REPO',repo);emit('HEAD_BEFORE',git(repo,'rev-parse','HEAD').stdout.strip())
 emit('BRANCH',git(repo,'branch','--show-current').stdout.strip())
 if git(repo,'var','GIT_AUTHOR_IDENT',check=False).returncode:raise RuntimeError('GIT_IDENTITY_MISSING')
 untouched_staging=staged_unrelated(repo)
 STAGE='INSTALL_ALL_PACKET_MEMBERS';emit('STAGE',STAGE)
 members=[]
 for name,b in raw.items():
  if name==BOOT:continue
  action=immutable(repo/name,b)
  emit('INSTALLED' if action=='CREATED' else 'REUSED',name)
  if name.endswith('host_run.log'):continue # preserve log in WHOLE ZIP, not Git
  members.append(name)
 archive=WHOLE
 immutable(repo/archive,path.read_bytes());members.append(archive)
 forced=[p for p in members if p.endswith('.zip') and git(repo,'check-ignore','-q','--',p,check=False).returncode==0]
 STAGE='IMPLEMENTATION_LOCAL_GIT_COMMIT';emit('STAGE',STAGE)
 commit1=commit_scoped(repo,members,'heady: v03.3 one grounded step candidate and full evidence',forced)
 STAGE='ANDROID_PUBLIC_MEDIA_AND_OPEN';emit('STAGE',STAGE)
 publications=[]
 for folder in ('pictures','downloads'):
  public=Path.home()/'storage'/folder
  if not public.is_dir():raise RuntimeError('ANDROID_MEDIA_FOLDER_NOT_ACCESSIBLE '+str(public))
  for name,destname in REVIEW.items():
   dest=public/destname
   action=immutable(dest,raw[PREFIX+name])
   if sha_file(dest)!=sha(raw[PREFIX+name]):raise RuntimeError('PUBLIC_MEDIA_HASH_MISMATCH '+str(dest))
   emit('PUBLIC_'+folder.upper(),str(dest))
   publications.append({'path':str(dest),'sha256':sha_file(dest),'action':action})
 if len(publications)!=8:raise RuntimeError('PUBLIC_DELIVERY_INCOMPLETE')
 scanner='UNAVAILABLE'
 if shutil.which('termux-media-scan'):
  try:
   p=subprocess.run(['termux-media-scan',publications[0]['path']],text=True,capture_output=True,timeout=20)
   scanner='REQUESTED' if p.returncode==0 else 'EXIT_'+str(p.returncode)
  except Exception as e:scanner=type(e).__name__
 opened='UNAVAILABLE'
 if shutil.which('termux-open'):
  try:
   p=subprocess.run(['termux-open',publications[0]['path']],capture_output=True,text=True,timeout=20)
   opened='REQUESTED_NOT_CONFIRMED' if p.returncode==0 else 'EXIT_'+str(p.returncode)+' '+p.stderr.strip()[-100:]
  except Exception as e:opened='FAILED_'+type(e).__name__
 emit('MEDIA_SCAN',scanner);emit('VIEWER_OPEN',opened)
 STAGE='COMMIT_DELIVERY_RECEIPT';emit('STAGE',STAGE)
 receipt={'campaign':CAMPAIGN,'version':VERSION,'implementation_commit':commit1,'release_sha256':sha_file(path),'original_source_sha256':SOURCE,'pub':publications,'scanner':scanner,'open':opened,'human_acceptance':'PENDING','scope':'ONE_STEP_ONLY','github_push':'NOT_ATTEMPTED'}
 target=repo/RECEIPT
 if target.exists():
  old=json.loads(target.read_text())
  if old.get('version')!=VERSION or old.get('release_sha256')!=sha_file(path):raise RuntimeError('OLDER_OR_CONFLICTING_RECEIPT')
  if len(old.get('pub',[]))!=8 or any(not Path(x['path']).is_file() or sha_file(Path(x['path']))!=x['sha256'] for x in old['pub']):raise RuntimeError('OLD_RECEIPT_INCONSISTENT')
 else:immutable(target,(json.dumps(receipt,indent=2,sort_keys=True)+'\n').encode())
 commit2=commit_scoped(repo,[RECEIPT],'heady: v03.3 verified Android image delivery receipt')
 if staged_unrelated(repo)!=untouched_staging:raise RuntimeError('UNRELATED_GIT_INDEX_CHANGED')
 STAGE='DONE';emit('COMMIT_IMPLEMENTATION',commit1);emit('COMMIT_RECEIPT',commit2)
 emit('REVIEW_GIF',publications[0]['path']);emit('HUMAN_APPROVAL','PENDING');emit('FULL_PACKET_IN_REPO',str(repo/archive));emit('STATUS','PASS_ONE_STEP_CANDIDATE_DELIVERED_AND_LOCAL_COMMITTED')
if __name__=='__main__':
 try: main()
 except Exception as err:
  emit('STATUS','BLOCKED');emit('LAST_SUCCESS_STAGE',STAGE);emit('REASON',type(err).__name__+': '+str(err));emit('REMEDIATION','PRESERVE_FILES_AND_RESUME_SAME_VERSION_AFTER_REVIEW');sys.exit(1)

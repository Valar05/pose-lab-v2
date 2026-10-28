#!/usr/bin/env python3
# HEADY_GROUNDED_IK v03.2.1 — ORIGINAL USER INVOCATION:
# Download Heady_GroundedIK_v03_2_1_CommitAndOpenRepair.zip to Android Downloads;
# execute the exact SHA-locked one-paste Python bootstrap supplied with the ZIP.
# Does NOT rerun the old 13-tick proof, install v05/v07, or push to GitHub.
# Recovers the partial v03.2 extraction after .gitignore rejected host_run.log.
from pathlib import Path
import hashlib, json, os, subprocess, sys, shutil, zipfile, tempfile, traceback, time

CAMPAIGN='HEADY_GROUNDED_IK'
VERSION='03.2.1'
PREVIOUS_VERSION='03.2.0'
BASE='tools/heady/campaigns/grounded_ik_v03'
OLD=BASE+'/review_v03_2'
NEW=BASE+'/review_v03_2_1'
ORIGINAL_ZIP='V03_2_ORIGINAL_COMPLETE_PACKET.zip'
SOURCE_SHA='8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27'
ORIGINAL_ZIP_SHA='035a2974a1adc966f5afaa982e535ea90830fd94acf323db23e80dc1bd612212'
NEW_ZIP_NAME='Heady_GroundedIK_v03_2_1_CommitAndOpenRepair.zip'
BOOT='INSTALL_AND_RESUME_v03_2_1.py'
PUBLIC={
 'GROUND_IK_WorldAnchored_BodyMotion.gif':'Heady_GroundedIK_v03_2_1_WorldAnchored.gif',
 'WorldFixed_ThreeStep_Comparison.jpg':'Heady_GroundedIK_v03_2_1_ThreePoses.jpg',
 'Foot_Lock_Residuals_Zoom.png':'Heady_GroundedIK_v03_2_1_FootDrift.png',
 'Static_Pose_Tick_10.png':'Heady_GroundedIK_v03_2_1_FinalPose.png',
}

STAGE='START'; NEW_COMMITS=[]; JOURNAL=[]
def out(k,v):print(f'{k}={v}',flush=True)
def hash_bytes(b):return hashlib.sha256(b).hexdigest()
def hash_file(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def run_git(repo,*args,ok=False):
 r=subprocess.run(['git','-C',str(repo),*args],capture_output=True,text=True,timeout=60)
 if r.returncode and not ok:raise RuntimeError('GIT_'+args[0].upper()+' '+r.stderr.strip()[-600:]+' '+r.stdout.strip()[-200:])
 return r
def write_immutable(dst,data):
 dst.parent.mkdir(parents=True,exist_ok=True)
 if dst.exists():
  if not dst.is_file() or hash_file(dst)!=hash_bytes(data):raise RuntimeError('EXISTING_FILE_CONTENT_CONFLICT '+str(dst))
  return 'REUSED'
 with tempfile.NamedTemporaryFile(dir=dst.parent,prefix='.heady0321-',delete=False) as f:
  tmp=Path(f.name);f.write(data);f.flush();os.fsync(f.fileno())
 try:os.replace(tmp,dst)
 except BaseException:tmp.unlink(missing_ok=True);raise
 if hash_file(dst)!=hash_bytes(data):raise RuntimeError('FILE_READBACK_FAILED '+str(dst))
 return 'CREATED'
def safe_members(z,allowed):
 if z.testzip():raise RuntimeError('CORRUPTED_ZIP')
 names=[x.filename for x in z.infolist() if not x.is_dir()]
 if len(names)!=len(set(names)):raise RuntimeError('DUPLICATE_ZIP_PATH')
 for name in names:
  pp=Path(name)
  if pp.is_absolute() or '..' in pp.parts or '\\' in name or not allowed(name):raise RuntimeError('UNEXPECTED_ZIP_PATH '+name)
 return names
def find_repo():
 found=[]
 if os.getenv('POSE_LAB_REPO'):found.append(Path(os.environ['POSE_LAB_REPO']))
 found += [Path.home()/'storage/documents/GodotProjects/pose-lab-v2',Path('/storage/emulated/0/Documents/GodotProjects/pose-lab-v2')]
 for p in found:
  try:
   p=p.resolve()
   if not (p/'AGENTS.md').is_file() or not (p/BASE/'SOURCE_PACKET.zip').is_file():continue
   if Path(run_git(p,'rev-parse','--show-toplevel').stdout.strip()).resolve()!=p:continue
   source=p/BASE/'Meshy_AI_Character_output (1).glb'
   if not source.is_file() or hash_file(source)!=SOURCE_SHA:continue
   return p
  except Exception:continue
 raise RuntimeError('CANONICAL_V03_REPO_OR_SOURCE_NOT_FOUND')
def get_index_snapshot(repo,owned):
 entries=run_git(repo,'diff','--cached','--name-status').stdout.strip().splitlines()
 def getpath(e):return e.split('\t')[-1] if '\t' in e else e
 return sorted(e for e in entries if not any(getpath(e)==p or getpath(e).startswith(p+'/') for p in owned))
def ensure_staged_owned_consistent(repo,paths):
 for p in paths:
  # Only compare Git's object hashes. Never decode arbitrary binary blobs as text.
  idx=run_git(repo,'ls-files','-s','--',p).stdout.strip()
  if idx:
   blob=idx.split()[1]
   work=run_git(repo,'hash-object','--',p).stdout.strip()
   if blob!=work:raise RuntimeError('OWNED_FILE_STAGED_DIFFERS_FROM_DISK '+p)
def commit(repo,paths,title,forced=()):
 global STAGE
 if not paths:raise RuntimeError('EMPTY_COMMIT_FILE_SET')
 if any(not (p.startswith(OLD+'/') or p.startswith(NEW+'/')) for p in paths):raise RuntimeError('OUT_OF_SCOPE_COMMIT_PATH')
 all_paths=sorted(set(paths))
 ensure_staged_owned_consistent(repo,all_paths)
 prior=run_git(repo,'rev-parse','HEAD').stdout.strip()
 status=run_git(repo,'status','--porcelain','--',*all_paths).stdout.strip()
 if not status:
  out('CHECKPOINT_REUSED',title)
  return {'status':'UNCHANGED','head':prior}
 force=set(forced)
 normal=[p for p in all_paths if p not in force]
 if normal:run_git(repo,'add','--',*normal)
 if force:run_git(repo,'add','-f','--',*sorted(force))
 # no ignored file may be staged accidentally
 run_git(repo,'commit','--only','-m',title,'--',*all_paths)
 head=run_git(repo,'rev-parse','HEAD').stdout.strip()
 if head==prior:raise RuntimeError('NO_COMMIT_RECORDED '+title)
 out('LOCAL_COMMIT',head)
 NEW_COMMITS.append(head)
 return {'status':'COMMITTED','head':head}
def main():
 global STAGE
 out('CAMPAIGN',CAMPAIGN);out('VERSION',VERSION);out('RECOVERY_FROM',PREVIOUS_VERSION)
 out('ROOT_CAUSE','GITIGNORED_HOST_RUN_LOG_WAS_STAGED_BY_V03_2')
 out('NO_GAIT_RECOMPUTATION','TRUE');out('NO_REMOTE_PUSH','TRUE')
 STAGE='SOURCE_ZIP_VERIFY';out('STAGE',STAGE)
 if len(sys.argv)<2:raise RuntimeError('ONE_ZIP_PATH_REQUIRED')
 pkg=Path(sys.argv[1]).expanduser().resolve()
 if not pkg.is_file():raise RuntimeError('NEW_VERSIONED_ZIP_MISSING '+str(pkg))
 out('SOURCE_ZIP',str(pkg));out('SOURCE_SHA256',hash_file(pkg))
 with zipfile.ZipFile(pkg) as z:
  ns=safe_members(z,lambda n:n==BOOT or n.startswith(NEW+'/'))
  raw={n:z.read(n) for n in ns}
  if raw[BOOT]!=raw[NEW+'/'+BOOT]:raise RuntimeError('INSTALLER_SELF_MISMATCH')
  manifest=json.loads(raw[NEW+'/MANIFEST_SHA256.json'])
  for n,sha in manifest.items():
   if n not in raw or hash_bytes(raw[n])!=sha:raise RuntimeError('PACKAGE_MANIFEST_FAILED '+n)
  nested=raw[NEW+'/'+ORIGINAL_ZIP]
  if hash_bytes(nested)!=ORIGINAL_ZIP_SHA:raise RuntimeError('ORIGINAL_SOURCE_PACKET_HASH_FAILED')
 with zipfile.ZipFile(__import__('io').BytesIO(nested)) as source:
  oldnames=safe_members(source,lambda n:n=='INSTALL_AND_DELIVER_v03_2.py' or n.startswith(OLD+'/'))
  original={n:source.read(n) for n in oldnames}
  old_manifest=json.loads(original[OLD+'/FILES_SHA256.json'])
  for short,h in old_manifest.items():
   name=OLD+'/'+short
   if name not in original or hash_bytes(original[name])!=h:raise RuntimeError('V03_2_MANIFEST_FAILED '+name)
  if hash_bytes(original[OLD+'/Meshy_AI_Character_output (1).glb'])!=SOURCE_SHA:raise RuntimeError('MESH_SHA_FAILED')
 STAGE='CANONICAL_REPO_PREFLIGHT';out('STAGE',STAGE)
 repo=find_repo()
 out('RESOLVED_REPO',str(repo));out('HEAD_BEFORE',run_git(repo,'rev-parse','HEAD').stdout.strip());out('BRANCH',run_git(repo,'branch','--show-current').stdout.strip())
 if run_git(repo,'var','GIT_AUTHOR_IDENT',ok=True).returncode:raise RuntimeError('GIT_IDENTITY_MISSING')
 staged_unrelated=get_index_snapshot(repo,[OLD,NEW])
 out('PREEXISTING_OTHER_STAGED',len(staged_unrelated))
 STAGE='RECONCILE_PARTIAL_EXTRACTION';out('STAGE',STAGE)
 oldfiles=[]; ignored=[]; force=[]
 for name,data in original.items():
  if name=='INSTALL_AND_DELIVER_v03_2.py':continue
  res=write_immutable(repo/name,data)
  if res=='CREATED':JOURNAL.append('RESTORED '+name)
  # Preserve deliberately ignored runtime diagnostic log without forcing it into Git.
  if Path(name).name=='host_run.log':
   ignored.append(name);continue
  check=run_git(repo,'check-ignore','-q','--',name,ok=True)
  if check.returncode==0:
   if Path(name).name=='WHOLE_DISTRIBUTED_PACKET.zip':force.append(name)
   else:raise RuntimeError('UNEXPECTED_IGNORED_CAMPAIGN_FILE '+name)
  oldfiles.append(name)
 sourcezip=OLD+'/WHOLE_DISTRIBUTED_PACKET.zip'
 write_immutable(repo/sourcezip,nested)
 if sourcezip not in oldfiles:oldfiles.append(sourcezip);force.append(sourcezip)
 # New immutably versioned repair packet is deposited in the repo in full.
 newfiles=[]
 for name,data in raw.items():
  if name==BOOT:continue
  write_immutable(repo/name,data);newfiles.append(name)
 newzip=NEW+'/COMPLETE_DISTRIBUTION_v03_2_1.zip'
 write_immutable(repo/newzip,pkg.read_bytes());newfiles.append(newzip)
 if run_git(repo,'check-ignore','-q','--',newzip,ok=True).returncode==0:force.append(newzip)
 if NEW+'/'+ORIGINAL_ZIP in newfiles and run_git(repo,'check-ignore','-q','--',NEW+'/'+ORIGINAL_ZIP,ok=True).returncode==0:force.append(NEW+'/'+ORIGINAL_ZIP)
 for path in newfiles:
  if path not in force and run_git(repo,'check-ignore','-q','--',path,ok=True).returncode==0:raise RuntimeError('UNEXPECTED_IGNORED_NEW_PACKET_FILE '+path)
 if not ignored:raise RuntimeError('EXPECTED_IGNORED_LOG_NOT_FOUND')
 out('IGNORED_LOG_PRESERVED_INSIDE_COMPLETE_ZIP',OLD+'/host_run.log')
 STAGE='VERIFIED_LOCAL_IMPLEMENTATION_COMMIT';out('STAGE',STAGE)
 implementation=sorted(set(oldfiles+newfiles))
 # Never stage unrelated files; never force log into git.  Full zip includes the log.
 c1=commit(repo,implementation,'heady: v03.2.1 resume complete packet after ignored-log failure',forced=force)
 STAGE='PUBLISH_PUBLIC_REVIEW_MEDIA';out('STAGE',STAGE)
 public=[]
 for folder in ('pictures','downloads'):
  root=Path.home()/'storage'/folder
  if not root.is_dir():raise RuntimeError('ANDROID_PUBLIC_FOLDER_NOT_ACCESSIBLE '+str(root))
  for original_name,published_name in PUBLIC.items():
   data=original[OLD+'/'+original_name]
   dest=root/published_name
   action=write_immutable(dest,data)
   if hash_file(dest)!=hash_bytes(data):raise RuntimeError('MEDIA_SHA_READBACK_FAILED '+str(dest))
   public.append({'path':str(dest),'sha256':hash_file(dest),'action':action})
   out('PUBLISHED_'+folder.upper(),str(dest))
 if len(public)!=8:raise RuntimeError('PUBLIC_MEDIA_INCOMPLETE')
 STAGE='SCAN_AND_OPEN';out('STAGE',STAGE)
 scan=[]
 if shutil.which('termux-media-scan'):
  for p in (public[0]['path'],public[4]['path']):
   try:
    r=subprocess.run(['termux-media-scan',p],capture_output=True,text=True,timeout=20)
    scan.append('REQUESTED' if r.returncode==0 else 'EXIT_'+str(r.returncode))
   except Exception as e:scan.append('ERROR_'+type(e).__name__)
 else:scan=['UNAVAILABLE']
 view='UNAVAILABLE'
 if shutil.which('termux-open'):
  try:
   # Most Termux installations infer image/gif from extension.
   r=subprocess.run(['termux-open',public[0]['path']],capture_output=True,text=True,timeout=20)
   view='REQUESTED_NOT_CONFIRMED' if r.returncode==0 else 'FAILED_'+str(r.returncode)+' '+r.stderr.strip()[-120:]
  except Exception as e:view='FAILED_'+type(e).__name__+' '+str(e)[:110]
 out('MEDIA_SCAN',','.join(scan));out('OPEN',view)
 STAGE='COMMIT_PUBLICATION_RECEIPT';out('STAGE',STAGE)
 receipt=NEW+'/ANDROID_V03_2_1_DELIVERY_RECEIPT.json'
 record={'campaign':CAMPAIGN,'version':VERSION,'corrects':'v03.2.0 ignored host_run.log interrupted git add','original_v03_2_source_zip_sha256':ORIGINAL_ZIP_SHA,'repair_zip_sha256':hash_file(pkg),'previous_v03_commit':'532d24f984aac9b792744e9b27eb7af9baf36408','source_glb_sha256':SOURCE_SHA,'ignored_log':'retained in original complete zip and physical checkout, not added to git','implementation_commit':c1,'published':public,'scan':scan,'open':view,'human_accepted':False,'model_regenerated':False,'animation_created':False,'remote_push':False}
 if (repo/receipt).exists():
  prior=json.loads((repo/receipt).read_text())
  if prior.get('version')!=VERSION or prior.get('original_v03_2_source_zip_sha256')!=ORIGINAL_ZIP_SHA or prior.get('repair_zip_sha256')!=hash_file(pkg):raise RuntimeError('EXISTING_RECEIPT_WRONG_VERSION_OR_SOURCE')
  if len(prior.get('published',[]))!=8:raise RuntimeError('EXISTING_RECEIPT_MISSING_MEDIA')
  for entry in prior['published']:
   p=Path(entry['path'])
   if not p.is_file() or hash_file(p)!=entry['sha256']:raise RuntimeError('EXISTING_RECEIPT_MEDIA_MISMATCH '+str(p))
  out('RECEIPT','REUSED_VERIFIED')
 else:
  write_immutable(repo/receipt,(json.dumps(record,sort_keys=True,indent=2)+'\n').encode())
  out('RECEIPT','CREATED_AFTER_PUBLICATION')
 c2=commit(repo,[receipt],'heady: v03.2.1 public GIF delivery readback receipt')
 unchanged_other=get_index_snapshot(repo,[OLD,NEW])
 if staged_unrelated!=unchanged_other:raise RuntimeError('UNRELATED_STAGING_CHANGED')
 out('PACKET_COMMIT',c1['head']);out('RECEIPT_COMMIT',c2['head'])
 out('DOWNLOADS_GIF',public[4]['path']);out('PICTURES_GIF',public[0]['path'])
 out('FILES_PUBLISHED_AND_SHA_VERIFIED',len(public));out('WHOLE_PACKET_STORED_IN_REPO',str(repo/newzip))
 out('GITHUB_PUSH','NOT_ATTEMPTED');out('USER_VISUAL_VERDICT','PENDING')
 out('CAMPAIGN_STATUS','PASS_LOCAL_COMMIT_AND_PUBLIC_DELIVERY')

if __name__=='__main__':
 try:main()
 except BaseException as e:
  out('CAMPAIGN_STATUS','BLOCKED');out('BLOCKED_STAGE',STAGE)
  out('CAUSE',type(e).__name__+': '+str(e));out('SAFE_RECOVERY','Original source and prior commits preserved; rerun this SAME exact v03.2.1 packet after correcting reported issue.')
  out('GITHUB_PUSH','NOT_ATTEMPTED')
  if NEW_COMMITS:out('COMPLETED_COMMIT_IDS',','.join(NEW_COMMITS))
  sys.exit(2)

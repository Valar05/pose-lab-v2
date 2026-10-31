#!/usr/bin/env bash
# HEADY_GROUNDED_IK v03.10.4: immutable successor, repaired derived engine metadata ordering.
# Original GLB, approved v03.9.3 gait, and older campaign artifacts are read-only.
set -Eeuo pipefail
export PYTHONUNBUFFERED=1
SELF="$(realpath -- "${BASH_SOURCE[0]}")"
export HEADY_V03104_BUNDLE="$SELF"
printf 'CAMPAIGN=HEADY_GROUNDED_IK\nVERSION=03.10.4\nSCRIPT_PATH=%s\n' "$SELF"
printf 'SCRIPT_SHA256=%s\n' "$(sha256sum "$SELF" | cut -d' ' -f1)"
mkdir -p "$HOME/.cache"
TEMP_DIR="$(mktemp -d "$HOME/.cache/heady-v03104.XXXXXXXX")"
trap 'rm -rf -- "$TEMP_DIR"' EXIT
PYFILE="$TEMP_DIR/heady_grounded_ik_v03_10_4.py"
cat > "$PYFILE" <<'HEADY_PY_SOURCE_V03104_IMMUTABLE'
#!/usr/bin/env python3
"""HEADY_GROUNDED_IK v03.10.4: upper-body counterbend of proven v03.10.2 gait.

Original single-invocation form:
  bash HEADY_GROUNDED_IK_v03_10_4_TERMUX_CAMPAIGN.sh

Runs on the authorized Android/Termux Pose Lab checkout, from ANY working
folder. Reuses the exact existing 52-joint model and existing v03.8 IK/renderer;
no GLB or ZIP duplicate, local scoped Git commits only, no remote writes, no Blender.
Only corrected left/right dynamic runs: 0.16 stride, preserved phases, 10-degree pelvis bank, 18-degree upper-body counter-roll and 6-degree backward pitch, and head stabilization. Derived skin-space visual candidate, not yet a GLB rig bake. Human verdict pending.
"""
from __future__ import annotations
import argparse
import collections
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import traceback

ID = "HEADY_GROUNDED_IK"
VERSION = "03.10.4"
ROOT_NAME = "pose-lab-v2"
BASE_REL = Path("tools/heady/campaigns/grounded_ik_v03/review_v03_8")
OUT_REL = Path("tools/heady/campaigns/grounded_ik_v03/review_v03_10_4")
SRC_ENGINE = "six_leg_overlap_engine.py"
SRC_GLB = "Meshy_AI_Character_output (1).glb"
SOURCE_GLB_SHA = "8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27"
SOURCE_ENGINE_SHA = "fcadee825ce5591e9b47f54d839e72dd3709aa4fd4359ca1637346f04ccb7d20"
# The v03.9.1 phase geometry FAILED at tick 4. The permuted order below
# maintains both-side support. Each limb still lifts at its own time.
PHASE = {
 "left_front": 0.0, "left_middle": 0.60, "left_rear": 0.20,
 "right_front": 0.50, "right_middle": 0.10, "right_rear": 0.70,
}
SWING = 0.39
RUN_ROOT = Path.home() / ".local/share/heady-grounded-ik-v03104"
GIF = "Heady_v03_10_4_DirectionalCandidate.gif"
MEDIA = [GIF, "Overlap_SixStates_Review.png", "Overlap_Actual_LiftCurves_And_BodyMotion.png", "Overlap_Contact_Drift_Stability.png", "Overlap_Frame_016.png"]
BASE_FILES = ["renderer_readonly_reference.py", "renderer_accelerated_v034.py", SRC_ENGINE, SRC_GLB]
VALIDATION = {"frames": 85, "swing_range": [2, 3], "body_advance": 0.56,
              "stance_drift_max": 0.0002, "support_origin_proxy_min": 0.05,
              "lowest_mesh_y_min": -0.001}
STATUS = "PREFLIGHT"
RECEIPT = {}
RUN_ID = ""
LOG_PATH = None

class Blocked(Exception):
    pass

def info(k, v):
    print(f"{k}={v}", flush=True)

def sha(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for chunk in iter(lambda: f.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()

def command(argv, cwd=None, timeout=45, must=True):
    try:
        p = subprocess.run([str(x) for x in argv],cwd=cwd, capture_output=True,
                           text=True, errors="replace", timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as e:
        raise Blocked("COMMAND_UNAVAILABLE_OR_TIMED_OUT: " + str(argv[0])) from e
    if must and p.returncode:
        raise Blocked("COMMAND_FAILED: " + str(argv[0]) + " " + str(argv[1:3]) +
                      " exit=" + str(p.returncode) + " " + p.stderr[-300:])
    return p

def root_find(override=None):
    probes = []
    if override:
        probes.append(Path(override).expanduser())
    here = Path(__file__).resolve()
    probes.extend(here.parents)
    probes.extend([Path.home()/"storage/documents/GodotProjects/pose-lab-v2",
                   Path("/storage/emulated/0/Documents/GodotProjects/pose-lab-v2")])
    for p in probes:
        if not (p/"AGENTS.md").is_file() or not (p/BASE_REL/SRC_ENGINE).is_file():
            continue
        real = p.resolve()
        try:
            r = command(["git","-C",real,"rev-parse","--show-toplevel"]).stdout.strip()
        except Blocked:
            continue
        if Path(r).resolve()!=real:
            continue
        remote=command(["git","-C",real,"remote","get-url","origin"],must=False).stdout.strip()
        if "Valar05/pose-lab-v2" not in remote:
            raise Blocked("WRONG_REPO_ORIGIN: expected Valar05/pose-lab-v2")
        return real
    raise Blocked("POSE_LAB_REPO_NOT_FOUND: provide --repo if canonical path changed")

def exact_replace(s, old, new, label):
    if s.count(old) != 1:
        raise Blocked(f"BASELINE_DRIFT_{label}: expected one anchor, saw {s.count(old)}")
    return s.replace(old,new,1)

def phase_histogram(phase=PHASE):
    counts=[]
    for tick in range(85):
        t=(tick/24.0)%1.0
        counts.append(sum((t-p)%1 < SWING-1e-10 for p in phase.values()))
    return dict(sorted(collections.Counter(counts).items())), counts

def footprint_safety(base, direction, stride):
    """Test true source-witness world-space contacts for each directed stride.
    A body-origin planar support *proxy* only; not CoM or dynamic stability.
    """
    import math
    tracks=json.loads((base/"overlap_bone_tracks.json").read_text())
    if tracks.get("source_sha256")!=SOURCE_GLB_SHA:
        raise Blocked("UNTRUSTED_FOOT_WITNESS_SOURCE_SHA")
    origin=tracks.get("rest_foot_witnesses",{})
    if set(origin)!=set(PHASE):raise Blocked("INCOMPLETE_SIX_FOOT_MODEL_WITNESSES")
    sign=-1.0 if direction=="left" else 1.0
    def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    def hull(points):
        pts=sorted(set(points))
        if len(pts)<3:return []
        lower=[];upper=[]
        for v in pts:
            while len(lower)>1 and cross(lower[-2],lower[-1],v)<=0:lower.pop()
            lower.append(v)
        for v in pts[::-1]:
            while len(upper)>1 and cross(upper[-2],upper[-1],v)<=0:upper.pop()
            upper.append(v)
        return lower[:-1]+upper[:-1]
    details=[]
    for tick in range(85):
        t=tick/24.0
        center=(sign*stride*t,0.0)
        planted=[];swinging=[]
        for leg,phase in PHASE.items():
            q=t-phase;n=math.floor(q+1e-10);frac=max(0.0,q-n)
            if frac < SWING-1e-10:swinging.append(leg)
            else:
                p=origin[leg];planted.append((float(p[0]+sign*stride*(n+1)),float(p[2])))
        poly=hull(planted)
        if len(poly)<3:raise Blocked("PREFLIGHT_FEWER_THAN_THREE_SUPPORT_FEET_TICK_"+str(tick))
        m=min(cross(a,b,center)/math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(poly,poly[1:]+poly[:1]))
        details.append((m,tick,swinging))
    worst=min(details)
    hist=dict(sorted(collections.Counter(len(v[2]) for v in details).items()))
    if hist!=phase_histogram()[0]:raise Blocked("PREFLIGHT_PHASE_HISTOGRAM_MISMATCH")
    if worst[0]<=.05:raise Blocked(f"UNSAFE_SUPPORT_PREFLIGHT dir={direction} stride={stride} tick={worst[1]} margin={worst[0]:.6f}")
    info("PREFLIGHT",f"{direction} stride={stride:.3f} support_origin_proxy_min={worst[0]:.6f} at_tick={worst[1]} histogram={hist}")
    return worst[0]

def make_engine(original):
    """Apply fully checked, exact-base patches. Produce a real source-skinned IK.
    Never patch after numerical solve, never fake bank by moving rendered pixels.
    """
    s=exact_replace(original,"VERSION='03.8.0'","VERSION='03.10.4'","VERSION")
    before=("GROUP_A=['left_front','left_rear','right_middle']\n"
            "GROUP_B=['right_front','right_rear','left_middle']\n"
            "PHASE_DELTA=.05\n"
            "PHASE={k:group*.5 + ix*PHASE_DELTA for group,legs in enumerate((GROUP_A,GROUP_B)) for ix,k in enumerate(legs)}")
    after=("# Exact v03.9.3 phase order, unchanged for both travel directions.\n"
           "GROUP_A=['left_front','right_middle','left_rear']\n"
           "GROUP_B=['right_front','left_middle','right_rear']\n"
           "PHASE_DELTA=.10\n"
           "PHASE={k:group*.5 + ix*PHASE_DELTA for group,legs in enumerate((GROUP_A,GROUP_B)) for ix,k in enumerate(legs)}")
    s=exact_replace(s,before,after,"PHASE_SCHEDULE")
    s=exact_replace(s,"STRIDE=.12","STRIDE=.16","STRIDE")
    s=exact_replace(s,"from scipy.optimize import least_squares",
       "from scipy.optimize import least_squares\nimport os\n"
       "DIRECTION=os.environ['HEADY_DIRECTION']\n"
       "VARIANT=os.environ['HEADY_VARIANT']\n"
       "assert DIRECTION in ('left','right') and VARIANT in ('straight','dynamic')\n"
       "DIR_SIGN=-1.0 if DIRECTION=='left' else 1.0\n"
       "BODY_YAW_DEG=15.0; BODY_BANK_DEG=10.0; TORSO_COUNTER_DEG=5.0\n"
       "POSE_ACTIVE=False", "DIRECTION_PARAMS")
    # The named torso node is selected from actual rig; when it is ancestor of
    # walking legs it is honestly marked coupled, and gait is re-solved with it.
    s=exact_replace(s,"worldroot=names['SmartRigArmature'];mesh_n=names['Mesh_0']",
       "worldroot=names['SmartRigArmature'];mesh_n=names['Mesh_0']\n"
       "torso_node=names.get('Bone_001')", "ROOT_AND_TORSO_NODES")
    s=exact_replace(s, "base_s={i:np.asarray(n.get('scale',[1,1,1]),float) for i,n in enumerate(orig_nodes)}",
       "base_s={i:np.asarray(n.get('scale',[1,1,1]),float) for i,n in enumerate(orig_nodes)}\n"
       "BODY_PIVOT=np.array([0.,.72,0.],float)\n"
       "BODY_ROLL_DEG=(-DIR_SIGN*BODY_BANK_DEG if VARIANT=='dynamic' else 0.0)\n"
       "BODY_HEADING_DEG=(DIR_SIGN*BODY_YAW_DEG if VARIANT=='dynamic' else 0.0)\n"
       "TORSO_ROLL_DEG=(DIR_SIGN*TORSO_COUNTER_DEG if VARIANT=='dynamic' else 0.0)", "POSE_INIT_BEFORE_REST_SKIN")
    # M0/bind/rest witness checks must see SOURCE REST pose. Activate the
    # pose only after those exact checks and witness calculations complete.
    s=exact_replace(s,
       "  if i==worldroot:t+=root_delta\n  M=np.eye(4);M[:3,3]=t\n  R=base_R[i]",
       "  R=base_R[i]\n"
       "  if i==worldroot:\n"
       "   t+=root_delta\n"
       "   if POSE_ACTIVE and VARIANT=='dynamic':\n"
       "    tilt=Rot.from_euler('yz',[BODY_HEADING_DEG,BODY_ROLL_DEG],degrees=True).as_matrix()\n"
       "    t+=BODY_PIVOT-tilt@BODY_PIVOT\n"
       "    R=R@tilt\n"
       "  elif POSE_ACTIVE and VARIANT=='dynamic' and torso_node is not None and i==torso_node:\n"
       "   R=R@Rot.from_euler('z',TORSO_ROLL_DEG,degrees=True).as_matrix()\n"
       "  M=np.eye(4);M[:3,3]=t", "RIG_ORIENTATION_SKINNED_IK")
    s=exact_replace(s,"step_vec=np.array([STRIDE,0.,0.])",
       "step_vec=np.array([DIR_SIGN*STRIDE,0.,0.])\nPOSE_ACTIVE=True\n"
       "print('BODY_POSE='+json.dumps({'variant':VARIANT,'direction':DIRECTION,'root_yaw_deg':BODY_HEADING_DEG,'root_bank_deg':BODY_ROLL_DEG,'torso_counter_deg':TORSO_ROLL_DEG,'torso_node':torso_node,'pivot':BODY_PIVOT.tolist()}),flush=True)","ACTIVATE_POSE_AFTER_REST")
    s=exact_replace(s,"shift=np.array([STRIDE*t,0,0.])",
       "shift=np.array([DIR_SIGN*STRIDE*t,0,0.])","SIGNED_ROOT_MOTION")
    s=exact_replace(s,"assert all(results[i+1]['root_x']>results[i]['root_x'] for i in range(STEPS-1))",
       "assert all(DIR_SIGN*(results[i+1]['root_x']-results[i]['root_x'])>0 for i in range(STEPS-1))","DIRECTIONAL_MONOTONICITY")
    s=exact_replace(s,"assert sum(row['swing_count']==3 for row in results[:FRAME_PER_CYCLE])>=12",
       "assert sum(row['swing_count']==3 for row in results[:FRAME_PER_CYCLE])>=9","TRIPLE_SWING_THRESHOLD")
    s=exact_replace(s,"spec=importlib.util.spec_from_file_location('heady_renderer',str(Path(__file__).resolve().parent/'renderer_readonly_reference.py'))",
       "base=Path(__file__).resolve().parent.parent/'review_v03_8'\n"
       "sys.path.insert(0,str(base))\n"
       "spec=importlib.util.spec_from_file_location('heady_renderer',str(base/'renderer_readonly_reference.py'))","REFERENCED_RENDERER")
    s=exact_replace(s,"for ix,(sk,world,actual,targets,swing) in enumerate(frames_data):",
       "for ix in range(0,STEPS,2):\n sk,world,actual,targets,swing=frames_data[ix]","DECIMATED_REVIEW")
    s=exact_replace(s,"review[0].save(out/'Heady_v03_8_OverlappingTripod_Candidate.gif',save_all=True,append_images=review[1:],duration=[FRAME_MS]*(STEPS-1)+[850],optimize=False)",
       "review[0].save(out/'Heady_v03_10_4_DirectionalCandidate.gif',save_all=True,append_images=review[1:],duration=[FRAME_MS*2]*(len(review)-1)+[850],optimize=False)","GIF_NAME")
    s=exact_replace(s,"contact.paste(review[ix]","contact.paste(review[ix//2]","CONTACT_SHEET_FRAME_INDEX")
    s=exact_replace(s,"review.append(board)","review.append(board)\n print('RENDER_FRAME='+str(ix),flush=True)","RENDER_PROGRESS")
    s=exact_replace(s,"'gait':'STAGGERED_ALTERNATING_TRIPOD_OVERLAP'",
       "'gait':'DIRECTIONAL_PHASE_COUPLED_SCUTTLE'","GAIT_IDENTITY")
    s=exact_replace(s,"Three overlapping swing arcs, 0.05-cycle stagger per group",
       "Direction-paired gait, preserved 0.10-cycle stagger","CHART_TEXT")
    s=exact_replace(s,"'status':'STAGGERED_OVERLAP_CANDIDATE_GENERATED'",
       "'status':'DIRECTIONAL_EXPERIMENT_CANDIDATE_GENERATED'","STATUS")
    # The previous v03.10.2 node counter-rotation did not create a waist bend.
    # Disable Bone_001 motion entirely; it can be a parent of walking legs.
    s=exact_replace(s,"TORSO_COUNTER_DEG=5.0","TORSO_COUNTER_DEG=0.0\n"
       "MESH_TORSO_COUNTER_DEG=18.0; MESH_TORSO_BACKPITCH_DEG=-6.0\n"
       "MESH_HEAD_LEVEL_ROLL_DEG=8.0; MESH_HEAD_PITCH_DEG=6.0", "PROTECT_BONE001_AND_USE_DERIVED_MESH_CONTROL")
    # Rest-source verification happens with POSE_ACTIVE=False; the derived skin
    # deformation is applied only to actual animated frames. All leg-owned
    # vertices remain unchanged, especially the exact toe witness groups.
    marker="M0=build_matrices();binding=M0[skin2node]@IBM"
    control=r'''
# Non-destructive derived torso-control surface, added after original skeleton
# evaluation. Not a GLB/Blender rig bake. This is a measured visual experiment.
LEG_SKIN_INDEX=np.asarray(sorted({node2skin[n] for fam in chains.values() for n in fam}),int)
LEG_VERTEX_INFLUENCE=(np.isin(JI,LEG_SKIN_INDEX)*W).sum(axis=1)
TORSO_WAIST_REST_Y=0.76
TORSO_FULL_REST_Y=1.07
HEAD_TRANSITION_START=1.31
HEAD_TRANSITION_END=1.51

def _smooth01(x):
 z=np.clip(x,0.0,1.0)
 return z*z*(3.0-2.0*z)

def derived_counterbend(sk,ids,M):
 if not POSE_ACTIVE or VARIANT!='dynamic': return sk
 indices=np.arange(len(P),dtype=int) if ids is None else np.asarray(ids,int)
 # Bone-ownership guard: legs, planted foot witnesses, and hip socket skin
 # must stay under original skinned-IK control, never the cartoon torso morph.
 owner=LEG_VERTEX_INFLUENCE[indices]
 only_body=1.0-_smooth01((owner-0.20)/0.45)
 torso_w=_smooth01((P[indices,1]-TORSO_WAIST_REST_Y)/(TORSO_FULL_REST_Y-TORSO_WAIST_REST_Y))*only_body
 pivot=(M[worldroot]@np.array([0.0,0.82,0.0,1.0]))[:3]
 upper_rot=Rot.from_euler('xz',[MESH_TORSO_BACKPITCH_DEG,DIR_SIGN*MESH_TORSO_COUNTER_DEG],degrees=True)
 corrected=upper_rot.apply(sk-pivot)+pivot
 deformed=sk+(corrected-sk)*torso_w[:,None]
 # A second, smoothly blended head counter-rotation brings her face back
 # close to world-up after the deliberate opposing chest lean.
 neck=(M[worldroot]@np.array([0.0,1.38,0.0,1.0]))[:3]
 neck=upper_rot.apply(neck-pivot)+pivot
 head_w=_smooth01((P[indices,1]-HEAD_TRANSITION_START)/(HEAD_TRANSITION_END-HEAD_TRANSITION_START))*only_body
 head_rot=Rot.from_euler('xz',[MESH_HEAD_PITCH_DEG,-(BODY_ROLL_DEG+DIR_SIGN*MESH_TORSO_COUNTER_DEG)],degrees=True)
 head_target=head_rot.apply(deformed-neck)+neck
 return deformed+(head_target-deformed)*head_w[:,None]

def torso_witness_orientation(rest,animated,lo,hi):
 # Source-vertex witnesses, not commanded joint angles.
 owned=(LEG_VERTEX_INFLUENCE<0.28)
 band=(P[:,1]>=lo)&(P[:,1]<=hi)&(np.abs(P[:,0])<=0.36)&owned
 left=np.flatnonzero(band&(P[:,0]<-0.035))
 right=np.flatnonzero(band&(P[:,0]>0.035))
 if len(left)<3 or len(right)<3:
  raise RuntimeError('BODY_SURFACE_WITNESS_MISSING y=[%.2f,%.2f] counts=%d,%d'%(lo,hi,len(left),len(right)))
 def axis(points):
  L=np.mean(points[left],axis=0);R=np.mean(points[right],axis=0)
  return np.degrees(np.arctan2(R[1]-L[1],R[0]-L[0]))
 delta=(axis(animated)-axis(rest)+180)%360-180
 return float(delta),dict(left_count=int(len(left)),right_count=int(len(right)))

def real_pose_gate(animated):
 pelvis,pc=torso_witness_orientation(restskin,animated,0.65,0.79)
 chest,cc=torso_witness_orientation(restskin,animated,1.16,1.28)
 head,hc=torso_witness_orientation(restskin,animated,1.49,1.61)
 report={'pelvis_surface_roll_deg':pelvis,'chest_surface_roll_deg':chest,
         'head_surface_roll_deg':head,'pelvis_vs_chest_deg':abs(chest-pelvis),
         'pelvis_witness':pc,'chest_witness':cc,'head_witness':hc,
         'mesh_counterbend_mode':'DERIVED_POST_SKIN_CARTOON_WAIST',
         'body_source_glb_unmodified':True,'blender_bake':'NOT_RUN'}
 # A visible counterbend requires pelvis/chest opposite slopes; a JSON
 # angle setting or skeleton overlay alone is not acceptance.
 if not (abs(pelvis)>=5.0 and abs(chest)>=3.0 and pelvis*chest<0.0 and
         abs(chest-pelvis)>=11.0 and abs(head)<=8.0):
  raise RuntimeError('POSTURE_GEOMETRY_GATE_FAILED '+json.dumps(report))
 return report
'''
    s=exact_replace(s,marker,control+'\n'+marker,'DERIVED_MESH_SURFACE_CONTROL_BEFORE_REST')
    s=exact_replace(s," return sk\n\nrestskin=skin_vertices(M0)",
       " return derived_counterbend(sk,ids,M)\n\nrestskin=skin_vertices(M0)","APPLY_DEFORMATION_ON_ACTUAL_SKIN")
    anchor="results=[];frames_data=[];angle_tracks=[]"
    s=exact_replace(s,anchor,"POSE_GEOMETRY=None\n"+anchor,"GEOMETRY_GATE_DECLARATION")
    anchor=" frames_data.append((sk,world,actual,targets,swing))"
    addition=''' frames_data.append((sk,world,actual,targets,swing))
 if tick==40:
  POSE_GEOMETRY=real_pose_gate(sk)
  print('REAL_MESH_POSTURE='+json.dumps(POSE_GEOMETRY,sort_keys=True),flush=True)
'''
    s=exact_replace(s,anchor,addition.rstrip('\n'),"WITNESS_ACTUAL_SURFACE_AT_MIDSTEP")
    anchor="(out/'OVERLAP_RESULT_RECEIPT.json').write_text(json.dumps(receipt,indent=2)+'\\n')"
    s=exact_replace(s,anchor,
       "receipt['real_surface_posture']=POSE_GEOMETRY\n"
       "receipt['visual_skin_correction']='DERIVED_WAIST_DEFORM_NOT_RIG_BAKE'\n"
       "(out/'POSE_GEOMETRY_VALIDATION.json').write_text(json.dumps(POSE_GEOMETRY,indent=2)+'\\n')\n"+anchor,
       "PERSIST_OBSERVED_GEOMETRY")
    # Bone tracks cannot replay the nonrigid corrective surface by themselves.
    # The next two writes insert the metadata atomically before data serialization.
    # Append real, unambiguous variant-specific metadata to both track and receipt.
    s=exact_replace(s,"(out/'overlap_bone_tracks.json').write_text(",
       "tracks.update({'direction':DIRECTION,'variant':VARIANT,'body_yaw_deg':BODY_HEADING_DEG,'body_bank_deg':BODY_ROLL_DEG,"
       "'torso_counter_deg':MESH_TORSO_COUNTER_DEG,'waist_deformation':'DERIVED_POST_SKIN_NOT_IN_BONE_TRACKS',"
       "'backward_pitch_deg':MESH_TORSO_BACKPITCH_DEG})\n"
       "(out/'overlap_bone_tracks.json').write_text(","TRACK_METADATA")
    s=exact_replace(s,"(out/'OVERLAP_RESULT_RECEIPT.json').write_text(",
       "receipt.update({'direction':DIRECTION,'variant':VARIANT,'body_yaw_deg':BODY_HEADING_DEG,'body_bank_deg':BODY_ROLL_DEG,"
       "'torso_counter_deg':MESH_TORSO_COUNTER_DEG,'source_rest_hash':sourcehash})\n"
       "(out/'OVERLAP_RESULT_RECEIPT.json').write_text(","RECEIPT_METADATA")
    s=exact_replace(s,"print('OVERLAP_RESULT='+json.dumps(receipt),flush=True)",
       "print('V03104_RESULT='+json.dumps(receipt),flush=True)","FINAL_LOG")
    compile(s,"heady_v03104_derived.py","exec")
    return s

def write_once(path, raw):
    path=Path(path)
    if path.exists():
        if path.read_bytes()!=raw:
            raise Blocked("IMMUTABLE_OUTPUT_CONFLICT:"+str(path))
        return "REUSED"
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_name(path.name+".tmp-"+str(os.getpid()))
    try:
        with tmp.open("xb") as f:
            f.write(raw);f.flush();os.fsync(f.fileno())
        os.replace(tmp,path)
    finally:
        if tmp.exists():tmp.unlink()
    return "INSTALLED"

def run_solver(engine,source,out):
    global STATUS, LOG_PATH
    STATUS="SOLVING_AND_RENDERING"
    info("STAGE",STATUS)
    LOG_PATH=RUN_ROOT/RUN_ID/(os.environ.get("HEADY_DIRECTION","dir")+"_"+os.environ.get("HEADY_VARIANT","variant")+"_solver.log")
    LOG_PATH.parent.mkdir(parents=True,exist_ok=True)
    env=dict(os.environ, MPLBACKEND="Agg",PYTHONUNBUFFERED="1")
    # Run in an isolated process, with full raw logs captured, no shell injection.
    with LOG_PATH.open("w",encoding="utf-8") as logfile:
        proc=subprocess.Popen([sys.executable,"-u",str(engine),str(source),str(out)],
                              cwd=str(engine.parent),env=env,stdin=subprocess.DEVNULL,
                              stdout=subprocess.PIPE,stderr=subprocess.STDOUT,
                              text=True,bufsize=1,errors="replace")
        tick_last=-1
        try:
            assert proc.stdout is not None
            for line in proc.stdout:
                logfile.write(line);logfile.flush()
                if line.startswith("TICK="):
                    try: tick=int(line[5:8])
                    except ValueError: tick=-1
                    if tick%6==0 and tick!=tick_last:
                        info("SOLVER",line.strip())
                        tick_last=tick
                elif line.startswith("RENDER_FRAME="):
                    try: frame=int(line.strip().split("=",1)[1])
                    except ValueError: frame=-1
                    if frame>=0 and frame%12==0: info("RENDER",str(frame)+"/84")
                elif line.startswith(("OVERLAP_RESULT=","V03104_RESULT=")):
                    info("SOLVER_RECEIPT",line.strip()[-650:])
        except KeyboardInterrupt:
            proc.terminate();proc.wait(timeout=10)
            raise
        rc=proc.wait()
    if rc:
        tail=LOG_PATH.read_text(errors="replace").splitlines()[-9:]
        raise Blocked("SOLVER_FAILED_EXIT_"+str(rc)+": "+" | ".join(tail)[-1500:])

def chart_actual_lifts(out):
    """Plot actual solver-produced lift, swing concurrency and world movement."""
    import csv
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    with (out/"overlap_85ticks.csv").open(newline="") as f:
        rows=list(csv.DictReader(f))
    if len(rows)!=85:raise Blocked("EXPECTED_85_ROWS_BEFORE_CHART")
    fig,axs=plt.subplots(3,1,figsize=(11,8),sharex=True)
    for leg in PHASE:
        axs[0].plot(range(len(rows)),[float(r[leg+"_lift"]) for r in rows],label=leg)
    axs[0].set_ylabel("Observed solver foot lift")
    axs[0].legend(ncol=3,fontsize=8)
    counts=[int(r["swing_count"]) for r in rows]
    axs[1].step(range(len(rows)),counts,where="mid")
    axs[1].set_ylim(0,3.5);axs[1].set_yticks([1,2,3])
    axs[1].set_ylabel("Simultaneously swinging")
    axs[2].plot(range(len(rows)),[float(r["root_x"]) for r in rows])
    axs[2].set_ylabel("World-fixed body X")
    axs[2].set_xlabel("Source-skinned solver tick")
    fig.suptitle("Heady v03.10.4 | symmetrical directional stride + 10deg cartoon bank")
    fig.tight_layout()
    fig.savefig(out/"Overlap_Actual_LiftCurves_And_BodyMotion.png",dpi=135)
    plt.close(fig)

def verify_generated(out, source, variant, direction):
    global STATUS
    STATUS="VERIFY_SOURCE_SKINNED_OUTPUT"
    names=[GIF,"overlap_85ticks.csv","overlap_bone_tracks.json","OVERLAP_RESULT_RECEIPT.json","Overlap_SixStates_Review.png","Overlap_Contact_Drift_Stability.png","POSE_GEOMETRY_VALIDATION.json"]
    for name in names:
        path=out/name
        if not path.is_file() or not path.stat().st_size:raise Blocked("MISSING_OUTPUT:"+str(path))
    import csv
    with (out/"overlap_85ticks.csv").open(newline="") as f:rows=list(csv.DictReader(f))
    if len(rows)!=85:raise Blocked("EXPECTED_85_SOLVER_FRAMES")
    counts=collections.Counter(int(r["swing_count"]) for r in rows)
    if dict(counts)!=phase_histogram()[0]:raise Blocked("SWING_COUNT_HISTOGRAM_DRIFT")
    if min(float(r["support_margin_proxy"]) for r in rows)<=.05:raise Blocked("SUPPORT_MARGIN_VIOLATION")
    if max(float(r["stance_drift_max"]) for r in rows)>=.0002:raise Blocked("PLANTED_FOOT_SLIP")
    if min(float(r["mesh_min_y"]) for r in rows)<=-.001:raise Blocked("MODEL_FLOOR_PENETRATION")
    sign=-1 if direction=="left" else 1
    roots=[float(r["root_x"]) for r in rows]
    if abs(roots[-1]-(sign*.56))>1e-8:raise Blocked("WRONG_ROOT_TRAVEL_DISTANCE")
    if not all(sign*(b-a)>0 for a,b in zip(roots,roots[1:])):raise Blocked("ROOT_REVERSED_OR_STALLED")
    tr=json.loads((out/"overlap_bone_tracks.json").read_text())
    rec=json.loads((out/"OVERLAP_RESULT_RECEIPT.json").read_text())
    if tr.get("source_sha256")!=SOURCE_GLB_SHA or len(tr.get("angles_by_tick",[]))!=85:
        raise Blocked("TRACK_OR_SOURCE_MISMATCH")
    if tr.get("direction")!=direction or tr.get("variant")!=variant or rec.get("direction")!=direction or rec.get("variant")!=variant:
        raise Blocked("DIRECTION_OR_VARIANT_RECEIPT_MISMATCH")
    if rec.get("visual_acceptance")!="PENDING":raise Blocked("UNAUTHORIZED_VISUAL_APPROVAL")
    real=json.loads((out/"POSE_GEOMETRY_VALIDATION.json").read_text())
    if real != rec.get("real_surface_posture"):
        raise Blocked("SURFACE_GEOMETRY_RECEIPT_MISMATCH")
    if not (abs(real["pelvis_surface_roll_deg"])>=5.0 and
            abs(real["chest_surface_roll_deg"])>=3.0 and
            real["pelvis_surface_roll_deg"]*real["chest_surface_roll_deg"]<0.0 and
            real["pelvis_vs_chest_deg"]>=11.0 and
            abs(real["head_surface_roll_deg"])<=8.0):
        raise Blocked("BODY_ACTUAL_SURFACE_BEND_NOT_VISIBLE")
    exp_bank=0 if variant=="straight" else sign*-10.0
    exp_yaw=0 if variant=="straight" else sign*15.0
    if tr.get("body_bank_deg")!=exp_bank or tr.get("body_yaw_deg")!=exp_yaw:
        raise Blocked("BODY_ANGLE_MISMATCH")
    if tr.get("torso_counter_deg")!=18.0 or tr.get("waist_deformation")!="DERIVED_POST_SKIN_NOT_IN_BONE_TRACKS":
        raise Blocked("UPPER_BODY_CONTROL_MISSING_IN_TRACK_PROVENANCE")
    from PIL import Image
    im=Image.open(out/GIF)
    if im.n_frames!=43:raise Blocked("GIF_FRAME_COUNT_NOT_43")
    if sha(source)!=SOURCE_GLB_SHA:raise Blocked("ORIGINAL_MODEL_CHANGED")
    info("VALIDATED",f"{variant}_{direction}: 85 source-skinned ticks; 43 preview frames; root={roots[-1]:+.3f}; min_margin={min(float(r['support_margin_proxy']) for r in rows):.4f}; max_stance_drift={max(float(r['stance_drift_max']) for r in rows):.8f}")
    return {"variant":variant,"direction":direction,"root_x":roots[-1],"gif_sha256":sha(out/GIF),"max_stance_drift":max(float(r["stance_drift_max"]) for r in rows),"min_support_margin":min(float(r["support_margin_proxy"]) for r in rows)}

def make_comparison(out):
    """Use new dynamic L/R; include existing v03.10.2 straight previews if present.
    Never regenerate or overwrite prior-version media.
    """
    from PIL import Image, ImageDraw
    base=out.parent/"review_v03_10_2"
    samples=[]
    for direction in ("left","right"):
        prior=base/("straight_"+direction)/"Heady_v03_10_2_DirectionalCandidate.gif"
        if prior.is_file():samples.append(("PREVIOUS STRIDE "+direction.upper(),prior))
        now=out/("dynamic_"+direction)/GIF
        samples.append(("COUNTERBEND "+direction.upper(),now))
    thumbs=[]
    for label,path in samples:
        if not path.is_file():raise Blocked("COMPARISON_SOURCE_MISSING:"+str(path))
        with Image.open(path) as im:
            im.seek(min(im.n_frames-1,20))
            frame=im.convert("RGB")
            ImageDraw.Draw(frame).rectangle((0,0,frame.width,30),fill=(12,15,22))
            ImageDraw.Draw(frame).text((12,8),label,fill=(255,255,255))
            thumbs.append(frame)
    w,h=thumbs[0].size
    rows=(len(thumbs)+1)//2
    sheet=Image.new("RGB",(w*2,h*rows),(12,15,22))
    for i,frame in enumerate(thumbs):sheet.paste(frame,((i%2)*w,(i//2)*h))
    path=out/"Heady_v03_10_4_ComparisonSheet.png"
    sheet.save(path,optimize=True)
    return path

def publish_public(dest, subdirs):
    global STATUS
    STATUS="PUBLIC_MEDIA_PUBLISH"
    info("STAGE",STATUS)
    paths=[]
    shared=Path.home()/"storage"
    for target in (shared/"pictures",shared/"downloads"):
        if not target.is_dir():raise Blocked("ANDROID_PUBLIC_FOLDER_NOT_ACCESSIBLE:"+str(target))
        for variant,direction in subdirs:
            rel=f"{variant}_{direction}"
            source=dest/rel/GIF
            file=target/f"Heady_v03_10_4_{rel}.gif"
            published_copy(source,file)
            paths.append(file)
        source=dest/"Heady_v03_10_4_ComparisonSheet.png"
        target_file=target/source.name
        published_copy(source,target_file)
        paths.append(target_file)
    scanner=shutil.which("termux-media-scan")
    info("MEDIA_SCAN_POLICY","EXACT_PUBLISHED_ARTIFACTS_ONLY")
    for f in paths:
        state="UNAVAILABLE"
        if scanner:
            try:
                p=command([scanner,str(f)],timeout=12,must=False)
                state="REQUESTED_NOT_INDEX_CONFIRMED" if p.returncode==0 else "EXIT_"+str(p.returncode)
            except Blocked:state="TIMEOUT_OR_FAILED"
        info("MEDIA_SCAN",str(f)+" "+state)
    opener=shutil.which("termux-open")
    if opener:
        try:
            p=command([opener,str(shared/"downloads"/"Heady_v03_10_4_dynamic_left.gif")],timeout=15,must=False)
            info("VIEWER_OPEN","REQUESTED_NOT_CONFIRMED" if p.returncode==0 else "FAILED_EXIT_"+str(p.returncode))
        except Blocked:info("VIEWER_OPEN","FAILED_OR_TIMED_OUT")
    else:info("VIEWER_OPEN","UNAVAILABLE")
    return [{"path":str(p),"sha256":sha(p),"size":p.stat().st_size} for p in paths]

def published_copy(source,target):
    if not source.is_file():raise Blocked("MISSING_PUBLICATION_SOURCE:"+str(source))
    source_digest=sha(source)
    if target.exists():
        if sha(target)!=source_digest:raise Blocked("PUBLIC_FILENAME_COLLISION:"+str(target))
        info("PUBLIC_REUSED",str(target)+" SHA256="+source_digest)
        return
    import tempfile
    temp=target.with_name(target.name+".temporary."+str(os.getpid()))
    try:
        shutil.copyfile(source,temp)
        if sha(temp)!=source_digest:raise Blocked("PUBLIC_COPY_MISMATCH:"+str(target))
        os.replace(temp,target)
    finally:
        if temp.exists():temp.unlink()
    if sha(target)!=source_digest:raise Blocked("PUBLIC_READBACK_FAILED:"+str(target))
    info("PUBLIC_FILE",str(target)+" SHA256="+source_digest)

def commit_scoped(root, paths, message):
    """Local commit of only newly verified metadata, preserving unrelated staged paths."""
    global STATUS
    current=command(["git","-C",root,"rev-parse","HEAD"]).stdout.strip()
    existing=command(["git","-C",root,"diff","--cached","--name-only"]).stdout.splitlines()
    for path in paths:
        file=root/path
        if not file.is_file():raise Blocked("COMMIT_INPUT_NOT_FOUND:"+path)
        ignored=command(["git","-C",root,"check-ignore","-q","--",path],must=False)
        if ignored.returncode==0:raise Blocked("COMMIT_INPUT_IGNORED:"+path)
    # 'intent to add' makes untracked files eligible for --only while preserving staged files.
    command(["git","-C",root,"add","-N","--",*paths])
    pending=command(["git","-C",root,"diff","HEAD","--name-only","--",*paths]).stdout.strip()
    if pending:
        STATUS="LOCAL_SCOPED_COMMIT"
        info("STAGE",STATUS)
        command(["git","-C",root,"commit","--only","-m",message,"--",*paths],timeout=90)
    actual=command(["git","-C",root,"diff","--cached","--name-only"]).stdout.splitlines()
    # No independently staged data should have been consumed or removed.
    if sorted(x for x in existing if x not in paths)!=sorted(x for x in actual if x not in paths):
        raise Blocked("UNRELATED_STAGED_FILES_CHANGED")
    updated=command(["git","-C",root,"rev-parse","HEAD"]).stdout.strip()
    info("LOCAL_COMMIT",updated if updated!=current else "REUSED_"+updated)
    return updated

def main():
    global STATUS,RUN_ID,RECEIPT
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo")
    parser.add_argument("--run",action="store_true")
    parser.add_argument("--audit",action="store_true")
    args=parser.parse_args()
    if not (args.audit or args.run):parser.error("choose --audit or --run")
    RUN_ID=dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")+"-"+str(os.getpid())
    info("CAMPAIGN",ID);info("VERSION",VERSION);info("RUN_ID",RUN_ID)
    root=root_find(args.repo);base=root/BASE_REL;dest=root/OUT_REL
    info("RESOLVED_REPO",root)
    info("BRANCH",command(["git","-C",root,"branch","--show-current"]).stdout.strip())
    info("HEAD",command(["git","-C",root,"rev-parse","HEAD"]).stdout.strip())
    source=base/SRC_GLB;engine_source=base/SRC_ENGINE
    for name in BASE_FILES+["overlap_bone_tracks.json","FILES_SHA256.json"]:
        if not (base/name).is_file():raise Blocked("BASELINE_FILE_MISSING:"+name)
    if sha(source)!=SOURCE_GLB_SHA or sha(engine_source)!=SOURCE_ENGINE_SHA:raise Blocked("CANONICAL_GLTF_OR_ENGINE_HASH_MISMATCH")
    manifests=json.loads((base/"FILES_SHA256.json").read_text())
    for name in BASE_FILES+["overlap_bone_tracks.json"]:
        if sha(base/name)!=manifests.get(name):raise Blocked("BASELINE_FILE_MANIFEST_MISMATCH:"+name)
    # Read-only root checkout: don't modify original or prior v03.9.3.
    dirty=command(["git","-C",root,"status","--porcelain","--",str(BASE_REL)],must=False).stdout.strip()
    if dirty:raise Blocked("BASELINE_CHANGED_OR_DIRTY")
    info("SOURCE_GLB_SHA256",SOURCE_GLB_SHA)
    info("SOURCE_ENGINE_SHA256",SOURCE_ENGINE_SHA)
    pairs=[("dynamic","left"),("dynamic","right")]
    geometry={direction:footprint_safety(base,direction,.16) for direction in ("left","right")}
    s=make_engine(engine_source.read_text());digest=hashlib.sha256(s.encode()).hexdigest()
    compile(s,"heady_v03104_derived_engine.py","exec")
    info("DERIVED_ENGINE_COMPILE","PASS")
    info("GENERATED_ENGINE_SHA256",digest)
    info("TARGET_STRIDE",.16);info("EXPECTED_TRAVEL_MAGNITUDE",.56)
    info("BODY_BANK_DEG",10.0);info("ROOT_HEADING_DEG",15.0)
    info("TORSO_COUNTER_DEG",18.0);info("BACKWARD_PITCH_DEG",6.0)
    info("POSE_CONTROL","DERIVED_SKIN_SURFACE_WITH_LEG_OWNERSHIP_GUARD")
    if args.audit:
        info("RESULT","AUDIT_PASS_NO_FILES_CHANGED");return
    import importlib.util
    for dep in ("numpy","scipy","PIL","matplotlib"):
        if importlib.util.find_spec(dep) is None:raise Blocked("MISSING_DEPENDENCY:"+dep)
    RUN_ROOT.mkdir(parents=True,exist_ok=True)
    lock=RUN_ROOT/"active.lock"
    try:lock.mkdir()
    except FileExistsError:raise Blocked("CAMPAIGN_ALREADY_RUNNING_OR_STALE_LOCK:"+str(lock))
    try:
        STATUS="PREPARE_NEW_VERSIONED_CANDIDATE"
        info("STAGE",STATUS)
        path=dest/"heady_directional_engine_v03_10_4.py"
        entry_py=root/"tools/campaigns/heady_grounded_ik_v03_10_4.py"
        entry_sh=root/"tools/campaigns/heady_grounded_ik_v03_10_4.sh"
        bundle_env=os.environ.get("HEADY_V03104_BUNDLE","")
        if not bundle_env or not Path(bundle_env).is_file():raise Blocked("VERIFIED_CAMPAIGN_BUNDLE_NOT_AVAILABLE")
        inputs=[(path,s.encode()),(entry_py,Path(__file__).read_bytes()),(entry_sh,Path(bundle_env).read_bytes())]
        for p,b in inputs:
            if p.exists() and p.read_bytes()!=b:raise Blocked("NEW_VERSION_FILE_CONFLICT:"+str(p))
        for p,b in inputs:write_once(p,b)
        contract={"schema":"pose-lab-v2-campaign-contract-v2","campaign":ID,"version":VERSION,
          "previous":"03.10.2 rigid-body failed visual acceptance; retained unchanged","accepted_baseline":"03.9.3",
          "source_glb_sha256":SOURCE_GLB_SHA,"source_engine_sha256":SOURCE_ENGINE_SHA,
          "derived_engine_sha256":digest,"phase_offsets":PHASE,"stride":.16,"total_travel":.56,
          "variants":[a+"_"+b for a,b in pairs],"bank_deg":10.0,"yaw_deg":15.0,"counter_deg":18.0,
          "pitch_back_deg":6.0,"head_level_target_deg":0.0,"skinspace_visual_only":True,"rig_bake":"NOT_DONE",
          "footprint_safety":{"left":geometry["left"],"right":geometry["right"]},
          "status":"UNACCEPTED_COUNTERBEND_EXPERIMENT","no_new_glb":True,"no_remote_writes":True,
          "locks":["original GLB","v03.4 human accepted right-middle step","v03.9.3 approved full six leg gait","phase timing","source rig and skin","claws and hair"]}
        write_once(dest/"VERSION_CONTRACT.json",(json.dumps(contract,indent=2,sort_keys=True)+"\n").encode())
        results=[]
        for variant,direction in pairs:
            tag=variant+"_"+direction
            out=dest/tag
            info("EXPERIMENT",tag)
            ready=all((out/name).is_file() for name in [GIF,"overlap_85ticks.csv","overlap_bone_tracks.json","OVERLAP_RESULT_RECEIPT.json"])
            if ready:
                verified=verify_generated(out,source,variant,direction)
                info("RECOVERY","EXISTING_VERIFIED_RESULT_REUSED_"+tag)
            elif any((out/name).exists() for name in [GIF,"overlap_85ticks.csv","overlap_bone_tracks.json","OVERLAP_RESULT_RECEIPT.json"]):
                raise Blocked("INCOMPLETE_RESULT_PRESERVED_WITHOUT_OVERWRITE:"+str(out))
            else:
                # Stage on the SAME filesystem, leaving prior releases untouched. An
                # interrupted solver cannot poison its final versioned destination.
                temp=dest/(".incomplete_"+tag+"_"+RUN_ID)
                if out.exists():
                    raise Blocked("VERSIONED_OUTPUT_CONFLICT_PRESERVED:"+str(out))
                temp.mkdir(parents=True,exist_ok=False)
                os.environ["HEADY_VARIANT"]=variant
                os.environ["HEADY_DIRECTION"]=direction
                run_solver(path,source,temp)
                chart_actual_lifts(temp)
                verified=verify_generated(temp,source,variant,direction)
                if out.exists():raise Blocked("CONCURRENT_OUTPUT_CONFLICT:"+str(out))
                temp.rename(out)
                info("PROMOTED_VERIFIED_VARIANT",tag)
            results.append(verified)
            # Immediate hash-readback delivery of this exact candidate.
            # Full comparison and commit occur only after all two corrected directional candidates pass.
            for public_root in (Path.home()/"storage/pictures", Path.home()/"storage/downloads"):
                if not public_root.is_dir():raise Blocked("PUBLIC_FOLDER_UNAVAILABLE:"+str(public_root))
                target=public_root/f"Heady_v03_10_4_{tag}.gif"
                published_copy(out/GIF,target)
                scanner=shutil.which("termux-media-scan")
                if scanner:
                    scan_result=command([scanner,str(target)],timeout=12,must=False)
                    info("MEDIA_SCAN_EARLY",str(target)+(" REQUESTED_NOT_INDEX_CONFIRMED" if scan_result.returncode==0 else "EXIT_"+str(scan_result.returncode)))
            info("VISUAL_PREVIEW_AVAILABLE",tag)
            if tag=="dynamic_left":
                opener=shutil.which("termux-open")
                if opener:
                    try:
                        op=command([opener,str(Path.home()/"storage/downloads"/f"Heady_v03_10_4_{tag}.gif")],timeout=12,must=False)
                        info("VIEWER_OPEN_EARLY","REQUESTED_NOT_CONFIRMED" if op.returncode==0 else "FAILED_EXIT_"+str(op.returncode))
                    except Blocked:info("VIEWER_OPEN_EARLY","FAILED_OR_TIMEOUT")
                else:info("VIEWER_OPEN_EARLY","UNAVAILABLE")
        if abs(abs(results[0]["root_x"])-abs(results[1]["root_x"]))>1e-9:
            raise Blocked("LEFT_RIGHT_DISTANCE_MISMATCH_COUNTERBEND")
        make_comparison(dest)
        STATUS="VERIFIED_EXPERIMENTS_READY"
        info("STAGE",STATUS)
        receipt={"campaign":ID,"version":VERSION,"source_glb_sha256":SOURCE_GLB_SHA,
           "runs":results,"human_verdict":"PENDING","physics":"NOT_EXECUTED",
           "blender":"NOT_EXECUTED","git_remote_writes":"NOT_ATTEMPTED"}
        write_once(dest/"EXPERIMENT_VERIFICATION.json",(json.dumps(receipt,indent=2,sort_keys=True)+"\n").encode())
        # Scoped LOCAL commit: source scripts, contract, tracks, receipts; never stage big GIF files.
        owned=[str(OUT_REL/"heady_directional_engine_v03_10_4.py"),str(OUT_REL/"VERSION_CONTRACT.json"),
          str(OUT_REL/"EXPERIMENT_VERIFICATION.json"),
          "tools/campaigns/heady_grounded_ik_v03_10_4.py","tools/campaigns/heady_grounded_ik_v03_10_4.sh"]
        for a,b in pairs:
            owned.extend([str(OUT_REL/(a+"_"+b)/name) for name in
              ("overlap_85ticks.csv","overlap_bone_tracks.json","OVERLAP_RESULT_RECEIPT.json","POSE_GEOMETRY_VALIDATION.json")])
        impl_commit="SKIPPED_VERSION_CONTROL_OPTIONAL_OWNER_AUTHORITY"
        info("LOCAL_GIT",impl_commit)
        published=publish_public(dest,pairs)
        delivery={"implementation_commit":impl_commit,"files":published,"human_verdict":"PENDING",
          "media_scan":"REQUESTED_PER_FILE_NOT_FILES_UI_CONFIRMED","original_glb_intact":sha(source)==SOURCE_GLB_SHA}
        receipt_path=dest/"DELIVERY_RECEIPT_v03_10_4.json"
        if receipt_path.exists():
            prior=json.loads(receipt_path.read_text())
            pfiles=prior.get("files",[])
            if len(pfiles)!=len(published) or any(a.get("path")!=b.get("path") or a.get("sha256")!=b.get("sha256") for a,b in zip(pfiles,published)):
                raise Blocked("EXISTING_DELIVERY_RECEIPT_CONFLICT_PRESERVED")
            info("DELIVERY_RECEIPT","VERIFIED_REUSED_NO_OVERWRITE")
        else:
            write_once(receipt_path,(json.dumps(delivery,indent=2,sort_keys=True)+"\n").encode())
        receipt_commit="SKIPPED_VERSION_CONTROL_OPTIONAL_OWNER_AUTHORITY"
        info("RECEIPT_COMMIT",receipt_commit)
        info("PICTURES_AND_DOWNLOADS","SHA256_READBACK_VERIFIED")
        info("VISUAL_ACCEPTANCE","PENDING_OWNER_VERDICT")
        info("RESULT","TWO_COUNTERBEND_CANDIDATES_DELIVERED_PENDING_HUMAN_APPROVAL")
    finally:
        try:lock.rmdir()
        except OSError:pass

if __name__=="__main__":
    try:main()
    except (Blocked,OSError,ValueError,KeyError,ImportError,AssertionError,TypeError,IndexError) as exc:
        info("RESULT","BLOCKED")
        info("LAST_STAGE",STATUS)
        info("CAUSE",type(exc).__name__+": "+str(exc))
        info("PRESERVATION","NO_OLD_GLB_OR_PRIOR_CAMPAIGN_CHANGED; NO_GITHUB_WRITES")
        if LOG_PATH:info("DEBUG_LOG",LOG_PATH)
        sys.exit(2)
HEADY_PY_SOURCE_V03104_IMMUTABLE
EXPECTED_PY_SHA='521de9757f3450f7e3e1eeee88fb9a79bbc9f526faa652cb97fbe24bc6fe6939'
ACTUAL_PY_SHA="$(sha256sum "$PYFILE" | cut -d' ' -f1)"
if [[ "$ACTUAL_PY_SHA" != "$EXPECTED_PY_SHA" ]]; then
 echo "RESULT=BLOCKED_EMBEDDED_PYTHON_SHA256_MISMATCH expected=$EXPECTED_PY_SHA actual=$ACTUAL_PY_SHA";exit 60
fi
printf 'EMBEDDED_PYTHON_SHA256=%s\n' "$ACTUAL_PY_SHA"
if ! command -v python3 >/dev/null 2>&1; then echo 'RESULT=BLOCKED_PYTHON_UNAVAILABLE';exit 61;fi
python3 -m py_compile "$PYFILE" || { echo 'RESULT=BLOCKED_PY_COMPILE';exit 62; }
echo 'STAGE=PRECHECK_AND_SOURCE_AUDIT'
python3 -u "$PYFILE" --audit || { echo 'TERMUX_LAUNCHER_RESULT=BLOCKED_AUDIT';exit 63; }
echo 'STAGE=SOLVE_TWO_COUNTERBEND_CANDIDATES'
python3 -u "$PYFILE" --run || { echo 'TERMUX_LAUNCHER_RESULT=BLOCKED_WITH_PRESERVATION';exit 64; }
echo 'TERMUX_LAUNCHER_RESULT=TWO_NEW_CANDIDATES_DELIVERED_FOR_HUMAN_REVIEW'

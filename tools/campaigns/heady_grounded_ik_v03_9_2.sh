#!/usr/bin/env bash
# HEADY_GROUNDED_IK v03.9.2, one-file/one-invocation Termux campaign.
# Original invocation: bash "$HOME/storage/downloads/HEADY_GROUNDED_IK_v03_9_2_TERMUX_CAMPAIGN.sh"
# The accompanying hash-verified launcher also accepts Android (1) suffixes.
# One canonical 52-joint GLB; no new GLBs or ZIPs, no GitHub remote writes.
set -Eeuo pipefail
export PYTHONUNBUFFERED=1
SELF="$(realpath -- "${BASH_SOURCE[0]}")"
export HEADY_V0392_BUNDLE="$SELF"
echo 'CAMPAIGN=HEADY_GROUNDED_IK'
echo 'VERSION=03.9.2'
echo "SCRIPT_PATH=$SELF"
echo "SCRIPT_SHA256=$(sha256sum "$SELF" | cut -d' ' -f1)"
echo 'PHASE=VERIFY_SELF_CONTAINED_PAYLOAD'
mkdir -p "$HOME/.cache"
TEMP_DIR="$(mktemp -d "$HOME/.cache/heady-v0392.XXXXXXXX")"
cleanup() { rm -rf -- "$TEMP_DIR"; }
trap cleanup EXIT
PYFILE="$TEMP_DIR/heady_grounded_ik_v03_9_2.py"
cat > "$PYFILE" <<'HEADY_PY_SOURCE_V0392_DO_NOT_EDIT'
#!/usr/bin/env python3
"""HEADY_GROUNDED_IK v03.9.2: support-checked rolling-overlap PHASE correction of v03.8.

Original single-invocation form:
  python3 heady_grounded_ik_v03_9_2.py --run

Runs on the authorized Android/Termux Pose Lab checkout, from ANY working
folder. Reuses the exact existing 52-joint model and existing v03.8 IK/renderer;
no GLB or ZIP duplicate, local scoped Git commits only, no remote writes, no Blender.
The only commissioned gait changes are six phase offsets; the preview uses
43 of the 85 solved frames to bound raster work. Human verdict remains pending.
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
VERSION = "03.9.2"
ROOT_NAME = "pose-lab-v2"
BASE_REL = Path("tools/heady/campaigns/grounded_ik_v03/review_v03_8")
OUT_REL = Path("tools/heady/campaigns/grounded_ik_v03/review_v03_9_2")
SRC_ENGINE = "six_leg_overlap_engine.py"
SRC_GLB = "Meshy_AI_Character_output (1).glb"
SOURCE_GLB_SHA = "8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27"
SOURCE_ENGINE_SHA = "fcadee825ce5591e9b47f54d839e72dd3709aa4fd4359ca1637346f04ccb7d20"
PHASE = {
 "left_front": 0.0, "left_middle": 0.61, "left_rear": 0.22,
 "right_front": 0.5, "right_middle": 0.11, "right_rear": 0.72,
}
SWING = 0.39
RUN_ROOT = Path.home() / ".local/share/heady-grounded-ik-v0392"
GIF = "Heady_v03_9_2_RollingOverlap_Candidate.gif"
MEDIA = [GIF, "Overlap_SixStates_Review.png", "Overlap_Actual_LiftCurves_And_BodyMotion.png", "Overlap_Contact_Drift_Stability.png", "Overlap_Frame_016.png"]
BASE_FILES = ["renderer_readonly_reference.py", "renderer_accelerated_v034.py", SRC_ENGINE, SRC_GLB]
VALIDATION = {"frames": 85, "swing_range": [2, 3], "body_advance": 0.42,
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
    counts = []
    for tick in range(85):
        t = (tick/24.0) % 1.0
        counts.append(sum((t-p)%1 < SWING-1e-10 for p in phase.values()))
    return dict(sorted(collections.Counter(counts).items())), counts

def support_schedule_preflight(base, phase=PHASE):
    """Derive support from ACTUAL source-skinned v03.8 toe landmarks.

    This is a kinematic body-origin proxy, NOT actual CoM or dynamics.
    Check all 85 timestamps before spending phone resources on skin IK.
    """
    import math
    source=base/"overlap_bone_tracks.json"
    manifest=json.loads((base/"FILES_SHA256.json").read_text())
    if sha(source)!=manifest.get("overlap_bone_tracks.json"):
        raise Blocked("ORIGINAL_TOE_GEOMETRY_HASH_MISMATCH")
    data=json.loads(source.read_text())
    if data.get("source_sha256")!=SOURCE_GLB_SHA:
        raise Blocked("TOE_GEOMETRY_WRONG_MODEL")
    origins=data.get("rest_foot_witnesses") or {}
    if set(origins)!=set(phase):
        raise Blocked("TOE_GEOMETRY_WRONG_LEG_SET")
    def cross(o,a,b):
        return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
    def margin(points,center):
        if len(points)<3:return -999.
        pts=sorted(points)
        lo=[]
        for p in pts:
            while len(lo)>1 and cross(lo[-2],lo[-1],p)<=0:lo.pop()
            lo.append(p)
        hi=[]
        for p in reversed(pts):
            while len(hi)>1 and cross(hi[-2],hi[-1],p)<=0:hi.pop()
            hi.append(p)
        polygon=lo[:-1]+hi[:-1]
        if len(polygon)<3:return -999.
        signed=[]
        for a,b in zip(polygon,polygon[1:]+polygon[:1]):
            dx=b[0]-a[0];dz=b[1]-a[1]
            signed.append((dx*(center[1]-a[1])-dz*(center[0]-a[0]))/math.hypot(dx,dz))
        return min(signed)
    support=[]
    swing_hist=collections.Counter()
    for tick in range(85):
        t=tick/24.
        shift=.12*t
        planted=[]
        in_swing=[]
        for leg,p in phase.items():
            q=t-p;cycle=math.floor(q+1e-10);frac=max(0.,q-cycle)
            if frac<SWING-1e-10:
                in_swing.append(leg)
            else:
                foot=origins[leg]
                planted.append((float(foot[0])+.12*(cycle+1),float(foot[2])))
        m=margin(planted,(shift,0.0))
        if m<=0.05:
            raise Blocked("UNSAFE_PHASE_SUPPORT_TICK_"+str(tick)+"_MARGIN_"+str(m)+"_SWING_"+','.join(in_swing))
        support.append(m)
        swing_hist[len(in_swing)]+=1
    expected,_=phase_histogram(phase)
    if dict(swing_hist)!=expected:
        raise Blocked("GEOMETRY_AND_EVENT_PHASE_HISTOGRAM_DISAGREE")
    info("PRE_SOLVE_MIN_SUPPORT_MARGIN",round(min(support),7))
    info("PRE_SOLVE_HISTOGRAM",json.dumps(dict(sorted(swing_hist.items()))))
    return min(support)

def make_engine(original):
    # Only phase scheduling corrected; NO FK/IK formulas, mesh/weight, or pose transfer changes.
    s=exact_replace(original, "VERSION='03.8.0'", "VERSION='03.9.2'", "VERSION")
    before=("PHASE_DELTA=.05\n"
            "PHASE={k:group*.5 + ix*PHASE_DELTA for group,legs in enumerate((GROUP_A,GROUP_B)) for ix,k in enumerate(legs)}")
    after=("# Source-geometry-safe alternating tripod, rolling 0.11 phase staggers.\n"
           "PHASE={'left_front':0.,'left_middle':.61,'left_rear':.22,"
           "'right_front':.5,'right_middle':.11,'right_rear':.72}")
    s=exact_replace(s,before,after,"PHASE_SCHEDULE")
    s=exact_replace(s,
        "spec=importlib.util.spec_from_file_location('heady_renderer',str(Path(__file__).resolve().parent/'renderer_readonly_reference.py'))",
        "base=Path(__file__).resolve().parent.parent/'review_v03_8'\n"
        "sys.path.insert(0,str(base))\n"
        "spec=importlib.util.spec_from_file_location('heady_renderer',str(base/'renderer_readonly_reference.py'))",
        "REFERENCE_RENDERER")
    s=exact_replace(s,"assert sum(row['swing_count']==3 for row in results[:FRAME_PER_CYCLE])>=12",
        "assert sum(row['swing_count']==3 for row in results[:FRAME_PER_CYCLE])>=8",
        "TRIPLE_OVERLAP_GATE")
    s=exact_replace(s," 'gait':'STAGGERED_ALTERNATING_TRIPOD_OVERLAP'",
        " 'gait':'SUPPORT_SAFE_ROLLING_HEXAPOD'", "GAIT_IDENTITY")
    s=exact_replace(s,"for ix,(sk,world,actual,targets,swing) in enumerate(frames_data):",
        "for ix in range(0,STEPS,2):\n sk,world,actual,targets,swing=frames_data[ix]", "REVIEW_DECIMATION")
    s=exact_replace(s,"review[0].save(out/'Heady_v03_8_OverlappingTripod_Candidate.gif',save_all=True,append_images=review[1:],duration=[FRAME_MS]*(STEPS-1)+[850],optimize=False)",
        "review[0].save(out/'Heady_v03_9_2_RollingOverlap_Candidate.gif',save_all=True,append_images=review[1:],duration=[FRAME_MS*2]*(len(review)-1)+[850],optimize=False)",
        "GIF_NAME_AND_CADENCE")
    s=exact_replace(s,"contact.paste(review[ix]", "contact.paste(review[ix//2]", "REVIEW_INDEX")
    s=exact_replace(s,"review.append(board)",
        "review.append(board)\n print('RENDER_FRAME='+str(ix),flush=True)", "RENDER_HEARTBEAT")
    s=exact_replace(s,"Three overlapping swing arcs, 0.05-cycle stagger per group",
        "Support-safe rolling hexapod, 0.11-cycle stagger within alternating groups", "CHART_LABEL")
    s=exact_replace(s,"'status':'STAGGERED_OVERLAP_CANDIDATE_GENERATED'",
        "'status':'SUPPORT_SAFE_ROLLING_CANDIDATE_GENERATED'", "STATUS")
    s=exact_replace(s,"print('OVERLAP_RESULT='+json.dumps(receipt),flush=True)",
        "print('V0392_RESULT='+json.dumps(receipt),flush=True)", "FINISH_LOG")
    compile(s,"heady_v0392_engine.py","exec")
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
    LOG_PATH=RUN_ROOT/RUN_ID/"solver.log"
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
                    if frame>=0: info("RENDER",str(frame)+"/84")
                elif line.startswith(("OVERLAP_RESULT=","V0392_RESULT=")):
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
    fig.suptitle("Heady v03.9.2 | support-checked rolling-overlap candidate")
    fig.tight_layout()
    fig.savefig(out/"Overlap_Actual_LiftCurves_And_BodyMotion.png",dpi=135)
    plt.close(fig)

def verify_generated(out, source):
    global STATUS
    STATUS="VERIFYING_SOURCE_SKINNED_OUTPUT"
    info("STAGE",STATUS)
    needed=[GIF,"overlap_85ticks.csv","overlap_bone_tracks.json","OVERLAP_RESULT_RECEIPT.json"] + MEDIA[1:]
    for name in needed:
        p=out/name
        if not p.is_file() or not p.stat().st_size:
            raise Blocked("MISSING_RESULT:"+name)
    import csv
    with (out/"overlap_85ticks.csv").open(newline="") as f:
        rows=list(csv.DictReader(f))
    if len(rows)!=85: raise Blocked("ROW_COUNT_MISMATCH")
    legs=list(PHASE)
    if not all(sum(row[k+"_contact"]=="SWING" for k in legs)==int(row["swing_count"]) for row in rows):
        raise Blocked("COUNT_NOT_BACKED_BY_CONTACT_EVENTS")
    h=collections.Counter(int(r["swing_count"]) for r in rows)
    predicted,_=phase_histogram()
    if dict(h)!=predicted or not set(h).issubset({2,3}) or h[3]<30 or h[2]<30:
        raise Blocked("PHASE_HISTOGRAM_MISMATCH:"+str(dict(h))+" expected "+str(predicted))
    if abs(float(rows[-1]["root_x"])-.42)>1e-9:
        raise Blocked("BODY_TRAVEL_REGRESSION")
    if any(float(a["root_x"])>=float(b["root_x"]) for a,b in zip(rows,rows[1:])):
        raise Blocked("BODY_NOT_CONTINUOUS")
    if max(float(r["stance_drift_max"]) for r in rows)>=.0002:
        raise Blocked("FOOT_CONTACT_SLIP")
    if min(float(r["support_margin_proxy"]) for r in rows)<=.05:
        raise Blocked("BODY_ORIGIN_SUPPORT_PROXY_FAIL")
    if min(float(r["mesh_min_y"]) for r in rows)<=-.001:
        raise Blocked("FLOOR_INTERSECTION_FAIL")
    tracks=json.loads((out/"overlap_bone_tracks.json").read_text())
    if tracks.get("source_sha256")!=SOURCE_GLB_SHA or tracks.get("version")!=VERSION or len(tracks.get("angles_by_tick",[]))!=85:
        raise Blocked("BONE_TRACKS_PROVENANCE_MISMATCH")
    if any(abs((tracks.get("phase_offsets") or {}).get(k,99)-v)>1e-9 for k,v in PHASE.items()):
        raise Blocked("PHASE_TRACKS_MISMATCH")
    receipt=json.loads((out/"OVERLAP_RESULT_RECEIPT.json").read_text())
    if receipt.get("source_sha256")!=SOURCE_GLB_SHA or receipt.get("visual_acceptance")!="PENDING":
        raise Blocked("OUTPUT_RECEIPT_AUTHORITY_MISMATCH")
    from PIL import Image
    gif=Image.open(out/GIF)
    if gif.n_frames!=43:
        raise Blocked("REVIEW_GIF_FRAME_COUNT_MISMATCH:"+str(gif.n_frames))
    if sha(source)!=SOURCE_GLB_SHA:
        raise Blocked("ORIGINAL_MODEL_CHANGED")
    info("VALIDATED",f"85 source-skinned solver ticks; {gif.n_frames} GIF frames; 2 swing={h[2]}, 3 swing={h[3]}; body +X .420")
    return {"swing_histogram":dict(h),"model_sha256":sha(source),
            "output_sha256":{name:sha(out/name) for name in needed}}

def deliver_public(out, result):
    global STATUS
    STATUS="DELIVERING_ANDROID_MEDIA"
    info("STAGE",STATUS)
    shared=Path.home()/"storage"
    dirs=[shared/"pictures",shared/"downloads"]
    if any(not p.is_dir() for p in dirs):
        raise Blocked("TERMUX_SHARED_STORAGE_NOT_READY: Pictures and Downloads unavailable")
    published=[]
    for destdir in dirs:
        for name in MEDIA:
            source=out/name
            dest=destdir/(Path(name).stem+"_v03_9_2"+Path(name).suffix) if name!=GIF else destdir/name
            if dest.exists():
                if sha(dest)!=sha(source):
                    raise Blocked("PUBLIC_FILE_NAME_COLLISION:"+str(dest))
            else:
                tmp=dest.with_name(dest.name+".tmp-"+str(os.getpid()))
                try:
                    shutil.copyfile(source,tmp)
                    if sha(source)!=sha(tmp):raise Blocked("PUBLIC_COPY_SHA_MISMATCH")
                    os.replace(tmp,dest)
                finally:
                    if tmp.exists():tmp.unlink()
            if sha(dest)!=sha(source):raise Blocked("PUBLIC_READBACK_SHA_MISMATCH:"+str(dest))
            published.append({"path":str(dest),"sha256":sha(dest),"bytes":dest.stat().st_size})
    scan="UNAVAILABLE"
    if shutil.which("termux-media-scan"):
        try:
            r=command(["termux-media-scan",published[0]["path"]],timeout=20,must=False)
            scan="REQUESTED" if r.returncode==0 else "FAILED_EXIT_"+str(r.returncode)
        except Blocked:scan="FAILED"
    opened="UNAVAILABLE"
    if shutil.which("termux-open"):
        try:
            r=command(["termux-open",published[0]["path"]],timeout=20,must=False)
            opened="REQUESTED_NOT_VIEWER_CONFIRMED" if r.returncode==0 else "FAILED_EXIT_"+str(r.returncode)
        except Blocked:opened="FAILED"
    for f in published:
        info("PUBLIC_IMAGE",str(f["path"])+" sha256="+str(f["sha256"]))
    info("MEDIA_SCAN",scan);info("VIEWER_OPEN",opened)
    return {"published":published,"viewer_open":opened,"media_scan":scan}

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
    global STATUS, RUN_ID, RECEIPT
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo",help="Explicit verified canonical Pose Lab repository root")
    parser.add_argument("--run",action="store_true",help="Generate new animation candidate, verify and publish phone media")
    parser.add_argument("--audit",action="store_true",help="Nonmutating availability/phase check")
    args=parser.parse_args()
    if not (args.run or args.audit):
        parser.error("specify --run or --audit")
    RUN_ID=dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")+"-"+str(os.getpid())
    info("CAMPAIGN",ID);info("VERSION",VERSION);info("RUN_ID",RUN_ID)
    info("AUTHORING", "source-skinned 52-joint v03.8 solver reused, support-safe timing only")
    root=root_find(args.repo)
    base=root/BASE_REL
    dest=root/OUT_REL
    info("RESOLVED_REPO",root)
    info("BRANCH",command(["git","-C",root,"branch","--show-current"]).stdout.strip())
    info("HEAD",command(["git","-C",root,"rev-parse","HEAD"]).stdout.strip())
    source=base/SRC_GLB
    engine_source=base/SRC_ENGINE
    if sha(source)!=SOURCE_GLB_SHA or sha(engine_source)!=SOURCE_ENGINE_SHA:
        raise Blocked("SOURCE_PROVENANCE_FAILED: expected exact 52-joint GLB + v03.8 solver")
    for name in BASE_FILES:
        if not (base/name).is_file():raise Blocked("SOURCE_DEPENDENCY_MISSING:"+name)
    if command(["git","-C",root,"status","--porcelain","--",str(BASE_REL)],must=False).stdout:
        raise Blocked("BASELINE_IS_DIRTY: no changes to v03.8 allowed")
    actual=json.loads((base/"FILES_SHA256.json").read_text())
    for name in BASE_FILES:
        expected=actual.get(name)
        if expected and sha(base/name)!=expected:
            raise Blocked("V038_MANIFEST_FAILED:"+name)
    expected,_=phase_histogram()
    info("PHASE_MODEL",json.dumps(PHASE,sort_keys=True))
    info("PREDICTED_HISTOGRAM_85",json.dumps(expected))
    info("SOURCE_MODEL_SHA256",SOURCE_GLB_SHA)
    info("SOURCE_ENGINE_SHA256",SOURCE_ENGINE_SHA)
    support_schedule_preflight(base)
    original=engine_source.read_text()
    amended=make_engine(original)
    info("DERIVED_ENGINE_SHA256",hashlib.sha256(amended.encode()).hexdigest())
    if args.audit:
        info("STATUS","AUDIT_ONLY_NO_FILES_CHANGED")
        return
    # Missing scientific dependencies must fail before any candidate file is written.
    import importlib.util
    for package in ("numpy", "scipy", "PIL", "matplotlib"):
        if importlib.util.find_spec(package) is None:
            raise Blocked("REQUIRED_ENGINE_DEPENDENCY_MISSING:"+package)
    # The named campaign must not execute twice concurrently.
    RUN_ROOT.mkdir(parents=True,exist_ok=True)
    lock=RUN_ROOT/"active.lock"
    try:
        lock.mkdir()
    except FileExistsError:
        raise Blocked("CAMPAIGN_ALREADY_RUNNING_OR_STALE_LOCK:"+str(lock))
    try:
        STATUS="PREPARE_VERSIONED_CANDIDATE"
        info("STAGE",STATUS)
        if dest.exists() and any(dest.iterdir()):
            existing=dest/"heady_phase_engine_v03_9_2.py"
            if not existing.is_file() or existing.read_bytes()!=amended.encode():
                raise Blocked("V039_TARGET_CONFLICT: prior version cannot be overwritten")
            if (dest/"V0392_DELIVERY_RECEIPT.json").exists():
                verify_generated(dest,source)
                old=json.loads((dest/"V0392_DELIVERY_RECEIPT.json").read_text())
                if all(Path(x["path"]).is_file() and sha(x["path"])==x["sha256"]
                       for x in old.get("delivery",{}).get("published",[])) and len(old.get("delivery",{}).get("published",[]))>=10:
                    info("RESULT","ALREADY_DELIVERED_SOURCE_VERIFIED_NO_DUPLICATE_RUN")
                    return
                info("RECOVERY","REPAIR_PUBLIC_MEDIA_FROM_VERIFIED_RESULTS")
            info("RECOVERY","RESUME_SAME_VERSION_PARTIAL_OUTPUT_ONLY")
        # New result source only. Never duplicate the binary 52-joint model.
        source_path=dest/"heady_phase_engine_v03_9_2.py"
        write_once(source_path,amended.encode())
        # Self-contained repo packet: install this exact versioned entrypoint.
        write_once(root/"tools/campaigns/heady_grounded_ik_v03_9_2.py", Path(__file__).read_bytes())
        bundle_file=os.environ.get("HEADY_V0392_BUNDLE", "")
        if bundle_file:
            bundle=Path(bundle_file).resolve()
            if not bundle.is_file() or bundle.suffix!=".sh":
                raise Blocked("MISSING_BUNDLE_OR_WRONG_SUFFIX")
            write_once(root/"tools/campaigns/heady_grounded_ik_v03_9_2.sh",bundle.read_bytes())
        else:
            raise Blocked("NO_BUNDLED_LAUNCHER: run via the versioned .sh")
        contract={"schema":"pose-lab-v2-campaign-contract-v2", "campaign":ID,
          "version":VERSION,"baseline_commit":command(["git","-C",root,"rev-parse","HEAD"]).stdout.strip(),
          "base_engine_sha256":SOURCE_ENGINE_SHA,"canonical_glb":str(BASE_REL/SRC_GLB),
          "canonical_glb_sha256":SOURCE_GLB_SHA,"new_model_copies":0,
          "changed_surface":["PHASE timing offsets","candidate version labels","preview frame sampling"],
          "locked":["original GLB","v03.4 approved gait","v03.8 candidate", "52-joint skin and mesh", "all IK equations","foot trajectory shape","stride/lift/root","claws and hair"],
          "phases":PHASE,"swing_fraction":SWING,"expected_histogram":expected,
          "approval":"PENDING","git_push":"NEVER", "remote_mutations":False}
        write_once(dest/"VERSION_CONTRACT.json",(json.dumps(contract,indent=2,sort_keys=True)+"\n").encode())
        # Resume a completed solver without burning CPU or rerunning Blender.
        needs=[dest/GIF,dest/"overlap_85ticks.csv",dest/"overlap_bone_tracks.json",dest/"OVERLAP_RESULT_RECEIPT.json"]
        if all(p.is_file() for p in needs):
            info("RECOVERY","REUSE_COMPLETED_SOLVER_EVIDENCE")
            if not (dest/"Overlap_Actual_LiftCurves_And_BodyMotion.png").is_file():
                chart_actual_lifts(dest)
        else:
            # Exact version-owned candidate dir only; old baselines stay intact.
            run_solver(source_path,source,dest)
            chart_actual_lifts(dest)
        verified=verify_generated(dest,source)
        implementation_files=[
            "tools/campaigns/heady_grounded_ik_v03_9_2.py",
            "tools/campaigns/heady_grounded_ik_v03_9_2.sh",
            str(OUT_REL/"heady_phase_engine_v03_9_2.py"),
            str(OUT_REL/"VERSION_CONTRACT.json"),
            str(OUT_REL/"overlap_85ticks.csv"),
            str(OUT_REL/"overlap_bone_tracks.json"),
            str(OUT_REL/"OVERLAP_RESULT_RECEIPT.json")]
        implementation_commit=commit_scoped(root,implementation_files,
            "heady: v03.9.2 support-checked rolling-overlap gait with verified source-skinned tracks")
        delivered=deliver_public(dest,verified)
        RECEIPT={"campaign":ID,"version":VERSION,"run_id":RUN_ID,"status":"CANDIDATE_DELIVERED_VISUAL_ACCEPTANCE_PENDING",
          "real_phone_run":True,"blender":"NOT_EXECUTED","physics":"NOT_EXECUTED","implementation_commit":implementation_commit,"git_commit":"LOCAL_ONLY",
          "github_write":"NOT_ATTEMPTED","original_source_intact":sha(source)==SOURCE_GLB_SHA,
          "verified":verified,"delivery":delivered}
        receipt_path=dest/"V0392_DELIVERY_RECEIPT.json"
        if receipt_path.is_file():
            prior=json.loads(receipt_path.read_text())
            previous=prior.get("delivery",{}).get("published",[])
            if prior.get("version")!=VERSION or len(previous)!=len(delivered["published"]) or any(
                left.get("path")!=right.get("path") or left.get("sha256")!=right.get("sha256")
                for left,right in zip(previous,delivered["published"])):
                raise Blocked("PREVIOUS_RECEIPT_CONFLICT_REQUIRES_REVIEW")
            info("RECEIPT_RECOVERY","EXISTING_VERIFIED_RECEIPT_REUSED")
        else:
            write_once(receipt_path,(json.dumps(RECEIPT,indent=2,sort_keys=True)+"\n").encode())
        receipt_commit=commit_scoped(root,[str(OUT_REL/"V0392_DELIVERY_RECEIPT.json")],
            "heady: v03.9.2 public media checksum receipt")
        info("RECEIPT",dest/"V0392_DELIVERY_RECEIPT.json")
        info("GIT_LOCAL_COMMIT",receipt_commit)
        info("PICTURES_AND_DOWNLOADS","SHA256_READBACK_VERIFIED")
        info("SOURCE_REUSE","EXACT_SHARED_GLB_SHA256_NO_NEW_GLB_OR_ZIP")
        info("REVIEW_GIF",delivered["published"][0]["path"])
        info("RESULT","CANDIDATE_DELIVERED_VISUAL_VERDICT_PENDING")
    finally:
        try:lock.rmdir()
        except OSError:pass

if __name__=="__main__":
    try:main()
    except (Blocked,OSError,ValueError,KeyError,ImportError,AssertionError) as exc:
        info("RESULT","BLOCKED")
        info("LAST_STAGE",STATUS)
        info("CAUSE",type(exc).__name__+": "+str(exc))
        info("PRESERVATION","NO_OLD_GLB_OR_PRIOR_CAMPAIGN_CHANGED; NO_GITHUB_WRITES")
        if LOG_PATH:info("DEBUG_LOG",LOG_PATH)
        sys.exit(2)
HEADY_PY_SOURCE_V0392_DO_NOT_EDIT
EXPECTED_PY_SHA='c3d7c7deb4798978a1ddb848d1041b7c908fcf53dd50aed566ab4c12312e8bdb'
ACTUAL_PY_SHA="$(sha256sum "$PYFILE" | cut -d' ' -f1)"
printf 'EMBEDDED_ENGINE_SHA256=%s\n' "$ACTUAL_PY_SHA"
if [[ "$ACTUAL_PY_SHA" != "$EXPECTED_PY_SHA" ]]; then
    echo 'RESULT=BLOCKED_PAYLOAD_SHA256_MISMATCH'; exit 60
fi
if ! command -v python3 >/dev/null 2>&1; then
    echo 'PHASE=INSTALL_TERMUX_PYTHON'
    if command -v pkg >/dev/null 2>&1; then
        pkg install -y python || { echo 'RESULT=BLOCKED_PYTHON_INSTALL';exit 61; }
    else
        echo 'RESULT=BLOCKED_PYTHON_UNAVAILABLE';exit 61
    fi
fi
echo 'PHASE=REPO_AUTHORITY_AND_PHASE_AUDIT'
if ! python3 -u "$PYFILE" --audit; then
    echo 'RESULT=BLOCKED_BASELINE_AUDIT'; exit 62
fi
# No pip compilation, alternative scripts, or blanket pkg upgrade.
MISSING="$(python3 - <<'PY_DEP'
import importlib
missing=[]
for mod in ('numpy','scipy','PIL','matplotlib'):
    try: importlib.import_module(mod)
    except Exception: missing.append(mod)
print(','.join(missing))
PY_DEP
)"
if [[ -n "$MISSING" ]]; then
    echo "PHASE=DEPENDENCY_RECOVERY MISSING=$MISSING"
    if ! command -v pkg >/dev/null 2>&1; then
        echo 'RESULT=BLOCKED_TERMUX_PACKAGE_MANAGER_UNAVAILABLE';exit 63
    fi
    INSTALL=()
    [[ ",$MISSING," == *,numpy,* ]] && INSTALL+=(python-numpy)
    [[ ",$MISSING," == *,scipy,* ]] && INSTALL+=(python-scipy)
    [[ ",$MISSING," == *,PIL,* ]] && INSTALL+=(python-pillow)
    [[ ",$MISSING," == *,matplotlib,* ]] && INSTALL+=(matplotlib)
    echo "INSTALLING_TERMUX_PREBUILT=${INSTALL[*]}"
    pkg install -y "${INSTALL[@]}" || { echo 'RESULT=BLOCKED_DEPENDENCY_INSTALL';exit 64; }
fi
python3 - <<'PY_VERIFY'
import numpy, scipy, PIL, matplotlib
print('NUMERIC_AND_RENDER_DEPENDENCIES=IMPORT_PASS',flush=True)
PY_VERIFY
echo 'RASTER_ACCELERATOR=OPTIONAL_EXISTING_NUMBA_OR_SOFTWARE_FALLBACK; NO PACKAGE_INSTALL_ATTEMPT'
echo 'PHASE=SOLVE_VERIFY_PUBLISH'
if python3 -u "$PYFILE" --run; then
    echo 'TERMUX_LAUNCHER_RESULT=COMPLETED_REVIEW_READY_OR_IDEMPOTENT'
else
    rc="$?"
    echo "TERMUX_LAUNCHER_RESULT=BLOCKED_EXIT_$rc"
    echo 'PRESERVED=ORIGINAL_HEXAPOD_MODEL_PREVIOUS_ACCEPTED_GAITS_AND_PRIOR_CAMPAIGNS'
    exit "$rc"
fi

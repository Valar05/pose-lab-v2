#!/usr/bin/env bash
# HEADY_GROUNDED_IK v03.9.3, one-file/one-invocation Termux campaign.
# Original invocation: bash "$HOME/storage/downloads/HEADY_GROUNDED_IK_v03_9_3_TERMUX_CAMPAIGN.sh"
# The accompanying hash-verified launcher also accepts Android (1) suffixes.
# One canonical 52-joint GLB; no new GLBs or ZIPs, no GitHub remote writes.
set -Eeuo pipefail
export PYTHONUNBUFFERED=1
SELF="$(realpath -- "${BASH_SOURCE[0]}")"
export HEADY_V0393_BUNDLE="$SELF"
echo 'CAMPAIGN=HEADY_GROUNDED_IK'
echo 'VERSION=03.9.3'
echo "SCRIPT_PATH=$SELF"
echo "SCRIPT_SHA256=$(sha256sum "$SELF" | cut -d' ' -f1)"
echo 'PHASE=VERIFY_SELF_CONTAINED_PAYLOAD'
mkdir -p "$HOME/.cache"
TEMP_DIR="$(mktemp -d "$HOME/.cache/heady-v0393.XXXXXXXX")"
cleanup() { rm -rf -- "$TEMP_DIR"; }
trap cleanup EXIT
PYFILE="$TEMP_DIR/heady_grounded_ik_v03_9_3.py"
cat > "$PYFILE" <<'HEADY_PY_SOURCE_V0393_DO_NOT_EDIT'
#!/usr/bin/env python3
"""HEADY_GROUNDED_IK v03.9.3: support-safe coordinated gait correction of v03.8.

Original single-invocation form:
  bash HEADY_GROUNDED_IK_v03_9_3_TERMUX_CAMPAIGN.sh

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
VERSION = "03.9.3"
ROOT_NAME = "pose-lab-v2"
BASE_REL = Path("tools/heady/campaigns/grounded_ik_v03/review_v03_8")
OUT_REL = Path("tools/heady/campaigns/grounded_ik_v03/review_v03_9_3")
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
RUN_ROOT = Path.home() / ".local/share/heady-grounded-ik-v0393"
GIF = "Heady_v03_9_3_TetrapodPhase_Candidate.gif"
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

def footprint_safety(base):
    """Exact world-stationary stance anchors, not a generic abstract triangle.

    Reproduces original planned(t,leg) stance X and body +X .12 per cycle.
    Uses the PREEXISTING v03.8 model-derived source-toe witnesses. Does NOT
    change the source model, joint constraints, toe contacts or root trajectory.
    """
    import math
    tracks_file=base/"overlap_bone_tracks.json"
    if not tracks_file.is_file():
        raise Blocked("MISSING_BASELINE_SKINNED_FOOT_WITNESSES")
    tracks=json.loads(tracks_file.read_text())
    if tracks.get("source_sha256")!=SOURCE_GLB_SHA:
        raise Blocked("UNTRUSTED_FOOT_WITNESS_SOURCE_SHA")
    origin=tracks.get("rest_foot_witnesses",{})
    if set(origin)!=set(PHASE) or any(len(x)!=3 for x in origin.values()):
        raise Blocked("INCOMPLETE_SIX_FOOT_MODEL_WITNESSES")
    if abs(SWING-.39)>1e-12:
        raise Blocked("UNEXPECTED_SWING_FRACTION")
    def cross(a,b,c):
        return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    def hull(points):
        p=sorted(set(points))
        if len(p)<3: return []
        lower=[]
        for v in p:
            while len(lower)>1 and cross(lower[-2],lower[-1],v)<=0:lower.pop()
            lower.append(v)
        upper=[]
        for v in p[::-1]:
            while len(upper)>1 and cross(upper[-2],upper[-1],v)<=0:upper.pop()
            upper.append(v)
        return lower[:-1]+upper[:-1]
    details=[]
    for tick in range(85):
        t=tick/24.0
        center=(.12*t,0.0)
        planted=[];air=[]
        for leg,phase in PHASE.items():
            q=t-phase
            n=math.floor(q+1e-10)
            frac=max(0.0,q-n)
            if frac < SWING-1e-10:
                air.append(leg)
            else:
                p=origin[leg]
                planted.append((float(p[0]+.12*(n+1)),float(p[2])))
        poly=hull(planted)
        if len(poly)<3:
            raise Blocked(f"PREFLIGHT_NOT_ENOUGH_STANCE_FEET tick={tick} swinging={air}")
        signed=[]
        for a,b in zip(poly,poly[1:]+poly[:1]):
            length=math.hypot(b[0]-a[0],b[1]-a[1])
            signed.append(cross(a,b,center)/length)
        m=min(signed)
        details.append({"tick":tick,"margin":m,"swing":air})
    worst=min(details,key=lambda x:x["margin"])
    hist=dict(sorted(collections.Counter(len(d["swing"]) for d in details).items()))
    if hist!=phase_histogram()[0]:
        raise Blocked("SCHEDULE_GEOMETRY_HISTOGRAM_INCONSISTENT")
    if worst["margin"]<=.05:
        raise Blocked("UNSAFE_PLANNED_SUPPORT_MARGIN_TICK_"+str(worst["tick"])+
                      "_"+str(worst["margin"])+"_"+str(worst["swing"]))
    info("SUPPORT_PREFLIGHT",f"PASS min_origin_proxy_margin={worst['margin']:.9f} "
         f"min_at_tick={worst['tick']} histogram={hist}")
    return {"min_margin":worst["margin"],"worst_tick":worst["tick"],"histogram":hist}

def make_engine(original):
    # No recomposed IK, anatomical changes, artificial body sway or foot path edits.
    s=exact_replace(original, "VERSION='03.8.0'", "VERSION='03.9.3'", "VERSION")
    before=("GROUP_A=['left_front','left_rear','right_middle']\n"
            "GROUP_B=['right_front','right_rear','left_middle']\n"
            "PHASE_DELTA=.05\n"
            "PHASE={k:group*.5 + ix*PHASE_DELTA for group,legs in enumerate((GROUP_A,GROUP_B)) for ix,k in enumerate(legs)}")
    after=("# 03.9.3: all-six-limb, source-footprint-tested support-safe ordering.\n"
           "GROUP_A=['left_front','right_middle','left_rear']\n"
           "GROUP_B=['right_front','left_middle','right_rear']\n"
           "PHASE_DELTA=.10\n"
           "PHASE={k:group*.5 + ix*PHASE_DELTA for group,legs in enumerate((GROUP_A,GROUP_B)) for ix,k in enumerate(legs)}")
    s=exact_replace(s,before,after,"PHASE_SCHEDULE_AND_ORDER")
    s=exact_replace(s,
        "spec=importlib.util.spec_from_file_location('heady_renderer',str(Path(__file__).resolve().parent/'renderer_readonly_reference.py'))",
        "base=Path(__file__).resolve().parent.parent/'review_v03_8'\n"
        "sys.path.insert(0,str(base))\n"
        "spec=importlib.util.spec_from_file_location('heady_renderer',str(base/'renderer_readonly_reference.py'))",
        "REFERENCE_RENDERER")
    s=exact_replace(s,"assert sum(row['swing_count']==3 for row in results[:FRAME_PER_CYCLE])>=12",
        "assert sum(row['swing_count']==3 for row in results[:FRAME_PER_CYCLE])>=9",
        "TRIPLE_OVERLAP_GATE")
    s=exact_replace(s," 'gait':'STAGGERED_ALTERNATING_TRIPOD_OVERLAP'",
        " 'gait':'PHASE_COUPLED_TETRAPOD_LIKE'", "GAIT_IDENTITY")
    s=exact_replace(s,"for ix,(sk,world,actual,targets,swing) in enumerate(frames_data):",
        "for ix in range(0,STEPS,2):\n sk,world,actual,targets,swing=frames_data[ix]", "REVIEW_DECIMATION")
    s=exact_replace(s,"review[0].save(out/'Heady_v03_8_OverlappingTripod_Candidate.gif',save_all=True,append_images=review[1:],duration=[FRAME_MS]*(STEPS-1)+[850],optimize=False)",
        "review[0].save(out/'Heady_v03_9_3_TetrapodPhase_Candidate.gif',save_all=True,append_images=review[1:],duration=[FRAME_MS*2]*(len(review)-1)+[850],optimize=False)",
        "GIF_NAME_AND_CADENCE")
    s=exact_replace(s,"contact.paste(review[ix]", "contact.paste(review[ix//2]", "REVIEW_INDEX")
    s=exact_replace(s,"review.append(board)",
        "review.append(board)\n print('RENDER_FRAME='+str(ix),flush=True)", "RENDER_HEARTBEAT")
    s=exact_replace(s,"Three overlapping swing arcs, 0.05-cycle stagger per group",
        "Support-safe overlapping 0.10-cycle stagger with independent leg liftoffs", "CHART_LABEL")
    s=exact_replace(s,"'status':'STAGGERED_OVERLAP_CANDIDATE_GENERATED'",
        "'status':'PHASE_COUPLED_CANDIDATE_GENERATED'", "STATUS")
    s=exact_replace(s,"print('OVERLAP_RESULT='+json.dumps(receipt),flush=True)",
        "print('V0393_RESULT='+json.dumps(receipt),flush=True)", "FINISH_LOG")
    compile(s,"heady_v0393_engine.py","exec")
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
                    if frame>=0 and frame%12==0: info("RENDER",str(frame)+"/84")
                elif line.startswith(("OVERLAP_RESULT=","V0393_RESULT=")):
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
    fig.suptitle("Heady v03.9 | phase-coupled overlapping stagger candidate")
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
            dest=destdir/(Path(name).stem+"_v03_9_3"+Path(name).suffix) if name!=GIF else destdir/name
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
    scanner=shutil.which("termux-media-scan")
    info("MEDIA_SCAN_POLICY", "EXACT_PUBLIC_FILES_ONLY_NO_RECURSIVE_SCAN")
    scanned=[]
    if scanner:
        for entry in published:
            try:
                r=command([scanner,entry["path"]],timeout=12,must=False)
                state="REQUESTED_NOT_INDEX_CONFIRMED" if r.returncode==0 else "EXIT_"+str(r.returncode)
            except Blocked:
                state="FAILED_OR_TIMED_OUT"
            scanned.append({"path":entry["path"],"state":state})
        scan=f"REQUESTED={sum(x['state'].startswith('REQUESTED') for x in scanned)}/{len(scanned)}; NOT_FILES_UI_VERIFIED"
    opened="UNAVAILABLE"
    if shutil.which("termux-open"):
        try:
            r=command(["termux-open",published[0]["path"]],timeout=20,must=False)
            opened="REQUESTED_NOT_VIEWER_CONFIRMED" if r.returncode==0 else "FAILED_EXIT_"+str(r.returncode)
        except Blocked:opened="FAILED"
    for f in published:
        info("PUBLIC_IMAGE",str(f["path"])+" sha256="+str(f["sha256"]))
    info("MEDIA_SCAN",scan);info("VIEWER_OPEN",opened)
    return {"published":published,"viewer_open":opened,"media_scan":scan,"per_file_scans":scanned}

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
    info("AUTHORING", "source-skinned 52-joint v03.8 solver reused, timing schedule only")
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
    for name in BASE_FILES + ["overlap_bone_tracks.json"]:
        expected=actual.get(name)
        if not expected or sha(base/name)!=expected:
            raise Blocked("V038_MANIFEST_FAILED_OR_UNDECLARED:"+name)
    expected,_=phase_histogram()
    geometry=footprint_safety(base)
    info("PHASE_MODEL",json.dumps(PHASE,sort_keys=True))
    info("PREDICTED_HISTOGRAM_85",json.dumps(expected))
    info("SOURCE_MODEL_SHA256",SOURCE_GLB_SHA)
    info("SOURCE_ENGINE_SHA256",SOURCE_ENGINE_SHA)
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
        info("CANDIDATE_DIRECTORY",dest)
        info("PREVIOUS_V0392", "PRESERVED_UNMODIFIED")
        if dest.exists() and any(dest.iterdir()):
            existing=dest/"heady_phase_engine_v03_9_3.py"
            if not existing.is_file() or existing.read_bytes()!=amended.encode():
                info("CONFLICTING_PATH",dest)
                info("EXISTING_NAMES",json.dumps(sorted(p.name for p in dest.iterdir())[:30]))
                raise Blocked("V0393_TARGET_CONFLICT: an existing v03.9.3 candidate differs. "
                              "Previous bytes preserved; no in-place repair or deletion")
            if (dest/"V0393_DELIVERY_RECEIPT.json").exists():
                verify_generated(dest,source)
                old=json.loads((dest/"V0393_DELIVERY_RECEIPT.json").read_text())
                if all(Path(x["path"]).is_file() and sha(x["path"])==x["sha256"]
                       for x in old.get("delivery",{}).get("published",[])) and len(old.get("delivery",{}).get("published",[]))>=10:
                    info("RESULT","ALREADY_DELIVERED_SOURCE_VERIFIED_NO_DUPLICATE_RUN")
                    return
                info("RECOVERY","REPAIR_PUBLIC_MEDIA_FROM_VERIFIED_RESULTS")
            info("RECOVERY","RESUME_SAME_VERSION_PARTIAL_OUTPUT_ONLY")
        # Verify OWNED paths before writing any of them. Never touch unrelated
        # prior-version folders or nonmatching files even if their names look familiar.
        packet_py=root/"tools/campaigns/heady_grounded_ik_v03_9_3.py"
        packet_sh=root/"tools/campaigns/heady_grounded_ik_v03_9_3.sh"
        bundle_file=os.environ.get("HEADY_V0393_BUNDLE","")
        if not bundle_file or not Path(bundle_file).is_file():
            raise Blocked("MISSING_VERIFIED_BUNDLE")
        for owned, expected_bytes in ((dest/"heady_phase_engine_v03_9_3.py",amended.encode()),
                                      (packet_py,Path(__file__).read_bytes()),
                                      (packet_sh,Path(bundle_file).read_bytes())):
            if owned.is_file() and sha(owned)!=hashlib.sha256(expected_bytes).hexdigest():
                raise Blocked("OWNED_PATH_HASH_CONFLICT_BEFORE_MUTATION:"+str(owned))
        # New result source only. Never duplicate the binary 52-joint model.
        source_path=dest/"heady_phase_engine_v03_9_3.py"
        write_once(source_path,amended.encode())
        # Self-contained repo packet: install this exact versioned entrypoint.
        write_once(root/"tools/campaigns/heady_grounded_ik_v03_9_3.py", Path(__file__).read_bytes())
        bundle_file=os.environ.get("HEADY_V0393_BUNDLE", "")
        if bundle_file:
            bundle=Path(bundle_file).resolve()
            if not bundle.is_file() or bundle.suffix!=".sh":
                raise Blocked("MISSING_BUNDLE_OR_WRONG_SUFFIX")
            write_once(root/"tools/campaigns/heady_grounded_ik_v03_9_3.sh",bundle.read_bytes())
        else:
            raise Blocked("NO_BUNDLED_LAUNCHER: run via the versioned .sh")
        contract={"schema":"pose-lab-v2-campaign-contract-v2", "campaign":ID,
          "version":VERSION,"baseline_commit":command(["git","-C",root,"rev-parse","HEAD"]).stdout.strip(),
          "base_engine_sha256":SOURCE_ENGINE_SHA,"canonical_glb":str(BASE_REL/SRC_GLB),
          "canonical_glb_sha256":SOURCE_GLB_SHA,"new_model_copies":0,
          "changed_surface":["PHASE timing offsets","candidate version labels","preview frame sampling"],
          "locked":["original GLB","v03.4 approved gait","v03.8 candidate", "52-joint skin and mesh", "all IK equations","foot trajectory shape","stride/lift/root","claws and hair"],
          "phases":PHASE,"swing_fraction":SWING,"expected_histogram":expected,
          "minimum_planned_support_margin":float(geometry["min_margin"]),
          "v0391_regression":"UNSAFE_SUPPORT_MARGIN_4_0.004318861035641184",
          "approval":"PENDING","git_push":"NEVER", "remote_mutations":False}
        write_once(dest/"VERSION_CONTRACT.json",(json.dumps(contract,indent=2,sort_keys=True)+"\n").encode())
        # Resume a completed solver without burning CPU or rerunning Blender.
        needs=[dest/GIF,dest/"overlap_85ticks.csv",dest/"overlap_bone_tracks.json",dest/"OVERLAP_RESULT_RECEIPT.json"]
        if all(p.is_file() for p in needs):
            info("RECOVERY","CHECK_COMPLETE_SOLVER_EVIDENCE")
            try:
                verified=verify_generated(dest,source)
                info("RECOVERY","REUSE_VERIFIED_SOLVER_RESULTS")
            except (Blocked,OSError,ValueError,AssertionError) as err:
                raise Blocked("PARTIAL_SOLVER_OUTPUT_CONFLICT: results exist but failed verification; "
                              "preserved without overwriting: "+str(err))
            if not (dest/"Overlap_Actual_LiftCurves_And_BodyMotion.png").is_file():
                chart_actual_lifts(dest)
        elif any(p.is_file() for p in needs):
            # Truncated output must be isolated in a fresh release instead of reused silently.
            present=[p.name for p in needs if p.is_file()]
            raise Blocked("INCOMPLETE_SOLVER_RESULT_SET_PRESERVED:"+','.join(present))
        else:
            # Exact version-owned candidate dir only; old baselines stay intact.
            run_solver(source_path,source,dest)
            chart_actual_lifts(dest)
        verified=verify_generated(dest,source)
        implementation_files=[
            "tools/campaigns/heady_grounded_ik_v03_9_3.py",
            "tools/campaigns/heady_grounded_ik_v03_9_3.sh",
            str(OUT_REL/"heady_phase_engine_v03_9_3.py"),
            str(OUT_REL/"VERSION_CONTRACT.json"),
            str(OUT_REL/"overlap_85ticks.csv"),
            str(OUT_REL/"overlap_bone_tracks.json"),
            str(OUT_REL/"OVERLAP_RESULT_RECEIPT.json")]
        implementation_commit=commit_scoped(root,implementation_files,
            "heady: v03.9.3 phase-coupled gait with verified source-skinned tracks")
        delivered=deliver_public(dest,verified)
        RECEIPT={"campaign":ID,"version":VERSION,"run_id":RUN_ID,"status":"CANDIDATE_DELIVERED_VISUAL_ACCEPTANCE_PENDING",
          "real_phone_run":True,"blender":"NOT_EXECUTED","physics":"NOT_EXECUTED","implementation_commit":implementation_commit,"git_commit":"LOCAL_ONLY",
          "github_write":"NOT_ATTEMPTED","original_source_intact":sha(source)==SOURCE_GLB_SHA,
          "verified":verified,"delivery":delivered}
        receipt_path=dest/"V0393_DELIVERY_RECEIPT.json"
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
        receipt_commit=commit_scoped(root,[str(OUT_REL/"V0393_DELIVERY_RECEIPT.json")],
            "heady: v03.9.3 public media checksum receipt")
        info("RECEIPT",dest/"V0393_DELIVERY_RECEIPT.json")
        info("GIT_LOCAL_COMMIT",receipt_commit)
        info("PICTURES_AND_DOWNLOADS","SHA256_READBACK_VERIFIED")
        info("HUMAN_VISUAL_VERDICT","PENDING")
        info("RELEASE_VERSION","03.9.3")
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
HEADY_PY_SOURCE_V0393_DO_NOT_EDIT
EXPECTED_PY_SHA='6a18ef19ee57973e4c0b09db6afcb0ddd51d2068672ab4e1903b7e12ac8d4814'
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
echo 'PREVIOUS_VERSION=03.9.2 PRESERVED=YES'
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
echo 'RASTER_ACCELERATOR=OPTIONAL; NO_NUMBA_PACKAGE_INSTALL_ATTEMPTED'
echo 'PHASE=SOLVE_VERIFY_PUBLISH'
if python3 -u "$PYFILE" --run; then
    echo 'TERMUX_LAUNCHER_RESULT=COMPLETED_REVIEW_READY_OR_IDEMPOTENT'
else
    rc="$?"
    echo "TERMUX_LAUNCHER_RESULT=BLOCKED_EXIT_$rc"
    echo 'PRESERVED=ORIGINAL_HEXAPOD_MODEL_PREVIOUS_ACCEPTED_GAITS_AND_PRIOR_CAMPAIGNS'
    exit "$rc"
fi

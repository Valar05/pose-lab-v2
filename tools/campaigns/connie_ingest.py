#!/usr/bin/env python3
"""Interactive, fail-closed Connie source ingress for Termux.

Selects the FOUR approved original PNGs from Android storage. No image generation.
Writes hash-bound inputs and copies canonical bytes into the Pose Lab repository.
Head boxes are measurements from this campaign's supplied art, provisional
until human visual verification. Re-running will not overwrite existing sources.
"""
from pathlib import Path
from PIL import Image
import hashlib, json, os, shutil, sys, argparse
ROOT=Path(__file__).resolve().parents[2]
SOURCES=ROOT/'public/assets/connie/source'
BASES=[Path.home()/'storage/downloads',Path.home()/'storage/pictures',
       Path('/storage/emulated/0/Download'),Path('/storage/emulated/0/Pictures'),
       Path('/storage/emulated/0/DCIM')]
ROLES=[('idle',(1152,1536)),('run',(1536,512)),
       ('rebound',(1536,512)),('dash',(1536,512))]
# Source-image head rectangles x1,y1,x2,y2. These are preliminary measurements
# recorded from approved references; visually review before declaring acceptance.
HEADS={
'idle':(610,165,800,355),
'run_1':(278,95,391,208),'run_2':(792,95,905,208),'run_3':(1307,95,1420,208),
'rebound_1':(193,96,307,208),'rebound_2':(710,102,820,214),'rebound_3':(1295,92,1406,205),
'dash_1':(272,88,384,200),'dash_2':(714,144,806,235)
}
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def size(p):
    try:
        with Image.open(p) as img: return img.size if img.format=='PNG' else None
    except (OSError,ValueError): return None
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',required=True);args=ap.parse_args()
    candidates={}
    for base in BASES:
        if not base.exists(): continue
        for folder in [base,*[d for d in base.iterdir() if d.is_dir()][:60]]:
            try: paths=folder.glob('*.png')
            except OSError: continue
            for p in paths:
                if not p.is_file(): continue
                try: actual=size(p)
                except OSError: continue
                if actual in ((1152,1536),(1536,512)):
                    candidates[str(p.resolve())]=(p,actual)
    print('CONNIE_SOURCE_CANDIDATES:',len(candidates))
    by_size={}
    for path,(p,sz) in sorted(candidates.items()):
        by_size.setdefault(sz,[]).append(p)
    selected={}
    for role,expected in ROLES:
        dest=SOURCES/(role+'.png')
        if dest.is_file() and size(dest)==expected:
            print(role,'using existing',dest)
            selected[role]=dest;continue
        opts=by_size.get(expected,[])
        print('\\n'+role.upper()+' (expected '+str(expected)+')')
        for i,p in enumerate(opts,1):print(f'  {i}. {p.name}  [{p.parent}]')
        if not opts:
            print('No candidate detected. Enter full Android PNG path manually.')
        reply=input('Select candidate number or full path (blank stops): ').strip()
        if not reply:raise RuntimeError('Selection cancelled; originals unchanged')
        chosen=opts[int(reply)-1] if reply.isdigit() and 1<=int(reply)<=len(opts) else Path(reply).expanduser()
        if not chosen.is_file() or size(chosen)!=expected:raise RuntimeError('Wrong or missing PNG for '+role)
        if any(sha(chosen)==sha(v) for v in selected.values()):
            raise RuntimeError('Same PNG selected for different roles; stop')
        selected[role]=chosen
    SOURCES.mkdir(parents=True,exist_ok=True)
    for role,p in selected.items():
        dest=SOURCES/(role+'.png')
        if p.resolve()!=dest.resolve():
            if dest.exists():raise RuntimeError('Refusing to replace existing source '+str(dest))
            shutil.copyfile(p,dest)
        assert size(dest)==dict(ROLES)[role]
        assert sha(dest)==sha(p)
    frames=[]
    for role,dimensions in ROLES:
        path=SOURCES/(role+'.png');digest=sha(path)
        for i in range(1 if role=='idle' else 3):
            name=role if role=='idle' else f'{role}_{i+1}'
            entry={'name':name,'file':str(path.relative_to(ROOT)),
                   'cell':[0,0,*dimensions] if role=='idle' else [i*512,0,512,512],
                   'sha256':digest}
            if name in HEADS:entry['head']=list(HEADS[name])
            else:entry['scaleFrom']='dash_2'
            frames.append(entry)
    manifest={'targetHeadHeight':100,'maxAtlasSize':4096,'padding':20,
              'measurementStatus':'provisional human visual review required',
              'frames':frames}
    out=ROOT/args.output
    if out.exists():
        old=json.loads(out.read_text())
        if old!=manifest:raise RuntimeError('Refusing to overwrite differing existing manifest '+str(out))
    else:
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_text(json.dumps(manifest,indent=2)+'\\n')
    print('CONNIE_INGRESS_OK=4; SOURCE_HASHES_VERIFIED=4')
    print('CONNIE_HEAD_MEASUREMENTS=PROVISIONAL (visual review required)')
    print('MANIFEST='+str(out))
if __name__=='__main__':
    try:main()
    except (RuntimeError,ValueError,EOFError) as e:
        print('CONNIE_INGRESS_STOP:',e,file=sys.stderr);sys.exit(2)

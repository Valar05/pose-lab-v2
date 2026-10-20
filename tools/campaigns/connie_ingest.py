#!/usr/bin/env python3
"""Screenshot-mapped, fail-closed Connie source ingress for Termux.

Finds the FOUR exact user-identified screenshot PNGs. No prompts or image generation.
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
ROLES=[('idle',None),('run',None),
       ('rebound',None),('dash',None)]
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
def valid_dimensions(role,actual,expected):
    if actual is None:return False
    if role=='idle':
        return 512<=actual[0]<=4096 and 512<=actual[1]<=4096
    return 900<=actual[0]<=4096 and 300<=actual[1]<=4096

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output',required=True);args=ap.parse_args()
    # Filenames and order were supplied explicitly in Drew's screenshot.
    # Never prompt or substitute similar-sized files.
    filenames={
        'run':'file_0000000065a081f598aa79ff7209b9d1.png',
        'dash':'file_00000000abb481f59b8ff374e3df6e8d.png',
        'idle':'file_00000000807881f598bd2fce43c5b0f6.png',
        'rebound':'file_000000001b8c81f5844badc8eaa7bd36.png'
    }
    selected={}
    for role,expected in ROLES:
        dest=SOURCES/(role+'.png')
        if dest.is_file():
            if not valid_dimensions(role,size(dest),expected):
                raise RuntimeError('Existing source dimension mismatch: '+str(dest))
            selected[role]=dest
            continue
        matches=[]
        for base in BASES:
            if not base.exists(): continue
            exact=base/filenames[role]
            if exact.is_file(): matches.append(exact)
            try:
                matches += [p for p in base.glob('*/'+filenames[role]) if p.is_file()]
            except OSError: pass
        matches=list({str(p.resolve()):p for p in matches}.values())
        if not matches:
            raise RuntimeError(f'Missing screenshot-named {role} PNG ({filenames[role]}). No replacement selected.')
        hashes={sha(p) for p in matches}
        if len(hashes)!=1:
            raise RuntimeError(f'Conflicting same-named {role} PNGs ({filenames[role]}): {len(hashes)} distinct SHA-256 hashes. No replacement selected.')
        chosen=sorted(matches,key=lambda p:str(p.resolve()))[0]
        if len(matches)>1:
            print('CONNIE_IDENTICAL_DUPLICATES',role,len(matches),'SHA256',next(iter(hashes)))
        if not valid_dimensions(role,size(chosen),expected):
            raise RuntimeError(f'{role} source dimensions mismatch: {chosen}, actual {size(chosen)}, expected {expected}')
        selected[role]=chosen
        print('CONNIE_SOURCE_MATCH',role,chosen)
    SOURCES.mkdir(parents=True,exist_ok=True)
    for role,p in selected.items():
        dest=SOURCES/(role+'.png')
        if p.resolve()!=dest.resolve():
            if dest.exists():raise RuntimeError('Refusing to replace existing source '+str(dest))
            shutil.copyfile(p,dest)
        assert valid_dimensions(role,size(dest),dict(ROLES)[role])
        assert sha(dest)==sha(p)
    frames=[]
    for role,_ in ROLES:
        path=SOURCES/(role+'.png');digest=sha(path)
        dimensions=size(path)
        if not valid_dimensions(role,dimensions,None):
            raise RuntimeError('Invalid source image dimensions: '+str(path))
        w,h=dimensions
        edges=[0,round(w/3),round(2*w/3),w] if role!='idle' else [0,w]
        for i in range(1 if role=='idle' else 3):
            name=role if role=='idle' else f'{role}_{i+1}'
            cell=[0,0,w,h] if role=='idle' else [edges[i],0,edges[i+1]-edges[i],h]
            entry={'name':name,'file':str(path.relative_to(ROOT)),'cell':cell,'sha256':digest}
            if name in HEADS:
                head=list(HEADS[name])
                baseline_w,baseline_h=(1152,1536) if role=='idle' else (1536,512)
                head=[round(head[0]*w/baseline_w),round(head[1]*h/baseline_h),
                      round(head[2]*w/baseline_w),round(head[3]*h/baseline_h)]
                # Expected head must fit precisely within the assigned triptych cell.
                cx,cy,cw,ch=cell
                if not(cx<=head[0]<head[2]<=cx+cw and cy<=head[1]<head[3]<=cy+ch):
                    raise RuntimeError(f'Head estimate outside derived {name} cell; human measurement required')
                entry['head']=head
            else: entry['scaleFrom']='dash_2'
            frames.append(entry)
    manifest={'targetHeadHeight':100,'maxAtlasSize':8192,'padding':20,
              'measurementStatus':'provisional human visual review required',
              'frames':frames}
    out=ROOT/args.output
    if out.exists():
        old=json.loads(out.read_text())
        if old!=manifest:raise RuntimeError('Refusing to overwrite differing existing manifest '+str(out))
    else:
        out.parent.mkdir(parents=True,exist_ok=True)
        out.write_text(json.dumps(manifest,indent=2)+'\n')
    print('CONNIE_INGRESS_OK=4; SOURCE_HASHES_VERIFIED=4')
    print('CONNIE_HEAD_MEASUREMENTS=PROVISIONAL (visual review required)')
    print('MANIFEST='+str(out))
if __name__=='__main__':
    try:main()
    except (RuntimeError,ValueError,EOFError) as e:
        print('CONNIE_INGRESS_STOP:',e,file=sys.stderr);sys.exit(2)

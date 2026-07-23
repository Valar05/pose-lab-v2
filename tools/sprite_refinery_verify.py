#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

def sha256(path: Path) -> str:
    h=hashlib.sha256(); h.update(path.read_bytes()); return h.hexdigest()

def alpha_bbox(img): return img.getchannel('A').getbbox()

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--frames-dir', required=True); ap.add_argument('--clip-id', required=True); ap.add_argument('--frame-count', type=int, required=True); ap.add_argument('--timing-ms', required=True); ap.add_argument('--report', required=True); ap.add_argument('--structural-report'); ap.add_argument('--provider-provenance')
    args=ap.parse_args(); d=Path(args.frames_dir); failures=[]; frames=[]
    timing=[int(x) for x in args.timing_ms.split(',') if x]
    if len(timing)!=args.frame_count: failures.append('timing count mismatch')
    last_hash=None
    for i in range(args.frame_count):
        p=d/f'{args.clip_id}_{i:04d}.png'
        if not p.is_file(): failures.append(f'missing frame {i}'); continue
        with Image.open(p) as im:
            if im.mode!='RGBA': failures.append(f'frame {i} is {im.mode}, expected RGBA')
            if im.size!=(512,512): failures.append(f'frame {i} size {im.size}, expected 512x512')
            bbox=alpha_bbox(im.convert('RGBA'))
            if not bbox: failures.append(f'frame {i} has no opaque pixels')
            else:
                if bbox[3] < 220: failures.append(f'frame {i} ground/contact row implausibly high: {bbox[3]}')
                if bbox[0] > bbox[2]: failures.append(f'frame {i} invalid bbox')
        digest=sha256(p); frames.append({'index':i,'path':str(p),'sha256':digest})
        if digest==last_hash and args.frame_count>1: failures.append(f'frame {i} duplicates previous frame bytes')
        last_hash=digest
    status='ready' if not failures else 'red'
    report={'schema':'pose-lab-v2-sprite-refinery-verification-v1','status':status,'clip_id':args.clip_id,'frame_count':args.frame_count,'timing_ms':timing,'checks':['512x512 RGBA PNG','transparent alpha present','frame order by filename','timing count','basic ground-contact bbox','no adjacent duplicate bytes'],'frames':frames,'failures':failures,'structural_report':args.structural_report,'provider_provenance':args.provider_provenance}
    Path(args.report).parent.mkdir(parents=True, exist_ok=True); Path(args.report).write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report, indent=2))
    if failures: raise SystemExit(1)
if __name__=='__main__': main()

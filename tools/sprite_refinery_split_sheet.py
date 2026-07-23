#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json
from pathlib import Path
from PIL import Image

def sha256(path: Path) -> str:
    h=hashlib.sha256(); h.update(path.read_bytes()); return h.hexdigest()

def bbox_alpha(img: Image.Image):
    alpha=img.getchannel('A')
    box=alpha.getbbox()
    if not box: return None
    return [int(v) for v in box]

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--sheet', required=True); ap.add_argument('--out-dir', required=True)
    ap.add_argument('--clip-id', required=True); ap.add_argument('--columns', type=int, required=True)
    ap.add_argument('--rows', type=int, required=True); ap.add_argument('--frame-count', type=int, required=True)
    ap.add_argument('--prefix', default='frame'); ap.add_argument('--chroma-key', default='0,255,0')
    args=ap.parse_args()
    sheet=Image.open(args.sheet).convert('RGBA')
    cell_w=sheet.width//args.columns; cell_h=sheet.height//args.rows
    if sheet.width % args.columns or sheet.height % args.rows: raise SystemExit('sheet dimensions are not divisible by grid')
    out=Path(args.out_dir); out.mkdir(parents=True, exist_ok=True)
    frames=[]
    key=tuple(int(v) for v in args.chroma_key.split(','))
    for i in range(args.frame_count):
        x=(i%args.columns)*cell_w; y=(i//args.columns)*cell_h
        cell=sheet.crop((x,y,x+cell_w,y+cell_h)).convert('RGBA')
        px=cell.load()
        for yy in range(cell.height):
            for xx in range(cell.width):
                r,g,b,a=px[xx,yy]
                if abs(r-key[0])<14 and abs(g-key[1])<14 and abs(b-key[2])<14:
                    px[xx,yy]=(r,g,b,0)
        canvas=Image.new('RGBA',(512,512),(0,0,0,0))
        scale=min(512/cell.width,512/cell.height)
        resized=cell.resize((round(cell.width*scale), round(cell.height*scale)), Image.Resampling.LANCZOS)
        ox=(512-resized.width)//2; oy=(512-resized.height)//2
        canvas.alpha_composite(resized,(ox,oy))
        p=out/f'{args.clip_id}_{i:04d}.png'; canvas.save(p)
        frames.append({'index':i,'path':p.name,'sha256':sha256(p),'bbox':bbox_alpha(canvas)})
    manifest={'schema':'pose-lab-v2-sprite-refinery-split-v1','clip_id':args.clip_id,'source_sheet':str(args.sheet),'source_size':[sheet.width,sheet.height],'grid':{'columns':args.columns,'rows':args.rows,'cell_width':cell_w,'cell_height':cell_h},'frame_space':{'width':512,'height':512,'color_mode':'RGBA','background':'transparent'},'frames':frames}
    (out/'split-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'ok':True,'frames':len(frames),'out_dir':str(out)}, indent=2))
if __name__=='__main__': main()

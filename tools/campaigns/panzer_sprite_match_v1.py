#!/usr/bin/env python3
"""Quarantined Panzer 8-view SOURCE comparison. Does not compose sprites."""
import json, hashlib, sys
from pathlib import Path
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

DIRECTIONS=('Front','Front-right','Right','Rear-right','Rear','Rear-left','Left','Front-left')
SOURCE={'hulls.png':'1ff30eb44b0eb2f469ee0d5dc1aade793ae75691b35ac1c7e2ed1c56d85a378a', 'turrets.png':'5cb397eda3a86de2584fc57d55c45e8d3480d0d2a845d4767ede963f0281f4c0'}
FACTOR=0.59

def hash_bytes(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def extraction(path):
    im=Image.open(path).convert('RGBA'); a=np.array(im)
    assert a[0,0,3]==0
    n,ids,stats,centers=cv2.connectedComponentsWithStats((a[:,:,3]>4).astype('uint8'),8)
    cc=sorted([i for i in range(1,n) if stats[i,cv2.CC_STAT_AREA]>5000], key=lambda i: centers[i][1])
    assert len(cc)==8, (path,len(cc))
    ordered=[]
    for r in range(4): ordered.extend(sorted(cc[2*r:2*r+2],key=lambda i:centers[i][0]))
    occupied=int((a[:,:,3]>4).sum()); major=sum(int(stats[i,4]) for i in ordered)
    assert major/occupied>0.998, ('fragment loss',path,major,occupied)
    out=[];infos=[]
    for k,i in enumerate(ordered):
        x,y,w,h,area=map(int,stats[i]); pixels=a[y:y+h,x:x+w].copy(); mask=(ids[y:y+h,x:x+w]==i)
        pixels[~mask]=0
        out.append(Image.fromarray(pixels,'RGBA'))
        infos.append({'direction':DIRECTIONS[k], 'degrees':k*45,'sourceBounds':[x,y,w,h], 'silhouette':[w,h], 'opaqueArea':area})
    return im,out,infos,round(major/occupied,7)

def font(size):
    for name in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','C:/Windows/Fonts/arial.ttf']:
        try: return ImageFont.truetype(name,size)
        except: pass
    return ImageFont.load_default()

def center(out,img,x,y,factor):
    sz=tuple(max(1,round(v*factor)) for v in img.size)
    tiny=img.resize(sz,Image.Resampling.LANCZOS)
    out.alpha_composite(tiny,(round(x-sz[0]/2),round(y-sz[1]/2)))

def main():
    root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path('/mnt/data')
    source=root/'public/assets/panzer-pose-experiment' if (root/'public').exists() else root
    # For local drafting the user-provided mounted images are the exact source.
    hullpath=source/'hulls.png' if (source/'hulls.png').exists() else Path('/mnt/data/panzer_hulls_mechanically_spaced.png')
    turretpath=source/'turrets.png' if (source/'turrets.png').exists() else Path('/mnt/data/936708.png')
    for name,p in [('hulls.png',hullpath),('turrets.png',turretpath)]:
        assert hash_bytes(p)==SOURCE[name], (name,hash_bytes(p))
    outdir=root/'public/assets/panzer-pose-experiment/matching-study-v1' if (root/'public').exists() else Path('/mnt/data/panzer-matching-study-v1')
    outdir.mkdir(parents=True,exist_ok=True)
    H,hs,hi,hcov=extraction(hullpath); T,ts,ti,tcov=extraction(turretpath)
    # All eight turret angles uniformly scaled in the hull's existing projection space.
    matched=Image.new('RGBA',H.size,(0,0,0,0))
    for i,t in enumerate(ts): center(matched,t,((i%2)+.5)*H.width/2,((i//2)+.5)*H.height/4,FACTOR)
    matched.save(outdir/'turrets-uniform-059.png',optimize=True)
    # Mild, reversible L*a*b grading trial, original hull stays locked.
    rgb=np.array(H.convert('RGB'));lab=cv2.cvtColor(rgb,cv2.COLOR_RGB2LAB).astype(np.int16)
    lab[:,:,0]=np.clip(np.round(lab[:,:,0]*1.025),0,255)
    lab[:,:,1]=np.clip(lab[:,:,1]+4,0,255);lab[:,:,2]=np.clip(lab[:,:,2]+5,0,255)
    warmed=Image.fromarray(cv2.cvtColor(lab.astype('uint8'),cv2.COLOR_LAB2RGB),'RGB').convert('RGBA')
    warmed.putalpha(H.getchannel('A'))
    warmed.save(outdir/'hulls-warmth-candidate.png',optimize=True)
    _,ws,_,_=extraction(outdir/'hulls-warmth-candidate.png')
    # Source-only isolated comparisons; NO stacking.
    board=Image.new('RGBA',(2000,1760),(15,21,27,255));d=ImageDraw.Draw(board)
    for i,(h,t) in enumerate(zip(hs,ts)):
        col,row=i%2,i//2; x0=col*1000;y0=row*440
        d.rounded_rectangle((x0+10,y0+10,x0+990,y0+426),radius=15,outline=(75,100,116),width=2,fill=(28,37,46))
        d.text((x0+28,y0+24),f'{i*45:03d}° | {DIRECTIONS[i]}',font=font(27),fill=(245,218,177))
        d.text((x0+95,y0+72),'Hull · original scale',font=font(17),fill=(190,210,220))
        d.text((x0+615,y0+72),'Turret · uniform 59%',font=font(17),fill=(190,210,220))
        center(board,h,x0+304,y0+235,0.72)
        center(board,t,x0+760,y0+235,0.72*FACTOR)
        d.line((x0+545,y0+83,x0+545,y0+384),fill=(76,99,113),width=2)
        d.text((x0+29,y0+390),f'Hull {h.width}×{h.height} native pixels',font=font(15),fill=(170,190,201))
        d.text((x0+561,y0+390),f'Turret {t.width}×{t.height} -> {round(t.width*FACTOR)}×{round(t.height*FACTOR)}',font=font(15),fill=(170,190,201))
    board.convert('RGB').save(outdir/'isolated-angle-comparison.png',optimize=True)
    # Palette is *another* candidate; do not use it to hide geometric mismatch.
    palette=Image.new('RGBA',(1600,1040),(15,21,27,255));d=ImageDraw.Draw(palette)
    d.text((30,18),'HULL · color-only comparison · source / warm candidate · no composition',font=font(26),fill=(240,210,164))
    for col,i in enumerate((0,2,7)):
        x=col*530
        d.text((x+25,81),DIRECTIONS[i],font=font(22),fill=(210,226,234))
        d.text((x+25,111),'Original hull',font=font(17),fill=(170,185,196))
        center(palette,hs[i],x+260,307,.72)
        d.text((x+25,540),'Color candidate only',font=font(17),fill=(170,185,196))
        center(palette,ws[i],x+260,765,.72)
    palette.convert('RGB').save(outdir/'palette-comparison.png',optimize=True)
    manifest={'schema':'panzer-source-match-study-v1','status':'quarantined-pending-human-verdict', 'originalsPreserved':True, 'sourceSha256':SOURCE, 'angleOrderDegrees':list(range(0,360,45)), 'turretScaleCandidate':FACTOR,'scaleAppliedUniformly':True,'hullAlphaConnectedCoverage':hcov,'turretAlphaConnectedCoverage':tcov,'hullSourceSilhouettes':hi,'turretSourceSilhouettes':ti, 'colorStudy':{'source':'hulls.png','goal':'approximate turret warmth','LAB':{'LMultiplier':1.025,'aOffset':4,'bOffset':5},'status':'candidate-only'},'notAttempted':['hull/turret composition','barrel matching','elevation','inpainting','perspective repair','runtime modification']}
    (outdir/'source-match-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    for p in outdir.iterdir(): print(p.name,p.stat().st_size,hash_bytes(p))
    print('PANZER_SOURCE_SHEET_MEASURED: 8 connected silhouettes per original; all originals locked')
if __name__=='__main__': main()

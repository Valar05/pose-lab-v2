#!/usr/bin/env python3
"""Connie: lossless-source, head-calibrated, crisp atlas campaign.

Requires Pillow. Example:
 python tools/campaigns/connie_head_atlas.py --manifest campaigns/connie-head-atlas.inputs.json --output generated/connie-head-atlas

Manifest format:
 {"targetHeadHeight":96,"maxAtlasSize":2048,"padding":12,"frames":[
   {"name":"idle","file":"assets/connie/idle.png","cell":[0,0,1152,1536],
    "head":[600,40,830,295],"sha256":"..."},
   {"name":"run_0","file":"assets/connie/run.png","cell":[0,0,512,512],
    "head":[330,45,465,180],"sha256":"..."}]}
Head rectangles are measured on the exact image, in source pixel coordinates.
Never guess these coordinates or fabricate hashes to bypass this gate.
"""
import argparse, hashlib, json, math
from pathlib import Path
from PIL import Image, ImageChops

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def image_region(src, rect):
    x,y,w,h=rect
    if min(w,h)<=0 or x<0 or y<0 or x+w>src.width or y+h>src.height:
        raise ValueError(f"invalid source cell {rect}")
    return src.crop((x,y,x+w,y+h))

def make_alpha(img):
    # Source is black-backed art. Exact black becomes transparent; nonblack
    # antialiasing is unpremultiplied to avoid dark edge halos.
    im=img.convert("RGB")
    px=im.load()
    result=Image.new("RGBA",im.size)
    dst=result.load()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b=px[x,y]
            lum=max(r,g,b)
            if lum<=2:
                dst[x,y]=(0,0,0,0)
            elif lum<24:
                a=min(255, round(255*(lum-2)/22))
                if a==0: dst[x,y]=(0,0,0,0)
                else: dst[x,y]=(min(255,round(r*255/a)),min(255,round(g*255/a)),min(255,round(b*255/a)),a)
            else: dst[x,y]=(r,g,b,255)
    return result

def trim(img):
    b=img.getchannel("A").getbbox()
    if b is None: raise ValueError("empty sprite after black mat removal")
    return img.crop(b),b

def nextpow2(v): return 1 << (v-1).bit_length()

def pack(images,padding,limit):
    """Choose the smallest valid power-of-two shelf layout, not a single long row."""
    order=sorted(images,key=lambda e:(-e["image"].height,-e["image"].width,e["name"]))
    widest=max(e["image"].width+2*padding for e in order)
    width=nextpow2(widest)
    options=[]
    while width<=limit:
        x=y=row_h=0
        positions={}
        valid=True
        for e in order:
            w,h=e["image"].size
            if w+2*padding>width or h+2*padding>limit:
                valid=False;break
            if x+w+2*padding>width:
                y+=row_h
                x=row_h=0
            positions[e["name"]]=(x+padding,y+padding)
            x+=w+2*padding
            row_h=max(row_h,h+2*padding)
        used_height=y+row_h
        height=nextpow2(max(1,used_height))
        if valid and height<=limit:
            options.append((width*height,max(width,height),width,height,positions))
        width*=2
    if not options:
        raise ValueError("Atlas cannot fit configured maximum")
    _,_,width,height,positions=min(options,key=lambda z:(z[0],z[1],z[2]))
    return positions,(width,height)

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--manifest",required=True)
    parser.add_argument("--output",required=True)
    a=parser.parse_args()
    m=json.loads(Path(a.manifest).read_text())
    entries=m["frames"]
    if not entries: raise ValueError("no frames")
    names=[f["name"] for f in entries]
    if len(names)!=len(set(names)): raise ValueError("duplicate frame name")
    out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
    target=int(m.get("targetHeadHeight",96))
    padding=int(m.get("padding",12));limit=int(m.get("maxAtlasSize",2048))
    if target<8 or padding<2 or limit<128: raise ValueError("invalid atlas settings")
    print("CONNIE_HEAD_CALIBRATION=PROVISIONAL_VISUAL_REVIEW")
    # Visual calibration of anatomical head scale from the user's actual
    # October 20 atlas review. The original nominal "head" rectangles were
    # not equivalent across source sheets, so target/head_height alone
    # produced tiny run figures relative to idle. These are explicit,
    # revisable candidate multipliers, NOT validated anatomical landmarks.
    visual_scale={"idle":1.0,"run":2.15,"rebound":1.5,"dash":1.25}
    frames=[]
    for f in entries:
        p=Path(f["file"])
        if not p.is_file(): raise FileNotFoundError(p)
        expected=f.get("sha256")
        if not expected or digest(p)!=expected:
            raise ValueError(f"source SHA mismatch (or missing) for {p}")
        src=Image.open(p);cx,cy,cw,ch=map(int,f["cell"])
        crop=image_region(src,[cx,cy,cw,ch])
        hb=f.get("head")
        if hb:
            hx0,hy0,hx1,hy1=map(int,hb)
            if not(cx<=hx0<hx1<=cx+cw and cy<=hy0<hy1<=cy+ch):
                raise ValueError("head outside source cell: "+f["name"])
            hh=hy1-hy0
            factor=target/hh
            # Provisional visual calibration from the actual assembled atlas.
            # The source-image head boxes are approximations, not equivalent
            # anatomical landmarks. Correct movement groups relative to idle.
            group=f["name"].split("_")[0]
            correction={"idle":1.0,"run":1.9,"rebound":1.4,"dash":1.15}[group]
            factor*=correction
        else:
            # Headless transformations inherit a specific frame's head scale.
            ref=f.get("scaleFrom")
            parent=next((z for z in frames if z["name"]==ref),None)
            if parent is None: raise ValueError(f"headless frame {f['name']} must scaleFrom earlier headed frame")
            factor=parent["scale"]
        group=f["name"].split("_")[0]
        factor*=visual_scale.get(group,1.0)
        rgba=make_alpha(crop)
        trimmed,bounds=trim(rgba)
        nw=max(1,round(trimmed.width*factor));nh=max(1,round(trimmed.height*factor))
        resized=trimmed.resize((nw,nh),Image.Resampling.LANCZOS)
        rec={"name":f["name"],"image":resized,"sourceSha256":expected,"sourceCell":f["cell"],"trimBox":list(bounds),"scale":factor,"visualCalibration":visual_scale.get(group,1.0)}
        if hb:
            rec["headBox"]=hb
            rec["headTopPx"]=(hy0-cy-bounds[1])*factor
        frames.append(rec)
    locations,size=pack(frames,padding,limit)
    atlas=Image.new("RGBA",size,(0,0,0,0));metadata={}
    for f in frames:
        x,y=locations[f["name"]];im=f["image"]
        atlas.alpha_composite(im,(x,y))
        metadata[f["name"]]={"frame":{"x":x,"y":y,"w":im.width,"h":im.height},
                             "sourceCell":f["sourceCell"],"sourceSha256":f["sourceSha256"],
                             "sourceTrim":f["trimBox"],"headBox":f.get("headBox"),
                             "scale":f["scale"],"pivot":{"x":round(im.width/2,2),"y":im.height}}
        im.save(out/(f["name"]+".png"))
    atlas.save(out/"connie_atlas.png",optimize=True)
    print("CONNIE_PACKING_BBOX", atlas.getchannel("A").getbbox(), "CANVAS", size)
    (out/"connie_atlas.json").write_text(json.dumps({"size":{"w":size[0],"h":size[1]},"headHeight":target,"frames":metadata},indent=2)+"\n")
    print(json.dumps({"atlas":str(out/"connie_atlas.png"),"frameCount":len(frames),"size":size,"headHeight":target}))

if __name__=="__main__":main()

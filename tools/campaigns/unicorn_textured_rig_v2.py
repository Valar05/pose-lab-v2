#!/usr/bin/env python3
"""V2 reversible source-pixel equine segmentation and textured IK review candidate.
This is an appearance experiment, not evidence of a validated canter.
"""
from __future__ import annotations
import argparse,hashlib,json,math
from pathlib import Path
from PIL import Image,ImageDraw,ImageChops
SHA="282d9cd98d0f2bd01816a5a3fe6e18c9e67d375a4a29da6f9809285fb2c9a698"
SIZE=(512,512)
OFFSET=(28,20)
# Raw top-left 455x430 original source cell. Explicit manually reviewable
# anchors, no nearest-frame selection and no replacing the character design.
# Fore and hind far legs use matched source-pixel donors, not invented black rods.
LEGS={
 "hind_far":dict(a=(169,291),b=(191,355),c=(212,400),r=(167,285),phase=0.,bend=-1),
 "hind_near":dict(a=(222,290),b=(206,351),c=(236,411),r=(214,290),phase=.28,bend=-1),
 "fore_far":dict(a=(330,288),b=(362,348),c=(344,383),r=(334,286),phase=.28,bend=1),
 "fore_near":dict(a=(355,278),b=(391,340),c=(439,414),r=(362,282),phase=.56,bend=1),
}
GROUND=436
FRAMES=24
def pt(x):return(x[0]+OFFSET[0],x[1]+OFFSET[1])
def polygon_for_segment(a,b,width_a,width_b):
 dx,dy=b[0]-a[0],b[1]-a[1];l=math.hypot(dx,dy);nx,ny=-dy/l,dx/l
 return [(a[0]+nx*width_a,a[1]+ny*width_a),
         (b[0]+nx*width_b,b[1]+ny*width_b),
         (b[0]-nx*width_b,b[1]-ny*width_b),
         (a[0]-nx*width_a,a[1]-ny*width_a)]
def mask(source,poly):
 m=Image.new("L",SIZE);ImageDraw.Draw(m).polygon([pt(v) for v in poly],fill=255)
 result=source.copy();result.putalpha(ImageChops.multiply(m,result.getchannel("A")))
 return result,m
def ik(a,c,one,two,bend):
 vx,vy=c[0]-a[0],c[1]-a[1];d=math.hypot(vx,vy)
 reach=min(one+two-.2,max(abs(one-two)+.2,d))
 along=(one*one-two*two+reach*reach)/(2*reach)
 aside=math.sqrt(max(0,one*one-along*along))
 ux,uy=vx/d,vy/d
 return(a[0]+ux*along-bend*uy*aside,
        a[1]+uy*along+bend*ux*aside),max(0,d-(one+two))
def warp(part,src_a,src_b,dst_a,dst_b):
 # Inverse affine similarity transform maps destination -> source pixels.
 sx,sy=pt(src_a);tx,ty=pt(src_b)
 ux,uy=dst_a;vx,vy=dst_b
 dx,dy=tx-sx,ty-sy;ex,ey=vx-ux,vy-uy
 den=dx*dx+dy*dy
 if den<1:raise ValueError("invalid donor")
 aa=(dx*ex+dy*ey)/den;bb=(dx*ey-dy*ex)/den
 determinant=aa*aa+bb*bb
 if determinant<1e-9:raise ValueError("degenerate transform")
 ia=aa/determinant;ib=bb/determinant
 # dest = [aa -bb;bb aa]*src + [ox,oy]
 ox=ux-aa*sx+bb*sy;oy=uy-bb*sx-aa*sy
 return part.transform(SIZE,Image.Transform.AFFINE,
                       (ia,ib, -ia*ox-ib*oy,
                        -ib,ia,ib*ox-ia*oy),
                       resample=Image.Resampling.BICUBIC)
def src_sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(args):
 src=Path(args.source);out=Path(args.out)
 if not src.is_file() or src_sha(src)!=SHA:raise SystemExit("STOP wrong exact original")
 original=Image.open(src).convert("RGBA")
 if original.size!=(1774,887):raise SystemExit("STOP original geometry mismatch")
 if out.exists():raise SystemExit("STOP target exists; no candidate overwrite")
 out.mkdir(parents=True)
 (out/"layers").mkdir();(out/"canter").mkdir();(out/"canter"/"frames").mkdir()
 base=Image.new("RGBA",SIZE);base.alpha_composite(original.crop((0,0,455,430)),OFFSET)
 # SOURCE PIXELS used for every animated segment; no procedural-color limb rods.
 # Draw all masks explicitly, report source pixel coverage and holes.
 donors={};masks=[]
 for name,s in LEGS.items():
  upper,mask_u=mask(base,polygon_for_segment(s["a"],s["b"],16,14))
  lower,mask_l=mask(base,polygon_for_segment(s["b"],s["c"],14,16))
  donors[name]=(upper,lower)
  upper.save(out/"layers"/(name+"_upper.png"))
  lower.save(out/"layers"/(name+"_lower.png"))
  masks += [mask_u,mask_l]
  for key in ("a","b","c"):
   assert 0<=pt(s[key])[0]<SIZE[0] and 0<=pt(s[key])[1]<SIZE[1]
 # remove only declared mask pixels below segment thresholds, preserving the
 # mounted rider and mane as much as possible. Occluded fill is NOT faked.
 combined=Image.new("L",SIZE,0)
 for m in masks:combined=ImageChops.lighter(combined,m)
 base_alpha=ImageChops.subtract(base.getchannel("A"),combined)
 # Preserve saddle/upper horse by removing only confidently declared distal anatomy.
 ImageDraw.Draw(base_alpha).rectangle((0,0,511,287),fill=255)
 base.putalpha(ImageChops.multiply(base_alpha,base.getchannel("A")))
 base.save(out/"layers"/"torso_rider_preserved.png")
 base.save(out/"source_body_without_masked_limbs.png")
 # Document actual missing pixels explicitly rather than conceal with a false
 # inpainted reconstruction or claim to have sourced invisible far-side anatomy.
 combined.save(out/"segmentation_mask.png")
 frames=[];angles=[];anchors={}
 for i in range(FRAMES):
  phase=i/FRAMES
  bob=3*math.cos(math.tau*(phase-.62))
  image=Image.new("RGBA",SIZE)
  # Near/far layering for every leg is explicit, with the torso between sides.
  for name in ("hind_far","fore_far","_torso","hind_near","fore_near"):
   if name=="_torso":
    shifted=Image.new("RGBA",SIZE)
    shifted.alpha_composite(base,(0,round(bob)))
    image.alpha_composite(shifted);continue
   s=LEGS[name];upper,lower=donors[name]
   hip=pt(s["a"]);hip=(hip[0],hip[1]+bob)
   rel=(phase-s["phase"])%1
   planted=rel<.22
   home=pt(s["c"])[0]
   u=(rel-.22)/.78 if not planted else 0
   target=(home if planted else home+24*math.sin(math.tau*u),
           GROUND if planted else GROUND-28*math.sin(math.pi*u))
   one=math.dist(s["a"],s["b"]);two=math.dist(s["b"],s["c"])
   joint,residual=ik(hip,target,one,two,s["bend"])
   if planted and residual>2:raise SystemExit("STOP contact IK exceeds two pixels")
   if planted:anchors.setdefault(name,set()).add(tuple(target))
   upper_img=warp(upper,s["a"],s["b"],hip,joint)
   lower_img=warp(lower,s["b"],s["c"],joint,target)
   image.alpha_composite(upper_img)
   image.alpha_composite(lower_img)
   angles.append(dict(frame=i,limb=name,contact=planted,
                      pivot=[round(v,2) for v in joint],
                      hoof=[round(v,2) for v in target],
                      reachResidualPx=round(residual,3)))
  dest=out/"canter"/"frames"/f"canter_{i:03d}.png"
  image.save(dest)
  frames.append(dict(src="canter/frames/"+dest.name,durationMs=50,
                     sha256=src_sha(dest),sourceFrame=i))
 if set(anchors)!=set(LEGS) or any(len(v)!=1 for v in anchors.values()):
  raise SystemExit("STOP stable contact verification failed")
 contact=Image.new("RGBA",(SIZE[0]*6,SIZE[1]*4))
 for i in range(FRAMES):
  im=Image.open(out/"canter"/"frames"/f"canter_{i:03d}.png")
  contact.alpha_composite(im,((i%6)*512,(i//6)*512))
 contact.save(out/"canter"/"contact-sheet.png")
 manifest=dict(schema="pose-lab-v2-2d-animation-set-v1",
  character="Mounted Unicorn / V2 TEXTURED REVIEW ONLY",
  defaultAnimation="canter",
  frameSpace=dict(width=512,height=512,colorMode="RGBA",background="transparent",facing="screen-right",camera="fixed"),
  animations=[dict(id="canter",label="Canter V2 source pixel segmentation [quarantined]",
   loop=True,contactSheet="canter/contact-sheet.png",
   sourceMetadata="rig.json",groundGuideY=GROUND,
   contract=["unapproved","original art texture","no opaque proxy rods","rider retained","do not accept without visual review"],frames=frames)])
 (out/"animations.json").write_text(json.dumps(manifest,indent=2)+"\n")
 rig=dict(schema="unicorn-articulated-source-pixel-rig-v2",status="quarantined-human-pending",
  appearanceSourceSha256=SHA,rootMotionX=False,leadEvidence="provisional; not video confirmed",
  masksAreManualCandidates=True,maskedPixelHolesNotInpainted=True,
  articulatedDonorParts=sorted(donors),donorAnchors=LEGS,
  contactResidualStagePx=0,frames=angles,
  limitations=["Far-side occluded original art lacks real anatomy",
    "Polygon mask pivots require human approval",
    "Source cloth/head parts are embedded in preserved torso and need final separate rig",
    "Provisional canter timing not determined from horse reference videos"])
 (out/"rig.json").write_text(json.dumps(rig,indent=2)+"\n")
 print("UNICORN_V2_SOURCE_TEXTURE_FRAMES="+str(FRAMES))
 print("UNICORN_V2_PROXIES=0; DISTAL_MASK_HOLES_NEED_VISUAL_REVIEW")
 print("UNICORN_V2_MANIFEST="+str(out/"animations.json"))
if __name__=="__main__":
 ap=argparse.ArgumentParser()
 ap.add_argument("--source",required=True);ap.add_argument("--out",required=True)
 run(ap.parse_args())

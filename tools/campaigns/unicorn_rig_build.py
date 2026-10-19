#!/usr/bin/env python3
"""Deterministic SOURCE-ART 2D canter rig proof; quarantined pending visual review.
Requires Pillow. Never uses diffusion or invents replacement illustrated poses.
"""
from __future__ import annotations
import argparse, hashlib, json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
SOURCE_SHA="282d9cd98d0f2bd01816a5a3fe6e18c9e67d375a4a29da6f9809285fb2c9a698"
W=H=512
OFF=(28,20)
GROUND=436
N=24
PHASE={"hind_far":0.0,"hind_near":.27,"fore_far":.27,"fore_near":.54}
PARTS={
"tail":[(0,178),(91,156),(156,182),(182,240),(160,335),(107,389),(0,351)],
"body":[(119,240),(164,206),(276,196),(350,222),(405,275),(406,316),(372,326),(309,302),(253,326),(177,318),(115,274)],
"head_neck":[(276,137),(317,91),(351,45),(397,40),(453,52),(453,168),(425,223),(383,269),(328,256),(288,207)],
"rider_cloth":[(28,121),(129,88),(226,105),(281,154),(281,225),(230,294),(179,321),(94,289),(33,219)],
"rider":[(83,1),(199,0),(277,12),(320,54),(304,123),(282,169),(312,207),(282,262),(232,292),(192,270),(166,192),(93,153),(62,65)],
"hoof_hind_donor":[(179,372),(208,350),(245,386),(244,417),(185,417)],
"hoof_fore_donor":[(392,350),(424,346),(451,374),(453,430),(408,419)]}
BONES={
"hind_far":{"base":(165,288),"upper":61,"lower":74,"bend":-1,"x":-19},
"hind_near":{"base":(224,280),"upper":61,"lower":70,"bend":-1,"x":-6},
"fore_far":{"base":(326,276),"upper":69,"lower":71,"bend":1,"x":-9},
"fore_near":{"base":(359,267),"upper":76,"lower":76,"bend":1,"x":9}}
def fail(s):raise SystemExit("STOP unicorn: "+s)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def shift(p):return(p[0]+OFF[0],p[1]+OFF[1])
def alpha_mask(source,points):
    mask=Image.new("L",source.size)
    ImageDraw.Draw(mask).polygon([shift(p) for p in points],fill=255)
    out=source.copy()
    out.putalpha(ImageChops.multiply(out.getchannel("A"),mask))
    return out
def ik(hip,foot,upper,lower,bend):
    x,y=foot[0]-hip[0],foot[1]-hip[1]
    d=math.hypot(x,y)
    if d<.01:fail("Zero length leg")
    distance=max(abs(upper-lower)+.2,min(upper+lower-.2,d))
    u,v=x/d,y/d
    forward=(distance*distance+upper*upper-lower*lower)/(2*distance)
    side=math.sqrt(max(.0,upper*upper-forward*forward))
    return (hip[0]+u*forward-bend*v*side,hip[1]+v*forward+bend*u*side),abs(d-distance)
def target(key,t):
    root=BONES[key]
    x=root["base"][0]+OFF[0]+root["x"]
    start=PHASE[key]
    elapsed=(t-start)%1
    if elapsed<.20:
        return (x,GROUND),"contact"
    u=(elapsed-.20)/.80
    return (x+25*math.sin(2*math.pi*u),GROUND-31*math.sin(math.pi*u)),"swing"
def segment(canvas,name,hip,foot):
    params=BONES[name]
    mid,error=ik(hip,foot,params["upper"],params["lower"],params["bend"])
    d=ImageDraw.Draw(canvas,"RGBA")
    far=name.endswith("far")
    dark=(18,12,18,255); coat=(33,23,32,255) if far else (48,30,38,255)
    line=(55,29,38,130)
    thickness=21 if far else 27
    d.line([hip,mid],fill=dark,width=thickness+5,joint="curve")
    d.line([hip,mid],fill=coat,width=thickness,joint="curve")
    d.line([mid,foot],fill=dark,width=thickness-3,joint="curve")
    d.line([mid,foot],fill=coat,width=thickness-8,joint="curve")
    d.line([(hip[0]-3,hip[1]),(mid[0]-2,mid[1])],fill=line,width=4)
    for center,r in [(hip,thickness/2),(mid,thickness*.42)]:
        x,y=center;d.ellipse((x-r,y-r,x+r,y+r),fill=coat,outline=dark,width=2)
    x,y=foot
    d.polygon([(x-12,y-6),(x+8,y-10),(x+17,y+1),(x+17,y+8),(x-14,y+9)],
              fill=(40,24,30,255),outline=dark,width=2)
    d.arc((x-12,y-21,x+11,y+2),180,357,fill=(206,136,47,255),width=3)
    d.ellipse((x-3,y-15,x+3,y-10),fill=(230,63,67,255))
    return dict(hip=[round(v,2) for v in hip],joint=[round(v,2) for v in mid],
                hoof=[round(v,2) for v in foot],reachResidualPx=round(error,3))
def run(src,out,lead):
    if not src.is_file() or sha(src)!=SOURCE_SHA:fail("Original 934732.png missing or SHA mismatch")
    raw=Image.open(src).convert("RGBA")
    if raw.size!=(1774,887):fail("Input size is not exact 1774x887")
    if out.exists() and any(out.iterdir()):fail("Destination is nonempty; no overwrites")
    out.mkdir(parents=True,exist_ok=True)
    layers=out/"layers";frames_dir=out/"canter"/"frames"
    layers.mkdir();frames_dir.mkdir(parents=True)
    donor=Image.new("RGBA",(W,H))
    donor.alpha_composite(raw.crop((0,0,455,430)),OFF)
    donor.save(out/"source_pose.png")
    masks={}
    for name,polygon in PARTS.items():
        masks[name]=alpha_mask(donor,polygon)
        masks[name].save(layers/(name+".png"))
    for name in BONES:
        # Deliberately transparent placeholders: anatomy not exposed by source.
        Image.new("RGBA",(W,H)).save(layers/(name+".png"))
    if lead=="far":
        gait={"hind_near":0.,"hind_far":.27,"fore_near":.27,"fore_far":.54}
    else:
        gait=PHASE.copy()
    PHASE.clear();PHASE.update(gait)
    cells=Image.new("RGBA",(W*6,H*4))
    frames=[];pose=[];contact_points={}
    for i in range(N):
        t=i/N
        bob=5*math.cos(2*math.pi*(t-.65))-2
        pitch=1.5*math.sin(2*math.pi*t)
        canvas=Image.new("RGBA",(W,H))
        joints={}
        for key in ["hind_far","fore_far"]:
            hip=shift(BONES[key]["base"]);hip=(hip[0],hip[1]+bob)
            foot,status=target(key,t)
            joints[key]=segment(canvas,key,hip,foot);joints[key]["phase"]=status
        tail=masks["tail"].rotate(3*math.sin(2*math.pi*(t-.20)),resample=Image.Resampling.BICUBIC,center=shift((126,207)))
        canvas.alpha_composite(tail)
        plate=Image.new("RGBA",(W,H))
        for key in ("body","head_neck","rider_cloth","rider"):
            plate.alpha_composite(masks[key])
        plate=plate.rotate(pitch,resample=Image.Resampling.BICUBIC,center=shift((261,246)))
        lift=Image.new("RGBA",(W,H));lift.alpha_composite(plate,(0,round(bob)))
        canvas.alpha_composite(lift)
        for key in ("hind_near","fore_near"):
            hip=shift(BONES[key]["base"]);hip=(hip[0],hip[1]+bob)
            foot,status=target(key,t)
            joints[key]=segment(canvas,key,hip,foot);joints[key]["phase"]=status
        for key,v in joints.items():
            if v["phase"]=="contact":
                contact_points.setdefault(key,set()).add(tuple(v["hoof"]))
        f=frames_dir/("canter_%03d.png"%i)
        canvas.save(f)
        cells.alpha_composite(canvas,((i%6)*W,(i//6)*H))
        frames.append({"src":"canter/frames/"+f.name,"durationMs":50,"sha256":sha(f),"sourceFrame":i})
        pose.append({"frame":i,"phase":round(t,6),"bodyPitchDeg":round(pitch,3),
                     "bodyBobPx":round(bob,3),"limbs":joints})
    if set(contact_points)!=set(BONES) or any(len(v)>1 for v in contact_points.values()):
        fail("Planted hoof pin assertion failed")
    sheet=out/"canter"/"contact-sheet.png";cells.save(sheet)
    hierarchy={"root":{"position":[0,0],"rootXFixed":True},
      "torso":{"parent":"root"},"neck_head":{"parent":"torso"},
      "rider":{"parent":"saddle","contactLocked":True},
      "rider_cloth":{"parent":"rider"},"tail":{"parent":"pelvis"}}
    hierarchy.update({k:{"parent":"root","hinges":["root","intermediate","fetlock/hoof"],
                          "proxy":True} for k in BONES})
    rig={"schema":"unicorn-2d-kinematic-rig-v1","status":"quarantined-prototype",
         "artSource":{"name":"934732.png","sha256":SOURCE_SHA,
                      "selectedCell":[0,0,455,430]},
         "rootMotionX":False,"lead":lead,"leadConfirmedFromVideo":False,
         "timingAuthority":"provisional modeled three-beat canter, not video-derived",
         "beatSequence":"opposite hind; diagonal hind+fore; lead fore; suspension",
         "beatPhase":gait,"groundY":GROUND,"hierarchy":hierarchy,"boneParams":BONES,
         "anatomyCaveat":"Lower limbs procedurally reconstructed as explicit proxies; segmented source texture and anatomical hock/stifle joints need manual repair",
         "renderFrames":pose,"contactDriftMaxPx":0,"humanVerdict":"pending"}
    (out/"rig.json").write_text(json.dumps(rig,indent=2)+"\n")
    manifest={"schema":"pose-lab-v2-2d-animation-set-v1",
       "character":"Mounted Unicorn [UNACCEPTED mechanical rig prototype]",
       "defaultAnimation":"canter",
       "frameSpace":{"width":W,"height":H,"colorMode":"RGBA","background":"transparent",
                     "facing":"screen-right","camera":"fixed"},
       "authority":{"appearance":"934732.png sha256 "+SOURCE_SHA,
                    "motion":"provisional three-beat canter model, not reference-video derived"},
       "animations":[{"id":"canter","label":"Canter: mechanical candidate",
                      "loop":True,"contactSheet":"canter/contact-sheet.png",
                      "sourceMetadata":"rig.json","groundGuideY":GROUND,
                      "contract":["quarantined", "source identity preserved",
                                  "in-place root","independent 4-limb IK",
                                  "articulated anatomy awaiting repair",
                                  "not visually accepted"],"frames":frames}]}
    (out/"animations.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print(json.dumps({"candidate":"quarantined","frames":N,"layers":len(PARTS)+4,
                      "rootXFixed":True,"plantDriftMaxPx":0,
                      "review":"Pose Lab V2 ?view=2d&manifest=./assets/unicorn/animations.json&animation=canter",
                      "awaits":"human visual inspection; no automatic acceptance"}))
if __name__=="__main__":
    a=argparse.ArgumentParser()
    a.add_argument("--source",type=Path,required=True)
    a.add_argument("--out",type=Path,required=True)
    a.add_argument("--lead",choices=["near","far"],default="near")
    x=a.parse_args();run(x.source,x.out,x.lead)

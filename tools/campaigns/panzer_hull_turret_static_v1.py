#!/usr/bin/env python3
"""Pure Pillow, exact-source static Panzer hull+turret candidate review."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib
from collections import deque
ROOT=Path(__file__).resolve().parents[2]
S=ROOT/'public/assets/panzer-pose-experiment'
OUT=S/'hull-turret-static-v1'
HULL=S/'matching-study-v1/postprocess-v1/panzer-hulls-tone-matched-94.png'
TURRET=S/'turret-only-v1'
NAMES=['front','front-right','right','rear-right','rear','rear-left','left','front-left']
# Visual inspection of original authored eight-way chassis ring positions, in 561x350 cell-local pixels.
RINGS=[[280,130],[306,121],[281,101],[258,102],[279,106],[300,104],[280,103],[252,120]]
# Turret mount center in connected-silhouette cropped bounds: horizontal midpoint, 80% from top.
# Explicitly marked candidate, not a measured physical pivot. Refine only after static visual review.
def extract(image):
 w,h=image.size;a=image.getchannel('A').tobytes();seen=bytearray(w*h);parts=[]
 for start in range(w*h):
  if seen[start] or a[start]<=4:continue
  seen[start]=1;stack=[start];points=[];x0=w;y0=h;x1=0;y1=0;sumx=sumy=0
  while stack:
   k=stack.pop();points.append(k);y,x=divmod(k,w);x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y);sumx+=x;sumy+=y
   for n in (k-1 if x else -1,k+1 if x+1<w else -1,k-w if y else -1,k+w if y+1<h else -1):
    if n>=0 and not seen[n] and a[n]>4:seen[n]=1;stack.append(n)
  if len(points)>5000:parts.append((points,(x0,y0,x1+1,y1+1),(sumx/len(points),sumy/len(points))))
 assert len(parts)==8,f'expected 8 hull islands, got {len(parts)}'
 byy=sorted(parts,key=lambda v:v[2][1]);ordered=[]
 for row in range(4):ordered.extend(sorted(byy[row*2:row*2+2],key=lambda v:v[2][0]))
 frames=[]
 for i,(points,box,center) in enumerate(ordered):
  x0,y0,x1,y1=box;cw=x1-x0;ch=y1-y0;crop=image.crop(box);rgba=bytearray(crop.tobytes());mask=bytearray(cw*ch)
  for k in points:
   y,x=divmod(k,w);mask[(y-y0)*cw+x-x0]=1
  for j,keep in enumerate(mask):
   if not keep:rgba[4*j+3]=0
  crop=Image.frombytes('RGBA',(cw,ch),bytes(rgba))
  frames.append((crop,box))
 return frames
def main():
 assert HULL.exists(),f'MISSING_CORRECTED_HULL:{HULL}'
 OUT.mkdir(parents=True,exist_ok=True)
 hull=Image.open(HULL).convert('RGBA')
 hulls=extract(hull)
 manifest={'schema':'panzer-hull-turret-static-v1','status':'static-candidate-review','hullSourceSha256':hashlib.sha256(HULL.read_bytes()).hexdigest(),'turretSourceSha256':'5cb397eda3a86de2584fc57d55c45e8d3480d0d2a845d4767ede963f0281f4c0','hullBase':'./assets/panzer-pose-experiment/hull-turret-static-v1/','turretBase':'./assets/panzer-pose-experiment/turret-only-v1/','angles':[],'scale':0.59,'barrel':False}
 review=Image.new('RGBA',(1600,900),(30,39,48,255))
 for i,(h,box) in enumerate(hulls):
  # We retain original hull cell geometry by placing the irregular crop at its true atlas-relative center.
  hx=(i%2)*(hull.width//2);hy=(i//2)*(hull.height//4)
  ox=box[0]-hx;oy=box[1]-hy
  scene=Image.new('RGBA',(800,450),(0,0,0,0))
  # Fit a full 561x350 source cell into 800x450 without clipping.
  native=Image.new('RGBA',(hull.width//2,hull.height//4),(0,0,0,0))
  native.alpha_composite(h,(ox,oy))
  Hname=f'hull-{i:02d}.png';native.save(OUT/Hname)
  turret=Image.open(TURRET/f'{i:02d}-{NAMES[i]}.png').convert('RGBA')
  ts=[round(turret.width*.59),round(turret.height*.59)]
  anchor=[round(ts[0]/2),round(ts[1]*.81)]
  pos=[RINGS[i][0]-anchor[0],RINGS[i][1]-anchor[1]]
  native.alpha_composite(turret.resize(tuple(ts),Image.Resampling.LANCZOS),tuple(pos))
  sc=min(380/native.width,385/native.height)
  composite=native.resize((round(native.width*sc),round(native.height*sc)),Image.Resampling.LANCZOS)
  x=(i%4)*400+(400-composite.width)//2;y=(i//4)*450+23
  review.alpha_composite(composite,(x,y))
  manifest['angles'].append({'index':i,'degrees':i*45,'hull':Hname,'turret':f'{i:02d}-{NAMES[i]}.png','canvas':[native.width,native.height],'hullRing':RINGS[i],'turretTopLeft':pos,'turretSize':ts,'turretAnchorCandidate':anchor})
 review.convert('RGB').save(OUT/'eight-static-poses.jpg',quality=94)
 (OUT/'registration.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
 print('STATIC_COMPOSITION_EXPORTED=8; PENDING_VISUAL_REVIEW')
if __name__=='__main__':main()

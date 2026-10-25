#!/usr/bin/env python3
"""Panzer approved turret sheet: connected-alpha extraction only, no repaint."""
from collections import deque
import hashlib,json
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'public/assets/panzer-pose-experiment/turrets.png'
OUT=ROOT/'public/assets/panzer-pose-experiment/turret-only-v1'
EXPECTED='5cb397eda3a86de2584fc57d55c45e8d3480d0d2a845d4767ede963f0281f4c0'
NAMES=['front','front-right','right','rear-right','rear','rear-left','left','front-left']
def main():
 assert SOURCE.exists(),f'BLOCKER: missing {SOURCE}'
 assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED,'BLOCKER: source artwork hash changed'
 original=Image.open(SOURCE).convert('RGBA');w,h=original.size
 assert original.getpixel((0,0))[3]==0,'BLOCKER: expected transparency'
 alpha=original.getchannel('A').tobytes()
 visited=bytearray(w*h);components=[]
 # Pixel-accurate connected components in ORIGINAL sheet space, no grid slicing.
 for start in range(w*h):
  if visited[start] or alpha[start]<=4:continue
  visited[start]=1;q=deque([start]);positions=[];x0=w;y0=h;x1=0;y1=0;sumx=sumy=0
  while q:
   n=q.popleft();positions.append(n);y,x=divmod(n,w);sumx+=x;sumy+=y
   x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y)
   if x and not visited[n-1] and alpha[n-1]>4:visited[n-1]=1;q.append(n-1)
   if x+1<w and not visited[n+1] and alpha[n+1]>4:visited[n+1]=1;q.append(n+1)
   if y and not visited[n-w] and alpha[n-w]>4:visited[n-w]=1;q.append(n-w)
   if y+1<h and not visited[n+w] and alpha[n+w]>4:visited[n+w]=1;q.append(n+w)
  if len(positions)>5000:components.append({'pixels':positions,'bbox':[x0,y0,x1+1,y1+1],'center':[sumx/len(positions),sumy/len(positions)]})
 assert len(components)==8,f'BLOCKER: expected 8 turrets, found {len(components)}'
 byy=sorted(components,key=lambda c:c['center'][1]);ordered=[]
 for row in range(4):ordered.extend(sorted(byy[row*2:row*2+2],key=lambda c:c['center'][0]))
 coverage=sum(len(c['pixels']) for c in ordered)/sum(v>4 for v in alpha)
 assert coverage>.997,f'BLOCKER: alpha island coverage {coverage:.6f}'
 OUT.mkdir(parents=True,exist_ok=True)
 board=Image.new('RGBA',(1600,1200),(24,32,39,255));pen=ImageDraw.Draw(board)
 manifest={'schema':'panzer-turret-extraction-v1','sourceSha256':EXPECTED,'alphaCoverage':coverage,'angles':[],'status':'source-preserved-pending-human-approval'}
 for idx,comp in enumerate(ordered):
  x0,y0,x1,y1=comp['bbox'];cw=x1-x0;ch=y1-y0
  sprite=original.crop((x0,y0,x1,y1));rgba=bytearray(sprite.tobytes())
  mask=bytearray(cw*ch)
  for n in comp['pixels']:
   y,x=divmod(n,w);mask[(y-y0)*cw+(x-x0)]=1
  for j,keep in enumerate(mask):
   if not keep:rgba[j*4+3]=0
  sprite=Image.frombytes('RGBA',(cw,ch),bytes(rgba))
  name=f'{idx:02d}-{NAMES[idx]}.png';sprite.save(OUT/name)
  factor=min(700/cw,235/ch,1.)
  scaled=sprite.resize((round(cw*factor),round(ch*factor)),Image.Resampling.LANCZOS)
  col,row=idx%2,idx//2;cx=col*800+400;cy=row*300+160
  board.alpha_composite(scaled,(round(cx-scaled.width/2),round(cy-scaled.height/2)))
  pen.text((col*800+25,row*300+15),f'{idx*45:03d}° {NAMES[idx]}',fill=(255,223,174))
  manifest['angles'].append({'index':idx,'name':NAMES[idx],'degrees':idx*45,'sourceBounds':[x0,y0,cw,ch],'opaqueArea':len(comp['pixels']),'file':name})
 board.convert('RGB').save(OUT/'contact-review.jpg',quality=94)
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8')
 print('TURRET_EXTRACTION_PASS=8');print('REVIEW_ROUTE=motion.html?procedural=panzer-turret-only-v1')
if __name__=='__main__':main()

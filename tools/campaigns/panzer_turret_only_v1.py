#!/usr/bin/env python3
"""Extract the eight authored Panzer turret silhouettes without changing the source."""
import hashlib,json,sys
from pathlib import Path
import cv2,numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'public/assets/panzer-pose-experiment/turrets.png'
OUT=ROOT/'public/assets/panzer-pose-experiment/turret-only-v1'
EXPECTED='5cb397eda3a86de2584fc57d55c45e8d3480d0d2a845d4767ede963f0281f4c0'
NAMES=['front','front-right','right','rear-right','rear','rear-left','left','front-left']
def main():
 assert SOURCE.exists(),f'BLOCKER: missing {SOURCE}'
 assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==EXPECTED,'BLOCKER: source sprite changed'
 im=np.array(Image.open(SOURCE).convert('RGBA'))
 assert im[0,0,3]==0,'BLOCKER: alpha source'
 count,ids,stats,center=cv2.connectedComponentsWithStats((im[:,:,3]>4).astype(np.uint8),8)
 significant=sorted((i for i in range(1,count) if stats[i,cv2.CC_STAT_AREA]>5000),key=lambda i:center[i,1])
 assert len(significant)==8,f'BLOCKER: expected 8 source components, found {len(significant)}'
 ordered=[]
 for row in range(4):ordered+=sorted(significant[row*2:row*2+2],key=lambda i:center[i,0])
 coverage=sum(int(stats[i,cv2.CC_STAT_AREA]) for i in ordered)/int((im[:,:,3]>4).sum())
 assert coverage>.998,f'BLOCKER: unaccounted alpha pixels {coverage}'
 OUT.mkdir(parents=True,exist_ok=True)
 board=Image.new('RGBA',(1600,1200),(24,32,39,255));d=ImageDraw.Draw(board)
 manifest={'schema':'panzer-turret-extraction-v1','sourceSha256':EXPECTED,'alphaCoverage':coverage,'angles':[],'status':'extracted-not-yet-visually-approved'}
 for n,i in enumerate(ordered):
  x,y,w,h,area=map(int,stats[i]); cropped=im[y:y+h,x:x+w].copy()
  cropped[ids[y:y+h,x:x+w]!=i]=0
  sprite=Image.fromarray(cropped,'RGBA')
  filename=f'{n:02d}-{NAMES[n]}.png';sprite.save(OUT/filename)
  # Independent slot, visibly bounded with empty padding; do not distort.
  col=n%2;row=n//2; cx=col*800+400;cy=row*300+160
  factor=min(700/w,235/h,1.)
  scaled=sprite.resize((round(w*factor),round(h*factor)),Image.Resampling.LANCZOS)
  board.alpha_composite(scaled,(round(cx-scaled.width/2),round(cy-scaled.height/2)))
  d.text((col*800+25,row*300+15),f'{n*45:03d}° {NAMES[n]}',fill=(255,223,174))
  manifest['angles'].append({'index':n,'name':NAMES[n],'degrees':n*45,'sourceBounds':[x,y,w,h],'opaqueArea':area,'file':filename,'origin':'original unmodified turret sheet connected-component mask'})
 board.convert('RGB').save(OUT/'contact-review.jpg',quality=94)
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
 print('TURRET_EXTRACTION_PASS=8')
 print('SOURCE_SHA256='+EXPECTED)
 print('REVIEW_ROUTE=motion.html?procedural=panzer-turret-only-v1')
if __name__=='__main__':main()

from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import math
R=Path(__file__).resolve().parents[2]
base=R/'public/assets/connie/frames'
out=R/'public/reviews/connie-paper-motion'
clips={'idle':['idle'],'run':['run_1','run_2','run_3'],'aerial':['aerial_1','aerial_2','aerial_3'],'transform':['spin_1','spin_2','spin_3'],'untransform':['spin_3','spin_2','spin_1']}
for clip,names in clips.items():
 images=[Image.open(base/(n+'.png')).convert('RGBA') for n in names]
 rendered=[]
 steps=36 if clip in ('transform','untransform') else 24
 for i in range(steps):
  phase=i/steps
  if clip=='idle':idx=0
  else:idx=min(len(images)-1,int(phase*len(images)))
  f=images[idx].copy()
  angle=0
  if clip=='transform':
   p=max(0,(phase-.30)/.70);angle=360*(.15*p+.85*p*p)
  elif clip=='untransform':
   p=phase;angle=360*(1-(.15*(1-p)+.85*(1-p)*(1-p)))
  if angle:f=f.rotate(-angle,resample=Image.Resampling.BICUBIC,expand=True)
  sx=1;sy=1
  if clip=='idle':sx=1+.006*math.sin(2*math.pi*phase);sy=1-.007*math.sin(2*math.pi*phase)
  elif clip=='run':sx=1+.024*math.sin(6*math.pi*phase);sy=1-.027*math.sin(6*math.pi*phase)
  if sx!=1 or sy!=1:f=f.resize((max(1,round(f.width*sx)),max(1,round(f.height*sy))),Image.Resampling.BICUBIC)
  stage=Image.new('RGBA',(640,570),(17,17,27,255));d=ImageDraw.Draw(stage)
  d.line((0,490,640,490),fill=(110,75,110),width=2)
  factor=min(1.15,470/max(f.width,f.height))
  if factor!=1:f=f.resize((round(f.width*factor),round(f.height*factor)),Image.Resampling.LANCZOS)
  stage.alpha_composite(f,((640-f.width)//2,490-f.height))
  d.text((18,15),'CONNIE / '+clip.upper()+' / CANDIDATE',fill=(255,200,230))
  rendered.append(stage.convert('RGB').quantize(colors=128))
 dest=out/(clip+'.gif')
 rendered[0].save(dest,save_all=True,append_images=rendered[1:],duration=round((950 if clip in ('transform','untransform') else 720 if clip=='run' else 1900 if clip=='idle' else 780)/steps),loop=0,optimize=True)
 print(clip,dest.stat().st_size)

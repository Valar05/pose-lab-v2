#!/usr/bin/env python3
"""Reconstruct v03.8 exact source-skinned poses from recorded joint tracks; review-only.
Original invocation: python render_approved_source_tracks.py SOURCE_GLB OUTPUT_DIR
No solver recomputation, no source mutation, no animation channel authoring.
"""
import sys, json,csv,math
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
sfile=Path(__file__).resolve().parent/'six_leg_overlap_engine.py'
engine=sfile.read_text()
a=engine.index('results=[];frames_data=[];angle_tracks=[]')
header=engine[:a]
# The original engine's tested source-to-skin routines and measured foot patches.
d={'__name__':'heady_review_only','__file__':str(sfile)}
exec(compile(header,str(sfile),'exec'),d,d)
out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
with (out/'overlap_85ticks.csv').open() as f:rows=list(csv.DictReader(f))
tracks=json.loads((out/'overlap_bone_tracks.json').read_text())
assert tracks['version']=='03.8.0' and len(rows)==len(tracks['angles_by_tick'])==85
assert tracks['source_sha256']==d['sourcehash']
indices=list(range(0,85,2))
if 84 not in indices:indices.append(84)
frames_data={}
for ix in indices:
 shift=np.asarray(tracks['root_translations_xyz'][ix]);angles={}
 for leg,chain in d['chains'].items():
  v=tracks['angles_by_tick'][ix][leg]
  for k,node in enumerate(chain):angles[node]=(v[2*k],v[2*k+1])
 world=d['build_matrices'](shift,angles); sk=d['skin_vertices'](world)
 actual={leg:np.median(sk[d['toe_sets'][leg]],axis=0) for leg in d['keys']}
 targets={leg:d['planned'](ix/d['FRAME_PER_CYCLE'],leg)[0] for leg in d['keys']}
 swing=[leg for leg in d['keys'] if rows[ix][leg+'_contact']=='SWING']
 frames_data[ix]=(sk,world,actual,targets,swing)
# Import only fixed cameras / original renderer, preserve actual GLB skinned surfaces.
post=engine[engine.index('try:\n font='):engine.index('review=[]')]
post=post.replace('frames_data[ix]','frames_data[ix]').replace("fill=(130,243,213,220)","fill=(*COLORS[leg],255)").replace("fill=(18,226,175,255)","fill=(*COLORS[leg],255)")
d.update({'frames_data':frames_data,'results':[dict(row,root_x=float(row['root_x'])) for row in rows]})
exec(compile(post,str(sfile),'exec'),d,d)
review=[]
for ix in indices:
 board=Image.new('RGB',(1008,586),(12,17,22));dr=ImageDraw.Draw(board)
 sk,world,actual,targets,swing=frames_data[ix]
 for c,cam in enumerate(d['CAMERAS']):
  im=d['renderer'].raster(sk,d['uv'],d['faces'],d['tex'],cam['eye'],cam['focus'],cam['scale'],cam['w'],cam['h'])
  board.paste(d['decorate'](im,cam,ix),(8+c*500,43));dr.text((14+c*500,13),cam['name']+' / fixed world',font=d['font'],fill=(223,238,233))
 dr.text((12,565),f"3-LEG OVERLAP | frame {ix+1}/85 | swinging: {', '.join(swing)} | body X +{float(rows[ix]['root_x']):.3f}",font=d['sm'],fill=(255,228,183))
 review.append(board)
 if ix in [0,4,8,16,18,30,36,48,60,72,84]:board.save(out/f'Overlap_Frame_{ix:03d}.png')
 print('RENDER_FRAME='+str(ix),flush=True)
review[0].save(out/'Heady_v03_8_OverlappingTripod_Candidate.gif',save_all=True,append_images=review[1:],duration=[148]*(len(review)-1)+[650],optimize=True,loop=1)
# Three simultaneous swings, color-coded each bone; not a false one-leg strip.
chosen=[0,6,16,30,42,54]
sh=Image.new('RGB',(1008*3,586*2),(11,16,20))
for i,ix in enumerate(chosen):
 frame=review[indices.index(ix)]
 sh.paste(frame,(i%3*1008,i//3*586))
sh.save(out/'Overlap_SixStates_Review.png')
# Gait chart: actual measured temporal lift curves, with swing overlap and continuous moving root.
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig,ax=plt.subplots(3,1,figsize=(13,9),sharex=True)
color=['#ffaf4e','#f4d561','#96db8c','#75b1f4','#d39bf8','#ff7ba8']
for i,leg in enumerate(d['keys']):
 y=[float(r[leg+'_lift']) for r in rows]
 ax[0].plot(range(85),y,label=leg,color=color[i],lw=2)
ax[0].set_ylabel('Commanded foot lift (model units)');ax[0].legend(loc='upper right',ncol=3,fontsize=9)
counts=[int(r['swing_count']) for r in rows]
ax[1].step(range(85),counts,where='mid',color='#4477aa',lw=2);ax[1].fill_between(range(85),counts,step='mid',alpha=.15,color='#4477aa')
ax[1].axhline(3,color='#cc6677',linestyle=':');ax[1].set_ylim(0,3.5);ax[1].set_yticks([1,2,3]);ax[1].set_ylabel('Simultaneous airborne legs')
ax[2].plot(range(85),[float(r['root_x']) for r in rows],color='#228855',lw=2)
ax[2].set_ylabel('World body X');ax[2].set_xlabel('Solver frame')
fig.suptitle('Heady v03.8: overlapping real lifts, nonserial staggered tripods, continuously moving body')
fig.tight_layout();fig.savefig(out/'Overlap_Actual_LiftCurves_And_BodyMotion.png',dpi=145);plt.close(fig)
print('VISUAL_ARTIFACTS_DONE',flush=True)

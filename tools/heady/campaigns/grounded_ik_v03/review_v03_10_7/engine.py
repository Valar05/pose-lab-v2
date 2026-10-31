#!/usr/bin/env python3
"""Heady 03.10.7: forensic exact-input coverage repair, SOURCE never modified."""
import sys,os,json,hashlib,struct,copy,math,io
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
import hair_engine_v03105 as H
SOURCE_SHA=H.HASH
PHONE_SHA='af063bd3c465b38e161a7ee917097e2a6c1922b0a8cf63e3e135383a38a647dc'
ROOT_NAMES=['Bone_007','Bone_013','Bone_021','Bone_024','Bone_010','Bone_017']
REAR=['Bone_017','Bone_016','Bone_015','Bone_014','Bone_021','Bone_020','Bone_019','Bone_018']

def chk(x,msg):
 if not x:raise RuntimeError(msg)
def h(b):return hashlib.sha256(b).hexdigest()

def load_derived(raw,model):
 chk(h(raw)==PHONE_SHA,'PHONE_DERIVED_SHA_MISMATCH')
 chk(raw[:4]==b'glTF','INVALID_DERIVED_GLB')
 ln=struct.unpack_from('<I',raw,12)[0]; doc=json.loads(raw[20:20+ln]); off=20+ln
 bl=struct.unpack_from('<I',raw,off)[0];binary=raw[off+8:off+8+bl]
 def read(acc):
  a=doc['accessors'][acc];v=doc['bufferViews'][a['bufferView']];dtype={5121:np.uint8,5126:np.dtype('<f4'),5123:np.dtype('<u2'),5125:np.dtype('<u4')}[a['componentType']]; width={'VEC4':4,'MAT4':16,'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]; start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',np.dtype(dtype).itemsize*width)
  return np.ndarray((a['count'],width),dtype=dtype,buffer=binary,offset=start,strides=(stride,np.dtype(dtype).itemsize)).copy()
 attrs=doc['meshes'][0]['primitives'][0]['attributes'];j=read(attrs['JOINTS_0']);w=read(attrs['WEIGHTS_0']);ibm=read(doc['skins'][0]['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
 chk(len(j)==len(model.p) and len(doc['skins'][0]['joints'])==59,'WRONG_DERIVED_TOPOLOGY')
 chk([n.get('name') for n in doc['nodes'][-7:]]==H.HAIR_NODES,'WRONG_HAIR_JOINTS')
 chk(np.max(np.abs(w.sum(axis=1)-1))<1e-5,'ABNORMAL_DERIVED_WEIGHTS')
 chk(j.shape==model.ji.shape,'WRONG_JOINT_ARRAY_SHAPE')
 return doc,bytearray(binary),j,w,ibm

def make_candidate(model,doc,binary,j,w,newmask):
 # Reuse existing hair-chain location, do not move the mesh or skeleton.
 allhair=np.any((j>=52)&(j<=58)&(w>1e-7),axis=1)
 add=newmask&~allhair
 y=model.p[add,1];f=np.clip((1.38-y)/(1.38-.25)*6,0,6);lo=np.minimum(np.floor(f).astype(int),5);alpha=f-lo;stiff=y>=1.30;lo[stiff]=0;alpha[stiff]=0
 nj=j.copy();nw=w.copy();ix=np.flatnonzero(add)
 nj[ix,:]=0;nw[ix,:]=0;nj[ix,0]=52+lo;nj[ix,1]=53+lo;nw[ix,0]=1-alpha;nw[ix,1]=alpha;nj[ix[stiff],1]=0;nw[ix[stiff],1]=0
 assert np.array_equal(nj[~add],j[~add]) and np.array_equal(nw[~add],w[~add])
 def write(acc,data):
  a=doc['accessors'][acc];v=doc['bufferViews'][a['bufferView']];start=v.get('byteOffset',0)+a.get('byteOffset',0);sz=data.nbytes
  chk(v.get('byteStride') in (None,data.shape[1]*data.dtype.itemsize),'INTERLEAVED_UNSUPPORTED')
  chk(start+sz<=len(binary),'BUFFER_WRITE_OVERFLOW');binary[start:start+sz]=data.tobytes()
 attrs=doc['meshes'][0]['primitives'][0]['attributes'];write(attrs['JOINTS_0'],nj);write(attrs['WEIGHTS_0'],nw.astype('<f4'))
 doc['asset'].setdefault('extras',{})['hair_coverage_repair']={'version':'03.10.7','derived_input_sha256':PHONE_SHA,'new_vertices':len(ix),'status':'EXPERIMENT_HUMAN_APPROVAL_PENDING'}
 jb=json.dumps(doc,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4)
 bb=bytes(binary);bb+=b'\0'*((-len(bb))%4)
 raw=struct.pack('<4sII',b'glTF',2,28+len(jb)+len(bb))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(bb),0x004e4942)+bb
 return raw,nj,nw,add

def diagnose_and_select(model,j,w):
 p=model.p;f=model.f;n=len(p);col=H.vertex_color(model);r,g,b=col.T;x,y,z=p.T
 jnames=[model.j['nodes'][q]['name'] for q in model.skin['joints']]
 legids=np.array([i for i,n in enumerate(jnames) if n in H.grow_hair_mask(model)[1]['leg_bones']]);rearids=np.array([jnames.index(q) for q in REAR]);legw=(np.isin(j,legids)*w).sum(axis=1);rearw=(np.isin(j,rearids)*w).sum(axis=1)
 originalmask=np.any((j>=52)&(j<=58)&(w>1e-7),axis=1)
 # Require posterior plum color AND rear influence, plus adjacent triangular continuous components.
 plum=(r>.13)&(r<.67)&(b>.14)&(b>.46*r)&(b>1.18*g)&(r>1.45*g)&(g<.205)
 cutoff=np.interp(y,[0,.4,.65,.85,1,1.3,1.5,1.7],[-.33,-.33,-.28,-.20,-.12,-.06,-.06,-.08])
 posterior=(z<cutoff)&(y>.04)&(y<1.54)
 seed=plum&posterior&(rearw>.04)&(~originalmask)
 # Build raw connected triangle components; select only small islands strongly dominated by purple, posterior, rear-weighted candidates.
 a=np.r_[f[:,0],f[:,1],f[:,2]];bb=np.r_[f[:,1],f[:,2],f[:,0]]
 G=coo_matrix((np.ones(len(a)*2),(np.r_[a,bb],np.r_[bb,a])),shape=(n,n)).tocsr();count,lab=connected_components(G,directed=False)
 sizes=np.bincount(lab,minlength=count);sums=np.bincount(lab,weights=seed.astype(float),minlength=count);colors=np.bincount(lab,weights=plum.astype(float),minlength=count);poss=np.bincount(lab,weights=posterior.astype(float),minlength=count);rear=np.bincount(lab,weights=rearw,minlength=count)
 existing=np.bincount(lab,weights=originalmask.astype(float),minlength=count)
 foot=np.bincount(lab,weights=((y<.03)&(legw>.55)).astype(float),minlength=count)
 # Strong candidates only. Others remain unmapped and flagged for HUMAN review.
 take=(sizes<=150)&(sums/np.maximum(sizes,1)>.27)&(colors/np.maximum(sizes,1)>.60)&(poss/np.maximum(sizes,1)>.58)&(rear/np.maximum(sizes,1)>.2)&(foot==0)&(existing==0)
 chosen=take[lab];unresolved=seed&~chosen
 return originalmask,chosen,unresolved,{'seed_vertices':int(seed.sum()),'added_vertices':int(chosen.sum()),'unresolved_seed_vertices':int(unresolved.sum()),'original_hair_vertices':int(originalmask.sum()),'remaining_leg_vertices':int((legw>1e-7).sum()),'raw_components':int(count),'selected_components':int(take.sum()),'unresolved_by_design':True}

def render(model,states,masks,out):
 # Actual source-skinned mesh triangles, rasterized with original UV texture samples.
 # No fake sprite movement. Each panel uses the exact same diagnostic bone rotation.
 names={n['name']:i for i,n in enumerate(states[0][1]['nodes'])}
 f=model.f
 tex=np.asarray(model.tex)
 rgb=(H.vertex_color(model)*255).clip(0,255).astype(np.uint8)
 # Per-face UV texture colors; no mock shading/texture regenerated.
 colors=np.asarray(np.mean(rgb[f],axis=1),dtype=np.uint8)
 frames=[];motion=[]
 cams=[(np.array([0.,1.12,3.3]),np.array([0.,.86,-.13])),(np.array([1.95,1.20,2.65]),np.array([0.,.87,-.13]))]
 wid=420;hig=340;panelh=340;scale=260
 for k in range(24):
  bone=ROOT_NAMES[(k//4)%6]
  ang=0.78*math.sin(math.pi*((k%4)+.5)/4)
  changes={names[bone]:[0.,ang,0.]}
  canvas=Image.new('RGB',(1284,760),(12,17,22));d=ImageDraw.Draw(canvas)
  for q,(name,doc,ibm,j,w) in enumerate(states):
   sk=H.skinpts(model,doc,ibm,j,w,changes)
   rest=H.skinpts(model,doc,ibm,j,w)
   motion.append(float(np.max(np.linalg.norm(sk-rest,axis=1))))
   for side,(eye,focus) in enumerate(cams):
    direction=focus-eye;direction/=np.linalg.norm(direction)
    right=np.cross(direction,np.array([0,1,0]));right/=np.linalg.norm(right)
    up=np.cross(right,direction);up/=np.linalg.norm(up)
    dp=sk-focus
    sx=dp@right*scale+(q*428)+214
    sy=hig/2-dp@up*scale+(side*358)+34
    depth=dp@direction
    # Draw distant triangles before near triangles. Simple deterministic software raster.
    face_depth=depth[f].mean(axis=1)
    order=np.argsort(face_depth)[::-1]
    for index in order:
     a,b,c=f[index]
     xa,xb,xc=sx[[a,b,c]];ya,yb,yc=sy[[a,b,c]]
     if min(xa,xb,xc)>q*428+428 or max(xa,xb,xc)<q*428 or min(ya,yb,yc)>side*358+370 or max(ya,yb,yc)<side*358+32:continue
     color=tuple(int(z) for z in colors[index]);d.polygon([(float(xa),float(ya)),(float(xb),float(yb)),(float(xc),float(yc))],fill=color)
   d.text((q*428+15,11),name,fill=(245,220,181))
  d.text((14,738),f'LEG={bone} ROTATION={ang:.3f}rad | SOURCE SKINNED MESH | FRONT + OBLIQUE | PHYSICS OFF | FRAME={k+1}/24',fill=(233,220,194))
  frames.append(canvas)
 chk(max(motion)>.005,'ANIMATION_CANARY_TOO_SMALL')
 frames[0].save(out,save_all=True,append_images=frames[1:],duration=125,loop=0,optimize=False)
 return {'frames':len(frames),'max_skin_displacement':max(motion),'gif_bytes':out.stat().st_size}

def mask_image(model,orig,add,unresolved,out):
 p=model.p;im=Image.new('RGB',(1440,820),(13,20,26));d=ImageDraw.Draw(im)
 for i,(title,xx,yy,xoff) in enumerate([('FRONT | 2D extent',0,1,0),('SIDE | 2D extent',2,1,720)]):
  d.text((xoff+15,12),title,fill='white')
  for idx in range(len(p)):
   v=p[idx];px=int(xoff+355+405*v[xx]);py=int(725-405*v[yy]);
   if not(xoff<=px<xoff+720 and 35<=py<800):continue
   color=(70,82,89)
   if orig[idx]:color=(80,208,208)
   elif add[idx]:color=(253,190,74)
   elif unresolved[idx]:color=(251,70,103)
   d.ellipse((px-1,py-1,px+1,py+1),fill=color)
 d.text((15,795),'CYAN existing seven-hair-bone ownership | AMBER proposed correction | RED unresolved suspected hair still leg-weighted',fill=(244,226,202))
 im.save(out)

def main():
 source,candidate,dest=map(Path,sys.argv[1:4]);dest.mkdir(parents=True,exist_ok=True)
 model=H.Model(source.read_bytes());doc,bb,j,w,ibm=load_derived(candidate.read_bytes(),model)
 original,extra,unresolved,stats=diagnose_and_select(model,j,w)
 print('COVERAGE='+json.dumps(stats),flush=True)
 candidate_raw,nj,nw,added=make_candidate(model,doc,bb,j,w,extra)
 derived=dest/'Heady_v03_10_7_ProvisionalHairCoverage.glb';derived.write_bytes(candidate_raw)
 mask_image(model,original,added,unresolved,dest/'Heady_v03_10_7_HairCoverageMask.png')
 # Strict source-readback + previous hair mask, no other rows changed.
 chk(h(source.read_bytes())==SOURCE_SHA,'SOURCE_MUTATED')
 chk(h(candidate.read_bytes())==PHONE_SHA,'PRIOR_DERIVED_MUTATED')
 chk(np.array_equal(nj[~added],j[~added]) and np.array_equal(nw[~added],w[~added]),'UNRELATED_WEIGHTS_CHANGED')
 legnames=[model.j['nodes'][q]['name'] for q in model.skin['joints']];legids=[i for i,n in enumerate(legnames) if n in H.grow_hair_mask(model)[1]['leg_bones']]
 chk(((np.isin(nj[original|added],legids))*nw[original|added]).sum()<1e-7,'REPAIRED_VERTICES_HAVE_LEG_WEIGHTS')
 render(model,[('ORIGINAL 52',model.j,model.ibms,model.ji,model.w),('PREVIOUS 59',load_derived(candidate.read_bytes(),model)[0],load_derived(candidate.read_bytes(),model)[4],j,w),('NEW 59',doc,ibm,nj,nw)],None,dest/'Heady_v03_10_7_LegMotion_SourceSkinned.gif')
 receipt={'status':'COVERAGE_DIAGNOSTIC_NOT_APPROVED','original_sha':SOURCE_SHA,'prior_derived_sha':PHONE_SHA,'new_sha':h(candidate_raw),'coverage':stats,'warning':'Unresolved red vertices require visual/human classification. No automatic full-hair PASS.'}
 (dest/'Heady_v03_10_7_Receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print('RESULT=COVERAGE_DIAGNOSTIC_READY HUMAN_ACCEPTANCE=PENDING',flush=True)
if __name__=='__main__':main()

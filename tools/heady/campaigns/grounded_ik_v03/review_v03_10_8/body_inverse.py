#!/usr/bin/env python3
"""Heady v03.10.8: bottom-up body-first topology audit, conservative inverse hair candidate."""
import sys,json,hashlib,struct,math,os
from pathlib import Path
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from PIL import Image,ImageDraw,ImageFont
import hair_engine_v03105 as H
import engine
from engine import load_derived,make_candidate
ORIG='8785927ec1e8dd6c5f87eaa966b872bc7ebb42e7cf9a425f11cbbb3ff6a0fb27'
DER=os.getenv('HEADY_TEST_DERIVED_SHA','af063bd3c465b38e161a7ee917097e2a6c1922b0a8cf63e3e135383a38a647dc')
engine.PHONE_SHA=DER
LEGS={'Bone_007','Bone_006','Bone_005','Bone_010','Bone_009','Bone_008','Bone_013','Bone_012','Bone_011','Bone_017','Bone_016','Bone_015','Bone_014','Bone_021','Bone_020','Bone_019','Bone_018','Bone_024','Bone_023','Bone_022'}
def sha(x):return hashlib.sha256(x).hexdigest()
def main():
 source,previous,out=map(Path,sys.argv[1:4]);out.mkdir(exist_ok=True,parents=True)
 assert sha(source.read_bytes())==ORIG,'SOURCE_SHA_DRIFT';assert sha(previous.read_bytes())==DER,'DERIVED_SHA_DRIFT'
 m=H.Model(source.read_bytes());doc,binary,j,w,ibm=load_derived(previous.read_bytes(),m)
 p=m.p;f=m.f;n=len(p);x,y,z=p.T;names=[m.j['nodes'][q]['name'] for q in m.skin['joints']]
 legidx=[i for i,nm in enumerate(names) if nm in LEGS];legweight=(np.isin(j,legidx)*w).sum(axis=1)
 oldhair=np.any((j>=52)&(j<=58)&(w>1.e-8),axis=1)
 # Topologically coherent body-region growth with a synchronized HEIGHT frontier.
 # A single whole-mesh flood would traverse the merged hair-body island, so
 # expansion is gated by morphology and independently grounded protected limb anchors.
 # Never infer that vertices sharing a bone are definitely body.
 col=H.vertex_color(m);r,g,b=col.T
 plum=(r>.13)&(r<.70)&(b>.14)&(b>.46*r)&(b>1.13*g)&(r>1.30*g)&(g<.23)
 posterior=(z<np.interp(y,[0,.45,.85,1.2,1.7],[-.29,-.27,-.18,-.08,-.06]))
 legcore=(legweight>.72)&(~plum|~posterior)&(~oldhair)
 # Body core covers center-front and side appendages; high scalp requires
 # explicitly separate head classification rather than climbing indiscriminately.
 central=(abs(x)<np.interp(y,[0,.45,.9,1.35,1.7],[.17,.27,.28,.22,.22]))&(z>np.interp(y,[0,.6,1.1,1.7],[-.16,-.15,-.21,-.15]))
 front_face=(y>1.12)&(y<1.59)&(z>-.15)&(abs(x)<.24)
 bodyseed=(legcore|central|front_face)&(~oldhair)&(~(plum&posterior))
 # Materialize welded geometric adjacency; export duplicates can separate seams,
 # so weld by quantized rest coordinates, while prohibiting long-distance bridges.
 quant=np.round(p/1.e-5).astype(np.int64)
 _,inverse=np.unique(quant,axis=0,return_inverse=True)
 edges=np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]],axis=0)
 pairs=np.column_stack([inverse[edges[:,0]],inverse[edges[:,1]]]);countuniq=inverse.max()+1
 G=coo_matrix((np.ones(len(pairs)*2,dtype=np.uint8),(np.r_[pairs[:,0],pairs[:,1]],np.r_[pairs[:,1],pairs[:,0]])),shape=(countuniq,countuniq)).tocsr()
 groups,components=connected_components(G,directed=False);component=components[inverse]
 # Synchronized Select More rounds: all seeds at same initial elevation, climb
 # in 0.07-unit height bands, never advancing through purple posterior or hair-owned vertices.
 body=bodyseed.copy();height_edges=np.arange(.0,1.701,.07)
 for ceiling in height_edges:
  allowed=(y<=ceiling+.07)&(~oldhair)&(~(plum&posterior))
  for _ in range(4):
   on=np.bincount(inverse[body],minlength=countuniq)>0
   neighboring=(G@on.astype(np.uint8))>0
   grow=(neighboring[inverse]&allowed)&(~body)
   # No exact-leg-weight filter here: physical connectedness is the main signal.
   if not np.any(grow):break
   body|=grow
 # Entire disconnected body components aren't necessarily reached. Detect likely
 # body leftovers as ambiguous and refuse to assign them to hair by inversion.
 probable_body=(legweight>.4)&(~oldhair)&(~(plum&posterior))
 body|=probable_body
 inverse_mask=~body
 # Conservative anatomical exclusions of disconnected non-hair objects:
 # antenna/headpiece upper sections, clear front/claw material, original torso.
 ambiguity=(inverse_mask&((y>1.47)|(front_face)|(legcore)|((~plum)&(legweight>.24))))
 hair_candidate=(inverse_mask&(~ambiguity)&((plum&posterior)|oldhair))
 unknown=inverse_mask&~hair_candidate
 # Unselected hair-like region with walking-leg influence is main useful output.
 to_reweight=hair_candidate&~oldhair&(legweight>1e-6)
 # New GLB is a PROVISIONAL candidate, not a full hair success.
 revised,j2,w2,added=make_candidate(m,doc,binary,j,w,to_reweight)
 if added.sum():assert np.all((np.isin(j2[added],legidx)*w2[added]).sum(axis=1)<1e-6)
 assert np.array_equal(j2[~added],j[~added]);assert np.array_equal(w2[~added],w[~added])
 glbname='Heady_v03_10_8_BodyInverse_Provisional.glb'
 (out/glbname).write_bytes(revised)
 counts={'total':int(n),'body_seed':int(bodyseed.sum()),'body_mask':int(body.sum()),'inverse_mask':int(inverse_mask.sum()),'existing_hair':int(oldhair.sum()),'candidate_hair':int(hair_candidate.sum()),'candidate_new_leg_weighted':int(to_reweight.sum()),'unknown_inverse':int(unknown.sum()),'ambiguous_inverse':int(ambiguity.sum()),'body_components':int(len(np.unique(component[body]))),'all_components':int(groups),'remaining_leg_weighted':int(np.sum((np.isin(j2,legidx)*w2).sum(axis=1)>1e-6))}
 # Dense, large, four-way classification, front/back/side/oblique projections.
 colors=np.zeros((n,3),dtype=np.uint8)+[70,76,82];colors[body]=[55,189,155];colors[unknown]=[243,179,72];colors[hair_candidate]=[203,74,205];colors[oldhair]=[84,176,232];colors[added]=[250,79,110]
 W,Hh=1600,1160;im=Image.new('RGB',(W,Hh),(10,15,23));d=ImageDraw.Draw(im)
 views=[('FRONT',lambda a:(a[:,0],a[:,1])),('BACK',lambda a:(-a[:,0],a[:,1])),('SIDE',lambda a:(a[:,2],a[:,1])),('OBLIQUE',lambda a:(.66*a[:,0]+.75*a[:,2],a[:,1]))]
 for k,(title,project) in enumerate(views):
  ix=k%2;iy=k//2;xx,yy=project(p);offx=ix*800;offy=iy*570
  d.text((offx+24,offy+18),title+' | BODY FIRST / INVERTED',fill=(240,240,245))
  xy=np.stack([offx+390+xx*395,offy+520-yy*290],axis=1)
  # draw dense points but emphasize exact vertex ownership over unreliable UV projection
  for vi in range(n):
   X,Y=xy[vi];cc=tuple(int(a) for a in colors[vi]);rr=2 if added[vi] or unknown[vi] else 1
   d.ellipse((X-rr,Y-rr,X+rr,Y+rr),fill=cc)
  d.text((offx+24,offy+535),f'BODY={counts["body_mask"]} HAIR_CAND={counts["candidate_hair"]} UNKNOWN={counts["unknown_inverse"]}',fill=(220,215,200))
 d.text((20,1145),'GREEN body | BLUE previously rigged hair | MAGENTA inverted candidate | RED provisional repairs | AMBER unresolved/not safe for weighting',fill=(245,235,208))
 im.save(out/'Heady_v03_10_8_BodyInverse_4Views.png')
 # Separate spatial bands to expose hidden tips; no suggestive claims.
 bands=[]
 for lo in np.arange(0,1.7,.1):
  sel=(y>=lo)&(y<lo+.1);bands.append({'y':round(float(lo),2),'body':int((body&sel).sum()),'hair':int((hair_candidate&sel).sum()),'unknown':int((unknown&sel).sum()),'new':int((added&sel).sum())})
 receipt={'campaign':'v03.10.8','verdict':'BODY_INVERSION_PROVISIONAL_HUMAN_APPROVAL_REQUIRED','source_sha256':ORIG,'derived_input_sha256':DER,'output_sha256':sha(revised),'counts':counts,'height_bands':bands,'disclaimer':'This is a synchronized height-gated body-flood and conservative inverse candidate. Inverted geometry may include disconnected nonhair. No claim that full hair isolation or locomotion physics works.','no_physics':True,'original_unchanged':sha(source.read_bytes())==ORIG,'derived_unchanged':sha(previous.read_bytes())==DER}
 (out/'Heady_v03_10_8_Receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print('RESULT=PROVISIONAL_BODY_INVERSION_VERIFIED',json.dumps(counts),flush=True)
if __name__=='__main__':main()

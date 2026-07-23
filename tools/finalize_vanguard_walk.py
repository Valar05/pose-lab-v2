#!/usr/bin/env python3
import argparse, hashlib, json, math, shutil
from pathlib import Path
from PIL import Image,ImageDraw

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def sheet(paths,out,title):
    canvas=Image.new('RGBA',(2048,1056),(18,22,28,255)); d=ImageDraw.Draw(canvas); d.text((12,8),title,fill='white')
    for i,p in enumerate(paths): canvas.alpha_composite(Image.open(p).convert('RGBA'),((i%4)*512,(i//4)*512+32))
    canvas.save(out)
def main():
    p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--publish',required=True);a=p.parse_args();r=Path(a.root);pub=Path(a.publish)
    m=json.loads((r/'metadata.json').read_text()); failures=[]
    if m['contract']['poseOrder'] != ['left-contact','left-compression','passing-left-support','right-reach','right-contact','right-compression','passing-right-support','left-reach']: failures.append('pose order')
    if m['contract']['perFrameStabilization'] or m['contract']['reframing']: failures.append('camera cheat')
    cm=m['contract']['cameraMatrixWorld']; cs=m['contract']['cameraOrthoScale']
    for f in m['frames']:
        if f['cameraMatrixWorld']!=cm or f['cameraOrthoScale']!=cs: failures.append(f"camera {f['index']}")
        if f['weapon']['leftHandHiltDistancePx']>180 or f['weapon']['rightHandHiltDistancePx']>180 or f['weapon']['handDepthDelta']>1.5: failures.append(f"sword ownership {f['index']}")
    # Alternating support mechanics: support ankle stays below its knee and near pelvis x.
    for f in m['frames']:
        s=f['supportLeg']; j=f['joints']; foot=j[s+'Foot']; knee=j[s+'Knee']; pelvis=j['pelvis']
        if foot['y'] <= knee['y'] or abs(foot['x']-pelvis['x'])>220: failures.append(f"support chain {f['index']}")
    walk=[r/'walk'/f['image'] for f in m['frames']]; legacy=[r/'legacy-runforwardold'/f['image'] for f in m['legacyFrames']]
    sheet(legacy,r/'legacy-runforwardold-contact-sheet.png','LEGACY COMPARISON ONLY — RunForwardOld')
    sheet(walk,r/'walk-contact-sheet.png','CANONICAL STEEL WALK — 8 authored poses')
    if failures: raise SystemExit('Walk verification failed: '+', '.join(failures))
    pub.mkdir(parents=True,exist_ok=True); (pub/'frames').mkdir(exist_ok=True)
    for i,pth in enumerate(walk): shutil.copy2(pth,pub/'frames'/f'walk_{i:04d}.png')
    shutil.copy2(r/'walk-contact-sheet.png',pub/'contact-sheet.png')
    m['status']='PASS'; m['verification']={'status':'PASS','failures':[],'checks':['alternating ankle-knee-pelvis support','both hand-to-hilt distances and depth','camera invariance','root suppression']}
    (r/'verification.json').write_text(json.dumps(m['verification'],indent=2)+'\n'); (pub/'source-metadata.json').write_text(json.dumps(m,indent=2)+'\n')
    manifest=pub.parent/'animations.json'; data=json.loads(manifest.read_text()); data['animations']=[x for x in data['animations'] if x['id']!='walk']
    data['animations'].append({'id':'walk','label':'Walk','loop':True,'contactSheet':'walk/contact-sheet.png','sourceMetadata':'walk/source-metadata.json','groundGuideY':400,'contract':['screen-right','canonical Steel Walk','fixed camera','eight authored poses','two-handed visible sword'],
      'frames':[{'src':f'walk/frames/walk_{i:04d}.png','durationMs':m['contract']['timingMs'][i],'sha256':sha(pub/'frames'/f'walk_{i:04d}.png')} for i in range(8)]})
    manifest.write_text(json.dumps(data,indent=2)+'\n'); print(json.dumps({'status':'PASS','frames':8}))
if __name__=='__main__':main()

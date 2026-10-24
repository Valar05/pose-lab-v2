from collections import deque
from pathlib import Path
from PIL import Image
import hashlib,json
R=Path(__file__).resolve().parents[2]
src=R/'public/assets/connie/connie-approved-composite.png'
assert hashlib.sha256(src.read_bytes()).hexdigest()=='1862aaa232426324cb9c698c878411922b7e8bcd649ff042dd5a8a870265abe3'
rects={'idle':(10,95,310,500),'run_1':(360,110,750,490),'run_2':(745,110,1110,490),'run_3':(1110,110,1520,490),'aerial_1':(270,585,585,905),'aerial_2':(595,585,950,895),'aerial_3':(950,595,1280,900),'spin_1':(250,950,635,1270),'spin_2':(630,930,975,1250),'spin_3':(965,900,1295,1220)}
im=Image.open(src).convert('RGBA');out=R/'public/assets/connie/frames';out.mkdir(exist_ok=True);ledger={}
for name,rect in rects.items():
 f=im.crop(rect);w,h=f.size;p=f.load();seen=bytearray(w*h);q=deque()
 def visit(x,y):
  i=y*w+x
  if seen[i]:return
  seen[i]=1
  if max(p[x,y][:3])<=28:q.append((x,y))
 for x in range(w):visit(x,0);visit(x,h-1)
 for y in range(h):visit(0,y);visit(w-1,y)
 n=0
 while q:
  x,y=q.popleft();r,g,b,a=p[x,y];p[x,y]=(r,g,b,0);n+=1
  if x:visit(x-1,y)
  if x+1<w:visit(x+1,y)
  if y:visit(x,y-1)
  if y+1<h:visit(x,y+1)
 path=out/(name+'.png');f.save(path,optimize=True)
 ledger[name]={'rect':rect,'removedExteriorDarkPixels':n,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
(out/'segmentation-ledger.json').write_text(json.dumps({'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'method':'exterior connected RGB max 28, no interior key','status':'quarantined pending visual review','frames':ledger},indent=2))
print('EXTRACTED',len(ledger),'frames')

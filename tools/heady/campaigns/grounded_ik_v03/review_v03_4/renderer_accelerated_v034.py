"""Numba-accelerated *pixel-equivalent* rasterization of prior Heady renderer.
The source GLB's original materials, textures, cameras, and skin output are used.
Only visualization performance changes; provenance isn't a skin or pose edit.
"""
import numpy as np
from PIL import Image
from numba import njit
@njit(cache=True)
def draw(screen, zbuf, sx, sy, sz, xyz, uv, triangles, tex):
 H,W=screen.shape[:2];th,tw=tex.shape[:2]
 for fi in range(triangles.shape[0]):
  a=int(triangles[fi,0]);b=int(triangles[fi,1]);c=int(triangles[fi,2])
  x0=sx[a];y0=sy[a];x1=sx[b];y1=sy[b];x2=sx[c];y2=sy[c]
  xmin=max(0,int(np.floor(min(x0,x1,x2))));xmax=min(W-1,int(np.ceil(max(x0,x1,x2))))
  ymin=max(0,int(np.floor(min(y0,y1,y2))));ymax=min(H-1,int(np.ceil(max(y0,y1,y2))))
  if xmin>xmax or ymin>ymax:continue
  area=(x1-x0)*(y2-y0)-(y1-y0)*(x2-x0)
  if abs(area)<1e-8:continue
  ab=xyz[b]-xyz[a];ac=xyz[c]-xyz[a]
  nx=ab[1]*ac[2]-ab[2]*ac[1];ny=ab[2]*ac[0]-ab[0]*ac[2];nz=ab[0]*ac[1]-ab[1]*ac[0]
  norm=np.sqrt(nx*nx+ny*ny+nz*nz)
  shade=.78+.22*abs(nx*.3+ny*.7+nz*.6)/(norm if norm>1e-10 else 1.0)
  txa=min(max(uv[a,0]*(tw-1),0),tw-1);txb=min(max(uv[b,0]*(tw-1),0),tw-1);txc=min(max(uv[c,0]*(tw-1),0),tw-1)
  tya=min(max(uv[a,1]*(th-1),0),th-1);tyb=min(max(uv[b,1]*(th-1),0),th-1);tyc=min(max(uv[c,1]*(th-1),0),th-1)
  for py in range(ymin,ymax+1):
   for px in range(xmin,xmax+1):
    wb=((px-x0)*(y2-y0)-(py-y0)*(x2-x0))/area
    wc=((x1-x0)*(py-y0)-(y1-y0)*(px-x0))/area
    wa=1-wb-wc
    if wa< -1e-7 or wb < -1e-7 or wc < -1e-7:continue
    depth=wa*sz[a]+wb*sz[b]+wc*sz[c]
    if depth>=zbuf[py,px]:continue
    u=int(np.rint(wa*txa+wb*txb+wc*txc));v=int(np.rint(wa*tya+wb*tyb+wc*tyc))
    u=max(0,min(tw-1,u));v=max(0,min(th-1,v))
    for k in range(3):screen[py,px,k]=np.uint8(min(255,max(0,tex[v,u,k]*shade)))
    zbuf[py,px]=depth
 return screen

def raster(points,uv,faces,tex,eye,focus,scale,width,height):
 eye=np.asarray(eye,float);focus=np.asarray(focus,float);direction=focus-eye;direction/=np.linalg.norm(direction)
 right=np.cross(direction,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,direction)
 dp=points-focus;sx=dp@right*scale+width/2;sy=height/2-dp@up*scale;sz=dp@direction
 rgb=np.full((height,width,3),[14,18,20],np.uint8);z=np.full((height,width),np.inf)
 return Image.fromarray(draw(rgb,z,sx,sy,sz,np.asarray(points,np.float64),np.asarray(uv,np.float64),np.asarray(faces,np.int64),np.asarray(tex,np.uint8)))

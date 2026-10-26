#!/usr/bin/env python3
"""Pixel-derived proximal rear-facing Panzer barrel rim, fail closed.

Only direction 4 has a feature-specific fitted contour in this campaign.
Neither a SAM silhouette overlap nor another view's collar is a measurement.
"""
import argparse, hashlib, json, math
from pathlib import Path
import cv2, numpy as np
from PIL import Image

ap=argparse.ArgumentParser()
ap.add_argument("--source",required=True)
ap.add_argument("--output",required=True)
a=ap.parse_args()
src=Path(a.source)
out=Path(a.output)
out.mkdir(parents=True,exist_ok=True)
sha=hashlib.sha256(src.read_bytes()).hexdigest()
assert sha=="42026fafbbc61da3030cc03b8ad439f4140c60f096677f856b723d51ee33aa72","Source image changed"
rgba=np.asarray(Image.open(src).convert("RGBA"))
assert tuple(rgba.shape[:2])==(1086,1448),"Dimensions changed"
gray=cv2.cvtColor(rgba[:,:,:3],cv2.COLOR_RGB2GRAY)
edge=cv2.Canny(cv2.GaussianBlur(gray,(5,5),1.0),40,120)
cx,cy,rx,ry=399,715,44,42  # only search-window parameters, NOT output center
ys,xs=np.where(edge[cy-65:cy+65,cx-65:cx+65]>0)
xs=xs+cx-65;ys=ys+cy-65
r=np.sqrt(((xs-cx)/rx)**2+((ys-cy)/ry)**2)
theta=np.arctan2((ys-cy)/ry,(xs-cx)/rx)
pixels=np.column_stack((xs,ys,r,theta))
raw=[]
for k in range(72):
    ang=-math.pi+(k+.5)*2*math.pi/72
    deg=(math.degrees(ang)+360)%360
    if deg<=32 or deg>=328 or 145<=deg<=215:continue  # excluded bolts
    phase=np.abs(np.angle(np.exp(1j*(pixels[:,3]-ang))))
    possible=pixels[(phase<math.pi/72)&(pixels[:,2]>.80)&(pixels[:,2]<1.20)]
    if len(possible):
        best=possible[np.argmin(np.abs(possible[:,2]-1))]
        raw.append([float(best[0]),float(best[1]),k])
points=np.asarray([p[:2] for p in raw],dtype=np.float32)
assert len(points)>=35,"insufficient observed face arc"
fit=cv2.fitEllipse(points)
center=np.asarray(fit[0]);diam=np.asarray(fit[1]);angle=float(fit[2])
rot_ang=math.radians(angle)
co,si=math.cos(rot_ang),math.sin(rot_ang)
rel=points-center
rot=np.stack([co*rel[:,0]+si*rel[:,1],-si*rel[:,0]+co*rel[:,1]],axis=1)
resid=(np.sqrt((rot[:,0]/(diam[0]/2))**2+(rot[:,1]/(diam[1]/2))**2)-1)*float(np.mean(diam)/2)
rms=float(np.sqrt(np.mean(resid**2)))
rng=np.random.default_rng(20261026)
boots=[]
for _ in range(350):
    try:boots.append(cv2.fitEllipse(points[rng.integers(0,len(points),len(points))])[0])
    except cv2.error:pass
ci=np.percentile(np.asarray(boots),[2.5,97.5],axis=0)
assert rms<5 and np.max(ci[1]-ci[0])<7,"geometric residual/CI threshold failed"
# Independent silhouette-axis test: row-wise observed shaft edges, not a guessed axis.
rows=[]
for y in range(605,646):
    opaque=np.flatnonzero(rgba[y,350:450,3]>180)+350
    if len(opaque)>=35:
        left,right=int(opaque.min()),int(opaque.max())
        rows.append([y,left,right,(left+right)/2])
assert len(rows)>=35,"insufficient shaft edge support"
yy=np.asarray([v[0] for v in rows],float)
xx=np.asarray([v[3] for v in rows],float)
slope,intercept=np.polyfit(yy,xx,1)
shaft_at_face=float(slope*center[1]+intercept)
axis_face_dx=float(shaft_at_face-center[0])
axis_residual=float(np.sqrt(np.mean((xx-(slope*yy+intercept))**2)))

payload={
 "schema":"panzer-proximal-pixel-contour-v1","source_sha256":sha,"image_size":[1448,1086],
 "view_id":4,"direction":"rear","feature":"visible rear-facing proximal end plate RIM only",
 "semantic_evidence":"Manual identification of correct end plate; edge sample locations found algorithmically from original pixels",
 "search_window_center_not_a_measurement":[cx,cy],"search_window_radii_not_a_measurement":[rx,ry],
 "method":"GaussianBlur(5x5,1.0),Canny(40,120),72 radial bins,annulus .8..1.2; exclude bolt sectors [328,32] and [145,215];cv2.fitEllipse",
 "observed_support_points_xy":points.astype(int).tolist(),"edge_bin_ids":[p[2] for p in raw],
 "center_native_xy":center.tolist(),"local_to_alpha_region_xy":(center-[337,568]).tolist(),
 "ellipse_full_axes_px":diam.tolist(),"angle_deg":angle,
 "rms_radial_residual_px":rms,
 "observed_shaft_scanlines_y_left_right_midpoint":rows,
 "shaft_axis_x_as_function_of_y":{"slope":float(slope),"intercept":float(intercept),"rms_px":axis_residual},
 "shaft_axis_x_at_face_y":shaft_at_face,"axis_minus_face_x_px":axis_face_dx,"bootstrap_center_CI95_native_xy":[ci[0].tolist(),ci[1].tolist()],
 "bootstrap_seed":20261026,"bootstrap_resamples":350,
 "status":"FACE_CONTOUR_MEASURED; PIVOT_REJECTED: INDEPENDENT SHAFT AXIS DISAGREES",
 "other_views":"BLOCKED: root face hidden or face arc contaminated by bolts/collar",
 "runtime_transform":"BLOCKED: existing 2x4 slicer cuts through source image for indices 0,1,2,6"
}
(out/"rear_face_measurement.json").write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8")
print("REAR_FACE_PIXEL_MEASUREMENT="+json.dumps({"center":center.tolist(),"support_count":len(points),"rms":rms}))

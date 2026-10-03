"""Assemble overlapping, geographically constrained ImageGen atlas sections."""
from pathlib import Path
import sys,json
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'qa/pydeps'))
import numpy as np
import cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
D=ROOT/'qa/painted-atlas'
spec=json.loads((D/'tiles.json').read_text())
# Output at the approximate aggregate native generated resolution.
scale=0.45;w=round(spec['width']*scale);h=round(spec['height']*scale)
total=np.zeros((h,w,3),np.float32);weights=np.zeros((h,w),np.float32);checks=[]
for tile in spec['tiles']:
    path=D/(tile['id']+'-painted.png')
    if not path.exists():raise FileNotFoundError(path)
    tile['output']=path.name
    x0,y0,x1,y1=[round(v*scale) for v in tile['bounds']];cw,ch=x1-x0,y1-y0
    painted=Image.open(path).convert('RGB').resize((cw,ch),Image.Resampling.LANCZOS)
    arr=np.array(painted).astype(np.float32)
    # A single, mild palette adjustment per tile avoids visible exposure steps.
    guide=np.array(Image.open(D/tile['guide']).convert('RGB').resize((cw,ch))).astype(np.float32)
    arr=np.clip(arr+(guide.mean((0,1))-arr.mean((0,1)))*0.55,0,255)
    xx=np.arange(cw);yy=np.arange(ch);r=max(1,round(spec['overlap']*scale*2))
    wx=np.ones(cw);wy=np.ones(ch)
    if x0:wx*=np.clip(xx/r,0,1)
    if x1<w:wx*=np.clip((cw-1-xx)/r,0,1)
    if y0:wy*=np.clip(yy/r,0,1)
    if y1<h:wy*=np.clip((ch-1-yy)/r,0,1)
    weight=wy[:,None]*wx[None,:]
    total[y0:y1,x0:x1]+=arr*weight[:,:,None];weights[y0:y1,x0:x1]+=weight
    geom=np.array(Image.open(D/tile['geometry']).convert('RGB').resize((cw,ch))).astype(np.int16)
    water=(geom[:,:,2]>geom[:,:,0]+20)&(geom[:,:,2]>geom[:,:,1])
    pwater=(arr[:,:,2]>arr[:,:,0]+20)&(arr[:,:,2]>arr[:,:,1])
    edge=cv2.morphologyEx(water.astype(np.uint8),cv2.MORPH_GRADIENT,np.ones((3,3),np.uint8))>0
    pedge=cv2.morphologyEx(pwater.astype(np.uint8),cv2.MORPH_GRADIENT,np.ones((3,3),np.uint8))>0
    dist=cv2.distanceTransform((~pedge).astype(np.uint8),cv2.DIST_L2,3)
    checks.append(dict(id=tile['id'],waterIoU=float((water&pwater).sum()/max(1,(water|pwater).sum())),coastDistance95Pixels=float(np.percentile(dist[edge],95)) if edge.any() else None))
assert weights.min()>0
out=Image.fromarray(np.clip(total/weights[:,:,None],0,255).astype(np.uint8))
out.save(D/'faerun-painted-assembled.png')
out.thumbnail((2200,2200));out.save(D/'faerun-painted-preview.jpg',quality=92)
(D/'tiles.json').write_text(json.dumps(spec,indent=2))
(D/'geometry-checks.json').write_text(json.dumps(dict(width=w,height=h,checks=checks),indent=2))
print(json.dumps(dict(width=w,height=h,checks=checks),indent=2))

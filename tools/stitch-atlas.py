"""Register overlapping generated tiles, choose terrain seams, and restore original Thay."""
from pathlib import Path
import sys,json
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'qa/pydeps'))
import numpy as np
import cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
D=ROOT/'qa/continuous-atlas';plan=json.loads((D/'mosaic-plan.json').read_text());W,H=plan['width'],plan['height']
from atlas_registration import water,registration
def cut(cost):
    h,w=cost.shape;back=np.zeros((h,w),np.int16);last=cost[0].copy()
    for y in range(1,h):
        choices=np.stack([np.r_[np.inf,last[:-1]],last,np.r_[last[1:],np.inf]])
        step=choices.argmin(axis=0);back[y]=step-1;last=cost[y]+choices[step,np.arange(w)]
    x=int(last.argmin());path=np.empty(h,np.int32)
    for y in range(h-1,-1,-1):path[y]=x;x+=int(back[y,x])
    return path
def seam_cost(a,b):
    a=cv2.GaussianBlur(a,(0,0),1.5).astype(np.float32);b=cv2.GaussianBlur(b,(0,0),1.5).astype(np.float32)
    return np.mean(np.abs(a-b),axis=2)+.1
missing=[j['id'] for j in plan['tiles'] if not (D/(j['id']+'-final.png')).exists()]
if missing and '--recompose' not in sys.argv:raise SystemExit('Missing production tiles: '+','.join(missing))
canvas=np.array(Image.open(D/('faerun-stitched.png' if '--recompose' in sys.argv else 'faerun-fallback.png')).convert('RGB'));filled=np.zeros((H,W),bool);report=[]
# Ocean-only cells have no generated tile. Give their existing water the same palette.
for y in ([] if '--recompose' in sys.argv else range(0,H,1024)):
    band=canvas[y:y+1024];wa=water(band)>.5
    if wa.any():band[wa]=np.clip(np.array([125,188,222])+(band[wa].astype(np.float32)-np.median(band[wa],axis=0))*.35,0,255).astype(np.uint8)
for job in ([] if '--recompose' in sys.argv else plan['tiles']):
    x0,y0,x1,y1=job['bounds'];w,h=x1-x0,y1-y0
    guide=np.array(Image.open(D/job['guide']).convert('RGB'))
    art=np.array(Image.open(D/(job['id']+'-final.png')).convert('RGB').resize((w,h),Image.Resampling.LANCZOS))
    if job['landFraction']==0 and job['row']!=0:
        # Blank ocean guides can be mistaken for a coast by the generator. Keep only
        # source land/ice silhouettes in these cells, with one shared painted sea.
        texture=Image.open(D/'faerun-00-00-final.png').convert('RGB').crop((0,0,900,650)).resize((w,h),Image.Resampling.LANCZOS)
        base=np.array(texture);g=guide.astype(np.int16)
        land=((g[:,:,0]-g[:,:,2]>12)&(g[:,:,1]-g[:,:,2]>8)).astype(np.uint8)*255
        land=cv2.morphologyEx(land,cv2.MORPH_OPEN,np.ones((7,7),np.uint8))
        land=cv2.morphologyEx(land,cv2.MORPH_CLOSE,np.ones((13,13),np.uint8))
        count,components,stats,_=cv2.connectedComponentsWithStats(land)
        land=np.isin(components,[i for i in range(1,count) if stats[i,cv2.CC_STAT_AREA]>=120]).astype(np.uint8)*255
        land=cv2.dilate(land,np.ones((5,5),np.uint8));alpha_land=cv2.GaussianBlur(land.astype(np.float32)/255,(0,0),1)
        base=np.round(guide*alpha_land[:,:,None]+base*(1-alpha_land[:,:,None])).astype(np.uint8)
        if job['row']<=1:
            ice=((g.min(axis=2)>170)&(g.max(axis=2)-g.min(axis=2)<45)).astype(np.uint8)*255
            ice=cv2.morphologyEx(ice,cv2.MORPH_OPEN,np.ones((9,9),np.uint8));ai=cv2.GaussianBlur(ice.astype(np.float32)/255,(0,0),2)
            ice_art=np.where((art.min(axis=2)>165)[:,:,None],art,guide)
            base=np.round(ice_art*ai[:,:,None]+base*(1-ai[:,:,None])).astype(np.uint8)
        art=base
    art,stats=registration(guide,art)
    # Match the same pale water across every tile, without changing its shoreline.
    wa=water(art)>.5
    if wa.sum()>400:
        target=np.clip(np.array([125,188,222])+(art.astype(np.float32)-np.median(art[wa],axis=0))*.45,0,255)
        weight=cv2.GaussianBlur(wa.astype(np.float32),(0,0),1)
        art=np.round(target*weight[:,:,None]+art*(1-weight[:,:,None])).astype(np.uint8)
    old=canvas[y0:y1,x0:x1];known=filled[y0:y1,x0:x1];mask=np.ones((h,w),np.float32)
    overlap=2*plan['overlap']
    if x0 and known[:,:overlap].mean()>.75:
        cost=seam_cost(old[:,:overlap],art[:,:overlap]);path=cut(cost)
        mask[:,:overlap]*=(np.arange(overlap)[None,:]>=path[:,None])
    if y0 and known[:overlap,:].mean()>.75:
        cost=seam_cost(old[:overlap,:],art[:overlap,:]);path=cut(cost.T)
        mask[:overlap,:]*=(np.arange(overlap)[:,None]>=path[None,:])
    mask=cv2.GaussianBlur(mask,(0,0),5);mask[~known]=1
    old[:]=np.round(art*mask[:,:,None]+old*(1-mask[:,:,None])).astype(np.uint8);known[:]=True
    report.append(dict(id=job['id'],**stats));print(job['id'],round(stats['waterIoUAfter'],3),flush=True)
Image.fromarray(canvas).save(D/'faerun-stitched.png',compress_level=2)
# Protect every geographic pixel of the original map. Correct color outside its edge.
B=plan['bounds'];tb=json.loads((D/'thay-world-bounds.json').read_text());ppd=W/(B['east']-B['west'])
x0=round((tb['west']-B['west'])*ppd);y0=round((B['north']-tb['north'])*ppd)
w=round((tb['east']-tb['west'])*ppd);h=round((tb['north']-tb['south'])*ppd)
t=np.array(Image.open(D/'thay-original-world.png').resize((w,h),Image.Resampling.LANCZOS))
pad=320;xx=max(0,x0-pad);yy=max(0,y0-pad);rw=min(W,x0+w+pad)-xx;rh=min(H,y0+h+pad)-yy
original=np.zeros((rh,rw,4),np.uint8);original[y0-yy:y0-yy+h,x0-xx:x0-xx+w]=t
region=canvas[yy:yy+rh,xx:xx+rw];alpha=original[:,:,3].astype(np.float32)/255;protected=alpha>.95
from scipy.ndimage import distance_transform_edt
distance,indices=distance_transform_edt(~protected,return_indices=True)
smooth_alpha=cv2.GaussianBlur(alpha,(0,0),12)
smooth_source=cv2.GaussianBlur(original[:,:,:3].astype(np.float32)*alpha[:,:,None],(0,0),12)/np.maximum(smooth_alpha[:,:,None],.001)
smooth_base=cv2.GaussianBlur(region,(0,0),12).astype(np.float32)
delta=(smooth_source-smooth_base)[indices[0],indices[1]]
strength=np.clip(1-distance/280,0,1)**2;strength[protected]=0
region[:]=np.clip(region.astype(np.float32)+np.clip(delta,-40,40)*strength[:,:,None],0,255).astype(np.uint8)
# The regional view is pixel-exact. Only the outside frame margin blends in world view.
inside_distance=distance_transform_edt(protected)
edge_alpha=alpha*np.clip(inside_distance/18,0,1)
region[:]=np.round(original[:,:,:3]*edge_alpha[:,:,None]+region*(1-edge_alpha[:,:,None])).astype(np.uint8)
Image.fromarray(canvas).save(D/'faerun-final.png',compress_level=2)
preview=Image.fromarray(canvas);preview.thumbnail((2400,1800));preview.save(D/'faerun-final-preview.jpg',quality=93)
(D/'registration-report.json').write_text(json.dumps(report,indent=2))

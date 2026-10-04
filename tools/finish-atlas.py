"""Join the reviewed Thay surround to the mosaic and retain native source detail."""
from pathlib import Path
import sys,json
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'qa/pydeps'))
import numpy as np
import cv2
from scipy.ndimage import distance_transform_edt
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
D=ROOT/'qa/continuous-atlas'
from atlas_registration import water,registration
canvas=Image.open(D/'faerun-stitched.png').convert('RGB');W,H=canvas.size
anchor_adjustments=[]
for place in json.loads((D/'catalog.json').read_text(encoding='utf-8')):
    if place.get('anchorType')!='printed-marker' or place['kind'] not in ['City','Town']:continue
    px=round((place['lon']+96)/86*W);py=round((64.5-place['lat'])/64.5*H);radius=96
    area=(px-radius,py-radius,px+radius+1,py+radius+1);patch=np.array(canvas.crop(area));wet=water(patch)>.5
    distances,indices=distance_transform_edt(wet,return_indices=True);distance=float(distances[radius,radius])
    if not 6<distance<=30:continue
    dy=float(indices[0,radius,radius]-radius);dx=float(indices[1,radius,radius]-radius)
    # Register the painted coast to the measured source settlement control, keeping
    # the catalog coordinate fixed. Large disagreements require source review.
    scale=(distance+3)/distance;dx*=scale;dy*=scale
    yy,xx=np.mgrid[:patch.shape[0],:patch.shape[1]].astype(np.float32)
    weight=np.exp(-((xx-radius)**2+(yy-radius)**2)/(2*28**2)).astype(np.float32)
    corrected=cv2.remap(patch,xx+dx*weight,yy+dy*weight,cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT)
    canvas.paste(Image.fromarray(corrected),(px-radius,py-radius))
    anchor_adjustments.append({'name':place['name'],'sourceAnchor':[place['lon'],place['lat']],'paintDisplacementPixels':[dx,dy]})
(D/'coastal-registration-controls.json').write_text(json.dumps(anchor_adjustments,indent=2))
box=json.loads((D/'thay-surround-box.json').read_text());x0,y0,x1,y1=box;w,h=x1-x0,y1-y0
guide=np.array(Image.open(D/'thay-surround-edit-v09.png').convert('RGB'))
art=np.array(Image.open(D/'thay-surround-generated-v09.png').convert('RGB').resize((w,h),Image.Resampling.LANCZOS))
art,stats=registration(guide,art)
yy,xx=np.mgrid[:h,:w];outer=np.minimum.reduce([xx,yy,w-1-xx,h-1-yy]);blend=np.clip(outer/110,0,1).astype(np.float32)
old=np.array(canvas.crop(box));joined=np.round(art*blend[:,:,None]+old*(1-blend[:,:,None])).astype(np.uint8)
tb=json.loads((D/'thay-world-bounds.json').read_text());ppd=W/86
tx=round((tb['west']+96)*ppd);ty=round((64.5-tb['north'])*ppd)
tw=round((tb['east']-tb['west'])*ppd);th=round((tb['north']-tb['south'])*ppd)
native=Image.open(D/'thay-clean-world.png').convert('RGBA')
native_alpha=np.array(native.getchannel('A'));distance=distance_transform_edt(native_alpha>240)
feather=18*native.width/tw;native.putalpha(Image.fromarray(np.round(native_alpha*np.clip(distance/feather,0,1)).astype(np.uint8)))
native.save(D/'thay-world-joined.png',compress_level=2)
original=native.resize((tw,th),Image.Resampling.LANCZOS);patch=Image.fromarray(joined).convert('RGBA');patch.alpha_composite(original,(tx-x0,ty-y0));canvas.paste(patch.convert('RGB'),(x0,y0))
# Bake the outer transition once. The renderer never switches to another artwork.
out=canvas.convert('RGBA');alpha=Image.new('L',(W,H),255);a=np.array(alpha)
for y in range(H):
    edge=np.minimum(np.minimum(np.arange(W),np.arange(W)[::-1]),min(y,H-1-y))
    a[y]=np.round(np.clip(edge/96,0,1)*255).astype(np.uint8)
out.putalpha(Image.fromarray(a));out.save(D/'faerun-final.png',compress_level=2)
preview=canvas.copy();preview.thumbnail((2400,1800));preview.save(D/'faerun-final-preview.jpg',quality=94)
(D/'thay-surround-registration.json').write_text(json.dumps(stats,indent=2))
for name,lon,lat,size in [('north',-80,55,2000),('Waterdeep',-73.623744,44.93488,1600),('Thay-north',-37,39.3,1800),('Thay-west',-41.3,35,1800),('Thay-south',-37,30,1800),('Thay-east',-32.7,35,1800),('south-sword-coast',-68,28.9,1800)]:
    x=(lon+96)*ppd;y=(64.5-lat)*ppd;crop=canvas.crop((round(x-size/2),round(y-size/2),round(x+size/2),round(y+size/2)));crop.thumbnail((1600,1600));crop.save(D/(name+'-join-review.jpg'),quality=94)
print(json.dumps(stats))

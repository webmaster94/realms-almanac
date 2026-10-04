"""Register recovered native Thay terrain and source PDF labels with one affine."""
from pathlib import Path
import json,sys,hashlib
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'qa/pydeps'))
import numpy as np
import cv2
from PIL import Image,ImageDraw
Image.MAX_IMAGE_PIXELS=None
D=ROOT/'qa/continuous-atlas';A=ROOT/'qa/thay-audit'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
affine=np.array(read(A/'affine-recommendation.json')['formula'])
source=ROOT/'qa/raster-sources/thay-clean-final.png';native=Image.open(source).convert('RGBA');w,h=native.size
corners=np.array([[0,0,1],[w,0,1],[w,h,1],[0,h,1]])@affine.T
west,south=corners.min(axis=0);east,north=corners.max(axis=0);ow=7200;oh=round(ow*(north-south)/(east-west))
matrix=affine.copy();matrix[0]*=ow/(east-west);matrix[1]*=-oh/(north-south)
matrix[0,2]-=west*ow/(east-west);matrix[1,2]+=north*oh/(north-south)
# Calibration uses image-edge coordinates; OpenCV indexes pixel centers at integers.
matrix[:,2]+=matrix[:,:2]@np.array([.5,.5])-.5
mask=Image.new('L',(w,h),0);draw=ImageDraw.Draw(mask);draw.rectangle((75,75,w-75,h-75),fill=255)
# Retain the established world footprint; its title corner never had geographic evidence.
draw.rectangle((5610,40,7160,900),fill=0);native.putalpha(mask)
warped=cv2.warpAffine(np.array(native),matrix,(ow,oh),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT)
Image.fromarray(warped).save(D/'thay-clean-world.png',compress_level=2)
(D/'thay-world-bounds.json').write_text(json.dumps(dict(west=west,east=east,south=south,north=north)),encoding='utf-8')
regional=[];world=[]
for p in read(A/'native-labels.json')['labels']:
    kind='River' if p['kind']=='Water' and p['name'].startswith(('R.','River ')) else p['kind']
    fs=p['fontSize'];rank=0 if kind=='City' else 1 if kind in ['Water','Region'] and fs>=8 else 2 if kind=='Town' else 3 if kind in ['Water','River','Region'] else 4
    zoom=1 if kind=='City' else 1.4 if kind in ['Water','Region'] and fs>=8 else 2.5 if kind=='Town' else 3 if kind in ['Water','River','Region'] else 4.5
    keep=['id','name','x','y','preciseMarker','anchorType','nameConfidence','reviewStatus','provenance']
    q={k:p[k] for k in keep if k in p};q.update(kind=kind,rank=rank,minZoom=zoom)
    ll=affine@np.array([p['x'],p['y'],1]);q.update(lon=float(ll[0]),lat=float(ll[1]))
    regional.append(q)
    world_zoom=8 if kind=='City' else 12 if kind in ['Water','Region'] and fs>=8 else 20 if kind in ['Town','Water','River','Region'] else 40
    world.append(dict(q,minZoom=world_zoom,sourceRegion='thay',sourceNativeId=p['id']))
settlement_names={p['name'] for p in regional if p['kind'] in ['City','Town','Village']}
for p in regional:
    if p['kind']=='Region' and p['name'] in settlement_names:p['searchOnly']=True
cal=dict(name='Thay',width=w,height=h,affine=affine.flatten().tolist(),labels=[p for p in world if p.get('preciseMarker')],registration='Single least-squares source affine. Native terrain and settlement coordinates remain in their original image frame.',sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest())
for name,value in [('thay-calibration-affine.json',cal),('thay-native-labels.json',regional),('thay-world-labels.json',world)]:
    (D/name).write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'size':[ow,oh],'regionalLabels':len(regional),'worldLabels':len(world),'calibrationMarkers':len(cal['labels']),'affine':cal['affine']}))

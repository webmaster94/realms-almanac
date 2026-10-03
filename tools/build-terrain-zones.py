"""Vector terrain areas for the illustrated atlas's close zooms."""
from pathlib import Path
import sys,json
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'qa/pydeps'))
import numpy as np
import contourpy
from scipy.ndimage import gaussian_filter,maximum_filter
from PIL import Image,ImageDraw
from shapely.geometry import Polygon
Image.MAX_IMAGE_PIXELS=None
W,H=2048,1024
e=np.asarray(Image.open(ROOT/'qa/gis/dem_v3.tif').resize((W,H),Image.Resampling.BILINEAR),dtype=np.float32).copy();e[e<0]=0
dy,dx=np.gradient(gaussian_filter(e,1));slope=maximum_filter(np.hypot(dx,dy),size=5)
zones=gaussian_filter(((e>900)&(slope>20)).astype(np.float32),.8)
def paint_mask(image,geometry,fill):
    d=ImageDraw.Draw(image);polys=geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]
    for poly in polys:
        for i,ring in enumerate(poly):d.polygon([((p[0]+180)/360*W,(90-p[1])/180*H) for p in ring],fill=fill if i==0 else 0)
water=Image.new('L',(W,H))
for f in json.loads((ROOT/'qa/gis/srf_nat_lakes_pg.geojson').read_text(encoding='utf-8'))['features']:paint_mask(water,f['geometry'],255)
zones[np.asarray(water)>0]=0
ice=Image.new('L',(W,H))
cover=json.loads((ROOT/'qa/gis/srf_nat_land_cover_pg.geojson').read_text(encoding='utf-8'))['features']
for f in cover:
    if f['properties']['feature_class']=='Ice Sheet':paint_mask(ice,f['geometry'],255)
for f in json.loads((ROOT/'qa/gis/srf_nat_land_pg.geojson').read_text(encoding='utf-8'))['features']:
    if f['properties']['feature_class']=='Floating Ice':paint_mask(ice,f['geometry'],255)
zones[np.asarray(ice)>0]=0
generator=contourpy.contour_generator(z=zones,fill_type='OuterOffset')
points,offsets=generator.filled(.45,2)
result=[]
for p,o in zip(points,offsets):
    rings=[]
    for a,b in zip(o[:-1],o[1:]):
        raw=p[a:b];g=Polygon(raw).simplify(.45,preserve_topology=True)
        if g.is_empty or g.geom_type!='Polygon' or g.area<1:continue
        rings.append([[round(x/W*360-180,4),round(90-y/H*180,4)] for x,y in g.exterior.coords])
    if rings:result.append(rings)
out=ROOT/'assets/toril/cartography.json';data=json.loads(out.read_text(encoding='utf-8'));data['mountains']=result
forest=Image.new('L',(W,H))
for f in cover:
    if 'Forest' in f['properties']['feature_class']:paint_mask(forest,f['geometry'],255)
fm=np.asarray(forest);rng=np.random.default_rng(881);mountains=[];woods=[]
for row,y in enumerate(range(2,H-2,3)):
    for col,x in enumerate(range(2,W-2,3)):
        xx=x+int(rng.integers(-1,2));yy=y+int(rng.integers(-1,2));lon=round(xx/W*360-180,4);lat=round(90-yy/H*180,4)
        if zones[yy,xx]>.6:mountains.append([lon,lat,int(e[yy,xx]),row,col])
        if fm[yy,xx]>180:woods.append([lon,lat,int(rng.integers(0,4)),row,col])
data['mountainAnchors']=mountains;data['forestAnchors']=woods
out.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'{len(result)} vector mountain areas, {len(mountains)} mountain anchors, {len(woods)} woodland anchors')

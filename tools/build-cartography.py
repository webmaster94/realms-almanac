"""Bake an illustrated atlas from the pinned Toril GIS, plus terrain anchors.
Requires Pillow, numpy, scipy and shapely. No new geographic features are invented.
"""
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'qa/pydeps'))
import numpy as np
from scipy.ndimage import distance_transform_edt,gaussian_filter,maximum_filter
from shapely.geometry import shape
from PIL import Image,ImageDraw,ImageFilter
Image.MAX_IMAGE_PIXELS=None
SRC=ROOT/'qa/gis';OUT=ROOT/'assets/toril';TILES=OUT/'tiles';TILES.mkdir(exist_ok=True)
W,H=8192,4096
def load(name):return json.loads((SRC/(name+'.geojson')).read_text(encoding='utf-8'))['features']
def xy(p):return ((p[0]+180)/360*W,(90-p[1])/180*H)
def rings(g):return g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
def paint(draw,g,fill,hole=None):
    for poly in rings(g):
        for i,ring in enumerate(poly):draw.polygon([xy(p) for p in ring],fill=fill if i==0 else hole if hole is not None else fill)
land=load('srf_nat_land_pg');cover=load('srf_nat_land_cover_pg')
mask=Image.new('L',(W,H));md=ImageDraw.Draw(mask)
for f in land:paint(md,f['geometry'],255,0)
lat=np.abs(np.linspace(90,-90,H,dtype=np.float32))[:,None,None];arid=np.exp(-((lat-25)/13)**2)*.7
base=np.array([173,184,130])*(1-arid)+np.array([220,199,145])*arid
base=np.broadcast_to(base,(H,W,3)).astype(np.uint8).copy();base[lat[:,0,0]>62]=[183,199,174]
terrain=Image.fromarray(base);del base;td=ImageDraw.Draw(terrain)
forest=Image.new('L',(W,H));fd=ImageDraw.Draw(forest)
palette={'Tropical Forest':(102,135,88),'Temperate Forest':(126,145,99),'Boreal Forest':(134,156,132),'Swamp':(125,154,134),'Marsh':(140,162,138),'Wetland':(130,156,133),'Ricefield':(165,178,111),'Sand':(224,196,139),'Glacier':(224,235,223),'Ice Sheet':(232,237,226),'Blackened Earth':(131,116,94)}
for f in cover:
    kind=f['properties']['feature_class'];paint(td,f['geometry'],palette.get(kind,(180,182,129)))
    if 'Forest' in kind:paint(fd,f['geometry'],255,0)
for f in land:
    if f['properties']['feature_class']=='Floating Ice':paint(td,f['geometry'],(218,232,225))
print('Geography rasterized',flush=True)
dem=np.asarray(Image.open(SRC/'dem_v3.tif').resize((W,H),Image.Resampling.BILINEAR),dtype=np.float32).copy();dem[dem<0]=0
smooth=gaussian_filter(dem,1.2);gy,gx=np.gradient(smooth);shade=np.clip(1+(-gx+gy)*.002,.66,1.2)
small=np.asarray(mask.resize((2048,1024)))>127
distance=distance_transform_edt(~small).astype(np.float32)
distance=np.asarray(Image.fromarray(distance).resize((W,H),Image.Resampling.BILINEAR),dtype=np.float32)*4
rng=np.random.default_rng(75431)
grain=Image.fromarray(rng.integers(0,255,(512,1024),dtype=np.uint8)).resize((W,H),Image.Resampling.BICUBIC)
coarse=Image.fromarray(rng.integers(0,255,(64,128),dtype=np.uint8)).resize((W,H),Image.Resampling.BICUBIC)
result=Image.new('RGB',(W,H));landPixels=np.asarray(mask);ink=np.asarray(terrain);texture=np.asarray(grain);broad=np.asarray(coarse)
for row in range(0,H,128):
    sl=slice(row,min(H,row+128));elev=dem[sl];s=shade[sl];m=landPixels[sl]>127
    rgb=ink[sl].astype(np.float32);high=np.clip((elev-900)/5500,0,.78)[...,None]
    rgb=rgb*(1-high)+np.array([163,151,126],dtype=np.float32)*high
    snow=np.clip((elev-5100)/2600,0,.92)[...,None];rgb=rgb*(1-snow)+np.array([237,233,210])*snow
    rgb*=s[...,None];rgb*=.94+texture[sl][...,None]/255*.09+broad[sl][...,None]/255*.045
    d=distance[sl];near=np.exp(-d/20)[...,None]
    sea=np.broadcast_to(np.array([36,84,112],dtype=np.float32),rgb.shape).copy();sea=sea*(1-near)+np.array([95,151,163])*near
    # Fine cartographic depth rings, not an asserted bathymetric survey.
    bands=np.zeros_like(d)
    for depth in [5,12,23,40,65]:bands+=np.exp(-((d-depth)/.75)**2)
    sea+=bands[...,None]*12;sea*=.94+texture[sl][...,None]/255*.08+broad[sl][...,None]/255*.08
    rgb[~m]=sea[~m];result.paste(Image.fromarray(np.clip(rgb,0,255).astype(np.uint8)),(0,row))
print('Terrain and coastal shelves shaded',flush=True)
draw=ImageDraw.Draw(result)
for f in land:
    for poly in rings(f['geometry']):
        for ring in poly:draw.line([xy(p) for p in ring],fill=(59,79,64),width=2)
for f in load('srf_nat_lakes_pg'):
    paint(draw,f['geometry'],(79,135,157))
    for poly in rings(f['geometry']):
        for ring in poly:draw.line([xy(p) for p in ring],fill=(58,98,112),width=1)
for f in load('srf_nat_rivers_ln'):
    g=f['geometry'];lines=g['coordinates'] if g['type']=='MultiLineString' else [g['coordinates']]
    for line in lines:
        if len(line)>1:draw.line([xy(p) for p in line],fill=(73,122,144),width=1)
result.resize((4096,2048),Image.Resampling.LANCZOS).save(OUT/'cartography.webp',quality=93,method=6)
# Only detailed tiles inside the viewport need to be decoded by the browser.
for y in range(H//512):
    for x in range(W//512):result.crop((x*512,y*512,(x+1)*512,(y+1)*512)).save(TILES/f'{x}-{y}.webp',quality=93,method=4)
print('Atlas image and 128 detail tiles written',flush=True)
continents=[]
for f in land:
    p=f['properties'];name=p.get('name_en','')
    if p['feature_class']!='Continent' or not name or name=='unnamed':continue
    g=shape(f['geometry']);point=g.representative_point();b=g.bounds
    continents.append({'name':name,'lat':round(point.y,4),'lon':round(point.x,4),'bounds':dict(zip(['west','south','east','north'],[round(v,4) for v in b]))})
e=np.asarray(Image.fromarray(dem).resize((2048,1024)),dtype=np.float32);jitter=rng.random(e.shape)*.01
maxima=(e+jitter)==maximum_filter(e+jitter,size=7);ys,xs=np.where(maxima&(e>1000));peaks=[]
for y,x in zip(ys,xs):peaks.append([round(x/2048*360-180,4),round(90-y/1024*180,4),int(e[y,x])])
fm=np.asarray(forest.resize((2048,1024)));trees=[]
for y in range(2,1022,5):
    for x in range(2,2046,5):
        xx=x+int(rng.integers(-2,3));yy=y+int(rng.integers(-2,3))
        if fm[yy,xx]>180:trees.append([round(xx/2048*360-180,4),round(90-yy/1024*180,4),int(rng.integers(0,4))])
data={'width':W,'height':H,'tileSize':512,'continents':continents,'peaks':peaks,'forests':trees,'oceans':[
 {'name':'Trackless Sea','lat':21,'lon':-86},{'name':'Great Sea','lat':-18,'lon':-35},{'name':'Eastern Sea','lat':9,'lon':78},{'name':'Western Ocean','lat':-13,'lon':163},{'name':'Southern Ocean','lat':-66,'lon':0}]}
(OUT/'cartography.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'{len(peaks)} terrain peaks, {len(trees)} forest anchors, {len(continents)} continents',flush=True)

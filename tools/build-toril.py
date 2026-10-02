"""Render Toril GIS into an attributed globe texture and zoomable atlas data.
Input: downloaded snapshot files in qa/gis; output: assets/toril.
Requires Pillow and numpy. Coordinates retain the dataset's FRIA meridian.
"""
from pathlib import Path
import json,sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'qa/pydeps'))
from shapely.geometry import shape
SRC=ROOT/'qa/gis'; OUT=ROOT/'assets/toril'; OUT.mkdir(parents=True,exist_ok=True)
W,H=4096,2048
def load(name): return json.loads((SRC/(name+'.geojson')).read_text(encoding='utf-8'))['features']
def xy(point): return ((point[0]+180)/360*W,(90-point[1])/180*H)
def polygon(draw,geometry,fill,hole=None):
    polygons=geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]
    for rings in polygons:
        if not rings: continue
        draw.polygon([xy(p) for p in rings[0]],fill=fill)
        if hole is not None:
            for ring in rings[1:]: draw.polygon([xy(p) for p in ring],fill=hole)

mask=Image.new('L',(W,H)); md=ImageDraw.Draw(mask)
land=load('srf_nat_land_pg')
for f in land:
    if f['properties']['feature_class']!='Floating Ice':polygon(md,f['geometry'],255,0)
landmask=np.asarray(mask)>0
dem=np.asarray(Image.open(SRC/'dem_v3.tif').resize((W,H),Image.Resampling.BILINEAR),dtype=np.float32)
dem[dem<-10000]=0; dem=np.maximum(dem,0)
lat=np.abs(np.linspace(90,-90,H))[:,None]
base=np.zeros((H,W,3),dtype=np.float32)
base[:]=[14,41,62]
forest=np.array([69,105,66]); grass=np.array([118,139,85]); desert=np.array([172,151,105])
arid=np.exp(-((lat-25)/13)**2)[:,:,None]
ground=grass[None,None,:]*(1-arid*.55)+desert[None,None,:]*arid*.55
ground=np.broadcast_to(ground,(H,W,3)).copy()
ground[lat.repeat(W,axis=1)>62]=[140,154,144]
base[landmask]=ground[landmask]
terrain=Image.fromarray(base.astype('uint8'),'RGB'); draw=ImageDraw.Draw(terrain)
palette={'Tropical Forest':(41,82,51),'Temperate Forest':(58,95,58),'Boreal Forest':(66,99,87),
 'Swamp':(53,89,77),'Marsh':(70,110,90),'Wetland':(63,104,82),'Ricefield':(116,144,91),
 'Sand':(194,171,122),'Glacier':(213,227,227),'Ice Sheet':(227,236,234),'Blackened Earth':(71,66,61)}
for f in load('srf_nat_land_cover_pg'):polygon(draw,f['geometry'],palette.get(f['properties']['feature_class'],(100,120,75)))
for f in land:
    if f['properties']['feature_class']=='Floating Ice':polygon(draw,f['geometry'],(191,219,223))
for f in load('srf_nat_lakes_pg'):polygon(draw,f['geometry'],(30,87,114))
for f in load('srf_nat_rivers_ln'):
    geometry=f['geometry']; lines=geometry['coordinates'] if geometry['type']=='MultiLineString' else [geometry['coordinates']]
    for line in lines:
        if len(line)>1:draw.line([xy(p) for p in line],fill=(43,104,128),width=1)
rgb=np.asarray(terrain,dtype=np.float32).copy()
high=np.clip((dem-700)/6000,0,1)[:,:,None]
rock=np.array([161,153,137]); snow=np.array([221,223,216])
rgb[landmask]=(rgb*(1-high*.65)+rock*high*.65)[landmask]
snowmix=np.clip((dem-5000)/3500,0,.9)[:,:,None]
rgb[landmask]=(rgb*(1-snowmix)+snow*snowmix)[landmask]
# Gentle baked relief supplies detail at global scale; WebGL also displaces the mesh.
gy,gx=np.gradient(dem); shade=np.clip(1+(-gx*.0008+gy*.0006),.65,1.25)
rgb[landmask]*=shade[landmask,None]
Image.fromarray(np.clip(rgb,0,255).astype('uint8'),'RGB').save(OUT/'surface.webp',quality=94,method=6)
height=np.clip(dem/10000*255,0,255).astype('uint8');height[~landmask]=0
Image.fromarray(height,'L').resize((2048,1024),Image.Resampling.BILINEAR).save(OUT/'height.webp',lossless=True)
mask.resize((2048,1024),Image.Resampling.BILINEAR).save(OUT/'land.webp',lossless=True)
relief=np.clip(1+(-gx*.0012+gy*.0009),.45,1);relief[~landmask]=1
Image.fromarray((relief*255).astype('uint8'),'L').save(OUT/'relief.webp',quality=90)

places=[]
for f in load('srf_civ_populated_places_pt'):
    p=f['properties']; name=p.get('name_en')
    if not name or name.lower()=='unnamed':continue
    coords=f['geometry']['coordinates'];point=coords[0] if f['geometry']['type']=='MultiPoint' else coords
    places.append({'name':name,'lon':round(point[0],5),'lat':round(point[1],5),'rank':p.get('feature_rank') or 5,'kind':p.get('feature_class','Settlement')})
regions=[]
for f in load('srf_con_named_regions_pg'):
    p=f['properties'];b=p.get('geog_extent_bbox_fria');name=p.get('name_en')
    if not name or not b:continue
    regions.append({'name':name,'lon':round((b['west']+b['east'])/2,5),'lat':round((b['north']+b['south'])/2,5),'bounds':b,'rank':p.get('feature_rank') or 3})
# Simplified coastline paths remain vectors for close zooms; do not bundle descriptions.
coasts=[]
for f in land:
    if f['properties']['feature_class']=='Floating Ice':continue
    g=f['geometry'];polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    for poly in polys:
        for ring in poly:
            sampled=ring[::max(1,len(ring)//800)]
            if len(sampled)>3:coasts.append([[round(x,4),round(y,4)] for x,y,*_ in sampled])
vectors=[]
for layer in ['srf_nat_land_pg','srf_nat_land_cover_pg','srf_nat_lakes_pg','srf_nat_rivers_ln']:
    for f in load(layer):
        g=shape(f['geometry']).simplify(.006,preserve_topology=True)
        geoms=list(g.geoms) if g.geom_type.startswith('Multi') else [g]
        kind=f['properties']['feature_class']
        for item in geoms:
            if item.is_empty:continue
            rings=[list(item.exterior.coords),*[list(r.coords) for r in item.interiors]] if item.geom_type=='Polygon' else [list(item.coords)]
            fill='land' if layer=='srf_nat_land_pg' else palette.get(kind,(100,120,75)) if layer=='srf_nat_land_cover_pg' else 'water'
            if kind=='Floating Ice':fill=(204,224,226)
            vectors.append({'bounds':[round(n,4) for n in item.bounds],'rings':[[[round(x,4),round(y,4)] for x,y,*_ in r] for r in rings], 'fill':fill,'line':item.geom_type!='Polygon'})
data={'snapshot':'2026-09-24_1','projection':'equirectangular','meridian':'FRIA','places':places,'regions':regions,'coasts':coasts,'vectors':vectors}
(OUT/'atlas.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('Rendered globe and atlas:',len(places),'settlements,',len(regions),'regions')

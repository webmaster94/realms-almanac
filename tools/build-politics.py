"""Export sourced country outlines, excluding broad geographic regions and water."""
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'qa/pydeps'))
from shapely.geometry import shape,mapping
from shapely.ops import unary_union
D=ROOT/'qa/political-atlas'
def read(p):return json.loads(p.read_text(encoding='utf-8-sig'))
source=read(D/'country-geometry-candidates.geojson')['features']
extra=D/'elturgard-boundary-candidate.geojson'
if extra.exists():
    e=read(extra);source.extend(e.get('features',[e]) if e.get('type')!='Feature' else [e])
regions=read(ROOT/'qa/gis/srf_con_named_regions_pg.geojson')['features']
land=unary_union([shape(f['geometry']) for f in read(ROOT/'qa/gis/srf_nat_land_pg.geojson')['features']])
lakes=unary_union([shape(f['geometry']) for f in read(ROOT/'qa/gis/srf_nat_lakes_pg.geojson')['features']])
palette=['#a85b80','#527ea4','#a7773e','#65874e','#8271a5','#3d9291','#b16e48','#7388b5','#939344']
out=[]
for i,f in enumerate(sorted(source,key=lambda f:f['properties']['name'])):
    p=f['properties'];g=shape(f['geometry']).make_valid() if hasattr(shape(f['geometry']),'make_valid') else shape(f['geometry']).buffer(0)
    # The 1501 creator overlay includes Wealdath within Tethyr's national envelope.
    if p['name']=='Tethyr':
        forest=next((v for v in regions if v['properties'].get('Name EN')=='Wealdath' or v['properties'].get('name_en')=='Wealdath'),None)
        if forest:g=g.union(shape(forest['geometry']))
    outline=g.intersection(land).simplify(.004,preserve_topology=True)
    outlines=[outline] if outline.geom_type=='Polygon' else [v for v in outline.geoms if v.geom_type=='Polygon']
    outline_rings=[[[round(x,5),round(y,5)]for x,y in v.exterior.coords]for v in outlines]
    g=outline.difference(lakes)
    if g.is_empty:continue
    geoms=[g] if g.geom_type=='Polygon' else [v for v in g.geoms if v.geom_type=='Polygon']
    polygons=[[[[round(x,5),round(y,5)]for x,y in ring.coords]for ring in [v.exterior,*v.interiors]]for v in geoms]
    west,south,east,north=g.bounds
    out.append(dict(id=p.get('id',p['name']),name=p['name'],kind='Country',color=palette[i%len(palette)],polygons=polygons,outlineRings=outline_rings,bounds=dict(west=west,south=south,east=east,north=north),source=p.get('sourceUrl',p.get('sourcePost',p.get('source'))),dataset=p.get('datasetUrl'),sourceEra=p.get('sourceEra'),registrationNote=p.get('registrationCaveat'),approximate=True))
path=ROOT/'assets/toril/politics.json';path.write_text(json.dumps(dict(schemaVersion=1,coordinateSystem='Toril GCS / FRIA',countries=out),separators=(',',':'),ensure_ascii=False),encoding='utf-8')
print(json.dumps({'countries':len(out),'bytes':path.stat().st_size}))

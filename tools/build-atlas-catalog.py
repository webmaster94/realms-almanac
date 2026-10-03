"""Build one reviewed geographic catalog for rendering and search at every scale."""
from pathlib import Path
import json,unicodedata
ROOT=Path(__file__).resolve().parents[1]
D=ROOT/'qa/continuous-atlas'
def read(path):return json.loads((ROOT/path).read_text(encoding='utf-8-sig'))
def norm(name):return ''.join(c for c in unicodedata.normalize('NFD',name).lower() if not unicodedata.combining(c))
def inside(p,b):return b['west']<=p['lon']<=b['east'] and b['south']<=p['lat']<=b['north']
catalog={}
settlements={'City','Town','Village','Settlement'}
def add(p):
    key=('settlement' if p['kind'] in settlements else p['kind'],norm(p['name']))
    catalog[key]=p
data=read('assets/toril/atlas.json');old=read('qa/campaign-atlas/manifest-v0.7.json')
sc=next(l for l in old['layers'] if l['id']=='sword-coast')
tb=read('qa/continuous-atlas/thay-world-bounds.json')
for p in data['places']:
    if inside(p,sc['bounds']) or inside(p,tb):continue
    add(dict(p,id='gis-settlement:'+norm(p['name']),minZoom=5 if p['kind']=='City' else 12,preciseMarker=True))
kind={'continent':'Continent','island':'Region','region':'Region','water':'Water','river':'River','terrain':'Terrain'}
for p in read('qa/continuous-atlas/geographic-labels.json')['labels']:
    k=kind.get(p['category'],'Region');add(dict(p,kind=k,minZoom=1 if k=='Continent' else 3 if k=='Region' else 5,maxZoom=4 if k=='Continent' else 10000,preciseMarker=False))
for p in old['oceans']:add(dict(p,id='ocean:'+norm(p['name']),kind='Water',minZoom=1,rank=-1,preciseMarker=False))
for p in read('qa/continuous-atlas/source-geographic-labels.json')['labels']:
    k='Country' if p['category'] in ['country','region'] else 'River' if p['category']=='river' else 'Water'
    prior=catalog.get(('Region',norm(p['name']))) if k=='Country' else catalog.get((k,norm(p['name'])))
    q=dict(p,kind=k,minZoom=3 if k=='Country' or p['rank']==0 else 5,rank=-1 if k=='Country' else p['rank'],preciseMarker=False)
    q.pop('bounds',None)
    if prior and p.get('preferExistingGisAnchor'):q.update({key:prior[key] for key in ['lon','lat','bounds'] if key in prior})
    if k=='Country':catalog.pop(('Region',norm(p['name'])),None)
    add(q)
for p in read('qa/continuous-atlas/sword-coast-labels.json')['labels']:
    q=dict(p,minZoom=5 if p['kind']=='City' else 9 if p['kind'] in settlements else 5,rank=0 if p['kind']=='City' else 2,preciseMarker=p.get('anchorType')=='printed-marker')
    q.pop('bounds',None) # Printed text extents are not geographic feature extents.
    if p['kind']=='Region' and ('Terrain',norm(p['name'])) in catalog:q['kind']='Terrain'
    if p['kind']=='Region' and ('Country',norm(p['name'])) in catalog:q.update(kind='Country',minZoom=3,rank=-1)
    legacy=next((v for v in sc.get('labels',[]) if v['name']==p['name'] and v.get('kind') in settlements),None)
    if legacy and p['kind'] in settlements:q.update(lon=legacy['lon'],lat=legacy['lat'])
    if p['kind']=='City':
        source_place=next((v for v in data['places'] if norm(v['name'])==norm(p['name'])),None)
        q['rank']=max(0,(source_place or {}).get('rank',4)-3)
    if p['kind'] in ['Route','Landmark','Site']:q['minZoom']=15
    add(q)
for layer in old['layers']:
    if layer['id']=='icewind-autumn':
        for p in layer.get('labels',[]):
            if p.get('kind') in settlements:add(dict(p,id='icewind:'+norm(p['name']),minZoom=14,preciseMarker=True))
for p in read('qa/campaign-atlas/thay-calibration.json')['labels']:
    if p.get('kind')!='City':continue
    add(dict(p,id='thay-native:'+norm(p['name']),minZoom=8,preciseMarker=True,printedLabelPixels=28,sourcePixelsPerDegree=835))
# A same-named jurisdiction should not masquerade as a displaced city label.
for key,p in list(catalog.items()):
    if p['kind']=='Region' and ('settlement',norm(p['name'])) in catalog:p['searchOnly']=True
values=sorted(catalog.values(),key=lambda p:(p.get('rank',3),p['name']))
assert len({p['id'] for p in values})==len(values)
assert all(-180<=p['lon']<=180 and -90<=p['lat']<=90 for p in values)
(D/'catalog.json').write_text(json.dumps(values,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'count':len(values),'byKind':{k:sum(p['kind']==k for p in values) for k in sorted({p['kind'] for p in values})}},ensure_ascii=True))

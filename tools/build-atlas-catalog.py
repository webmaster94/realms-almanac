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
country_names={norm(p['name']) for p in read('assets/toril/politics.json')['countries']}
for p in read('qa/continuous-atlas/thay-world-labels.json'):
    if p['name']=='Alamber Sea':continue # The world label belongs to the full sea, beyond this regional crop.
    if p['kind']=='Region' and norm(p['name']) in country_names:continue
    if p['kind']=='Region' and ('Terrain',norm(p['name'])) in catalog:p=dict(p,kind='Terrain')
    key=('settlement' if p['kind'] in settlements else p['kind'],norm(p['name']))
    prior=catalog.get(key)
    if prior and p['kind'] in settlements and not inside(prior,tb):catalog[(key[0],key[1]+':'+p['id'])]=p
    elif prior and prior.get('sourceRegion')=='thay' and p['kind'] in ['Water','River','Route']:
        continue # Regional view retains repeated printed occurrences; world search keeps one feature anchor.
    else:add(p)
# A same-named jurisdiction should not masquerade as a displaced city label.
for key,p in list(catalog.items()):
    if p['kind']=='Region' and ('settlement',norm(p['name'])) in catalog:p['searchOnly']=True
politics=read('assets/toril/politics.json')
for country in politics['countries']:
    for key,p in list(catalog.items()):
        if p['kind'] not in settlements and norm(p['name'])==norm(country['name']):
            catalog.pop(key);add(dict(p,kind='Country',minZoom=3,rank=-2,preciseMarker=False))
# Named seas were omitted from the earlier five-layer GIS import.
for p in read('qa/political-atlas/water-label-candidates.json')['labels']:
    old_water=catalog.get(('Water',norm(p['name'])))
    q=dict(p,minZoom=1 if p['featureClass']=='Water/Oceanic expanse' else 3,rank=-1 if p['featureClass']=='Water/Oceanic expanse' else 0,preciseMarker=False)
    if old_water and p['name']!='Western Ocean':q.update(lon=old_water['lon'],lat=old_water['lat'])
    add(q)
audit=read('qa/political-atlas/catalog-audit.json')
for finding in audit['findings']:
    if finding.get('recommendedKind')!='River':continue
    key=next((key for key,p in catalog.items() if p['id']==finding['id']),None)
    if key:
        p=catalog.pop(key);add(dict(p,kind='River'))
add(dict(audit['additionalWaterLabel'],minZoom=3,rank=0,preciseMarker=False))
aliases={'The Vilhon Reach':'Vilhon Reach','The Deepwash':'Deepwash','River Mirar':'Mirar'}
for original,canonical in aliases.items():
    for key,p in list(catalog.items()):
        if p['name']!=original or p['kind'] not in ['Water','River']:continue
        catalog.pop(key);add(dict(p,name=canonical,aliases=[original]))
for key,p in list(catalog.items()):
    if p['kind']=='Region' and (('Water',norm(p['name'])) in catalog or ('River',norm(p['name'])) in catalog):p.update(searchOnly=True,rank=20)
    if p['kind']=='Water' and p['name'] in ['Moonsea','Vilhon Reach']:p.update(minZoom=3,rank=0)
coast=[p for p in catalog.values() if p['kind']=='City' and p['name'] in ['Waterdeep','Neverwinter',"Baldur's Gate"]]
add(dict(id='sword-coast-free-cities',name='Free Cities of the Sword Coast',displayLines=['Free Cities of the','Sword Coast'],kind='Region',lon=sum(p['lon'] for p in coast)/len(coast),lat=sum(p['lat'] for p in coast)/len(coast),minZoom=3,maxZoom=14,rank=-3,preciseMarker=False,anchorType='collective-region-label',provenance={'source':'https://www.dndbeyond.com/sources/dnd/basic-rules-2014/appendix-c-the-five-factions','geometry':'Label centered on the three major coastal cities; no national border is inferred.'}))
major_waters={'Alamber Sea','Bay of Chessenta','Dragon Reach','Easting Reach','Sea of Fallen Stars','Lake of Steam','Moonsea','Vilhon Reach','Golden Water','Shining Sea','Trackless Sea','Sea of Swords','Lake Ashane','Lake of Mists'}
for p in catalog.values():
    if p['kind']=='Water' and p['name'] in major_waters:p.update(minZoom=3,rank=0)
    elif p['kind']=='Water' and p.get('bounds') and p['bounds']['east']-p['bounds']['west']<1.3:p['minZoom']=max(8,p['minZoom'])
    if p['kind']=='River':p['minZoom']=max(9,p['minZoom'])
    if p['kind']=='Terrain' and p.get('rank',3)>1:p['minZoom']=max(8,p['minZoom'])
    if p['kind']=='Region' and p.get('anchorType')!='collective-region-label' and not p.get('bounds'):p['minZoom']=max(9,p['minZoom'])
    if p['name']=='Sword Coast':p['minZoom']=14
for correction in read('qa/political-atlas/major-water-corrections.json')['corrections']:
    key=next((key for key,p in catalog.items() if p['id']==correction['targetId']),None)
    if key is None:raise ValueError('Missing corrected feature '+correction['targetId'])
    p=catalog.pop(key)
    p.update(correction['set']);p['correctionEvidence']=correction['evidence']
    for field in correction['unset']:p.pop(field,None)
    add(p)
values=sorted(catalog.values(),key=lambda p:(p.get('rank',3),p['name']))
assert len({p['id'] for p in values})==len(values)
assert all(-180<=p['lon']<=180 and -90<=p['lat']<=90 for p in values)
(D/'catalog.json').write_text(json.dumps(values,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'count':len(values),'byKind':{k:sum(p['kind']==k for p in values) for k in sorted({p['kind'] for p in values})}},ensure_ascii=True))

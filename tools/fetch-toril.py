"""Fetch the pinned public Toril GIS snapshot used by build-toril.py."""
from pathlib import Path
import hashlib,json,urllib.request
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1]
BASE='https://downloads.geospatial-grimoire.com/toril-gis/manifests/2026-09-24_1.json'
def read(url):
    request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://www.geospatial-grimoire.com/'})
    return urllib.request.urlopen(request,timeout=60).read()
manifest=json.loads(read(BASE));assets=manifest['artifacts'];target=ROOT/'qa/gis';target.mkdir(parents=True,exist_ok=True)
names=['srf_nat_land_pg','srf_nat_land_cover_pg','srf_nat_lakes_pg','srf_nat_rivers_ln','srf_civ_populated_places_pt','srf_con_named_regions_pg']
items=[assets['geojson_by_layer'][name] for name in names]+[assets['dem_raster']]
def fetch(item):
    path=target/item['filename']
    if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256']:return
    data=read(item['url'])
    if hashlib.sha256(data).hexdigest()!=item['sha256']:raise ValueError('Snapshot checksum mismatch: '+item['filename'])
    path.write_bytes(data)
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(fetch,items))
print('Toril GIS snapshot is ready in qa/gis. Usage terms: assets/toril/NOTICE.md')

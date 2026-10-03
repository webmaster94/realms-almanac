"""Bundle only manifest-referenced private tiles for authenticated Foundry upload."""
from pathlib import Path
import json,base64,math,hashlib
ROOT=Path(__file__).resolve().parents[1];src=ROOT/'qa/campaign-atlas';out=ROOT/'qa/painted-transfer';out.mkdir(exist_ok=True)
manifest=json.loads((src/'manifest.json').read_text(encoding='utf-8'));names={'manifest.json','thay-calibration.json'}
for layer in manifest['layers']+manifest['regional']+[d for r in manifest['regional'] for d in r.get('details',[])]:
    names.add(layer['preview'])
    for level in layer['levels']:
        for y in range(math.ceil(level['height']/level['tileSize'])):
            for x in range(math.ceil(level['width']/level['tileSize'])):
                names.add(level['template'].replace('{x}',str(x)).replace('{y}',str(y)))
bundles=[];batch=[];size=0
def flush():
    global batch,size
    if not batch:return
    name=f'painted-transfer-{len(bundles):02d}.json';raw=json.dumps(batch,separators=(',',':')).encode();(out/name).write_bytes(raw)
    bundles.append(dict(name=name,count=len(batch),bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest()));batch=[];size=0
for name in sorted(names):
    data=(src/name).read_bytes();entry=dict(name=name,mime='application/json' if name.endswith('.json') else 'image/webp',base64=base64.b64encode(data).decode());n=len(json.dumps(entry))
    if size+n>3200000 or len(batch)>=96:flush()
    batch.append(entry);size+=n
flush();(out/'index.json').write_text(json.dumps(bundles,indent=2));print(json.dumps(dict(files=len(names),bundles=len(bundles),bytes=sum(b['bytes'] for b in bundles))))

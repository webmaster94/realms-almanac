"""Bundle a validated continuous pack, optionally reusing unchanged immutable tiles."""
from pathlib import Path
import argparse,base64,copy,hashlib,json,math
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--source',default='qa/continuous-atlas/pack');p.add_argument('--output',default='qa/continuous-atlas/transfer-v09');p.add_argument('--baseline');p.add_argument('--base-url',default='');a=p.parse_args()
src=ROOT/a.source;out=ROOT/a.output;out.mkdir(parents=True,exist_ok=True)
manifest=json.loads((src/'manifest.json').read_text(encoding='utf-8'));deploy=copy.deepcopy(manifest)
baseline=json.loads((ROOT/a.baseline).read_text(encoding='utf-8')) if a.baseline else {}
changed=set();references=[]
def changed_file(name):
    differs=not a.base_url or hashlib.sha256((src/name).read_bytes()).hexdigest()!=baseline.get(name)
    if differs:changed.add(name)
    references.append(name if differs else a.base_url+name)
    return differs
for layer in deploy['layers']+deploy['regional']:
    name=layer['preview']
    if not changed_file(name):layer['preview']=a.base_url+name
    for level in layer['levels']:
        template=level['template'];overrides={}
        for x0,y0,x1,y1 in level.get('coverage',[[0,0,math.ceil(level['width']/level['tileSize'])-1,math.ceil(level['height']/level['tileSize'])-1]]):
            for y in range(y0,y1+1):
                for x in range(x0,x1+1):
                    name=template.replace('{x}',str(x)).replace('{y}',str(y))
                    if changed_file(name):overrides[f'{x},{y}']=name
        if a.base_url:
            level['template']=a.base_url+template
            if overrides:level['overrides']=overrides
raw=json.dumps(deploy,ensure_ascii=False,separators=(',',':')).encode('utf-8');(out/'manifest-deploy.json').write_bytes(raw)
entries=[('manifest.json',raw)]+[(name,(src/name).read_bytes()) for name in sorted(changed)]
index=[];batch=[];size=0
def flush():
    global batch,size
    if not batch:return
    name=f'atlas-transfer-{len(index):02d}.json';blob=json.dumps(batch,separators=(',',':')).encode('utf-8');(out/name).write_bytes(blob)
    index.append(dict(name=name,count=len(batch),bytes=len(blob),sha256=hashlib.sha256(blob).hexdigest()));batch=[];size=0
for name,blob in entries:
    entry=dict(name=name,mime='application/json' if name.endswith('.json') else 'image/webp',base64=base64.b64encode(blob).decode('ascii'))
    length=len(json.dumps(entry,separators=(',',':')))
    if size+length>3200000 or len(batch)>=96:flush()
    batch.append(entry);size+=length
flush();(out/'index.json').write_text(json.dumps(index,indent=2),encoding='utf-8')
report=dict(referencedFiles=len(references)+1,uploadedFiles=len(entries),reusedFiles=len(references)-len(changed),batches=len(index),assetBytes=sum(len(blob) for _,blob in entries),bundleBytes=sum(b['bytes'] for b in index))
(out/'verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report))

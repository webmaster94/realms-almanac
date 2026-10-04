"""Bake one sparse global grid from a single registered composite, with shared gutters."""
from pathlib import Path
import sys,json,math,hashlib
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'qa/pydeps'))
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
D=ROOT/'qa/continuous-atlas';OUT=D/'pack';OUT.mkdir(exist_ok=True)
changed=None
if '--changed' in sys.argv:
    i=sys.argv.index('--changed');changed=dict(zip(['west','south','east','north'],map(float,sys.argv[i+1:i+5])))
def read(path):return json.loads(path.read_text(encoding='utf-8-sig'))
plan=read(D/'mosaic-plan.json');fb=plan['bounds'];tb=read(D/'thay-world-bounds.json');wb=dict(west=-180,east=180,south=-90,north=90)
class Source:
    def __init__(self,path,bounds):
        self.image=Image.open(path).convert('RGBA');self.bounds=bounds;self.mips=[self.image]
        while self.mips[-1].width>512:
            im=self.mips[-1];self.mips.append(im.resize((math.ceil(im.width/2),math.ceil(im.height/2)),Image.Resampling.LANCZOS))
    def crop(self,b,size):
        sb=self.bounds
        if b['west']>=sb['east'] or b['east']<=sb['west'] or b['south']>=sb['north'] or b['north']<=sb['south']:return None
        target=size[0]/(b['east']-b['west']);im=self.mips[0]
        for mip in self.mips:
            if mip.width/(sb['east']-sb['west'])>=target:im=mip
        box=((b['west']-sb['west'])/(sb['east']-sb['west'])*im.width,(sb['north']-b['north'])/(sb['north']-sb['south'])*im.height,(b['east']-sb['west'])/(sb['east']-sb['west'])*im.width,(sb['north']-b['south'])/(sb['north']-sb['south'])*im.height)
        return im.transform(size,Image.Transform.EXTENT,box,Image.Resampling.BICUBIC)
world_path=D/'world-final.png'
if not world_path.exists():raise SystemExit('Build and review the continuous world backdrop first.')
sources=[Source(world_path,wb),Source(D/'faerun-final.png',fb),Source(D/'thay-world-joined.png',tb)]
def render(bounds,size):
    out=Image.new('RGBA',size,(118,190,226,255))
    for source in sources:
        patch=source.crop(bounds,size)
        if patch is not None:out.alpha_composite(patch)
    return out.convert('RGB')
levels=[]
for z in range(10):
    width=512*2**z;height=width//2;cols=2**z;rows=math.ceil(height/512)
    bounds=wb if z<=4 else fb if z<=7 else tb
    x0=max(0,math.floor((bounds['west']+180)/360*cols));x1=min(cols-1,math.ceil((bounds['east']+180)/360*cols)-1)
    y0=max(0,math.floor((90-bounds['north'])/360*cols));y1=min(rows-1,math.ceil((90-bounds['south'])/360*cols)-1)
    template=f'world-{z}-{{x}}-{{y}}.webp'
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            tw=min(512,width-x*512);th=min(512,height-y*512)
            b=dict(west=(x*512-1)/width*360-180,east=(x*512+tw+1)/width*360-180,north=90-(y*512-1)/height*180,south=90-(y*512+th+1)/height*180)
            if changed:
                margin=6*360/width
                if b['west']>changed['east']+margin or b['east']<changed['west']-margin or b['north']<changed['south']-margin or b['south']>changed['north']+margin:continue
            tile=render(b,(tw+2,th+2));tile.save(OUT/template.format(x=x,y=y),quality=92,method=4)
    levels.append(dict(width=width,height=height,tileSize=512,gutter=1,template=template,coverage=[[x0,y0,x1,y1]]))
    print('world',z,(x1-x0+1)*(y1-y0+1),'tiles',flush=True)
render(wb,(1024,512)).save(OUT/'world-preview.webp',quality=92)
# Regional view retains recovered native terrain; source names are rendered as labels.
native=Image.open(ROOT/'qa/raster-sources/thay-clean-final.png').convert('RGB');rebuild_native=not changed or '--native' in sys.argv;native_levels=[] if rebuild_native else read(OUT/'manifest.json')['regional'][0]['levels']
widths=[];width=native.width
while width>512:widths.append(width);width=math.ceil(width/2)
for width in (reversed(widths) if rebuild_native else []):
    height=round(width*native.height/native.width);im=native.resize((width,height),Image.Resampling.LANCZOS)
    # Edge replication avoids introducing black at the outside of the map frame.
    padded=Image.fromarray(np.pad(np.array(im),((1,1),(1,1),(0,0)),mode='edge'))
    template=f'thay-{width}-{{x}}-{{y}}.webp'
    for y in range(math.ceil(height/512)):
        for x in range(math.ceil(width/512)):
            padded.crop((x*512,y*512,min((x+1)*512,width)+2,min((y+1)*512,height)+2)).save(OUT/template.format(x=x,y=y),lossless=True,method=4)
    native_levels.append(dict(width=width,height=height,tileSize=512,gutter=1,template=template))
    print('native Thay',width,flush=True)
preview=native.copy();preview.thumbnail((1024,1024));preview.save(OUT/'thay-preview.webp',quality=93)
old=read(ROOT/'qa/campaign-atlas/manifest-v0.7.json');cal=read(D/'thay-calibration-affine.json')
catalog=read(D/'catalog.json')
layer=dict(id='continuous-world',width=262144,height=131072,bounds=wb,preview='world-preview.webp',levels=levels,credit='Toril · Continuous Atlas · Thay Terrain by Rob McCaleb')
regional=dict(id='thay-clean',name='Thay',width=native.width,height=native.height,preview='thay-preview.webp',levels=native_levels,labels=read(D/'thay-native-labels.json'),calibration=cal,credit='Thay · Rob McCaleb · Source Terrain and Labels')
manifest=dict(schemaVersion=2,version='0.9.0',layers=[layer],regional=[regional],catalog=catalog,continents=old['continents'],oceans=old['oceans'],destinations=old['destinations'],resolutionZones=[dict(bounds=wb,pixelsPerDegree=sources[0].image.width/360),dict(bounds=fb,pixelsPerDegree=plan['width']/(fb['east']-fb['west'])),dict(bounds=tb,pixelsPerDegree=sources[2].image.width/(tb['east']-tb['west']))],provenance=dict(originalThaySha256=hashlib.sha256((ROOT/'qa/thay.jpg').read_bytes()).hexdigest(),cleanThaySha256=hashlib.sha256((ROOT/'qa/raster-sources/thay-clean-final.png').read_bytes()).hexdigest(),thayRegistration='Single source affine; native PDF labels rendered separately',mosaicSha256=hashlib.sha256((D/'faerun-final.png').read_bytes()).hexdigest(),labelCatalog='Reviewed GIS geometry, registered source text, and measured settlement markers',worldGrid='One equirectangular grid at every resolution; all tiles sample the same composite'))
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'files':len(list(OUT.iterdir())),'megabytes':sum(p.stat().st_size for p in OUT.iterdir())/1e6,'labels':len(catalog)}))

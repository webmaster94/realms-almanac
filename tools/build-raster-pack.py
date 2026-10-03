"""Build a private campaign raster pack. Source art stays outside the public module.

Pillow, numpy, scipy and OpenCV are required. Run from the repository root after
collecting the calibrated source maps in qa/raster-sources.
"""
from pathlib import Path
import json,sys,math,hashlib,difflib
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'qa/ocrdeps'))
sys.path.insert(0,str(ROOT/'qa/pydeps'))
import numpy as np
import cv2
from scipy.spatial import Delaunay
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
SRC=ROOT/'qa/raster-sources';OUT=ROOT/'qa/campaign-atlas';OUT.mkdir(exist_ok=True)
def read(name):return json.loads((SRC/name).read_text(encoding='utf-8'))
def save(name,data):(OUT/name).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

def feather_edges(image,inset=20,feather=180):
    image=image.convert('RGBA');w,h=image.size;x=np.minimum(np.arange(w),np.arange(w)[::-1]);y=np.minimum(np.arange(h),np.arange(h)[::-1]);distance=np.minimum(y[:,None],x[None,:]);mask=np.clip((distance-inset)/feather,0,1);mask=mask*mask*(3-2*mask);alpha=np.array(image.getchannel('A'));image.putalpha(Image.fromarray((alpha*mask).astype(np.uint8)));return image

def thay_calibration():
    data=read('thay-gcps.json');points=data['points'];xy=np.array([p['sourcePixelCenter'] for p in points],float)+.5;world=np.array([[p['longitude'],p['latitude']] for p in points]);affine=np.linalg.lstsq(np.column_stack([xy,np.ones(len(xy))]),world,rcond=None)[0]
    corners=np.array([[0,0],[7200,0],[7200,7800],[0,7800]],float);cornerworld=np.column_stack([corners,np.ones(4)])@affine;xy=np.vstack([xy,corners]);world=np.vstack([world,cornerworld]);tri=Delaunay(world)
    for ids in tri.simplices:
        a,b,c=xy[ids];ab=b-a;ac=c-a;assert ab[0]*ac[1]-ab[1]*ac[0]<0,'Calibration folds over'
    labels=[dict(name=p['name'],x=float(xy[i,0]),y=float(xy[i,1]),lon=p['longitude'],lat=p['latitude'],kind='City',rank=0,minZoom=14) for i,p in enumerate(points)]
    calibration=dict(name='Thay',width=7200,height=7800,vertices=np.column_stack([xy,world]).tolist(),triangles=tri.simplices.tolist(),labels=labels)
    # Preserve native label positions for smaller named places. No invented town dots.
    names={p['name'].lower() for p in labels}
    accepted=[]
    for span in sorted(read('thay-label-bounds.json')['spans'],key=lambda s:-len(s['text'])):
        text=span['text'].strip();bbox=span['bbox7200x7800'];font=span['font']
        if len(text)<4 or text.lower() in names or abs(span['rotationDegrees'])>2 or not text[0].isupper() or any(ord(c)>0xe000 for c in text) or span['fontSize']>13:continue
        if 'Jenson' not in font or not any(c.islower() for c in text) or not all(c.isalnum() or c in " '’-.,()" for c in text):continue
        if text in ['Keep','Keep of','Sorrows','Citade','Te Smoking','Te Smokin','T Smo ng']:continue
        x=(bbox[0]+bbox[2])/2;y=(bbox[1]+bbox[3])/2
        if any(abs(x-px)<max(30,(bbox[2]-bbox[0])*.6) and abs(y-py)<max(15,(bbox[3]-bbox[1])*.6) and difflib.SequenceMatcher(None,text.lower(),pt.lower()).ratio()>.62 for px,py,pt in accepted):continue
        if x<100 or y<180 or x>7050 or y>7520:continue
        ll=None
        for ids in tri.simplices:
            a,b,c=xy[ids];uv=np.linalg.solve(np.column_stack([b-a,c-a]),np.array([x,y])-a);weights=np.r_[1-uv.sum(),uv]
            if weights.min()>=-1e-8:ll=weights@world[ids];break
        if ll is None:continue
        lon,lat=ll
        labels.append(dict(name=text,x=x,y=y,lon=float(lon),lat=float(lat),kind='Region',rank=3,minZoom=75,nativeMinZoom=max(2.2,5.5-span['fontSize']*.6)));names.add(text.lower());accepted.append((x,y,text))
    save('thay-calibration.json',calibration);return calibration,labels

def warp(image,calibration,maxwidth=7800):
    arr=np.array(image.convert('RGBA'));h,w=arr.shape[:2]
    if 'vertices' in calibration:
        vs=np.array(calibration['vertices']);xy=vs[:,:2];ll=vs[:,2:];triangles=calibration['triangles']
    else:
        a,b,c,d,e,f=calibration['affine'];xy=np.array([[0,0],[w,0],[w,h],[0,h]],float);ll=np.column_stack([a*xy[:,0]+b*xy[:,1]+c,d*xy[:,0]+e*xy[:,1]+f]);triangles=[[0,1,2],[0,2,3]]
    west,south=ll.min(axis=0);east,north=ll.max(axis=0);ow=maxwidth;oh=round(ow*(north-south)/(east-west));result=np.zeros((oh,ow,4),np.uint8)
    dest=np.column_stack([(ll[:,0]-west)/(east-west)*ow,(north-ll[:,1])/(north-south)*oh])
    for ids in triangles:
        source=xy[ids].astype(np.float32);target=dest[ids].astype(np.float32);x,y,rw,rh=cv2.boundingRect(target);x0=max(0,x);y0=max(0,y);x1=min(ow,x+rw);y1=min(oh,y+rh)
        if x1<=x0 or y1<=y0:continue
        local=target-[x0,y0];matrix=cv2.getAffineTransform(source,local.astype(np.float32));patch=cv2.warpAffine(arr,matrix,(x1-x0,y1-y0),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT)
        mask=np.zeros((y1-y0,x1-x0),np.uint8);cv2.fillConvexPoly(mask,np.round(local).astype(np.int32),255);targetview=result[y0:y1,x0:x1];targetview[mask>0]=patch[mask>0]
    return Image.fromarray(result),dict(west=float(west),east=float(east),north=float(north),south=float(south))

def crop_calibration(calibration,box,size):
    """Clip the existing mesh, retaining the same coordinate field for a detail crop."""
    vertices=[];triangles=[];left,top,right,bottom=box;w,h=size
    for ids in calibration['triangles']:
        poly=[np.array(calibration['vertices'][i],float) for i in ids]
        for axis,bound,greater in [(0,left,True),(0,right,False),(1,top,True),(1,bottom,False)]:
            clipped=[]
            for previous,current in zip(poly[-1:]+poly[:-1],poly):
                pin=previous[axis]>=bound if greater else previous[axis]<=bound;cin=current[axis]>=bound if greater else current[axis]<=bound
                if pin!=cin:clipped.append(previous+(current-previous)*(bound-previous[axis])/(current[axis]-previous[axis]))
                if cin:clipped.append(current)
            poly=clipped
            if not poly:break
        if len(poly)<3:continue
        start=len(vertices)
        vertices.extend([[(p[0]-left)/(right-left)*w,(p[1]-top)/(bottom-top)*h,p[2],p[3]] for p in poly])
        triangles.extend([[start,start+i,start+i+1] for i in range(1,len(poly)-1)])
    return dict(vertices=vertices,triangles=triangles)

def pyramid(image,id,**metadata):
    w,h=image.size;signature=hashlib.sha256(image.tobytes()).hexdigest();cache=OUT/f'{id}-build.json'
    if cache.exists():
        previous=json.loads(cache.read_text(encoding='utf-8'))
        if previous['signature']==signature:
            print(id,'cached',flush=True);return dict(previous['layer'],**metadata)
    preview=image.copy();preview.thumbnail((1024,1024));preview.save(OUT/f'{id}-preview.webp',quality=86)
    levels=[];widths=[];levelw=w
    while levelw>512:widths.append(levelw);levelw=math.ceil(levelw/2)
    for levelw in reversed(widths):
        levelh=round(h*levelw/w);im=image.resize((levelw,levelh),Image.Resampling.LANCZOS);template=f'{id}-{levelw}-{{x}}-{{y}}.webp'
        for y in range(math.ceil(levelh/512)):
            for x in range(math.ceil(levelw/512)):
                tile=im.crop((x*512,y*512,min((x+1)*512,levelw),min((y+1)*512,levelh)));tile.save(OUT/template.format(x=x,y=y),quality=88,method=4)
        levels.append(dict(width=levelw,height=levelh,tileSize=512,template=template))
    print(id,w,h,'levels',len(levels),flush=True)
    layer=dict(id=id,width=w,height=h,preview=f'{id}-preview.webp',levels=levels,**metadata);save(f'{id}-build.json',dict(signature=signature,layer=layer));return layer

def main():
    calibration,labels=thay_calibration();atlas=json.loads((ROOT/'assets/toril/cartography.json').read_text(encoding='utf-8'));layers=[];regional=[]
    base=Image.open(ROOT/'qa/painted-atlas/toril-painted.png')
    layers.append(pyramid(base,'toril-painted',bounds=dict(west=-180,east=180,south=-90,north=90),credit='Toril / Geospatial Grimoire / Illustrated Terrain'))
    faerun=feather_edges(Image.open(ROOT/'qa/painted-atlas/faerun-painted-assembled.png'),inset=0,feather=160);layers.append(pyramid(faerun,'faerun-painted',bounds=dict(west=-89.8842217865,east=-14.2757686072,south=3.5537424058,north=55.3290212766),minZoom=2,fadeZoom=1,credit='Faerun / Adam Whitehead Geography / Illustrated Terrain'))
    quality=ROOT/'qa/quality-pass';sc_labels=json.loads((quality/'sword-source-labels.json').read_text())
    sc=feather_edges(Image.open(SRC/'sword-coast-2015-georeferenced.tif'),inset=12,feather=140);layers.append(pyramid(sc,'sword-coast',bounds=dict(west=-92.7075326581926,east=-50.7857741673,south=28.9004668498,north=53.97731579125734),minZoom=8,fadeZoom=6,credit='Sword Coast · Mike Schley / Wizards of the Coast',replaceLabels=True,labels=sc_labels))
    ice=read('icewind-calibration.json');im=feather_edges(Image.open(quality/'icewind-autumn-final.png'),inset=0,feather=190);bounds=json.loads((quality/'icewind-new-bounds.json').read_text())
    ilabels=[dict(name=p['name'],lon=p['lon'],lat=p['lat'],x=p['x']+.5,y=p['y']+.5,kind='City',rank=1,minZoom=110) for p in ice['towns']]
    layers.append(pyramid(im,'icewind-autumn',bounds=bounds,minZoom=36,fadeZoom=14,requireFullView=True,labels=ilabels,replaceLabels=True,credit='Icewind Dale · Registered Geography · Autumn Terrain Restoration'))
    clean=Image.open(SRC/'thay-clean-final.png');native=[dict(p,minZoom=p.get('nativeMinZoom',1)) for p in labels];regional.append(pyramid(clean,'thay-native',labels=native,credit='Thay · Rob McCaleb · Terrain Recovered From Original Map'))
    im,bounds=warp(feather_edges(clean,inset=50),calibration,7200);layers.append(pyramid(im,'thay',bounds=bounds,minZoom=13,fadeZoom=5,labels=labels,replaceLabels=True,credit='Thay · Rob McCaleb · Calibrated Regional Detail'))
    detail=feather_edges(Image.open(quality/'eltabbar-detail-registered.png'),inset=0,feather=130);box=[4300,3100,4850,3600]
    regional[0]['details']=[pyramid(detail,'eltabbar-native',bounds=dict(west=box[0]/7200,east=box[2]/7200,north=1-box[1]/7800,south=1-box[3]/7800),minZoom=8,fadeZoom=5,credit='Eltabbar · Illustrated Detail From Regional Geography')]
    im,bounds=warp(detail,crop_calibration(calibration,box,detail.size),1600);layers.append(pyramid(im,'eltabbar-world',bounds=bounds,minZoom=140,fadeZoom=60,credit='Eltabbar · Illustrated Detail From Regional Geography'))
    manifest=dict(schemaVersion=1,layers=layers,regional=regional,continents=atlas['continents'],oceans=atlas['oceans'],destinations=[dict(name='Faerûn',lat=31,lon=-52,zoom=5),dict(name='Sword Coast',lat=43,lon=-74,zoom=15),dict(name='Icewind Dale',lat=53.18,lon=-77.25,zoom=200),dict(name='Thay',lat=35.18,lon=-36.05,zoom=75)])
    save('manifest.json',manifest)
if __name__=='__main__':main()

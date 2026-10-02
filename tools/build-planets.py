"""Bake original, seamless 4K planetary materials. Requires numpy and Pillow.

All noise is evaluated on the unit sphere, including warped coordinates, so
the longitude seam and poles agree. No third-party planet artwork is used.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'assets/planets'
OUT.mkdir(parents=True, exist_ok=True)
W, H = 4096, 2048

def noise(x, y, z, seed=0):
    ix, iy, iz = (np.floor(t).astype(np.int32) for t in (x, y, z))
    a, b, c = (t-i for t, i in zip((x,y,z),(ix,iy,iz)))
    a, b, c = (t*t*t*(t*(t*6-15)+10) for t in (a,b,c))
    result = np.zeros_like(x)
    for dx in range(2):
        for dy in range(2):
            for dz in range(2):
                v = ((ix+dx).astype(np.uint32)*np.uint32(1597334677) ^
                     (iy+dy).astype(np.uint32)*np.uint32(3812015801) ^
                     (iz+dz).astype(np.uint32)*np.uint32(2798796415) ^ np.uint32(seed*741103597 % 2**32))
                v ^= v >> 16; v *= np.uint32(2246822519); v ^= v >> 13
                result += v.astype(np.float32)/4294967295 * (a if dx else 1-a)*(b if dy else 1-b)*(c if dz else 1-c)
    return result

def fbm(x,y,z,seed=0,octaves=7):
    v = np.zeros_like(x); amp=.5
    for k in range(octaves):
        v += noise(x,y,z,seed+k)*amp
        x,y,z = x*2.03+7.1, y*2.03+3.7, z*2.03+1.3
        amp *= .5
    return v

def blend(a,b,t):
    t=np.clip(t,0,1)[...,None]
    return np.asarray(a)*(1-t)+np.asarray(b)*t

def bake(body,seed):
    rgb=np.empty((H,W,3),np.uint8); height=np.empty((H,W),np.uint8); rough=np.empty((H,W),np.uint8)
    rng=np.random.default_rng(seed)
    craters=[(rng.uniform(-np.pi,np.pi),rng.uniform(-1,1),rng.uniform(.006,.13)) for _ in range(230)] if body=='selune' else []
    for row in range(0,H,64):
        lon=np.linspace(-np.pi,np.pi,W,endpoint=False,dtype=np.float32)[None,:]
        lat=(.5-np.arange(row,min(row+64,H),dtype=np.float32)[:,None]/(H-1))*np.pi
        x=np.cos(lat)*np.cos(lon); y=np.broadcast_to(np.sin(lat),x.shape); z=-np.cos(lat)*np.sin(lon)
        warp=fbm(x*2,y*2,z*2,seed,4)-.5
        n=fbm(x*5+warp*2,y*5+warp*2,z*5+warp*2,seed)
        fine=fbm(x*95,y*95,z*95,seed+10,4)
        r=np.full_like(x,.9); h=n*.55+fine*.08
        if body=='anadia':
            ridges=1-np.abs(fbm(x*13+warp*4,y*13,z*13,seed+20,6)*2-1)
            canyon=np.clip((ridges-.90)*13,0,1)*(1-np.abs(y)**4)
            col=blend([83,39,19],[204,141,72],n*1.3)
            col=blend(col,[64,29,22],canyon*.85)
            polar=np.clip((np.abs(y)-.72+warp*.2)*12,0,1)
            col=blend(col,blend([30,55,31],[103,127,61],n*1.6),polar)
            h=n*.5+fine*.14-canyon*.2
        elif body=='coliar':
            flow=fbm(x*9+warp*6,y*20+warp*3,z*9+warp*6,seed,7)
            bands=.5+.5*np.sin(y*47+warp*10+flow*8)
            col=blend([73,93,117],[224,231,225],flow*.8+bands*.5)
            col=blend(col,[242,224,195],np.clip((bands-.7)*2,0,.25))
            h=flow*.1; r[:]=.94
        elif body in ('karpri','chandos'):
            col=blend([3,20,53],[14,77,109],n)
            if body=='karpri':
                kelp=np.clip((.19-np.abs(y)+warp*.18)*18,0,1)*np.clip((n-.39)*8,0,1)
                col=blend(col,blend([18,52,32],[67,91,38],fine),kelp)
                ice=np.clip((np.abs(y)-.88+warp*.025)*65,0,1)
                col=blend(col,blend([139,190,209],[237,245,239],fine),ice)
                h=fine*.016+kelp*.012+ice*.035; r=.22+ice*.65+kelp*.5
            else:
                island=np.clip((n-.55)*45,0,1)
                shore=np.clip((n-.53)*40,0,1)-island
                col=blend(col,[39,135,131],shore*.6)
                col=blend(col,blend([40,65,31],[154,134,79],fine*1.5),island)
                h=fine*.015+np.maximum(n-.55,0)*1.6; r=.25+island*.65
        elif body=='glyth':
            ridge=1-np.abs(fbm(x*19,y*19,z*19,seed+22,6)*2-1)
            col=blend([38,44,48],[126,137,133],n*1.3)
            col=blend(col,[153,142,119],np.clip((ridge-.79)*2,0,.3))
            h=n*.5+ridge*.15+fine*.06
        else:
            basin=np.clip((fbm(x*3,y*3,z*3,seed+4,5)-.48)*8,0,1)
            h=.48+n*.15+fine*.06
            for lonc,yc,size in craters:
                if np.min(np.abs(y[:,0]-yc))>size*1.4:continue
                xc=np.sqrt(1-yc*yc)*np.cos(lonc); zc=np.sqrt(1-yc*yc)*np.sin(lonc)
                d=np.sqrt(np.maximum(0,2-2*(x*xc+y*yc+z*zc)))/size
                bowl=-.17*np.maximum(0,1-d*d)**2
                rim=.085*np.exp(-((d-1)/.12)**2)
                h+=bowl+rim
            col=blend([78,85,93],[186,192,191],n*.6+fine*.4)
            col*=1-basin[...,None]*.34
        col*=.91+fine[...,None]*.18
        rgb[row:row+64]=np.clip(col,0,255).astype(np.uint8)
        height[row:row+64]=np.clip(h*255,0,255).astype(np.uint8)
        rough[row:row+64]=np.clip(r*255,0,255).astype(np.uint8)
    Image.fromarray(rgb).save(OUT/f'{body}.webp',quality=94,method=6)
    Image.fromarray(rgb).resize((1024,512),Image.Resampling.LANCZOS).save(OUT/f'{body}-small.webp',quality=90)
    Image.fromarray(height).resize((2048,1024),Image.Resampling.LANCZOS).save(OUT/f'{body}-height.webp',lossless=True)
    Image.fromarray(rough).resize((2048,1024),Image.Resampling.LANCZOS).save(OUT/f'{body}-rough.webp',quality=90)
    print(f'{body}: 4096 x 2048 color, 2048 x 1024 relief',flush=True)

def clouds():
    out=np.empty((H,W),np.uint8)
    for row in range(0,H,64):
        lon=np.linspace(-np.pi,np.pi,W,endpoint=False,dtype=np.float32)[None,:]
        lat=(.5-np.arange(row,row+64,dtype=np.float32)[:,None]/(H-1))*np.pi
        x=np.cos(lat)*np.cos(lon);y=np.broadcast_to(np.sin(lat),x.shape);z=-np.cos(lat)*np.sin(lon)
        warp=fbm(x*3,y*3,z*3,41,4)-.5
        n=fbm(x*13+warp*5,y*13+warp*5,z*13+warp*5,45,7)
        out[row:row+64]=(np.clip((n-.46)*4,0,.92)*255).astype(np.uint8)
    Image.fromarray(out).save(OUT/'clouds.webp',quality=95,method=6)

if __name__=='__main__':
    requested=sys.argv[1:]
    for i,body in enumerate(['anadia','coliar','karpri','chandos','glyth','selune']):
        if not requested or body in requested:bake(body,i+1)
    if not requested or 'clouds' in requested:clouds()

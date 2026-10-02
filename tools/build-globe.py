"""Add original material detail to the GIS globe without changing its geography.
The flat atlas keeps its cartographic colors. Noise supplies visual grain only;
the displacement map continues to use the source DEM.
"""
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
P=Path(__file__).resolve().parents[1]/'assets/toril'
im=Image.open(P/'surface.webp').convert('RGB');W,H=im.size
base=np.asarray(im,dtype=np.float32)/255
land=np.asarray(Image.open(P/'land.webp').convert('L').resize((W,H),Image.Resampling.BILINEAR),dtype=np.float32)/255
rng=np.random.default_rng(31271)
def grain(w,h):
    a=rng.uniform(0,255,(h,w)).astype(np.uint8);a[:,-1]=a[:,0]
    return np.asarray(Image.fromarray(a).resize((W,H),Image.Resampling.BICUBIC),dtype=np.float32)/255
broad=grain(40,20);medium=grain(180,90);fine=grain(1100,550)
detail=np.clip(.76+broad*.20+medium*.21+fine*.14,.70,1.23)
rgb=base.copy()
# Darker forests and variable mineral tones make land read as terrain in sunlight.
rgb*=detail[...,None]
rgb[land>.5]*=np.array([.82,.87,.78])
ocean=np.empty_like(rgb);ocean[:]=[.035,.15,.31]
ocean*=np.clip(.65+broad*.6+medium*.1,.7,1.3)[...,None]
blur=np.asarray(Image.open(P/'land.webp').convert('L').resize((W,H)).filter(ImageFilter.GaussianBlur(5)),dtype=np.float32)/255
coast=np.clip(blur*2.6,0,.65)
ocean=ocean*(1-coast[...,None])+np.array([.08,.34,.39])*coast[...,None]
rgb=rgb*land[...,None]+ocean*(1-land[...,None])
Image.fromarray(np.clip(rgb*255,0,255).astype(np.uint8)).save(P/'globe.webp',quality=95,method=6)
Image.fromarray((80+land*160).astype(np.uint8)).resize((2048,1024),Image.Resampling.BILINEAR).save(P/'roughness.webp',quality=92)
print('Toril globe material complete',flush=True)

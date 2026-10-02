"""Original planar ocean material for H'Catha. No spherical polar caps."""
from pathlib import Path
import numpy as np
from PIL import Image
out=Path(__file__).resolve().parents[1]/'assets/planets'
w=2048;rng=np.random.default_rng(981)
def noise(n):
    a=rng.uniform(0,255,(n,n)).astype(np.uint8)
    return np.asarray(Image.fromarray(a).resize((w,w),Image.Resampling.BICUBIC),dtype=np.float32)/255
broad=noise(16);flow=noise(80);fine=noise(720)
y,x=np.mgrid[-1:1:complex(w),-1:1:complex(w)];r=np.sqrt(x*x+y*y)
water=np.empty((w,w,3),dtype=np.float32);water[:]=[14,60,88]
water*=.72+broad[...,None]*.3+flow[...,None]*.24+fine[...,None]*.08
shelf=np.exp(-((r-.30)/.08)**2)*.8+np.exp(-((r-.96)/.04)**2)*.25
water=water*(1-shelf[...,None])+np.array([38,123,131])*shelf[...,None]
foam=np.clip((fine-.72)*3,0,.25)*np.clip((flow-.52)*5,0,1)
water=water*(1-foam[...,None])+np.array([138,182,181])*foam[...,None]
Image.fromarray(np.clip(water,0,255).astype(np.uint8)).save(out/'hcatha-ocean.webp',quality=95,method=6)
Image.fromarray((fine*255).astype(np.uint8)).save(out/'hcatha-wave.webp',quality=95,method=6)
print('H\'Catha ocean material complete')

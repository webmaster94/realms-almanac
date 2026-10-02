import * as T from './vendor/three.mjs';

const fract=x=>x-Math.floor(x);
const hash=(x,y,z,seed=0)=>fract(Math.sin(x*127.1+y*311.7+z*74.7+seed*19.1)*43758.5453);
function noise(x,y,z,seed=0){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let a=x-ix,b=y-iy,c=z-iz;a=a*a*(3-2*a);b=b*b*(3-2*b);c=c*c*(3-2*c);const lerp=(a,b,t)=>a+(b-a)*t;return lerp(lerp(lerp(hash(ix,iy,iz,seed),hash(ix+1,iy,iz,seed),a),lerp(hash(ix,iy+1,iz,seed),hash(ix+1,iy+1,iz,seed),a),b),lerp(lerp(hash(ix,iy,iz+1,seed),hash(ix+1,iy,iz+1,seed),a),lerp(hash(ix,iy+1,iz+1,seed),hash(ix+1,iy+1,iz+1,seed),a),b),c);}
function fbm(x,y,z,s){return noise(x,y,z,s)*.55+noise(x*2.1,y*2.1,z*2.1,s)*.28+noise(x*4.3,y*4.3,z*4.3,s)*.17;}
const color=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*Math.max(0,Math.min(1,t)));
const specs={
 anadia:{seed:1,low:[83,48,28],high:[211,160,90],relief:.045},
 coliar:{seed:2,low:[102,113,128],high:[234,228,205],relief:.002},
 karpri:{seed:3,low:[9,47,106],high:[40,127,175],relief:.012},
 chandos:{seed:4,low:[12,57,76],high:[139,131,76],relief:.022},
 glyth:{seed:5,low:[61,66,75],high:[153,154,151],relief:.028},
 selune:{seed:6,low:[69,77,93],high:[213,216,207],relief:.04}
};
const sizes={anadia:2.5,coliar:6,toril:4.6,karpri:4.2,chandos:4.5,glyth:5,garden:5.8,hcatha:5,selune:1.4,amaunator:11};
export const bodySize=id=>sizes[id]??4;
const cache=new Map();
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function texture(c){const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;t.userData.atlasOwned=true;return t;}
function procedural(id){
  const s=specs[id],w=768,h=384,c=canvas(w,h),ctx=c.getContext('2d'),image=ctx.createImageData(w,h);
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const lat=(.5-j/h)*Math.PI,lon=(i/w-.5)*2*Math.PI,x=Math.cos(lat)*Math.cos(lon),y=Math.sin(lat),z=-Math.cos(lat)*Math.sin(lon);
    const n=fbm(x*5,y*5,z*5,s.seed);let rgb=color(s.low,s.high,n);
    if(id==='anadia'){if(Math.abs(y)>.82)rgb=color([28,57,34],[100,126,65],n);else if(Math.abs(noise(x*10,y*10,z*10,1)-.48)<.035)rgb=rgb.map(v=>v*.55);}
    if(id==='coliar'){const bands=.5+.5*Math.sin(y*34+n*8);rgb=color(s.low,s.high,bands*.65+n*.35);}
    if(id==='karpri'){rgb=color(s.low,s.high,n*.7);if(Math.abs(y)>.88)rgb=color([176,216,230],[248,245,226],n);else if(Math.abs(y)<.13&&n>.42)rgb=color([21,70,52],[64,122,81],n);}
    if(id==='chandos')rgb=n>.53?color([85,98,43],[163,151,94],(n-.53)*4):color([9,43,63],[38,111,117],n);
    if(id==='glyth')rgb=color(s.low,s.high,.25+n*.45+.15*Math.sin(y*10+n*3));
    if(id==='selune'){const pits=Math.pow(Math.abs(Math.sin(x*37+n)*Math.sin(z*33-y*8)),12);rgb=color(s.low,s.high,n+.12).map(v=>v*(1-pits*.4));}
    const k=(j*w+i)*4;image.data[k]=rgb[0];image.data[k+1]=rgb[1];image.data[k+2]=rgb[2];image.data[k+3]=255;
  }
  ctx.putImageData(image,0,0);return {map:texture(c),height:(x,y,z)=>fbm(x*5,y*5,z*5,s.seed)*s.relief,relief:s.relief};
}
async function toril(){
  const loader=new T.TextureLoader();
  const [map,height,land]=await Promise.all([loader.loadAsync('modules/realms-almanac/assets/toril/surface.webp'),loader.loadAsync('modules/realms-almanac/assets/toril/height.webp'),loader.loadAsync('modules/realms-almanac/assets/toril/land.webp')]);
  map.colorSpace=T.SRGBColorSpace;map.anisotropy=8;
  const c=canvas(height.image.width,height.image.height);c.getContext('2d').drawImage(height.image,0,0);const pixels=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  return {map,bumpMap:height,roughnessMap:land,height:(_x,_y,_z,u,v)=>pixels[(Math.min(c.height-1,Math.floor((1-v)*c.height))*c.width+Math.min(c.width-1,Math.floor(u*c.width)))*4]/255*.04};
}
async function surface(id){if(!cache.has(id))cache.set(id,(id==='toril'?toril():Promise.resolve(procedural(id))).then(s=>{for(const t of [s.map,s.bumpMap,s.roughnessMap])if(t)t.userData.atlasShared=true;return s;}));return cache.get(id);}
function sphere(radius,detail,height){const geo=new T.SphereGeometry(radius,detail?192:80,detail?128:56),p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i)/radius,y=p.getY(i)/radius,z=p.getZ(i)/radius;const r=radius*(1+(height?.(x,y,z,uv.getX(i),uv.getY(i))??0));p.setXYZ(i,x*r,y*r,z*r);}geo.computeVertexNormals();return geo;}
function atmosphere(radius,color=0x5098ce){return new T.Mesh(new T.SphereGeometry(radius*1.04,64,40),new T.ShaderMaterial({transparent:true,side:T.BackSide,depthWrite:false,blending:T.AdditiveBlending,uniforms:{tint:{value:new T.Color(color)}},vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;uniform vec3 tint;void main(){float a=pow(1.-abs(dot(normalize(n),normalize(v))),3.)*.32;gl_FragColor=vec4(tint,a);}'}));}
function glowTexture(){const c=canvas(256,256),ctx=c.getContext('2d'),g=ctx.createRadialGradient(128,128,8,128,128,128);g.addColorStop(0,'rgba(255,232,167,1)');g.addColorStop(.15,'rgba(255,176,55,.55)');g.addColorStop(.4,'rgba(217,83,12,.15)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,256,256);return texture(c);}
export async function createBody(id,{detail=false}={}) {
  const root=new T.Group(),radius=bodySize(id);root.userData={bodyId:id,radius};
  if(id==='amaunator'){
    const mat=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec3 p;varying vec3 n;varying vec3 v;void main(){p=position;n=normalize(normalMatrix*normal);vec4 q=modelViewMatrix*vec4(position,1.);v=normalize(-q.xyz);gl_Position=projectionMatrix*q;}',fragmentShader:'varying vec3 p;varying vec3 n;varying vec3 v;uniform float time;void main(){float f=sin(p.x*8.+sin(p.y*7.)+time*.07)*sin(p.z*9.+p.x*3.)*.5+.5;float edge=pow(max(0.,dot(n,v)),.35);vec3 c=mix(vec3(1.,.25,.035),vec3(1.,.92,.5),f*.35+edge*.65);gl_FragColor=vec4(c,1.);}'});
    root.add(new T.Mesh(new T.SphereGeometry(radius,80,56),mat));root.userData.sunMaterial=mat;
    const glow=new T.Sprite(new T.SpriteMaterial({map:glowTexture(),transparent:true,blending:T.AdditiveBlending,depthWrite:false}));glow.scale.setScalar(radius*6);root.add(glow);
  }else if(id==='garden'){
    const bark=new T.MeshStandardMaterial({color:0x6c5438,roughness:1}),stone=new T.MeshStandardMaterial({color:0x788070,roughness:1});
    const knots=[];
    for(let i=0;i<19;i++){const a=hash(i,1,1)*Math.PI*2,b=hash(i,2,1)*2-1,r=2.2+hash(i,3,1)*2.9;const p=new T.Vector3(Math.cos(a)*r,b*3.5,Math.sin(a)*r);knots.push(p);const rock=new T.Mesh(new T.DodecahedronGeometry(.7+hash(i,4,1)*1.3,detail?2:1),stone);rock.position.copy(p);rock.rotation.set(i*.3,i*.7,i*.2);root.add(rock);const curve=new T.CatmullRomCurve3([new T.Vector3(0,-3,0),new T.Vector3(p.x*.4,p.y-1.3,p.z*.4),p]);root.add(new T.Mesh(new T.TubeGeometry(curve,16,.12+hash(i,5,1)*.14,5,false),bark));}
    const leaves=new T.MeshStandardMaterial({color:0x3e6741,roughness:.95});
    for(let i=0;i<13;i++){const m=new T.Mesh(new T.IcosahedronGeometry(.6+hash(i,6,1),1),leaves);m.position.set(Math.cos(i*2.3)*3,2+hash(i,8,1)*2.5,Math.sin(i*2.3)*3);m.scale.y=.45;root.add(m);}
  }else if(id==='hcatha'){
    const water=new T.MeshStandardMaterial({color:0x619d97,roughness:.34,metalness:.25});root.add(new T.Mesh(new T.CylinderGeometry(radius,radius,.35,128),water));
    const spindle=new T.Mesh(new T.ConeGeometry(.65,4,12),new T.MeshStandardMaterial({color:0xa4a58b,roughness:1}));spindle.position.y=2.1;root.add(spindle);
    const rim=new T.Mesh(new T.TorusGeometry(radius,.17,8,128),new T.MeshStandardMaterial({color:0xdae4d9,transparent:true,opacity:.65,roughness:1}));rim.rotation.x=Math.PI/2;root.add(rim);
  }else{
    const s=await surface(id);const mat=new T.MeshStandardMaterial({map:s.map,...(s.bumpMap?{bumpMap:s.bumpMap,bumpScale:radius*.025}:{}),...(s.roughnessMap?{roughnessMap:s.roughnessMap}:{}),roughness:id==='karpri'?.5:.91,metalness:id==='karpri'?.08:0});
    root.add(new T.Mesh(sphere(radius,detail,s.height),mat));
    if(['toril','karpri','coliar','chandos'].includes(id))root.add(atmosphere(radius,id==='coliar'?0xc4c7ca:0x5dace0));
    if(id==='coliar')for(let i=0;i<9;i++){const p=new T.Vector3(Math.sin(i*2.4),hash(i,9,2)*1.4-.7,Math.cos(i*2.4)).normalize().multiplyScalar(radius*1.012);const m=new T.Mesh(new T.DodecahedronGeometry(.12+hash(i,3,2)*.1,0),new T.MeshStandardMaterial({color:0x89957e,roughness:1}));m.position.copy(p);root.add(m);}
    if(id==='glyth'){
      const c=canvas(512,512),ctx=c.getContext('2d');for(let r=254;r>165;r--){ctx.strokeStyle=`rgba(192,182,172,${.25+.7*hash(r,1,8)})`;ctx.lineWidth=.85;ctx.beginPath();ctx.arc(256,256,r,0,Math.PI*2);ctx.stroke();}
      const ringMap=texture(c);const ring=new T.Mesh(new T.RingGeometry(radius*1.3,radius*2,180),new T.MeshStandardMaterial({map:ringMap,side:T.DoubleSide,transparent:true,alphaTest:.02,roughness:.85}));ring.customDepthMaterial=new T.MeshDepthMaterial({map:ringMap,alphaTest:.5,depthPacking:T.RGBADepthPacking,side:T.DoubleSide});ring.rotation.x=Math.PI/2-.28;root.add(ring);
    }
  }
  root.traverse(o=>{if(o.isMesh){const translucent=o.material?.transparent&&!o.material?.alphaTest;o.castShadow=id!=='amaunator'&&!translucent;o.receiveShadow=!translucent;o.userData.bodyId=id;}});
  return root;
}
export function disposeBody(root){root.traverse(o=>{o.geometry?.dispose();o.customDepthMaterial?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){if(!m)continue;if(m.map&&!m.map.userData.atlasShared)m.map.dispose();m.dispose();}});}
export function clearSurfaces(){for(const p of cache.values())p.then(s=>{s.map.dispose();s.bumpMap?.dispose();s.roughnessMap?.dispose();}).catch(()=>{});cache.clear();}

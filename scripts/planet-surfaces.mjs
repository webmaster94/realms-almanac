import * as T from './vendor/three.mjs';

const fract=x=>x-Math.floor(x);
const hash=(x,y=0,z=0)=>fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);
function noise(x,y,z){const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z);let a=x-ix,b=y-iy,c=z-iz;a=a*a*(3-2*a);b=b*b*(3-2*b);c=c*c*(3-2*c);const mix=(a,b,t)=>a+(b-a)*t;return mix(mix(mix(hash(ix,iy,iz),hash(ix+1,iy,iz),a),mix(hash(ix,iy+1,iz),hash(ix+1,iy+1,iz),a),b),mix(mix(hash(ix,iy,iz+1),hash(ix+1,iy,iz+1),a),mix(hash(ix,iy+1,iz+1),hash(ix+1,iy+1,iz+1),a),b),c);}
const sizes={anadia:3.4,coliar:7,toril:5.4,karpri:5,chandos:5.2,glyth:5.5,garden:6,hcatha:5.6,selune:1.5,amaunator:12};
export const bodySize=id=>sizes[id]??4;
const cache=new Map();
function canvas(w,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function texture(c){const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;}
async function load(path,color=false){const t=await new T.TextureLoader().loadAsync(path);if(color)t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;t.userData.atlasShared=true;return t;}
async function surface(id,detail){
  const key=`${id}/${detail}`;
  if(!cache.has(key))cache.set(key,(async()=>{
    const base='modules/realms-almanac/assets/',art=['anadia','selune'].includes(id)?`${base}planets/${id}-albedo.png`:null;
    const [map,bumpMap,roughnessMap]=await Promise.all(id==='toril'?
      [load(base+'toril/globe.webp',true),load(base+'toril/height.webp'),load(base+'toril/roughness.webp')]:
      [load(art??`${base}planets/${id}${detail?'':'-small'}.webp`,true),load(art??`${base}planets/${id}-height.webp`),load(`${base}planets/${id}-rough.webp`)]);
    const c=canvas(bumpMap.image.width,bumpMap.image.height),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(bumpMap.image,0,0);
    const pixels=ctx.getImageData(0,0,c.width,c.height).data;
    return {map,bumpMap,roughnessMap,height:(u,v)=>pixels[(Math.min(c.height-1,Math.floor((1-v)*c.height))*c.width+Math.min(c.width-1,Math.floor(u*c.width)))*4]/255};
  })());
  return cache.get(key);
}
function sphere(radius,detail,height,relief=.008){
  const geo=new T.SphereGeometry(radius,detail?256:96,detail?192:64),p=geo.attributes.position,uv=geo.attributes.uv;
  if(height)for(let i=0;i<p.count;i++){const r=1+height(uv.getX(i),uv.getY(i))*relief;p.setXYZ(i,p.getX(i)*r,p.getY(i)*r,p.getZ(i)*r);}
  geo.computeVertexNormals();return geo;
}
const noiseGLSL=`
float hash3(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float n=0.;float a=.5;for(int i=0;i<6;i++){n+=a*noise3(p);p=p*2.03+vec3(3.1,7.9,1.7);a*=.5;}return n;}`;
function atmosphere(radius,color=0x65baff){
  return new T.Mesh(new T.SphereGeometry(radius*1.025,128,96),new T.ShaderMaterial({transparent:true,side:T.BackSide,depthWrite:false,blending:T.AdditiveBlending,uniforms:{tint:{value:new T.Color(color)},sunDirection:{value:new T.Vector3(1,0,0)}},
    vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelMatrix*vec4(position,1.);n=normalize(mat3(modelMatrix)*normal);v=normalize(cameraPosition-p.xyz);gl_Position=projectionMatrix*viewMatrix*p;}',
    fragmentShader:'varying vec3 n;varying vec3 v;uniform vec3 tint;uniform vec3 sunDirection;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),3.5);float day=smoothstep(-.25,.8,dot(normalize(n),sunDirection));gl_FragColor=vec4(tint,rim*(.08+.72*day));}'}));
}
function glowTexture(){const c=canvas(512),ctx=c.getContext('2d'),g=ctx.createRadialGradient(256,256,0,256,256,256);g.addColorStop(0,'rgba(255,248,216,1)');g.addColorStop(.17,'rgba(255,192,78,.7)');g.addColorStop(.28,'rgba(255,132,36,.23)');g.addColorStop(.52,'rgba(222,70,0,0)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,512,512);return texture(c);}
function sun(radius,detail){
  const root=new T.Group();
  const mat=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec3 p;varying vec3 n;varying vec3 v;void main(){p=normalize(position);n=normalize(normalMatrix*normal);vec4 q=modelViewMatrix*vec4(position,1.);v=normalize(-q.xyz);gl_Position=projectionMatrix*q;}',fragmentShader:`varying vec3 p;varying vec3 n;varying vec3 v;uniform float time;${noiseGLSL}
void main(){vec3 q=p*7.+vec3(0,time*.018,0);float broad=fbm(q);float granules=fbm(p*170.+broad*3.+time*.012);float cells=pow(clamp(granules*1.5,0.,1.),2.);float spots=smoothstep(.67,.78,broad)*.65;float limb=pow(max(0.,dot(normalize(n),normalize(v))),.32);vec3 c=mix(vec3(.85,.13,.008),vec3(1.7,1.12,.32),cells*.65+limb*.45);c*=1.-spots;gl_FragColor=vec4(c,1.);}`});
  root.add(new T.Mesh(sphere(radius,detail),mat));root.userData.sunMaterial=mat;
  const glow=new T.Sprite(new T.SpriteMaterial({map:glowTexture(),transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:.9}));glow.scale.setScalar(radius*7);root.add(glow);
  // A filament shell breaks the hard edge with uneven chromospheric plasma.
  const corona=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,blending:T.AdditiveBlending,uniforms:mat.uniforms,
    vertexShader:'varying vec3 p;varying vec3 n;varying vec3 v;void main(){p=normalize(position);n=normalize(normalMatrix*normal);vec4 q=modelViewMatrix*vec4(position,1.);v=normalize(-q.xyz);gl_Position=projectionMatrix*q;}',
    fragmentShader:`varying vec3 p;varying vec3 n;varying vec3 v;uniform float time;${noiseGLSL}void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(v))),4.);float stream=fbm(p*26.+vec3(0,time*.035,0));float a=rim*pow(stream,2.)*.8;gl_FragColor=vec4(1.,.34,.045,a);}`});
  root.add(new T.Mesh(sphere(radius*1.11,detail),corona));return root;
}
function rockGeometry(r,detail,seed){const g=new T.IcosahedronGeometry(r,detail?5:3),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)/r,y=p.getY(i)/r,z=p.getZ(i)/r;const f=.86+noise(x*3+seed,y*3,z*3)*.2+noise(x*12,y*12,z*12)*.035;p.setXYZ(i,x*r*f,y*r*f,z*r*f);}g.computeVertexNormals();return g;}
function tube(points,radius,material,segments=36){const curve=new T.CatmullRomCurve3(points);const geo=new T.TubeGeometry(curve,segments,radius,10,false);const p=geo.attributes.position;for(let i=0;i<p.count;i++){const t=Math.floor(i/11)/segments,center=curve.getPointAt(t),taper=1-t*.88;p.setXYZ(i,center.x+(p.getX(i)-center.x)*taper,center.y+(p.getY(i)-center.y)*taper,center.z+(p.getZ(i)-center.z)*taper);}geo.computeVertexNormals();return new T.Mesh(geo,material);}
async function garden(root,detail){
  const s=await surface('glyth',detail),bark=new T.MeshStandardMaterial({map:s.map,bumpMap:s.bumpMap,bumpScale:.15,color:0xd6b283,roughness:1}),stone=new T.MeshStandardMaterial({map:s.map,bumpMap:s.bumpMap,bumpScale:.11,color:0xe3dbbe,roughness:.95});
  const ends=[];
  for(let i=0;i<26;i++){
    const a=i*2.39996,r=2+hash(i,3)*3.6,p=new T.Vector3(Math.cos(a)*r,(hash(i,2)-.5)*4,Math.sin(a)*r);
    const rock=new T.Mesh(rockGeometry(.45+hash(i,4)*1.1,detail,i),stone);rock.position.copy(p);rock.rotation.set(i*.7,i*.3,0);rock.scale.set(1,.7+hash(i,7),.8);root.add(rock);
    const end=p.clone().add(new T.Vector3(.3,3+hash(i,9)*2,.2));ends.push(end);
    root.add(tube([p,new T.Vector3(p.x*.48,-.2,p.z*.48),new T.Vector3(p.x*.25,2,p.z*.25),end],.20+hash(i,5)*.19,bark));
    for(let j=0;j<3;j++){const q=p.clone().multiplyScalar(.65);q.y+=.6;root.add(tube([p,q,new T.Vector3(Math.sin(a+j)*1.5,-1.5,Math.cos(a+j)*1.5)],.065,bark,20));}
  }
  const leaves=new T.MeshStandardMaterial({color:0x77a868,roughness:.9,emissive:0x14270b,emissiveIntensity:.25});
  const geo=new T.SphereGeometry(.16,10,8);const foliage=new T.InstancedMesh(geo,leaves,detail?1800:650),dummy=new T.Object3D(),tint=new T.Color();
  for(let i=0;i<foliage.count;i++){const e=ends[i%ends.length],a=hash(i,11)*Math.PI*2,r=Math.sqrt(hash(i,12))*1.05;dummy.position.set(e.x+Math.cos(a)*r,e.y+(hash(i,13)-.5)*.85,e.z+Math.sin(a)*r);dummy.scale.set(1.2+hash(i,14),.5,1);dummy.rotation.set(i,i*.4,i*.1);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);tint.setHSL(.22+hash(i,16)*.1,.28+hash(i,17)*.2,.16+hash(i,18)*.15);foliage.setColorAt(i,tint);}root.add(foliage);
}
async function hcatha(root,radius,detail){
  if(!cache.has('hcatha'))cache.set('hcatha',Promise.all([load('modules/realms-almanac/assets/planets/hcatha-ocean.webp',true),load('modules/realms-almanac/assets/planets/hcatha-wave.webp')]).then(([map,bumpMap])=>({map,bumpMap})));
  const s=await cache.get('hcatha'),g=new T.CircleGeometry(radius,256);g.rotateX(-Math.PI/2);
  root.add(new T.Mesh(g,new T.MeshStandardMaterial({map:s.map,bumpMap:s.bumpMap,bumpScale:.055,roughness:.4,metalness:.06,side:T.DoubleSide})));
  const cliffs=await surface('glyth',detail);const edge=new T.Mesh(new T.CylinderGeometry(radius,radius*.99,.16,256,4,true),new T.MeshStandardMaterial({map:cliffs.map,bumpMap:cliffs.bumpMap,bumpScale:.07,color:0xc8d8cf,roughness:1}));edge.position.y=-.08;root.add(edge);
  const vertices=[],uv=[],indices=[],segments=detail?192:96,rings=detail?96:48,base=radius*.34;
  for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){const r=j/rings,a=i/segments*Math.PI*2,x=Math.cos(a)*r*base,z=Math.sin(a)*r*base;const ridge=.8+noise(x*2.5,0,z*2.5)*.32;const h=radius*.86*Math.pow(1-r,1.6)*ridge;vertices.push(x,h,z);uv.push(i/segments,j/rings);}
  for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
  const mountain=new T.BufferGeometry();mountain.setAttribute('position',new T.Float32BufferAttribute(vertices,3));mountain.setAttribute('uv',new T.Float32BufferAttribute(uv,2));mountain.setIndex(indices);mountain.computeVertexNormals();
  root.add(new T.Mesh(mountain,new T.MeshStandardMaterial({map:cliffs.map,bumpMap:cliffs.bumpMap,bumpScale:.09,color:0xe7ddbe,roughness:.94,side:T.DoubleSide})));
  // Thin mist follows the edge of the disc, preserving its flat silhouette.
  const mist=new T.Mesh(new T.TorusGeometry(radius,.065,16,256),new T.MeshBasicMaterial({color:0xc2e8de,transparent:true,opacity:.12,depthWrite:false}));mist.rotation.x=Math.PI/2;root.add(mist);
}
async function cloudLayer(radius){
  const key='clouds';if(!cache.has(key))cache.set(key,load('modules/realms-almanac/assets/planets/clouds.webp').then(alphaMap=>({alphaMap})));
  const {alphaMap}=await cache.get(key);const m=new T.Mesh(new T.SphereGeometry(radius*1.013,128,96),new T.MeshStandardMaterial({color:0xf4f8ff,alphaMap,transparent:true,opacity:.38,roughness:1,depthWrite:false}));m.userData.clouds=true;return m;
}
export async function createBody(id,{detail=false}={}){
  const radius=bodySize(id),root=id==='amaunator'?sun(radius,detail):new T.Group();root.userData.bodyId=id;root.userData.radius=radius;
  if(id==='garden')await garden(root,detail);
  else if(id==='hcatha')await hcatha(root,radius,detail);
  else if(id!=='amaunator'){
    const s=await surface(id,detail),relief=id==='coliar'?.0005:id==='selune'?.007:id==='anadia'?.008:.008;
    const mat=new T.MeshStandardMaterial({map:s.map,bumpMap:s.bumpMap,bumpScale:radius*(id==='selune'?.014:id==='anadia'?.007:id==='coliar'?.002:.012),roughnessMap:s.roughnessMap,roughness:1,metalness:['toril','karpri','chandos'].includes(id)?.12:0});
    root.add(new T.Mesh(sphere(radius,detail,s.height,relief),mat));
    if(['toril','karpri','chandos'].includes(id)){root.add(atmosphere(radius));root.add(await cloudLayer(radius));}
    if(id==='coliar')root.add(atmosphere(radius,0xb4c9d5));
    if(id==='glyth'){
      const c=canvas(2048,4),ctx=c.getContext('2d');for(let x=0;x<2048;x++){const t=x/2048,gap=(t>.43&&t<.48)||(t>.76&&t<.78),a=gap?.025:(.28+hash(x,8)*.5)*Math.sin(Math.PI*t)**.3;ctx.fillStyle=`rgba(${172+Math.floor(hash(x,9)*65)},${162+Math.floor(hash(x,9)*55)},${142+Math.floor(hash(x,9)*48)},${a})`;ctx.fillRect(x,0,1,4);}
      const map=texture(c),g=new T.RingGeometry(radius*1.32,radius*2.3,256,2),uv=g.attributes.uv,p=g.attributes.position;
      for(let i=0;i<p.count;i++)uv.setXY(i,(Math.hypot(p.getX(i),p.getY(i))/radius-1.32)/.98,.5);
      const material=new T.MeshStandardMaterial({map,side:T.DoubleSide,transparent:true,alphaTest:.015,roughness:.9});
      // Ring particles scatter light from either side. Keep the normal lighting
      // and shadow pipeline, but don't black out the observer-facing back side.
      material.userData.sunDirection=new T.Vector3(1,0,0);
      material.onBeforeCompile=shader=>{shader.uniforms.raSunDirection={value:material.userData.sunDirection};shader.fragmentShader='uniform vec3 raSunDirection;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nvec3 ringLight=normalize((viewMatrix*vec4(raSunDirection,0.)).xyz);\nif(dot(normal,ringLight)<0.)normal=-normal;');};
      material.customProgramCacheKey=()=> 'realmspace-ring-scattering-v1';
      const ring=new T.Mesh(g,material);ring.customDepthMaterial=new T.MeshDepthMaterial({map,alphaTest:.3,depthPacking:T.RGBADepthPacking,side:T.DoubleSide});ring.rotation.x=Math.PI/2-.3;root.add(ring);
    }
  }
  root.traverse(o=>{if(o.isMesh){const translucent=o.material?.transparent&&!o.material?.alphaTest;o.castShadow=id!=='amaunator'&&!translucent;o.receiveShadow=!translucent;o.userData.bodyId=id;}});return root;
}
export function setBodyLight(body,direction){body.traverse(o=>{if(o.material?.uniforms?.sunDirection)o.material.uniforms.sunDirection.value.copy(direction);if(o.material?.userData.sunDirection)o.material.userData.sunDirection.copy(direction);});}
export function disposeBody(root){const seen=new Set();root.traverse(o=>{o.geometry?.dispose();o.customDepthMaterial?.dispose();const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){if(!m||seen.has(m))continue;seen.add(m);for(const t of [m.map,m.bumpMap,m.roughnessMap,m.alphaMap])if(t&&!t.userData.atlasShared)t.dispose();m.dispose();}});}
export function clearSurfaces(){for(const p of cache.values())p.then(s=>{for(const t of Object.values(s))if(t?.isTexture)t.dispose();}).catch(()=>{});cache.clear();}

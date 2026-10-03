import * as T from './vendor/three.mjs';
import {tearOffsets,satelliteRandom as rand,LUNAR_RADIUS,BRAL_TRAIL} from './satellites.mjs';
const vec=(x,y,z)=>new T.Vector3(x,y,z);
function mesh(root,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);root.add(m);return m;}
function instances(root,geometry,material,items){const result=new T.InstancedMesh(geometry,material,items.length),dummy=new T.Object3D(),color=new T.Color();items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.sx??1,p.sy??1,p.sz??1);dummy.rotation.set(p.rx??0,p.ry??0,p.rz??0);dummy.updateMatrix();result.setMatrixAt(i,dummy.matrix);if(p.color){color.set(p.color);result.setColorAt(i,color);}});root.add(result);return result;}
function ribbon(root,points,width,material,y=2.33){const curve=new T.CatmullRomCurve3(points.map(([x,z])=>vec(x,y,z))),v=[],indices=[];for(let i=0;i<=64;i++){const p=curve.getPoint(i/64),t=curve.getTangent(i/64),n=vec(-t.z,0,t.x).normalize().multiplyScalar(width/2);v.push(p.x+n.x,y,p.z+n.z,p.x-n.x,y,p.z-n.z);if(i<64){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(indices);g.computeVertexNormals();return mesh(root,g,material);}
function architectureTexture(roof=false){
  const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=roof?'#968979':'#aaa797';x.fillRect(0,0,256,256);
  const h=roof?18:30,w=roof?24:46;
  for(let row=0;row<256/h;row++)for(let col=-1;col<256/w+1;col++){const n=rand(row*31+col+100,44),b=roof?164+n*40:174+n*32;x.fillStyle=`rgb(${b},${b-4},${b-12})`;x.fillRect(col*w+(row%2)*w/2+1,row*h+1,w-2,h-2);}
  if(!roof)for(const y of [46,145])for(const a of [55,171]){x.fillStyle='#514a3b';x.fillRect(a,y,24,38);x.beginPath();x.arc(a+12,y,12,Math.PI,0);x.fill();x.strokeStyle='#aa956b';x.lineWidth=3;x.beginPath();x.moveTo(a+12,y-9);x.lineTo(a+12,y+36);x.moveTo(a+1,y+13);x.lineTo(a+23,y+13);x.stroke();}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;
}
function roofGeometry(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.5,0,-.5,.5,0,-.5,-.5,0,.5,.5,0,.5,-.5,1,0,.5,1,0],3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,0,1,0,0,1,1,1],2));g.setIndex([0,4,1,1,4,5,2,3,4,3,5,4,0,2,4,1,5,3]);const flat=g.toNonIndexed();g.dispose();flat.computeVertexNormals();return flat;}

function ship(root,x,z,scale,wood,linen){const group=new T.Group();group.position.set(x,2.65,z);group.scale.setScalar(scale);root.add(group);const hull=mesh(group,new T.SphereGeometry(.4,24,16),wood);hull.scale.set(2.3,.43,.8);mesh(group,new T.CylinderGeometry(.023,.03,1.2,12),wood,0,.6,0);const g=new T.PlaneGeometry(.84,.66,12,8),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,.13*Math.sin((p.getX(i)/.84+.5)*Math.PI));g.computeVertexNormals();mesh(group,g,linen,.05,.77,0);mesh(group,new T.CylinderGeometry(.016,.016,.95,8),wood,0,1.1,0).rotation.z=Math.PI/2;return group;}
export function buildBral(root,{detail=false,map,bumpMap}={}){
  const rock=new T.MeshStandardMaterial({map,bumpMap,bumpScale:.2,color:0x9c9887,roughness:1}),stone=new T.MeshStandardMaterial({map:architectureTexture(),color:0xe5ddc8,roughness:.93}),roof=new T.MeshStandardMaterial({map:architectureTexture(true),color:0xd3b798,roughness:.92}),wood=new T.MeshStandardMaterial({color:0x725338,roughness:.9}),roads=new T.MeshStandardMaterial({color:0x998a71,roughness:1,side:T.DoubleSide}),linen=new T.MeshStandardMaterial({color:0xe6d5af,roughness:.95,side:T.DoubleSide});
  const geo=new T.CylinderGeometry(7,6.4,4.6,detail?192:96,detail?32:12),pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){let x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);const a=Math.atan2(z,x),r=Math.hypot(x,z),f=1+.035*Math.sin(a*5)+.02*Math.sin(a*11+y);if(Math.abs(y)<2.29){x*=1+(rand(i,2)-.5)*.045;z*=1+(rand(i,3)-.5)*.045;}pos.setXYZ(i,x*f*1.4,y,z*f*.79);}
  geo.computeVertexNormals();mesh(root,geo,rock);
  const park=new T.MeshStandardMaterial({color:0x6f8050,roughness:1});
  mesh(root,new T.CircleGeometry(1.85,64),park,-5.2,2.315,-1.8).rotation.x=-Math.PI/2;
  const lake=new T.Shape();for(let i=0;i<=80;i++){const a=i/80*Math.PI*2,r=1+.08*Math.sin(a*5)+.04*Math.sin(a*9),x=Math.cos(a)*1.9*r,y=Math.sin(a)*1.12*r;i?lake.lineTo(x,y):lake.moveTo(x,y);}
  const water=mesh(root,new T.ShapeGeometry(lake),new T.MeshStandardMaterial({color:0x337687,roughness:.28,metalness:.1,side:T.DoubleSide}),-3.7,2.34,1.15);water.rotation.x=-Math.PI/2;
  ribbon(root,[[-8,0],[-4,-.55],[0,-.3],[4,.1],[8,0]],.27,roads);
  ribbon(root,[[-1,-4.5],[-1.3,-2],[-1.6,0],[0,3],[2,4.6]],.18,roads);
  ribbon(root,[[-7,-2.6],[-3,-3],[1,-2.6],[5,-1.8],[8,0]],.15,roads);
  ribbon(root,[[-7,2.7],[-3,3.5],[1,2.8],[5,2.5],[8,0]],.18,roads);
  const houses=[],roofs=[],windows=[],trees=[];
  for(let row=0;row<17;row++)for(let col=0;col<29;col++){
    const i=row*29+col,x=-8.3+col*.58+(rand(i,4)-.5)*.14,z=-4.5+row*.56+(rand(i,5)-.5)*.12;
    if(x*x/79+z*z/24>.89||Math.abs(z-.2*Math.sin(x*.5))<.37||((x+3.7)/2.22)**2+((z-1.15)/1.42)**2<1||x< -4&&z< -1.2||Math.abs(x+1.3)<.23||rand(i,8)<.19||row%6===0||col%9===0)continue;
    const width=.29+rand(i,6)*.17,depth=.30+rand(i,7)*.15,height=.25+rand(i,9)*.55,angle=(rand(i,10)-.5)*.2;
    houses.push({x,y:2.34+height/2,z,sx:width,sy:height,sz:depth,ry:angle,color:['#c4b295','#c9bfaa','#aeb2a0','#b19b81'][i%4]});
    roofs.push({x,y:2.34+height,z,sx:width*1.14,sy:.13+rand(i,12)*.16,sz:depth*1.14,ry:angle,color:['#6b605c','#92735c','#786a58','#a08062','#527477'][i%5]});
    if(detail&&rand(i,11)>.68)windows.push({x:x+width*.51,y:2.34+height*.7,z,sy:.08,sx:.012,sz:.075});
  }
  instances(root,new T.BoxGeometry(1,1,1),stone,houses);instances(root,roofGeometry(),roof,roofs);
  if(windows.length)instances(root,new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0xffd58c,emissive:0xffa64d,emissiveIntensity:.4}),windows);
  for(let i=0;i<48;i++){const a=i*2.399,r=.4+rand(i,20)*1.2;trees.push({x:-5.2+Math.cos(a)*r,y:2.65+rand(i,21)*.12,z:-1.8+Math.sin(a)*r,sx:.13,sy:.4,sz:.13,color:i%2?'#496944':'#6b8250'});}
  instances(root,new T.ConeGeometry(1,1,9),park,trees);
  // Starhaven and the High City overlook Lake Bral at the trailing end.
  mesh(root,new T.BoxGeometry(2.15,.65,1.45),stone,-6.1,2.65,-2.05);
  const crenels=[];
  for(const [x,z]of [[-7,-2.65],[-5.2,-2.65],[-7,-1.45],[-5.2,-1.45]]){
    mesh(root,new T.CylinderGeometry(.27,.34,1.7,24),stone,x,3.18,z);mesh(root,new T.ConeGeometry(.38,.7,24),new T.MeshStandardMaterial({color:0x537477,roughness:.85}),x,4.32,z);
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;crenels.push({x:x+Math.cos(a)*.3,y:3.84,z:z+Math.sin(a)*.3,sx:.11,sy:.19,sz:.11});}
  }
  instances(root,new T.BoxGeometry(1,1,1),stone,crenels);
  // Docks extend past the leading edge; their small ships are original models.
  for(let i=0;i<6;i++){const z=(i-2.5)*.7,x=8.8-Math.abs(z)*.16;mesh(root,new T.BoxGeometry(3,.12,.22),wood,x+1.1,2.32,z);for(let j=0;j<4;j++)mesh(root,new T.CylinderGeometry(.035,.045,.5,8),wood,x+j*.65,2.3,z+.17);if(i%2===0)ship(root,x+2.4,z+.36,.75,wood,linen);}
  // The opposite gravity-facing surface carries farms and military buildings.
  const fields=[],furrows=[];
  for(let i=0;i<18;i++){const x=-6+(i%6)*2.4,z=-2+(Math.floor(i/6))*2;if(x*x/75+z*z/21>.75)continue;fields.push({x,y:-2.34,z,sx:1.9,sy:.045,sz:1.45,color:i%3===0?'#927b4e':i%2?'#6c824c':'#849557'});for(let j=0;j<9;j++)furrows.push({x:x-.83+j*.21,y:-2.38,z,sx:.025,sy:.012,sz:1.3});}
  instances(root,new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0xffffff,roughness:1}),fields);instances(root,new T.BoxGeometry(1,1,1),wood,furrows);
  for(const [x,z]of [[-7,0],[6,0],[0,4]]){mesh(root,new T.CylinderGeometry(.35,.29,1.1,20),stone,x,-2.83,z);const cap=mesh(root,new T.ConeGeometry(.44,.5,20),roof,x,-3.6,z);cap.rotation.z=Math.PI;}
  root.traverse(o=>{if(o.isMesh){o.userData.bodyId='bral';o.castShadow=true;o.receiveShadow=true;}});
  root.userData.landmarks={lake:'Lake Bral',castle:'Starhaven',port:'The Docks'};
}
export function buildTears(root,{detail=false,map,bumpMap}={}){
  const material=new T.MeshStandardMaterial({map,bumpMap,bumpScale:.11,color:0xeee9df,roughness:.98}),geo=new T.IcosahedronGeometry(1,detail?3:2),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=.8+.12*Math.sin(x*5+y*3)+.09*Math.cos(z*7-x*2);p.setXYZ(i,x*f,y*f,z*f);}geo.computeVertexNormals();
  const center=vec(Math.cos(.825)*LUNAR_RADIUS,0,-Math.sin(.825)*LUNAR_RADIUS),items=tearOffsets().map((p,i)=>({x:(p.x-(detail?center.x:0))*(detail?2.2:1),y:p.y*(detail?2.2:1),z:(p.z-(detail?center.z:0))*(detail?2.2:1),sx:p.size*(detail?2.2:1),sy:p.size*(.7+rand(i,7))*(detail?2.2:1),sz:p.size*(.6+rand(i,8))*(detail?2.2:1),ry:i,rx:i*.4,color:['#d0cec6','#bac4ca','#d7c7b4','#eee7d3'][i%4]}));
  instances(root,geo,material,items);
  if(detail){const bral=new T.Group();buildBral(bral,{detail:false,map,bumpMap});bral.scale.setScalar(.20);bral.position.set((Math.cos(BRAL_TRAIL)*LUNAR_RADIUS-center.x)*2.2,0,(-Math.sin(BRAL_TRAIL)*LUNAR_RADIUS-center.z)*2.2);root.add(bral);}
}

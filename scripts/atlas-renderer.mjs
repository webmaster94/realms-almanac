import * as T from './vendor/three.mjs';
import {createBody,bodySize,disposeBody,clearSurfaces,setBodyLight} from './planet-surfaces.mjs';
import {orbitPositions,globeVector,vectorLatLon,atlasState} from './atlas-state.mjs';
import {elapsedRealmsDays} from './planets.mjs';
import {config} from './engine.mjs';
import {lunarPositions,LUNAR_RADIUS} from './satellites.mjs';

export class AtlasRenderer {
  constructor(host,read,{onSelect,onPosition}){
    this.host=host;this.read=read;this.onSelect=onSelect;this.onPosition=onPosition;this.alive=true;this.visible=true;this.mode='system';this.selected='amaunator';this.sequence=0;
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    host.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Interactive Realmspace star map');
    this.camera=new T.PerspectiveCamera(45,1,.05,6000);this.camera.position.set(0,280,370);this.overviewPending=true;
    this.controls=new T.OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.minDistance=10;this.controls.maxDistance=850;
    this.system=new T.Scene();this.system.background=new T.Color('#040812');this.focusScene=new T.Scene();this.focusScene.background=new T.Color('#040812');this.system.backgroundIntensity=.3;this.focusScene.backgroundIntensity=.18;
    this.systemAmbient=new T.AmbientLight(0xb8c7df,.85);this.system.add(this.systemAmbient);const sun=new T.PointLight(0xffefd9,4.1,0,0);this.system.add(sun);
    this.focusAmbient=new T.AmbientLight(0xb8c7df,.3);this.focusScene.add(this.focusAmbient);this.focusLight=new T.DirectionalLight(0xffefd9,4.1);this.focusLight.castShadow=true;this.focusLight.shadow.mapSize.set(2048,2048);Object.assign(this.focusLight.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:.1,far:90});this.focusLight.shadow.bias=-.0003;this.focusLight.shadow.normalBias=.015;this.focusScene.add(this.focusLight);this.focusScene.add(this.focusLight.target);
    this.bodies=new Map();this.labels=document.createElement('div');this.labels.className='ra-orbit-labels';host.append(this.labels);
    this.starFields=[];for(const scene of [this.system,this.focusScene])this.addSky(scene);
    this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();
    this.down=e=>{this.startPointer=[e.clientX,e.clientY];};this.up=e=>this.pick(e);this.renderer.domElement.addEventListener('pointerdown',this.down);this.renderer.domElement.addEventListener('pointerup',this.up);this.renderer.domElement.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.ready=this.build();this.frame=0;this.animate(0);
  }
  snapshot(){const w=this.read();return {w,positions:orbitPositions(elapsedRealmsDays(w.date.year,w.c.day,w.c.hour,w.c.minute),config().planetAngles??{})};}
  async build(){
    const sky=await new T.TextureLoader().loadAsync('modules/realms-almanac/assets/planets/realmspace-nebula.png');if(!this.alive){sky.dispose();return;}sky.colorSpace=T.SRGBColorSpace;this.skyTexture=sky;this.system.background=sky;this.focusScene.background=sky;
    const {positions}=this.snapshot();const ids=['amaunator',...positions.map(p=>p.id),'selune','tears','bral'];this.expectedBodies=ids.length;
    for(const id of ids){const body=await createBody(id);if(!this.alive){disposeBody(body);return;}body.scale.setScalar(id==='selune'?2:id==='tears'?1:id==='bral'?.16:2.6);this.bodies.set(id,body);this.system.add(body);
      const label=document.createElement('button');label.type='button';label.className='ra-orbit-label';label.textContent=({amaunator:'Amaunator',selune:'Selûne',tears:'Tears of Selûne',bral:'Rock of Bral'})[id]??positions.find(p=>p.id===id).name;label.addEventListener('click',()=>this.onSelect(id));label.dataset.body=id;this.labels.append(label);
    }
    for(const p of positions){const pts=Array.from({length:257},(_,i)=>new T.Vector3(Math.cos(i/256*Math.PI*2)*p.orbit,0,Math.sin(i/256*Math.PI*2)*p.orbit));const line=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:p.id==='toril'?0xb9aa76:0x829bb1,transparent:true,opacity:p.id==='toril'?.78:.4}));line.userData.solarOrbit=true;this.system.add(line);}
    this.lunarOrbit=new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:128},(_,i)=>new T.Vector3(Math.cos(i/128*Math.PI*2)*LUNAR_RADIUS,0,Math.sin(i/128*Math.PI*2)*LUNAR_RADIUS))),new T.LineBasicMaterial({color:0xaabccc,transparent:true,opacity:.38}));this.system.add(this.lunarOrbit);
    this.update();this.home();this.host.classList.add('ready');
  }
  addSky(scene){
    const rand=i=>{const x=Math.sin(i*127.1+19.7)*43758.5453;return x-Math.floor(x);},points=[],colors=[],sizes=[];
    for(let i=0;i<3200;i++){const a=rand(i*3)*Math.PI*2,b=Math.acos(1-2*rand(i*3+1));points.push(Math.sin(b)*Math.cos(a)*1100,Math.cos(b)*1100,Math.sin(b)*Math.sin(a)*1100);const c=new T.Color().setHSL(.55+rand(i*7)*.15,.18+rand(i*9)*.22,.48+rand(i*11)*.45);colors.push(c.r,c.g,c.b);sizes.push(rand(i*13)>.985?4:rand(i*17)*1.6+.6);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setAttribute('pointSize',new T.Float32BufferAttribute(sizes,1));
    const stars=new T.Points(geo,new T.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,blending:T.AdditiveBlending,vertexShader:'attribute float pointSize;varying vec3 tint;void main(){tint=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=pointSize;}',fragmentShader:'varying vec3 tint;void main(){float r=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(tint,pow(max(0.,1.-r),1.5));}'}));scene.add(stars);this.starFields.push(stars);

  }
  resize(){
    if(!this.alive)return;const r=this.host.getBoundingClientRect();if(!r.width||!r.height)return;
    const offset=this.mode==='system'?(this.camera.view?.offsetY??0)/(this.camera.view?.fullHeight??r.height):0;
    this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.sidebarWidth=(this.host.parentElement.querySelector('.ra-body-sidebar')?.offsetWidth??190)+32;
    this.camera.setViewOffset(r.width,r.height,-this.sidebarWidth/2,offset*r.height,r.width,r.height);this.camera.updateProjectionMatrix();
    if(this.overviewPending&&this.expectedBodies&&this.bodies.size===this.expectedBodies){this.overviewPending=false;this.home();}
  }
  rotateToril(body,p,w){const party=atlasState().party,lon=(party?.lon??0)*Math.PI/180;body.rotation.y=-lon-p.angle-Math.PI+(w.hour-12)/24*2*Math.PI;}
  update(){if(!this.alive)return;const {w,positions}=this.snapshot();this.positions=positions;
    for(const p of positions){const body=this.bodies.get(p.id);if(!body)continue;body.position.set(p.x,0,p.z);setBodyLight(body,new T.Vector3(-p.x,0,-p.z).normalize());if(p.id==='toril')this.rotateToril(body,p,w);if(p.id==='hcatha')body.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(-p.x,0,-p.z).normalize());}
    const toril=positions.find(p=>p.id==='toril'),lunar=lunarPositions(toril,w.phase?.q??0),moon=this.bodies.get('selune');if(moon)moon.position.set(lunar.moon.x,0,lunar.moon.z);
    const tears=this.bodies.get('tears'),bral=this.bodies.get('bral');if(tears){tears.position.set(toril.x,0,toril.z);tears.rotation.y=-lunar.angle;tears.userData.labelPosition=new T.Vector3(lunar.tears.x,0,lunar.tears.z);}if(bral)bral.position.set(lunar.bral.x,0,lunar.bral.z);this.lunarOrbit?.position.set(toril.x,0,toril.z);
    if(this.localOrbit){const center=new T.Vector3(toril.x,0,toril.z),delta=center.clone().sub(this.localCenter);this.camera.position.add(delta);this.controls.target.add(delta);this.localCenter.copy(center);}
    if(this.focusBody){const p=positions.find(p=>p.id===this.selected)??positions.find(p=>p.id==='toril');const sun=new T.Vector3(-p.x,0,-p.z).normalize();setBodyLight(this.focusBody,sun);this.focusLight.position.copy(sun.multiplyScalar(30));
      if(this.selected==='toril')this.rotateToril(this.focusBody,p,w);
      // Inspect the disc in a body-aligned frame. Its normal and illumination
      // remain aligned with the sun, just as in the system view.
      if(this.selected==='hcatha'){this.focusBody.quaternion.identity();this.focusLight.position.set(0,30,0);}
      if(this.selected==='bral'){this.focusBody.quaternion.identity();this.focusLight.position.set(-22,26,16);}
      if(this.selected==='tears')this.focusBody.rotation.y=-lunar.angle;
      this.updateMarker();
    }
    const torilLabel=this.labels.querySelector('[data-body="toril"]');if(torilLabel)torilLabel.textContent=atlasState().party?'Toril · Party':'Toril';
  }
  async focus(id){await this.ready;if(!this.alive)return;const sequence=++this.sequence;this.selected=id;
    this.localOrbit=false;
    const body=await createBody(id,{detail:true});if(!this.alive||sequence!==this.sequence){disposeBody(body);return;}
    if(this.focusBody){this.focusScene.remove(this.focusBody);disposeBody(this.focusBody);this.partyMarker=null;}
    this.focusBody=body;this.focusScene.add(body);this.mode='focus';this.labels.hidden=true;this.controls.target.set(0,0,0);this.camera.fov=45;this.resize();
    const r=bodySize(id)*(id==='glyth'?2.15:id==='garden'?1.25:1);this.controls.minDistance=r*1.12;this.controls.maxDistance=r*14;this.update();
    const view=id==='hcatha'||id==='bral'?new T.Vector3(.65,.9,1):this.focusLight.position.clone().normalize().applyAxisAngle(new T.Vector3(0,1,0),.85);if(id==='bral')view.applyQuaternion(body.quaternion);if(!['hcatha','bral'].includes(id))view.y+=id==='glyth'||id==='tears'?1.05:.4;this.camera.position.copy(view.normalize().multiplyScalar(r*(id==='tears'?4.8:3.45)));this.controls.update();
    this.draw();
  }
  home(){
    if(!this.host.clientWidth||!this.host.clientHeight){this.overviewPending=true;return;}this.overviewPending=false;
    this.localOrbit=false;this.systemVisibility(false);
    this.sequence++;this.mode='system';this.selected=null;this.labels.hidden=false;this.controls.target.set(0,0,0);this.controls.minDistance=60;this.controls.maxDistance=3500;this.camera.fov=28;this.resize();
    const width=this.host.clientWidth,height=this.host.clientHeight,halfWidth=Math.max(120,(width-this.sidebarWidth-65)/2),halfHeight=Math.max(100,(height-100)/2),direction=new T.Vector3(0,.46,.888).normalize();
    this.camera.setViewOffset(width,height,-this.sidebarWidth/2,0,width,height);
    // Fit the projected orbital plane, including perspective, then center its
    // bounds. Bisection avoids oscillation when the near orbit fills the view.
    const measure=distance=>{
      this.camera.position.copy(direction).multiplyScalar(distance);this.camera.lookAt(0,0,0);this.camera.updateMatrixWorld();
      let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
      for(let i=0;i<96;i++){const a=i/96*Math.PI*2,p=new T.Vector3(Math.cos(a)*480,0,Math.sin(a)*480).project(this.camera);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
      return {extent:Math.max((maxX-minX)*width/4/halfWidth,(maxY-minY)*height/4/halfHeight),midY:(minY+maxY)/2};
    };
    let low=520,high=3500;for(let i=0;i<16;i++){const mid=(low+high)/2;if(measure(mid).extent>1)low=mid;else high=mid;}
    const frame=measure(high);this.camera.setViewOffset(width,height,-this.sidebarWidth/2,-frame.midY*height/2,width,height);this.controls.update();this.update();this.draw();
  }
  systemVisibility(lunarOnly){for(const [id,body]of this.bodies)body.visible=!lunarOnly||['toril','selune','tears','bral'].includes(id);for(const child of this.system.children)if(child.userData.solarOrbit)child.visible=!lunarOnly;}
  async torilSystem(){await this.ready;if(!this.alive)return;this.sequence++;this.mode='system';this.selected=null;this.localOrbit=true;this.systemVisibility(true);const p=this.positions.find(p=>p.id==='toril');this.localCenter=new T.Vector3(p.x,0,p.z);this.controls.target.copy(this.localCenter);this.camera.fov=45;this.camera.setViewOffset(this.host.clientWidth,this.host.clientHeight,-this.sidebarWidth/2,0,this.host.clientWidth,this.host.clientHeight);this.camera.position.copy(this.localCenter).add(new T.Vector3(0,45,76));this.controls.minDistance=25;this.controls.maxDistance=1600;this.labels.hidden=false;this.controls.update();this.draw();}
  setSurvey(value){this.survey=value;this.focusAmbient.intensity=value?1.15:.3;this.systemAmbient.intensity=value?1.3:.85;}
  updateMarker(){if(this.selected!=='toril'||!this.focusBody)return;const party=atlasState().party;
    if(!this.partyMarker){this.partyMarker=new T.Mesh(new T.SphereGeometry(.07,12,8),new T.MeshBasicMaterial({color:0xffd678}));this.partyMarker.userData.partyMarker=true;this.focusBody.add(this.partyMarker);}
    if(!this.partyMarker.parent)this.focusBody.add(this.partyMarker);
    this.partyMarker.visible=Boolean(party);if(party)this.partyMarker.position.fromArray(globeVector(party.lat,party.lon,bodySize('toril')*1.045));
  }
  findParty(){if(this.selected!=='toril'||!atlasState().party)return;const p=atlasState().party;this.focusBody.updateMatrixWorld(true);const v=new T.Vector3(...globeVector(p.lat,p.lon,1)).applyQuaternion(this.focusBody.quaternion);this.controls.target.set(0,0,0);this.camera.position.copy(v.multiplyScalar(bodySize('toril')*3.1));this.controls.update();}
  setPlacement(enabled){this.placing=enabled;this.renderer.domElement.classList.toggle('placing',enabled);}
  pick(event){if(!this.startPointer||Math.hypot(event.clientX-this.startPointer[0],event.clientY-this.startPointer[1])>5)return;const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    const objects=this.mode==='system'?[...this.bodies.values()].filter(b=>b.visible):[this.focusBody];const hits=this.raycaster.intersectObjects(objects.filter(Boolean),true).filter(h=>h.object.isMesh&&!h.object.material?.transparent&&!h.object.userData.partyMarker);
    if(!hits.length)return;const hit=hits[0];if(this.placing&&this.selected==='toril'&&this.mode==='focus'){const local=this.focusBody.worldToLocal(hit.point.clone());this.onPosition(vectorLatLon(local.x,local.y,local.z));return;}
    if(this.mode==='system'||(this.selected==='tears'&&hit.object.userData.bodyId==='bral'))this.onSelect(hit.object.userData.bodyId);
  }
  animate(time){if(!this.alive)return;this.frame=requestAnimationFrame(t=>this.animate(t));if(!this.visible||document.hidden||time-(this.lastFrame??0)<30)return;this.lastFrame=time;
    this.controls.update();for(const b of [this.bodies.get('amaunator'),this.focusBody])if(b?.userData.sunMaterial)b.userData.sunMaterial.uniforms.time.value=time/1000;
    this.focusBody?.traverse(o=>{if(o.userData.clouds)o.rotation.y=time*.000006;});
    this.draw();
  }
  draw(){if(!this.alive)return;this.renderer.render(this.mode==='system'?this.system:this.focusScene,this.camera);
    if(this.mode==='system'){const occupied=[];for(const label of this.labels.children){const b=this.bodies.get(label.dataset.body);if(!b)continue;if(!b.visible){label.hidden=true;continue;}const offset=['tears','bral'].includes(label.dataset.body)?2.5:bodySize(label.dataset.body)*b.scale.x+4;const p=(b.userData.labelPosition??b.position).clone().add(new T.Vector3(0,offset,0)).project(this.camera);label.hidden=p.z>1||p.z< -1||Math.abs(p.x)>1||Math.abs(p.y)>1;if(label.hidden)continue;let x=(p.x*.5+.5)*this.host.clientWidth,y=(-p.y*.5+.5)*this.host.clientHeight;const width=label.textContent.length*6+14;for(let i=0;i<12&&occupied.some(b=>Math.abs(x-b.x)<(width+b.w)/2+5&&Math.abs(y-b.y)<20);i++){y-=20;if(y<30){y+=100;x+=width*.65;}}occupied.push({x,y,w:width});label.style.left=`${x}px`;label.style.top=`${y}px`;}}
  }
  dispose(){this.alive=false;this.sequence++;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.controls.dispose();this.renderer.domElement.removeEventListener('pointerdown',this.down);this.renderer.domElement.removeEventListener('pointerup',this.up);
    for(const scene of [this.system,this.focusScene])disposeBody(scene);this.skyTexture?.dispose();this.renderer.dispose();this.renderer.forceContextLoss();this.host.replaceChildren();this.bodies.clear();this.focusBody=null;this.partyMarker=null;clearSurfaces();
  }
}

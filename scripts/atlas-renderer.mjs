import * as T from './vendor/three.mjs';
import {createBody,bodySize,disposeBody,clearSurfaces} from './planet-surfaces.mjs';
import {orbitPositions,globeVector,vectorLatLon,atlasState} from './atlas-state.mjs';
import {elapsedRealmsDays} from './planets.mjs';
import {config} from './engine.mjs';

export class AtlasRenderer {
  constructor(host,read,{onSelect,onPosition}){
    this.host=host;this.read=read;this.onSelect=onSelect;this.onPosition=onPosition;this.alive=true;this.visible=true;this.mode='system';this.selected='amaunator';this.sequence=0;
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    host.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Interactive Realmspace star map');
    this.camera=new T.PerspectiveCamera(45,1,.05,2500);this.camera.position.set(0,280,370);
    this.controls=new T.OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.minDistance=10;this.controls.maxDistance=850;
    this.system=new T.Scene();this.system.background=new T.Color('#040812');this.focusScene=new T.Scene();this.focusScene.background=new T.Color('#040812');
    this.systemAmbient=new T.AmbientLight(0x7895b5,.22);this.system.add(this.systemAmbient);const sun=new T.PointLight(0xffe4b8,3,0,0);this.system.add(sun);
    this.focusAmbient=new T.AmbientLight(0x6f8bac,.18);this.focusScene.add(this.focusAmbient);this.focusLight=new T.DirectionalLight(0xffe7be,3.1);this.focusLight.castShadow=true;this.focusLight.shadow.mapSize.set(2048,2048);Object.assign(this.focusLight.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:.1,far:90});this.focusLight.shadow.bias=-.0004;this.focusScene.add(this.focusLight);this.focusScene.add(this.focusLight.target);
    this.bodies=new Map();this.labels=document.createElement('div');this.labels.className='ra-orbit-labels';host.append(this.labels);
    this.starFields=[];for(const scene of [this.system,this.focusScene]){const points=[];for(let i=0;i<850;i++){const a=i*2.399963,b=Math.acos(1-2*(i+.5)/850);points.push(Math.sin(b)*Math.cos(a)*900,Math.cos(b)*900,Math.sin(b)*Math.sin(a)*900);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));const stars=new T.Points(geo,new T.PointsMaterial({color:0xbed4ed,size:.9,sizeAttenuation:false,transparent:true,opacity:.6}));scene.add(stars);this.starFields.push(stars);}
    this.raycaster=new T.Raycaster();this.pointer=new T.Vector2();
    this.down=e=>{this.startPointer=[e.clientX,e.clientY];};this.up=e=>this.pick(e);this.renderer.domElement.addEventListener('pointerdown',this.down);this.renderer.domElement.addEventListener('pointerup',this.up);this.renderer.domElement.addEventListener('wheel',e=>e.stopPropagation(),{passive:true});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.resize();this.ready=this.build();this.frame=0;this.animate(0);
  }
  snapshot(){const w=this.read();return {w,positions:orbitPositions(elapsedRealmsDays(w.date.year,w.c.day,w.c.hour,w.c.minute),config().planetAngles??{})};}
  async build(){
    const {positions}=this.snapshot();const ids=['amaunator',...positions.map(p=>p.id),'selune'];
    for(const id of ids){const body=await createBody(id);if(!this.alive){disposeBody(body);return;}this.bodies.set(id,body);this.system.add(body);
      const label=document.createElement('button');label.type='button';label.className='ra-orbit-label';label.textContent=id==='amaunator'?'Amaunator':id==='selune'?'Selûne':positions.find(p=>p.id===id).name;label.addEventListener('click',()=>this.onSelect(id));label.dataset.body=id;this.labels.append(label);
    }
    for(const p of positions){const pts=Array.from({length:257},(_,i)=>new T.Vector3(Math.cos(i/256*Math.PI*2)*p.orbit,0,Math.sin(i/256*Math.PI*2)*p.orbit));const line=new T.Line(new T.BufferGeometry().setFromPoints(pts),new T.LineBasicMaterial({color:p.id==='toril'?0x658b99:0x314254,transparent:true,opacity:p.id==='toril'?.8:.5}));this.system.add(line);}
    this.update();this.host.classList.add('ready');
  }
  resize(){if(!this.alive)return;const r=this.host.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();}
  rotateToril(body,p,w){const party=atlasState().party,lon=(party?.lon??0)*Math.PI/180;body.rotation.y=-lon-p.angle-Math.PI+(w.hour-12)/24*2*Math.PI;}
  update(){if(!this.alive)return;const {w,positions}=this.snapshot();this.positions=positions;
    for(const p of positions){const body=this.bodies.get(p.id);if(!body)continue;body.position.set(p.x,0,p.z);if(p.id==='toril')this.rotateToril(body,p,w);if(p.id==='hcatha')body.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(-p.x,0,-p.z).normalize());}
    const toril=positions.find(p=>p.id==='toril'),moon=this.bodies.get('selune');if(moon){const a=toril.angle+(w.phase?.q??0)*Math.PI*2;moon.position.set(toril.x+Math.cos(a)*9,0,toril.z+Math.sin(a)*9);}
    if(this.focusBody){const p=positions.find(p=>p.id===this.selected)??positions.find(p=>p.id==='toril');const sun=new T.Vector3(-p.x,0,-p.z).normalize();this.focusLight.position.copy(sun.multiplyScalar(30));
      if(this.selected==='toril')this.rotateToril(this.focusBody,p,w);
      if(this.selected==='hcatha')this.focusBody.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(-p.x,0,-p.z).normalize());
      this.updateMarker();
    }
    const torilLabel=this.labels.querySelector('[data-body="toril"]');if(torilLabel)torilLabel.textContent=atlasState().party?'Toril · Party':'Toril';
  }
  async focus(id){await this.ready;if(!this.alive)return;const sequence=++this.sequence;this.selected=id;
    const body=await createBody(id,{detail:true});if(!this.alive||sequence!==this.sequence){disposeBody(body);return;}
    if(this.focusBody){this.focusScene.remove(this.focusBody);disposeBody(this.focusBody);this.partyMarker=null;}
    this.focusBody=body;this.focusScene.add(body);this.mode='focus';this.labels.hidden=true;this.controls.target.set(0,0,0);
    const r=bodySize(id)*(id==='glyth'?1.6:1);this.controls.minDistance=r*1.15;this.controls.maxDistance=r*14;this.update();
    const view=this.focusLight.position.clone().normalize().applyAxisAngle(new T.Vector3(0,1,0),.65);view.y+=id==='glyth'?1:.35;this.camera.position.copy(view.normalize().multiplyScalar(r*4.2));this.controls.update();
    this.draw();
  }
  home(){this.sequence++;this.mode='system';this.labels.hidden=false;this.controls.target.set(0,0,0);this.controls.minDistance=12;this.controls.maxDistance=850;this.camera.position.set(0,280,370);this.controls.update();this.update();this.draw();}
  setSurvey(value){this.survey=value;this.focusAmbient.intensity=value?.95:.18;this.systemAmbient.intensity=value?.95:.22;}
  updateMarker(){if(this.selected!=='toril'||!this.focusBody)return;const party=atlasState().party;
    if(!this.partyMarker){this.partyMarker=new T.Mesh(new T.SphereGeometry(.07,12,8),new T.MeshBasicMaterial({color:0xffd678}));this.partyMarker.userData.partyMarker=true;this.focusBody.add(this.partyMarker);}
    if(!this.partyMarker.parent)this.focusBody.add(this.partyMarker);
    this.partyMarker.visible=Boolean(party);if(party)this.partyMarker.position.fromArray(globeVector(party.lat,party.lon,bodySize('toril')*1.045));
  }
  findParty(){if(this.selected!=='toril'||!atlasState().party)return;const p=atlasState().party;this.focusBody.updateMatrixWorld(true);const v=new T.Vector3(...globeVector(p.lat,p.lon,1)).applyQuaternion(this.focusBody.quaternion);this.controls.target.set(0,0,0);this.camera.position.copy(v.multiplyScalar(bodySize('toril')*3.1));this.controls.update();}
  setPlacement(enabled){this.placing=enabled;this.renderer.domElement.classList.toggle('placing',enabled);}
  pick(event){if(!this.startPointer||Math.hypot(event.clientX-this.startPointer[0],event.clientY-this.startPointer[1])>5)return;const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    const objects=this.mode==='system'?[...this.bodies.values()]:[this.focusBody];const hits=this.raycaster.intersectObjects(objects.filter(Boolean),true).filter(h=>h.object.isMesh&&!h.object.material?.transparent&&!h.object.userData.partyMarker);
    if(!hits.length)return;const hit=hits[0];if(this.placing&&this.selected==='toril'&&this.mode==='focus'){const local=this.focusBody.worldToLocal(hit.point.clone());this.onPosition(vectorLatLon(local.x,local.y,local.z));return;}
    if(this.mode==='system')this.onSelect(hit.object.userData.bodyId);
  }
  animate(time){if(!this.alive)return;this.frame=requestAnimationFrame(t=>this.animate(t));if(!this.visible||document.hidden||time-(this.lastFrame??0)<30)return;this.lastFrame=time;
    this.controls.update();for(const b of [this.bodies.get('amaunator'),this.focusBody])if(b?.userData.sunMaterial)b.userData.sunMaterial.uniforms.time.value=time/1000;
    this.draw();
  }
  draw(){if(!this.alive)return;this.renderer.render(this.mode==='system'?this.system:this.focusScene,this.camera);
    if(this.mode==='system'){const occupied=[];for(const label of this.labels.children){const b=this.bodies.get(label.dataset.body);if(!b)continue;const p=b.position.clone().add(new T.Vector3(0,bodySize(label.dataset.body)+2,0)).project(this.camera);label.hidden=p.z>1||p.z< -1;let x=(p.x*.5+.5)*this.host.clientWidth,y=(-p.y*.5+.5)*this.host.clientHeight;const width=label.textContent.length*6+14;for(let i=0;i<4&&occupied.some(b=>Math.abs(x-b.x)<(width+b.w)/2&&Math.abs(y-b.y)<18);i++)y-=18;occupied.push({x,y,w:width});label.style.left=`${x}px`;label.style.top=`${y}px`;}}
  }
  dispose(){this.alive=false;this.sequence++;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.controls.dispose();this.renderer.domElement.removeEventListener('pointerdown',this.down);this.renderer.domElement.removeEventListener('pointerup',this.up);
    for(const scene of [this.system,this.focusScene])disposeBody(scene);this.renderer.dispose();this.renderer.forceContextLoss();this.host.replaceChildren();this.bodies.clear();this.focusBody=null;this.partyMarker=null;clearSurfaces();
  }
}

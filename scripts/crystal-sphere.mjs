import * as T from './vendor/three.mjs';

export const SPHERE_RADIUS=650;
// Illustrative temporary passages, not a canonical navigation chart.
export const PASSAGES=[[-.63,.35,-.69,.085],[.62,.44,-.65,.095],[.1,-.63,-.77,.075],[-.92,-.22,-.32,.065],[.9,.38,.2,.07]].map(([x,y,z,size])=>({normal:new T.Vector3(x,y,z).normalize(),size}));
const vertex=`varying vec3 localPoint;varying vec3 worldPoint;void main(){localPoint=position;worldPoint=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(worldPoint,1.);}`;
const noise=`
float hash(vec3 p){p=fract(p*.3183099+vec3(.11,.23,.37));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float n=noise3(p)*.57;n+=noise3(p*2.07+11.)*.28;n+=noise3(p*4.13+29.)*.15;return n;}
vec3 rainbow(float t){return .44+.31*cos(6.28318*(t+vec3(0.,.34,.67)));}
`;
function inscriptionTexture(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');let seed=417;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};ctx.strokeStyle='#9fbed1';ctx.lineWidth=1.6;ctx.lineCap='round';
  for(let y=0;y<8;y++)for(let x=0;x<16;x++){if(rand()>.22)continue;ctx.save();ctx.translate(x*64+32,y*64+32);ctx.rotate((rand()-.5)*.25);ctx.beginPath();ctx.moveTo(-5,-20);ctx.lineTo(4,18);ctx.moveTo(-5,-20);ctx.lineTo(-17,-7);ctx.lineTo(4,2);if(rand()>.5){ctx.moveTo(-1,-8);ctx.lineTo(16,-16);ctx.lineTo(12,5);}else{ctx.moveTo(2,7);ctx.lineTo(-14,15);ctx.lineTo(-5,23);}if(rand()>.4){ctx.moveTo(9,10);ctx.lineTo(19,15);ctx.lineTo(13,22);}ctx.stroke();ctx.restore();}
  const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;return texture;
}

export class CrystalSphere {
  constructor(scene){
    this.alive=true;
    this.group=new T.Group();this.group.name='Toril Crystal Sphere';scene.add(this.group);
    this.view={value:new T.Vector3(0,.46,.888).normalize()};this.cutaway={value:1};this.time={value:0};
    const portals=PASSAGES.map(p=>new T.Vector4(p.normal.x,p.normal.y,p.normal.z,Math.cos(p.size)));
    this.inscriptions=inscriptionTexture();
    this.shellMaterial=new T.ShaderMaterial({side:T.DoubleSide,uniforms:{viewDir:this.view,cutaway:this.cutaway,time:this.time,portals:{value:portals},inscriptions:{value:this.inscriptions}},vertexShader:vertex,fragmentShader:`
      uniform vec3 viewDir;uniform float cutaway;uniform float time;uniform vec4 portals[5];uniform sampler2D inscriptions;varying vec3 localPoint;varying vec3 worldPoint;${noise}
      void main(){vec3 n=normalize(localPoint);float facing=dot(n,viewDir);if(cutaway>.5&&facing>.24)discard;
        float aperture=0.;for(int i=0;i<5;i++){float d=dot(n,portals[i].xyz);if(d>portals[i].w)discard;aperture=max(aperture,1.-smoothstep(0.,.002,portals[i].w-d));}
        float grain=fbm(n*28.);float rim=pow(1.-abs(dot(n,normalize(cameraPosition-worldPoint))),3.5);
        vec2 uv=vec2(atan(n.z,n.x)/6.28318,asin(n.y)/3.14159);float glyph=texture2D(inscriptions,uv*5.).a;
        vec3 color=mix(vec3(.009,.014,.033),vec3(.025,.037,.065),grain);color+=vec3(.015,.025,.045)*(.5+.5*n.y);color+=vec3(.025,.05,.075)*pow(max(0.,dot(n,normalize(vec3(-.45,.65,.7)))),2.);color+=vec3(.1,.19,.25)*glyph*.22;
        color+=mix(vec3(.08,.22,.35),vec3(.26,.12,.32),grain)*rim*.65;
        color+=vec3(.17,.34,.4)*aperture*.7;
        if(cutaway>.5)color+=vec3(.3,.42,.5)*(1.-smoothstep(.0,.012,.24-facing));
        gl_FragColor=vec4(color,1.);
      }`});
    this.shell=new T.Mesh(new T.SphereGeometry(SPHERE_RADIUS,160,96),this.shellMaterial);this.group.add(this.shell);
    this.volumeMaterial=new T.ShaderMaterial({side:T.BackSide,transparent:true,depthWrite:false,uniforms:{viewDir:this.view,cutaway:this.cutaway,time:this.time,flowMap:{value:null}},vertexShader:vertex,fragmentShader:`
      uniform vec3 viewDir;uniform float cutaway;uniform float time;uniform sampler2D flowMap;varying vec3 worldPoint;${noise}
      void main(){vec3 ro=cameraPosition,rd=normalize(worldPoint-ro);float b=dot(ro,rd),c=dot(ro,ro)-960.*960.,disc=b*b-c;if(disc<0.)discard;float start=max(0.,-b-sqrt(disc)),end=-b+sqrt(disc);float stepSize=(end-start)/16.;vec4 sum=vec4(0.);
        float jitter=hash(vec3(gl_FragCoord.xy,3.));
        for(int i=0;i<16;i++){float t=start+(float(i)+jitter)*stepSize;vec3 p=ro+rd*t;float radius=length(p);if(radius<655.||radius>950.)continue;
          vec3 n=p/radius;if(cutaway>.5&&dot(n,viewDir)>.1&&length(p-viewDir*dot(p,viewDir))<680.)continue;
          vec3 q=p*.003;float slow=time*.012;vec3 warp=vec3(fbm(q*1.8+slow),fbm(q*1.8+8.-slow),fbm(q*1.8+17.));float f=fbm(q*3.4+warp*2.3+vec3(slow,0.,-slow));
          vec3 blend=abs(n);blend/=blend.x+blend.y+blend.z;vec3 tc=p*.00048+vec3(.5)+vec3(slow*.01,0.,-slow*.008);vec3 art=texture2D(flowMap,tc.xy).rgb*blend.z+texture2D(flowMap,tc.yz).rgb*blend.x+texture2D(flowMap,tc.zx).rgb*blend.y;float light=dot(art,vec3(.25,.5,.25));
          float stream=sin(q.y*4.+q.x*1.4+warp.x*6.+slow)*.5+.5;float density=smoothstep(.03,.6,light)*(.25+.75*f)*(.5+.5*stream);density*=smoothstep(655.,690.,radius)*(1.-smoothstep(880.,950.,radius));
          float a=1.-exp(-density*stepSize*.025);vec3 col=art*(.7+f*.8)+vec3(.05,.07,.1)*pow(f,4.);
          sum.rgb+=(1.-sum.a)*a*col;sum.a+=(1.-sum.a)*a;if(sum.a>.98)break;
        }gl_FragColor=vec4(sum.rgb/max(.001,sum.a),sum.a*.14);
      }`});
    const volume=new T.Mesh(new T.SphereGeometry(960,64,40),this.volumeMaterial);volume.renderOrder=4;this.group.add(volume);
    this.cloudMaterials=[];this.cloudLayers=[];
    for(let i=0;i<5;i++){
      const material=new T.ShaderMaterial({side:T.BackSide,transparent:true,depthWrite:false,uniforms:{flowMap:{value:null},time:this.time,phase:{value:i*.73},cutaway:this.cutaway},vertexShader:vertex,fragmentShader:`
        uniform sampler2D flowMap;uniform float time;uniform float phase;uniform float cutaway;varying vec3 localPoint;varying vec3 worldPoint;${noise}
        void main(){vec3 n=normalize(localPoint);vec2 uv=vec2(atan(n.z,n.x)/6.28318+.5,asin(n.y)/3.14159+.5);uv*=mix(5.,1.,cutaway);uv.x+=phase*.21+time*.00025;uv.y+=sin(uv.x*8.+phase+time*.004)*.015;
          vec3 art=texture2D(flowMap,uv).rgb;float lum=dot(art,vec3(.25,.5,.25));float edge=abs(dot(normalize(worldPoint),normalize(cameraPosition-worldPoint)));float alpha=smoothstep(.008,.22,lum)*smoothstep(.02,.28,edge)*(.28+.15*fbm(n*12.+phase));
          gl_FragColor=vec4(art*2.1,alpha);
        }`});
      const layer=new T.Mesh(new T.SphereGeometry(1040-i*82,80,48),material);layer.rotation.set(i*.21,i*.47,i*.13);layer.renderOrder=i+5;this.group.add(layer);this.cloudMaterials.push(material);this.cloudLayers.push(layer);
    }
    this.ready=new T.TextureLoader().loadAsync('modules/realms-almanac/assets/atlas/phlogiston.png').then(texture=>{if(!this.alive){texture.dispose();return;}texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;this.flowTexture=texture;this.volumeMaterial.uniforms.flowMap.value=texture;for(const m of this.cloudMaterials)m.uniforms.flowMap.value=texture;});
    this.portals=PASSAGES.map((p,i)=>{const group=new T.Group();group.position.copy(p.normal).multiplyScalar(SPHERE_RADIUS);group.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),p.normal);group.userData.passage=i;
      const r=Math.sin(p.size)*SPHERE_RADIUS;const lip=new T.Mesh(new T.TorusGeometry(r,2.2,10,96),new T.MeshBasicMaterial({color:0x2f475c}));lip.userData.passage=i;group.add(lip);
      const halo=new T.Mesh(new T.TorusGeometry(r+2.8,.85,8,96),new T.MeshBasicMaterial({color:0x8dcecf,transparent:true,opacity:.48}));group.add(halo);
      const hitArea=new T.Mesh(new T.CircleGeometry(r,48),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));hitArea.userData.passage=i;group.add(hitArea);
      this.group.add(group);return group;});
    const pos=[],sizes=[];const random=i=>{const v=Math.sin(i*73.19+4)*17381.135;return v-Math.floor(v);};
    for(let i=0;i<1800;i++){const z=random(i*3)*2-1,a=random(i*3+1)*Math.PI*2,n=new T.Vector3(Math.sqrt(1-z*z)*Math.cos(a),z,Math.sqrt(1-z*z)*Math.sin(a));if(PASSAGES.some(p=>n.dot(p.normal)>Math.cos(p.size+.018)))continue;pos.push(...n.multiplyScalar(648).toArray());sizes.push(random(i*7)>.98?3.6:1.1+random(i*11)*1.4);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('pointSize',new T.Float32BufferAttribute(sizes,1));
    this.stars=new T.Points(geo,new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{viewDir:this.view,cutaway:this.cutaway},vertexShader:`attribute float pointSize;varying vec3 direction;void main(){direction=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=pointSize;}`,fragmentShader:`uniform vec3 viewDir;uniform float cutaway;varying vec3 direction;void main(){if(cutaway>.5&&dot(direction,viewDir)>.24)discard;float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(.7,.82,1.,pow(max(0.,1.-d),2.));}`}));this.group.add(this.stars);
  }
  update(camera,time,cutaway=true){this.view.value.copy(camera.position).normalize();this.cutaway.value=cutaway?1:0;this.time.value=matchMedia('(prefers-reduced-motion: reduce)').matches?0:time;for(let i=0;i<this.portals.length;i++)this.portals[i].visible=!cutaway||PASSAGES[i].normal.dot(this.view.value)<=.24;}
  dispose(){this.alive=false;this.flowTexture?.dispose();this.inscriptions?.dispose();}
}

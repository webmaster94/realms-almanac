import {mapUV,mapLatLon} from './atlas-state.mjs';
let atlasData;
export function loadAtlasData(){return atlasData??=fetch('modules/realms-almanac/assets/toril/atlas.json').then(r=>{if(!r.ok)throw new Error('The Toril atlas data could not be loaded.');return r.json();});}
export class AtlasMap {
  constructor(host,{world=false,onPlace}={}){
    this.host=host;this.world=world;this.onPlace=onPlace;this.alive=true;this.center={u:.5,v:.5};this.zoom=1;this.canvas=document.createElement('canvas');this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label',world?'Toril world map':'Linked regional map');host.append(this.canvas);this.ctx=this.canvas.getContext('2d');
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();this.zoomAt(Math.exp(-e.deltaY*.0012),e.offsetX,e.offsetY);},{passive:false});
    this.canvas.addEventListener('pointerdown',e=>{this.down={x:e.clientX,y:e.clientY,u:this.center.u,v:this.center.v};this.canvas.setPointerCapture(e.pointerId);});
    this.canvas.addEventListener('pointermove',e=>{if(!this.down)return;const {w,h}=this.imageSize();this.center.u=this.down.u-(e.clientX-this.down.x)/w;this.center.v=this.down.v-(e.clientY-this.down.y)/h;this.draw();});
    this.canvas.addEventListener('pointerup',e=>{if(!this.down)return;const click=Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)<5;this.down=null;if(click&&this.placing){const p=this.uvAt(e.offsetX,e.offsetY);if(p.u>=0&&p.u<=1&&p.v>=0&&p.v<=1)this.onPlace(this.world?mapLatLon(p.u,p.v):p);}});
    this.canvas.addEventListener('keydown',e=>{if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='-'||e.key==='+'||e.key==='=')this.zoomAt(e.key==='-'?.8:1.25,this.width/2,this.height/2);else{const size=this.imageSize();this.center.u+=(e.key==='ArrowLeft'?-.08:e.key==='ArrowRight'?.08:0)*this.width/size.w;this.center.v+=(e.key==='ArrowUp'?-.08:e.key==='ArrowDown'?.08:0)*this.height/size.h;this.draw();}}});
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
  }
  async load(src){const generation=this.loadGeneration=(this.loadGeneration??0)+1;const image=new Image();this.loadingImage=image;this.host.classList.add('loading');await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>!this.alive||generation!==this.loadGeneration?resolve():reject(new Error('The map image could not be loaded. Check the linked scene background.'));image.src=src;});if(!this.alive||generation!==this.loadGeneration)return;this.image=image;if(this.world){this.data=await loadAtlasData();if(!this.alive||generation!==this.loadGeneration)return;this.relief=new Image();this.relief.onload=()=>this.draw();this.relief.src='modules/realms-almanac/assets/toril/relief.webp';}this.host.classList.remove('loading');this.draw();}
  resize(){const r=this.host.getBoundingClientRect();if(!r.width||!r.height)return;this.width=r.width;this.height=r.height;const dpr=Math.min(devicePixelRatio,2);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.canvas.style.width=`${r.width}px`;this.canvas.style.height=`${r.height}px`;this.ctx.setTransform(dpr,0,0,dpr,0,0);this.draw();}
  imageSize(){if(!this.image)return {w:this.width??1,h:this.height??1};const scale=Math.min(this.width/this.image.width,this.height/this.image.height)*this.zoom;return {w:this.image.width*scale,h:this.image.height*scale};}
  uvAt(x,y){const s=this.imageSize();return {u:(x-this.width/2)/s.w+this.center.u,v:(y-this.height/2)/s.h+this.center.v};}
  screen(u,v){const s=this.imageSize();return {x:this.width/2+(u-this.center.u)*s.w,y:this.height/2+(v-this.center.v)*s.h};}
  zoomAt(factor,x,y){const before=this.uvAt(x,y);this.zoom=Math.max(1,Math.min(this.world?64:18,this.zoom*factor));const after=this.uvAt(x,y);this.center.u+=before.u-after.u;this.center.v+=before.v-after.v;this.draw();}
  fit(){this.center={u:.5,v:.5};this.zoom=1;this.draw();}
  focus(lat,lon,zoom=12){this.center=mapUV(lat,lon);this.zoom=zoom;this.draw();}
  findMarker(){if(!this.marker)return;this.center={u:this.marker.u,v:this.marker.v};this.zoom=this.world?18:3;this.draw();}
  setPlacement(value){this.placing=value;this.canvas.classList.toggle('placing',value);}
  setMarker(marker){this.marker=marker;this.draw();}
  draw(){if(!this.alive||!this.width)return;const ctx=this.ctx,w=this.width,h=this.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#07111c';ctx.fillRect(0,0,w,h);if(!this.image)return;const size=this.imageSize(),origin=this.screen(0,0);ctx.drawImage(this.image,origin.x,origin.y,size.w,size.h);
    if(this.world&&this.data){
      if(this.zoom>4&&this.data.vectors){
        ctx.fillStyle='#20495c';ctx.fillRect(0,0,w,h);const nw=this.uvAt(0,0),se=this.uvAt(w,h),bounds=[nw.u*360-180,90-se.v*180,se.u*360-180,90-nw.v*180];
        for(const f of this.data.vectors){const b=f.bounds;if(b[2]<bounds[0]||b[0]>bounds[2]||b[3]<bounds[1]||b[1]>bounds[3])continue;ctx.beginPath();for(const ring of f.rings){let first=true;for(const [lon,lat] of ring){const s=this.screen((lon+180)/360,(90-lat)/180);if(first){ctx.moveTo(s.x,s.y);first=false;}else ctx.lineTo(s.x,s.y);}if(!f.line)ctx.closePath();}
          const color=Array.isArray(f.fill)?`rgb(${f.fill.join(',')})`:f.fill==='land'?'#949f72':'#27556a';if(f.line){ctx.strokeStyle='#3e798b';ctx.lineWidth=1.1;ctx.stroke();}else{ctx.fillStyle=color;ctx.fill('evenodd');if(f.fill==='water'){ctx.strokeStyle='#6695a0';ctx.lineWidth=.7;ctx.stroke();}}
        }
        if(this.relief?.complete&&this.relief.naturalWidth){ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.65;ctx.drawImage(this.relief,origin.x,origin.y,size.w,size.h);ctx.restore();}
      }
      const items=this.zoom>6?this.data.places:this.data.regions;ctx.textBaseline='middle';ctx.font=this.zoom>6?'12px Georgia':'13px Georgia';const occupied=[];
      for(const place of [...items].sort((a,b)=>a.rank-b.rank)){if(this.zoom<2&&place.rank>2)continue;const uv=mapUV(place.lat,place.lon),p=this.screen(uv.u,uv.v);if(p.x<10||p.x>w-10||p.y<10||p.y>h-10)continue;const text=place.name,tw=ctx.measureText(text).width;const box={x:p.x+6,y:p.y-7,w:tw+5,h:14};if(occupied.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y))continue;occupied.push(box);ctx.fillStyle='#e9dcba';if(this.zoom>6){ctx.beginPath();ctx.arc(p.x,p.y,2.1,0,Math.PI*2);ctx.fill();}ctx.lineWidth=3;ctx.strokeStyle='#07121ddd';ctx.strokeText(text,p.x+6,p.y);ctx.fillText(text,p.x+6,p.y);}
    }
    if(this.marker){const p=this.screen(this.marker.u,this.marker.v);ctx.save();ctx.shadowColor='#eeb964';ctx.shadowBlur=15;ctx.fillStyle='#ffe3a0';ctx.strokeStyle='#211d24';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-7,p.y-12);ctx.arc(p.x,p.y-14,7,Math.PI,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.font='bold 13px Georgia';ctx.textAlign='center';ctx.strokeStyle='#07111c';ctx.lineWidth=4;const label=this.marker.label??'The Party';ctx.strokeText(label,p.x,p.y-31);ctx.fillText(label,p.x,p.y-31);ctx.restore();}
    ctx.fillStyle='rgba(5,10,20,.72)';ctx.fillRect(10,h-31,230,22);ctx.fillStyle='#d3c5a4';ctx.font='11px sans-serif';ctx.fillText(this.world?'Toril GIS · Geospatial Grimoire':'Linked Scene · Original Map',18,h-16);
  }
  dispose(){this.alive=false;this.observer.disconnect();if(this.loadingImage&&!this.loadingImage.complete)this.loadingImage.src='';this.host.replaceChildren();this.image=null;}
}

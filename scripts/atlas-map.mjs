import {mapUV,mapLatLon} from './atlas-state.mjs';
import {AtlasRuler} from './atlas-ruler.mjs';
import {TORIL_CIRCUMFERENCE_MILES} from './atlas-scale.mjs';
import {AtlasPolitics,loadPolitics} from './atlas-politics.mjs';
import {labelGroup} from './atlas-labels.mjs';
export const ATLAS_FILTERS={borders:true,countries:true,regions:true,water:true,settlements:true,terrain:true,party:true};
let atlasData,cartographyData;
export function loadAtlasData(){return atlasData??=fetch('modules/realms-almanac/assets/toril/atlas.json').then(r=>{if(!r.ok)throw new Error('The Toril atlas data could not be loaded.');return r.json();});}
const cartography=()=>cartographyData??=fetch('modules/realms-almanac/assets/toril/cartography.json').then(r=>{if(!r.ok)throw new Error('The illustrated atlas could not be loaded.');return r.json();});
const BASE='modules/realms-almanac/assets/toril/';
export class AtlasMap {
  constructor(host,{world=false,onPlace,filters={},onFilters,onMeasure}={}){
    Object.assign(this,{host,world,onPlace,alive:true,center:{u:.5,v:.5},zoom:1,tiles:new Map(),hits:[],tileUse:0});
    this.filters={...ATLAS_FILTERS,...filters};this.onFilters=onFilters;this.onMeasure=onMeasure;this.ruler=new AtlasRuler();
    this.canvas=document.createElement('canvas');this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label',world?'Illustrated Atlas of Toril':'Linked regional map');host.append(this.canvas);this.ctx=this.canvas.getContext('2d');
    this.canvas.addEventListener('wheel',e=>{e.preventDefault();e.stopPropagation();this.zoomAt(Math.exp(-e.deltaY*.0012),e.offsetX,e.offsetY);},{passive:false});
    this.canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.canvas.focus({preventScroll:true});if(this.world&&(this.rulerMode||e.ctrlKey||e.metaKey)){e.preventDefault();const p=this.measurePoint(e);if(this.ruler.moving&&(e.ctrlKey||e.metaKey))this.ruler.waypoint(p);else this.ruler.start(p);this.measureDrag=true;this.canvas.setPointerCapture(e.pointerId);this.draw();return;}this.down={x:e.clientX,y:e.clientY,u:this.center.u,v:this.center.v};this.canvas.setPointerCapture(e.pointerId);});
    this.canvas.addEventListener('pointermove',e=>{if(this.world&&this.ruler.moving){this.ruler.move(this.measurePoint(e));this.draw();return;}if(this.down){const {w,h}=this.imageSize();this.center.u=this.down.u-(e.clientX-this.down.x)/w;this.center.v=this.down.v-(e.clientY-this.down.y)/h;this.constrain();this.draw();}else{const hit=this.hit(e.offsetX,e.offsetY);this.canvas.style.cursor=this.placing||this.rulerMode?'crosshair':hit?'pointer':'grab';this.canvas.title=this.rulerMode?'Drag to measure. Ctrl-click adds a waypoint. Right-click removes one. Esc clears.':hit?.place.name??'';}});
    this.canvas.addEventListener('pointerup',e=>{if(this.measureDrag){this.measureDrag=false;this.ruler.move(this.measurePoint(e));if(!e.ctrlKey&&!e.metaKey)this.ruler.finish();this.draw();return;}if(!this.down)return;const click=Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)<5;this.down=null;if(!click)return;const p=this.uvAt(e.offsetX,e.offsetY);if(this.placing){if(p.u>=0&&p.u<=1&&p.v>=0&&p.v<=1)this.onPlace(this.world?mapLatLon(p.u,p.v):p);}else{const hit=this.hit(e.offsetX,e.offsetY);if(hit)this.select(hit.place);}});
    this.canvas.addEventListener('pointercancel',()=>{this.down=null;this.measureDrag=false;this.ruler.finish();});
    this.canvas.addEventListener('contextmenu',e=>{if(!this.ruler.points.length)return;e.preventDefault();this.ruler.remove();this.draw();});
    this.canvas.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.ruler.points.length){e.preventDefault();e.stopPropagation();this.ruler.clear();this.draw();}});
    this.canvas.addEventListener('keydown',e=>{if(['+','=','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(['-','+','='].includes(e.key))this.zoomAt(e.key==='-'?.8:1.25,this.width/2,this.height/2);else{const s=this.imageSize();this.center.u+=(e.key==='ArrowLeft'?-.08:e.key==='ArrowRight'?.08:0)*this.width/s.w;this.center.v+=(e.key==='ArrowUp'?-.08:e.key==='ArrowDown'?.08:0)*this.height/s.h;this.constrain();this.draw();}}});
    if(world)this.addControls();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
  }
  measurePoint(event){const uv=this.uvAt(event.offsetX,event.offsetY);return mapLatLon(Math.max(0,Math.min(1,uv.u)),Math.max(0,Math.min(1,uv.v)));}
  setRuler(value){this.rulerMode=value;this.rulerButton?.setAttribute('aria-pressed',String(value));if(value){this.onMeasure?.();this.setPlacement(false);}else this.ruler.finish();this.canvas.style.cursor=value?'crosshair':'grab';this.draw();}
  async loadBorders(){if(!this.world)return;try{const data=await loadPolitics();if(this.alive){this.politics=new AtlasPolitics(data);this.draw();}}catch(e){console.warn('Realms Almanac:',e.message);}}
  addControls(){
    const controls=document.createElement('div');controls.className='ra-map-controls';
    for(const [label,text,action]of [['Zoom In','+',()=>this.zoomAt(1.4,this.width/2,this.height/2)],['Zoom Out','−',()=>this.zoomAt(1/1.4,this.width/2,this.height/2)],['World Overview','⌂',()=>this.fit()]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.title=label;b.setAttribute('aria-label',label);b.addEventListener('click',action);controls.append(b);}this.host.append(controls);
    const utilities=document.createElement('div');utilities.className='ra-map-utilities';
    this.rulerButton=document.createElement('button');this.rulerButton.type='button';this.rulerButton.innerHTML='<i class="fa-solid fa-ruler"></i>';this.rulerButton.title='Measure Distance';this.rulerButton.setAttribute('aria-label','Measure Distance');this.rulerButton.setAttribute('aria-pressed','false');this.rulerButton.addEventListener('click',()=>this.setRuler(!this.rulerMode));utilities.append(this.rulerButton);
    const filterButton=document.createElement('button');filterButton.type='button';filterButton.innerHTML='<i class="fa-solid fa-sliders"></i>';filterButton.title='Map Filters';filterButton.setAttribute('aria-label','Map Filters');filterButton.setAttribute('aria-expanded','false');utilities.append(filterButton);this.host.append(utilities);
    const panel=document.createElement('fieldset');panel.className='ra-map-filters';panel.hidden=true;const legend=document.createElement('legend');legend.textContent='Map Filters';panel.append(legend);
    for(const [key,name]of Object.entries({borders:'Country Borders',countries:'Country Labels',regions:'Region & Continent Labels',water:'Water Labels',settlements:'Settlement Labels',terrain:'Terrain & Site Labels',party:'Party Marker'})){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=this.filters[key];input.addEventListener('change',()=>{this.filters[key]=input.checked;this.onFilters?.({...this.filters});this.draw();});label.append(input,document.createTextNode(name));panel.append(label);}
    filterButton.addEventListener('click',()=>{panel.hidden=!panel.hidden;filterButton.setAttribute('aria-expanded',String(!panel.hidden));});panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();panel.hidden=true;filterButton.setAttribute('aria-expanded','false');filterButton.focus();}});this.filterPanel=panel;this.host.append(panel);
    this.info=document.createElement('div');this.info.className='ra-map-location';this.info.hidden=true;this.host.append(this.info);
    this.nav=document.createElement('div');this.nav.className='ra-map-continents';this.nav.setAttribute('aria-label','Map Regions');this.host.append(this.nav);
  }
  async load(src){
    const generation=this.loadGeneration=(this.loadGeneration??0)+1;this.illustrated=this.world&&(!src||src===BASE+'surface.webp'||src===BASE+'cartography.webp');
    const image=new Image();this.loadingImage=image;this.host.classList.add('loading');await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>!this.alive||generation!==this.loadGeneration?resolve():reject(new Error('The map image could not be loaded.'));image.src=this.illustrated?BASE+'cartography.webp':src;});
    if(!this.alive||generation!==this.loadGeneration)return;this.image=image;
    if(this.world){this.data=await loadAtlasData();if(this.illustrated)this.carto=await cartography();if(!this.alive||generation!==this.loadGeneration)return;
      const pathFor=(rings,closed=true)=>{const path=new Path2D();for(const ring of rings){ring.forEach(([lon,lat],i)=>{const u=(lon+180)/360,v=(90-lat)/180;i?path.lineTo(u,v):path.moveTo(u,v);});if(closed)path.closePath();}return path;};
      this.mapPaths=this.data.vectors.map(f=>({...f,path:pathFor(f.rings,!f.line)}));this.coasts=this.mapPaths.filter(f=>f.fill==='land'||f.fill==='water');
      this.mountainPaths=(this.carto?.mountains??[]).map(rings=>{const points=rings.flat();return {path:pathFor(rings),bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]};});
      if(this.illustrated){this.makePatterns();this.symbols=new Image();await new Promise((resolve,reject)=>{this.symbols.onload=resolve;this.symbols.onerror=()=>reject(new Error('Map symbols could not be loaded.'));this.symbols.src='modules/realms-almanac/assets/atlas/terrain-symbols.png';});if(!this.alive)return;}
      this.nav.replaceChildren();for(const place of this.carto?.continents??[]){const b=document.createElement('button');b.type='button';b.textContent=place.name;b.addEventListener('click',()=>this.select({...place,kind:place.name==='Lopango'?'Region':'Continent'}));this.nav.append(b);}
    }
    this.host.classList.remove('loading');this.draw();void this.loadBorders();
  }
  resize(){const r=this.host.getBoundingClientRect();if(!r.width||!r.height)return;this.width=r.width;this.height=r.height;const dpr=Math.min(devicePixelRatio,2);this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.canvas.style.width=`${r.width}px`;this.canvas.style.height=`${r.height}px`;this.ctx.setTransform(dpr,0,0,dpr,0,0);this.constrain();this.draw();}
  imageSize(){if(!this.image)return {w:this.width??1,h:this.height??1};const scale=Math.min(this.width/this.image.width,this.height/this.image.height)*this.zoom;return {w:this.image.width*scale,h:this.image.height*scale};}
  uvAt(x,y){const s=this.imageSize();return {u:(x-this.width/2)/s.w+this.center.u,v:(y-this.height/2)/s.h+this.center.v};}
  screen(u,v){const s=this.imageSize();return {x:this.width/2+(u-this.center.u)*s.w,y:this.height/2+(v-this.center.v)*s.h};}
  constrain(){if(!this.world||!this.image)return;const s=this.imageSize(),u=Math.min(.5,this.width/s.w/2),v=Math.min(.5,this.height/s.h/2);this.center.u=Math.max(u,Math.min(1-u,this.center.u));this.center.v=Math.max(v,Math.min(1-v,this.center.v));}
  zoomAt(factor,x,y){const before=this.uvAt(x,y);this.zoom=Math.max(1,Math.min(this.world?64:18,this.zoom*factor));const after=this.uvAt(x,y);this.center.u+=before.u-after.u;this.center.v+=before.v-after.v;this.constrain();this.draw();}
  fit(){this.center={u:.5,v:.5};this.zoom=1;this.selected=null;if(this.info)this.info.hidden=true;this.draw();}
  focus(lat,lon,zoom=12){this.center=mapUV(lat,lon);this.zoom=Math.max(1,Math.min(64,zoom));this.constrain();this.draw();}
  findMarker(){if(!this.marker)return;this.center={u:this.marker.u,v:this.marker.v};this.zoom=this.world?18:3;this.constrain();this.draw();}
  setPlacement(value){this.placing=value;if(value){this.rulerMode=false;this.ruler.finish();this.rulerButton?.setAttribute('aria-pressed','false');}this.canvas.classList.toggle('placing',value);}
  setMarker(marker){this.marker=marker;this.draw();}
  hit(x,y){return this.hits.find(h=>x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h);}
  select(place){this.selected=place;if(place.bounds){const b=place.bounds;const z=Math.min(360/(b.east-b.west),180/(b.north-b.south))*.75;this.focus(place.lat,place.lon,Math.max(place.kind==='Continent'?3.2:2,z));}else this.focus(place.lat,place.lon,Math.max(this.zoom,18));if(this.info){this.info.replaceChildren();const name=document.createElement('strong'),kind=document.createElement('small'),close=document.createElement('button');name.textContent=place.name;kind.textContent=place.kind??'Region';close.type='button';close.textContent='×';close.title='Close Place Details';close.addEventListener('click',()=>{this.info.hidden=true;this.selected=null;this.draw();});this.info.append(name,kind,close);this.info.hidden=false;}this.draw();}
  queueDraw(){if(this.queued||!this.alive)return;this.queued=requestAnimationFrame(()=>{this.queued=0;this.draw();});}
  makePatterns(){
    const random=(i,s=0)=>{const n=Math.sin(i*127.1+s*311.7)*43758.5453;return n-Math.floor(n);};this.patterns={};
    const palette={land:[207,204,159],sea:[65,122,148],forest:[134,157,107],desert:[224,200,149],ice:[224,234,223],wetland:[147,174,143],mountain:[207,200,164]};
    for(const [kind,rgb]of Object.entries(palette)){
      const c=document.createElement('canvas');c.width=c.height=256;const cx=c.getContext('2d'),pixels=cx.createImageData(256,256),grid=Array.from({length:64},(_,i)=>random(i,11));
      for(let y=0;y<256;y++)for(let x=0;x<256;x++){const a=x/32,b=y/32,ix=Math.floor(a),iy=Math.floor(b),u=a-ix,v=b-iy;const sample=(dx,dy)=>grid[((iy+dy)%8)*8+(ix+dx)%8];const n=(sample(0,0)*(1-u)+sample(1,0)*u)*(1-v)+(sample(0,1)*(1-u)+sample(1,1)*u)*v;const grain=(n-.5)*20+(random(y*256+x,6)-.5)*8,k=(y*256+x)*4;for(let j=0;j<3;j++)pixels.data[k+j]=rgb[j]+grain;pixels.data[k+3]=255;}
      cx.putImageData(pixels,0,0);
      this.patterns[kind]=this.ctx.createPattern(c,'repeat');
    }
  }
  vectorCartography(ctx,size,origin){
    if(!this.illustrated||this.zoom<3)return;const alpha=Math.min(1,(this.zoom-3)/1.6),nw=this.uvAt(0,0),se=this.uvAt(this.width,this.height),bounds=[nw.u*360-180,90-se.v*180,se.u*360-180,90-nw.v*180],visible=f=>{const b=f.bounds;return !(b[2]<bounds[0]||b[0]>bounds[2]||b[3]<bounds[1]||b[1]>bounds[3]);};
    const paths=this.mapPaths.filter(visible);ctx.save();ctx.globalAlpha=alpha;ctx.translate(origin.x,origin.y);ctx.scale(size.w,size.h);for(const p of Object.values(this.patterns))p.setTransform(new DOMMatrix().scale(1/size.w,1/size.h));
    ctx.fillStyle=this.patterns.sea;ctx.fillRect(0,0,1,1);
    for(const f of paths.filter(f=>f.fill==='land')){for(const [width,color]of [[12,'#83aeb8'],[7,'#a0c4c4'],[3,'#ced8be']]){ctx.strokeStyle=color;ctx.lineWidth=width/size.w;ctx.stroke(f.path);}ctx.fillStyle=this.patterns.land;ctx.fill(f.path,'evenodd');ctx.strokeStyle='#566a52';ctx.lineWidth=.8/size.w;ctx.stroke(f.path);}
    const forests=new Set(['41,82,51','58,95,58','66,99,87']);
    for(const f of paths){if(!Array.isArray(f.fill))continue;const key=f.fill.join(','),kind=forests.has(key)?'forest':f.fill[0]>200?'ice':f.fill[0]>160?'desert':'wetland';ctx.fillStyle=this.patterns[kind];ctx.fill(f.path,'evenodd');}
    ctx.save();ctx.globalAlpha*=.22;for(const f of this.mountainPaths.filter(visible)){ctx.fillStyle=this.patterns.mountain;ctx.fill(f.path,'evenodd');}ctx.restore();
    for(const f of paths.filter(f=>f.fill==='water')){if(!f.line){ctx.fillStyle=this.patterns.sea;ctx.fill(f.path,'evenodd');}ctx.strokeStyle=f.line?'#548598':'#476f80';ctx.lineWidth=(f.line?1.7:1.2)/size.w;ctx.stroke(f.path);}
    ctx.restore();
  }
  detailTiles(ctx,size,origin){
    if(!this.carto||size.w<3000)return;const tile=this.carto.tileSize,cols=this.carto.width/tile,rows=this.carto.height/tile,nw=this.uvAt(0,0),se=this.uvAt(this.width,this.height);
    const x0=Math.max(0,Math.floor(nw.u*cols)),x1=Math.min(cols-1,Math.floor(se.u*cols)),y0=Math.max(0,Math.floor(nw.v*rows)),y1=Math.min(rows-1,Math.floor(se.v*rows));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const key=`${x}-${y}`;let entry=this.tiles.get(key);if(!entry){const image=new Image();entry={image,used:++this.tileUse,ready:false};this.tiles.set(key,entry);image.onload=()=>{if(!this.alive)return;entry.ready=true;this.queueDraw();};image.onerror=()=>{entry.failed=true;};image.src=BASE+`tiles/${key}.webp`;}entry.used=++this.tileUse;if(entry.ready)ctx.drawImage(entry.image,origin.x+x/cols*size.w,origin.y+y/rows*size.h,size.w/cols+.3,size.h/rows+.3);}
    if(this.tiles.size>64){const oldest=[...this.tiles].sort((a,b)=>a[1].used-b[1].used).slice(0,this.tiles.size-64);for(const [key]of oldest)this.tiles.delete(key);}
  }
  terrainSymbols(ctx){
    if(!this.symbols?.complete||!this.carto||this.zoom<4.2)return;
    const size=this.imageSize(),w=this.width,h=this.height,cellW=this.symbols.naturalWidth/4,cellH=this.symbols.naturalHeight/2,spacing=size.w/2048*3;
    ctx.save();ctx.globalAlpha=Math.min(.94,(this.zoom-4.2)/1.3);
    const render=(anchors,row,desired)=>{const stride=Math.max(1,Math.round(desired/spacing));for(const [lon,lat,value,r,c]of anchors??[]){if(r%stride||c%stride)continue;const p=this.screen((lon+180)/360,(90-lat)/180);if(p.x< -60||p.x>w+60||p.y< -60||p.y>h+60)continue;const variant=row?value:(r+c)%4,drawW=row?30:42+Math.min(value,6000)/400,drawH=drawW;ctx.drawImage(this.symbols,variant*cellW,row*cellH,cellW,cellH,p.x-drawW/2,p.y-drawH*.68,drawW,drawH);}};
    render(this.carto.forestAnchors,1,24);render(this.carto.mountainAnchors,0,36);ctx.restore();
  }
  labels(ctx){
    const w=this.width,h=this.height,occupied=[{x:0,y:0,w:315,h:55},{x:w-65,y:0,w:65,h:200},{x:w-200,y:h-88,w:200,h:88}];if(this.info&&!this.info.hidden)occupied.push({x:10,y:55,w:250,h:80});this.hits=[];ctx.textBaseline='middle';
    const broad=this.zoom<2.5,prominent=new Set(['Waterdeep','Neverwinter',"Baldur's Gate",'Silverymoon','Calimport','Suzail','Eltabbar','Bezantur','Athkatla','Tyraturos']);
    const items=broad?[...(this.carto?.continents??[]).map(p=>({...p,rank:0,kind:p.name==='Lopango'?'Region':'Continent'})),...(this.carto?.oceans??[]).map(p=>({...p,rank:1,kind:'Ocean'}))]:[...this.data.regions.map(p=>({...p,kind:'Region',priority:p.rank+2})),...this.data.places.filter(p=>this.zoom>=7||p.kind==='City'||prominent.has(p.name)).map(p=>({...p,major:prominent.has(p.name),priority:prominent.has(p.name)?0:p.kind==='City'?1:3}))].sort((a,b)=>(a.priority??0)-(b.priority??0));
    for(const place of items){if(this.filters?.[labelGroup(place)]===false)continue;const uv=mapUV(place.lat,place.lon),p=this.screen(uv.u,uv.v);if(p.x<16||p.x>w-16||p.y<22||p.y>h-48)continue;
      const ocean=place.kind==='Ocean',region=place.kind==='Region',large=place.kind==='Continent';if(region&&this.zoom>22)continue;
      const text=large?place.name.toLocaleUpperCase():place.name,size=large?Math.min(23,16+this.zoom*3):ocean?15:region?19:place.major?15:place.kind==='City'?14:12;
      ctx.font=`${ocean||region?'italic ':large||place.kind==='City'||place.major?'bold ':''}${size}px Georgia,serif`;ctx.textAlign=large||ocean||region?'center':'left';const tw=ctx.measureText(text).width;let x=ctx.textAlign==='center'?p.x-tw/2:p.x+7;x=Math.max(12,Math.min(w-tw-16,x));const y=p.y-size/2,box={x:x-3,y:y-3,w:tw+6,h:size+6};
      if(occupied.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y))continue;
      if(p.y<55&&p.x<315)continue;occupied.push(box);if(!ocean)this.hits.push({...box,place});
      if(!large&&!ocean&&!region){ctx.fillStyle='#473f30';ctx.beginPath();ctx.arc(p.x,p.y,place.kind==='City'?3.5:2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#e8ddbd';ctx.lineWidth=1;ctx.stroke();}
      const tx=ctx.textAlign==='center'?x+tw/2:x;ctx.lineJoin='round';ctx.lineWidth=large?3:ocean?2:3;ctx.strokeStyle=ocean?'#1d4f68cc':'#f0e7cbbb';ctx.strokeText(text,tx,p.y);ctx.fillStyle=ocean?'#cfdfd3':large?'#38463d':region?'#5b4f36':'#2d372f';ctx.fillText(text,tx,p.y);
    }
    ctx.textAlign='left';
  }
  decoration(ctx,size,origin){
    const w=this.width,h=this.height;
    ctx.save();ctx.strokeStyle='#d7c8a580';ctx.lineWidth=1;ctx.strokeRect(Math.max(7,origin.x+7),Math.max(7,origin.y+7),Math.min(w-14,size.w-14),Math.min(h-14,size.h-14));
    // Compass and a latitude-aware approximate distance scale.
    const x=w-37,y=166;ctx.fillStyle='#e9dfbc';ctx.strokeStyle='#294c51';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,y-24);ctx.lineTo(x-6,y+12);ctx.lineTo(x,y+5);ctx.lineTo(x+6,y+12);ctx.closePath();ctx.fill();ctx.stroke();ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillText('N',x,y-32);
    const latitude=90-this.center.v*180,milesPerPixel=TORIL_CIRCUMFERENCE_MILES*Math.cos(latitude*Math.PI/180)/size.w;const target=120*milesPerPixel,power=10**Math.floor(Math.log10(Math.max(.001,target))),distance=[1,2,5,10].map(n=>n*power).filter(n=>n<=target).at(-1)??power,bar=distance/milesPerPixel;
    ctx.fillStyle='#102d39cf';ctx.fillRect(w-185,h-74,170,48);ctx.strokeStyle='#e6ddbf';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w-169,h-41);ctx.lineTo(w-169+bar,h-41);ctx.moveTo(w-169,h-45);ctx.lineTo(w-169,h-37);ctx.moveTo(w-169+bar,h-45);ctx.lineTo(w-169+bar,h-37);ctx.stroke();ctx.font='11px Georgia';ctx.textAlign='left';ctx.fillStyle='#e6ddbf';ctx.fillText(`≈ ${distance.toLocaleString()} miles`,w-169,h-58);ctx.restore();
  }
  draw(){
    if(!this.alive||!this.width)return;const ctx=this.ctx,w=this.width,h=this.height;ctx.clearRect(0,0,w,h);ctx.fillStyle=this.world?'#153447':'#07111c';ctx.fillRect(0,0,w,h);if(!this.image)return;const size=this.imageSize(),origin=this.screen(0,0);ctx.drawImage(this.image,origin.x,origin.y,size.w,size.h);
    if(this.world&&this.data){this.detailTiles(ctx,size,origin);this.vectorCartography(ctx,size,origin);this.terrainSymbols(ctx);this.politics?.draw(this,ctx);this.labels(ctx);this.decoration(ctx,size,origin);}
    if(this.selected&&!this.selected.bounds){const uv=mapUV(this.selected.lat,this.selected.lon),p=this.screen(uv.u,uv.v);ctx.strokeStyle='#a34e35';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.stroke();}
    if(this.marker&&this.filters?.party!==false){const p=this.screen(this.marker.u,this.marker.v);ctx.save();ctx.shadowColor='#eeb964';ctx.shadowBlur=12;ctx.fillStyle='#ffe3a0';ctx.strokeStyle='#342d24';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-7,p.y-12);ctx.arc(p.x,p.y-14,7,Math.PI,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.font='bold 13px Georgia';ctx.textAlign='center';ctx.strokeStyle='#152c35';ctx.lineWidth=4;const label=this.marker.label??'The Party';ctx.strokeText(label,p.x,p.y-31);ctx.fillText(label,p.x,p.y-31);ctx.restore();}
    this.ruler?.draw(this,ctx);
    ctx.fillStyle='rgba(10,29,37,.8)';ctx.fillRect(10,h-29,this.world?251:230,21);ctx.fillStyle='#dfd5b5';ctx.font='10px Georgia';ctx.fillText(this.world?'Toril Atlas · Geography by Geospatial Grimoire':'Linked Scene · Original Map',18,h-15);
  }
  dispose(){this.alive=false;cancelAnimationFrame(this.queued);this.observer.disconnect();if(this.loadingImage&&!this.loadingImage.complete)this.loadingImage.src='';for(const e of this.tiles.values()){e.image.onload=null;e.image.onerror=null;}this.tiles.clear();this.host.replaceChildren();this.image=null;}
}

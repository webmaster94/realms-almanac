import {AtlasMap,loadAtlasData} from './atlas-map.mjs';
import {mapUV} from './atlas-state.mjs';
import {atlasCatalog,labelVisible,labelAppearance,labelCandidates,labelPriority,tilePresent,tilePath} from './atlas-labels.mjs';
const manifests=new Map();
export function loadRasterManifest(url){if(!manifests.has(url))manifests.set(url,fetch(url).then(r=>{if(!r.ok)throw new Error('The campaign map pack could not be loaded.');return r.json();}).catch(e=>{manifests.delete(url);throw e;}));return manifests.get(url);}
const intersects=(a,b)=>a.west<b.east&&a.east>b.west&&a.south<b.north&&a.north>b.south;
export class RasterAtlas extends AtlasMap {
  async loadPack(url,sourceId){
    this.packURL=new URL(url,location.href);this.pack=await loadRasterManifest(url);if(!this.alive)return;
    this.sourceId=sourceId;const regional=sourceId?this.pack.regional.find(s=>s.id===sourceId):null;this.layers=sourceId?[regional,...(regional?.details??[])]:this.pack.layers;
    if(!this.layers?.length||this.layers.some(s=>!s))throw new Error('This map is not present in the campaign map pack.');
    this.image={width:sourceId?this.layers[0].width:3600,height:sourceId?this.layers[0].height:1800};
    this.data=await loadAtlasData();this.catalog=atlasCatalog(this.data,this.pack);this.carto={continents:this.pack.continents??[],oceans:this.pack.oceans??[]};
    if(!this.alive)return;
    this.nav?.replaceChildren();for(const place of this.pack.destinations??[]){const b=document.createElement('button');b.type='button';b.textContent=place.name;b.addEventListener('click',()=>this.focus(place.lat,place.lon,place.zoom));this.nav?.append(b);}
    this.host.classList.remove('loading');this.resize();void this.loadBorders();
  }
  detailZoomLimit(){
    if(!this.image||!this.layers?.length)return 1;
    const fit=Math.min(this.width/this.image.width,this.height/this.image.height);
    if(!this.world){const u=this.center.u,v=1-this.center.v;return Math.max(1,...this.layers.filter(l=>!l.bounds||(u>=l.bounds.west&&u<=l.bounds.east&&v>=l.bounds.south&&v<=l.bounds.north)).map(l=>1.5*l.width/(fit*this.image.width*(l.bounds?l.bounds.east-l.bounds.west:1))));}
    const lon=this.center.u*360-180,lat=90-this.center.v*180;
    if(this.pack?.resolutionZones){const zones=this.pack.resolutionZones.filter(z=>lon>=z.bounds.west&&lon<=z.bounds.east&&lat>=z.bounds.south&&lat<=z.bounds.north);return Math.max(1,...zones.map(z=>1.5*z.pixelsPerDegree*360/(fit*this.image.width)));}
    const layers=this.layers.filter(l=>lon>=l.bounds.west&&lon<=l.bounds.east&&lat>=l.bounds.south&&lat<=l.bounds.north);
    return Math.max(1,...layers.map(l=>1.5*l.width/(fit*this.image.width*(l.bounds.east-l.bounds.west)/360)));
  }
  constrain(){super.constrain();if(this.image&&this.layers?.length)this.zoom=Math.min(this.zoom,this.detailZoomLimit());}
  zoomAt(factor,x,y){const before=this.uvAt(x,y);this.zoom=Math.max(1,Math.min(this.detailZoomLimit(),this.zoom*factor));const after=this.uvAt(x,y);this.center.u+=before.u-after.u;this.center.v+=before.v-after.v;this.constrain();this.draw();}
  focus(lat,lon,zoom=18){this.center=mapUV(lat,lon);this.zoom=Math.max(1,Math.min(this.detailZoomLimit(),zoom));this.constrain();this.draw();}
  findMarker(){if(!this.marker)return;this.center={u:this.marker.u,v:this.marker.v};this.zoom=this.world?110:3;this.constrain();this.draw();}
  entry(key,path){let e=this.tiles.get(key);if(!e){const image=new Image();e={image,ready:false,used:0};this.tiles.set(key,e);image.onload=()=>{if(!this.alive)return;e.ready=true;this.queueDraw();};image.onerror=()=>{e.failed=true;};image.src=new URL(path,this.packURL).href;}e.used=++this.tileUse;return e;}
  drawLayer(ctx,layer){
    const size=this.imageSize(),b=layer.bounds??{west:0,east:1,south:0,north:1},nw=this.uvAt(0,0),se=this.uvAt(this.width,this.height);
    const view=this.world?{west:nw.u*360-180,east:se.u*360-180,north:90-nw.v*180,south:90-se.v*180}:{west:nw.u,east:se.u,north:1-nw.v,south:1-se.v};
    if(!intersects(b,view)||this.zoom<(layer.minZoom??1))return false;
    let coverage=1;if(this.world&&layer.requireFullView){const vw=view.east-view.west,vh=view.north-view.south;const margin=Math.min((view.west-b.west)/vw,(b.east-view.east)/vw,(view.south-b.south)/vh,(b.north-view.north)/vh);coverage=Math.max(0,Math.min(1,margin/.1));coverage=coverage*coverage*(3-2*coverage);if(!coverage)return false;}
    const u=this.world?(b.west+180)/360:b.west,v=this.world?(90-b.north)/180:1-b.north,origin=this.screen(u,v),dw=(b.east-b.west)/(this.world?360:1)*size.w,dh=(b.north-b.south)/(this.world?180:1)*size.h;
    const alpha=coverage*(layer.fadeZoom?Math.min(1,(this.zoom-(layer.minZoom??1))/layer.fadeZoom):1),target=ctx,dpr=Math.min(devicePixelRatio,2);this.layerCanvas??=document.createElement('canvas');const buffer=this.layerCanvas;if(buffer.width!==this.canvas.width||buffer.height!==this.canvas.height){buffer.width=this.canvas.width;buffer.height=this.canvas.height;}ctx=buffer.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,this.width,this.height);ctx.save();
    const preview=this.entry(layer.id+'/preview',layer.preview);let hasPixels=preview.ready;if(preview.ready)ctx.drawImage(preview.image,origin.x,origin.y,dw,dh);
    const desired=dw*Math.min(devicePixelRatio,2);const level=layer.levels.find(l=>l.width>=desired)??layer.levels.at(-1);
    // Draw progressively finer loaded levels; holes retain the preceding resolution.
    for(const l of layer.levels){if(l.width>level.width)break;const cols=Math.ceil(l.width/l.tileSize),rows=Math.ceil(l.height/l.tileSize),x0=Math.max(0,Math.floor(-origin.x/dw*l.width/l.tileSize)),x1=Math.min(cols-1,Math.floor((this.width-origin.x)/dw*l.width/l.tileSize)),y0=Math.max(0,Math.floor(-origin.y/dh*l.height/l.tileSize)),y1=Math.min(rows-1,Math.floor((this.height-origin.y)/dh*l.height/l.tileSize));
      for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(!tilePresent(l,x,y))continue;const path=tilePath(l,x,y),entry=this.entry(layer.id+'/'+l.width+'/'+x+'/'+y,path);if(!entry.ready)continue;hasPixels=true;const tw=Math.min(l.tileSize,l.width-x*l.tileSize),th=Math.min(l.tileSize,l.height-y*l.tileSize),dx=Math.round((origin.x+x*l.tileSize/l.width*dw)*dpr)/dpr,dy=Math.round((origin.y+y*l.tileSize/l.height*dh)*dpr)/dpr,ex=Math.round((origin.x+(x*l.tileSize+tw)/l.width*dw)*dpr)/dpr,ey=Math.round((origin.y+(y*l.tileSize+th)/l.height*dh)*dpr)/dpr;ctx.clearRect(dx,dy,ex-dx,ey-dy);const gutter=l.gutter??0;ctx.drawImage(entry.image,gutter,gutter,tw,th,dx,dy,ex-dx,ey-dy);}}
    ctx.restore();target.save();target.globalAlpha=alpha;target.drawImage(buffer,0,0,this.width,this.height);target.restore();return hasPixels&&alpha>0;
  }
  labels(ctx){
    const places=this.world?(this.catalog??=atlasCatalog(this.data,this.pack)):this.layers[0].labels??[];
    const pixelsPerDegree=this.imageSize().w/360;
    const occupied=this.world?[{x:0,y:0,w:315,h:55},{x:this.width-110,y:0,w:110,h:220},{x:this.width-200,y:this.height-88,w:200,h:88}]:[];
    if(this.filterPanel&&!this.filterPanel.hidden)occupied.push({x:this.width-310,y:10,w:215,h:265});
    if(this.marker&&this.filters?.party!==false){const p=this.screen(this.marker.u,this.marker.v);occupied.push({x:p.x-85,y:p.y-44,w:170,h:25});}
    this.hits=[];ctx.textBaseline='middle';ctx.textAlign='center';
    for(const p of [...places].sort((a,b)=>labelPriority(a)-labelPriority(b))){
      if(this.world&&!this.pack?.catalog&&(this.activeLayers??[]).some(l=>l.replaceLabels&&p.lon>=l.bounds.west&&p.lon<=l.bounds.east&&p.lat>=l.bounds.south&&p.lat<=l.bounds.north))continue;
      if(!labelVisible(p,this.zoom,pixelsPerDegree,this.filters))continue;
      const uv=this.world?mapUV(p.lat,p.lon):{u:p.x/this.image.width,v:p.y/this.image.height},s=this.screen(uv.u,uv.v);
      if(s.x<8||s.y<45||s.x>this.width-20||s.y>this.height-35)continue;
      const appearance=labelAppearance(p),{size}=appearance,lines=p.displayLines??[p.name];ctx.font=appearance.font;
      const width=Math.max(...lines.map(line=>ctx.measureText(line).width))+6,height=lines.length*(size+3)+3;
      const box=labelCandidates(p,s,width,height).find(box=>box.x>=8&&box.y>=45&&box.x+box.w<=this.width-8&&box.y+box.h<=this.height-35&&!occupied.some(b=>box.x<b.x+b.w&&box.x+box.w>b.x&&box.y<b.y+b.h&&box.y+box.h>b.y));
      if(!box)continue;occupied.push(box);this.hits.push({...box,place:p});
      if(appearance.dot){ctx.beginPath();ctx.arc(s.x,s.y,p.kind==='City'?3.4:2.3,0,Math.PI*2);ctx.fillStyle='#302d27';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#f6efd7';ctx.stroke();}
      ctx.lineJoin='round';ctx.lineWidth=3;ctx.strokeStyle='#f2e8cedd';ctx.fillStyle=appearance.color;
      for(let i=0;i<lines.length;i++){const y=box.cy+(i-(lines.length-1)/2)*(size+3);ctx.strokeText(lines[i],box.cx,y);ctx.fillText(lines[i],box.cx,y);}
    }
    ctx.textAlign='left';
  }
  select(place){if(this.world){if(!place.bounds)this.focus(place.lat,place.lon,Math.max(this.zoom,Math.min(300,(place.minZoom??12)*2),place.kind==='City'?75:18));return super.select(place);}this.center={u:place.x/this.image.width,v:place.y/this.image.height};this.zoom=Math.max(this.zoom,4);this.draw();}
  draw(){
    if(!this.alive||!this.width)return;const ctx=this.ctx,w=this.width,h=this.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#264a59';ctx.fillRect(0,0,w,h);if(!this.image||!this.layers)return;
    this.activeLayers=[];for(const l of this.layers)if(this.drawLayer(ctx,l))this.activeLayers.push(l);
    this.politics?.draw(this,ctx);this.labels(ctx);if(this.world)this.decoration(ctx,this.imageSize(),this.screen(0,0));
    if(this.marker&&this.filters?.party!==false){const p=this.screen(this.marker.u,this.marker.v);ctx.save();ctx.fillStyle='#ffe2a0';ctx.strokeStyle='#342d24';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-7,p.y-12);ctx.arc(p.x,p.y-14,7,Math.PI,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.font='bold 13px Georgia';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#183844';ctx.strokeText(this.marker.label??'The Party',p.x,p.y-32);ctx.fillText(this.marker.label??'The Party',p.x,p.y-32);ctx.restore();}
    this.ruler?.draw(this,ctx);
    const current=this.activeLayers.at(-1);ctx.fillStyle='#18323ddc';ctx.fillRect(10,h-29,Math.min(w-210,440),21);ctx.fillStyle='#eee2c8';ctx.font='10px Georgia';ctx.textAlign='left';ctx.fillText(current?.credit??'Loading Map Tiles…',18,h-15);
    if(this.tiles.size>360){for(const [key,e] of [...this.tiles].sort((a,b)=>a[1].used-b[1].used).slice(0,this.tiles.size-360)){e.image.onload=null;e.image.onerror=null;this.tiles.delete(key);}}
  }
}

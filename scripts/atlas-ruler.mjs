import {TORIL_RADIUS_MILES} from './atlas-scale.mjs';
import {mapUV} from './atlas-state.mjs';
const rad=Math.PI/180;
export function atlasDistance(a,b){
  const aLat=a.lat*rad,bLat=b.lat*rad,dlon=(b.lon-a.lon)*rad;
  const cross=Math.hypot(Math.cos(bLat)*Math.sin(dlon),Math.cos(aLat)*Math.sin(bLat)-Math.sin(aLat)*Math.cos(bLat)*Math.cos(dlon));
  const dot=Math.sin(aLat)*Math.sin(bLat)+Math.cos(aLat)*Math.cos(bLat)*Math.cos(dlon);
  return TORIL_RADIUS_MILES*Math.atan2(cross,dot);
}
export function atlasRoute(points){
  const segments=points.slice(1).map((p,i)=>atlasDistance(points[i],p));
  return {segments,total:segments.reduce((a,b)=>a+b,0)};
}
export function greatCircle(a,b){
  const vector=p=>[Math.cos(p.lat*rad)*Math.cos(p.lon*rad),Math.sin(p.lat*rad),Math.cos(p.lat*rad)*Math.sin(p.lon*rad)];
  const u=vector(a),v=vector(b),angle=Math.acos(Math.max(-1,Math.min(1,u.reduce((n,x,i)=>n+x*v[i],0))));
  const count=Math.max(2,Math.ceil(angle/rad));
  return Array.from({length:count+1},(_,i)=>{
    const t=i/count;
    if(angle<1e-7)return {...a};
    if(Math.abs(Math.sin(angle))<1e-7){
      const axis=Math.abs(u[1])<.9?[0,1,0]:[1,0,0],dot=u.reduce((n,x,j)=>n+x*axis[j],0),q=axis.map((x,j)=>x-dot*u[j]),length=Math.hypot(...q);
      const x=u.map((n,j)=>n*Math.cos(angle*t)+q[j]/length*Math.sin(angle*t));
      return i===count?{...b}:{lat:Math.atan2(x[1],Math.hypot(x[0],x[2]))/rad,lon:Math.atan2(x[2],x[0])/rad};
    }
    const x=u.map((n,j)=>(n*Math.sin((1-t)*angle)+v[j]*Math.sin(t*angle))/Math.sin(angle));
    return {lat:Math.atan2(x[1],Math.hypot(x[0],x[2]))/rad,lon:Math.atan2(x[2],x[0])/rad};
  });
}
export const formatMiles=n=>`${n.toLocaleString(undefined,{maximumFractionDigits:n<10?2:n<100?1:0})} mi`;
export class AtlasRuler {
  constructor(){this.points=[];this.moving=false;}
  start(point){this.points=[point,point];this.moving=true;}
  move(point){if(this.moving)this.points[this.points.length-1]=point;}
  waypoint(point){if(!this.points.length)return this.start(point);this.points=[...this.points.slice(0,-1),point,point];this.moving=true;}
  finish(){this.moving=false;}
  remove(){if(this.points.length>2)this.points.splice(-2,1);else this.clear();}
  clear(){this.points=[];this.moving=false;}
  get measurement(){return atlasRoute(this.points);}
  draw(map,ctx){
    if(this.points.length<2)return;
    const screen=p=>{const uv=mapUV(p.lat,p.lon);return map.screen(uv.u,uv.v);},route=this.measurement;
    ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
    for(let i=1;i<this.points.length;i++){
      const arc=greatCircle(this.points[i-1],this.points[i]);
      ctx.beginPath();let previous;
      for(const p of arc){const s=screen(p);if(!previous||Math.abs(s.x-previous.x)>map.imageSize().w/2)ctx.moveTo(s.x,s.y);else ctx.lineTo(s.x,s.y);previous=s;}
      ctx.lineWidth=5;ctx.strokeStyle='#13202dcc';ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#f4dc89';ctx.stroke();
      if(this.points.length>2){const s=screen(arc[Math.floor(arc.length/2)]);this.label(ctx,formatMiles(route.segments[i-1]),s.x,s.y-12,map);}
    }
    for(const p of this.points){const s=screen(p);ctx.beginPath();ctx.arc(s.x,s.y,4,0,2*Math.PI);ctx.fillStyle='#f4dc89';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#172731';ctx.stroke();}
    const end=screen(this.points.at(-1));this.label(ctx,`${formatMiles(route.total)}${this.points.length>2?' Total':''}`,end.x,end.y+25,map);
    ctx.restore();
  }
  label(ctx,text,x,y,map){ctx.font='bold 12px Georgia';const w=ctx.measureText(text).width+16;x=Math.max(w/2+8,Math.min(map.width-w/2-8,x));y=Math.max(65,Math.min(map.height-90,y));ctx.fillStyle='#122a39ed';ctx.fillRect(x-w/2,y-11,w,23);ctx.fillStyle='#ffedb8';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y+1);}
}

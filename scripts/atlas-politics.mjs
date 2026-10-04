import {TORIL_CIRCUMFERENCE_MILES} from './atlas-scale.mjs';
let data;
export function loadPolitics(){return data??=fetch('modules/realms-almanac/assets/toril/politics.json').then(r=>{if(!r.ok)throw new Error('Country borders could not be loaded.');return r.json();}).catch(e=>{data=null;throw e;});}
const smooth=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
export function politicalOpacity(milesPerPixel){return smooth(.45,1,milesPerPixel)*(1-smooth(7,18,milesPerPixel));}
export class AtlasPolitics {
  constructor(source){
    this.countries=source.countries.map(country=>{
      const path=new Path2D();
      for(const polygon of country.polygons)for(const ring of polygon){ring.forEach(([lon,lat],i)=>i?path.lineTo(lon,-lat):path.moveTo(lon,-lat));path.closePath();}
      const outline=new Path2D();for(const ring of country.outlineRings??country.polygons.flatMap(p=>[p[0]])){ring.forEach(([lon,lat],i)=>i?outline.lineTo(lon,-lat):outline.moveTo(lon,-lat));outline.closePath();}
      return {...country,path,outline};
    });
  }
  draw(map,ctx){
    if(map.filters?.borders===false)return;
    const size=map.imageSize(),latitude=90-map.center.v*180,opacity=politicalOpacity(TORIL_CIRCUMFERENCE_MILES*Math.cos(latitude*Math.PI/180)/size.w);
    if(opacity<.005)return;
    const ppd=size.w/360,origin=map.screen(.5,.5),nw=map.uvAt(0,0),se=map.uvAt(map.width,map.height);
    ctx.save();ctx.translate(origin.x,origin.y);ctx.scale(ppd,ppd);ctx.lineJoin='round';
    for(const c of this.countries){
      const b=c.bounds;if(b.east<nw.u*360-180||b.west>se.u*360-180||b.north<90-se.v*180||b.south>90-nw.v*180)continue;
      ctx.save();ctx.clip(c.path,'evenodd');ctx.fillStyle=c.color;ctx.globalAlpha=.018*opacity;ctx.fill(c.path,'evenodd');
      // Nested strokes are clipped inward. Their screen-space width never moves the border.
      for(const [width,alpha]of [[72,.009],[48,.015],[30,.025],[16,.035],[7,.035]]){ctx.lineWidth=width/ppd;ctx.strokeStyle=c.color;ctx.globalAlpha=alpha*opacity;ctx.stroke(c.outline);}
      ctx.restore();ctx.save();ctx.lineWidth=1.25/ppd;ctx.strokeStyle=c.color;ctx.globalAlpha=.75*opacity;ctx.shadowColor=c.color;ctx.shadowBlur=4;ctx.stroke(c.outline);ctx.restore();
    }
    ctx.restore();
  }
}

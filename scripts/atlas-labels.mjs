// Display and search share these records. Loading a sharper image never changes an anchor.
const normalize=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
export const isSettlement=p=>['City','Town','Village','Settlement'].includes(p.kind);
const family=p=>isSettlement(p)?'settlement':p.kind??'Region';
export function atlasCatalog(data,pack={}){
  if(pack.catalog)return pack.catalog;
  const records=new Map();
  const add=p=>records.set(`${family(p)}:${normalize(p.name)}`,p);
  for(const p of data.regions??[])add({...p,kind:'Region',minZoom:3});
  for(const p of data.places??[])add(p);
  for(const p of pack.continents??[])add({...p,kind:'Continent',minZoom:1,maxZoom:4});
  for(const p of pack.oceans??[])add({...p,kind:'Water',minZoom:1});
  for(const l of pack.layers??[])for(const p of l.labels??[])add({...p,searchOnly:!!p.searchOnly&&!isSettlement(p),minZoom:Math.min(p.minZoom??6,isSettlement(p)?6:3)});
  return [...records.values()];
}
export function searchAtlas(catalog,query){
  const q=normalize(query.trim());
  return catalog.filter(p=>[p.name,...(p.aliases??[])].some(name=>normalize(name).includes(q))).sort((a,b)=>Number(normalize(b.name)===q)-Number(normalize(a.name)===q)||(a.rank??3)-(b.rank??3)).slice(0,10);
}
export function labelGroup(p){return isSettlement(p)?'settlements':p.kind==='Country'?'countries':['Water','Ocean','River'].includes(p.kind)?'water':['Region','Continent'].includes(p.kind)?'regions':'terrain';}
export function labelPriority(p){
  if(p.kind==='Continent')return -6;
  if(p.kind==='City'&&(p.rank??3)<=0)return -5;
  if(p.kind==='Country')return -4;
  if(p.kind==='Water'&&(p.rank??3)<=0)return -3;
  if(p.anchorType==='collective-region-label')return -2;
  return (p.rank??3)+(p.kind==='Terrain'?5:p.kind==='Region'?3:0);
}
export function labelVisible(p,zoom,pixelsPerDegree,filters={}){
  if(filters[labelGroup(p)]===false)return false;
  if(p.searchOnly||zoom<(p.minZoom??(isSettlement(p)?6:3))||zoom>(p.maxZoom??Infinity))return false;
  // The original Thay artwork already contains these names at native scale.
  if(p.printedLabelPixels&&pixelsPerDegree*p.printedLabelPixels/p.sourcePixelsPerDegree>=9)return false;
  return true;
}
export function labelCandidates(p,point,width,height){
  const geographic=!isSettlement(p),water=['Water','Ocean','River'].includes(p.kind),offsets=water||!geographic&&!labelAppearance(p).dot?[[0,0]]:geographic?[[0,0],[0,-height-10],[0,height+10],[-width*.65,0],[width*.65,0],[0,-height*2-18]]:[[7+width/2,0]];
  return offsets.map(([dx,dy])=>({x:point.x+dx-width/2,y:point.y+dy-height/2,w:width,h:height,cx:point.x+dx,cy:point.y+dy}));
}
export function labelAppearance(p){
  const water=['Water','Ocean','River'].includes(p.kind),city=p.kind==='City';
  const size=p.kind==='Continent'?21:p.kind==='Country'?19:p.kind==='Region'?16:city?15:water?15:13;
  return {size,font:`${water?'italic ':city||p.kind==='Country'?'bold ':''}${size}px Georgia,serif`,color:water?'#245b77':p.kind==='Country'?'#713c32':'#292e27',dot:isSettlement(p)&&p.anchorType!=='label-center'&&p.preciseMarker!==false};
}
export function tilePresent(level,x,y){return !level.coverage||level.coverage.some(([x0,y0,x1,y1])=>x>=x0&&x<=x1&&y>=y0&&y<=y1);}
export function tilePath(level,x,y){return level.overrides?.[`${x},${y}`]??level.template.replace('{x}',x).replace('{y}',y);}

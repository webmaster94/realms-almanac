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
  return catalog.filter(p=>normalize(p.name).includes(q)).sort((a,b)=>Number(normalize(b.name)===q)-Number(normalize(a.name)===q)||(a.rank??3)-(b.rank??3)).slice(0,10);
}
export function labelVisible(p,zoom,pixelsPerDegree){
  if(p.searchOnly||zoom<(p.minZoom??(isSettlement(p)?6:3))||zoom>(p.maxZoom??Infinity))return false;
  // The original Thay artwork already contains these names at native scale.
  if(p.printedLabelPixels&&pixelsPerDegree*p.printedLabelPixels/p.sourcePixelsPerDegree>=9)return false;
  return true;
}
export function labelAppearance(p){
  const water=['Water','Ocean','River'].includes(p.kind),city=p.kind==='City';
  const size=p.kind==='Continent'?21:p.kind==='Country'?19:p.kind==='Region'?16:city?15:water?15:13;
  return {size,font:`${water?'italic ':city||p.kind==='Country'?'bold ':''}${size}px Georgia,serif`,color:water?'#245b77':p.kind==='Country'?'#713c32':'#292e27',dot:isSettlement(p)&&p.anchorType!=='label-center'&&p.preciseMarker!==false};
}
export function tilePresent(level,x,y){return !level.coverage||level.coverage.some(([x0,y0,x1,y1])=>x>=x0&&x<=x1&&y>=y0&&y<=y1);}

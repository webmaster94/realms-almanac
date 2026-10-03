import test from 'node:test';
import assert from 'node:assert/strict';
import {RasterAtlas} from '../scripts/atlas-raster.mjs';

const context=()=>new Proxy({measureText:s=>({width:s.length*7})},{get:(o,k)=>o[k]??(()=>{})});
function map(world=true){
  const m=Object.create(RasterAtlas.prototype);Object.assign(m,{alive:true,world,width:1200,height:600,zoom:10,center:{u:(-74+180)/360,v:(90-43)/180},image:{width:3600,height:1800},ctx:context(),canvas:{width:1200,height:600},tiles:new Map(),tileUse:0,carto:{continents:[],oceans:[]},data:{places:[]},layers:[]});
  m.layerCanvas={width:1200,height:600,getContext:()=>context()};m.entry=()=>({ready:true,image:{}});m.decoration=()=>{};return m;
}
test('printed map labels suppress displaced GIS labels throughout the fade',()=>{
  const old=globalThis.devicePixelRatio;globalThis.devicePixelRatio=1;
  try{const m=map();m.data.places=[{name:'Waterdeep',kind:'City',lat:43,lon:-74,minZoom:6}];m.layers=[{id:'sword-coast',bounds:{west:-93,east:-50,south:29,north:54},minZoom:8,fadeZoom:6,replaceLabels:true,preview:'test.webp',levels:[]}];m.draw();assert.equal(m.hits.some(h=>h.place.name==='Waterdeep'),false,'A printed Waterdeep label is visible, so the offset GIS label must be suppressed');}finally{globalThis.devicePixelRatio=old;}
});
test('regional zoom cannot enlarge native source pixels past its detail limit',()=>{
  const m=map(false);m.image={width:7200,height:7800};m.zoom=1;m.center={u:.5,v:.5};m.layers=[{width:7200,height:7800,levels:[{width:7200,height:7800}]}];m.draw=()=>{};m.zoomAt(1000,600,300);assert.ok(m.imageSize().w/7200<=1.5,'Zoom exceeds 150% of native detail');
});
test('a close-up layer stays hidden when its perimeter would be visible',()=>{
  const old=globalThis.devicePixelRatio;globalThis.devicePixelRatio=1;
  try{const m=map();m.zoom=70;m.center={u:(-77.25+180)/360,v:(90-53.18)/180};m.layers=[{id:'icewind',width:3264,bounds:{west:-78.6,east:-75.6,south:52.2,north:53.97},minZoom:36,fadeZoom:14,requireFullView:true,preview:'test.webp',levels:[]}];m.draw();assert.equal(m.activeLayers.length,0);}finally{globalThis.devicePixelRatio=old;}
});
test('native regional detail extends zoom only inside its registered crop',()=>{
  const m=map(false);m.image={width:7200,height:7800};m.zoom=1;m.center={u:.63,v:.423};m.layers=[{width:7200,height:7800},{width:1316,height:1196,bounds:{west:4300/7200,east:4850/7200,north:1-3100/7800,south:1-3600/7800}}];m.draw=()=>{};m.zoomAt(1000,600,300);assert.ok(m.zoom>40);assert.ok(m.imageSize().w*(550/7200)/1316<=1.5+1e-9);m.center={u:.1,v:.1};m.constrain();assert.ok(m.imageSize().w/7200<=1.5+1e-9);
});

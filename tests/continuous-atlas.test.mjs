import test from 'node:test';
import assert from 'node:assert/strict';
import {atlasCatalog,searchAtlas,labelAppearance,tilePresent} from '../scripts/atlas-labels.mjs';
import {RasterAtlas} from '../scripts/atlas-raster.mjs';
import {mapUV} from '../scripts/atlas-state.mjs';
const source={id:'waterdeep-city',name:'Waterdeep',kind:'City',lon:-73.62374441716413,lat:44.934880515914955,rank:0,minZoom:5,preciseMarker:true};
const region={id:'waterdeep-region',name:'Waterdeep',kind:'Region',lon:-73,lat:45,rank:2,searchOnly:true};
const sea={id:'trackless',name:'Trackless Sea',kind:'Water',lon:-86.57,lat:47.27,minZoom:1,rank:0};
const country={id:'thay',name:'Thay',kind:'Country',lon:-37,lat:35,minZoom:3,rank:0};
function mapAt(p,zoom,catalog){const m=Object.create(RasterAtlas.prototype);Object.assign(m,{world:true,width:1600,height:900,image:{width:3600,height:1800},center:mapUV(p.lat,p.lon),zoom,catalog,pack:{catalog},data:{places:[],regions:[]},activeLayers:[],marker:null});return m;}
const context=()=>new Proxy({measureText:s=>({width:s.length*7})},{get:(o,k)=>o[k]??(()=>{})});
test('Waterdeep drawing and search retain the exact same anchor through every zoom and tile load',()=>{
  const catalog=[source,region];
  for(const zoom of [5,6,12,24,48,96])for(const activeLayers of [[],[{id:'continent'}],[{id:'detail',labels:[{...source,lat:45.2}]}]]){
    const m=mapAt(source,zoom,catalog);m.activeLayers=activeLayers;m.labels(context());
    const hit=m.hits.find(h=>h.place.id===source.id);assert.ok(hit);assert.strictEqual(hit.place,searchAtlas(catalog,'Waterdeep')[0]);
    assert.equal(hit.place.lat,source.lat);assert.equal(hit.place.lon,source.lon);
    assert.equal(m.hits.some(h=>h.place.id===region.id),false);
  }
});
test('countries and waters remain drawn and searchable at regional zoom',()=>{
  for(const p of [sea,country])for(const zoom of [3,6,12,24]){
    const m=mapAt(p,zoom,[p]);m.labels(context());assert.strictEqual(m.hits[0].place,p);assert.strictEqual(searchAtlas([p],p.name)[0],p);
  }
});
test('geographic and text-only anchors never acquire settlement dots',()=>{
  for(const kind of ['Country','Region','Water','River','Terrain','Route','Landmark','Site'])assert.equal(labelAppearance({kind}).dot,false);
  assert.equal(labelAppearance({...source,preciseMarker:false}).dot,false);
  assert.equal(labelAppearance(source).dot,true);
});
test('same-named city and jurisdiction remain separate catalog records',()=>{
  const entries=atlasCatalog({places:[source],regions:[region]},{layers:[]});assert.equal(entries.length,2);
});
test('sparse high-resolution levels request only baked tiles',()=>{
  const level={coverage:[[12,15,18,21],[25,30,26,31]]};assert.ok(tilePresent(level,12,21));assert.ok(tilePresent(level,26,31));assert.equal(tilePresent(level,19,21),false);assert.ok(tilePresent({},0,0));
});

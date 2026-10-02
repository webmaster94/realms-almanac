import test from 'node:test';
import assert from 'node:assert/strict';
import {ringPosition,planetStates,planetArt} from '../scripts/planets.mjs';
import {mapUV,mapLatLon,globeVector,vectorLatLon,orbitPositions,tokenMapUV,ATLAS_DEFAULT} from '../scripts/atlas-state.mjs';
test('visible planets occupy the matching east or west half of the ring',()=>{
  const east=ringPosition(.2),west=ringPosition(.8);
  assert.ok(east.x<160);assert.ok(west.x>160);
  assert.ok(Math.abs(Math.hypot(east.x-160,east.y+30)-137)<1e-9);
  const bodies=planetStates({days:47600,hour:2});
  const art=planetArt(bodies);
  for(const p of bodies)assert.equal(art.includes(`data-planet="${p.id}"`),p.reason==='Visible');
});
test('flat map and globe positions use the same latitude/longitude convention',()=>{
  for(const [lat,lon] of [[34.8422,-36.4764],[-50,120],[0,0],[75,-170]]){
    const uv=mapUV(lat,lon),a=mapLatLon(uv.u,uv.v),b=vectorLatLon(...globeVector(lat,lon,4.6));
    assert.ok(Math.abs(a.lat-lat)<1e-8&&Math.abs(a.lon-lon)<1e-8);
    assert.ok(Math.abs(b.lat-lat)<1e-8&&Math.abs(b.lon-lon)<1e-8);
  }
});
test('system diagram retains the orbital angles used by the sky calculation',()=>{
  const sky=planetStates({days:47300,hour:22}),system=orbitPositions(47300);
  for(const p of sky){const s=system.find(s=>s.id===p.id);assert.equal(s.angle,p.angle);assert.ok(Math.abs(Math.hypot(s.x,s.z)-s.orbit)<1e-9);}
});
test('new worlds require regional linking and do not hard-code a campaign scene',()=>{
  assert.equal(ATLAS_DEFAULT.regional.sceneUuid,'');assert.equal(ATLAS_DEFAULT.party,null);
});
test('linked token coordinates account for the scene margin and token center',()=>{
  const scene={dimensions:{sceneX:100,sceneY:200,sceneWidth:1000,sceneHeight:500},toObject:()=>({grid:{size:100}})};
  assert.deepEqual(tokenMapUV(scene,{x:550,y:400,width:1,height:1}),{u:.5,v:.5});
});

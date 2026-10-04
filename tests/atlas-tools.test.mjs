import test from 'node:test';
import assert from 'node:assert/strict';
import {AtlasRuler,atlasDistance,atlasRoute,greatCircle} from '../scripts/atlas-ruler.mjs';
import {TORIL_CIRCUMFERENCE_MILES,ORBIT_SPREAD,SYSTEM_RADII} from '../scripts/atlas-scale.mjs';
import {orbitPositions} from '../scripts/atlas-state.mjs';
import {politicalOpacity} from '../scripts/atlas-politics.mjs';
test('atlas ruler uses the map sphere and shortest path across the meridian',()=>{
  const degree=TORIL_CIRCUMFERENCE_MILES/360;
  assert.ok(Math.abs(atlasDistance({lat:0,lon:0},{lat:0,lon:1})-degree)<1e-8);
  assert.ok(Math.abs(atlasDistance({lat:0,lon:179},{lat:0,lon:-179})-2*degree)<1e-8);
  assert.ok(Math.abs(atlasDistance({lat:60,lon:0},{lat:60,lon:1})-degree/2)<.001);
  const p=greatCircle({lat:55,lon:-30},{lat:55,lon:30});assert.ok(p[Math.floor(p.length/2)].lat>55);
});
test('ruler waypoints keep cumulative miles when measurements are extended and removed',()=>{
  const r=new AtlasRuler(),a={lat:0,lon:0},b={lat:0,lon:1},c={lat:1,lon:1};
  r.start(a);r.move(b);r.waypoint(b);r.move(c);r.finish();
  assert.deepEqual(r.points,[a,b,c]);assert.equal(r.measurement.total,atlasRoute([a,b,c]).total);
  r.remove();assert.deepEqual(r.points,[a,c]);r.clear();assert.equal(r.measurement.total,0);
});
test('country boundaries fade out at world and local travel scales',()=>{
  assert.equal(politicalOpacity(.2),0);assert.equal(politicalOpacity(25),0);assert.equal(politicalOpacity(2),1);
  assert.ok(politicalOpacity(.7)>0&&politicalOpacity(.7)<1);
});
test('solar distances expand fourfold with coherent size-class ordering',()=>{
  assert.equal(ORBIT_SPREAD,4);assert.deepEqual(orbitPositions(0).map(p=>p.orbit),[220,360,540,712,892,1260,1520,1780]);
  assert.ok(SYSTEM_RADII.amaunator>SYSTEM_RADII.coliar&&SYSTEM_RADII.coliar>SYSTEM_RADII.chandos&&SYSTEM_RADII.chandos>SYSTEM_RADII.toril&&SYSTEM_RADII.toril>SYSTEM_RADII.karpri&&SYSTEM_RADII.karpri>SYSTEM_RADII.anadia);
});

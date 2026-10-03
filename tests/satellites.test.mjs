import test from 'node:test';
import assert from 'node:assert/strict';
import {lunarPositions,tearOffsets,LUNAR_RADIUS} from '../scripts/satellites.mjs';
test('Selune, the Tears and Bral share a Toril-centered lunar orbit',()=>{
  const toril={x:135,z:0,angle:0};
  for(const phase of [0,.25,.5,.75,1]){
    const p=lunarPositions(toril,phase);
    for(const b of [p.moon,p.tears,p.bral])assert.ok(Math.abs(Math.hypot(b.x-toril.x,b.z-toril.z)-LUNAR_RADIUS)<1e-9);
    const moonAngle=Math.atan2(p.moon.z-toril.z,p.moon.x-toril.x),bralAngle=Math.atan2(p.bral.z-toril.z,p.bral.x-toril.x);
    assert.ok(Math.abs(((moonAngle-bralAngle+Math.PI*2)%(Math.PI*2))-.84)<1e-9);
  }
});
test('the asteroid field is deterministic, trailing, and leaves Bral a clear berth',()=>{
  const rocks=tearOffsets();assert.deepEqual(rocks,tearOffsets());assert.ok(rocks.length>100);
  for(const p of rocks){const angle=Math.atan2(p.z,p.x);assert.ok(angle<=-.55&&angle>=-1.1);assert.ok(Math.abs(Math.hypot(p.x,p.z)-LUNAR_RADIUS)<1);assert.ok(p.size>0);}
});

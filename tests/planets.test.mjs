import test from 'node:test';
import assert from 'node:assert/strict';
import {PLANETS,planetStates,elapsedRealmsDays} from '../scripts/planets.mjs';
test('Realmspace contains seven other planets, with no Toril or Abeir sky marker',()=>{
  assert.equal(PLANETS.length,7);
  assert.deepEqual(PLANETS.map(p=>p.id),['anadia','coliar','karpri','chandos','glyth','garden','hcatha']);
});
test('orbital positions are deterministic and the Dawn Heralds remain near the sun',()=>{
  const args={days:1234.5,hour:23};
  assert.deepEqual(planetStates(args),planetStates(args));
  for(let days=-150;days<400;days+=11)for(const p of planetStates({days,hour:20}).slice(0,2)) {
    assert.ok(Math.abs(p.elongation)<=Math.asin(p.radius/200)+1e-10);
  }
});
test('daylight and thick weather obscure planets without changing their orbits',()=>{
  const clear=planetStates({days:100,hour:23}),fog=planetStates({days:100,hour:23,weather:'fog'});
  for(let i=0;i<clear.length;i++){assert.equal(clear[i].angle,fog[i].angle);assert.equal(fog[i].opacity,0);}
  assert.ok(planetStates({days:100,hour:12}).every(p=>p.opacity===0));
});
test('planet reference arithmetic includes leap days and honors custom alignment',()=>{
  assert.equal(elapsedRealmsDays(1376,0),1461);
  const a=planetStates({days:0,hour:0}),b=planetStates({days:0,hour:0,angles:{anadia:100}});
  assert.notEqual(a[0].angle,b[0].angle);assert.equal(a[1].angle,b[1].angle);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {phaseForDate,LUNATION,DAY,dateView,motif,isHarptos,intervalSeconds,weatherKind,shouldHideInCombat,escapeHTML} from '../scripts/model.mjs';

test('Selûne follows the Harptos reference and exact 4-year recurrence',()=>{
  assert.equal(phaseForDate(1372,0).name,'Full Moon');
  assert.equal(phaseForDate(1372,0).lit,1);
  assert.equal(phaseForDate(1372,15,5,15).name,'New Moon');
  assert.equal(phaseForDate(1372,15,5,15).lit,0);
  assert.equal(phaseForDate(1376,0).q,0);
  assert.equal(phaseForDate(1368,0).q,0);
  assert.equal(phaseForDate(1372,0,0,0,-1).name,'Full Moon');
});
test('festival days advance phase and Shieldmeet is part of elapsed time',()=>{
  const before=phaseForDate(1372,211).q;
  const after=phaseForDate(1372,212).q;
  assert.ok(Math.abs(after-before-DAY/LUNATION)<1e-9);
  assert.notEqual(phaseForDate(1372,30).q,phaseForDate(1372,31).q);
  assert.ok(phaseForDate(1373,0).q>0); // leap year 1372 contained 366 days
});
test('phase quarters have the correct illumination and waxing direction',()=>{
  const last=phaseForDate(1372,0,0,0,LUNATION/4);
  const first=phaseForDate(1372,0,0,0,LUNATION*3/4);
  assert.equal(last.name,'Last Quarter');assert.equal(last.waxing,false);
  assert.equal(first.name,'First Quarter');assert.equal(first.waxing,true);
  assert.ok(Math.abs(last.lit-.5)<1e-12);
  assert.ok(Math.abs(first.lit-.5)<1e-12);
});
test('festival date is unnumbered and normal date remains one-based',()=>{
  const calendar={months:{values:[{name:'Hammer'},{name:'Midwinter',intercalary:true},{name:'Shieldmeet',intercalary:true}]}};
  assert.equal(dateView(calendar,{month:0,dayOfMonth:29,year:1502}).label,'30 Hammer');
  assert.equal(dateView(calendar,{month:1,dayOfMonth:0,year:1502}).label,'Midwinter');
  assert.equal(dateView(calendar,{month:2,dayOfMonth:0,year:1504}).label,'Shieldmeet');
  assert.equal(motif('Eleasias')[0],'Eleasis');
});
test('non-Harptos worlds are not silently treated as Forgotten Realms',()=>{
  assert.equal(isHarptos({months:{values:[{name:'January'},{name:'December'}]}}),false);
  assert.equal(isHarptos({months:{values:[{name:'Hammer'},{name:'Nightal'}]}}),true);
});
test('explicit intervals use calendar units, including nonstandard days',()=>{
  const calendar={days:{secondsPerMinute:60,minutesPerHour:60,hoursPerDay:24}};
  assert.deepEqual(['minute','hour','day'].map(i=>intervalSeconds(i,calendar)),[60,3600,86400]);
  calendar.days.hoursPerDay=20;
  assert.equal(intervalSeconds('day',calendar),72000);
});
test('combat visibility uses started state, independently of combat modules',()=>{
  assert.equal(shouldHideInCombat(true,{started:true}),true);
  assert.equal(shouldHideInCombat(false,{started:true}),false);
  assert.equal(shouldHideInCombat(true,{started:false}),false);
  assert.equal(shouldHideInCombat(true,null),false);
});
test('weather classification and displayed strings handle user content',()=>{
  assert.equal(weatherKind('Clear | 63°F'),'clear');
  assert.equal(weatherKind('Heavy Thunderstorm'),'storm');
  assert.equal(weatherKind('Sleet | -4°C'),'snow');
  assert.equal(weatherKind('', 'rain'),'rain');
  assert.equal(escapeHTML('<img src=x onerror="bad()">'),'&lt;img src=x onerror=&quot;bad()&quot;&gt;');
});

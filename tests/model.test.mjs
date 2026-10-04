import test from 'node:test';
import assert from 'node:assert/strict';
import {phaseForDate,LUNATION,DAY,dateView,motif,isHarptos,intervalSeconds,weatherKind,shouldHideInCombat,escapeHTML} from '../scripts/model.mjs';
import {tearAppearance,frameTheme} from '../scripts/model.mjs';
import {tearRocks,TEARS} from '../scripts/art.mjs';

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
test('combat visibility includes initiative setup and respects the visibility option',()=>{
  assert.equal(shouldHideInCombat(true,{started:true}),true);
  assert.equal(shouldHideInCombat(false,{started:true}),false);
  assert.equal(shouldHideInCombat(true,{started:false}),false);
  assert.equal(shouldHideInCombat(true,{started:false,combatants:new Map([['fighter',{}]])}),true);
  assert.equal(shouldHideInCombat(false,{started:false,combatants:new Map([['fighter',{}]])}),false);
  assert.equal(shouldHideInCombat(true,{started:false,combatants:new Map()}),false);
  assert.equal(shouldHideInCombat(true,null),false);
});
test('weather classification and displayed strings handle user content',()=>{
  assert.equal(weatherKind('Clear | 63°F'),'clear');
  assert.equal(weatherKind('Heavy Thunderstorm'),'storm');
  assert.equal(weatherKind('Sleet | -4°C'),'snow');
  assert.equal(weatherKind('', 'rain'),'rain');
  assert.equal(escapeHTML('<img src=x onerror="bad()">'),'&lt;img src=x onerror=&quot;bad()&quot;&gt;');
});
test('Tears obey daylight, horizon and weather visibility independently of lunar phase',()=>{
  const full={q:0,hour:23,dawn:6,dusk:18,lag:4,weather:'clear'};
  assert.ok(tearAppearance(full).opacity>0);
  assert.equal(tearAppearance({...full,hour:20}).opacity,0); // Moon has risen; Tears have not.
  assert.equal(tearAppearance({...full,hour:12}).opacity,0);
  assert.equal(tearAppearance({...full,weather:'storm'}).opacity,0);
  assert.equal(tearAppearance({...full,weather:'fog'}).opacity,0);
  assert.ok(tearAppearance({...full,weather:'cloud'}).opacity<tearAppearance(full).opacity);
  assert.equal(tearAppearance({...full,q:1/3,hour:23}).lit,0); // This rock, not Selûne, is new.
  assert.notEqual(tearAppearance(full).lit,tearAppearance({...full,lag:7}).lit);
});
test('rock rendering contains textured bodies and fits the inner dial',()=>{
  const svg=tearRocks({phase:{q:.6266},hour:1.8,dawn:6,dusk:18,weather:'clear'});
  assert.ok(svg.includes('ra-tear-rock'));
  assert.ok(svg.includes('-surface'));
  assert.equal(tearRocks({phase:null,hour:1}), '');
  for(const [x,y,r] of TEARS)assert.ok(Math.hypot(x-160,y+Math.sqrt(121**2-117**2))+r<121);
});
test('the frame palette varies across months and holidays',()=>{
  assert.notEqual(frameTheme('Hammer').rail,frameTheme('Flamerule').rail);
  assert.notEqual(frameTheme('Hammer').mid,frameTheme('Midwinter').mid);
  for(const value of Object.values(frameTheme('Nightal')))assert.match(value,/^#[0-9a-f]{6}$/i);
});

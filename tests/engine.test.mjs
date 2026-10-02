import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.foundry={data:{CalendarData:class {}}};
const {AlmanacEngine,darknessAt,AlmanacCalendarData,HARPTOS}=await import('../scripts/engine.mjs');
test('one GM advances the standalone clock while pause and combat stop it',async()=>{
  const settings={configuration:{running:true,rate:60},moduleConfiguration:{}};
  const calls=[];
  globalThis.game={settings:{get:(_id,key)=>settings[key]},user:{id:'gm'},users:{activeGM:{id:'gm'}},paused:false,combat:null,time:{advance:async n=>calls.push(n)}};
  const engine=new AlmanacEngine();engine.last=0;
  await engine.tick(1000);assert.deepEqual(calls,[60]);
  game.paused=true;await engine.tick(2000);assert.equal(calls.length,1);
  game.paused=false;game.combat={started:true};await engine.tick(3000);assert.equal(calls.length,1);
  game.combat=null;game.users.activeGM.id='other';await engine.tick(4000);assert.equal(calls.length,1);
  game.users.activeGM.id='gm';await engine.tick(5000);assert.deepEqual(calls,[60,60]);
  // A suspended browser does not catch the world up by hours on resuming.
  await engine.tick(3605000);assert.equal(calls.at(-1),300);
});
test('dawn and dusk lighting are continuous and bounded',()=>{
  assert.equal(darknessAt(0,6,18),1);assert.equal(darknessAt(12,6,18),0);
  assert.equal(darknessAt(6,6,18),.5);assert.equal(darknessAt(18,6,18),.5);
  for(let h=0;h<24;h+=.1)assert.ok(darknessAt(h,6,18)>=0&&darknessAt(h,6,18)<=1);
});
test('a leap year includes its final day and does not make the following year leap',()=>{
  const calendar=Object.create(AlmanacCalendarData.prototype);
  calendar.years=HARPTOS.years;calendar.days={...HARPTOS.days,daysPerLeapYear:366};
  calendar.isLeapYear=year=>year>=4&&year%4===0;
  assert.equal(calendar.countLeapYears(1504),376);
  const start1503=(1503*365+375)*86400;
  const last=calendar._decomposeTimeYears(start1503+365.5*86400);
  assert.deepEqual(last,{year:1503,second:365.5*86400,leapYear:true});
  assert.deepEqual(calendar._decomposeTimeYears(start1503+366*86400),{year:1504,second:0,leapYear:false});
  assert.deepEqual(calendar._decomposeTimeYears(-86400),{year:-1,second:364*86400,leapYear:false});
});

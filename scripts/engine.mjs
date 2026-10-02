import {ID, isHarptos, weatherKind, mod} from './model.mjs';

const month=(name,days,ordinal,extra={})=>({name,days,ordinal,...extra});
export const HARPTOS={name:'Calendar of Harptos',description:'Twelve months, five festivals and Shieldmeet every fourth year.',
  years:{yearZero:0,firstWeekday:0,leapYear:{leapStart:4,leapInterval:4}},
  months:{values:[month('Hammer',30,1),month('Midwinter',1,1,{intercalary:true}),month('Alturiak',30,2),month('Ches',30,3),month('Tarsakh',30,4),month('Greengrass',1,4,{intercalary:true}),month('Mirtul',30,5),month('Kythorn',30,6),month('Flamerule',30,7),month('Midsummer',1,7,{intercalary:true}),month('Shieldmeet',0,7,{leapDays:1,intercalary:true}),month('Eleasis',30,8),month('Eleint',30,9),month('Highharvestide',1,9,{intercalary:true}),month('Marpenoth',30,10),month('Uktar',30,11),month('Feast of the Moon',1,11,{intercalary:true}),month('Nightal',30,12)]},
  days:{values:Array.from({length:10},(_,i)=>({name:`Day ${i+1}`,abbreviation:String(i+1),ordinal:i+1})),daysPerYear:365,hoursPerDay:24,minutesPerHour:60,secondsPerMinute:60},
  seasons:{values:[{name:'Spring',dayStart:79,dayEnd:172},{name:'Summer',dayStart:173,dayEnd:264},{name:'Autumn',dayStart:265,dayEnd:354},{name:'Winter',dayStart:355,dayEnd:78}]}
};
export const DEFAULT_CONFIG={calendar:HARPTOS,yearOffset:1,latitude:37,seasonalSun:true,dawn:6,dusk:18,rate:1,roundSeconds:6,running:false,autoWeather:false,lighting:false,weatherEffects:false,climate:'temperate',unit:'F'};
export const WEATHER={clear:['Clear','sun',''],cloud:['Cloudy','cloud',''],rain:['Rain','cloud-rain','rain'],storm:['Thunderstorm','cloud-bolt','rain'],snow:['Snow','snowflake','snow'],fog:['Fog','smog','fog'],wind:['Windy','wind','']};
export const config=()=>game.settings.get(ID,'configuration');
export const weather=()=>game.settings.get(ID,'weather');
export const displayYear=year=>year+config().yearOffset;
export const isLeader=()=>game.users.activeGM?.id===game.user.id;
const legacyEnabled=()=>Boolean(game.settings.get('core','moduleConfiguration')['simple-timekeeping']);
const fail=error=>{console.error(ID,error);ui.notifications.error(error.message);};

export class AlmanacCalendarData extends foundry.data.CalendarData {
  static defineSchema() {
    const fields=super.defineSchema();
    fields.months.fields.values.element.fields.intercalary=new foundry.data.fields.BooleanField({initial:false});
    return fields;
  }
  countLeapYears(year) {
    const leap=this.years.leapYear;if(!leap)return 0;
    const completed=y=>y<leap.leapStart?0:Math.floor((y-leap.leapStart)/leap.leapInterval)+1;
    return completed(year)-completed(0);
  }
  _decomposeTimeYears(time) {
    const d=this.days,secondsPerDay=d.secondsPerMinute*d.minutesPerHour*d.hoursPerDay;
    const standard=d.daysPerYear,leap=d.daysPerLeapYear??standard;
    const start=y=>(y*standard+this.countLeapYears(y)*(leap-standard))*secondsPerDay;
    const totalDays=Math.floor(time/secondsPerDay);
    const a=Math.floor(totalDays/Math.min(standard,leap)),b=Math.floor(totalDays/Math.max(standard,leap));
    let low=Math.min(a,b)-2,high=Math.max(a,b)+2;
    while(low+1<high){const mid=Math.floor((low+high)/2);if(start(mid)<=time)low=mid;else high=mid;}
    return {year:low,second:time-start(low),leapYear:this.isLeapYear(low+1)};
  }
  timeToComponents(time=0) {
    const c=super.timeToComponents(time);
    if(isHarptos(this,s=>game.i18n.localize(s))) {
      const m=this.months.values[c.month];
      c.dayOfWeek=m?.intercalary?-1:c.dayOfMonth%10;
    }
    return c;
  }
}
export function installCalendar() {
  if(!game.settings.get(ID,'initialized')) return;
  CONFIG.time.worldCalendarConfig=foundry.utils.deepClone(config().calendar);
  CONFIG.time.worldCalendarClass=AlmanacCalendarData;
  CONFIG.time.roundTime=config().roundSeconds;
  if(game.ready) game.time.initializeCalendar();
}
export function registerEngineSettings() {
  for(const [key,type,value] of [['configuration',Object,DEFAULT_CONFIG],['weather',Object,{kind:'clear',temperature:63,unit:'F',label:'Clear | 63°F'}],['initialized',Boolean,false],['eventsJournal',String,'']]) {
    if(game.settings.settings.has(`${ID}.${key}`)) continue;
    game.settings.register(ID,key,{scope:'world',config:false,type,default:value,onChange:()=>{
      if(key==='configuration'||key==='initialized') installCalendar();
      ui.realmsAlmanac?.refresh();
    }});
  }
}

/** One-time data import. The engine, settings UI and journal remain independent afterward. */
export async function initializeData() {
  if(game.settings.get(ID,'initialized') || !isLeader()) return;
  let next=foundry.utils.deepClone(DEFAULT_CONFIG);
  if(game.settings.settings.has('simple-timekeeping.configuration') && legacyEnabled()) {
    const old=game.settings.get('simple-timekeeping','configuration');
    next={...next,calendar:foundry.utils.deepClone(CONFIG.time.worldCalendarConfig),yearOffset:1,latitude:old.latitude??37,
      dawn:(old.dawn??.25)*24,dusk:(old.dusk??.75)*24,rate:old.secondsPerRealSecond??1,roundSeconds:old.secondsPerRound??6,
      running:!game.settings.get('simple-timekeeping','paused'),autoWeather:Boolean(old.genWeather),lighting:old.darknessSync==='sync',unit:old.genWeather==='tempC'?'C':'F'};
    const label=String(old.weatherLabel||'Clear Skies'), match=label.match(/(-?\d+(?:\.\d+)?)\s*°\s*([CF])/i);
    await game.settings.set(ID,'weather',{kind:weatherKind(label),temperature:match?Number(match[1]):null,unit:match?.[2]?.toUpperCase()??next.unit,label});
    // Preserve an existing journal in place, including its ownership and rich text.
    const journal=game.journal.getName(old.journalEntryEvents);
    if(journal) {
      await game.settings.set(ID,'eventsJournal',journal.id);
      await journal.update({[`flags.${ID}.events`]:true});
    }
  } else if(game.time?.calendar && !isHarptos(game.time.calendar)) {
    next.calendar=game.time.calendar.toObject();next.yearOffset=0;
  }
  await game.settings.set(ID,'configuration',next);
  const journal=game.journal.get(game.settings.get(ID,'eventsJournal'));
  if(journal) {
    const {eventData,readableContent,pageBody}=await import('./calendar.mjs');
    const updates=[];
    for(const page of journal.pages) {
      if(page.getFlag(ID,'event'))continue;
      const old=eventData(page);if(!old)continue;
      const event={start:old.start,end:old.end??null,repeat:old.repeat??'',calendar:next.calendar.name};
      updates.push({_id:page.id,[`flags.${ID}.event`]:event,'text.content':readableContent(event,pageBody(page))});
    }
    if(updates.length)await journal.updateEmbeddedDocuments('JournalEntryPage',updates);
  }
  await game.settings.set(ID,'initialized',true);
  installCalendar();
}

export function sunTimes(c=game.time.calendar.timeToComponents(game.time.worldTime)) {
  const cfg=config();
  if(!cfg.seasonalSun) return {dawn:cfg.dawn,dusk:cfg.dusk};
  const yearDays=c.leapYear?(game.time.calendar.days.daysPerLeapYear??366):game.time.calendar.days.daysPerYear;
  const latitude=Math.max(-60,Math.min(60,cfg.latitude))*Math.PI/180;
  const declination=23.44*Math.PI/180*Math.cos(2*Math.PI*(c.day-171)/yearDays);
  const angle=Math.acos(Math.max(-.98,Math.min(.98,-Math.tan(latitude)*Math.tan(declination))));
  const length=24*angle/Math.PI;
  return {dawn:12-length/2,dusk:12+length/2};
}
export function darknessAt(hour,dawn,dusk) {
  if(hour<dawn-.5 || hour>dusk+.5) return 1;
  if(hour<dawn+.5) return 1-(hour-dawn+.5);
  if(hour>dusk-.5) return hour-dusk+.5;
  return 0;
}
export function weatherLabel(value) {
  return `${WEATHER[value.kind]?.[0]??'Clear'}${Number.isFinite(value.temperature)?` | ${Math.round(value.temperature)}°${value.unit}`:''}`;
}
export async function saveWeather(value) {
  if(!game.user.isGM) throw new Error('Only a GM can change the weather.');
  const next={kind:value.kind,temperature:value.temperature,unit:value.unit};
  if(!WEATHER[next.kind] || !['C','F'].includes(next.unit) || (next.temperature!==null&&!Number.isFinite(next.temperature))) throw new Error('Enter a valid weather condition and temperature.');
  next.label=weatherLabel(next);await game.settings.set(ID,'weather',next);
  if(config().weatherEffects && canvas.scene) {
    const effect=WEATHER[next.kind][2];
    await canvas.scene.update({weather:effect && CONFIG.weatherEffects[effect]?effect:''});
  }
}
export async function generateWeather() {
  if(!game.user.isGM) return;
  const cfg=config(), c=game.time.calendar.timeToComponents(game.time.worldTime);
  const season=10+15*Math.cos(2*Math.PI*(c.day-200)/365);
  const temperatureC=season+({cold:-15,arid:10,tropical:12}[cfg.climate]??0)+(Math.random()*10-5);
  const roll=Math.random();
  const wet=cfg.climate==='arid'?.12:cfg.climate==='tropical'?.55:.35;
  const kind=roll<wet?(temperatureC<1?'snow':roll<wet*.2?'storm':'rain'):roll<wet+.15?'cloud':roll<wet+.22?'wind':roll<wet+.26?'fog':'clear';
  await saveWeather({kind,temperature:Math.round(cfg.unit==='F'?temperatureC*9/5+32:temperatureC),unit:cfg.unit});
}

export class AlmanacEngine {
  timer; hooks=[]; busy=false; previousDay; last=0; remainder=0;
  start() {
    this.stop();this.last=performance.now();this.previousDay=game.time.calendar.timeToComponents(game.time.worldTime);
    this.timer=setInterval(()=>this.tick().catch(fail),1000);
    this.hooks.push(['updateWorldTime',Hooks.on('updateWorldTime',()=>this.onTime().catch(fail))]);
    const journal=game.journal.get(game.settings.get(ID,'eventsJournal'));
    if(!legacyEnabled()&&isLeader()&&journal?.name==='SimpleTimekeeping') journal.update({name:'Campaign Calendar'}).catch(fail);
  }
  async tick(now=performance.now()) {
    const elapsed=Math.max(0,Math.min(5,(now-this.last)/1000));this.last=now;
    // During the one-time import, only the previous clock runs. It is disabled at cutover.
    if(this.busy || legacyEnabled() || !isLeader() || !config().running || game.paused || game.combat?.started) {this.remainder=0;return;}
    this.remainder+=elapsed*config().rate;
    const seconds=Math.floor(this.remainder);if(!seconds) return;
    this.remainder-=seconds;this.busy=true;
    try{await game.time.advance(seconds);}finally{this.busy=false;}
  }
  async onTime() {
    const c=game.time.calendar.timeToComponents(game.time.worldTime),old=this.previousDay;this.previousDay=c;
    if(legacyEnabled() || !isLeader()) return;
    if(config().autoWeather && old && (old.year!==c.year||old.day!==c.day)) await generateWeather();
    if(config().lighting && canvas.scene) {
      const {dawn,dusk}=sunTimes(c),level=darknessAt(c.hour+c.minute/60,dawn,dusk);
      if(Math.abs(canvas.scene.environment.darknessLevel-level)>.015) await canvas.scene.update({'environment.darknessLevel':level});
    }
  }
  stop() {clearInterval(this.timer);for(const [name,id] of this.hooks) Hooks.off(name,id);this.hooks=[];}
}

import {ID, escapeHTML as esc, motif, isHarptos, phaseForDate, weatherKind, timeOfDay, shouldHideInCombat, intervalSeconds, dateView, MONTHS, FESTIVALS, frameTheme} from "./model.mjs";
import {icon, moonDisc, skyArt} from "./art.mjs";
import {config,weather,displayYear,sunTimes,registerEngineSettings,installCalendar,initializeData,AlmanacEngine} from './engine.mjs';
import {AlmanacSettings,WeatherEditor} from './settings.mjs';
import {AlmanacMonthView,openDateEditor} from './calendar.mjs';
import {planetStates,elapsedRealmsDays} from './planets.mjs';
import {SkyWindow} from './sky-window.mjs';
import {registerAtlasSettings} from './atlas-state.mjs';

const get = key => game.settings.get(ID, key);
const notifyError = error => { console.error(`${ID} |`, error); ui.notifications.error(error.message ?? String(error)); };
const button = (action, title, symbol, extra = "") => `<button type="button" data-action="${action}" aria-label="${esc(title)}" title="${esc(title)}" ${extra}>${symbol}</button>`;
const fa = name => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;

export function readWorld() {
  const calendar = game.time.calendar;
  // Ask the active calendar to decompose time so changes of calendar are reflected immediately.
  const c = calendar.timeToComponents(game.time.worldTime);
  const currentWeather=weather();
  const realms = isHarptos(calendar, s => game.i18n.localize(s));
  const year = displayYear(c.year);
  const date = dateView(calendar, c, {year, localize: s => game.i18n.localize(s)});
  const phase = realms ? phaseForDate(year, c.day, c.hour, c.minute, c.second, get("moonOffset")) : null;
  const label=currentWeather.label;
  const weatherType=currentWeather.kind;
  const {dawn,dusk}=sunTimes(c);
  const hour = c.hour + c.minute/calendar.days.minutesPerHour;
  const period = timeOfDay(hour, dawn, dusk);
  const time = get("clock24") ? `${String(c.hour).padStart(2,"0")}:${String(c.minute).padStart(2,"0")}` : `${c.hour % 12 || 12}:${String(c.minute).padStart(2,"0")} ${c.hour < 12 ? "AM" : "PM"}`;
  const planets=realms?planetStates({days:elapsedRealmsDays(year,c.day,c.hour,c.minute),hour,dawn,dusk,weather:weatherType,angles:config().planetAngles??{}}):[];
  return {calendar, c, date, realms, phase, weather:weatherType, weatherLabel: label, dawn, dusk, hour, period, time, frame:frameTheme(date.name),planets};
}

class AlmanacReference extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {id:"realms-almanac-reference", classes:["ra-reference"], window:{title:"Calendar of Harptos",icon:"fa-solid fa-calendar-days",resizable:true},position:{width:540,height:600}};
  async _renderHTML() {
    const w=readWorld();
    const monthRows=MONTHS.map(([name,alias,symbol])=>`<tr class="${w.date.name===name?'current':''}"><td>${icon(symbol)} ${name}</td><td>${alias}</td></tr>`).join("");
    const holidays=Object.values(FESTIVALS).map(([name,desc,symbol])=>`<li>${icon(symbol)}<span><strong>${name}</strong><small>${desc}</small></span></li>`).join("");
    return `<div class="ra-reference-content"><p>Twelve months of thirty days, each divided into three tendays. Festival days stand between the months.</p><table><thead><tr><th>Month</th><th>Common Name</th></tr></thead><tbody>${monthRows}</tbody></table><h3>Festival Days</h3><ul>${holidays}</ul><p>Midwinter follows Hammer. Greengrass follows Tarsakh. Midsummer follows Flamerule, with Shieldmeet the next day every fourth year. Highharvestide follows Eleint. The Feast of the Moon follows Uktar.</p><h3>Selûne &amp; Her Tears</h3><p>Selûne's cycle lasts 30 days, 10 hours and 30 minutes. The nine visible Tears are a distant trailing cluster. Their spacing on this dial is compressed; moon phase remains visible even when the moon would be below the horizon.</p><p><a href="https://forgottenrealms.fandom.com/wiki/Calendar_of_Harptos" target="_blank" rel="noopener noreferrer">Calendar lore</a> · <a href="https://forgottenrealms.fandom.com/wiki/Tears_of_Sel%C3%BBne" target="_blank" rel="noopener noreferrer">Tears of Selûne</a></p></div>`;
  }
  _replaceHTML(html, content) {const y=content.scrollTop; content.innerHTML=html;content.scrollTop=y;}
}

export class RealmsAlmanac {
  root;
  hooks=[];
  advancing=false;
  refreshQueued=false;
  settings=new AlmanacSettings();
  reference=new AlmanacReference();
  async init() {
    this.root=document.createElement("section");
    this.root.id=ID;
    this.root.setAttribute("aria-label", "Realms Almanac");
    document.body.append(this.root);
    this.root.addEventListener("click", e=>{const target=e.target.closest("[data-action]");if(target)this.action(target.dataset.action,target.dataset.body).catch(notifyError);});
    this.root.addEventListener("change", e=>{if(e.target.name==="interval") game.settings.set(ID,"interval",e.target.value).catch(notifyError);});
    for(const name of ["updateWorldTime","updateCombat","createCombat","deleteCombat","combatStart","combatEnd","canvasReady","updateScene"]) {
      const id=Hooks.on(name,()=>this.refresh()); this.hooks.push([name,id]);
    }
    this.hooks.push(['updateSetting',Hooks.on('updateSetting',setting=>{if(setting.key?.startsWith(`${ID}.`))this.refresh();})]);
    this.render();
  }
  refresh() {
    if(this.refreshQueued) return;
    this.refreshQueued=true;
    queueMicrotask(()=>{this.refreshQueued=false;try {this.render();}catch(error){notifyError(error);}});
  }
  render(snapshot) {
    const enabled=get("enabled");
    document.body.classList.toggle("ra-replace-bars",enabled);
    this.root.hidden=!enabled || shouldHideInCombat(get("hideCombat"),game.combat);
    if(this.root.hidden) return;
    const w=snapshot??readWorld();
    const focused=this.root.contains(document.activeElement)?document.activeElement?.dataset.action ?? document.activeElement?.name:null;
    const interval=get("interval");
    const collapsed=get("collapsed");
    const key=JSON.stringify([w.time,w.date,w.weather,w.weatherLabel,w.period,get('width'),get('top'),get('showTears'),get('showPlanets'),get('animate'),interval,collapsed,config(),this.advancing,get('moonOffset'),Boolean(snapshot)]);
    if(key===this.renderKey) return;
    this.renderKey=key;
    this.root.style.setProperty("--ra-width",`${get("width")}px`);
    this.root.style.setProperty("--ra-top",`${get("top")}px`);
    this.root.style.setProperty("--ra-season",w.date.motif[3]);
    for(const [key,value] of Object.entries(w.frame)) this.root.style.setProperty(`--ra-${key}`,value);
    this.root.className=`ra-period-${w.period} ${collapsed?'ra-collapsed':''} ${get("animate")?'ra-animated':''}`;
    const phaseTitle=w.phase ? `Selûne · ${w.phase.name} · ${Math.round(w.phase.lit*100)}% illuminated. Phase display; sky position is illustrative.` : "Selûne's phase is available with a Harptos calendar.";
    const dateTitle=`${w.date.label}, ${w.date.year}${w.realms?' DR':''}. ${w.date.motif[1]}${w.date.holiday?'. Festival day':''}`;
    const gm=game.user.isGM;
    this.root.innerHTML=`<div class="ra-rail">
      <div class="ra-controls ra-left">${gm?button("back",`Back 1 ${interval}`,fa("backward-step"),this.advancing?'disabled':''):''}${button("settings","Almanac Settings",fa("gear"))}${button("atlas","Open Star Map",fa("planet-ringed"))}${button("events","Open Calendar",fa("calendar-days"))+(gm?button("pause",config().running?'Pause Clock':'Resume Clock',fa(config().running?'pause':'play')):'')}</div>
      ${button("date",`${dateTitle} · ${gm?'Set Date and Time':'View Calendar'}`,`<span class="ra-time">${esc(w.time)}</span>`, 'class="ra-clock"')}
      <div class="ra-controls ra-right">${button("collapse",collapsed?"Expand Celestial Dial":"Collapse Celestial Dial",fa(collapsed?"chevron-down":"chevron-up"),`aria-expanded="${!collapsed}"`)}${gm?`<select name="interval" aria-label="Advance Interval" title="Advance Interval">${['minute','hour','day'].map(s=>`<option value="${s}" ${s===interval?'selected':''}>1 ${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select>${button("forward",`Forward 1 ${interval}`,fa("forward-step"),this.advancing?'disabled':'')}`:''}</div>
      </div>
      <button type="button" class="ra-ribbon ${w.date.holiday?'ra-festival':''}" data-action="events" title="${esc(dateTitle)}">${icon(w.date.motif[2])}<span>${esc(w.date.label)}<b>·</b>${esc(w.date.year)}${w.realms?' DR':''}</span>${icon(w.date.motif[2])}</button>
      <div class="ra-dial">
        ${skyArt({...w,showTears:get("showTears"),planets:get("showPlanets")?w.planets:[]})}
        ${button("weather",gm?`${w.weatherLabel} · Weather Settings`:w.weatherLabel,`${icon(w.weather==='clear'?(w.period==='night'?'star':'sun'):w.weather)}<span>${esc(w.weatherLabel)}</span>`,`class="ra-weather"`)}
        <button type="button" class="ra-lunar" data-action="sky" title="${esc(phaseTitle)}" aria-label="Open Realmspace Sky">${w.phase?moonDisc(w.phase.q):icon('star')}<span>${w.phase?'Selûne':esc(w.calendar.name)}</span></button>
        <span class="ra-phase-label">${w.phase?esc(w.phase.name):esc(w.period)}</span>
      </div>`;
    if(focused) this.root.querySelector(`[data-action="${focused}"], [name="${focused}"]`)?.focus({preventScroll:true});
  }
  async advance(direction) {
    if(!game.user.isGM || this.advancing) return;
    this.advancing=true;this.render();
    try {await game.time.advance(direction*intervalSeconds(get("interval"),game.time.calendar));}
    finally {this.advancing=false;this.render();}
  }
  async action(action,body) {
    if(action==='settings') return this.settings.render(true);
    if(action==='reference') return this.reference.render(true);
    if(action==='events') {this.calendarApp??=new AlmanacMonthView();return this.calendarApp.render(true);}
    if(action==='sky') {this.skyApp??=new SkyWindow(readWorld);return this.skyApp.render(true);}
    if(action==='atlas') {const {AtlasWindow}=await import('./atlas-window.mjs');this.atlasApp??=new AtlasWindow(readWorld);if(!this.atlasApp.element?.isConnected)await this.atlasApp.render(true);else this.atlasApp.bringToFront();if(body)await this.atlasApp.focus(body);return;}
    if(action==='collapse') return game.settings.set(ID,'collapsed',!get('collapsed'));
    if(!game.user.isGM) {if(action==='date') return this.action('events');return;}
    if(action==='forward'||action==='back') return this.advance(action==='forward'?1:-1);
    if(action==='pause') return game.settings.set(ID,'configuration',{...config(),running:!config().running});
    if(action==='date') return openDateEditor();
    if(action==='weather') return new WeatherEditor().render(true);
  }

  destroy() {
    for(const [name,id] of this.hooks) Hooks.off(name,id);
    this.root?.remove();
    this.calendarApp?.close();
    this.skyApp?.close();
    this.atlasApp?.close();
    this.engine?.stop();
    document.body.classList.remove('ra-replace-bars');
  }
}

export function registerSettings() {
  registerEngineSettings();
  registerAtlasSettings();
  const settings={enabled:[Boolean,true], width:[Number,560], top:[Number,0], clock24:[Boolean,false],hideCombat:[Boolean,true],showTears:[Boolean,true],showPlanets:[Boolean,true],animate:[Boolean,true],collapsed:[Boolean,false],interval:[String,'hour'],moonOffset:[Number,0]};
  for(const [key,[type,value]] of Object.entries(settings)) {
    if(game.settings.settings.has(`${ID}.${key}`)) continue;
    game.settings.register(ID,key,{scope:key==='moonOffset'?'world':'client',config:false,type,default:value,onChange:()=>ui.realmsAlmanac?.refresh()});
  }
  game.settings.registerMenu(ID,'settings',{name:'Realms Almanac',label:'Configure Almanac',hint:'Size, time controls, combat visibility and celestial display.',icon:'fa-solid fa-moon',type:AlmanacSettings,restricted:false});
}
export async function start() {
  await initializeData();installCalendar();
  ui.realmsAlmanac?.destroy();
  const app=ui.realmsAlmanac=new RealmsAlmanac();
  await app.init();
  app.engine=new AlmanacEngine();app.engine.start();
  const module=game.modules.get(ID);
  if(module) module.api={refresh:()=>app.refresh(),readWorld,openSettings:()=>app.settings.render(true)};
}
Hooks.once('init',()=>{registerSettings();installCalendar();});
Hooks.once('ready',()=>start().catch(notifyError));

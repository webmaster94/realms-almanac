import {ID, escapeHTML as esc, motif, isHarptos, phaseForDate, weatherKind, timeOfDay, shouldHideInCombat, intervalSeconds, dateView, MONTHS, FESTIVALS} from "./model.mjs";
import {icon, moonDisc, skyArt} from "./art.mjs";

const get = key => game.settings.get(ID, key);
const upstream = () => ui.simpleTimekeeping;
const originalConfig = () => game.settings.settings.has("simple-timekeeping.configuration") ? game.settings.get("simple-timekeeping", "configuration") : {};
const notifyError = error => { console.error(`${ID} |`, error); ui.notifications.error(error.message ?? String(error)); };
const button = (action, title, symbol, extra = "") => `<button type="button" data-action="${action}" aria-label="${esc(title)}" title="${esc(title)}" ${extra}>${symbol}</button>`;
const fa = name => `<i class="fa-solid fa-${name}" aria-hidden="true"></i>`;

export function readWorld() {
  const calendar = game.time.calendar;
  // Ask the active calendar to decompose time so changes of calendar are reflected immediately.
  const c = calendar.timeToComponents(game.time.worldTime);
  const conf = originalConfig();
  const realms = isHarptos(calendar, s => game.i18n.localize(s));
  // Simple Timekeeping's displayed dates use a one-based year, including on v14.367.
  const year = c.year + (upstream() ? 1 : 0);
  const date = dateView(calendar, c, {year, localize: s => game.i18n.localize(s)});
  const phase = realms ? phaseForDate(year, c.day, c.hour, c.minute, c.second, get("moonOffset")) : null;
  const label = String(conf.weatherLabel || get("weatherLabel") || (canvas.scene?.weather ? game.i18n.localize(CONFIG.weatherEffects?.[canvas.scene.weather]?.label ?? canvas.scene.weather) : "Clear Skies"));
  const weather = weatherKind(label, canvas.scene?.weather);
  const dawn = (upstream()?.dawn ?? .25) * calendar.days.hoursPerDay;
  const dusk = (upstream()?.dusk ?? .75) * calendar.days.hoursPerDay;
  const hour = c.hour + c.minute/calendar.days.minutesPerHour;
  const period = timeOfDay(hour, dawn, dusk);
  const time = get("clock24") ? `${String(c.hour).padStart(2,"0")}:${String(c.minute).padStart(2,"0")}` : `${c.hour % 12 || 12}:${String(c.minute).padStart(2,"0")} ${c.hour < 12 ? "AM" : "PM"}`;
  return {calendar, c, date, realms, phase, weather, weatherLabel: label, dawn, dusk, hour, period, time};
}

class AlmanacSettings extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "realms-almanac-settings", tag: "form", classes: ["ra-settings", "standard-form"],
    window: {title: "Realms Almanac", icon: "fa-solid fa-moon", resizable: true},
    position: {width: 500, height: 520},
    form: {handler: AlmanacSettings.save, closeOnSubmit: true}
  };
  static TABS = {main: {initial: "display", tabs: [{id: "display", label: "Display"}, {id: "sky", label: "Sky & Calendar"}]}};
  async _renderHTML() {
    const active = this.tabGroups.main;
    const check = (key, label, help) => `<div class="form-group"><label for="ra-${key}">${label}</label><div class="form-fields"><input id="ra-${key}" type="checkbox" name="${key}" ${get(key)?"checked":""}></div><p class="hint">${help}</p></div>`;
    const number = (key, label, min, max, step, help) => `<div class="form-group"><label for="ra-${key}">${label}</label><div class="form-fields"><input id="ra-${key}" type="number" name="${key}" min="${min}" max="${max}" step="${step}" value="${get(key)}"></div><p class="hint">${help}</p></div>`;
    return `<nav class="tabs" data-group="main" aria-label="Almanac Settings"><a data-action="tab" data-group="main" data-tab="display" class="${active==="display"?"active":""}">Display</a><a data-action="tab" data-group="main" data-tab="sky" class="${active==="sky"?"active":""}">Sky &amp; Calendar</a></nav>
      <section class="tab ${active==="display"?"active":""}" data-group="main" data-tab="display"><fieldset><legend>Position &amp; Controls</legend>
      ${check("enabled", "Show Almanac", "Display this calendar on your screen.")}
      ${number("width", "Width", 420, 800, 10, "Width in pixels. The default is 560.")}
      ${number("top", "Top Offset", 0, 300, 1, "Space above the bar in pixels.")}
      ${check("clock24", "24-Hour Clock", "Show 22:00 instead of 10:00 PM.")}
      ${check("hideCombat", "Hide During Combat", "Hide while the current Foundry combat is started. Works with any combat tracker.")}
      ${check("replaceBars", "Replace Other Calendar Bars", "Use this bar while keeping Simple Timekeeping's calendar, weather and automation running.")}
      </fieldset></section>
      <section class="tab ${active==="sky"?"active":""}" data-group="main" data-tab="sky"><fieldset><legend>Celestial Display</legend>
      ${check("showTears", "Show Tears of Selûne", "Nine star points trail Selûne at night. The dial is an illustration, not an exact view of the local sky.")}
      ${check("animate", "Animate Weather", "Gently move precipitation. Your system's reduced-motion preference is respected.")}
      ${game.user.isGM ? number("moonOffset", "Moon Phase Offset", -3650, 3650, .0625, "Days added to the lore phase calculation. Zero uses a full moon at midnight on 1 Hammer 1372 DR.") : ""}
      </fieldset><p class="hint">The almanac reads the active world calendar. Installing it does not change your date, calendar, weather or scene lighting.</p>
      ${upstream() ? button("source", "Calendar & Weather Settings", `${fa("calendar-days")} Calendar &amp; Weather Settings`) : '<p class="hint">Enable Simple Timekeeping for weather generation, events and its date picker.</p>'}
      </section><footer class="form-footer"><button type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button></footer>`;
  }
  _replaceHTML(html, content) {
    const scroll = content.scrollTop;
    content.innerHTML = html;
    content.scrollTop = scroll;
  }
  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector('[data-action="source"]')?.addEventListener("click", () => upstream()?.openConfiguration());
  }
  static async save(event, form, formData) {
    const values = formData.object;
    for (const key of ["enabled","clock24","hideCombat","replaceBars","showTears","animate"]) await game.settings.set(ID,key,Boolean(values[key]));
    for (const [key,min,max] of [["width",420,800],["top",0,300],["moonOffset",-3650,3650]]) {
      if (!(key in values) || (key==="moonOffset" && !game.user.isGM)) continue;
      const value=Number(values[key]);
      if(Number.isFinite(value)) await game.settings.set(ID,key,Math.max(min,Math.min(max,value)));
    }
  }
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
  observer;
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
    this.root.addEventListener("click", e=>{const action=e.target.closest("[data-action]")?.dataset.action; if(action) this.action(action).catch(notifyError);});
    this.root.addEventListener("change", e=>{if(e.target.name==="interval") game.settings.set(ID,"interval",e.target.value).catch(notifyError);});
    for(const name of ["updateWorldTime","updateCombat","createCombat","deleteCombat","combatStart","combatEnd","canvasReady","updateScene","updateSetting","renderSimpleTimekeeping"]) {
      const id=Hooks.on(name,()=>this.refresh()); this.hooks.push([name,id]);
    }
    // Upstream updates its weather badge without a Foundry render hook.
    this.watchWeather();
    this.render();
  }
  watchWeather() {
    const node=upstream()?.element;
    if(!node || this.observedNode===node) return;
    this.observer?.disconnect();
    this.observedNode=node;
    this.observer=new MutationObserver(()=>this.refresh());
    this.observer.observe(node,{subtree:true,childList:true,characterData:true});
  }
  refresh() {
    if(this.refreshQueued) return;
    this.refreshQueued=true;
    queueMicrotask(()=>{this.refreshQueued=false;try {this.watchWeather();this.render();}catch(error){notifyError(error);}});
  }
  render() {
    const enabled=get("enabled");
    document.body.classList.toggle("ra-replace-bars",enabled && get("replaceBars"));
    this.root.hidden=!enabled || shouldHideInCombat(get("hideCombat"),game.combat);
    if(this.root.hidden) return;
    const w=readWorld();
    const focused=this.root.contains(document.activeElement)?document.activeElement?.dataset.action ?? document.activeElement?.name:null;
    const interval=get("interval");
    const collapsed=get("collapsed");
    this.root.style.setProperty("--ra-width",`${get("width")}px`);
    this.root.style.setProperty("--ra-top",`${get("top")}px`);
    this.root.style.setProperty("--ra-season",w.date.motif[3]);
    this.root.className=`ra-period-${w.period} ${collapsed?'ra-collapsed':''} ${get("animate")?'ra-animated':''}`;
    const phaseTitle=w.phase ? `Selûne · ${w.phase.name} · ${Math.round(w.phase.lit*100)}% illuminated. Phase display; sky position is illustrative.` : "Selûne's phase is available with a Harptos calendar.";
    const dateTitle=`${w.date.label}, ${w.date.year}${w.realms?' DR':''}. ${w.date.motif[1]}${w.date.holiday?'. Festival day':''}`;
    const gm=game.user.isGM;
    this.root.innerHTML=`<div class="ra-rail">
      <div class="ra-controls ra-left">${gm?button("back",`Back 1 ${interval}`,fa("backward-step"),this.advancing?'disabled':''):''}${button("settings","Almanac Settings",fa("gear"))}${button("reference","Calendar of Harptos",fa("book-open"))}${gm&&upstream()?button("events","Calendar Events",fa("calendar-days"))+button("pause",game.settings.get('simple-timekeeping','paused')?'Resume Clock':'Pause Clock',fa(game.settings.get('simple-timekeeping','paused')?'play':'pause')):''}</div>
      ${button("date",`${dateTitle} · ${gm&&upstream()?'Set Date and Time':'View Calendar'}`,`<span class="ra-time">${esc(w.time)}</span>`, 'class="ra-clock"')}
      <div class="ra-controls ra-right">${button("collapse",collapsed?"Expand Celestial Dial":"Collapse Celestial Dial",fa(collapsed?"chevron-down":"chevron-up"),`aria-expanded="${!collapsed}"`)}${gm?`<select name="interval" aria-label="Advance Interval" title="Advance Interval">${['minute','hour','day'].map(s=>`<option value="${s}" ${s===interval?'selected':''}>1 ${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select>${button("forward",`Forward 1 ${interval}`,fa("forward-step"),this.advancing?'disabled':'')}`:''}</div>
      </div>
      <button type="button" class="ra-ribbon ${w.date.holiday?'ra-festival':''}" data-action="reference" title="${esc(dateTitle)}">${icon(w.date.motif[2])}<span>${esc(w.date.label)}<b>·</b>${esc(w.date.year)}${w.realms?' DR':''}</span>${icon(w.date.motif[2])}</button>
      <div class="ra-dial">
        ${skyArt({...w,showTears:get("showTears")})}
        ${button("weather",gm&&upstream()?`${w.weatherLabel} · Weather Settings`:w.weatherLabel,`${icon(w.weather==='clear'?(w.period==='night'?'star':'sun'):w.weather)}<span>${esc(w.weatherLabel)}</span>`,`class="ra-weather"`)}
        <div class="ra-lunar" tabindex="0" title="${esc(phaseTitle)}" aria-label="${esc(phaseTitle)}">${w.phase?moonDisc(w.phase.q):icon('star')}<span>${w.phase?'Selûne':esc(w.calendar.name)}</span></div>
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
  async action(action) {
    if(action==='settings') return this.settings.render(true);
    if(action==='reference') return this.reference.render(true);
    if(action==='collapse') return game.settings.set(ID,'collapsed',!get('collapsed'));
    if(!game.user.isGM) {if(action==='date') return this.reference.render(true);return;}
    if(action==='forward'||action==='back') return this.advance(action==='forward'?1:-1);
    if(action==='pause'&&upstream()) return game.settings.set('simple-timekeeping','paused',!game.settings.get('simple-timekeeping','paused'));
    if(action==='date') {
      if(upstream()) return upstream().setCurrentDateTime();
      return this.reference.render(true);
    }
    if(action==='weather') {
      if(upstream()) return upstream().openConfiguration();
      return this.settings.render(true);
    }
    if(action==='events') return upstream()?.eventsJournal?.sheet?.render(true);
  }
  destroy() {
    this.observer?.disconnect();
    for(const [name,id] of this.hooks) Hooks.off(name,id);
    this.root?.remove();
    document.body.classList.remove('ra-replace-bars');
  }
}

export function registerSettings() {
  const settings={enabled:[Boolean,true], width:[Number,560], top:[Number,0], clock24:[Boolean,false],hideCombat:[Boolean,true],replaceBars:[Boolean,true],showTears:[Boolean,true],animate:[Boolean,true],collapsed:[Boolean,false],interval:[String,'hour'],moonOffset:[Number,0],weatherLabel:[String,'']};
  for(const [key,[type,value]] of Object.entries(settings)) {
    if(game.settings.settings.has(`${ID}.${key}`)) continue;
    game.settings.register(ID,key,{scope:key==='moonOffset'?'world':'client',config:false,type,default:value,onChange:()=>ui.realmsAlmanac?.refresh()});
  }
  game.settings.registerMenu(ID,'settings',{name:'Realms Almanac',label:'Configure Almanac',hint:'Size, time controls, combat visibility and celestial display.',icon:'fa-solid fa-moon',type:AlmanacSettings,restricted:false});
}
export async function start() {
  ui.realmsAlmanac?.destroy();
  const app=ui.realmsAlmanac=new RealmsAlmanac();
  await app.init();
  const module=game.modules.get(ID);
  if(module) module.api={refresh:()=>app.refresh(),readWorld,openSettings:()=>app.settings.render(true)};
}
Hooks.once('init',registerSettings);
Hooks.once('ready',()=>start().catch(notifyError));

import {ID,escapeHTML as esc} from './model.mjs';
import {PLANETS} from './planets.mjs';
import {config,DEFAULT_CONFIG,HARPTOS,WEATHER,weather,saveWeather,generateWeather,AlmanacCalendarData} from './engine.mjs';
const get=k=>game.settings.get(ID,k);
const fail=e=>{console.error(ID,e);ui.notifications.error(e.message);};
const field=(name,label,input,hint='')=>`<div class="form-group"><label for="ra-setting-${name}">${label}</label><div class="form-fields">${input}</div>${hint?`<p class="hint">${hint}</p>`:''}</div>`;
const check=(name,label,value,hint)=>field(name,label,`<input id="ra-setting-${name}" type="checkbox" name="${name}" ${value?'checked':''}>`,hint);
const num=(name,label,value,min,max,step=1,hint='')=>field(name,label,`<input id="ra-setting-${name}" type="number" name="${name}" value="${value}" min="${min}" max="${max}" step="${step}" required>`,hint);
const select=(name,label,value,options,hint='')=>field(name,label,`<select id="ra-setting-${name}" name="${name}">${Object.entries(options).map(([v,l])=>`<option value="${v}" ${value===v?'selected':''}>${l}</option>`).join('')}</select>`,hint);

export class AlmanacSettings extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS={id:'realms-almanac-settings',tag:'form',classes:['ra-settings','standard-form'],window:{title:'Realms Almanac',icon:'fa-solid fa-moon',resizable:true},position:{width:620,height:620},form:{handler:AlmanacSettings.save,closeOnSubmit:false}};
  static TABS={main:{initial:'display',tabs:[{id:'display',label:'Display'},{id:'sky',label:'Sky'},{id:'calendar',label:'Calendar'},{id:'weather',label:'Weather'},{id:'clock',label:'Time & Light'}]}};
  async _renderHTML() {
    const active=this.tabGroups.main,cfg=config();
    const tabs=[['display','Display'],['sky','Sky'],...(game.user.isGM?[['calendar','Calendar'],['weather','Weather'],['clock','Time & Light']]:[])];
    const section=(id,html)=>`<section class="tab ${active===id?'active':''}" data-tab="${id}" data-group="main">${html}</section>`;
    return `<nav class="tabs" data-group="main">${tabs.map(([id,label])=>`<a data-action="tab" data-group="main" data-tab="${id}" class="${active===id?'active':''}">${label}</a>`).join('')}</nav>`+
    section('display',`<fieldset><legend>Position &amp; Controls</legend>${check('enabled','Show Almanac',get('enabled'),'Display the calendar on your screen.')}${num('width','Width',get('width'),420,800,10,'Width in pixels.')}${num('top','Top Offset',get('top'),0,300,1,'Space above the bar in pixels.')}${check('clock24','24-Hour Clock',get('clock24'),'Show 22:00 instead of 10:00 PM.')}${check('hideCombat','Hide During Combat',get('hideCombat'),'Hide while the selected combat is started, with any combat tracker.')}</fieldset>`)+
    section('sky',`<fieldset><legend>Sky Display</legend>${check('showTears','Show Tears of Selûne',get('showTears'),'Rocky bodies with sunlit faces. They fade with daylight, cloud cover and approximate rise and set times.')}${check('showPlanets','Show Realmspace Planets',get('showPlanets'),'Show visible planets in the dial. Click Selûne to inspect the current sky.')}${check('animate','Animate Weather',get('animate'),'Respect the system reduced-motion preference.')}${game.user.isGM?num('moonOffset','Moon Phase Offset',get('moonOffset'),-3650,3650,.0625,'Days added to the reference phase. Zero uses a full moon on 1 Hammer 1372 DR.'):''}</fieldset>${game.user.isGM?`<details><summary>Planet Alignment</summary><p class="hint">Starting angles at 1 Hammer 1372 DR. These set the alignment for your campaign; no canonical dated alignment is known.</p>${[{id:'toril',name:'Toril',angle:0},...PLANETS].map(p=>num(`planet-${p.id}`,p.name,cfg.planetAngles?.[p.id]??p.angle,0,360)).join('')}</details>`:''}`)+
    (game.user.isGM?section('calendar',`<fieldset><legend>World Calendar</legend><p><strong>${esc(cfg.calendar.name)}</strong></p>${num('yearOffset','Year at World Time Zero',cfg.yearOffset,-10000,10000)}<details><summary>Calendar Definition</summary><p class="hint">Edit the calendar JSON. Changing the calendar changes how existing world time is displayed.</p><textarea name="calendarJSON" rows="12" spellcheck="false">${esc(JSON.stringify(cfg.calendar,null,2))}</textarea><button type="button" data-harptos>Use Calendar of Harptos</button></details></fieldset>`)+
    section('weather',`<fieldset><legend>Weather Generation</legend>${check('autoWeather','Generate Weather Each Day',cfg.autoWeather,'Generate one weather update when the world date changes.')}${select('climate','Climate',cfg.climate,{temperate:'Temperate',cold:'Cold',arid:'Arid',tropical:'Tropical'})}${select('unit','Temperature Unit',cfg.unit,{F:'Fahrenheit',C:'Celsius'})}${check('weatherEffects','Apply Scene Weather',cfg.weatherEffects,'Use supported rain, snow or fog effects on the viewed scene when weather changes.')}</fieldset>`)+
    section('clock',`<fieldset><legend>Time Progression</legend>${check('running','Run Clock',cfg.running,'Advance time while the game is unpaused and outside combat.')}${num('rate','Game Seconds per Real Second',cfg.rate,.01,3600,.01)}${num('roundSeconds','Seconds per Combat Round',cfg.roundSeconds,1,3600)}</fieldset><fieldset><legend>Sun &amp; Scene Lighting</legend>${check('seasonalSun','Seasonal Sunrise & Sunset',cfg.seasonalSun,'Vary daylight through the year using the latitude.')}${num('latitude','Latitude',cfg.latitude,-60,60)}${num('dawn','Fixed Sunrise Hour',cfg.dawn,0,23.99,.01,'Used when seasonal sunrise is off.')}${num('dusk','Fixed Sunset Hour',cfg.dusk,0,23.99,.01,'Used when seasonal sunset is off.')}${check('lighting','Synchronize Scene Darkness',cfg.lighting,'Update the viewed scene as world time advances.')}</fieldset>`):'')+
    '<footer class="form-footer"><button type="submit"><i class="fa-solid fa-floppy-disk"></i> Save Changes</button></footer>';
  }
  _replaceHTML(html,content){const y=content.scrollTop;content.innerHTML=html;content.scrollTop=y;}
  _onRender(c,o){super._onRender(c,o);this.element.querySelector('[data-harptos]')?.addEventListener('click',()=>{this.element.querySelector('[name="calendarJSON"]').value=JSON.stringify(HARPTOS,null,2);this.element.querySelector('[name="yearOffset"]').value=1;});}
  static async save(e,form,data) {
    try {
      const d=data.object;
      // Validate all world fields before committing any preferences.
      let cfg;
      if(game.user.isGM) {
        cfg={...config(),calendar:JSON.parse(d.calendarJSON)};
        new AlmanacCalendarData(cfg.calendar,{strict:true});
        const months=cfg.calendar.months.values;
        if(!months.length||months.some(m=>!Number.isInteger(m.days)||m.days<0||!Number.isInteger(m.leapDays??m.days)||(m.leapDays??m.days)<0)) throw new Error('Month lengths must be whole, nonnegative numbers of days.');
        if(months.reduce((sum,m)=>sum+m.days,0)!==cfg.calendar.days.daysPerYear)throw new Error('The month lengths must add up to the configured days per year.');
        if(!cfg.calendar.days.values.length)throw new Error('Define at least one weekday.');
        for(const key of ['yearOffset','latitude','dawn','dusk','rate','roundSeconds']) {cfg[key]=Number(d[key]);if(!Number.isFinite(cfg[key]))throw new Error('Enter valid calendar and clock values.');}
        if(cfg.dawn>=cfg.dusk) throw new Error('Sunrise must be before sunset.');
        for(const key of ['autoWeather','weatherEffects','running','seasonalSun','lighting'])cfg[key]=Boolean(d[key]);
        cfg.climate=d.climate;cfg.unit=d.unit;
        cfg.planetAngles={};for(const p of [{id:'toril'},...PLANETS]){const angle=Number(d[`planet-${p.id}`]);if(!Number.isFinite(angle)||angle<0||angle>360)throw new Error('Planet angles must be between 0 and 360.');cfg.planetAngles[p.id]=angle;}
      }
      for(const key of ['enabled','clock24','hideCombat','showTears','showPlanets','animate'])await game.settings.set(ID,key,Boolean(d[key]));
      for(const key of ['width','top'])await game.settings.set(ID,key,Number(d[key]));
      if(cfg){await game.settings.set(ID,'moonOffset',Number(d.moonOffset));await game.settings.set(ID,'configuration',cfg);}
      await this.close();
    }catch(e){fail(e);}
  }
}
export class WeatherEditor extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS={id:'ra-weather-editor',tag:'form',classes:['standard-form','ra-weather-editor'],window:{title:'Weather',icon:'fa-solid fa-cloud-sun'},position:{width:430},form:{handler:WeatherEditor.save,closeOnSubmit:false}};
  async _renderHTML(){const w=weather();return `<fieldset><legend>Current Weather</legend>${select('kind','Condition',w.kind,Object.fromEntries(Object.entries(WEATHER).map(([k,v])=>[k,v[0]])))}${field('temperature','Temperature',`<input id="ra-setting-temperature" type="number" name="temperature" value="${w.temperature??''}" step="1">`)}${select('unit','Unit',w.unit,{F:'Fahrenheit',C:'Celsius'})}</fieldset><footer class="form-footer"><button type="button" data-generate><i class="fa-solid fa-dice"></i> Generate Weather</button><button type="submit">Apply Weather</button></footer>`;}
  _replaceHTML(html,content){content.innerHTML=html;}
  _onRender(c,o){super._onRender(c,o);this.element.querySelector('[data-generate]').addEventListener('click',async()=>{try{await generateWeather();this.render();}catch(e){fail(e);}});}
  static async save(e,form,data){try{const d=data.object;await saveWeather({kind:d.kind,temperature:d.temperature===''?null:Number(d.temperature),unit:d.unit});await this.close();}catch(e){fail(e);}}
}

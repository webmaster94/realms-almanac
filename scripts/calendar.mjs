import {ID,escapeHTML as esc,dateView,motif} from './model.mjs';
import {config,displayYear} from './engine.mjs';
import {monthsInYear,eventTimestamp,occurrencesInMonth} from './events-model.mjs';
import {icon} from './art.mjs';

const cal=()=>game.time.calendar;
const now=()=>cal().timeToComponents(game.time.worldTime);
const local=s=>game.i18n.localize(s);
const dateLabel=t=>{const c=cal().timeToComponents(t);return `${dateView(cal(),c,{year:displayYear(c.year),localize:local}).label}, ${displayYear(c.year)} · ${String(c.hour).padStart(2,'0')}:${String(c.minute).padStart(2,'0')}`;};
const error=e=>{console.error(ID,e);ui.notifications.error(e.message);};
const canView=p=>game.user.isGM||p.testUserPermission(game.user,CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
export function eventData(page,{includeArchived=false}={}) {
  const own=page.getFlag(ID,'event'), old=page.flags['simple-timekeeping'];
  if(own?.archived&&!includeArchived) return null;
  const value=own??(Number.isFinite(old?.eventTime)?{start:old.eventTime,end:old.eventEnd,repeat:old.repeat}:null);
  return value && Number.isFinite(value.start)?{...value,page,id:page.id,name:page.name}:null;
}
export const eventJournal=()=>game.journal.get(game.settings.get(ID,'eventsJournal')) ?? game.journal.find(j=>j.getFlag(ID,'events'));
let creating;
export async function ensureEventJournal() {
  if(eventJournal()) return eventJournal();
  if(!game.user.isGM) throw new Error('Only a GM can create the calendar journal.');
  if(creating) return creating;
  creating=(async()=>{
    const journal=await JournalEntry.create({name:'Campaign Calendar',flags:{[ID]:{events:true}},ownership:{default:CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}});
    await game.settings.set(ID,'eventsJournal',journal.id);return journal;
  })();
  try{return await creating;}finally{creating=null;}
}
export function listEvents(includeArchived=false) {return (eventJournal()?.pages.contents??[]).filter(canView).map(p=>eventData(p,{includeArchived})).filter(Boolean);}
export function pageBody(page) {
  const doc=new DOMParser().parseFromString(page?.text?.content??'','text/html');
  doc.querySelectorAll('[data-ra-event-date]').forEach(e=>e.remove());
  return doc.body.innerHTML;
}
export function readableContent(event,body) {
  const until=Number.isFinite(event.end)&&event.end>event.start?`<p>Ends: ${esc(dateLabel(event.end))}</p>`:'';
  const repeats=event.repeat?`<p>Repeats every ${esc(event.repeat)}.</p>`:'';
  return `<section data-ra-event-date="true"><p><strong>${esc(dateLabel(event.start))}</strong></p>${until}${repeats}${event.archived?'<p><strong>Archived</strong></p>':''}</section>${body}`;
}
async function shareJournalContainer(journal,exceptId) {
  if((journal.ownership.default??0)>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) return;
  // Making the journal browsable must not expose previously inherited private pages.
  const updates=journal.pages.contents.filter(page=>page.id!==exceptId).map(page=>{
    const ownership={...page.ownership,default:(page.ownership.default??-1)>=0?page.ownership.default:(journal.ownership.default??0)};
    for(const user of game.users)ownership[user.id]=[3,2,1,0].find(level=>page.testUserPermission(user,level));
    return {_id:page.id,ownership};
  });
  if(updates.length)await journal.updateEmbeddedDocuments('JournalEntryPage',updates);
  await journal.update({'ownership.default':CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER});
}
export async function saveEvent({page,name,start,end,repeat='',body,publicEvent=false}) {
  if(!game.user.isGM && !page?.isOwner) throw new Error('You do not have permission to edit this event.');
  if(!name.trim() || !Number.isFinite(start) || (end!==null && (!Number.isFinite(end)||end<start))) throw new Error('Give the event a title and a valid start and end time.');
  if(!['','day','week','month','year'].includes(repeat)) throw new Error('Choose a valid repeat interval.');
  const event={...(page?.getFlag(ID,'event')?.archived?{archived:true}:{}),start,end,repeat,calendar:cal().name};
  const journal=page?.parent??await ensureEventJournal();
  if(publicEvent&&game.user.isGM)await shareJournalContainer(journal,page?.id);
  const data={name:name.trim(),type:'text','text.format':CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML,'text.content':readableContent(event,body),[`flags.${ID}.event`]:event};
  // Ownership is explicit on each page, including when the journal itself is shared.
  data['ownership.default']=publicEvent?CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER:CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
  if(page) return page.update(data);
  return (await journal.createEmbeddedDocuments('JournalEntryPage',[data]))[0];
}

export function dateFields(c,prefix='') {
  const months=monthsInYear(cal(),c.year).filter(m=>m.days>0);
  const month=months.find(m=>m.index===c.month)??months[0];
  return `<div class="ra-date-fields">
    <label>Year<input type="number" name="${prefix}year" value="${displayYear(c.year)}" step="1" required></label>
    <label>Month<select name="${prefix}month">${months.map(m=>`<option value="${m.index}" ${m.index===month.index?'selected':''}>${esc(local(m.name))}</option>`).join('')}</select></label>
    <label>Day<input type="number" name="${prefix}day" min="1" max="${month.days}" value="${Math.min(c.dayOfMonth+1,month.days)}" required></label>
    <label>Hour<input type="number" name="${prefix}hour" min="0" max="${cal().days.hoursPerDay-1}" value="${c.hour??0}" required></label>
    <label>Minute<input type="number" name="${prefix}minute" min="0" max="${cal().days.minutesPerHour-1}" value="${c.minute??0}" required></label></div>`;
}
function bindDateFields(root,prefix='') {
  const field=key=>root.querySelector(`[name="${prefix}${key}"]`);
  const update=()=>{
    const year=Number(field('year').value)-config().yearOffset;
    if(!Number.isInteger(year)) return;
    const all=monthsInYear(cal(),year),months=all.filter(m=>m.days>0),selected=Number(field('month').value);
    const current=months.find(m=>m.index===selected);
    field('month').innerHTML=(!current?`<option value="${selected}" selected disabled>${esc(local(all[selected]?.name??'Festival'))} (Not This Year)</option>`:'')+months.map(m=>`<option value="${m.index}" ${m.index===selected?'selected':''}>${esc(local(m.name))}</option>`).join('');
    field('day').setCustomValidity(current?'':'This festival does not occur in the selected year. Choose another date.');
    if(!current)return;
    field('day').max=current.days;field('day').value=Math.max(1,Math.min(Number(field('day').value)||1,current.days));
  };
  field('year').addEventListener('change',update);field('month').addEventListener('change',update);
}
function submittedDate(data,prefix='') {
  return eventTimestamp(cal(),{year:Number(data[`${prefix}year`])-config().yearOffset,month:Number(data[`${prefix}month`]),day:Number(data[`${prefix}day`]),hour:Number(data[`${prefix}hour`]),minute:Number(data[`${prefix}minute`])});
}
class DateEditor extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS={id:'ra-set-date',tag:'form',classes:['standard-form','ra-date-editor'],window:{title:'Set Date & Time',icon:'fa-solid fa-clock'},position:{width:520},form:{handler:DateEditor.submit,closeOnSubmit:false}};
  async _renderHTML(){return `<fieldset><legend>World Date</legend>${dateFields(now())}<p class="hint">Changing the date advances or rewinds world time and its linked game systems.</p></fieldset><footer class="form-footer"><button type="submit">Set Date &amp; Time</button></footer>`;}
  _replaceHTML(html,content){content.innerHTML=html;}
  _onRender(c,o){super._onRender(c,o);bindDateFields(this.element);}
  static async submit(e,form,data){try{if(!game.user.isGM) throw new Error('Only a GM can set world time.');await game.time.set(submittedDate(data.object));await this.close();}catch(e){error(e);}}
}
export const openDateEditor=()=>new DateEditor().render(true);

export class EventEditor extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS={id:'ra-event-{id}',tag:'form',classes:['standard-form','ra-event-editor'],window:{title:'Calendar Event',icon:'fa-solid fa-calendar-plus',resizable:true},position:{width:570,height:650},form:{handler:EventEditor.submit,closeOnSubmit:false}};
  constructor({page=null,date=now()}={}) {super();this.page=page;this.date=date;this.originalBody=pageBody(page);const d=new DOMParser().parseFromString(this.originalBody,'text/html');this.plain=d.body.innerText??d.body.textContent??'';}
  async _renderHTML() {
    const event=this.page?eventData(this.page,{includeArchived:true}):null;
    const c=event?cal().timeToComponents(event.start):this.date;
    const end=Number.isFinite(event?.end)?cal().timeToComponents(event.end):c;
    const shared=this.page?this.page.ownership.default>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER:true;
    return `<div class="form-group"><label>Title</label><input name="name" value="${esc(this.page?.name??'')}" required autofocus></div><fieldset><legend>Starts</legend>${dateFields(c)}</fieldset>
    <fieldset><legend>Ends</legend><label class="checkbox"><input type="checkbox" name="hasEnd" ${event?.end>event?.start?'checked':''}> Set an End Time</label><div class="ra-end-date">${dateFields(end,'end-')}</div></fieldset>
    <div class="form-group"><label>Repeat</label><select name="repeat">${[['','Does Not Repeat'],['day','Daily'],['week','Weekly'],['month','Monthly'],['year','Yearly']].map(([v,label])=>`<option value="${v}" ${event?.repeat===v?'selected':''}>${label}</option>`).join('')}</select></div>
    <div class="form-group stacked"><label>Description</label><textarea name="description" rows="6">${esc(this.plain)}</textarea></div>
    ${game.user.isGM?`<label class="checkbox"><input type="checkbox" name="publicEvent" ${shared?'checked':''}> Visible to Players</label>`:''}
    <p class="hint">Saved as a readable page in the campaign calendar journal.</p><footer class="form-footer"><button type="submit">Save Event</button></footer>`;
  }
  _replaceHTML(html,content){const y=content.scrollTop;content.innerHTML=html;content.scrollTop=y;}
  _onRender(c,o){super._onRender(c,o);bindDateFields(this.element);bindDateFields(this.element,'end-');const enabled=this.element.querySelector('[name="hasEnd"]'),end=this.element.querySelector('.ra-end-date');const update=()=>{end.hidden=!enabled.checked;end.querySelectorAll('input,select').forEach(e=>e.disabled=!enabled.checked);};enabled.addEventListener('change',update);update();}
  static async submit(e,form,data) {
    try {
      const d=data.object,start=submittedDate(d),end=d.hasEnd?submittedDate(d,'end-'):null;
      const body=d.description===this.plain?this.originalBody:String(d.description??'').split(/\n\s*\n/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join('');
      const publicEvent=game.user.isGM?Boolean(d.publicEvent):this.page.ownership.default>=CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
      await saveEvent({page:this.page,name:String(d.name),start,end,repeat:d.repeat,body,publicEvent});await this.close();
    }catch(e){error(e);}
  }
}

export class AlmanacMonthView extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS={id:'realms-almanac-calendar',classes:['ra-calendar'],window:{title:'Calendar',icon:'fa-solid fa-calendar-days',resizable:true},position:{width:800,height:680}};
  static TABS={main:{initial:'month',tabs:[{id:'month',label:'Month'},{id:'events',label:'Events'}]}};
  constructor(){super();this.current=now();this.year=this.current.year;this.month=this.current.month;this.day=this.current.dayOfMonth+1;this.hooks=[];}
  async _renderHTML() {
    const months=monthsInYear(cal(),this.year).filter(m=>m.days>0),month=months.find(m=>m.index===this.month)??months[0];this.month=month.index;this.day=Math.min(this.day,month.days);
    const events=listEvents().flatMap(e=>occurrencesInMonth(cal(),e,this.year,this.month)).sort((a,b)=>a.start-b.start);
    const archived=this.showArchived?listEvents(true).filter(e=>e.archived).flatMap(e=>occurrencesInMonth(cal(),e,this.year,this.month)):[];
    const daySeconds=cal().days.hoursPerDay*cal().days.minutesPerHour*cal().days.secondsPerMinute;
    const start=cal().componentsToTime({year:this.year,day:month.start});
    const forDay=d=>events.filter(e=>e.start<start+d*daySeconds&&(e.end>e.start?e.end>start+(d-1)*daySeconds:e.start>=start+(d-1)*daySeconds));
    const selected=forDay(this.day),today=now();
    const week=cal().days.values.length||10;
    const first=cal().timeToComponents(start),offset=month.intercalary||week===10?0:((first.dayOfWeek%week)+week)%week;
    const cells=Array.from({length:offset},()=>'<span class="ra-empty-day"></span>').join('')+Array.from({length:month.days},(_,i)=>{
      const day=i+1,entries=forDay(day),title=month.intercalary?local(month.name):`${day} ${local(month.name)}`;
      return `<button type="button" class="ra-day ${day===this.day?'selected':''} ${today.year===this.year&&today.month===this.month&&today.dayOfMonth===i?'today':''}" data-day="${day}" aria-label="${esc(title)}, ${entries.length} events" aria-pressed="${day===this.day}"><strong>${month.intercalary?icon(motif(local(month.name))[2]):day}</strong>${entries.slice(0,2).map(e=>`<span>${esc(e.name)}</span>`).join('')}${entries.length>2?`<small>+${entries.length-2} more</small>`:''}</button>`;
    }).join('');
    const row=e=>`<li><button type="button" class="ra-event-open" data-event="${e.id}"><strong>${esc(e.name)}</strong><small>${esc(dateLabel(e.start))}${e.repeat?' · Repeating':''}</small></button>${e.page.isOwner?`<button type="button" data-edit="${e.id}" aria-label="Edit ${esc(e.name)}" title="Edit Event"><i class="fa-solid fa-pen"></i></button><button type="button" data-archive="${e.id}" aria-label="${e.archived?'Restore':'Archive'} ${esc(e.name)}" title="${e.archived?'Restore Event':'Archive Event'}"><i class="fa-solid fa-${e.archived?'rotate-left':'box-archive'}"></i></button>`:''}</li>`;
    const active=this.tabGroups.main;
    return `<header class="ra-month-nav"><button type="button" data-nav="-1" aria-label="Previous Month"><i class="fa-solid fa-chevron-left"></i></button><select name="month" aria-label="Month">${months.map(m=>`<option value="${m.index}" ${m.index===this.month?'selected':''}>${esc(local(m.name))}</option>`).join('')}</select><input type="number" name="year" aria-label="Year" value="${displayYear(this.year)}"><button type="button" data-nav="1" aria-label="Next Month"><i class="fa-solid fa-chevron-right"></i></button><button type="button" data-today>Today</button></header>
    <nav class="tabs" data-group="main"><a data-action="tab" data-group="main" data-tab="month" class="${active==='month'?'active':''}">Month</a><a data-action="tab" data-group="main" data-tab="events" class="${active==='events'?'active':''}">Events</a></nav>
    <section class="tab ${active==='month'?'active':''}" data-group="main" data-tab="month"><div class="ra-weekdays" style="--ra-week:${month.intercalary?1:week}">${month.intercalary?'<span>Festival Day</span>':cal().days.values.map(d=>`<span title="${esc(local(d.name))}">${esc(local(d.abbreviation||d.name))}</span>`).join('')}</div><div class="ra-month-grid" style="--ra-week:${month.intercalary?1:week}">${Array.isArray(cells)?cells.join(''):cells}</div><div class="ra-day-heading"><h3>${esc(month.intercalary?local(month.name):`${this.day} ${local(month.name)}`)}</h3>${game.user.isGM?'<button type="button" data-new><i class="fa-solid fa-plus"></i> Add Event</button>':''}</div><ul class="ra-event-list">${selected.map(row).join('')||'<li class="ra-no-events">No events on this day.</li>'}</ul></section>
    <section class="tab ${active==='events'?'active':''}" data-group="main" data-tab="events"><h3>Events This Month</h3><label class="checkbox"><input type="checkbox" data-show-archived ${this.showArchived?'checked':''}> Show Archived Events</label><ul class="ra-event-list">${[...events,...archived].map(row).join('')||'<li class="ra-no-events">No events this month.</li>'}</ul>${game.user.isGM?'<button type="button" data-new>Add Event</button>':''}</section>
    <footer class="ra-calendar-footer"><button type="button" data-journal><i class="fa-solid fa-book"></i> Open Event Journal</button>${game.user.isGM?'<button type="button" data-set-date>Set World Date</button>':''}<button type="button" data-reference>Calendar Lore</button><span class="hint">Events remain in the journal when the module is disabled.</span></footer>`;
  }
  _replaceHTML(html,content){const scrolls=[...content.querySelectorAll('.tab')].map(e=>[e.dataset.tab,e.scrollTop]);content.innerHTML=html;for(const [tab,y]of scrolls){const el=content.querySelector(`[data-tab="${tab}"].tab`);if(el)el.scrollTop=y;}}
  _onRender(c,o){
    super._onRender(c,o);
    if(!this.hooks.length) {
      for(const name of ['createJournalEntryPage','updateJournalEntryPage','deleteJournalEntryPage','updateJournalEntry']) this.hooks.push([name,Hooks.on(name,()=>this.render())]);
      this.hooks.push(['updateWorldTime',Hooks.on('updateWorldTime',()=>{const c=now(),key=`${c.year}/${c.day}`;if(key!==this.todayKey){this.todayKey=key;this.render();}})]);
      const c=now();this.todayKey=`${c.year}/${c.day}`;
    }
    const root=this.element;
    root.querySelector('[data-show-archived]').addEventListener('change',e=>{this.showArchived=e.target.checked;this.render();});
    root.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>{this.navigate(Number(b.dataset.nav));}));
    root.querySelector('[name="month"]').addEventListener('change',e=>{this.month=Number(e.target.value);this.day=1;this.render();});
    root.querySelector('[name="year"]').addEventListener('change',e=>{const y=Number(e.target.value);if(Number.isInteger(y)){this.year=y-config().yearOffset;this.render();}});
    root.querySelector('[data-today]').addEventListener('click',()=>{const c=now();this.year=c.year;this.month=c.month;this.day=c.dayOfMonth+1;this.render();});
    root.querySelectorAll('[data-day]').forEach(b=>b.addEventListener('click',()=>{this.day=Number(b.dataset.day);this.render();}));
    root.querySelectorAll('[data-new]').forEach(b=>b.addEventListener('click',()=>new EventEditor({date:{year:this.year,month:this.month,dayOfMonth:this.day-1,hour:0,minute:0}}).render(true)));
    root.querySelectorAll('[data-event]').forEach(b=>b.addEventListener('click',()=>eventJournal()?.pages.get(b.dataset.event)?.sheet.render(true)));
    root.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{const page=eventJournal()?.pages.get(b.dataset.edit);if(page?.isOwner)new EventEditor({page}).render(true);}));
    root.querySelectorAll('[data-archive]').forEach(b=>b.addEventListener('click',async()=>{try{const page=eventJournal()?.pages.get(b.dataset.archive);if(!page?.isOwner)return;const original=eventData(page,{includeArchived:true});const event={...original,archived:!original.archived};delete event.page;delete event.id;delete event.name;await page.update({[`flags.${ID}.event`]:event,'text.content':readableContent(event,pageBody(page))});}catch(e){error(e);}}));
    root.querySelector('[data-journal]').addEventListener('click',async()=>{try{const j=eventJournal()??(game.user.isGM?await ensureEventJournal():null);if(j)j.sheet.render(true);}catch(e){error(e);}});
    root.querySelector('[data-set-date]')?.addEventListener('click',openDateEditor);
    root.querySelector('[data-reference]').addEventListener('click',()=>ui.realmsAlmanac.action('reference'));
  }
  navigate(direction) {let m=this.month,y=this.year;do{m+=direction;if(m<0){y--;m=cal().months.values.length-1;}if(m>=cal().months.values.length){y++;m=0;}}while(!monthsInYear(cal(),y)[m].days);this.year=y;this.month=m;this.day=1;this.render();}
  async close(options){for(const[n,id]of this.hooks)Hooks.off(n,id);this.hooks=[];return super.close(options);}
}

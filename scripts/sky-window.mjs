import {PLANETS} from './planets.mjs';
import {escapeHTML as esc} from './model.mjs';
export class SkyWindow extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS={id:'ra-realmspace',classes:['ra-sky-window'],window:{title:'Realmspace Sky',icon:'fa-solid fa-planet-ringed',resizable:true},position:{width:590,height:540}};
  constructor(read){super();this.read=read;}
  async _renderHTML(){const w=this.read();return `<p>${esc(w.date.label)}, ${w.date.year} · ${esc(w.time)}</p><p class="hint">Approximate visibility from Toril. The small sky symbols are enlarged to make them readable.</p>${w.realms?`<table><thead><tr><th>Planet</th><th>Appearance</th><th>Current Sky</th></tr></thead><tbody>${w.planets.map(p=>`<tr><td><span class="ra-planet-dot" style="background:${p.color}"></span>${esc(p.name)}</td><td>${p.appearance}</td><td>${p.reason}${p.reason==='Visible'?` · ${p.direction}`:''}</td></tr>`).join('')}</tbody></table>`:'<p>The Realmspace sky is available with a Harptos calendar.</p>'}<h3>Selûne &amp; Her Tears</h3><p>${w.phase?`${esc(w.phase.name)} · ${Math.round(w.phase.lit*100)}% illuminated.`:''} The Tears trail the moon by four to seven hours. Their rocky forms are enlarged, with approximate lighting and horizon visibility.</p><p class="hint">The planets use published orbital periods and distances with circular orbits. Their starting alignment can be changed in Sky settings; no canonical dated alignment is known.</p>`;}
  _replaceHTML(html,content){const y=content.scrollTop;content.innerHTML=html;content.scrollTop=y;}
}

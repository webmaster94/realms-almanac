export const ID = "realms-almanac";
export const DAY = 86400;
export const LUNATION = 2629800;
export const mod = (n, d) => ((n % d) + d) % d;
export const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

// These motifs are original visual shorthand, not official Realms heraldry.
export const MONTHS = [
  ["Hammer", "Deepwinter", "snow", "#758dac"],
  ["Alturiak", "The Claw of Winter", "ice", "#8198b5"],
  ["Ches", "The Claw of the Sunsets", "sunset", "#be8396"],
  ["Tarsakh", "The Claw of the Storms", "storm", "#8c92b3"],
  ["Mirtul", "The Melting", "drop", "#75b3a2"],
  ["Kythorn", "The Time of Flowers", "flower", "#c28aa3"],
  ["Flamerule", "Summertide", "flame", "#d79a63"],
  ["Eleasis", "Highsun", "sun", "#d9b56d"],
  ["Eleint", "The Fading", "leaf", "#c08e60"],
  ["Marpenoth", "Leaffall", "leaves", "#bd785a"],
  ["Uktar", "The Rotting", "branch", "#a69684"],
  ["Nightal", "The Drawing Down", "star", "#8496c1"]
];
export const FESTIVALS = {
  midwinter: ["Midwinter", "The winter festival", "winter-wreath", "#a6c6db"],
  greengrass: ["Greengrass", "The coming of spring", "wreath", "#8fbc8c"],
  midsummer: ["Midsummer", "A celebration of summer", "festival-sun", "#e3bd75"],
  shieldmeet: ["Shieldmeet", "A day of renewed agreements", "shield", "#b7c8d8"],
  highharvestide: ["Highharvestide", "The harvest feast", "wheat", "#d6b677"],
  feastofthemoon: ["Feast of the Moon", "Remembering the honored dead", "candle", "#c2b3d9"]
};
export const normalize = s => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");
export function motif(name) {
  const key = normalize(name);
  return FESTIVALS[key] ?? MONTHS.find(m => normalize(m[0]) === (key === "eleasias" ? "eleasis" : key)) ?? [name, "", "star", "#a8b7cd"];
}
export function frameTheme(name) {
  const base=motif(name)[3];
  const blend=(other,weight)=>'#'+[0,1,2].map(i=>Math.round(parseInt(base.slice(1+i*2,3+i*2),16)*(1-weight)+parseInt(other.slice(1+i*2,3+i*2),16)*weight).toString(16).padStart(2,'0')).join('');
  return {base,dark:blend('#171322',.68),mid:blend('#6c6571',.18),light:blend('#fff7df',.64),rail:blend('#101422',.87),rim:blend('#151a30',.78)};
}
export function isHarptos(calendar, localize = x => x) {
  const names = (calendar.months?.values ?? []).map(m => normalize(localize(m.name)));
  return names.includes("hammer") && names.includes("nightal");
}
export function phaseForDate(year, day, hour = 0, minute = 0, second = 0, offsetDays = 0) {
  const elapsedDays = 365 * (year - 1372) + Math.floor((year - 1) / 4) - Math.floor(1371 / 4) + day;
  const q = mod((elapsedDays + offsetDays) * DAY + hour * 3600 + minute * 60 + second, LUNATION) / LUNATION;
  const names = ["Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent", "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous"];
  return {q, lit: (1 + Math.cos(2 * Math.PI * q)) / 2, name: names[Math.round(q * 8) % 8], waxing: q > 0.5};
}

const smooth = value => { const t=Math.max(0,Math.min(1,value)); return t*t*(3-2*t); };
/** Approximate trailing-cluster visibility, not an orbital ephemeris.
 * The lore's 4–7 hour rise delay supplies the angular separation from Selûne.
 * Assume a 12-hour horizon crossing and scale apparent contrast by illumination.
 */
export function tearAppearance({q, hour, dawn=6, dusk=18, lag=4, weather="clear"}) {
  if (![q,hour,dawn,dusk,lag].every(Number.isFinite)) return {q:0,lit:0,opacity:0};
  const phase=mod(q+lag/24,1);
  const lit=(1+Math.cos(phase*2*Math.PI))/2;
  const sinceDusk=mod(hour-dusk,24), nightLength=mod(dawn-dusk,24);
  const darkness=sinceDusk<nightLength ? smooth(sinceDusk/.75)*smooth((nightLength-sinceDusk)/.75) : 0;
  const risen=mod(hour-mod(dusk+q*24+lag,24),24);
  const horizon=risen<12 ? smooth(risen/.6)*smooth((12-risen)/.6) : 0;
  const transmission={clear:1,wind:.9,cloud:.25,rain:.1,snow:.12,storm:0,fog:0}[weather] ?? 1;
  // A fully unlit rock disappears; there is no glowing outline on its dark face.
  const contrast=smooth(lit/.12)*(.25+.75*Math.sqrt(lit));
  return {q:phase,lit,opacity:darkness*horizon*transmission*contrast};
}
export function weatherKind(label = "", effect = "") {
  const t = `${label} ${effect}`.toLowerCase();
  if (/thunder|storm|lightning/.test(t)) return "storm";
  if (/snow|blizzard|sleet|hail/.test(t)) return "snow";
  if (/rain|drizzle|shower/.test(t)) return "rain";
  if (/fog|mist|haze/.test(t)) return "fog";
  if (/overcast|cloud/.test(t)) return "cloud";
  if (/wind|gale/.test(t)) return "wind";
  return "clear";
}
export function timeOfDay(hour, dawn = 6, dusk = 18) {
  if (Math.abs(hour - dawn) < 0.6) return "dawn";
  if (Math.abs(hour - dusk) < 0.6) return "dusk";
  return hour > dawn && hour < dusk ? "day" : "night";
}
export function shouldHideInCombat(enabled, combat) {
  return Boolean(enabled && (combat?.started || combat?.combatants?.size > 0));
}
export function intervalSeconds(interval, calendar) {
  const d = calendar.days;
  const minute = d.secondsPerMinute;
  const hour = minute * d.minutesPerHour;
  return {minute, hour, day: hour * d.hoursPerDay}[interval] ?? hour;
}
export function dateView(calendar, components, {year, localize = x => x} = {}) {
  const month = calendar.months.values[components.month];
  const name = localize(month?.name ?? calendar.name);
  const holiday = Boolean(month?.intercalary || FESTIVALS[normalize(name)]);
  const displayYear = year ?? components.year;
  return {name, year: displayYear, holiday, day: components.dayOfMonth + 1,
    label: `${holiday ? "" : `${components.dayOfMonth + 1} `}${name}`, motif: motif(name)};
}

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
  return Boolean(enabled && combat?.started);
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

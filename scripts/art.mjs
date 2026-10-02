import {escapeHTML, mod} from "./model.mjs";

const glyphs = {
  snow: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M8 4l4 4 4-4M8 20l4-4 4 4M3 11l5-1-1-5M21 13l-5 1 1 5M3 13l5 1-1 5M21 11l-5-1 1-5"/>',
  ice: '<path d="M3 4h18M5 4l2 14 3-14m1 0 2 18 3-18m1 0 2 11 2-11"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
  sunset: '<path d="M2 16h20M4 20h16M7 16a5 5 0 0 1 10 0M12 2v3M3 7l3 3M21 7l-3 3"/>',
  storm: '<path d="M5 15a4 4 0 0 1 0-8 6 6 0 0 1 11-2 5 5 0 0 1 3 10h-4M12 11l-4 7h5l-2 5 7-9h-5"/>',
  drop: '<path d="M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13Z"/><path d="M8 14c-1 3 1 5 3 5"/>',
  flower: '<path d="M12 8C4-3 0 9 8 12-3 20 9 24 12 16c8 11 12-1 4-4 11-8-1-12-4-4Z"/><circle cx="12" cy="12" r="2"/>',
  flame: '<path d="M12 2c3 6-2 7 2 10l4-5c7 10 0 17-6 15S2 15 6 9c-1 6 5 7 6-7Z"/>',
  leaf: '<path d="M4 20C-2 7 14 6 20 2c3 15-4 22-16 18ZM4 20 17 7M9 15l-1-5m6 0 4 1"/>',
  leaves: '<path d="M12 22V6M12 12C3 14 2 7 2 3c7 0 12 3 10 9ZM12 18c9 2 10-5 10-9-7 0-12 3-10 9Z"/>',
  branch: '<path d="M12 22V3M12 10 5 6 3 2M5 6H1M12 15l8-7 2-5M18 10h5M12 20 5 16l-2-4"/>',
  star: '<path d="m12 1 2.5 8.5L23 12l-8.5 2.5L12 23l-2.5-8.5L1 12l8.5-2.5Z"/>',
  shield: '<path d="m12 2 9 3v7c0 6-9 10-9 10S3 18 3 12V5ZM12 6v12M7 11h10"/>',
  wheat: '<path d="M12 23V3M12 8C5 8 5 5 5 2c4 0 7 2 7 6Zm0 5c7 0 7-3 7-6-4 0-7 2-7 6Zm0 4c-7 0-7-3-7-6 4 0 7 2 7 6Zm0 5c7 0 7-3 7-6-4 0-7 2-7 6Z"/>',
  candle: '<path d="M9 22V12h6v10M6 22h12M12 10c-5-2-1-5 1-8 4 5 2 8-1 8ZM20 2a5 5 0 0 0 2 8"/>',
  wind: '<path d="M2 8h14c7 0 5-8 1-5M2 12h18M2 16h10c7 0 5 8 1 5"/>',
  cloud: '<path d="M6 18a5 5 0 0 1 0-10 6 6 0 0 1 11-2 6 6 0 1 1 1 12Z"/>',
  rain: '<path d="M6 14a4 4 0 0 1 0-8 6 6 0 0 1 11-2 5 5 0 0 1 1 10M7 17l-2 5m9-5-2 5m9-5-2 5"/>',
  fog: '<path d="M4 8a4 4 0 0 1 5-5 5 5 0 0 1 9 5M2 12h20M5 16h14M2 20h20"/>',
};
glyphs.wreath = `<path d="M5 3C-4 17 8 26 12 20c4 6 16-3 7-17M4 7l4 2M3 13l5 1M20 7l-4 2M21 13l-5 1"/><g transform="translate(6 2) scale(.5)">${glyphs.flower}</g>`;
glyphs["winter-wreath"] = `<circle cx="12" cy="12" r="10" stroke-dasharray="2 2"/><g transform="translate(4 4) scale(.66)">${glyphs.snow}</g>`;
glyphs["festival-sun"] = `${glyphs.sun}<path d="m2 22 4-3 3 3m6 0 3-3 4 3"/>`;
export function icon(name, cls = "") {
  return `<svg class="ra-icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name] ?? glyphs.star}</svg>`;
}

// Construct the lit portion of a spherical disc from projected longitude.
// q=0 is full, q=.5 is new. The waning half is lit on the left.
export function moonDisc(q, id = "ra-moon") {
  const cos = Math.cos(q * 2 * Math.PI);
  const side = q < .5 ? -1 : 1;
  const edge = [], terminator = [];
  for (let i = 0; i <= 40; i++) {
    const y = -1 + i / 20;
    const x = Math.sqrt(Math.max(0, 1 - y * y));
    edge.push(`${16 + side * 14 * x},${16 + 14 * y}`);
    terminator.unshift(`${16 - side * cos * 14 * x},${16 + 14 * y}`);
  }
  return `<svg viewBox="0 0 32 32" class="ra-moon-disc" aria-hidden="true"><defs><radialGradient id="${id}"><stop stop-color="#fbf8df"/><stop offset=".55" stop-color="#d4dce4"/><stop offset="1" stop-color="#8b9bae"/></radialGradient><clipPath id="${id}-lit"><path d="M${edge.join("L")}L${terminator.join("L")}Z"/></clipPath></defs><circle cx="16" cy="16" r="14.5" fill="#0e162d" stroke="#8897b5" stroke-opacity=".55" stroke-width=".6"/><g clip-path="url(#${id}-lit)"><circle cx="16" cy="16" r="14" fill="url(#${id})"/><g fill="#69778f" opacity=".3"><circle cx="10" cy="10" r="3.2"/><circle cx="20" cy="19" r="4"/><circle cx="11" cy="23" r="2.2"/><circle cx="22" cy="8" r="1.8"/><circle cx="7" cy="16" r="1.2"/></g></g></svg>`;
}

export function skyArt({period, weather, hour, dawn, dusk, phase, showTears = true}) {
  const colors = {night:["#10132c", "#35335e", "#806b87"], day:["#245773", "#77adba", "#e2cb95"], dawn:["#514567", "#b48293", "#edc88e"], dusk:["#272b51", "#8b617a", "#d99a6f"]}[period];
  const night = period === "night";
  const cloud = ["cloud", "rain", "storm", "snow", "fog"].includes(weather);
  const starPoints = Array.from({length: 36}, (_, i) => {
    const x = 25 + mod(i * 73, 270), y = 5 + mod(i * 31, 95);
    return `<circle cx="${x}" cy="${y}" r="${i % 6 ? .55 : 1}" opacity="${.3 + i % 5 * .13}"/>`;
  }).join("");
  const ticks = Array.from({length: 49}, (_, i) => {
    const a = i / 48 * Math.PI, r = i % 4 ? 140 : 136;
    return `<path d="M${160 + Math.cos(a)*r} ${-30 + Math.sin(a)*r}L${160 + Math.cos(a)*145} ${-30 + Math.sin(a)*145}"/>`;
  }).join("");
  const swirls = Array.from({length: 11}, (_, i) => {
    const a = 25 + i * 13;
    return `<g transform="translate(160 -30) rotate(${a}) translate(0 126)"><path d="M-12 0c0-13 24-13 24 0s-20 12-20 0 13-8 13 0-7 5-7 0"/><path d="m-16 0 4-4m24 4 4 4"/></g>`;
  }).join("");
  const sunProgress = Math.max(0, Math.min(1, (hour-dawn)/(dusk-dawn)));
  const sx = 62 + sunProgress * 196, sy = 78 - Math.sin(sunProgress*Math.PI)*42;
  const sun = !night ? `<g class="ra-sun" transform="translate(${sx} ${sy})"><circle r="20" fill="url(#ra-sun-glow)"/><g stroke="#f5dda2" opacity=".85">${Array.from({length:12},(_,i)=>`<path transform="rotate(${i*30})" d="M0 9v5"/>`).join("")}</g><circle r="6.5" fill="#fff0b0" stroke="#d9a963"/></g>` : "";
  const tears = showTears && night ? `<g class="ra-tears" fill="#e4edff" opacity="${cloud ? .24 : .95}">${[[190,66],[201,63],[207,52],[217,57],[222,45],[233,47],[238,33],[248,33],[253,21]].map(([x,y],i)=>`<path d="M${x-2.5} ${y}h5m-2.5-2.5v5" stroke="#c8ddff" stroke-width="${i%3 ? .8 : 1.1}"/><circle cx="${x}" cy="${y}" r="${i%3 ? 1 : 1.5}"/>`).join("")}</g>` : "";
  const clouds = cloud ? `<g class="ra-clouds" opacity="${night ? .7 : .85}" fill="url(#ra-cloud)"><path d="M-20 55Q10 35 39 49Q52 21 75 43Q103 32 123 58Q153 37 178 62L190 86H-20Z"/><path d="M176 38Q197 16 218 39Q244 11 264 36Q293 24 328 47V80H176Z"/></g>` : "";
  const precipitation = ["rain","storm","snow"].includes(weather) ? `<g class="ra-precipitation" stroke="#d5e4f3" opacity=".6">${Array.from({length:22},(_,i)=> {const x=55+mod(i*43,220),y=39+mod(i*23,65);return weather==="snow"?`<circle cx="${x}" cy="${y}" r="1" fill="#fff"/>`:`<path d="M${x} ${y}l-3 7"/>`;}).join("")}</g>` : "";
  return `<svg class="ra-sky" viewBox="0 0 320 124" aria-hidden="true"><defs>
    <linearGradient id="ra-gold" x2="0.8" y2="1"><stop stop-color="#35261c"/><stop offset=".18" stop-color="#b59a65"/><stop offset=".38" stop-color="#f0dfab"/><stop offset=".53" stop-color="#6e5432"/><stop offset=".72" stop-color="#c9ac6c"/><stop offset="1" stop-color="#443420"/></linearGradient>
    <linearGradient id="ra-sky-fill" x2="0" y2="1"><stop stop-color="${colors[0]}"/><stop offset=".65" stop-color="${colors[1]}"/><stop offset="1" stop-color="${colors[2]}"/></linearGradient>
    <linearGradient id="ra-cloud" x2="0" y2="1"><stop stop-color="${night ? '#72758d' : '#dae2e2'}"/><stop offset="1" stop-color="${night ? '#30334d' : '#7a93a4'}"/></linearGradient>
    <radialGradient id="ra-sun-glow"><stop stop-color="#fff1b2" stop-opacity=".8"/><stop offset="1" stop-color="#e9c985" stop-opacity="0"/></radialGradient>
    <clipPath id="ra-bowl"><path d="M21 0H299A142 142 0 0 1 21 0Z"/></clipPath>
    <clipPath id="ra-inner"><path d="M43 0H277A121 121 0 0 1 43 0Z"/></clipPath>
    </defs>
    <path d="M10 0H310A153 153 0 0 1 10 0Z" fill="#111323" stroke="#090b12" stroke-width="5"/>
    <path d="M13 0H307A150 150 0 0 1 13 0Z" fill="#171d34" stroke="url(#ra-gold)" stroke-width="3"/>
    <g clip-path="url(#ra-bowl)" fill="none" stroke="#8492b5" stroke-width=".8" opacity=".22">${swirls}</g>
    <g fill="none" stroke="#ceb98c" stroke-width=".7" opacity=".6">${ticks}</g>
    <path d="M40 0H280A124 124 0 0 1 40 0Z" fill="url(#ra-sky-fill)" stroke="url(#ra-gold)" stroke-width="3"/>
    <g clip-path="url(#ra-inner)"><g fill="#e4e3f0" opacity="${night ? .85 : .12}">${starPoints}</g>${sun}${tears}${clouds}${precipitation}
    ${weather==='storm'?'<path class="ra-lightning" d="m245 31-12 20h10l-12 19 25-26h-12l8-13" fill="#eef0ff" opacity=".75"/>':''}
    <path d="M33 99Q71 82 108 97T196 96T290 90V130H33Z" fill="#11182a" opacity=".55"/>
    </g><path d="m160 105 3 6 7 2-7 2-3 7-3-7-7-2 7-2Z" fill="#d5dcea" stroke="#a99263" stroke-width=".7"/>
    </svg>`;
}

import {mod,escapeHTML as esc} from './model.mjs';
// Published distances and periods; month-based periods use a 30-day convention.
// Initial angles are configurable display defaults, not a historical alignment.
export const PLANETS=[
  {id:'anadia',name:'Anadia',radius:50,period:30,angle:18,color:'#d8ad62',appearance:'Amber with green poles',slot:[71,14]},
  {id:'coliar',name:'Coliar',radius:100,period:240,angle:160,color:'#d3d8da',appearance:'Gray-white clouds',slot:[85,18]},
  {id:'karpri',name:'Karpri',radius:300,period:650,angle:70,color:'#5ca9e6',appearance:'Sapphire blue with white caps',slot:[64,28]},
  {id:'chandos',name:'Chandos',radius:400,period:2010,angle:210,color:'#a1ad79',appearance:'Brown and green markings',slot:[80,35]},
  {id:'glyth',name:'Glyth',radius:1000,period:10800,angle:310,color:'#b7adb4',appearance:'Dull gray, ringed',slot:[98,29]},
  {id:'garden',name:'Garden',radius:1200,period:30660,angle:125,color:'#8fcd91',appearance:'A faint green glimmer',slot:[90,48]},
  {id:'hcatha',name:"H'Catha",radius:1600,period:60120,angle:265,color:'#e7f2df',appearance:'A diamond-white glimmer',slot:[107,43]}
];
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export function elapsedRealmsDays(year,day,hour=0,minute=0) {return 365*(year-1372)+Math.floor((year-1)/4)-Math.floor(1371/4)+day+(hour+minute/60)/24;}
export function planetStates({days,hour,dawn=6,dusk=18,weather='clear',angles={}}) {
  const tau=2*Math.PI;
  const longitude=mod(days/365.25+(angles.toril??0)/360,1)*tau;
  const tx=200*Math.cos(longitude),ty=200*Math.sin(longitude),sun=Math.atan2(-ty,-tx);
  const nightLength=mod(dawn-dusk,24),nightAge=mod(hour-dusk,24);
  const dark=nightAge<nightLength?smooth(nightAge/.6)*smooth((nightLength-nightAge)/.6):0;
  const cover={clear:1,wind:.9,cloud:.25,rain:.08,snow:.1,fog:0,storm:0}[weather]??1;
  return PLANETS.map(p=>{
    const angle=mod(days/p.period+(angles[p.id]??p.angle)/360,1)*tau;
    const px=p.radius*Math.cos(angle),py=p.radius*Math.sin(angle),vx=px-tx,vy=py-ty;
    const elongation=mod(Math.atan2(vy,vx)-sun+Math.PI,tau)-Math.PI;
    const rise=mod(dawn+elongation/tau*24,24),age=mod(hour-rise,24);
    const altitude=Math.sin(age/24*tau),horizon=age<12?smooth(age/.7)*smooth((12-age)/.7):0;
    const glare=smooth((Math.abs(elongation)*180/Math.PI-5)/10);
    const lit=Math.max(0,Math.min(1,(1+(px*vx+py*vy)/(p.radius*Math.hypot(vx,vy)))/2));
    const rare=p.id==='garden'?(dark>.95&&cover===1&&altitude>.5?.4:0):1;
    const opacity=dark*cover*horizon*glare*rare*(.4+.6*lit);
    const reason=age>=12?'Below Horizon':!dark?'Daylight':!cover?'Obscured':glare<.1?'Near the Sun':p.id==='garden'&&!rare?'Too Faint':opacity<.05?'Low on Horizon':'Visible';
    return {...p,angle,elongation,lit,opacity,reason,rise,set:mod(rise+12,24),direction:age<6?'Eastern Sky':'Western Sky'};
  });
}
export function planetArt(planets=[]) {
  return `<g class="ra-planets">${planets.filter(p=>p.opacity>.05).map(p=>{
    const [x,y]=p.slot,r=p.id==='garden'?1.6:2.6;
    return `<g class="ra-planet" data-planet="${p.id}" role="img" aria-label="${esc(p.name)}, ${p.direction}" opacity="${p.opacity.toFixed(3)}"><title>${esc(p.name)} · ${p.direction} · Approximate visibility</title><circle cx="${x}" cy="${y}" r="${r}" fill="${p.color}"/><circle cx="${x-.7}" cy="${y-.6}" r="${r*.45}" fill="#fff5db" opacity=".6"/>${p.id==='glyth'?`<ellipse cx="${x}" cy="${y}" rx="4.5" ry="1.5" fill="none" stroke="${p.color}" stroke-width=".8" transform="rotate(-20 ${x} ${y})"/>`:''}</g>`;
  }).join('')}</g>`;
}

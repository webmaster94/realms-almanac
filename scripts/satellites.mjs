// Schematic lunar-scale geometry. The Tears share Toril's lunar orbit and trail
// Selune. Bral's authored slot is a supported campaign placement, not an ephemeris.
export const LUNAR_RADIUS=26;
export const BRAL_TRAIL=.84;
export const satelliteRandom=(i,s=0)=>{const n=Math.sin(i*127.1+s*311.7)*43758.5453;return n-Math.floor(n);};
export function tearOffsets(count=160){return Array.from({length:count},(_,i)=>{const t=satelliteRandom(i,1),angle=-.55-t*.55,r=LUNAR_RADIUS+(satelliteRandom(i,2)-.5)*2;return {x:Math.cos(angle)*r,y:(satelliteRandom(i,3)-.5)*1.4,z:Math.sin(angle)*r,size:.08+satelliteRandom(i,4)**4*.42};}).filter(p=>Math.hypot(p.x-Math.cos(BRAL_TRAIL)*LUNAR_RADIUS,p.z+Math.sin(BRAL_TRAIL)*LUNAR_RADIUS)>1.4);}
export function lunarPositions(toril,phase=0){
  const angle=toril.angle+phase*Math.PI*2;
  const at=a=>({x:toril.x+Math.cos(a)*LUNAR_RADIUS,y:0,z:toril.z+Math.sin(a)*LUNAR_RADIUS});
  return {angle,moon:at(angle),tears:at(angle-.825),bral:at(angle-BRAL_TRAIL)};
}

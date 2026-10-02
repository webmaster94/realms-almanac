import {ID,mod} from './model.mjs';
import {PLANETS} from './planets.mjs';
export const ATLAS_DEFAULT={party:null,regional:{sceneUuid:'',tokenUuid:'',marker:null},mapSource:'modules/realms-almanac/assets/toril/surface.webp'};
export const atlasState=()=>game.settings.get(ID,'atlas');
export function registerAtlasSettings(){if(!game.settings.settings.has(`${ID}.atlas`))game.settings.register(ID,'atlas',{scope:'world',config:false,type:Object,default:ATLAS_DEFAULT,onChange:()=>ui.realmsAlmanac?.atlasApp?.refreshState().catch(e=>console.error(ID,e))});}
export async function saveAtlas(patch){if(!game.user.isGM)throw new Error('Only a GM can change the party location or map link.');const next=foundry.utils.mergeObject(foundry.utils.deepClone(atlasState()),patch,{inplace:false});await game.settings.set(ID,'atlas',next);return next;}
export function mapUV(lat,lon){return {u:mod(lon+180,360)/360,v:(90-Math.max(-90,Math.min(90,lat)))/180};}
export function mapLatLon(u,v){return {lat:90-Math.max(0,Math.min(1,v))*180,lon:mod(u,1)*360-180};}
export function globeVector(lat,lon,r=1){const a=lat*Math.PI/180,b=lon*Math.PI/180;return [r*Math.cos(a)*Math.cos(b),r*Math.sin(a),-r*Math.cos(a)*Math.sin(b)];}
export function vectorLatLon(x,y,z){const r=Math.hypot(x,y,z);return {lat:Math.asin(y/r)*180/Math.PI,lon:Math.atan2(-z,x)*180/Math.PI};}
export function orbitPositions(days,angles={}) {
  const bodies=[{id:'toril',name:'Toril',radius:200,period:365.25,angle:0,color:'#6aa9cf'},...PLANETS].sort((a,b)=>a.radius-b.radius);
  return bodies.map((p,index)=>{const angle=mod(days/p.period+(angles[p.id]??p.angle)/360,1)*Math.PI*2;
    // Diagram radii keep the inner system navigable. Angular positions and sunlight share this geometry.
    const orbit=34+index*21;return {...p,angle,orbit,x:Math.cos(angle)*orbit,z:Math.sin(angle)*orbit};});
}
export function sceneMapSource(scene){return scene?.background?.src??scene?.toObject().levels?.[0]?.background?.src??'';}
export function tokenMapUV(scene,token){const d=scene.dimensions??scene.getDimensions(),o=scene.toObject(),size=o.grid?.size??100;return {u:(token.x+(token.width??1)*size/2-d.sceneX)/d.sceneWidth,v:(token.y+(token.height??1)*size/2-d.sceneY)/d.sceneHeight};}
export async function resolveRegion(){const link=atlasState().regional;if(!link?.sceneUuid)return null;const scene=await fromUuid(link.sceneUuid);if(!scene||scene.documentName!=='Scene')throw new Error('The linked regional scene is unavailable.');const token=link.tokenUuid?await fromUuid(link.tokenUuid):null;return {scene,src:sceneMapSource(scene),token,marker:token?tokenMapUV(scene,token):link.marker};}
export async function setPartyPosition(lat,lon,label,location=''){if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat< -90||lat>90)throw new Error('Choose a valid position on Toril.');return saveAtlas({party:{lat,lon:mod(lon+180,360)-180,label:String(label||'The Party').slice(0,100),location:String(location).slice(0,100)}});}
export function partyLabel(party){return party?`${party.label}${party.location?` · ${party.location}`:''}`:'Not Set';}

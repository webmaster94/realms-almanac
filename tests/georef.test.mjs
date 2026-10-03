import test from 'node:test';
import assert from 'node:assert/strict';
import {transformPoint,regionalWorldPoint,worldRegionalPoint} from '../scripts/atlas-georef.mjs';
import {atlasState} from '../scripts/atlas-state.mjs';
test('rotated affine registration round-trips native and world coordinates',()=>{
  const calibration={width:6000,height:4200,affine:[.00027,.00016,-78,-.00003,-.00034,54]};
  for(const [u,v] of [[0,0],[.5,.5],[1,1],[.3,.8]]){const world=regionalWorldPoint({calibration},{u,v}),native=worldRegionalPoint({calibration},world);assert.ok(Math.abs(native.u-u)<1e-10);assert.ok(Math.abs(native.v-v)<1e-10);}
  assert.equal(worldRegionalPoint({calibration},{lon:12,lat:0}),null);
});
test('piecewise calibration stays continuous across a shared edge and rejects outside points',()=>{
  const c={vertices:[[0,0,-40,40],[100,0,-38,40],[100,100,-37,37],[0,100,-40,38]],triangles:[[0,1,2],[0,2,3]]};
  for(const [x,y] of [[25,25],[25,75],[75,25],[100,100]]){const world=transformPoint(c,x,y),p=transformPoint(c,world.x,world.y,true);assert.ok(Math.abs(p.x-x)<1e-9);assert.ok(Math.abs(p.y-y)<1e-9);}
  assert.equal(transformPoint(c,-1,30),null);assert.equal(transformPoint(c,0,0,true),null);
});
test('world party position follows the regional token without changing stored state',()=>{
  const stored={party:{lat:0,lon:0,label:'Party'},regional:{tokenUuid:'Token.party',calibration:{width:1000,height:500,affine:[.01,0,-40,0,-.01,40],labels:[{name:'Eltabbar',lon:-35,lat:37.5}]}}};
  const previousGame=globalThis.game,previousUuid=globalThis.fromUuidSync;globalThis.game={settings:{get:()=>stored}};
  const token={x:450,y:200,width:1,height:1,parent:{dimensions:{sceneX:0,sceneY:0,sceneWidth:1000,sceneHeight:500},toObject:()=>({grid:{size:100}})}};globalThis.fromUuidSync=()=>token;
  try{assert.equal(atlasState().party.lon,-35);assert.equal(atlasState().party.lat,37.5);assert.equal(atlasState().party.location,'Eltabbar');token.x=550;assert.equal(atlasState().party.lon,-34);assert.equal(stored.party.lon,0);}finally{globalThis.game=previousGame;globalThis.fromUuidSync=previousUuid;}
});

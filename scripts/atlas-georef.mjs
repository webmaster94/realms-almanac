// Coordinates are image-edge pixels. Mesh vertices store [x,y,longitude,latitude].
function trianglePoint(p,a,b,c,offset){
  const x=a[offset],y=a[offset+1],bx=b[offset]-x,by=b[offset+1]-y,cx=c[offset]-x,cy=c[offset+1]-y;
  const det=bx*cy-by*cx;if(Math.abs(det)<1e-15)return null;
  const u=((p[0]-x)*cy-(p[1]-y)*cx)/det,v=(bx*(p[1]-y)-by*(p[0]-x))/det;
  return u>=-1e-8&&v>=-1e-8&&u+v<=1+1e-8?[1-u-v,u,v]:null;
}
export function transformPoint(calibration,x,y,inverse=false){
  if(!calibration||!Number.isFinite(x)||!Number.isFinite(y))return null;
  if(calibration.triangles){for(const ids of calibration.triangles){const vertices=ids.map(i=>calibration.vertices[i]),weights=trianglePoint([x,y],...vertices,inverse?2:0);if(!weights)continue;const k=inverse?0:2;return {x:vertices.reduce((n,v,i)=>n+weights[i]*v[k],0),y:vertices.reduce((n,v,i)=>n+weights[i]*v[k+1],0)};}return null;}
  const m=calibration.affine;if(!m)return null;const [a,b,c,d,e,f]=m;
  if(!inverse)return {x:a*x+b*y+c,y:d*x+e*y+f};
  const det=a*e-b*d;if(Math.abs(det)<1e-15)return null;return {x:((x-c)*e-(y-f)*b)/det,y:((y-f)*a-(x-c)*d)/det};
}
export function regionalWorldPoint(regional,marker){
  const c=regional?.calibration;if(!c||!marker)return null;
  const p=transformPoint(c,marker.u*c.width,marker.v*c.height);return p?{lon:p.x,lat:p.y}:null;
}
export function worldRegionalPoint(regional,point){
  const c=regional?.calibration;if(!c)return null;const p=transformPoint(c,point.lon,point.lat,true);
  if(!p||p.x< -1e-7||p.y< -1e-7||p.x>c.width+1e-7||p.y>c.height+1e-7)return null;return {u:Math.max(0,Math.min(1,p.x/c.width)),v:Math.max(0,Math.min(1,p.y/c.height))};
}

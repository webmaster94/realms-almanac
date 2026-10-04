// Display geometry is separate from both orbital ephemerides and map distances.
export const ORBIT_SPREAD=4;
// Size-class-informed diagram radii; see docs/realmspace-size-research.md.
// Small worlds remain selectable and the sun is still compressed for navigation.
export const SYSTEM_RADII={amaunator:72,anadia:.8,coliar:25.5,toril:9,karpri:4.5,chandos:14.2,glyth:9,garden:1.7,hcatha:1.84,selune:2.5};
export const TORIL_RADIUS_MILES=6410/1.609344;
export const TORIL_CIRCUMFERENCE_MILES=2*Math.PI*TORIL_RADIUS_MILES;

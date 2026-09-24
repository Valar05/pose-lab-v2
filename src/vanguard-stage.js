export const VANGUARD_STAGE = Object.freeze({
  canvas:[430,260],
  anchor:[215,226],
  anchorMode:'bottom-center',
  minZoom:0.5,
  maxZoom:4.0,
  defaultZoom:1.0,
});

export function bottomCenterAnchor(image){
  return [Math.round(image.width/2), image.height-1];
}

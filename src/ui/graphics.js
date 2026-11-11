// Shared render budgets. Physics and collision geometry never depend on this setting.
(function(root){
  const presets=Object.freeze({
    LOW:Object.freeze({particles:1,dpr:1,resolution:.75,maxPixels:900000}),
    MEDIUM:Object.freeze({particles:2,dpr:1.5,resolution:1,maxPixels:2100000}),
    HIGH:Object.freeze({particles:3,dpr:2,resolution:1,maxPixels:4200000})
  });
  function normalize(cfg){
    if(!presets[cfg.graphicsQuality])cfg.graphicsQuality=cfg.particleQuality==='HIGH'?'HIGH':cfg.particleQuality==='LOW'||cfg.particleQuality==='OFF'?'LOW':'MEDIUM';
    if(cfg.particleQuality==='OFF')cfg.fx=true;
    return cfg.graphicsQuality;
  }
  function density(name,scale,dpr,w,h){
    const p=presets[name]||presets.MEDIUM;
    return Math.min(Math.max(.5,scale*Math.min(Math.max(1,dpr||1),p.dpr)*p.resolution),Math.sqrt(p.maxPixels/Math.max(1,w*h)));
  }
  root.HighFlyGraphics=Object.freeze({presets,normalize,density});
})(globalThis);

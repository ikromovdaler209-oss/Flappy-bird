// Shared render budgets. Physics and collision geometry never depend on this setting.
(function(root){
  const presets=Object.freeze({
    LOW:Object.freeze({particles:1,dpr:1,resolution:.75,maxPixels:900000}),
    MEDIUM:Object.freeze({particles:2,dpr:1.5,resolution:1,maxPixels:2100000}),
    HIGH:Object.freeze({particles:3,dpr:2,resolution:1,maxPixels:4200000}),
    ULTRA:Object.freeze({particles:3,dpr:2.5,resolution:1,maxPixels:6400000})
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
// Shared local preferences; never changes simulation, collisions or network results.
(function(root){
  const defaults=Object.freeze({flap:'Space',pause:'KeyP',mute:'KeyM',fullscreen:'KeyF'});
  const actions=Object.keys(defaults);
  const validKey=code=>typeof code==='string'&&/^(Key[A-Z]|Digit[0-9]|Space|ArrowUp)$/.test(code);
  function normalize(cfg){
    if(!['FULL','BALANCED','MINIMAL'].includes(cfg.effectsIntensity))cfg.effectsIntensity=cfg.fx||cfg.particleQuality==='OFF'?'MINIMAL':'FULL';
    cfg.fx=cfg.effectsIntensity==='MINIMAL';
    if(!['NORMAL','DIM'].includes(cfg.backgroundMode))cfg.backgroundMode='NORMAL';
    if(!['FULL','SIMPLE','OFF'].includes(cfg.otherPlayerEffects))cfg.otherPlayerEffects='FULL';
    const raw=cfg.keyBindings&&typeof cfg.keyBindings==='object'?cfg.keyBindings:{};
    const keys={},used=new Set();
    // Reserve valid explicit assignments first, then fill gaps without conflicts.
    for(const action of actions){const key=raw[action];if(validKey(key)&&!used.has(key)){keys[action]=key;used.add(key);}}
    for(const action of actions)if(!keys[action]){const key=[defaults[action],...Object.values(defaults),'KeyB','KeyN','KeyV','KeyX'].find(k=>!used.has(k));keys[action]=key;used.add(key);}
    cfg.keyBindings=keys;
  }
  function bind(cfg,action,code){
    if(!actions.includes(action)||!validKey(code))return 'INVALID';
    if(actions.some(a=>a!==action&&cfg.keyBindings[a]===code))return 'CONFLICT';
    cfg.keyBindings={...cfg.keyBindings,[action]:code};return 'OK';
  }
  function action(cfg,code){
    if(code==='Escape')return 'pause';
    for(const a of actions)if(cfg.keyBindings[a]===code)return a;
    // Preserve legacy flap aliases only while the default flap binding is selected.
    if(cfg.keyBindings.flap==='Space'&&['ArrowUp','KeyW','Enter'].includes(code))return 'flap';
    return null;
  }
  const effectScale=cfg=>cfg.fx||cfg.effectsIntensity==='MINIMAL'?0:cfg.effectsIntensity==='BALANCED'?.45:1;
  const fpsOptions=(hz,current)=>[...new Set(['60','120','MAX',...([30,Math.round(hz),Math.round(hz/2)].filter(v=>v>=30&&v<=360).map(String)),...(/^\d{2,3}$/.test(current)?[current]:[])])];
  const remoteStyle=(cfg,id,localId)=>String(id)===String(localId)?'FULL':cfg.otherPlayerEffects;
  root.HighFlyPreferences=Object.freeze({defaults,normalize,bind,action,effectScale,fpsOptions,remoteStyle});
})(globalThis);

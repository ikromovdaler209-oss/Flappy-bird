import assert from 'node:assert/strict';
import '../src/ui/graphics.js';
const {normalize,density,presets}=globalThis.HighFlyGraphics;
assert.equal(normalize({particleQuality:'LOW'}),'LOW');assert.equal(normalize({}),'MEDIUM');
for(const [w,h,scale,dpr] of [[640,360,6,3],[320,740,1.2,3],[640,360,.5,1]]){
 let previous=0;
 for(const key of ['LOW','MEDIUM','HIGH','ULTRA']){const d=density(key,scale,dpr,w,h);assert.ok(w*h*d*d<=presets[key].maxPixels+1);assert.ok(d>=previous);previous=d;}
}
console.log('PASS graphics budgets and legacy settings migration');


// Settings UI regression: visible options, legacy preference preservation and
// responsive UI-scale input coordinates are deliberately tested without Firebase.
const {readFileSync}=await import('node:fs');
const source=readFileSync(new URL('../src/game/solo.js',import.meta.url),'utf8');
const settings=source.slice(source.indexOf('  function drawSettings()'),source.indexOf('  function drawAch()'));
for(const key of ['GRAPHICS_QUALITY','SCREEN_SHAKE','UI_SCALE'])
 assert.ok(settings.includes("tr('"+key+"')"),'Missing settings row: '+key);
for(const key of ['BIRD_SKIN','COLOR_MODE','PARTICLE_QUALITY'])
 assert.ok(!settings.includes("tr('"+key+"')"),'Old settings row remains: '+key);
assert.ok(source.includes('const UI_SCALES=Object.freeze({SMALL:.90,NORMAL:1,LARGE:1.10})'));
assert.ok(source.includes('window.flyingBirdGraphicsQuality=()=>cfg.graphicsQuality'));
assert.ok(source.includes('HighFlyGraphics?.density(cfg.graphicsQuality'));
assert.ok(source.includes('p.x-uiOffsetX')&&source.includes('x:x*uiRenderScale+uiOffsetX'));
assert.ok(source.includes('cfg.screenShake && shake > 0.3'));
assert.ok(source.includes('syncUiScaleCss()'));
const css=readFileSync(new URL('../styles/polish.css',import.meta.url),'utf8');
assert.ok(css.includes('zoom:var(--hf-ui-scale)'));
assert.ok(css.includes('max-width:var(--hf-ui-max-size)'));
for(const lang of ['EN','RU','ZH','ES','PT'])
 assert.ok(source.includes(lang+':{GRAPHICS_QUALITY:'),'Missing quality localization: '+lang);
const migrated={particleQuality:'HIGH'};
assert.equal(normalize(migrated),'HIGH');
assert.equal(normalize({graphicsQuality:'LOW',particleQuality:'HIGH'}),'LOW');
console.log('PASS settings polish: visible choices, 5 locales, render quality, UI input mapping, screen shake');

// Exercise the actual shared Canvas passes at every preset (including Ultra).
const vm=await import('node:vm');
const renderScope={window:{}};
for(const file of ['map-art.js','ultra-map-art.js'])vm.runInNewContext(readFileSync(new URL('../src/ui/'+file,import.meta.url),'utf8'),renderScope);
const maps=['CITY','MOUNTAINS','VOLCANO','SAKURA','NEON','OCEAN','VOLCANO_PLUS','COSMIC','FOREST','CRYSTAL','DESERT','CELESTIAL','CYBERPUNK','MYSTIC','SHATTERED','TEMPEST','ECLIPSE_REALM','PRISM','CLOCKWORK','AURORA','NECROPOLIS'];
function capturePass(fn,scene){
 const calls=[];let depth=0;
 const gradient={addColorStop:(...args)=>calls.push(['stop',...args])};
 const ctx=new Proxy({}, {get:(_,key)=>(...args)=>{
   if(key==='save')depth++;if(key==='restore')depth--;
   for(const value of args)if(typeof value==='number')assert.ok(Number.isFinite(value),scene.map+' '+key);
   calls.push([key,...args]);
   if(key==='createLinearGradient'||key==='createRadialGradient')return gradient;
 },set:(_,key,value)=>{if(typeof value==='number')assert.ok(Number.isFinite(value));calls.push([key,value===gradient?'gradient':value]);return true;}});
 const before=JSON.stringify(scene);fn(ctx,scene);
 assert.equal(JSON.stringify(scene),before);assert.equal(depth,0);
 assert.ok(calls.length<16000,scene.map+' bounded rendering');
 return JSON.stringify(calls);
}
const art=renderScope.window;
for(const map of maps)for(const [w,h] of [[640,312],[320,568],[160,100]]){
 const scene={map,w,h,ground:h,x:0,y:0,tick:90,distance:120};
 const images=[];
 for(const [index,quality] of ['LOW','MEDIUM','HIGH','ULTRA'].entries()){
   const input={...scene,graphicsQuality:quality,quality:Math.min(3,index+1)};
   const base=capturePass(art.flyingBirdMapArt,input)+capturePass(art.flyingBirdMythicArt,input);
   const detail=capturePass(art.flyingBirdUltraArt,{...scene,quality});
   images.push(base+detail);
   assert.equal(capturePass(art.flyingBirdUltraArt,{...scene,quality,reducedMotion:true,tick:20}),capturePass(art.flyingBirdUltraArt,{...scene,quality,reducedMotion:true,tick:800}));
   assert.equal(capturePass(art.flyingBirdUltraArt,{...scene,quality,staticCard:true,tick:20,distance:2}),capturePass(art.flyingBirdUltraArt,{...scene,quality,staticCard:true,tick:800,distance:400}));
   assert.equal(capturePass(art.flyingBirdUltraArt,{...scene,quality,highContrast:true}),'[]');
 }
 assert.equal(new Set(images).size,4,map+' must render four distinct presets');
 // Turning effects off retains High detail with no Ultra lighting or animation.
 assert.equal(capturePass(art.flyingBirdUltraArt,{...scene,quality:'ULTRA',effects:false}),capturePass(art.flyingBirdUltraArt,{...scene,quality:'HIGH',effects:false}));
}
// Ultra storm rate, and its reduced-motion guard.
const bolts=(quality)=>{let frames=0;for(let tick=0;tick<860;tick++){
 const out=capturePass(art.flyingBirdMythicArt,{map:'TEMPEST',w:640,h:312,quality:3,graphicsQuality:quality,tick});
 if(out.includes('#e5faff'))frames++;
}return frames;};
assert.ok(bolts('ULTRA')>bolts('HIGH')*2);
assert.ok(!capturePass(art.flyingBirdMythicArt,{map:'TEMPEST',w:640,h:312,quality:3,graphicsQuality:'ULTRA',tick:90,reducedMotion:true}).includes('#e5faff'));
const skull={map:'NECROPOLIS',w:640,h:312,quality:3,tick:90};
assert.ok(capturePass(art.flyingBirdMythicArt,{...skull,graphicsQuality:'ULTRA'}).includes('#ff294d'));
assert.ok(!capturePass(art.flyingBirdMythicArt,{...skull,graphicsQuality:'HIGH'}).includes('#ff294d'));
console.log('PASS 21 maps × 4 presets × 3 sizes: distinct detail, finite geometry, static previews, reduced motion, effects off, Ultra storm rate and skull sockets');

// Preferences must survive reload/migration without altering cosmetic ownership.
const preferences=globalThis.HighFlyPreferences;
for(const legacy of [{},{fx:true},{particleQuality:'OFF'},{effectsIntensity:'BALANCED',graphicsQuality:'ULTRA'}]){
 const cfg={...legacy,wallet:{coins:50},map:'NECROPOLIS'};
 preferences.normalize(cfg);
 const roundTrip=JSON.parse(JSON.stringify(cfg));preferences.normalize(roundTrip);
 assert.deepEqual(roundTrip,cfg);assert.equal(cfg.map,'NECROPOLIS');assert.equal(cfg.wallet.coins,50);
 assert.equal(new Set(Object.values(cfg.keyBindings)).size,4);
}
const cfg={};preferences.normalize(cfg);
assert.equal(preferences.bind(cfg,'flap','KeyM'),'CONFLICT');assert.equal(cfg.keyBindings.flap,'Space');
assert.equal(preferences.bind(cfg,'flap','Escape'),'INVALID');assert.equal(preferences.bind(cfg,'flap','KeyB'),'OK');
assert.equal(preferences.action(cfg,'KeyB'),'flap');assert.equal(preferences.action(cfg,'Space'),null);
assert.equal(preferences.action(cfg,'KeyW'),null);assert.equal(preferences.action(cfg,'Escape'),'pause');
assert.equal(preferences.bind(cfg,'mute','KeyW'),'OK');assert.equal(preferences.action(cfg,'KeyW'),'mute');
const broken={keyBindings:{flap:'KeyM',mute:'KeyM',pause:'Escape',fullscreen:null}};preferences.normalize(broken);
assert.equal(new Set(Object.values(broken.keyBindings)).size,4);assert.equal(broken.keyBindings.flap,'KeyM');
assert.ok(!Object.values(broken.keyBindings).includes('Escape'));
for(const intensity of ['FULL','BALANCED','MINIMAL']){
 const p={graphicsQuality:'ULTRA',effectsIntensity:intensity};preferences.normalize(p);
 assert.equal(p.graphicsQuality,'ULTRA');assert.equal(p.fx,intensity==='MINIMAL');
 assert.equal(preferences.effectScale(p),{FULL:1,BALANCED:.45,MINIMAL:0}[intensity]);
}
for(const rate of [60,120,144,165]){
 const limits=preferences.fpsOptions(rate,'75');
 for(const limit of ['60','120','MAX','75'])assert.ok(limits.includes(limit));
 assert.equal(limits.length,new Set(limits).size);
}
for(const style of ['FULL','SIMPLE','OFF']){
 assert.equal(preferences.remoteStyle({otherPlayerEffects:style},'me','me'),'FULL');
 assert.equal(preferences.remoteStyle({otherPlayerEffects:style},'friend','me'),style);
}
// Run the real preview function with drawing stubs, including its error path:
// selected map, camera, clock, dimensions and gradient cache must be restored.
const previewCode=source.slice(source.indexOf('  function drawSettingsPreview('),source.indexOf('  function drawSettings()'));
for(const throwInDraw of [false,true]){
 const previewScope={window:{},Math,performance:{now:()=>1000},particleReducedMotion:{matches:false},
 cfg:{map:'CITY',fx:false,skin:0},settingsPreviewMap:'TEMPEST',W:320,H:480,GROUND:430,L:false,ticks:42,bgX:7,groundX:9,hzK:'original',hzG:'haze',vgG:'vignette',SKINS:[{}],depth:0};
 previewScope.ctx=new Proxy({}, {get:(_,key)=>(...args)=>{if(key==='save')previewScope.depth++;if(key==='restore')previewScope.depth--;},set:()=>true});
 for(const name of ['drawMapDetail','drawAtmos','drawBackgroundDim','drawPipe','drawGround','birdShapes'])previewScope[name]=()=>{};
 previewScope.drawBackground=()=>{assert.equal(previewScope.cfg.map,'TEMPEST');if(throwInDraw)throw Error('draw failure');};
 vm.runInNewContext(previewCode+'\ntry{drawSettingsPreview(0,0,200,110)}catch(e){if(e.message!=="draw failure")throw e}',previewScope);
 assert.equal(previewScope.cfg.map,'CITY');assert.equal(previewScope.ticks,42);assert.equal(previewScope.bgX,7);
 assert.equal(previewScope.W,320);assert.equal(previewScope.GROUND,430);assert.equal(previewScope.hzK,'original');assert.equal(previewScope.depth,0);
}
console.log('PASS preference migration/reload, binding conflicts and aliases, FPS options, own/remote effects, preview isolation including render failure');

// Run the real MP trail renderer: hiding other trails must leave own particles alive.
const trailStart=source.indexOf('  const multiplayerTrailTracks =');
const trailEnd=source.indexOf('  window.flyingBirdMultiplayerArt =',trailStart);
const trailCode=source.slice(trailStart,trailEnd);
let testNow=1000;
const trailScope={window:{HighFlyPreferences:preferences},Map,Set,Math,performance:{now:()=>testNow},
 cfg:{fx:false,particleQuality:'AUTO',otherPlayerEffects:'FULL'},particleLevel:()=>3,
 TRAILS:[{id:'FIRE',colors:['#ff9900']}],PREMIUM_TRAIL_IDS:new Set(),ELITE_TRAIL_IDS:new Set(),NEWTR:{},
 advanceTrailParticle:()=>{},constellationLinks:()=>{},ticks:100};
const trailCtx=new Proxy({}, {get:()=>()=>{},set:()=>true});
trailScope.scene={matchId:'test',world:{w:640,h:360},localPlayerId:'me',birds:[{id:'me',trail:'FIRE',x:100,y:100,active:true},{id:'friend',trail:'FIRE',x:100,y:140,active:true}]};
trailScope.g=trailCtx;
vm.createContext(trailScope);vm.runInContext(trailCode,trailScope);
const runTrail=()=>{testNow+=17;vm.runInContext('drawMultiplayerTrails(scene,g)',trailScope);};
for(let i=0;i<15;i++)runTrail();
assert.ok(vm.runInContext('multiplayerTrailTracks.get("me").particles.length>0&&multiplayerTrailTracks.get("friend").particles.length>0',trailScope));
trailScope.cfg.otherPlayerEffects='OFF';runTrail();
assert.equal(vm.runInContext('multiplayerTrailTracks.has("friend")',trailScope),false);
assert.ok(vm.runInContext('multiplayerTrailTracks.get("me").particles.length>0',trailScope));
trailScope.cfg.otherPlayerEffects='SIMPLE';for(let i=0;i<30;i++)runTrail();
assert.ok(vm.runInContext('multiplayerTrailTracks.get("friend").particles.length<=12',trailScope));
trailScope.cfg.fx=true;runTrail();assert.equal(vm.runInContext('multiplayerTrailTracks.size',trailScope),0);
// Actual MP keyboard listener shares rebound keys and never pauses network simulation.
const mpSource=readFileSync(new URL('../src/multiplayer/multiplayer.js',import.meta.url),'utf8');
const listenerStart=mpSource.indexOf("window.addEventListener('keydown',e=>{\n if(!race");
const listenerEnd=mpSource.indexOf('},true);',listenerStart)+9;
let handler,flaps=0,exits=0,utilities=0;
const mpScope={race:{},raceUI:{hidden:false},raceFlap:()=>flaps++,raceExitPrompt:()=>exits++,window:{
 addEventListener:(_,fn)=>handler=fn,flyingBirdInputAction:code=>preferences.action(cfg,code),flyingBirdUtilityAction:()=>utilities++}};
vm.runInNewContext(mpSource.slice(listenerStart,listenerEnd),mpScope);
const key=(code,extra={})=>handler({code,target:{closest:()=>false},preventDefault(){},stopImmediatePropagation(){},...extra});
key('KeyB');key('Space');key('KeyB',{repeat:true});key('KeyB',{metaKey:true});
assert.equal(flaps,1);key('Escape');assert.equal(exits,1);key('KeyW');assert.equal(utilities,1);
console.log('PASS actual MP renderer filters only remote trails; MP keyboard honors remapping, repeat and browser shortcuts');

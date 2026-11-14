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

// Supplemental visual smoke tests: 4 elite and 6 mythic maps.
// No Firebase access, browser, or third-party packages required.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const sceneScope={window:{},Math};
vm.runInNewContext(readFileSync(new URL('../src/ui/map-art.js',import.meta.url),'utf8'),sceneScope);
const {flyingBirdMapArt:elite, flyingBirdMythicArt:mythic}=sceneScope.window;
assert.equal(typeof elite,'function');
assert.equal(typeof mythic,'function');

function capture(renderer,scene){
  let saved=0;
  const calls=[];
  const gradient={addColorStop:(...values)=>calls.push(['colorStop',...values])};
  const g=new Proxy({}, {
    get(_,key){
      if(key==='createLinearGradient'||key==='createRadialGradient')return (...args)=>{calls.push([key,...args]);return gradient};
      return (...args)=>{
        if(key==='save')saved++;
        else if(key==='restore')saved--;
        for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg),`${scene.map} non-finite ${key}`);
        calls.push([key,...args]);
      };
    },
    set(_,key,value){if(typeof value==='number')assert.ok(Number.isFinite(value));calls.push([`set ${String(key)}`,typeof value==='object'?'gradient':value]);return true;}
  });
  renderer(g,scene);
  assert.equal(saved,0,scene.map+' must restore Canvas state');
  assert.ok(calls.length<20000,scene.map+' too many calls');
  return JSON.stringify(calls);
}
const eliteMaps=['CELESTIAL','CYBERPUNK','MYSTIC','SHATTERED'];
const mythicMaps=['TEMPEST','ECLIPSE_REALM','PRISM','CLOCKWORK','AURORA','NECROPOLIS'];
for(const map of eliteMaps){
 for(const [w,h] of [[320,480],[640,360]]){
   const scene={map,w,ground:Math.floor(h*.88),tick:300,distance:100,quality:3,day:false};
   assert.equal(capture(elite,scene),capture(elite,scene),map+' deterministic');
   capture(elite,{...scene,quality:0});
   assert.equal(capture(elite,{...scene,tick:20,reducedMotion:true}),capture(elite,{...scene,tick:500,reducedMotion:true}));
   assert.equal(capture(elite,{...scene,highContrast:true}),'[]');
 }
}
for(const map of mythicMaps){
 for(const [w,h] of [[320,480],[640,360]]){
   const scene={map,x:0,y:0,w,h:Math.floor(h*.88),tick:300,distance:100,quality:3,reducedMotion:false,staticCard:false};
   assert.equal(capture(mythic,scene),capture(mythic,scene),map+' deterministic');
   capture(mythic,{...scene,quality:0});
   assert.equal(capture(mythic,{...scene,tick:20,reducedMotion:true}),capture(mythic,{...scene,tick:500,reducedMotion:true}));
 }
}
console.log('PASS 10 premium maps × 2 orientations: deterministic finite Canvas geometry, quality 0/3 and reduced motion');

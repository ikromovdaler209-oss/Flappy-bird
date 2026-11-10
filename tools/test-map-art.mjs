import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const scope={window:{}};vm.createContext(scope);vm.runInContext(readFileSync(new URL('../src/ui/map-art.js',import.meta.url),'utf8'),scope);
const maps=['CITY','MOUNTAINS','VOLCANO','SAKURA','NEON','OCEAN','VOLCANO_PLUS','COSMIC','FOREST','CRYSTAL','DESERT'];
function render(scene){const calls=[];let depth=0;const g=new Proxy({}, {get:(_,key)=>(...args)=>{if(key==='save')depth++;if(key==='restore')depth--;for(const a of args)if(typeof a==='number')assert.ok(Number.isFinite(a));calls.push([key,...args])},set:(_,key,value)=>{calls.push([key,value]);return true}});scope.window.flyingBirdMapArt(g,scene);assert.equal(depth,0);return calls;}
for(const map of maps){
 const scene={map,w:640,ground:312,tick:300,distance:200,quality:3,day:false};
 const before=JSON.stringify(scene),high=render(scene),low=render({...scene,quality:1}),off=render({...scene,quality:0});
 assert.equal(JSON.stringify(scene),before);assert.deepEqual(render(scene),high);
 assert.ok(high.length>low.length&&low.length>off.length,map+' quality budgets');
 assert.deepEqual(render({...scene,reducedMotion:true,tick:20}),render({...scene,reducedMotion:true,tick:900}));
 assert.equal(render({...scene,highContrast:true}).length,0);
 for(const w of [160,320,1280])render({...scene,w,ground:428});
 assert.ok(high.length<1600,map+' bounded draw calls');
}
console.log('PASS 11 maps: deterministic render, finite geometry, quality budgets, reduced motion, high contrast, balanced canvas state');

import assert from 'node:assert/strict';
import '../src/ui/graphics.js';
const {normalize,density,presets}=globalThis.HighFlyGraphics;
assert.equal(normalize({particleQuality:'LOW'}),'LOW');assert.equal(normalize({}),'MEDIUM');
for(const [w,h,scale,dpr] of [[640,360,6,3],[320,740,1.2,3],[640,360,.5,1]]){
 let previous=0;
 for(const key of ['LOW','MEDIUM','HIGH']){const d=density(key,scale,dpr,w,h);assert.ok(w*h*d*d<=presets[key].maxPixels+1);assert.ok(d>=previous);previous=d;}
}
console.log('PASS graphics budgets and legacy settings migration');

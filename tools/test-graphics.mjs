import assert from 'node:assert/strict';
import '../src/ui/graphics.js';
const {normalize,density,presets}=globalThis.HighFlyGraphics;
assert.equal(normalize({particleQuality:'LOW'}),'LOW');assert.equal(normalize({}),'MEDIUM');
for(const [w,h,scale,dpr] of [[640,360,6,3],[320,740,1.2,3],[640,360,.5,1]]){
 let previous=0;
 for(const key of ['LOW','MEDIUM','HIGH']){const d=density(key,scale,dpr,w,h);assert.ok(w*h*d*d<=presets[key].maxPixels+1);assert.ok(d>=previous);previous=d;}
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

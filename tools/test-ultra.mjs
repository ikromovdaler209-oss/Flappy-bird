import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../src/ui/graphics.js';

const source = readFileSync(new URL('../src/game/solo.js', import.meta.url), 'utf8');
const mapSection = source.slice(source.indexOf('  const MAPS = {'), source.indexOf('  if (!MAPS[cfg.map])', source.indexOf('  const MAPS = {')));
const maps = [...mapSection.matchAll(/^    ([A-Z_]+):/gm)].map(match => match[1]);
assert.equal(maps.length, 21);
const scope = { window: {} };
vm.runInNewContext(readFileSync(new URL('../src/ui/ultra-map-art.js', import.meta.url), 'utf8'), scope);
function render(scene) {
  let depth = 0;
  const calls = [];
  const context = new Proxy({}, {
    get: (_, name) => (...args) => {
      if (name === 'save') depth++;
      if (name === 'restore') depth--;
      assert.ok(depth >= 0);
      for (const arg of args) if (typeof arg === 'number') assert.ok(Number.isFinite(arg));
      calls.push([name, ...args]);
    },
    set: (_, name, value) => { calls.push([name, value]); return true; }
  });
  scope.window.flyingBirdUltraArt(context, scene);
  assert.equal(depth, 0);
  assert.ok(calls.length < 2500);
  return calls;
}
for (const map of maps) {
  const scene = { map, quality: 'ULTRA', w: 640, ground: 312, tick: 160, distance: 240 };
  const active = render(scene);
  assert.ok(active.length > 50, map);
  for (const quality of ['LOW', 'MEDIUM', 'HIGH']) assert.equal(render({ ...scene, quality }).length, 0);
  assert.equal(render({ ...scene, highContrast: true }).length, 0);
  for (const flag of ['reducedMotion', 'staticCard']) {
    assert.deepEqual(render({ ...scene, [flag]: true }), render({ ...scene, [flag]: true, tick: 900, distance: 2000 }));
  }
  assert.deepEqual(render({ ...scene, effects: false }), render({ ...scene, effects: false, tick: 900, distance: 2000 }));
  assert.notDeepEqual(active, render({ ...scene, tick: 250 }));
  for (const [w, ground] of [[130, 35], [284, 180], [320, 640], [1280, 720]]) render({ ...scene, w, ground });
}
assert.equal(globalThis.HighFlyGraphics.normalize({ graphicsQuality: 'ULTRA' }), 'ULTRA');
for (const [w,h,scale,dpr] of [[320,740,1,3],[640,360,4,3]]) {
  const density = globalThis.HighFlyGraphics.density('ULTRA',scale,dpr,w,h);
  assert.ok(w*h*density*density <= 6400001);
  assert.ok(density >= globalThis.HighFlyGraphics.density('HIGH',scale,dpr,w,h));
}
assert.ok(source.includes("['LOW','MEDIUM','HIGH','ULTRA']"));
assert.ok(source.includes("window.flyingBirdUltraArt?."));
console.log('PASS Ultra: 21 maps, preset persistence, resolution budget, finite geometry, bounded drawing, lower presets, contrast, frozen effects and previews');

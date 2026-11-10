import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const solo=readFileSync(new URL('../src/game/solo.js',import.meta.url),'utf8');
const mp=readFileSync(new URL('../src/multiplayer/multiplayer.js',import.meta.url),'utf8');
const cut=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const c={cfg:{diff:'HARD'},score:0,GMIN:105,GMAX:150};vm.createContext(c);
vm.runInContext(cut(solo,'  const extremeTier =','  const THEMES =')+'\nthis.hard=hardTier;this.extreme=extremeTier;this.gap=hardGap;',c);
for(const [score,tier] of [[0,0],[15,0],[16,1],[31,1],[32,2],[159,9],[160,10],[9999,10]]){c.score=score;assert.equal(c.hard(),tier);assert.ok(c.gap()>=93)}
c.cfg.diff='EXTREME';for(const [score,tier] of [[7,0],[8,1],[15,1],[16,2],[80,10]]){c.score=score;assert.equal(c.extreme(),tier);assert.equal(c.hard(),0)}
const physics={RACE_PHASE:1800};vm.createContext(physics);vm.runInContext(cut(mp,'function raceWorld(','function raceRecord('),physics);
for(const layout of ['PORTRAIT','LANDSCAPE']){
 const world=physics.raceWorld(layout),base=physics.courseSpeed('HARD'),end=world.spawnX-world.bx+52+15*world.spacing,t=end/base;
 assert.ok(Math.abs(physics.distanceAt(t,base,world,'HARD')-end)<1e-7);
 assert.ok(Math.abs(physics.distanceAt(t+1,base,world,'HARD')-end-base*1.052)<1e-7);
 const session={world,meta:{diff:'HARD',layout,seed:42},course:[]};
 assert.equal(physics.pipeSpec(15,session).stage,0);assert.equal(physics.pipeSpec(16,session).stage,1);assert.equal(physics.pipeSpec(32,session).stage,2);
}
const ctx={};vm.createContext(ctx);vm.runInContext(cut(mp,'function uniqueRoomSkins(','async function claimLobbySkin('),ctx);
assert.equal(ctx.uniqueRoomSkins({slots:{0:{uid:'a',skin:0},1:{uid:'b',skin:0}}}),false);
assert.equal(ctx.uniqueRoomSkins({slots:{0:{uid:'a',skin:0},1:{uid:'b'}}}),false);
assert.equal(ctx.uniqueRoomSkins({slots:{0:{uid:'a',skin:0},1:{uid:'b',skin:22}}}),true);
console.log('PASS HARD 16-pipe tiers/cap, EXTREME 8-pipe tiers unchanged, deterministic multiplayer boundary, duplicate/missing lobby skins');

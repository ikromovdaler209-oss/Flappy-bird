import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {speedForScore,gapForScore,movingSpec,tierForScore,distanceForTick,scoreForDistance} from '../src/multiplayer/difficulty.js';
const solo=readFileSync(new URL('../src/game/solo.js',import.meta.url),'utf8');
const mp=readFileSync(new URL('../src/multiplayer/multiplayer.js',import.meta.url),'utf8');
const cut=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const c={cfg:{diff:'HARD'},score:0,GMIN:105,GMAX:150};vm.createContext(c);
vm.runInContext(cut(solo,'  const extremeTier =','  const THEMES =')+'\nthis.hard=hardTier;this.extreme=extremeTier;this.gap=hardGap;',c);
for(const [score,tier] of [[0,0],[15,0],[16,1],[31,1],[32,2],[159,9],[160,10],[9999,10]]){c.score=score;assert.equal(c.hard(),tier);assert.ok(c.gap()>=93)}
c.cfg.diff='EXTREME';for(const [score,tier] of [[7,0],[8,1],[15,1],[16,2],[80,10]]){c.score=score;assert.equal(c.extreme(),tier);assert.equal(c.hard(),0)}
const physics={RACE_PIPE_WIDTH:52,speedForScore,gapForScore,movingSpec,tierForScore,distanceForTick,scoreForDistance};
vm.createContext(physics);vm.runInContext(cut(mp,'function raceWorld(','function raceRecord('),physics);
for(const layout of ['PORTRAIT','LANDSCAPE']){
 const world=physics.raceWorld(layout),base=physics.courseSpeed('HARD');
 const first=world.spawnX-world.bx+52,end=first+15*world.spacing;
 let t=first/base;for(let scored=1;scored<16;scored++)t+=world.spacing/speedForScore('HARD',scored);
 assert.ok(Math.abs(physics.distanceAt(t,base,world,'HARD')-end)<1e-7);
 assert.ok(Math.abs(physics.distanceAt(t+1,base,world,'HARD')-end-speedForScore('HARD',16))<1e-7);
 const session={world,meta:{diff:'HARD',layout,seed:42},course:[]};
 assert.equal(physics.pipeSpec(15,session).stage,0);assert.equal(physics.pipeSpec(16,session).stage,1);assert.equal(physics.pipeSpec(32,session).stage,2);
}
const ctx={};vm.createContext(ctx);vm.runInContext(cut(mp,'function uniqueRoomSkins(','async function claimLobbySkin('),ctx);
assert.equal(ctx.uniqueRoomSkins({slots:{0:{uid:'a',skin:0},1:{uid:'b',skin:0}}}),false);
assert.equal(ctx.uniqueRoomSkins({slots:{0:{uid:'a',skin:0},1:{uid:'b'}}}),false);
assert.equal(ctx.uniqueRoomSkins({slots:{0:{uid:'a',skin:0},1:{uid:'b',skin:22}}}),true);
console.log('PASS HARD 16-pipe tiers/cap, EXTREME 8-pipe tiers unchanged, deterministic multiplayer boundary, duplicate/missing lobby skins');

// Compare actual Solo formulas against the shared deterministic MP difficulty.
const soloModes={cfg:{diff:'NORMAL'},score:0,GMIN:105,GMAX:150};
vm.createContext(soloModes);
const soloSpeedLine=solo.match(/  const speed = \(\) => [^\n]+/)[0];
vm.runInContext(cut(solo,'  const DIFF = {','  const THEMES = {')+'\n'+soloSpeedLine+'\nthis.soloSpeed=speed;this.soloDiff=DIFF;this.hardGap=hardGap;this.extremeGap=extremeGap;',soloModes);
for(const layout of ['PORTRAIT','LANDSCAPE'])for(const diff of ['EASY','NORMAL','HARD','EXTREME']){
 soloModes.GMIN=layout==='LANDSCAPE'?95:105;
 soloModes.GMAX=layout==='LANDSCAPE'?128:150;
 const world=physics.raceWorld(layout);
 assert.equal(world.ground,layout==='LANDSCAPE'?316:430);
 assert.equal(world.spacing,layout==='LANDSCAPE'?230:175);
 for(const score of [0,3,5,7,8,15,16,31,32,35,70,80,160,180]){
  soloModes.cfg.diff=diff;soloModes.score=score;
  const expectedGap=diff==='HARD'?soloModes.hardGap():diff==='EXTREME'?soloModes.extremeGap():Math.max(soloModes.GMIN+soloModes.soloDiff[diff].gap,soloModes.GMAX+soloModes.soloDiff[diff].gap-score*1.2);
  assert.ok(Math.abs(speedForScore(diff,score)-soloModes.soloSpeed())<1e-9,`speed ${diff}/${layout}/${score}`);
  assert.ok(Math.abs(gapForScore(diff,score,layout)-expectedGap)<1e-9,`gap ${diff}/${layout}/${score}`);
 }
 for(const t of [0,100,500,1500,5000,50000]){
  const distance=distanceForTick(t,diff,world);
  assert.ok(distance>=0&&Number.isFinite(distance));
  assert.ok(scoreForDistance(distanceForTick(t+1,diff,world),world)>=scoreForDistance(distance,world));
 }
}

// Realtime Ready/presence callbacks must not erase the host's unsaved map/seat edits.
const selectors=Object.fromEntries(['fbMpLobbyCapacity','fbMpLobbyDifficulty','fbMpLobbyMap','fbMpApplyConfig'].map(id=>[id,{value:'',disabled:false}]));
const lobby={roomCode:'FBM-TEST-TEST',roomData:{hostUid:'host'},busy:false,roomConnected:true,raceSnapshot:null,matchLaunchPending:false,$:id=>selectors[id]};
vm.createContext(lobby);
vm.runInContext(cut(mp,"let lobbyDraftKey=",'function renderLobby()'),lobby);
const initial={capacity:5,diff:'NORMAL',map:'CITY',version:0};
lobby.syncLobbyDraft(initial,true);
assert.equal(selectors.fbMpLobbyMap.value,'CITY');
selectors.fbMpLobbyMap.value='MYSTIC';selectors.fbMpLobbyCapacity.value='3';selectors.fbMpLobbyDifficulty.value='EXTREME';
lobby.syncLobbyDraft(initial,true);
assert.equal(selectors.fbMpLobbyMap.value,'MYSTIC');
assert.equal(selectors.fbMpLobbyCapacity.value,'3');
assert.equal(selectors.fbMpLobbyDifficulty.value,'EXTREME');
lobby.syncLobbyDraft({...initial,version:1,map:'OCEAN',capacity:10},true);
assert.equal(selectors.fbMpLobbyMap.value,'OCEAN');
assert.equal(selectors.fbMpLobbyCapacity.value,'10');
lobby.syncLobbyDraft({...initial,version:1},false);
assert.equal(selectors.fbMpLobbyMap.disabled,true);
console.log('PASS Solo/MP speed and gap parity at 112 boundaries, MP reference world, room draft survives RTDB renders');

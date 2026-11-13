import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateProgress} from '../functions/progress.js';

const scope={window:{}};
vm.runInNewContext(readFileSync(new URL('../src/game/achievements.js',import.meta.url),'utf8'),scope);
const {items,progress,total}=scope.window.HighFlyAchievements;
assert.equal(items.length,30);assert.equal(total,40);
assert.equal(new Set(items.map(item=>item.id)).size,30);
for(const item of items){
  for(const lang of ['EN','RU','ZH','ES','PT']){
    assert.equal(item.text[lang].length,2);
    assert.ok(item.text[lang].every(text=>typeof text==='string'&&text.length));
  }
  const save={best:{},games:0,flaps:0,pipes:0,earnedCoins:0},wallet={};
  assert.equal(progress(item,save,wallet),0);
  for(const value of [item.goal-1,item.goal,item.goal+1]){
    if(item.metric==='score')save.best.NORMAL=value;
    else if(['EASY','NORMAL','HARD','EXTREME'].includes(item.metric))save.best[item.metric]=value;
    else if(['owned','maps','trails'].includes(item.metric))wallet[item.metric]=Array.from({length:value},(_,i)=>i);
    else save[item.metric]=value;
    assert.equal(progress(item,save,wallet),value);
  }
}
assert.equal(progress(items.find(item=>item.metric==='owned'),{}, {owned:[4,4,5]}),2);
const payload={cfg:{},save:{games:1,flaps:1,pipes:1,earnedCoins:0,best:{EASY:0,NORMAL:0,HARD:0,EXTREME:0},
 ach:Object.fromEntries(Array.from({length:40},(_,i)=>['test'+i,1]))},wallet:{coins:0,owned:[],maps:[],trails:[]}};
assert.ok(validateProgress(payload,payload,null,0).ok,'Server must accept all 40 flags');
payload.save.ach.extra=1;
assert.equal(validateProgress(payload,payload,null,0).reason,'achievements');
console.log('PASS 30 unique achievements, five locales, thresholds, legacy defaults, collection deduplication and 40-flag server compatibility');
// The live unlock routine is idempotent and reads the current account's objects.
const source=readFileSync(new URL('../src/game/solo.js',import.meta.url),'utf8');
const start=source.indexOf('  function expandedAchievementText');
const end=source.indexOf('  const PIPES',start);
const live={window:scope.window,cfg:{lang:'RU'},save:{best:{NORMAL:300},ach:{first:1}},wallet:{},toasts:[],writes:0};
live.saveGame=()=>live.writes++;
vm.createContext(live);vm.runInContext(source.slice(start,end),live);
live.checkExpandedAchievements(false);
assert.equal(Object.keys(live.save.ach).length,7); // Five score goals + Normal + existing flag.
assert.equal(live.toasts.length,0);
live.checkExpandedAchievements();
assert.equal(live.writes,1);
live.save={best:{},ach:{}};live.wallet={owned:[4,5,6,7,8]};
live.checkExpandedAchievements();
assert.equal(Object.keys(live.save.ach).length,1);
assert.equal(live.save.ach.v4_owned_5,1);
assert.equal(live.save.ach.v4_score_300,undefined);
assert.equal(live.toasts.length,1);
assert.ok(source.includes('checkExpandedAchievements(false);\n    initWeather();'));
assert.ok(source.includes('checkExpandedAchievements();\n    saveWallet();shopAnim=35;'));
console.log('PASS retroactive grants, idempotency, account replacement and purchase integration');

vm.runInNewContext(readFileSync(new URL('../src/ui/elite-birds.js',import.meta.url),'utf8'),scope);
for(const name of ['AURUM','ABYSS','ECLIPSE','EMERALD KING','PLATINUM']){
 for(const wing of [-3,0,3]){
  let depth=0,calls=0;
  const g=new Proxy({},{
   get:(_,key)=>(...args)=>{
    if(key==='save')depth++;if(key==='restore')depth--;
    assert.ok(depth>=0);calls++;
    for(const arg of args)if(typeof arg==='number')assert.ok(Number.isFinite(arg));
   },
   set:()=>true
  });
  assert.equal(scope.window.flyingBirdEliteArt(g,name,wing),true);
  assert.equal(depth,0);assert.ok(calls>20);
 }
}
assert.equal(scope.window.flyingBirdEliteArt(null,'OBSIDIAN',0),false);
console.log('PASS five animated skin renderers, balanced canvas state, finite geometry and Obsidian fallback');

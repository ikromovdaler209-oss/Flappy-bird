import assert from 'node:assert/strict';
import {validateProgress} from '../functions/progress.js';
import '../src/ui/graphics.js';
const {normalize,density,presets}=globalThis.HighFlyGraphics;
assert.equal(normalize({particleQuality:'LOW'}),'LOW');assert.equal(normalize({}),'MEDIUM');
for(const [w,h,scale,dpr] of [[640,360,6,3],[320,740,1.2,3],[640,360,.5,1]]){
 let previous=0;
 for(const key of ['LOW','MEDIUM','HIGH']){const d=density(key,scale,dpr,w,h);assert.ok(w*h*d*d<=presets[key].maxPixels+1);assert.ok(d>=previous);previous=d;}
}
const zero={cfg:{graphicsQuality:'MEDIUM'},save:{games:0,pipes:0,flaps:0,earnedCoins:0,best:{EASY:0,NORMAL:0,HARD:0,EXTREME:0},ach:{}},wallet:{coins:0,owned:[],maps:[],trails:[]}};
const clone=x=>structuredClone(x),now=100000;
assert.ok(validateProgress(null,zero,null,now).ok);
const old=clone(zero);old.wallet.coins=1000;
const earn=clone(old);earn.save.games=1;earn.save.pipes=5;earn.save.earnedCoins=5;earn.save.flaps=20;earn.save.best.NORMAL=5;earn.wallet.coins+=5;
let ok=validateProgress(old,earn,{at:now-10000,credits:0},now);assert.ok(ok.ok);
const forged=clone(earn);forged.wallet.coins+=1000;assert.equal(validateProgress(old,forged,null,now).reason,'balance');
const buy=clone(old);buy.wallet.coins=400;buy.wallet.owned=[22];buy.wallet.trails=['STARDUST'];assert.ok(validateProgress(old,buy,null,now).ok);
const free=clone(buy);free.wallet.coins=1000;assert.equal(validateProgress(old,free,null,now).reason,'balance');
const huge=clone(old);huge.save.earnedCoins=500000;huge.wallet.coins+=500000;assert.equal(validateProgress(old,huge,null,now).reason,'rate');
assert.equal(validateProgress(null,old,null,now).ok,false);
assert.ok(validateProgress(old,zero,null,now).ok);
const bad=clone(old);bad.wallet.coins=Infinity;assert.equal(validateProgress(old,bad,null,now).ok,false);
const replay=validateProgress(earn,earn,ok.guard,now);assert.ok(replay.ok);assert.equal(replay.guard.credits,ok.guard.credits);
const forgedBest=clone(old);forgedBest.save.best.HARD=99999;assert.equal(validateProgress(old,forgedBest,null,now).reason,'best');
// Rapid submissions cannot replenish the rate budget.
let current=clone(zero),guard={at:now,credits:2};
for(let i=1;i<=3;i++){const next=clone(current);next.save.pipes++;next.save.earnedCoins++;next.wallet.coins++;const result=validateProgress(current,next,guard,now);assert.equal(result.ok,i<=2);if(result.ok){current=next;guard=result.guard;}}
console.log('PASS v3: render budgets, settings migration, forged balance, unpaid skin, bundle price, reset, import rejection, replay, non-finite values, rate exhaustion');
// The server must charge the exact catalog prices displayed by the game.
const {readFileSync}=await import('node:fs');const vm=await import('node:vm');
const {prices}=await import('../functions/progress.js');
const source=readFileSync(new URL('../src/game/solo.js',import.meta.url),'utf8');
function catalog(name){const start=source.indexOf('const '+name+' = [')+('const '+name+' = ').length;return vm.runInNewContext('('+source.slice(start,source.indexOf('];',start)+1)+')');}
const skins=catalog('SKINS'),maps=catalog('SHOP_MAPS'),trails=catalog('TRAILS');
for(const [id,item] of skins.entries())if(item.price)assert.equal(prices.owned[id],item.price);
for(const item of maps)assert.equal(prices.maps[item.id],item.price);
for(const item of trails)assert.equal(prices.trails[item.id],item.price);
console.log('PASS server prices equal all shop prices');

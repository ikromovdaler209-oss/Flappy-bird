// Offline handler tests: no Firebase SDK is imported, no network or credentials are used.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {isDeepStrictEqual} from 'node:util';
import {verifyRound,applyRecord,emptyStats,parseRoundPath} from '../functions/shared/stats.js';
import {validateProgress} from '../functions/progress.js';
const documents=new Map(),rounds=new Map(),clone=v=>v===undefined?undefined:structuredClone(v);
let lock=Promise.resolve(),roundReads=0;
const db={doc(path){return {path,collection:name=>({doc:id=>db.doc(path+'/'+name+'/'+id)}),
 get:async()=>({exists:documents.has(path),data:()=>clone(documents.get(path))})}},
 runTransaction(fn){const run=lock.then(async()=>{const writes=[];const tx={get:r=>r.get(),
 set:(r,v)=>writes.push([r.path,v]),create:(r,v)=>{assert.ok(!documents.has(r.path));writes.push([r.path,v])}};
 const result=await fn(tx);for(const [p,v] of writes)documents.set(p,clone(v));return result;});
 lock=run.catch(()=>{});return run;}};
class HttpsError extends Error{constructor(code,message,details){super(message);Object.assign(this,{code,details});}}
const c={isDeepStrictEqual,verifyRound,applyRecord,emptyStats,parseRoundPath,validateProgress,HttpsError,
 initializeApp:()=>{},getFirestore:()=>db,FieldValue:{serverTimestamp:()=>0},
 onCall:(_opts,fn)=>({run:fn}),process:{env:{GCLOUD_PROJECT:'demo-high-fly'}},
 getDatabase:()=>({ref:path=>({get:async()=>{roundReads++;return {val:()=>clone(rounds.get(path))}}})})};
const src=readFileSync(new URL('../functions/index.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('export const ','const ');
vm.createContext(c);vm.runInContext(src+'\nglobalThis.handlers={saveHighFlyProgress,settleHighFlyRound};',c);
const {saveHighFlyProgress:save,settleHighFlyRound:settle}=c.handlers;
const uid='unit_player_0001',other='unit_player_0002',auth={uid,token:{firebase:{sign_in_provider:'password'}}};
const call=(payload,baseRevision=0)=>save.run({auth,data:{...payload,baseRevision,expectedUid:uid}});
const init=()=>save.run({auth,data:{expectedUid:uid,initializeOnly:true}});
await assert.rejects(save.run({data:{}}),e=>e.code==='unauthenticated');
await assert.rejects(save.run({auth:{...auth,token:{firebase:{sign_in_provider:'anonymous'}}},data:{}}),e=>e.code==='unauthenticated');
await assert.rejects(save.run({auth,data:{expectedUid:other}}),e=>e.code==='permission-denied');
await assert.rejects(save.run({auth,data:{expectedUid:uid,initializeOnly:true,wallet:{coins:999999}}}),e=>e.code==='invalid-argument');
const both=await Promise.all([init(),init()]);assert.equal(both[0].revision,0);assert.equal(both[1].revision,0);
const zero=clone(both[0].progress),earned=clone(zero);earned.save.games=1;earned.save.pipes=5;earned.save.earnedCoins=5;earned.wallet.coins=5;
assert.equal((await call(earned)).revision,1);assert.equal((await call(earned)).revision,1);
const cheat=clone(earned);cheat.wallet.coins=999999;await assert.rejects(call(cheat,1),e=>e.code==='failed-precondition');
const a=clone(earned),b=clone(earned);a.cfg.lang='RU';b.cfg.lang='EN';
const conflicting=await Promise.allSettled([call(a,1),call(b,1)]);
assert.equal(conflicting.filter(x=>x.status==='fulfilled').length,1);
assert.equal(conflicting.find(x=>x.status==='rejected').reason.code,'aborted');
await assert.rejects(call(earned,1),e=>e.code==='aborted');
documents.set('progress/'+uid,{...earned,wallet:{...earned.wallet,coins:1000}});
const buy=clone(earned);buy.wallet={coins:400,owned:[22],maps:[],trails:['STARDUST']};
await Promise.all([call(buy),call(buy)]);assert.equal(documents.get('progress/'+uid).wallet.coins,400);
assert.equal(documents.get('publicStats/'+uid).coins,400);
const free=clone(buy);free.wallet.maps=['NEON'];await assert.rejects(call(free,1),e=>e.code==='failed-precondition');
await call(zero,1);await assert.rejects(call(buy,1),e=>e.code==='aborted');
const path='multiplayerRounds/FBM-ABCD-EFGH/r0',startAt=Date.now()-10000;
const finish=(data,who=auth)=>settle.run({auth:who,data:{expectedUid:who.uid,...data}});
await assert.rejects(finish({path}),e=>e.code==='failed-precondition'&&e.message==='snapshot');
assert.equal(documents.has('multiplayerStats/'+uid),false);
rounds.set(path,{meta:{startAt},roster:{[uid]:true,[other]:true},players:{[uid]:{status:'SURVIVED',tick:120,elapsedMs:2000,score:1},[other]:{status:'DEAD',tick:60,elapsedMs:1000,score:0}}});
await assert.rejects(finish({path,win:true}),e=>e.code==='invalid-argument');
await assert.rejects(finish({path},{...auth,uid:'not_in_roster'}),e=>e.code==='failed-precondition'&&e.message==='roster');
const winner=rounds.get(path).players[uid];winner.status='ALIVE';
await assert.rejects(finish({path}),e=>e.code==='failed-precondition'&&e.message==='incomplete');winner.status='SURVIVED';
const counted=await Promise.all([finish({path}),finish({path})]);
assert.equal(counted.filter(x=>x.kind==='ok').length,1);
assert.equal(documents.get('multiplayerStats/'+uid).wins,1);
assert.equal(documents.get('multiplayerStats/'+uid).matches,1);
const reads=roundReads;await finish({path});assert.equal(roundReads,reads);
console.log('PASS offline server handlers: forged balance, local import, revision conflicts, paid bundle, reset replay, missing/foreign/incomplete match, duplicate receipt');
console.log('Storage is an in-memory transactional double; this does not test Firebase deployment or real RTDB transport.');

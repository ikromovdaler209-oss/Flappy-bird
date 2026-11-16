import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {applyRecord,emptyStats,normalizeStats} from '../src/multiplayer/stats.js';
const account=readFileSync(new URL('../src/firebase/account-cloud.js',import.meta.url),'utf8');
const code=account.slice(account.indexOf('    const flushProgress = async'),account.indexOf('    const scheduleProgressSave'));
function fixture(write){
 const c={activeProgressUser:'a',progressBusy:false,pendingSave:true,syncGeneration:1,
 auth:{currentUser:{uid:'a'}},readProgress:()=>({wallet:{coins:5},cfg:{},save:{}}),
 setSyncStatus:v=>c.status=v,t:x=>x,cacheCurrent:u=>c.cached=u,db:{},doc:(_db,...parts)=>parts.join('/'),
 serverTimestamp:()=>123,setDoc:write,navigator:{onLine:true},clearTimeout:()=>{},setTimeout:()=>{c.timers++;return 1},
 syncTimer:null,timers:0,error:{}};
 vm.createContext(c);vm.runInContext(code+';globalThis.flush=flushProgress;',c);return c;
}
{
 let path,payload;const c=fixture(async(p,v)=>{path=p;payload=v});assert.equal(await c.flush(),true);
 assert.equal(path,'progress/a');assert.equal(payload.wallet.coins,5);assert.equal(c.status,'SYNC_SAVED');
 assert.equal(c.pendingSave,false);assert.equal(c.cached,'a');
}
for(const code of ['permission-denied','unauthenticated','invalid-argument','unavailable']){
 const c=fixture(async()=>{throw {code}});assert.equal(await c.flush(),false);assert.equal(c.pendingSave,true);
 assert.equal(c.timers,code==='unavailable'?1:0);assert.equal(c.status,code==='unavailable'?'SYNC_PENDING_NETWORK':'SYNC_REJECTED');
}
{
 const c=fixture(async()=>{c.pendingSave=true});await c.flush();assert.equal(c.status,'SYNC_PENDING');assert.equal(c.timers,1);
}
{
 let release;const pending=new Promise(r=>release=r),c=fixture(()=>pending),work=c.flush();
 c.syncGeneration++;c.auth.currentUser={uid:'b'};release();await work;assert.equal(c.cached,undefined);
}
const mp=readFileSync(new URL('../src/firebase/mp-stats.js',import.meta.url),'utf8');
const commitCode=mp.slice(mp.indexOf('async function commit'),mp.indexOf('async function flush'));
const docs=new Map();let writes=0;
const c={db:{},doc:(_db,...p)=>p.join('/'),normalizeStats,emptyStats,applyRecord,serverTimestamp:()=>123,
 runTransaction:async(_db,fn)=>fn({get:async p=>({exists:()=>docs.has(p),data:()=>docs.get(p)}),set:(p,v)=>{writes++;docs.set(p,v)}})};
vm.createContext(c);vm.runInContext(commitCode,c);
const rec={id:'FBM-ABCD-EFGH_r0',code:'FBM-ABCD-EFGH',roundKey:'r0',startAt:10000,players:2,status:'SURVIVED',place:1,tie:false,elapsedMs:1000,score:1,win:true};
assert.equal((await c.commit('a',rec)).kind,'ok');assert.equal(writes,2);
assert.equal((await c.commit('a',rec)).kind,'duplicate');assert.equal(writes,2);
assert.equal(docs.get('multiplayerStats/a').wins,1);
c.runTransaction=async()=>{throw {code:'permission-denied'}};assert.equal((await c.commit('a',rec)).kind,'rules');
c.runTransaction=async()=>{throw {code:'unavailable'}};assert.equal((await c.commit('a',rec)).kind,'retry');
for(const file of ['account-cloud','mp-stats','friends']){
 const s=readFileSync(new URL('../src/firebase/'+file+'.js',import.meta.url),'utf8');
 assert.doesNotMatch(s,/firebase-functions|getFunctions|httpsCallable/);
}
console.log('PASS Spark: direct save, edits during upload, offline/rules errors, identity isolation, one receipt per round; no client Cloud Functions dependency');
console.log('Spark client-written balances and match records are NOT server-verified anti-cheat.');

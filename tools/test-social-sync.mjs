import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/firebase/mp-stats.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('async function flush(uid){'),source.indexOf('export async function loadCloud'));
function fixture(commit){
 const queues=new Map([['a',[{id:'first',startAt:100}]],['b',[{id:'other',startAt:200}]]]);
 const c={uid:'a',flushingUsers:new Set(),verdict:{state:'syncing'},myUid:()=>c.uid,readQueue:u=>structuredClone(queues.get(u)||[]),writeQueue:(u,q)=>queues.set(u,structuredClone(q)),commit,adopt:()=>{},notify:()=>{}};
 vm.createContext(c);vm.runInContext(code,c);return {c,queues};
}
{
 let release;const wait=new Promise(r=>release=r);let calls=0;
 const {c,queues}=fixture(async()=>{if(++calls===1)await wait;return {kind:'ok'}});
 const pending=c.flush('a');queues.get('a').push({id:'second',startAt:200});release();await pending;
 assert.equal(calls,2);assert.equal(queues.get('a').length,0);
}
for(const kind of ['rules','retry']){
 const {c,queues}=fixture(async()=>({kind}));await c.flush('a');assert.equal(queues.get('a').length,1);assert.equal(c.verdict.state,'pending');
 c.commit=async()=>({kind:'ok'});await c.flush('a');assert.equal(queues.get('a').length,0);
}
{
 let release;const wait=new Promise(r=>release=r);
 const {c,queues}=fixture(async uid=>{if(uid==='a')await wait;return {kind:'ok'}});
 const a=c.flush('a');c.uid='b';await c.flush('b');assert.equal(queues.get('b').length,0);release();await a;
 assert.equal(queues.get('a').length,0);assert.equal(c.verdict.state,'saved');
}
console.log('PASS sync: concurrent append preserved, rules/offline retained and retried, per-account isolation');

/** v2.6.1 targeted regression tests for independently reported v2.6 defects.
 * Functions are evaluated directly from multiplayer.js in isolated Node VMs,
 * without changing their bodies. Firebase is a controlled transport stub.
 * This is NOT a browser test or an RTDB-emulator/security-rules test.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {rankRacePlayers, newNetworkStats, noteWriteAck} from '../src/multiplayer/netcode.js';
import {speedForScore,gapForScore,movingSpec,tierForScore,distanceForTick,scoreForDistance} from '../src/multiplayer/difficulty.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=await readFile(path.join(root,'src/multiplayer/multiplayer.js'),'utf8');
function cut(start,end){const a=src.indexOf(start),b=src.indexOf(end,a+start.length);assert.ok(a!==-1&&b>a,`Missing source section ${start}`);return src.slice(a,b)}
function run(code,context){vm.createContext(context);vm.runInContext(code,context);return context}
function approx(actual,expected,epsilon=1e-7){assert.ok(Math.abs(actual-expected)<epsilon,`Expected ${expected}, got ${actual}`)}

const physics={RACE_PIPE_WIDTH:52,speedForScore,gapForScore,movingSpec,tierForScore,distanceForTick,scoreForDistance};
run(cut('function raceWorld(','function raceRecord('),physics);
for(const layout of ['PORTRAIT','LANDSCAPE'])for(const diff of ['EASY','NORMAL','HARD','EXTREME']){
 const world=physics.raceWorld(layout),meta={layout,diff,seed:13371337};
 const sequential={world,meta,course:[]},late={world,meta,course:[]},allAtOnce={world,meta,course:[]};
 for(let t=0;t<=600;t++)physics.pipesNear(t,sequential);
 physics.pipesNear(600,late);
 physics.pipeSpec(30,allAtOnce);
 const positions=new Map(sequential.course.map(p=>[p.index,p.center]));
 for(const p of late.course){approx(p.center,positions.get(p.index));approx(p.center,allAtOnce.course[p.index].center)}
 for(let i=0;i<sequential.course.length;i++)approx(allAtOnce.course[i].center,positions.get(i));
}
for(const layout of ['PORTRAIT','LANDSCAPE'])for(const diff of ['EASY','NORMAL','HARD','EXTREME']){
 const world=physics.raceWorld(layout),terminal=diff==='HARD'?160:diff==='EXTREME'?80:35;
 const expected=speedForScore(diff,terminal+1),base=physics.courseSpeed(diff);
 approx(base,speedForScore(diff,0));
 for(const t of [36000,70000,110000]){
  const d=physics.distanceAt(t,base,world,diff)-physics.distanceAt(t-1,base,world,diff);
  approx(d,expected,2e-7);
 }
 for(const t of [0,100,600,3600,54000]){
  const traveled=physics.distanceAt(t,base,world,diff);
  approx(traveled,distanceForTick(t,diff,world));
 }
}
console.log('PASS shared-course determinism: layouts/difficulties, early vs late vs batched requests; Solo-equivalent acceleration cap');

function scored(uid,tick,status='DEAD'){return {uid,tick,status,elapsedMs:Math.round(tick*1000/60)}}
const one=rankRacePlayers([scored('a',60),scored('b',61)]);
assert.deepEqual(one.map(p=>[p.uid,p.rank]),[['b',1],['a',2]]);
const two=rankRacePlayers([scored('a',61),scored('b',62)]);
assert.deepEqual(two.map(p=>[p.uid,p.rank]),[['b',1],['a',2]]);
const same=rankRacePlayers([scored('b',67),scored('a',67),scored('c',66),scored('d',67,'DNF')]);
assert.deepEqual(same.map(p=>[p.uid,p.rank]),[['a',1],['b',1],['c',3],['d',4]]);
const survivor=rankRacePlayers([scored('a',200,'DEAD'),scored('b',200,'SURVIVED')]);
assert.deepEqual(survivor.map(p=>[p.uid,p.rank]),[['b',1],['a',2]]);
assert.equal(rankRacePlayers([scored('a',1,'DNF'),scored('b',2,'DNF')])[0].status,'DNF');
console.log('PASS exact-tick ties, deterministic ranks, SURVIVED priority, DNF demotion');

const networkSource=cut('// Never cancel the disconnect guard','function raceFlap(')+cut('async function racePublish(','function raceFrame(');
function createNetwork({send,guardReady=true}={}){
 const writes=[],events=[];
 let cancels=0;
 const r={code:'FBM-TEST',path:'multiplayerRounds/FBM-TEST/r0',simTick:60,me:{alive:true,status:'ALIVE',tick:60,y:150,vy:1,score:0,elapsedMs:1000},
  publishBusy:false,publishChain:Promise.resolve(),net:newNetworkStats(),disconnectGuard:{cancel:async()=>{events.push('guard-cancel');cancels++}},guardReady,finalWritePromise:null,finalConfirmed:false};
 const ctx={race:r,RACE_STEP:1000/60,db:{},raceRoot:x=>`matches/${x}`,ref:(_db,p)=>p,ownUid:()=> 'uid',rtStamp:()=>999,
  update:async(_path,data)=>{writes.push({...data});events.push('write-'+data.status);await send?.(data)},
  updateSpectator:()=>{},noteWriteAck,performance:{now:()=>100},raceSetStatus:()=>{},RT:s=>s,
  console:{warn:()=>{}},setTimeout,clearTimeout,Promise,};
 run(networkSource,ctx);
 return {ctx,r,writes,events,get cancels(){return cancels}};
}
{
 const n=createNetwork({send:async()=>{throw Error('permission-denied')}});
 const result=await n.ctx.raceFinish('DEAD');
 assert.equal(result,false);assert.equal(n.r.finalConfirmed,false);assert.equal(n.cancels,0);
 assert.equal(n.writes.length,3,'three bounded attempts and still armed onDisconnect');
}
{
 const n=createNetwork();
 assert.equal(await n.ctx.raceFinish('DEAD'),true);
 assert.equal(n.r.finalConfirmed,true);assert.equal(n.cancels,1);
 assert.deepEqual(n.events,['write-DEAD','guard-cancel']);
 assert.equal(await n.ctx.raceFinish('DEAD'),true);
 assert.equal(n.writes.length,1,'idempotent finish');
}
{
 let releaseAlive;const alivePending=new Promise(resolve=>{releaseAlive=resolve});
 const n=createNetwork({send:data=>data.status==='ALIVE'?alivePending:Promise.resolve()});
 const ctx=n.ctx;
 // Capture a pending ALIVE frame, then eliminate locally.
 const pendingAlive=ctx.racePublish();
 const finalPromise=ctx.raceFinish('DNF');
 assert.equal(n.r.me.alive,false,'local player immediately eliminated');
 const quick=await ctx.waitRaceWrite(finalPromise,30);
 assert.equal(quick,false,'exit grace completes even while ACK is hung');
 assert.equal(n.cancels,0,'guard must stay armed during stuck ACK');
 assert.equal(n.writes.filter(x=>x.status==='DNF').length,0,'terminal update must queue after ALIVE');
 releaseAlive();await pendingAlive;assert.equal(await finalPromise,true);
 assert.deepEqual(n.events,['write-ALIVE','write-DNF','guard-cancel']);
}
{
 let releaseAlive;const pending=new Promise(resolve=>{releaseAlive=resolve});
 const n=createNetwork({send:data=>data.status==='ALIVE'?pending:Promise.resolve()});
 const ctx=n.ctx;let cleaned=0,left=0;
 Object.assign(ctx,{
  raceUI:{},document:{fullscreenElement:null},modal:{hidden:false},
  raceCleanup:()=>{cleaned++;ctx.race=null},leaveRoom:async()=>{left++}
 });
 vm.runInContext(cut('async function raceExit()','function raceCleanup()'),ctx);
 const previousAck=ctx.racePublish();
 const start=Date.now();await ctx.raceExit();
 assert.ok(Date.now()-start>=1400&&Date.now()-start<2200,'real raceExit bounded by grace interval');
 assert.equal(cleaned,1);assert.equal(left,1);
 assert.equal(n.cancels,0,'guard remains armed after local exit without ACK');
 assert.equal(n.r.finalConfirmed,false);
 releaseAlive();await previousAck;assert.equal(await n.r.finalWritePromise,true);
 assert.deepEqual(n.events,['write-ALIVE','write-DNF','guard-cancel']);
}
console.log('PASS failed terminal writes retain disconnect guard, stuck ACK exit is bounded, ordering ALIVE -> DNF');
console.log('PASS v2.6.1 targeted regression suite (source functions in Node VM, no live Firebase)');

// Exercise the actual publisher with delayed ACKs, a full pipeline and termination.
{
 const releases = [];
 const n = createNetwork({send: data => data.status === 'ALIVE'
  ? new Promise(resolve => releases.push(resolve)) : Promise.resolve()});
 const pending = [];
 for (let tick = 60; tick < 64; tick++) {
  n.r.me.tick = tick;
  pending.push(n.ctx.racePublish());
 }
 assert.equal(n.writes.length, 3, 'three snapshots may travel before ACK');
 assert.equal(n.r.publishBusy, true, 'bounded pipeline');
 releases[1]();
 await pending[1];
 n.r.me.tick = 70;
 pending.push(n.ctx.racePublish());
 assert.equal(n.writes.at(-1).tick, 70, 'fresh state replaces skipped snapshot');
 const finish = n.ctx.raceFinish('DEAD');
 releases[0](); releases[2]();
 await Promise.all(pending.slice(0, 4));
 assert.equal(n.writes.filter(p => p.status === 'DEAD').length, 0);
 releases[3]();
 await pending[4];
 assert.equal(await finish, true);
 assert.equal(n.writes.at(-1).status, 'DEAD');
 const count = n.writes.length;
 await n.ctx.racePublish();
 assert.equal(n.writes.length, count, 'no ALIVE publication after termination');
 assert.equal(n.r.publishInFlight, 0);
}
console.log('PASS bounded snapshot pipeline, fresh state, out-of-order ACK and terminal barrier');

// Virtual-time transport: compare acknowledged serialization with the real pipeline.
async function measurePublisher(ackMs, serial) {
 let time = 0;
 const deliveries = [];
 const n = createNetwork({send: () => new Promise(resolve => {
  deliveries.push({at: time + ackMs, resolve});
 })});
 let nextSend = 0;
 for (time = 0; time < 3000; time += 10) {
  for (const delivery of deliveries.filter(d => d.at <= time)) delivery.resolve();
  for (let i = deliveries.length - 1; i >= 0; i--) {
   if (deliveries[i].at <= time) deliveries.splice(i, 1);
  }
  // Drain the async publisher and its terminal barrier bookkeeping.
  for (let i = 0; i < 8; i++) await Promise.resolve();
  if (time >= nextSend && !n.r.publishBusy && (!serial || !n.r.publishInFlight)) {
   n.r.me.tick = Math.floor(time * 60 / 1000);
   void n.ctx.racePublish();
   nextSend = time + 100;
  }
  assert.ok((n.r.publishInFlight || 0) <= 3);
 }
 for (const delivery of deliveries) delivery.resolve();
 await n.r.publishChain;
 return n.writes.length;
}
for (const ack of [80, 250, 500]) {
 const before = await measurePublisher(ack, true);
 const after = await measurePublisher(ack, false);
 assert.ok(after >= before);
 if (ack > 100) assert.ok(after > before);
 console.log(`PASS virtual ACK ${ack}ms: ${before} -> ${after} snapshots / 3s, max 3 pending`);
}
{
 const acks = [];
 const n = createNetwork({send: data => data.status === 'ALIVE'
  ? new Promise((resolve, reject) => acks.push({resolve, reject})) : Promise.resolve()});
 const first = n.ctx.racePublish().catch(() => {});
 const second = n.ctx.racePublish();
 const finish = n.ctx.raceFinish('DNF');
 acks[0].reject(Error('temporary failure'));
 await first;
 assert.equal(n.writes.filter(p => p.status === 'DNF').length, 0,
  'one failed write does not release a barrier with another write pending');
 acks[1].resolve();
 await second;
 assert.equal(await finish, true);
}
{
 const n = createNetwork();
 n.r.net.connected = false;
 await n.ctx.racePublish();
 assert.equal(n.writes.length, 0, 'offline position packets do not accumulate');
}
console.log('PASS failed ACK barrier and offline snapshot suppression');

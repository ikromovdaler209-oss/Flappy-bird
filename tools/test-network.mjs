import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {assessReadyRoom,isFreshPlayerState,newGhostTrack,acceptGhostPacket,ghostPosition,newNetworkStats,
        noteWriteAck,publishInterval,networkQuality,MP_TICK_MS} from '../src/multiplayer/netcode.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=await readFile(path.join(root,'src/multiplayer/multiplayer.js'),'utf8');
const rules=await readFile(path.join(root,'styles/multiplayer.css'),'utf8');
function rng(seed){return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296}}
const fmt=n=>Math.round(n*10)/10;

function testStart(count){
 const slots=Object.fromEntries(Array.from({length:count},(_,i)=>[String(i),{uid:'id'+i,ready:true,rev:3}]));
 const room={hostUid:'id0',meta:{version:3,capacity:count===2?3:count},slots};
 assert.equal(assessReadyRoom(room,'id0').valid,true);
 assert.equal(assessReadyRoom(room,'id1').valid,false,'only host may start');
 slots['1'].ready=false;assert.equal(assessReadyRoom(room,'id0').valid,false);
 slots['1'].ready=true;slots['1'].rev=2;assert.equal(assessReadyRoom(room,'id0').valid,false);
 slots['1'].rev=3;assert.equal(assessReadyRoom(room,'id0').valid,true);
 // Shared absolute start time remains correct despite different device clock skew.
 const startAt=1710000000000+10500,delays=[180,470,900,210,645,320,740,120,480,660];
 for(let i=0;i<count;i++){
  const skew=(i-5)*190,received=startAt-10500+delays[i];
  const localAtStart=startAt+skew,offset=-skew;
  assert.equal(Math.floor((localAtStart+offset-startAt)/MP_TICK_MS),0);
  assert.ok(received<startAt,'all clients receive start with time to prepare');
 }
}

// Standalone simulation: 60 FPS bird physics, RTDB-style packet delays,
// jitter, dropped updates, different numbers of friends, and a v2.5 baseline.
function simulate(count,seed=21){
 const rand=rng(seed+count*941),tracks=Array.from({length:count},()=>Array.from({length:count},()=>newGhostTrack()));
 const baseline=Array.from({length:count},()=>Array.from({length:count},()=>({samples:[],display:null})));
 const stats=Array.from({length:count},()=>newNetworkStats());
 const birds=Array.from({length:count},(_,i)=>({y:155+i*4,vy:0,delay:i*3,nextSend:0}));
 const deliveries=[];let sent=0,dropped=0,recv=0;
 const newErrors=[],oldErrors=[];let lastAck=0;
 const ticks=660;
 const physicsY=Array.from({length:count},()=>[]);
 function before(x,observedTick){const {samples}=x;if(!samples.length)return null;
  const target=Math.max(0,observedTick-3);let estimate=samples.at(-1).y;
  if(target<=samples[0].tick)estimate=samples[0].y;
  else{
   let found=false;
   for(let i=1;i<samples.length;i++){
    const a=samples[i-1],b=samples[i];if(target<=b.tick){
     const f=Math.max(0,Math.min(1,(target-a.tick)/Math.max(1,b.tick-a.tick)));
     estimate=a.y+(b.y-a.y)*f;found=true;break;
    }
   }
   if(!found){const s=samples.at(-1),dt=Math.max(0,Math.min(16,target-s.tick));estimate=s.y+s.vy*dt+.5*.26*dt*dt}
  }
  const old=x.display;
  x.display=old===null?estimate:old+(estimate-old)*(Math.abs(estimate-old)>60?.56:.30);
  return x.display;
 }
 for(let t=0;t<ticks;t++){
  const now=t*MP_TICK_MS;
  for(let i=0;i<count;i++){
   const b=birds[i];
   if((t+b.delay)%Math.max(23,31+(i%4)*3)===0)b.vy=-4.4;
   b.vy=Math.min(b.vy+.26,7.5);
   b.y=Math.max(0,Math.min(405,b.y+b.vy));
   physicsY[i][t]=b.y;
   if(now>=b.nextSend){
    sent++;
    const rtt=75+rand()*130;
    noteWriteAck(stats[i],rtt,true,now+rtt);lastAck=now;
    b.nextSend=now+publishInterval(count,stats[i].ackMs);
    for(let j=0;j<count;j++)if(j!==i){
     if(rand()<.035){dropped++;continue}
     const oneWay=50+rand()*100+(rand()<.03?100:0);
     deliveries.push({arrival:now+oneWay,recipient:j,sender:i,p:{tick:t,y:b.y,vy:b.vy,status:'ALIVE'}});
    }
   }
  }
  // Messages intentionally arrive out of order, mirroring Wi-Fi jitter.
  for(let n=deliveries.length-1;n>=0;n--){
   const e=deliveries[n];if(e.arrival>now)continue;deliveries.splice(n,1);
   const track=tracks[e.recipient][e.sender];
   if(acceptGhostPacket(track,e.p,now))recv++;
   const bs=baseline[e.recipient][e.sender];
   if(!bs.samples.length||e.p.tick>bs.samples.at(-1).tick){
    bs.samples.push(e.p);if(bs.samples.length>6)bs.samples.shift();
   }
  }
  if(t>130){
   for(let j=0;j<count;j++)for(let i=0;i<count;i++)if(i!==j){
    const n=ghostPosition(tracks[j][i],t,.26,0,410);
    const o=before(baseline[j][i],t);
    if(n!==null)newErrors.push(Math.abs(n-physicsY[i][t]));
    if(o!==null)oldErrors.push(Math.abs(o-physicsY[i][t]));
   }
  }
 }
 assert.ok(recv>count*30,'remote packets were delivered');
 assert.equal(sent>0,true);
 for(const st of stats){assert.ok(st.ackMs>0);assert.equal(st.failed,0)}
 const avg=v=>v.reduce((a,b)=>a+b,0)/v.length;
 const p95=v=>v.toSorted((a,b)=>a-b)[Math.floor(v.length*.95)];
 const out={clients:count,sendCount:sent,received:recv,dropped,oldMean:avg(oldErrors),newMean:avg(newErrors),old95:p95(oldErrors),new95:p95(newErrors),ackMean:avg(stats.map(x=>x.ackMs))};
 return out;
}

for(const n of [2,3,5,10])testStart(n);
const empty=newGhostTrack();
assert.equal(acceptGhostPacket(empty,{tick:2,y:20,vy:1,status:'ALIVE'},50),true);
assert.equal(acceptGhostPacket(empty,{tick:1,y:100,vy:1,status:'ALIVE'},90),false,'out of order');
assert.equal(acceptGhostPacket(empty,{tick:2,y:20,vy:1,status:'DEAD'},100),true,'final at same tick');
assert.equal(acceptGhostPacket(empty,{tick:3,y:20,vy:1,status:'ALIVE'},110),false,'no resurrection');
assert.equal(isFreshPlayerState({status:'DEAD',tick:24},{status:'ALIVE',tick:25}),false,'no state resurrection');
assert.equal(isFreshPlayerState({status:'ALIVE',tick:24},{status:'ALIVE',tick:23}),false,'old packet ignored');
assert.equal(isFreshPlayerState({status:'ALIVE',tick:24},{status:'DNF',tick:24}),true,'DNF accepted');
assert.equal(ghostPosition(empty,45,.26,0,400)<=400,true,'bounded prediction');
assert.equal(publishInterval(2,100)<publishInterval(10,100),true,'throttle 10-player rooms');
const st=newNetworkStats();assert.equal(networkQuality(st,100),'pending');st.connected=false;assert.equal(networkQuality(st,100),'offline');
assert.ok(source.includes('watchRaceCosmetics(code,race)'),'v2.5 equipped cosmetics live');
assert.ok(source.includes("'/cosmetics/'+uid"),'v2.5 self-only cosmetics record');
assert.ok(source.includes("MP_TRAIL_IDS"),'v2.5 trails kept');
assert.ok(source.includes("flyingBirdMultiplayerArt"),'full-quality artwork preserved');
assert.ok(source.includes("raceFinish('DNF')"),'disconnect means DNF, not reconnect');
assert.ok(source.includes('assessReadyRoom(current,ownUid())'),'start revalidation integrated');
assert.ok(rules.includes('#fbMpRaceNetwork'),'network indicator CSS exists');

const runs=[2,3,5,10].map(count=>simulate(count));
for(const x of runs){
 assert.ok(x.newMean<x.oldMean*1.05,'prediction should not regress compared with v2.5 baseline');
 console.log(`PASS ${x.clients} clients | ACK ${fmt(x.ackMean)}ms | simulated position error v2.5 ${fmt(x.oldMean)}px -> v2.6 ${fmt(x.newMean)}px | P95 ${fmt(x.old95)}px -> ${fmt(x.new95)}px | ${x.sendCount} sends`);
}
console.log('PASS ready/host/version checks, synchronized start, stale packet rejection, terminal DNF, v2.5 cosmetics regression');

for (const tick of [NaN, Infinity, -1, 1.5]) {
 assert.equal(isFreshPlayerState(null, {tick, status:'ALIVE'}), false);
}
assert.equal(isFreshPlayerState(null, {tick:1, status:'UNKNOWN'}), false);
assert.equal(isFreshPlayerState(null, {tick:1, status:'ALIVE', y:Infinity}), false);
const terminalTrack = newGhostTrack();
acceptGhostPacket(terminalTrack, {tick:1,y:20,vy:0,status:'DEAD'}, 20);
assert.equal(acceptGhostPacket(terminalTrack, {tick:2,y:20,vy:0,status:'SURVIVED'}, 30), false);
console.log('PASS malformed states and terminal status changes rejected');

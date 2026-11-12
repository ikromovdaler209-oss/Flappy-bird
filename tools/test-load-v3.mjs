import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {publishInterval} from '../src/multiplayer/netcode.js';
const env=await initializeTestEnvironment({projectId:'demo-flying-bird',database:{host:'127.0.0.1',port:9000,rules:readFileSync('firebase-rules/High_Fly_RTDB_v3_FULL.json','utf8')}});
const clients=[],rooms=[],offs=[],acks=[];let deliveries=0,writes=0;
try{
 await env.clearDatabase();
 for(const n of [3,5,10])for(let room=0;room<3;room++){
  const code=`FBM-ABC${'DEF'[room]}-EFG${'234'[ [3,5,10].indexOf(n)]}`,path=`multiplayerRounds/${code}/r0`;
  const roster={},players={},seats={},ids=Array.from({length:n},(_,i)=>`load_${n}_${room}_player_${String(i).padStart(4,'0')}`);
  for(const [i,uid] of ids.entries()){roster[uid]=true;seats[i]=uid;players[uid]={status:'ALIVE',tick:0,y:180,vy:0,score:0,elapsedMs:0,lastSeen:Date.now()};}
  await env.withSecurityRulesDisabled(c=>c.database().ref(path).set({meta:{hostUid:ids[0],startAt:Date.now()-15000,seed:1,version:0},roster,players,seats}));
  for(const uid of ids){const db=env.authenticatedContext(uid).database();clients.push({db,uid,path});for(const id of ids){const r=db.ref(path+'/players/'+id),fn=()=>deliveries++;r.on('value',fn);offs.push(()=>r.off('value',fn));}}
  rooms.push({n,code});
 }
 console.log('READY',clients.length,'clients');
 const start=performance.now();
 for(let frame=1;frame<=20;frame++)await Promise.all(clients.map(async({db,uid,path})=>{
  const at=performance.now();await db.ref(path+'/players/'+uid).update({tick:frame*12,elapsedMs:frame*200,y:180+frame%5,vy:1,score:Math.floor(frame/5),lastSeen:Date.now()});acks.push(performance.now()-at);writes++;
 }));
 // Await an explicit final-state read from every client, rather than guessing a delay.
 await Promise.all(clients.map(async({db,uid,path})=>assert.equal((await db.ref(path+'/players/'+uid+'/tick').get()).val(),240)));
 acks.sort((a,b)=>a-b);
 const bytes=Buffer.byteLength(JSON.stringify({status:'ALIVE',tick:240,y:180,vy:1,score:4,elapsedMs:4000,lastSeen:Date.now()}));
 const model=[3,5,10].map(n=>{const interval=publishInterval(n,150);return {players:n,intervalMs:interval,writesPerMinute:Math.ceil(n*60000/interval),payloadMBPerMinute:+(n*n*60000/interval*bytes/1e6).toFixed(3)}});
 const result={rooms:rooms.length,clients:clients.length,writes,deliveries,durationMs:Math.round(performance.now()-start),ackP95Ms:Math.round(acks[Math.floor(acks.length*.95)]),payloadBytes:bytes,model};
 writeFileSync('load-results.json',JSON.stringify(result,null,2));console.log('PASS local RTDB load',JSON.stringify(result));
}finally{for(const off of offs)off();await env.cleanup()}

import assert from 'node:assert/strict';
import {emptyStats,normalizeStats,derive,parseRoundPath,verifyRound,applyRecord,compareRating,formatDuration,MIN_ROUND_GAP_MS} from '../src/multiplayer/stats.js';
const CODE='FBM-ABCD-EFGH',path='multiplayerRounds/'+CODE+'/r3',T=1000/60;
const mk=(status,ms,score=0)=>({status,tick:Math.round(ms/T),elapsedMs:ms,score,y:0,vy:0,lastSeen:1});
const snap=()=>({meta:{startAt:1700000000000},roster:{me:true,a:true,b:true},players:{me:mk('DEAD',12000,4),a:mk('DEAD',20000,7),b:mk('SURVIVED',20000,7)}});

// identity
assert.deepEqual(parseRoundPath(path),{code:CODE,roundKey:'r3',id:CODE+'_r3'});
for(const bad of ['','multiplayerRounds/x/r3','multiplayerRounds/'+CODE+'/3','multiplayerMatches/'+CODE,'multiplayerRounds/'+CODE+'/r3/players'])assert.equal(parseRoundPath(bad),null,bad);

// verified result: place, ties, win flag
let v=verifyRound({path,snapshot:snap(),uid:'me'});
assert.ok(v.ok);assert.equal(v.record.place,3);assert.equal(v.record.win,false);assert.equal(v.record.players,3);assert.equal(v.record.status,'DEAD');
v=verifyRound({path,snapshot:snap(),uid:'b'});assert.ok(v.ok);assert.equal(v.record.win,true);assert.equal(v.record.place,1);
const tied=snap();tied.players.me=mk('DEAD',20000,7);
v=verifyRound({path,snapshot:tied,uid:'me'});assert.ok(v.ok);assert.equal(v.record.place,2);assert.equal(v.record.tie,true);

// rejection of unverifiable rounds
const rej=(mut,reason,uid='me')=>{const s=snap();mut(s);const r=verifyRound({path,snapshot:s,uid});assert.equal(r.ok,false,reason);assert.equal(r.reason,reason)};
rej(s=>{s.players.a.status='ALIVE'},'incomplete');
rej(s=>{delete s.players.a},'incomplete');
rej(s=>{s.roster={me:true};s.players={me:mk('DEAD',5000)}},'incomplete');
rej(s=>{},'roster','ghost');
rej(s=>{s.meta.startAt='x'},'startAt');
rej(s=>{s.players.me.elapsedMs=900000},'consistency');
rej(s=>{s.players.a.status='SURVIVED'},'survivors');
rej(s=>{s.players.me.elapsedMs=-5},'values');
rej(s=>{s.players.me.elapsedMs=4000000;s.players.me.tick=Math.round(4000000/T)},'values');
assert.equal(verifyRound({path:'bad',snapshot:snap(),uid:'me'}).reason,'path');
assert.equal(verifyRound({path,snapshot:null,uid:'me'}).reason,'snapshot');

// totals: counted once, in order, derived numbers
let stats=emptyStats();
const r1=verifyRound({path,snapshot:snap(),uid:'b'}).record;
let a=applyRecord(stats,r1);assert.ok(a.ok);stats=a.stats;
assert.deepEqual([stats.matches,stats.wins,stats.totalMs,stats.bestMs],[1,1,20000,20000]);
assert.equal(applyRecord(stats,r1).reason,'duplicate');
const r2={...verifyRound({path:'multiplayerRounds/'+CODE+'/r4',snapshot:snap(),uid:'me'}).record};
assert.equal(applyRecord(stats,{...r2,startAt:r1.startAt+MIN_ROUND_GAP_MS-1}).reason,'order');
a=applyRecord(stats,{...r2,startAt:r1.startAt+MIN_ROUND_GAP_MS});assert.ok(a.ok);stats=a.stats;
const d=derive(stats);assert.deepEqual([d.matches,d.wins,d.losses,d.winRate,d.avgMs,d.bestMs],[2,1,1,50,16000,20000]);
assert.equal(applyRecord(stats,{...r2,id:'x'}).reason,'record');
assert.equal(applyRecord(stats,{...r2,win:true}).reason,'record');

// untrusted cache never exceeds sane bounds
const n=normalizeStats({matches:-4,wins:99,totalMs:'abc',bestMs:1e12,lastRound:5});
assert.deepEqual([n.matches,n.wins,n.totalMs,n.bestMs,n.lastRound],[0,0,0,0,'']);
assert.equal(derive(emptyStats()).winRate,0);

// rating order: wins, win rate, best time
const rows=[{nick:'B',matches:10,wins:3,totalMs:1,bestMs:5},{nick:'A',matches:5,wins:3,totalMs:1,bestMs:5},{nick:'C',matches:6,wins:4,totalMs:6,bestMs:1}];
assert.deepEqual(rows.sort(compareRating).map(x=>x.nick),['C','A','B']);
assert.equal(formatDuration(75300),'01:15.3');assert.equal(formatDuration(0),'00:00.0');
console.log('PASS v2.9: round verification, once-only totals, ordering, bounds, rating order');

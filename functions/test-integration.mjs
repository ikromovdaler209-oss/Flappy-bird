import assert from 'node:assert/strict';
// Never let this test write to a real project, even when accidentally run directly.
assert.equal(process.env.GCLOUD_PROJECT,'demo-high-fly','Use the demo-high-fly emulators');
assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^(127\.0\.0\.1|localhost):\d+$/);
const firestoreOnly=process.argv.includes('--firestore-only');
if(firestoreOnly)process.env.FIREBASE_DATABASE_EMULATOR_HOST='127.0.0.1:9000';
if(!firestoreOnly)assert.match(process.env.FIREBASE_DATABASE_EMULATOR_HOST||'',/^(127\.0\.0\.1|localhost):\d+$/);
const {getFirestore}=await import('firebase-admin/firestore');
const {getDatabase}=await import('firebase-admin/database');
const {saveHighFlyProgress,settleHighFlyRound}=await import('./index.js');
const db=getFirestore(),uid='server_test_user01';
const auth={uid,token:{firebase:{sign_in_provider:'password'}}};
const call=(data,baseRevision=0)=>saveHighFlyProgress.run({auth,data:{...data,expectedUid:uid,baseRevision}});
const init=()=>saveHighFlyProgress.run({auth,data:{expectedUid:uid,initializeOnly:true}});
const ref=db.doc('progress/'+uid);
await ref.delete();await db.doc('progressGuards/'+uid).delete();
await assert.rejects(saveHighFlyProgress.run({data:{}}),e=>e.code==='unauthenticated');
await assert.rejects(saveHighFlyProgress.run({auth:{...auth,token:{firebase:{sign_in_provider:'anonymous'}}},data:{}}),e=>e.code==='unauthenticated');
await assert.rejects(saveHighFlyProgress.run({auth,data:{expectedUid:'other'}}),e=>e.code==='permission-denied');
await assert.rejects(saveHighFlyProgress.run({auth,data:{expectedUid:uid,initializeOnly:true,wallet:{coins:999999}}}),e=>e.code==='invalid-argument');
const initialized=await Promise.all([init(),init()]);
assert.equal(initialized[0].revision,0);assert.equal(initialized[1].revision,0);
const zero=initialized[0].progress;
assert.equal(zero.wallet.coins,0);
let earned=structuredClone(zero);earned.save.games=1;earned.save.pipes=5;earned.save.earnedCoins=5;earned.wallet.coins=5;
assert.equal((await call(earned)).revision,1);
assert.equal((await call(earned)).revision,1); // lost response retry
assert.equal((await ref.get()).data().wallet.coins,5);
let cheat=structuredClone(earned);cheat.wallet.coins=999999;
await assert.rejects(call(cheat,1),e=>e.code==='failed-precondition');
const a=structuredClone(earned),b=structuredClone(earned);a.cfg.lang='RU';b.cfg.lang='EN';
const races=await Promise.allSettled([call(a,1),call(b,1)]);
assert.equal(races.filter(x=>x.status==='fulfilled').length,1);
assert.equal(races.find(x=>x.status==='rejected').reason.code,'aborted');
await assert.rejects(call(earned,1),e=>e.code==='aborted');
// Existing cloud balances remain the migration baseline. Exact catalog price is charged once.
await ref.set({...earned,wallet:{...earned.wallet,coins:1000}});
const buy=structuredClone(earned);buy.wallet={coins:400,owned:[22],maps:[],trails:['STARDUST']};
await Promise.all([call(buy),call(buy)]);
assert.equal((await ref.get()).data().wallet.coins,400);
assert.equal((await db.doc('publicStats/'+uid).get()).data().coins,400);
const free=structuredClone(buy);free.wallet.maps=['NEON'];
await assert.rejects(call(free,1),e=>e.code==='failed-precondition');
await call(zero,1); // reset is validated and advances the revision
await assert.rejects(call(buy,1),e=>e.code==='aborted');
console.log('PASS real Firestore + callable handlers: auth, fresh zero account, no import, forged balance, paid bundle, concurrent saves, retries and stale reset replay');
if(!firestoreOnly){
 const rt=getDatabase(),path='multiplayerRounds/FBM-ABCD-EFGH/r0',other='server_test_user02',startAt=Date.now()-10000;
 const settle=(data,who=auth)=>settleHighFlyRound.run({auth:who,data:{expectedUid:who.uid,...data}});
 await db.recursiveDelete(db.doc('multiplayerStats/'+uid));
 await rt.ref(path).remove();
 await assert.rejects(settle({path}),e=>e.code==='failed-precondition'&&e.message==='snapshot');
 assert.equal((await db.doc('multiplayerStats/'+uid).get()).exists,false);
 await rt.ref(path).set({meta:{startAt},roster:{[uid]:true,[other]:true},players:{[uid]:{status:'SURVIVED',tick:120,elapsedMs:2000,score:1},[other]:{status:'DEAD',tick:60,elapsedMs:1000,score:0}}});
 await assert.rejects(settle({path,win:true}),e=>e.code==='invalid-argument');
 await assert.rejects(settle({path},{...auth,uid:'not_in_roster'}),e=>e.code==='failed-precondition'&&e.message==='roster');
 const results=await Promise.all([settle({path}),settle({path})]);
 assert.equal(results.filter(x=>x.kind==='ok').length,1);
 const totals=(await db.doc('multiplayerStats/'+uid).get()).data();
 assert.equal(totals.matches,1);assert.equal(totals.wins,1);
 console.log('PASS real RTDB + Firestore: nonexistent match rejected, foreign roster rejected, server-derived result, concurrent one receipt/one win');
}
process.exit(0);

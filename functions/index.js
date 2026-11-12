import {initializeApp} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {verifyRound,applyRecord,emptyStats,parseRoundPath} from './shared/stats.js';
import {validateProgress} from './progress.js';
initializeApp({databaseURL:'https://flying-bird-d6832-default-rtdb.europe-west1.firebasedatabase.app'});
const db=getFirestore();
const options={region:'europe-west1',maxInstances:3,concurrency:20,timeoutSeconds:30,memory:'256MiB'};
function user(req){
 if(!req.auth||req.auth.token.firebase?.sign_in_provider==='anonymous')throw new HttpsError('unauthenticated','Sign in first.');
 return req.auth.uid;
}
// The caller supplies ONLY a round path. Winner, elapsed time and score come from RTDB.
export const settleHighFlyRound=onCall(options,async req=>{
 const uid=user(req),path=req.data?.path,id=parseRoundPath(path);
 if(req.data?.expectedUid!==uid)throw new HttpsError('permission-denied','Account changed.');
 if(!id||Object.keys(req.data).some(k=>!['path','expectedUid'].includes(k)))throw new HttpsError('invalid-argument','Invalid round path.');
 const statsRef=db.doc('multiplayerStats/'+uid),roundRef=statsRef.collection('rounds').doc(id.id);
 // Fast idempotent retry; no realtime read for a round already credited.
 const receipt=await roundRef.get();
 if(receipt.exists)return {kind:'duplicate',stats:(await statsRef.get()).data()||emptyStats()};
 const snap=(await getDatabase().ref(path).get()).val();
 const checked=verifyRound({path,snapshot:snap,uid});
 if(!checked.ok)throw new HttpsError('failed-precondition',checked.reason);
 const now=Date.now(),meta=snap.meta;
 if(meta.startAt>now||checked.record.elapsedMs>now-meta.startAt+3000||checked.record.elapsedMs>3600000)throw new HttpsError('failed-precondition','Invalid clock.');
 return db.runTransaction(async tx=>{
  const [s,r]=await Promise.all([tx.get(statsRef),tx.get(roundRef)]);
  const current=s.exists?s.data():emptyStats();
  if(r.exists)return {kind:'duplicate',stats:current};
  const applied=applyRecord(current,checked.record);
  if(!applied.ok)throw new HttpsError('failed-precondition',applied.reason);
  const {id,...record}=checked.record;
  tx.create(roundRef,{...record,createdAt:FieldValue.serverTimestamp()});
  tx.set(statsRef,{...applied.stats,updatedAt:FieldValue.serverTimestamp()});
  return {kind:'ok',stats:applied.stats};
 });
});
export const saveHighFlyProgress=onCall(options,async req=>{
 const uid=user(req),ref=db.doc('progress/'+uid),guardRef=db.doc('progressGuards/'+uid);
 const payload=req.data;
 if(payload?.expectedUid!==uid)throw new HttpsError('permission-denied','Account changed.');
 return db.runTransaction(async tx=>{
  const [s,g]=await Promise.all([tx.get(ref),tx.get(guardRef)]);
  if(payload.initializeOnly===true&&s.exists)return {ok:true};
  const verdict=validateProgress(s.exists?s.data():null,payload,g.exists?g.data():null,Date.now());
  if(!verdict.ok)throw new HttpsError('failed-precondition',verdict.reason);
  const data={cfg:payload.cfg,save:payload.save,wallet:payload.wallet};
  tx.set(ref,{...data,updatedAt:FieldValue.serverTimestamp(),version:3});
  tx.set(guardRef,verdict.guard);
  // Public statistics reflect accepted cloud progress only.
  tx.set(db.doc('publicStats/'+uid),{best:data.save.best,games:data.save.games,pipes:data.save.pipes,flaps:data.save.flaps,earnedCoins:data.save.earnedCoins,coins:data.wallet.coins,achievements:Object.keys(data.save.ach).length,updatedAt:FieldValue.serverTimestamp()});
  return {ok:true};
 });
});

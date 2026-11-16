import {isDeepStrictEqual} from 'node:util';
import {initializeApp} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
import {getFirestore,FieldValue} from 'firebase-admin/firestore';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {verifyRound,applyRecord,emptyStats,parseRoundPath} from './shared/stats.js';
import {validateProgress} from './progress.js';
// The demo namespace is used only when an RTDB emulator is explicitly configured.
initializeApp({databaseURL:(process.env.FIREBASE_DATABASE_EMULATOR_HOST || process.env.GCLOUD_PROJECT?.startsWith('demo-'))
 ? 'https://demo-high-fly-default-rtdb.firebaseio.com'
 : 'https://flying-bird-d6832-default-rtdb.europe-west1.firebasedatabase.app'});
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
  const [snapshot,guard]=await Promise.all([tx.get(ref),tx.get(guardRef)]);
  const before=snapshot.exists?snapshot.data():null;
  const revision=Number.isSafeInteger(before?.revision)?before.revision:0;
  if(payload.initializeOnly===true){
   if(Object.keys(payload).some(key=>!['expectedUid','initializeOnly'].includes(key)))
    throw new HttpsError('invalid-argument','Initialization does not accept local progress.');
   if(before)return {ok:true,revision,progress:{cfg:before.cfg||{},save:before.save||{},wallet:before.wallet||{}}};
   const progress={cfg:{},save:{games:0,pipes:0,flaps:0,earnedCoins:0,
    best:{EASY:0,NORMAL:0,HARD:0,EXTREME:0},ach:{}},wallet:{coins:0,owned:[],maps:[],trails:[]}};
   tx.create(ref,{...progress,revision:0,version:3,updatedAt:FieldValue.serverTimestamp()});
   tx.set(guardRef,{at:Date.now(),credits:10});
   return {ok:true,revision:0,progress};
  }
  if(!before)throw new HttpsError('failed-precondition','Initialize the account first.');
  if(!Number.isSafeInteger(payload.baseRevision)||payload.baseRevision<0)
   throw new HttpsError('invalid-argument','Missing progress revision.');
  const data={cfg:payload.cfg,save:payload.save,wallet:payload.wallet};
  const unchanged=isDeepStrictEqual(data,{cfg:before.cfg,save:before.save,wallet:before.wallet});
  if(payload.baseRevision!==revision){
   if(unchanged)return {ok:true,revision};
   throw new HttpsError('aborted','Progress changed on another device.');
  }
  const verdict=validateProgress(before,payload,guard.exists?guard.data():null,Date.now());
  if(!verdict.ok)throw new HttpsError('failed-precondition','Progress rejected: '+verdict.reason,{reason:verdict.reason});
  const nextRevision=unchanged?revision:revision+1;
  tx.set(ref,{...data,revision:nextRevision,updatedAt:FieldValue.serverTimestamp(),version:3});
  tx.set(guardRef,verdict.guard);
  tx.set(db.doc('publicStats/'+uid),{best:data.save.best,games:data.save.games,pipes:data.save.pipes,
   flaps:data.save.flaps,earnedCoins:data.save.earnedCoins,coins:data.wallet.coins,
   achievements:Object.values(data.save.ach).filter(Boolean).length,updatedAt:FieldValue.serverTimestamp()});
  return {ok:true,revision:nextRevision};
 });
});

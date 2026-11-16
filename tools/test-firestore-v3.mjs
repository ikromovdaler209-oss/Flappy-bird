import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
const env=await initializeTestEnvironment({projectId:'demo-high-fly',firestore:{host:'127.0.0.1',port:8080,rules:readFileSync(new URL('../firestore.rules', import.meta.url),'utf8')}});
const uid='host_player_00001',other='friend_player_0002';
const db=env.authenticatedContext(uid).firestore(),stranger=env.authenticatedContext(other).firestore();
let count=0;const deny=async p=>{await assertFails(p);count++},ok=async p=>{await assertSucceeds(p);count++};
try{
 await env.clearFirestore();
 // Current client-authoritative contract: owner writes are permitted.
 await ok(db.doc('progress/'+uid).set({wallet:{coins:600}}));
 await deny(stranger.doc('progress/'+uid).set({wallet:{coins:999999}}));
 await deny(env.unauthenticatedContext().firestore().doc('progress/'+uid).get());
 await deny(db.doc('progressGuards/'+uid).set({credits:999999,at:0}));
 await deny(db.doc('multiplayerStats/'+uid).set({matches:100,wins:100}));
 await deny(db.doc('multiplayerStats/'+uid+'/rounds/FBM-ABCD-EFGH_r0').set({win:true}));
 await deny(db.doc('publicStats/'+uid).set({coins:999999}));
 await deny(db.doc('leaderboardEntries/'+uid).set({coins:999999}));
 await deny(db.doc('lastBirdEntries/'+uid).set({wins:9999}));
 // Spark contract: a shaped batch is accepted without server-side RTDB verification.
 const {serverTimestamp}=await import('firebase/firestore');
 const startAt=Date.now()-20000,id='FBM-ABCD-EFGH_r0';
 const batch=db.batch();
 batch.set(db.doc('multiplayerStats/'+uid),{v:1,matches:1,wins:1,totalMs:2000,bestMs:2000,lastStartAt:startAt,lastRound:id,updatedAt:serverTimestamp()});
 batch.set(db.doc('multiplayerStats/'+uid+'/rounds/'+id),{code:'FBM-ABCD-EFGH',roundKey:'r0',startAt,players:2,status:'SURVIVED',place:1,tie:false,elapsedMs:2000,score:1,win:true,createdAt:serverTimestamp()});
 await ok(batch.commit());
 await deny(db.doc('multiplayerStats/'+uid).update({wins:2}));
 await deny(db.doc('multiplayerStats/'+uid+'/rounds/'+id).delete());
 await env.withSecurityRulesDisabled(async c=>{const x=c.firestore();await x.doc('progress/'+uid).set({wallet:{coins:600}});await x.doc('multiplayerStats/'+uid).set({matches:1,wins:0});await x.doc('publicProfiles/'+uid).set({visibility:'hidden'});});
 await ok(db.doc('progress/'+uid).get());await deny(stranger.doc('progress/'+uid).get());
 await ok(db.doc('multiplayerStats/'+uid).get());await deny(stranger.doc('multiplayerStats/'+uid).get());
 await deny(env.unauthenticatedContext().firestore().doc('publicProfiles/'+uid).get());
 await deny(stranger.doc('progress/'+uid).delete());
 await ok(db.doc('progress/'+uid).delete());
 console.log('PASS Firestore emulator:',count,'Spark contract/privacy checks; shaped client records are NOT server-verified');
}finally{await env.cleanup()}

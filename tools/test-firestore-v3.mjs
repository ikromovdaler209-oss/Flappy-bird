import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {readFileSync} from 'node:fs';
const env=await initializeTestEnvironment({projectId:'demo-flying-bird',firestore:{host:'127.0.0.1',port:8080,rules:readFileSync('firebase-rules/High_Fly_Firestore_v3_FULL.rules','utf8')}});
const uid='host_player_00001',other='friend_player_0002';
const db=env.authenticatedContext(uid).firestore(),stranger=env.authenticatedContext(other).firestore();
let count=0;const deny=async p=>{await assertFails(p);count++},ok=async p=>{await assertSucceeds(p);count++};
try{
 await env.clearFirestore();
 await deny(db.doc('progress/'+uid).set({wallet:{coins:999999}}));
 await deny(db.doc('progressGuards/'+uid).set({credits:999999,at:0}));
 await deny(db.doc('multiplayerStats/'+uid).set({matches:100,wins:100}));
 await deny(db.doc('multiplayerStats/'+uid+'/rounds/FBM-ABCD-EFGH_r0').set({win:true}));
 await deny(db.doc('publicStats/'+uid).set({coins:999999}));
 await deny(db.doc('leaderboardEntries/'+uid).set({coins:999999}));
 await deny(db.doc('lastBirdEntries/'+uid).set({wins:9999}));
 await env.withSecurityRulesDisabled(async c=>{const x=c.firestore();await x.doc('progress/'+uid).set({wallet:{coins:600}});await x.doc('multiplayerStats/'+uid).set({matches:1,wins:0});await x.doc('publicProfiles/'+uid).set({visibility:'hidden'});});
 await ok(db.doc('progress/'+uid).get());await deny(stranger.doc('progress/'+uid).get());
 await ok(db.doc('multiplayerStats/'+uid).get());await deny(stranger.doc('multiplayerStats/'+uid).get());
 await deny(env.unauthenticatedContext().firestore().doc('publicProfiles/'+uid).get());
 await deny(db.doc('progress/'+uid).delete());
 console.log('PASS Firestore emulator:',count,'owner/privacy and forged writes checks; rules compile');
}finally{await env.cleanup()}

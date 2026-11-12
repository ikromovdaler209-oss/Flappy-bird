// Offline shape checks. These DO NOT compile Firebase Rules or test server permissions.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../firebase.json',import.meta.url),'utf8'));
const aliases=JSON.parse(readFileSync(new URL('../.firebaserc',import.meta.url),'utf8'));
assert.equal(aliases.projects.default,'demo-high-fly','Only use a demo project for offline test defaults');
assert.equal(config.firestore.rules,'firestore.rules');
assert.equal(config.database.rules,'database.rules.json');
const firestore=readFileSync(new URL('../firestore.rules',import.meta.url),'utf8');
const rtdb=JSON.parse(readFileSync(new URL('../database.rules.json',import.meta.url),'utf8'));
assert.match(firestore,/service cloud\.firestore\s*\{/);
for(const rule of ['players','progress','publicStats','multiplayerStats','friendRequests'])assert.ok(firestore.includes('match /'+rule+'/'),`Firestore collection ${rule} missing`);
assert.equal(rtdb.rules['.read'],false);
assert.equal(rtdb.rules['.write'],false);
for(const path of ['presence','presenceAccess','multiplayerRooms','multiplayerInvites','multiplayerMatches','multiplayerRounds'])assert.ok(rtdb.rules[path],`RTDB path ${path} missing`);
assert.equal(Object.hasOwn(config.firestore,'indexes'),false,'Do not manage production composite indexes from incomplete snapshot');
console.log('PASS offline Firebase config/rules file shape (NOT emulator or live database authorization)');

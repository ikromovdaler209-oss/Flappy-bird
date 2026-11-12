/**
 * Safe local-only patch: update just two existing RTDB catalog allowlists.
 * Input MUST be a fresh copy of currently deployed Realtime Database rules.
 * No Firebase connection, deployment, or writes to the source file.
 * Usage:
 *   node tools/update-multiplayer-rtdb-rules.mjs database.rules.json database.rules.updated.json
 */
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const source=process.argv[2]||'database.rules.json';
const destination=process.argv[3]||'database.rules.updated.json';
assert.notEqual(source,destination,'Use separate input and output files to protect the original rules');
const solo=readFileSync('src/game/solo.js','utf8');
const mp=readFileSync('src/multiplayer/multiplayer.js','utf8');
const config=JSON.parse(readFileSync(source,'utf8'));
const jsList=(text,re,label)=>{
  const m=text.match(re);
  assert.ok(m,`Missing ${label}`);
  return [...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
};
const maps=jsList(solo,/const MAP_KEYS\s*=\s*\[([^\]]+)\]/,'solo maps');
const mpMaps=jsList(mp,/const mapIds\s*=\s*\[([^\]]+)\]/,'MP maps');
const trailsBlock=solo.match(/const TRAILS\s*=\s*\[([\s\S]*?)\];\s*const wallet/);
assert.ok(trailsBlock,'Missing shop trail list');
const trails=['NONE',...[...trailsBlock[1].matchAll(/\bid:\s*'([^']+)'/g)].map(x=>x[1])];
const mpTrails=jsList(mp,/const MP_TRAIL_IDS\s*=\s*new Set\(\[([\s\S]*?)\]\)/,'MP trails');
assert.deepEqual(new Set(maps),new Set(mpMaps),'Map list differs between solo and MP');
assert.deepEqual(new Set(trails),new Set(mpTrails),'Trail list differs between solo and MP');
for(const ids of [maps,trails]){
  assert.equal(new Set(ids).size,ids.length,'Duplicate cosmetic IDs');
  assert.ok(ids.every(x=>/^[A-Z][A-Z0-9_]*$/.test(x)),'Unsafe ID in generated rules regex');
}
const room=config.rules?.multiplayerRooms?.$code?.meta;
const trail=config.rules?.multiplayerRounds?.$code?.$round?.cosmetics?.$uid?.trail;
assert.ok(room && typeof room['.validate']==='string','Room meta validator missing');
assert.ok(trail && typeof trail['.validate']==='string','Round cosmetics trail validator missing');
const mapExpr=/newData\.child\('map'\)\.val\(\)\.matches\(\/\^\([^)]*\)\$\/\)/g;
const trailExpr=/newData\.val\(\)\.matches\(\/\^\([^)]*\)\$\/\)/g;
assert.equal([...room['.validate'].matchAll(mapExpr)].length,1,'Expected exactly one anchored map allowlist');
assert.equal([...trail['.validate'].matchAll(trailExpr)].length,1,'Expected exactly one anchored trail allowlist');
room['.validate']=room['.validate'].replace(mapExpr,`newData.child('map').val().matches(/^(${maps.join('|')})$/)`);
trail['.validate']=trail['.validate'].replace(trailExpr,`newData.val().matches(/^(${trails.join('|')})$/)`);
writeFileSync(destination,JSON.stringify(config,null,2)+'\n');
console.log(`Wrote ${destination}: map allowlist ${maps.length}, trail allowlist ${trails.length}. Original untouched. No Firebase deployment.`);

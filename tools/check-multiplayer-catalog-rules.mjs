import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const solo=readFileSync('src/game/solo.js','utf8');
const mp=readFileSync('src/multiplayer/multiplayer.js','utf8');
const rulesPath=process.argv[2]||'database.rules.json';
const rules=JSON.parse(readFileSync(rulesPath,'utf8')).rules;

function extract(src,regex,label){
  const match=src.match(regex);
  assert.ok(match,`Cannot locate ${label}`);
  return match[1];
}
const quotes=text=>[...text.matchAll(/'([^']+)'/g)].map(x=>x[1]);
const soloMaps=quotes(extract(solo,/const MAP_KEYS\s*=\s*\[([^\]]+)\]/,'solo map list'));
const mpMaps=quotes(extract(mp,/const mapIds\s*=\s*\[([^\]]+)\]/,'multiplayer map list'));
const trailBlock=extract(solo,/const TRAILS\s*=\s*\[([\s\S]*?)\];\s*const wallet/,'shop trails');
const shopTrails=['NONE',...[...trailBlock.matchAll(/\bid:\s*'([^']+)'/g)].map(m=>m[1])];
const mpTrails=quotes(extract(mp,/const MP_TRAIL_IDS\s*=\s*new Set\(\[([\s\S]*?)\]\)/,'multiplayer trail list'));
const skinsBlock=extract(solo,/const SKINS\s*=\s*\[([\s\S]*?)\];\s*const SHOP_MAPS/,'skins');
const skinCount=[...skinsBlock.matchAll(/\bname:\s*'/g)].length;

const roomValidator=rules.multiplayerRooms.$code.meta['.validate'];
const trailValidator=rules.multiplayerRounds.$code.$round.cosmetics.$uid.trail['.validate'];
const skinValidator=rules.multiplayerRooms.$code.slots.$seat.skin['.validate'];
const mapPattern=extract(roomValidator,/newData\.child\('map'\)\.val\(\)\.matches\(\/\^\(([^)]*)\)\$\/\)/,'RTDB room map allowlist').split('|');
const trailPattern=extract(trailValidator,/matches\(\/\^\(([^)]*)\)\$\/\)/,'RTDB round trail allowlist').split('|');
const skinMax=Number(extract(skinValidator,/newData\.val\(\)\s*<=\s*(\d+)/,'RTDB skin max'));

function compare(a,b,label){
 const missing=a.filter(x=>!b.includes(x)),extra=b.filter(x=>!a.includes(x));
 console.log(`${label}: ${a.length} expected; ${b.length} actual; missing [${missing.join(', ')}]; extra [${extra.join(', ')}]`);
 assert.deepEqual(missing,[],`${label}: missing IDs`);
 assert.deepEqual(extra,[],`${label}: unexpected IDs`);
}
compare(soloMaps,mpMaps,'Maps: solo vs multiplayer');
compare(soloMaps,mapPattern,'Maps: solo vs RTDB rules');
compare(shopTrails,mpTrails,'Trails: shop vs multiplayer');
compare(shopTrails,trailPattern,'Trails: shop vs RTDB rules');
assert.ok(skinCount>0 && skinCount-1<=skinMax,`Skin index ${skinCount-1} exceeds RTDB limit ${skinMax}`);
assert.ok(!mapPattern.includes('INVALID_MAP')&&!trailPattern.includes('INVALID_TRAIL'));
console.log(`PASS: ${soloMaps.length} maps, ${shopTrails.length} trails, ${skinCount} skins (0..${skinCount-1}); RTDB skin max ${skinMax}`);

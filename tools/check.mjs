import { readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scripts = ['src/ui/map-art.js','src/config/runtime.js','src/game/solo.js','src/ui/account-localization.js','src/ui/viewport.js','src/multiplayer/experience.js','src/multiplayer/stats.js','src/firebase/account-cloud.js','src/firebase/friends.js','src/firebase/leaderboards.js','src/firebase/mp-stats.js','src/firebase/lastbird.js','src/multiplayer/netcode.js','src/multiplayer/multiplayer.js'];
let failed = 0;
for(const script of scripts){
  const check=spawnSync(process.execPath,['--check',path.join(root,script)],{encoding:'utf8'});
  if(check.status){ console.error(`FAIL ${script}\n${check.stderr}`);failed++; }
  else console.log(`OK   ${script}`);
}
const html=await readFile(path.join(root,'index.html'),'utf8');
for(const src of [...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)].map(m=>m[1])){
  if(/^(?:https?:|data:|#)/.test(src)) continue;
  try {await stat(path.join(root,src));} catch { console.error(`Missing asset: ${src}`);failed++; }
}
process.exitCode=failed?1:0;

// Server-side sanity/economy checks; NOT replay-based proof of a legitimate flight.
// Existing cloud balances are the migration baseline. Never trust imported local balances.
export const prices={
  owned:{4:200,5:200,6:200,7:200,8:200,9:200,10:200,11:200,12:200,13:200,14:250,15:200,16:275,17:300,18:225,19:275,20:325,21:275,22:600,23:350,24:350,25:350,26:350,27:350,28:350},
  maps:{SAKURA:250,NEON:300,OCEAN:275,VOLCANO_PLUS:300,COSMIC:300,FOREST:325,CRYSTAL:350,DESERT:300,CELESTIAL:450,CYBERPUNK:500,MYSTIC:550,SHATTERED:650,TEMPEST:700,ECLIPSE_REALM:775,PRISM:825,CLOCKWORK:875,AURORA:950,NECROPOLIS:1100},
  trails:{FIRE:150,WATER:150,LIGHTNING:200,RAINBOW:250,NATURE:175,GOLDEN:300,FROST:200,STARDUST:225,SHADOW:225,AURORA:300,HEART:250,RIFT:400,ARCANE:425,CHRONO:450,ORIGAMI:375,MOTH:425,PRISM:475,GLITCH:450,CONSTELLATION:550,INKFLOW:350,BUBBLE:375,SONIC:450,PHOENIX:500,LUNAR:575,OMEN:650},
};
const modes=['EASY','NORMAL','HARD','EXTREME'];
const int=(n,max=100000000)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const fail=reason=>({ok:false,reason});
export function validateProgress(before,payload,guard,now){
 if(!payload||typeof payload!=='object'||JSON.stringify(payload).length>20000)return fail('size');
 const {save:s,wallet:w,cfg}=payload;
 if(!s||!w||!cfg||Array.isArray(cfg)||typeof cfg!=='object')return fail('shape');
 for(const key of ['games','pipes','flaps','earnedCoins'])if(!int(s[key]))return fail(key);
 if(!s.best||modes.some(m=>!int(s.best[m])))return fail('best');
 if(!s.ach||Object.keys(s.ach).length>20||Object.values(s.ach).some(x=>x!==1&&x!==true))return fail('achievements');
 if(!int(w.coins))return fail('coins');
 for(const key of Object.keys(prices))if(!Array.isArray(w[key])||w[key].length>32||new Set(w[key]).size!==w[key].length||w[key].some(x=>!Object.hasOwn(prices[key],x)))return fail('inventory');
 const old=before||{save:{games:0,pipes:0,flaps:0,earnedCoins:0,best:{}},wallet:{coins:0,owned:[],maps:[],trails:[]}};
 const a=old.save,b=old.wallet;
 const reset=s.games===0&&s.pipes===0&&s.flaps===0&&s.earnedCoins===0&&modes.every(m=>s.best[m]===0)&&Object.keys(s.ach).length===0&&w.coins===0&&Object.keys(prices).every(k=>!w[k].length);
 // Credits refill with server wall time, not with each request. No repeated free allowance.
 const elapsed=Math.min(86400000,Math.max(0,now-(guard?.at??before?.updatedAt?.toMillis?.()??now)));
 const credits=Math.min(20000,(guard?.credits??10)+elapsed*.005);
 const earned=s.earnedCoins-(a.earnedCoins||0),pipes=s.pipes-(a.pipes||0),games=s.games-(a.games||0),flaps=s.flaps-(a.flaps||0);
 if(reset)return {ok:true,guard:{at:now,credits}};
 if(earned<0||pipes<0||games<0||flaps<0||earned>credits||pipes>credits||games>credits||flaps>credits*20)return fail('rate');
 if(earned>pipes+games+1)return fail('earned');
 for(const m of modes)if(s.best[m]<(a.best?.[m]||0)||s.best[m]>Math.max(a.best?.[m]||0,s.pipes+1))return fail('best');
 let cost=0;
 for(const key of Object.keys(prices)){
  const prev=b[key]||[];
  if(prev.some(x=>!w[key].includes(x)))return fail('inventory-removal');
  for(const x of w[key])if(!prev.includes(x)){
   if(key==='trails'&&x==='STARDUST'&&w.owned.includes(22))continue;
   cost+=prices[key][x];
  }
 }
 if(w.coins!==(b.coins||0)+earned-cost)return fail('balance');
 if(w.owned.includes(22)&&!w.trails.includes('STARDUST'))return fail('bundle');
 if(!before&&(earned||pipes||games||flaps||w.coins||Object.keys(prices).some(k=>w[k].length)))return fail('local-import');
 return {ok:true,guard:{at:now,credits:credits-Math.max(earned,pipes,games,flaps/20)}};
}

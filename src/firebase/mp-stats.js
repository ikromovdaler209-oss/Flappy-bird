// Flying Bird v2.9 — multiplayer statistics: verified round queue, Firestore sync, account section.
// Solo records, coins and progress are never read or written here.
import {getApps,getApp,initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDocFromServer,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {emptyStats,normalizeStats,derive,verifyRound,applyRecord,formatDuration,MIN_RATING_MATCHES} from '../multiplayer/stats.js';

const fbConfig={apiKey:'AIzaSyBXhPjfPGPjD6SX6ISyd9UIGcwIGDir2IE',authDomain:'flying-bird-d6832.firebaseapp.com',projectId:'flying-bird-d6832',storageBucket:'flying-bird-d6832.firebasestorage.app',messagingSenderId:'824302202629',appId:'1:824302202629:web:885e30d34fb1ddaa56516c'};
const app=getApps().length?getApp():initializeApp(fbConfig);
export const auth=getAuth(app),db=getFirestore(app);
export const MIN_MATCHES=MIN_RATING_MATCHES;

const DICT={
 EN:{title:'ONLINE MATCHES',matches:'Matches',wins:'Wins',winRate:'Win rate',avg:'Avg survival',best:'Best survival',none:'No online matches yet.',
  note:'Only verified rounds are counted. Solo records and coins are not affected.',signin:'Sign in to save online statistics.',
  syncing:'Verifying and saving…',saved:'✓ Verified and saved to your account',pending:'⏳ Saved on this device — will sync when online',rejected:'✖ Not counted',
  line:'ONLINE: {m} matches · {w} wins · {r}% · avg {a} · best {b}',
  incomplete:'the round is not finished for every player',consistency:'time and ticks do not match',roster:'player list is invalid',startAt:'start time is missing',values:'result values are out of range',survivors:'more than one winner',duplicate:'already counted',order:'older than your last counted round',record:'invalid record',rules:'cloud rules refused the record',path:'unknown round',snapshot:'round data is missing',signinReason:'not signed in',
  lbsOpen:'🐦 LAST BIRD RANKING',lbsTitle:'🐦 LAST BIRD STANDING',lbsIntro:'Ranking of verified online wins.',friends:'FRIENDS',global:'GLOBAL',refresh:'↻ Refresh',join:'Join',leave:'Leave',joinLabel:'GLOBAL RANKING',
  joinHint:'Your public nickname, avatar and online totals become visible to signed-in players.',joined:'You are listed in the global ranking.',needPublic:'Set Profile → Privacy to PUBLIC to join.',needMatches:'Play at least {n} verified matches to join (you have {m}).',
  empty:'Nobody is ranked yet.',loading:'Loading ranking…',error:'Unable to load ranking',signedOut:'Sign in to view the ranking.',me:'YOU',profile:'Profile',count:'players shown',
  fairness:'Wins are checked against the match record and re-checked by cloud rules. This is not full server-side anti-cheat.',joinDone:'You joined the global ranking.',leaveDone:'Removed from the global ranking.',retry:'Sync failed. Check your connection and retry.',waiting:'Saving…',colHint:'Wins · matches · win rate · best time'},
 RU:{title:'ОНЛАЙН-МАТЧИ',matches:'Матчей',wins:'Побед',winRate:'Win rate',avg:'Среднее время',best:'Лучшее время',none:'Онлайн-матчей пока нет.',
  note:'Учитываются только проверенные раунды. Одиночные рекорды и монеты не затрагиваются.',signin:'Войдите в аккаунт, чтобы сохранять онлайн-статистику.',
  syncing:'Проверяем и сохраняем…',saved:'✓ Проверено и сохранено в аккаунте',pending:'⏳ Сохранено на устройстве — синхронизируется при подключении',rejected:'✖ Не засчитано',
  line:'ОНЛАЙН: {m} матчей · {w} побед · {r}% · среднее {a} · лучшее {b}',
  incomplete:'раунд не завершён у всех игроков',consistency:'время и тики не совпадают',roster:'неверный список игроков',startAt:'нет времени старта',values:'значения вне допустимых пределов',survivors:'больше одного победителя',duplicate:'уже засчитано',order:'старше последнего засчитанного раунда',record:'неверная запись',rules:'облачные правила отклонили запись',path:'неизвестный раунд',snapshot:'нет данных раунда',signinReason:'нет входа в аккаунт',
  lbsOpen:'🐦 РЕЙТИНГ LAST BIRD',lbsTitle:'🐦 LAST BIRD STANDING',lbsIntro:'Рейтинг проверенных онлайн-побед.',friends:'ДРУЗЬЯ',global:'МИР',refresh:'↻ Обновить',join:'Участвовать',leave:'Покинуть',joinLabel:'МИРОВОЙ РЕЙТИНГ',
  joinHint:'Ваш ник, аватар и онлайн-итоги станут видны вошедшим игрокам.',joined:'Вы участвуете в мировом рейтинге.',needPublic:'Для участия: Профиль → Приватность → «Публичный».',needMatches:'Для участия нужно минимум {n} проверенных матчей (сейчас {m}).',
  empty:'В рейтинге пока никого нет.',loading:'Загружаем рейтинг…',error:'Не удалось загрузить рейтинг',signedOut:'Войдите, чтобы смотреть рейтинг.',me:'ВЫ',profile:'Профиль',count:'игроков показано',
  fairness:'Победы сверяются с записью матча и перепроверяются правилами облака. Это не полноценная серверная защита от читов.',joinDone:'Вы вступили в мировой рейтинг.',leaveDone:'Вы удалены из мирового рейтинга.',retry:'Не удалось синхронизировать. Проверьте соединение.',waiting:'Сохраняем…',colHint:'Победы · матчи · win rate · лучшее время'},
 ZH:{title:'在线对战',matches:'场次',wins:'胜场',winRate:'胜率',avg:'平均生存',best:'最佳生存',none:'暂无在线对战记录。',
  note:'仅统计已验证的回合，单人纪录与金币不受影响。',signin:'登录后才能保存在线统计。',
  syncing:'正在验证并保存…',saved:'✓ 已验证并保存到账号',pending:'⏳ 已保存在本机，联网后同步',rejected:'✖ 未计入',
  line:'在线：{m} 场 · {w} 胜 · {r}% · 平均 {a} · 最佳 {b}',
  incomplete:'并非所有玩家都已结束回合',consistency:'时间与帧数不一致',roster:'玩家列表无效',startAt:'缺少开始时间',values:'数值超出范围',survivors:'出现多个胜者',duplicate:'已计入',order:'早于上次计入的回合',record:'记录无效',rules:'云端规则拒绝了记录',path:'未知回合',snapshot:'缺少回合数据',signinReason:'未登录',
  lbsOpen:'🐦 LAST BIRD 排行',lbsTitle:'🐦 LAST BIRD STANDING',lbsIntro:'已验证在线胜场排行榜。',friends:'好友',global:'全球',refresh:'↻ 刷新',join:'参加',leave:'退出',joinLabel:'全球排行',
  joinHint:'你的昵称、头像和在线统计将对已登录玩家可见。',joined:'你已加入全球排行。',needPublic:'请先在个人资料 → 隐私中设为公开。',needMatches:'需要至少 {n} 场已验证对战（当前 {m} 场）。',
  empty:'暂无排名。',loading:'正在加载…',error:'无法加载排行',signedOut:'请登录后查看排行。',me:'你',profile:'资料',count:'位玩家',
  fairness:'胜场已与对战记录核对，并由云端规则再次检查，但这不是完整的服务器端反作弊。',joinDone:'已加入全球排行。',leaveDone:'已退出全球排行。',retry:'同步失败，请检查网络。',waiting:'正在保存…',colHint:'胜场 · 场次 · 胜率 · 最佳时间'},
 ES:{title:'PARTIDAS ONLINE',matches:'Partidas',wins:'Victorias',winRate:'% victorias',avg:'Supervivencia media',best:'Mejor supervivencia',none:'Aún no hay partidas online.',
  note:'Solo cuentan las rondas verificadas. Los récords en solitario y las monedas no cambian.',signin:'Inicia sesión para guardar estadísticas online.',
  syncing:'Verificando y guardando…',saved:'✓ Verificado y guardado en tu cuenta',pending:'⏳ Guardado en este dispositivo; se sincronizará con conexión',rejected:'✖ No contabilizado',
  line:'ONLINE: {m} partidas · {w} victorias · {r}% · media {a} · mejor {b}',
  incomplete:'la ronda no ha terminado para todos',consistency:'tiempo y ticks no coinciden',roster:'lista de jugadores no válida',startAt:'falta la hora de inicio',values:'valores fuera de rango',survivors:'más de un ganador',duplicate:'ya contabilizado',order:'anterior a tu última ronda contabilizada',record:'registro no válido',rules:'las reglas de la nube rechazaron el registro',path:'ronda desconocida',snapshot:'faltan datos de la ronda',signinReason:'sin sesión',
  lbsOpen:'🐦 RANKING LAST BIRD',lbsTitle:'🐦 LAST BIRD STANDING',lbsIntro:'Clasificación de victorias online verificadas.',friends:'AMIGOS',global:'GLOBAL',refresh:'↻ Actualizar',join:'Unirse',leave:'Salir',joinLabel:'RANKING GLOBAL',
  joinHint:'Tu nick, avatar y totales online serán visibles para jugadores con sesión.',joined:'Apareces en el ranking global.',needPublic:'Pon Perfil → Privacidad en Público para unirte.',needMatches:'Juega al menos {n} partidas verificadas (llevas {m}).',
  empty:'Aún no hay nadie clasificado.',loading:'Cargando ranking…',error:'No se pudo cargar el ranking',signedOut:'Inicia sesión para ver el ranking.',me:'TÚ',profile:'Perfil',count:'jugadores',
  fairness:'Las victorias se comparan con el registro de la partida y se revisan con reglas en la nube. No es antitrampas completo en servidor.',joinDone:'Te uniste al ranking global.',leaveDone:'Saliste del ranking global.',retry:'Error de sincronización. Revisa la conexión.',waiting:'Guardando…',colHint:'Victorias · partidas · % victorias · mejor tiempo'},
 PT:{title:'PARTIDAS ONLINE',matches:'Partidas',wins:'Vitórias',winRate:'Taxa de vitória',avg:'Sobrevivência média',best:'Melhor sobrevivência',none:'Ainda não há partidas online.',
  note:'Só rodadas verificadas contam. Recordes solo e moedas não mudam.',signin:'Entre na conta para salvar estatísticas online.',
  syncing:'Verificando e salvando…',saved:'✓ Verificado e salvo na sua conta',pending:'⏳ Salvo neste dispositivo; sincroniza quando houver conexão',rejected:'✖ Não contabilizado',
  line:'ONLINE: {m} partidas · {w} vitórias · {r}% · média {a} · melhor {b}',
  incomplete:'a rodada não terminou para todos',consistency:'tempo e ticks não coincidem',roster:'lista de jogadores inválida',startAt:'falta o horário de início',values:'valores fora do limite',survivors:'mais de um vencedor',duplicate:'já contabilizado',order:'anterior à sua última rodada contabilizada',record:'registro inválido',rules:'as regras da nuvem recusaram o registro',path:'rodada desconhecida',snapshot:'faltam dados da rodada',signinReason:'sem login',
  lbsOpen:'🐦 RANKING LAST BIRD',lbsTitle:'🐦 LAST BIRD STANDING',lbsIntro:'Ranking de vitórias online verificadas.',friends:'AMIGOS',global:'GLOBAL',refresh:'↻ Atualizar',join:'Participar',leave:'Sair',joinLabel:'RANKING GLOBAL',
  joinHint:'Seu nick, avatar e totais online ficam visíveis para jogadores logados.',joined:'Você está no ranking global.',needPublic:'Mude Perfil → Privacidade para Público para participar.',needMatches:'Jogue ao menos {n} partidas verificadas (você tem {m}).',
  empty:'Ninguém no ranking ainda.',loading:'Carregando ranking…',error:'Não foi possível carregar o ranking',signedOut:'Entre na conta para ver o ranking.',me:'VOCÊ',profile:'Perfil',count:'jogadores',
  fairness:'As vitórias são conferidas com o registro da partida e revistas pelas regras da nuvem. Não é antitrapaça completo no servidor.',joinDone:'Você entrou no ranking global.',leaveDone:'Você saiu do ranking global.',retry:'Falha ao sincronizar. Verifique a conexão.',waiting:'Salvando…',colHint:'Vitórias · partidas · taxa · melhor tempo'}
};
export const lang=()=>{try{const l=JSON.parse(localStorage.getItem('flyingBirdCfg')||'{}').lang;return DICT[l]?l:'EN'}catch{return 'EN'}};
export const T=(key,vars)=>{let s=(DICT[lang()]||DICT.EN)[key]||DICT.EN[key]||key;if(vars)for(const [k,v] of Object.entries(vars))s=s.replace('{'+k+'}',v);return s};
export const myUid=()=>auth.currentUser&&!auth.currentUser.isAnonymous?auth.currentUser.uid:null;
export const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=String(text);if(cls)n.className=cls;return n};
export function avatar(data){const cv=document.createElement('canvas');cv.width=cv.height=32;cv.className='lbAvatar';cv.setAttribute('aria-label','Bird avatar');const c=cv.getContext('2d');if(!c)return cv;const bg=window.flyingBirdFriendAvatarBackgrounds||['#ff6b9d','#ffd23f','#4cd964','#4da3ff','#b9a0ff','#ff7b2e','#2ec4b6','#e8e8f5'];const p=window.flyingBirdFriendSkinPalette||[];const a=data?.avatar||{},b=bg[Math.abs(Number(a.bg)||0)%bg.length],s=p[Math.max(0,Math.floor(Number(a.skin)||0))]||p[0]||{body:'#ffd23f',hi:'#ffe98a',wing:'#ff9f1c',belly:'#fff4d6'};c.fillStyle=b;c.fillRect(0,0,32,32);c.fillStyle='rgba(255,255,255,.18)';c.fillRect(0,0,32,9);c.fillStyle='#2b1b00';c.fillRect(6,8,21,18);c.fillStyle=s.body;c.fillRect(7,9,19,16);c.fillRect(10,6,13,4);c.fillStyle=s.hi;c.fillRect(11,7,10,3);c.fillStyle=s.wing;c.fillRect(8,17,9,7);c.fillStyle=s.belly;c.fillRect(15,21,9,4);c.fillStyle='#fff';c.fillRect(19,11,6,6);c.fillStyle='#1a1033';c.fillRect(23,13,3,3);c.fillStyle='#ff9f1c';c.fillRect(26,18,5,3);return cv}

// ---- per-account local cache + queue (every UID has its own keys; guests never share data) ----
const statsKey=uid=>'flyingBirdMpStatsV2:'+uid,queueKey=uid=>'flyingBirdMpQueueV2:'+uid;
const readJson=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback}catch{return fallback}};
const writeJson=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
const readQueue=uid=>{const q=readJson(queueKey(uid),[]);return Array.isArray(q)?q:[]};
const writeQueue=(uid,q)=>writeJson(queueKey(uid),q);
let cached=emptyStats(),cachedUid=null,verdict={state:'idle',reason:''};
const listeners=new Set(),flushingUsers=new Set();
function notify(){for(const fn of listeners){try{fn(summary())}catch(e){console.warn('[MP stats] listener failed',e)}}}
export function onChange(fn){listeners.add(fn);return()=>listeners.delete(fn)}
export function summary(){const uid=myUid();return {uid,totals:cached,derived:derive(cached),pending:uid?readQueue(uid).length:0,verdict}}
function adopt(uid,totals){cachedUid=uid;cached=normalizeStats(totals);writeJson(statsKey(uid),{stats:cached})}

/** Called when a round has ended. Verifies it, queues it, then syncs. Never throws. */
export function submitRound({path,snapshot}){
  const uid=myUid();
  if(!uid){verdict={state:'rejected',reason:'signinReason'};notify();return {ok:false,reason:'signinReason'}}
  const v=verifyRound({path,snapshot,uid});
  if(!v.ok){verdict={state:'rejected',reason:v.reason};notify();return v}
  const queue=readQueue(uid);
  if(v.record.id!==cached.lastRound&&!queue.some(x=>x.id===v.record.id)){queue.push(v.record);writeQueue(uid,queue)}
  verdict={state:'syncing',reason:''};notify();void flush(uid);
  return v;
}

async function commit(uid,rec){
  const statsRef=doc(db,'multiplayerStats',uid),roundRef=doc(db,'multiplayerStats',uid,'rounds',rec.id);
  try{
    const out=await runTransaction(db,async tx=>{
      const [s,r]=await Promise.all([tx.get(statsRef),tx.get(roundRef)]);
      const current=s.exists()?normalizeStats(s.data()):emptyStats();
      if(r.exists())return {kind:'duplicate',stats:current};
      const applied=applyRecord(current,rec);
      if(!applied.ok)return {kind:'local',reason:applied.reason,stats:current};
      const {id,...fields}=rec;
      tx.set(roundRef,{...fields,createdAt:serverTimestamp()});
      tx.set(statsRef,{...applied.stats,updatedAt:serverTimestamp()});
      return {kind:'ok',stats:applied.stats};
    });
    return out;
  }catch(e){
    const code=e?.code||'';
    if(code==='permission-denied')return {kind:'rules'};
    return {kind:'retry',error:code||String(e?.message||e)};
  }
}

async function flush(uid){
  if(flushingUsers.has(uid))return;flushingUsers.add(uid);
  try{
    while(myUid()===uid){
      // Re-read after every await: a second finished round may have been queued meanwhile.
      const queue=readQueue(uid).sort((a,b)=>a.startAt-b.startAt);
      if(!queue.length)break;
      const rec=queue[0],out=await commit(uid,rec);
      if(out.kind==='retry'||out.kind==='rules'){
        // Rules may not have been deployed yet. Preserve the record for a later retry.
        if(myUid()===uid)verdict={state:'pending',reason:out.kind==='rules'?'rules':''};
        break;
      }
      writeQueue(uid,readQueue(uid).filter(x=>x.id!==rec.id));
      if(myUid()!==uid)break;
      if(out.stats)adopt(uid,out.stats);
      const counted=out.kind==='ok'||out.kind==='duplicate'||(out.kind==='local'&&out.reason==='duplicate');
      verdict=counted?{state:'saved',reason:''}:{state:'rejected',reason:out.reason};
    }
    if(myUid()===uid&&!readQueue(uid).length&&verdict.state==='syncing')verdict={state:'saved',reason:''};
  }finally{flushingUsers.delete(uid);if(myUid()===uid)notify()}
}

export async function loadCloud(uid=myUid()){
  if(!uid)return null;
  try{
    const snap=await getDocFromServer(doc(db,'multiplayerStats',uid));
    if(myUid()!==uid)return null;
    if(snap.exists()){
      const server=normalizeStats(snap.data());
      // A queued record may not have reached the cloud yet: never show totals below the local cache.
      if(server.matches>=cached.matches||cachedUid!==uid)adopt(uid,server);
    }
    notify();return cached;
  }catch(e){if(e?.code!=='permission-denied')console.warn('[MP stats] cloud read failed',e?.code||e);return null}
}

export function resultLine(){
  const s=summary(),d=s.derived,v=s.verdict;
  const totals=T('line',{m:d.matches,w:d.wins,r:d.winRate,a:formatDuration(d.avgMs),b:formatDuration(d.bestMs)});
  const state=v.state==='saved'?T('saved'):v.state==='syncing'?T('syncing'):v.state==='pending'?T('pending'):v.state==='rejected'?T('rejected')+(v.reason?': '+T(v.reason):''):'';
  return {text:totals+(state?'\n'+state:''),error:v.state==='rejected'};
}

/** Labelled values for account panel / player profile. `data` is a multiplayerStats document. */
export function statFields(data){
  const d=derive(data);
  return [[T('matches'),d.matches],[T('wins'),d.wins],[T('winRate'),d.winRate+'%'],[T('avg'),d.matches?formatDuration(d.avgMs):'—'],[T('best'),d.matches?formatDuration(d.bestMs):'—']];
}
window.flyingBirdMpStats={
  statFields,title:()=>T('title'),none:()=>T('none'),
  // Always resolve the active identity; never expose the previous account's cache.
  ownFields:()=>myUid()?statFields(cachedUid===myUid()?cached:emptyStats()):[],
  selfNote:()=>T(myUid()?'none':'signin'),
  refreshSelf:()=>{const uid=myUid();if(uid)void loadCloud(uid).catch(()=>{});}
};

// ---- account "player stats" panel section ----
function renderAccountSection(){
  const grid=document.getElementById('mpStatsGrid');if(!grid)return;
  document.getElementById('mpStatsTitle').textContent=T('title');
  document.getElementById('mpStatsNote').textContent=myUid()?T('note'):T('signin');
  grid.replaceChildren();
  if(!myUid())return;
  const s=summary();
  if(!s.derived.matches){grid.append(el('p',T('none'),'mpStatsNone'));return}
  for(const [label,value] of statFields(s.totals)){const item=el('div',null,'fbStat');item.append(el('strong',value),el('small',label));grid.append(item)}
}
document.getElementById('accountStats')?.addEventListener('click',()=>{renderAccountSection();const uid=myUid();if(uid)void flush(uid).then(()=>loadCloud(uid)).then(renderAccountSection)});
onChange(()=>{const p=document.getElementById('statsPanel');if(p&&!p.hidden)renderAccountSection()});

onAuthStateChanged(auth,user=>{
  const uid=user&&!user.isAnonymous?user.uid:null;
  cachedUid=null;cached=emptyStats();verdict={state:'idle',reason:''};
  if(uid){const local=readJson(statsKey(uid),null);if(local?.stats)adopt(uid,local.stats);void flush(uid).then(()=>loadCloud(uid))}
  notify();
});
window.addEventListener('online',()=>{const uid=myUid();if(uid)void flush(uid)});

window.addEventListener('visibilitychange',()=>{const uid=myUid();if(!document.hidden&&uid)void flush(uid)});

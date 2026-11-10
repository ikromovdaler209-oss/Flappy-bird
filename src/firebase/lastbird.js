// High Fly v2.9 — "Last Bird Standing" ranking panel (friends + opt-in global).
// Reads multiplayerStats (privacy enforced by rules) and lastBirdEntries (public opt-in).
import {collection,doc,query,where,limit,orderBy,getDocsFromServer,getDocFromServer,setDoc,deleteDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {auth,db,T,myUid,el,avatar,loadCloud,onChange,summary,MIN_MATCHES} from './mp-stats.js';
import {derive,compareRating,formatDuration,normalizeStats} from '../multiplayer/stats.js';

const $=id=>document.getElementById(id),panel=$('fbLbsPanel');
let scope='friends',rows=[],joined=false,joining=false,loading=false,seq=0,initFor=null,syncTimer=null,status='',statusError=false,lastSig='';
const vis=uid=>{try{return JSON.parse(localStorage.getItem('flyingBirdPrivacyV1:'+uid)||'null')?.value}catch{return null}};
const isPublic=()=>{const uid=myUid();return !!uid&&vis(uid)==='public'};
const entryRef=uid=>doc(db,'lastBirdEntries',uid);
const setStatus=(m,e=false)=>{status=m||'';statusError=e;const n=$('fbLbsStatus');n.textContent=status;n.classList.toggle('error',e)};

function labels(){
  $('fbLbsOpen')&&($('fbLbsOpen').textContent=T('lbsOpen'));
  $('fbLbsTitle').textContent=T('lbsTitle');$('fbLbsIntro').textContent=T('lbsIntro')+' '+T('colHint');
  $('fbLbsRefresh').textContent=T('refresh');$('fbLbsJoinLabel').textContent=T('joinLabel');$('fbLbsFairness').textContent=T('fairness');
  for(const b of panel.querySelectorAll('[data-lbs-scope]')){b.textContent=T(b.dataset.lbsScope);b.setAttribute('aria-pressed',String(b.dataset.lbsScope===scope))}
  renderJoin();
}
function renderJoin(){
  const uid=myUid(),box=$('fbLbsJoinBox');box.hidden=scope!=='global'||!uid;
  const m=summary().derived.matches,btn=$('fbLbsJoin');
  btn.textContent=joined?T('leave'):T('join');
  btn.disabled=joining||(!joined&&(!isPublic()||m<MIN_MATCHES));
  $('fbLbsJoinHint').textContent=joined?T('joined'):!isPublic()?T('needPublic'):m<MIN_MATCHES?T('needMatches',{n:MIN_MATCHES,m}):T('joinHint');
}
function renderList(){
  const target=$('fbLbsList');target.replaceChildren();
  if(!myUid()){target.append(el('p',T('signedOut'),'lbHint'));$('fbLbsCount').textContent='';return}
  if(loading){target.append(el('p',T('loading'),'lbHint'));return}
  if(!rows.length){target.append(el('p',T('empty'),'lbHint'));$('fbLbsCount').textContent='';return}
  const sorted=[...rows].sort(compareRating);
  for(const [i,r] of sorted.entries()){
    const d=derive(r),item=el('div',null,'lbEntry'+(r.uid===myUid()?' lbMe':''));
    item.append(el('span',i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1),'lbRank'),avatar(r));
    const name=el('div',null,'lbName');
    name.append(el('strong',String(r.nick||'BIRD')+(r.uid===myUid()?' · '+T('me'):'')),el('small',d.matches+' · '+d.winRate+'% · '+formatDuration(d.bestMs)));
    item.append(name,el('strong',d.wins.toLocaleString(),'lbPoints'));
    if(r.uid!==myUid()){const b=el('button',T('profile'),'lbProfile');b.type='button';b.addEventListener('click',()=>{close();window.flyingBirdOpenRankedProfile?.(r.uid)});item.append(b)}
    target.append(item);
  }
  $('fbLbsCount').textContent=sorted.length+' '+T('count');
}

async function friendIds(uid){
  const requests=collection(db,'friendRequests');
  const [inS,outS,blocksSnap]=await Promise.all([getDocsFromServer(query(requests,where('toUid','==',uid),limit(50))),getDocsFromServer(query(requests,where('fromUid','==',uid),limit(50))),getDocsFromServer(query(collection(db,'blocks',uid,'users'),limit(100)))]);
  const blocked=new Set(blocksSnap.docs.map(s=>s.id)),ids=new Set([uid]);
  for(const s of [...inS.docs,...outS.docs]){const d=s.data(),other=d.fromUid===uid?d.toUid:d.toUid===uid?d.fromUid:null;if(d.status==='accepted'&&other&&!blocked.has(other))ids.add(other)}
  return [...ids];
}
async function refresh(){
  const uid=myUid(),ticket=++seq;loading=true;rows=[];renderList();
  if(!uid){loading=false;renderList();return}
  try{
    let next=[];
    if(scope==='friends'){
      await loadCloud(uid);
      const ids=await friendIds(uid);
      const found=await Promise.all(ids.map(async id=>{
        try{
          const card=await getDocFromServer(doc(db,'publicProfiles',id));
          if(!card.exists())return null;
          const c=card.data();if(id!==uid&&c.visibility==='hidden')return null;
          const st=await getDocFromServer(doc(db,'multiplayerStats',id));
          if(!st.exists())return null;
          return {uid:id,nick:c.nick,playerId:c.playerId,avatar:c.avatar,...normalizeStats(st.data())};
        }catch(e){if(e?.code!=='permission-denied')console.warn('[LBS] friend unavailable',id,e?.code||e);return null}
      }));
      next=found.filter(Boolean);
    }else{
      const list=await getDocsFromServer(query(collection(db,'lastBirdEntries'),orderBy('wins','desc'),limit(50)));
      next=list.docs.map(s=>({uid:s.id,...s.data()}));
    }
    if(ticket!==seq||uid!==myUid())return;
    rows=next;setStatus('');
  }catch(e){if(ticket!==seq)return;setStatus(T('error')+' ('+(e?.code||e?.message||e)+')',true);rows=[]}
  finally{if(ticket===seq){loading=false;renderList();renderJoin()}}
}

async function payload(uid){
  const [card,st]=await Promise.all([getDocFromServer(doc(db,'publicProfiles',uid)),getDocFromServer(doc(db,'multiplayerStats',uid))]);
  if(!card.exists()||!st.exists())throw Error(T('retry'));
  const c=card.data(),s=normalizeStats(st.data());
  if(c.visibility!=='public')throw Error(T('needPublic'));
  if(s.matches<MIN_MATCHES)throw Error(T('needMatches',{n:MIN_MATCHES,m:s.matches}));
  return {playerId:c.playerId,nick:c.nick,avatar:c.avatar,matches:s.matches,wins:s.wins,totalMs:s.totalMs,bestMs:s.bestMs};
}
async function publish(uid,force=false){
  if(!joined||initFor!==uid||myUid()!==uid)return;
  try{
    const data=await payload(uid),sig=JSON.stringify(data);
    if(!force&&sig===lastSig)return;
    await setDoc(entryRef(uid),{...data,updatedAt:serverTimestamp()});
    lastSig=sig;if(!panel.hidden&&scope==='global')void refresh();
  }catch(e){if(myUid()===uid&&!panel.hidden)setStatus(T('retry')+' ('+(e?.code||e?.message||e)+')',true)}
}
function schedulePublish(ms=2500){const uid=myUid();if(!uid||!joined||initFor!==uid)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>void publish(uid),ms)}
async function initJoin(uid){
  initFor=null;joined=false;lastSig='';clearTimeout(syncTimer);renderJoin();if(!uid)return;
  try{const s=await getDocFromServer(entryRef(uid));if(myUid()!==uid)return;joined=s.exists();initFor=uid;if(joined){const d=s.data();lastSig=JSON.stringify({playerId:d.playerId,nick:d.nick,avatar:d.avatar,matches:d.matches,wins:d.wins,totalMs:d.totalMs,bestMs:d.bestMs})}}
  catch(e){if(!panel.hidden)setStatus(T('error')+' ('+(e?.code||e?.message||e)+')',true)}
  finally{renderJoin()}
}

function open(){panel.hidden=false;scope='friends';labels();renderList();setStatus('');void refresh()}
function close(){panel.hidden=true;++seq;loading=false}
$('fbLbsOpen')?.addEventListener('click',()=>{window.flyingBirdCloseLeaderboard?.();open()});
$('fbLbsClose').addEventListener('click',close);
panel.addEventListener('click',e=>{if(e.target===panel)close()});
panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}});
document.addEventListener('keydown',e=>{if(!panel.hidden){e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();close()}}},true);
for(const b of panel.querySelectorAll('[data-lbs-scope]'))b.addEventListener('click',()=>{scope=b.dataset.lbsScope;labels();void refresh()});
$('fbLbsRefresh').addEventListener('click',()=>void refresh());
$('fbLbsJoin').addEventListener('click',async()=>{
  const uid=myUid();if(!uid||joining)return;joining=true;renderJoin();setStatus(T('waiting'));
  try{
    if(joined){await deleteDoc(entryRef(uid));joined=false;lastSig='';setStatus(T('leaveDone'))}
    else{const data=await payload(uid);await setDoc(entryRef(uid),{...data,updatedAt:serverTimestamp()});joined=true;initFor=uid;lastSig=JSON.stringify(data);setStatus(T('joinDone'))}
    if(scope==='global')await refresh();
  }catch(e){setStatus((e?.message||T('retry'))+(e?.code?' ('+e.code+')':''),true)}
  finally{joining=false;renderJoin()}
});
// Keep an existing global entry in step with verified totals, and drop it when the profile stops being public.
onChange(()=>{if(!panel.hidden)renderJoin();schedulePublish(2500)});
window.addEventListener('flyingbird:privacy-changing',e=>{const uid=myUid();if(e.detail?.uid!==uid||e.detail.visibility==='public')return;clearTimeout(syncTimer);if(joined)void deleteDoc(entryRef(uid)).then(()=>{joined=false;lastSig='';renderJoin()}).catch(()=>{})});
$('fbLbShortcut')?.addEventListener('click',labels);window.addEventListener('flyingbird:progress-changed',labels);
onAuthStateChanged(auth,user=>{void initJoin(user&&!user.isAnonymous?user.uid:null);if(!panel.hidden){labels();void refresh()}});
labels();

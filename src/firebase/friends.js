// Flying Bird Friends: separate additive module. Uses the SAME Firebase Auth instance as the game.
import {getApps,getApp,initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,collection,query,where,limit,getDocFromServer,getDocsFromServer,setDoc,updateDoc,deleteDoc,serverTimestamp,writeBatch} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {getDatabase,ref,onValue,onDisconnect,serverTimestamp as rtdbTimestamp,push,set,remove,update,get as getRTDB} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';
const fbConfig={apiKey:'AIzaSyBXhPjfPGPjD6SX6ISyd9UIGcwIGDir2IE',authDomain:'flying-bird-d6832.firebaseapp.com',projectId:'flying-bird-d6832',storageBucket:'flying-bird-d6832.firebasestorage.app',messagingSenderId:'824302202629',appId:'1:824302202629:web:885e30d34fb1ddaa56516c',measurementId:'G-SQPGSFFX1R'};
const app=getApps().length?getApp():initializeApp(fbConfig),auth=getAuth(app),db=getFirestore(app);
const $=id=>document.getElementById(id), modal=$('fbfPanel');
const STR={
EN:{title:'FRIENDS',intro:'Find players, manage friendships and see who is online',refresh:'↻ Refresh',publish:'Update my card',friends:'Friends',requests:'Requests',blocked:'Blocked',searchTitle:'Find by Player ID',search:'Search',myFriends:'My friends',incoming:'Incoming requests',outgoing:'Outgoing requests',blockedTitle:'Blocked players',presenceSettings:'Online status settings',databaseHint:'Paste the exact Realtime Database URL from Firebase Console → Realtime Database → Data.',connect:'Connect',emptyFriends:'No friends yet.',emptyRequests:'No requests.',emptyBlocked:'No blocked players.',login:'Sign in to your account to use Friends.',invalid:'Invalid Player ID.',notFound:'Player ID not found.',self:'This is your own ID.',send:'Add friend',cancel:'Cancel request',accept:'Accept',reject:'Reject',unfriend:'Remove friend',block:'Block',unblock:'Unblock',confirmUnfriend:'Remove this friend?',confirmBlock:'Block player and remove friendship?',confirmUnblock:'Unblock player?',yes:'Done.',searchResult:'Found player',noCard:'Player profile unavailable',pending:'Pending',accepted:'Friends',rejected:'Rejected',online:'Online',offline:'Offline',connecting:'Connecting…',unknown:'Status hidden',lastSeen:'Last seen',wait:'Loading…',error:'Firebase error',dbMissing:'Enter Realtime Database URL to enable Online/Offline.',dbReady:'Realtime Database connected.',dbBad:'Invalid Realtime Database URL for this project.',dbReload:'URL saved. Reload the game to reconnect.',permissions:'Status unavailable: check presence rules or friend access.',count:'friends',cardUpdated:'Public card updated.',idConflict:'Player ID is not linked to this account. Check playerIds.',truncated:'Some results may be hidden (50-item test limit).',signIn:'Sign in',cannotRefresh:'Could not load friends.',statusSharing:'Online status is shared with approved friends on this device.',blockChanged:'Block list updated.',requestChanged:'Request updated.'},
RU:{title:'ДРУЗЬЯ',intro:'Поиск игроков, заявки, друзья и онлайн-статусы',refresh:'↻ Обновить',publish:'Обновить карточку',friends:'Друзья',requests:'Заявки',blocked:'Блокировки',searchTitle:'Поиск по Player ID',search:'Найти',myFriends:'Мои друзья',incoming:'Входящие заявки',outgoing:'Исходящие заявки',blockedTitle:'Заблокированные игроки',presenceSettings:'Настройки статуса Online',databaseHint:'Вставь точный адрес Realtime Database из Firebase Console → Realtime Database → Data.',connect:'Подключить',emptyFriends:'Пока нет друзей.',emptyRequests:'Заявок пока нет.',emptyBlocked:'Нет заблокированных игроков.',login:'Войди в аккаунт для доступа к друзьям.',invalid:'Неверный Player ID.',notFound:'Player ID не найден.',self:'Это твой собственный ID.',send:'Добавить в друзья',cancel:'Отменить заявку',accept:'Принять',reject:'Отклонить',unfriend:'Удалить друга',block:'Блокировать',unblock:'Разблокировать',confirmUnfriend:'Удалить этого друга?',confirmBlock:'Заблокировать игрока и удалить дружбу?',confirmUnblock:'Разблокировать игрока?',yes:'Готово.',searchResult:'Игрок найден',noCard:'Профиль игрока пока недоступен',pending:'Ожидает',accepted:'В друзьях',rejected:'Отклонена',online:'В сети',offline:'Не в сети',connecting:'Подключение…',unknown:'Статус скрыт',lastSeen:'Был(а) в сети',wait:'Загрузка…',error:'Ошибка Firebase',dbMissing:'Чтобы видеть Online/Offline, укажи адрес Realtime Database.',dbReady:'Realtime Database подключена.',dbBad:'Адрес Realtime Database для этого проекта неверный.',dbReload:'Адрес сохранён. Перезагрузи игру для переподключения.',permissions:'Статус недоступен: проверь правила Presence и разрешения дружбы.',count:'друзей',cardUpdated:'Публичная карточка обновлена.',idConflict:'Player ID не привязан к текущему аккаунту. Проверь playerIds.',truncated:'Часть результатов может быть скрыта (лимит теста — 50).',signIn:'Войти',cannotRefresh:'Не удалось загрузить друзей.',statusSharing:'Статус виден подтверждённым друзьям с разрешённым доступом.',blockChanged:'Блокировки обновлены.',requestChanged:'Заявка обновлена.'},
ES:{title:'AMIGOS',intro:'Buscar jugadores, solicitudes y estado en línea',refresh:'↻ Actualizar',publish:'Actualizar perfil',friends:'Amigos',requests:'Solicitudes',blocked:'Bloqueados',searchTitle:'Buscar por Player ID',search:'Buscar',myFriends:'Mis amigos',incoming:'Recibidas',outgoing:'Enviadas',blockedTitle:'Jugadores bloqueados',presenceSettings:'Estado de conexión',databaseHint:'Pega la URL exacta de Realtime Database desde Firebase Console.',connect:'Conectar',emptyFriends:'Aún no tienes amigos.',emptyRequests:'No hay solicitudes.',emptyBlocked:'No hay usuarios bloqueados.',login:'Inicia sesión para ver a tus amigos.',invalid:'Player ID inválido.',notFound:'No se encontró ese ID.',self:'Es tu propio ID.',send:'Añadir amigo',cancel:'Cancelar',accept:'Aceptar',reject:'Rechazar',unfriend:'Eliminar amigo',block:'Bloquear',unblock:'Desbloquear',confirmUnfriend:'¿Eliminar a este amigo?',confirmBlock:'¿Bloquear y eliminar amistad?',confirmUnblock:'¿Desbloquear jugador?',yes:'Listo.',searchResult:'Jugador encontrado',noCard:'Perfil todavía no disponible',pending:'Pendiente',accepted:'Amigos',rejected:'Rechazada',online:'En línea',offline:'Desconectado',connecting:'Conectando…',unknown:'Estado oculto',lastSeen:'Última vez',wait:'Cargando…',error:'Error de Firebase',dbMissing:'Introduce la URL de Realtime Database para ver estados.',dbReady:'Realtime Database conectada.',dbBad:'URL de base de datos inválida.',dbReload:'URL guardada. Recarga el juego.',permissions:'Estado no disponible: comprueba las reglas de Presence.',count:'amigos',cardUpdated:'Perfil público actualizado.',idConflict:'Player ID no vinculado a esta cuenta.',truncated:'Resultados parciales (límite de 50).',signIn:'Iniciar sesión',cannotRefresh:'Error al cargar amigos.',statusSharing:'Estado compartido con amigos autorizados.',blockChanged:'Bloqueos actualizados.',requestChanged:'Solicitud actualizada.'},
PT:{title:'AMIGOS',intro:'Buscar jogadores, pedidos e estado online',refresh:'↻ Atualizar',publish:'Atualizar cartão',friends:'Amigos',requests:'Pedidos',blocked:'Bloqueados',searchTitle:'Buscar pelo Player ID',search:'Buscar',myFriends:'Meus amigos',incoming:'Recebidos',outgoing:'Enviados',blockedTitle:'Jogadores bloqueados',presenceSettings:'Configurações de status online',databaseHint:'Cole a URL exata do Realtime Database no Firebase Console.',connect:'Conectar',emptyFriends:'Nenhum amigo ainda.',emptyRequests:'Sem pedidos.',emptyBlocked:'Ninguém bloqueado.',login:'Entre na conta para ver amigos.',invalid:'Player ID inválido.',notFound:'Player ID não encontrado.',self:'Este ID é seu.',send:'Adicionar amigo',cancel:'Cancelar pedido',accept:'Aceitar',reject:'Recusar',unfriend:'Remover amigo',block:'Bloquear',unblock:'Desbloquear',confirmUnfriend:'Remover este amigo?',confirmBlock:'Bloquear e desfazer amizade?',confirmUnblock:'Desbloquear jogador?',yes:'Concluído.',searchResult:'Jogador encontrado',noCard:'Perfil ainda indisponível',pending:'Pendente',accepted:'Amigos',rejected:'Recusado',online:'Online',offline:'Offline',connecting:'Conectando…',unknown:'Status oculto',lastSeen:'Última vez',wait:'Carregando…',error:'Erro do Firebase',dbMissing:'Digite a URL do Realtime Database para ver status.',dbReady:'Realtime Database conectada.',dbBad:'URL do banco de dados inválida.',dbReload:'URL salva. Recarregue o jogo.',permissions:'Status indisponível: confira as regras de Presence.',count:'amigos',cardUpdated:'Cartão público atualizado.',idConflict:'Player ID não vinculado à conta.',truncated:'Resultados parciais (limite 50).',signIn:'Entrar',cannotRefresh:'Não foi possível carregar amigos.',statusSharing:'Status visível aos amigos autorizados.',blockChanged:'Bloqueios atualizados.',requestChanged:'Pedido atualizado.'},
ZH:{title:'好友',intro:'搜索玩家、好友申请和在线状态',refresh:'↻ 刷新',publish:'更新公开资料',friends:'好友',requests:'申请',blocked:'黑名单',searchTitle:'通过 Player ID 搜索',search:'搜索',myFriends:'我的好友',incoming:'收到的申请',outgoing:'发出的申请',blockedTitle:'已屏蔽玩家',presenceSettings:'在线状态设置',databaseHint:'粘贴 Firebase Console 中 Realtime Database 的完整网址。',connect:'连接',emptyFriends:'暂无好友。',emptyRequests:'暂无申请。',emptyBlocked:'暂无屏蔽玩家。',login:'请先登录账号使用好友功能。',invalid:'Player ID 格式不正确。',notFound:'未找到该 ID。',self:'这是你的 Player ID。',send:'添加好友',cancel:'取消申请',accept:'接受',reject:'拒绝',unfriend:'删除好友',block:'屏蔽',unblock:'解除屏蔽',confirmUnfriend:'确定删除这位好友？',confirmBlock:'屏蔽并删除好友？',confirmUnblock:'解除屏蔽此玩家？',yes:'完成。',searchResult:'找到玩家',noCard:'玩家资料暂不可用',pending:'等待中',accepted:'已是好友',rejected:'已拒绝',online:'在线',offline:'离线',connecting:'连接中…',unknown:'状态不可见',lastSeen:'上次在线',wait:'加载中…',error:'Firebase 错误',dbMissing:'请输入 Realtime Database 网址以启用在线状态。',dbReady:'Realtime Database 已连接。',dbBad:'数据库网址无效。',dbReload:'网址已保存，请刷新游戏。',permissions:'无法查看状态：请检查 Presence 权限。',count:'位好友',cardUpdated:'公开资料已更新。',idConflict:'Player ID 未绑定当前账号。',truncated:'部分结果可能未显示（50 条限制）。',signIn:'登录',cannotRefresh:'无法加载好友。',statusSharing:'在线状态仅与已授权好友共享。',blockChanged:'黑名单已更新。',requestChanged:'申请已更新。'}};
const MORE_STR={
EN:{cardLoadError:'Unable to load public card',cardMissingHelp:'This player needs to sign in once with the updated game. Their card is synchronized automatically.',cardErrorHelp:'Check Firestore network access and rules.',viewProfile:'View profile',profileTitle:'PLAYER PROFILE',profileStats:'STATISTICS',statsMissing:'Statistics have not been published yet.',statsDenied:'Cannot load statistics. Check publicStats Firestore rules.',loadingProfile:'Loading player profile…',profileSkin:'Avatar skin',stEasy:'Easy best',stNormal:'Normal best',stHard:'Hard best',stExtreme:'Extreme best',stGames:'Games',stPipes:'Pipes passed',stFlaps:'Total flaps',stEarned:'Coins earned',stAchievements:'Achievements',profilePublishFailed:'Unable to publish public profile.'},
RU:{cardLoadError:'Не удалось загрузить карточку',cardMissingHelp:'Игроку нужно один раз войти в обновлённую игру. Карточка синхронизируется автоматически.',cardErrorHelp:'Проверь подключение и правила Firestore.',viewProfile:'Профиль',profileTitle:'ПРОФИЛЬ ИГРОКА',profileStats:'СТАТИСТИКА',statsMissing:'Статистика ещё не опубликована.',statsDenied:'Не удаётся загрузить статистику. Проверь правила publicStats в Firestore.',loadingProfile:'Загружаем профиль…',profileSkin:'Скин аватара',stEasy:'Рекорд: легко',stNormal:'Рекорд: нормально',stHard:'Рекорд: сложно',stExtreme:'Рекорд: экстрим',stGames:'Игр',stPipes:'Пройдено труб',stFlaps:'Взмахов',stEarned:'Заработано монет',stAchievements:'Достижения',profilePublishFailed:'Не удалось опубликовать профиль.'},
ZH:{cardLoadError:'无法加载公开资料',cardMissingHelp:'该玩家需要登录新版游戏，资料会自动同步。',cardErrorHelp:'检查网络连接及 Firestore 规则。',viewProfile:'个人资料',profileTitle:'玩家资料',profileStats:'统计',statsMissing:'统计尚未公开。',statsDenied:'无法读取统计。请检查 Firestore publicStats 规则。',loadingProfile:'加载资料…',profileSkin:'头像装扮',stEasy:'简单纪录',stNormal:'普通纪录',stHard:'困难纪录',stExtreme:'极限纪录',stGames:'场次',stPipes:'管道',stFlaps:'拍翅',stEarned:'获得金币',stAchievements:'成就',profilePublishFailed:'无法发布公开资料。'},
ES:{cardLoadError:'No se pudo cargar el perfil público',cardMissingHelp:'Este jugador debe iniciar sesión en la versión actualizada. El perfil se sincroniza automáticamente.',cardErrorHelp:'Comprueba la conexión y las reglas de Firestore.',viewProfile:'Ver perfil',profileTitle:'PERFIL DEL JUGADOR',profileStats:'ESTADÍSTICAS',statsMissing:'Aún no hay estadísticas públicas.',statsDenied:'No se pueden leer las estadísticas. Revisa las reglas publicStats.',loadingProfile:'Cargando perfil…',profileSkin:'Aspecto de avatar',stEasy:'Récord fácil',stNormal:'Récord normal',stHard:'Récord difícil',stExtreme:'Récord extremo',stGames:'Partidas',stPipes:'Tubos',stFlaps:'Aleteos',stEarned:'Monedas ganadas',stAchievements:'Logros',profilePublishFailed:'No se pudo publicar el perfil.'},
PT:{cardLoadError:'Não foi possível carregar o perfil público',cardMissingHelp:'Este jogador precisa entrar na versão atualizada. O perfil sincroniza automaticamente.',cardErrorHelp:'Verifique a conexão e as regras do Firestore.',viewProfile:'Ver perfil',profileTitle:'PERFIL DO JOGADOR',profileStats:'ESTATÍSTICAS',statsMissing:'Ainda não há estatísticas públicas.',statsDenied:'Não é possível carregar estatísticas. Confira as regras publicStats.',loadingProfile:'Carregando perfil…',profileSkin:'Aparência do avatar',stEasy:'Recorde fácil',stNormal:'Recorde normal',stHard:'Recorde difícil',stExtreme:'Recorde extremo',stGames:'Partidas',stPipes:'Canos',stFlaps:'Batidas de asa',stEarned:'Moedas ganhas',stAchievements:'Conquistas',profilePublishFailed:'Falha ao publicar perfil.'}
};
const PRIVACY_STR={
  EN:{title:'PROFILE PRIVACY',intro:'Choose who can see your records and statistics. Nickname, Player ID and avatar stay visible in search.',hidden:'Hidden',hiddenInfo:'Nobody else can see your detailed statistics.',friends:'Friends only',friendsInfo:'Only accepted friends can see your stats.',public:'Public',publicInfo:'Any signed-in player can see your stats.',done:'BACK TO PROFILE',guest:'Sign in to change your privacy settings.',saving:'Saving privacy to cloud…',saved:'Saved in cloud.',pending:'Not synced yet. Will retry when online.',unavailable:'Profile is still loading.',locked:'Profile details are hidden.',onlyFriends:'Only friends can see this player’s statistics.',blocked:'This profile is not available.',noStats:'Statistics are syncing. Ask your friend to open the updated game.'},
  RU:{title:'ПРИВАТНОСТЬ ПРОФИЛЯ',intro:'Выбери, кто видит рекорды и статистику. Ник, Player ID и аватар останутся видимы при поиске.',hidden:'Скрытый',hiddenInfo:'Подробная статистика скрыта от всех.',friends:'Только друзьям',friendsInfo:'Статистика доступна только подтверждённым друзьям.',public:'Публичный',publicInfo:'Статистика доступна всем авторизованным игрокам.',done:'НАЗАД В ПРОФИЛЬ',guest:'Войди в аккаунт, чтобы настроить приватность.',saving:'Сохраняем в облако…',saved:'Сохранено в облаке.',pending:'Не удалось синхронизировать. Повторим при подключении.',unavailable:'Профиль ещё загружается.',locked:'Игрок скрыл подробную статистику.',onlyFriends:'Статистика доступна только друзьям.',blocked:'Профиль недоступен.',noStats:'Статистика синхронизируется. Другу нужно открыть обновлённую игру.'},
  ZH:{title:'个人资料隐私',intro:'选择谁能查看纪录与统计。昵称、玩家 ID 和头像仍可在搜索中查看。',hidden:'隐藏',hiddenInfo:'所有其他玩家都无法查看统计。',friends:'仅好友',friendsInfo:'只有已确认好友可查看统计。',public:'公开',publicInfo:'所有已登录玩家可查看统计。',done:'返回个人资料',guest:'请登录以设置隐私。',saving:'正在保存到云端…',saved:'已保存。',pending:'暂未同步，联网后重试。',unavailable:'资料正在加载。',locked:'统计已隐藏。',onlyFriends:'仅好友可查看统计。',blocked:'无法查看资料。',noStats:'统计尚未同步。'},
  ES:{title:'PRIVACIDAD DEL PERFIL',intro:'Elige quién puede ver tus estadísticas. Tu nombre, ID y avatar siguen visibles.',hidden:'Oculto',hiddenInfo:'Nadie puede ver tus estadísticas.',friends:'Solo amigos',friendsInfo:'Solo los amigos aceptados pueden verlas.',public:'Público',publicInfo:'Cualquier usuario conectado puede verlas.',done:'VOLVER AL PERFIL',guest:'Inicia sesión para ajustar la privacidad.',saving:'Guardando en la nube…',saved:'Guardado.',pending:'Sin sincronizar. Se reintentará con conexión.',unavailable:'El perfil todavía se está cargando.',locked:'Estadísticas ocultas.',onlyFriends:'Solo los amigos pueden verlas.',blocked:'Perfil no disponible.',noStats:'Estadísticas pendientes de sincronizar.'},
  PT:{title:'PRIVACIDADE DO PERFIL',intro:'Escolha quem pode ver suas estatísticas. Nome, ID e avatar continuam visíveis.',hidden:'Oculto',hiddenInfo:'Ninguém pode ver suas estatísticas.',friends:'Somente amigos',friendsInfo:'Só amigos aceitos podem vê-las.',public:'Público',publicInfo:'Qualquer jogador conectado pode vê-las.',done:'VOLTAR AO PERFIL',guest:'Entre na conta para ajustar a privacidade.',saving:'Salvando na nuvem…',saved:'Salvo.',pending:'Não sincronizado. Tentaremos novamente online.',unavailable:'O perfil ainda está carregando.',locked:'Estatísticas ocultas.',onlyFriends:'Somente amigos podem vê-las.',blocked:'Perfil indisponível.',noStats:'Estatísticas ainda não sincronizadas.'}
};
let currentPrivacy='friends',privacyUid=null,privacyReadyUid=null,privacyLoadingUid=null,privacyStatus='';
const privacyPanel=$('fbPrivacyPanel');
const privacyKey=uid=>'flyingBirdPrivacyV1:'+uid;
function privacyText(k){return (PRIVACY_STR[lang]||PRIVACY_STR.EN)[k]||PRIVACY_STR.EN[k]||k}
function validPrivacy(v){return ['hidden','friends','public'].includes(v)?v:'friends'}
function readPrivacyLocal(uid){try{return JSON.parse(localStorage.getItem(privacyKey(uid))||'null')}catch{return null}}
function writePrivacyLocal(uid,value,pending){localStorage.setItem(privacyKey(uid),JSON.stringify({value:validPrivacy(value),pending:!!pending}))}
function renderPrivacy(){
  $('fbPrivacyTitle').textContent=privacyText('title');$('fbPrivacyIntro').textContent=privacyText('intro');$('fbPrivacyDone').textContent=privacyText('done');
  for(const b of privacyPanel.querySelectorAll('[data-fb-privacy]')){const k=b.dataset.fbPrivacy;b.querySelector('strong').textContent=privacyText(k);b.querySelector('small').textContent=privacyText(k+'Info');b.setAttribute('aria-pressed',String(currentPrivacy===k));b.disabled=!registered()||privacyReadyUid!==ownUid();}
  $('fbPrivacyStatus').textContent=!registered()?privacyText('guest'):privacyReadyUid!==ownUid()?privacyText('unavailable'):privacyStatus;
}
function closePrivacy(){privacyPanel.hidden=true}
function openPrivacy(){privacyPanel.hidden=false;applyLang();renderPrivacy();}
window.flyingBirdOpenPrivacy=openPrivacy;
$('fbPrivacyDone').onclick=closePrivacy;$('fbPrivacyClose').onclick=closePrivacy;
privacyPanel.addEventListener('click',e=>{if(e.target===privacyPanel)closePrivacy()});
privacyPanel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();closePrivacy()}});
document.addEventListener('keydown',e=>{if(!privacyPanel.hidden){e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();closePrivacy()}}},true);
for(const b of privacyPanel.querySelectorAll('[data-fb-privacy]'))b.addEventListener('click',()=>{
  const uid=ownUid();if(!registered()||privacyReadyUid!==uid)return;
  currentPrivacy=validPrivacy(b.dataset.fbPrivacy);writePrivacyLocal(uid,currentPrivacy,true);
  window.dispatchEvent(new CustomEvent('flyingbird:privacy-changing',{detail:{uid,visibility:currentPrivacy}}));
  privacyStatus=privacyText('saving');renderPrivacy();schedulePublicUpdate(100);
});
async function preparePrivacy(uid){
  if(!uid||!registered()||ownUid()!==uid||privacyReadyUid===uid||privacyLoadingUid===uid)return;
  privacyLoadingUid=uid;privacyUid=uid;
  const cached=readPrivacyLocal(uid);
  currentPrivacy=validPrivacy(cached?.value);
  try{
    // Account cloud setting is authoritative, unless a newer local offline choice is queued.
    if(!cached?.pending){
      const snap=await getDocFromServer(doc(db,'publicProfiles',uid));
      if(ownUid()!==uid)return;
      if(snap.exists())currentPrivacy=validPrivacy(snap.data().visibility);
    }
  }catch(e){console.warn('[Flying Bird] privacy preference read delayed',e)}
  finally{
    if(privacyLoadingUid===uid)privacyLoadingUid=null;
    if(ownUid()===uid){privacyReadyUid=uid;readyUid=uid;privacyStatus=cached?.pending?privacyText('pending'):'';renderPrivacy();schedulePublicUpdate(250)}
  }
}
let lang='EN';function locale(){try{return JSON.parse(localStorage.getItem('flyingBirdCfg')||'{}').lang||'EN';}catch{return 'EN';}}
function T(k){return MORE_STR[lang]?.[k] || (STR[lang]||STR.EN)[k] || MORE_STR.EN[k] || STR.EN[k] || k}
function applyLang(){lang=locale();if(!STR[lang])lang='EN';for(const node of modal.querySelectorAll('[data-fbf]'))node.textContent=T(node.dataset.fbf);const a=$('accountFriends');if(a)a.textContent='👥 '+T('friends');$('fbfProfileClose').textContent='← '+T('viewProfile');$('fbfProfileStatsTitle').textContent=T('profileStats');renderPrivacy();}
function note(text,bad=false){const e=$('fbfNotice');e.hidden=!text;e.classList.toggle('err',bad);e.textContent=text||'';}
function err(e){return e?.code||e?.message||String(e)}
function registered(){return !!(auth.currentUser&&!auth.currentUser.isAnonymous)}
function validId(s){return /^FB-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(s)}
function el(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e}
function action(label,fn,cls=''){const e=el('button',label,cls);e.type='button';e.addEventListener('click',()=>{if(!busy){Promise.resolve(fn()).catch(x=>note(T('error')+': '+err(x),true));}});return e}
let busy=false,authSeq=0,known=[],blocks=new Set(),friends=new Map(),cards=new Map(),cardProblems=new Map(),friendUnwatch=new Map(),friendPresenceCache=new Map(),dbRealtime=null,onlineConn=null,onlineLast=null,unwatchConnected=null,presenceVersion=0,setupUrl=(window.flyingBirdGetRTDBURL?.() || localStorage.getItem('flyingBirdRTDBUrlV1') || ''),activeTab='friends';
// Presence is connected automatically from the project-wide RTDB configuration.
function setBusy(v){busy=v;for(const id of ['fbfRefresh','fbfSearchBtn'])$(id).disabled=v||!registered()}
function ownUid(){return auth.currentUser?.uid||null}
function checkLogin(){if(registered())return true;note(T('login'),true);return false}
function resetFriends(){readyUid=null;privacyUid=null;privacyReadyUid=null;privacyLoadingUid=null;currentPrivacy='friends';privacyStatus='';clearTimeout(autoPublishTimer);closePrivacy();renderPrivacy();closePlayerProfile();known=[];blocks=new Set();friends=new Map();cards=new Map();cardProblems=new Map();$('fbfPublishHealth').hidden=true;for(const off of friendUnwatch.values())off();friendUnwatch.clear();friendPresenceCache.clear();for(const id of ['fbfFriends','fbfIncoming','fbfOutgoing','fbfBlocked','fbfSearchResult'])$(id).replaceChildren();$('fbfCount').textContent='—'}
function empty(container,s){container.appendChild(el('div',s,'fbfMuted'))}
function cardTitle(uid){const card=cards.get(uid);return card?.nick||(cardProblems.get(uid)?.kind==='error'?T('cardLoadError'):T('noCard'))}
function avatar(uid,large=false){
  const data=cards.get(uid)?.avatar||{};
  const canvas=el('canvas',null,large?'fbfAvatar fbfLargeAvatar':'fbfAvatar');canvas.width=large?96:32;canvas.height=large?96:32;
  canvas.style.imageRendering='pixelated';canvas.setAttribute('aria-label','Bird avatar');
  const c=canvas.getContext('2d');if(!c)return canvas;
  const bgs=window.flyingBirdFriendAvatarBackgrounds || ['#ff6b9d','#ffd23f','#4cd964','#4da3ff','#b9a0ff','#ff7b2e','#2ec4b6','#e8e8f5'];
  const n=Math.max(0,Math.floor(Number(data.bg)||0))%bgs.length;
  const pal=window.flyingBirdFriendSkinPalette||[];
  const s=pal[Math.max(0,Math.floor(Number(data.skin)||0))]||pal[0]||{body:'#ffd23f',hi:'#ffe98a',wing:'#ff9f1c',belly:'#fff4d6'};
  c.fillStyle=bgs[n];c.fillRect(0,0,32,32);
  c.fillStyle='rgba(255,255,255,.18)';c.fillRect(0,0,32,10);
  c.fillStyle='#2b1b00';c.fillRect(6,8,21,18);
  c.fillStyle=s.body;c.fillRect(7,9,19,16);c.fillRect(10,6,13,4);
  c.fillStyle=s.hi;c.fillRect(11,7,10,3);
  c.fillStyle=s.wing;c.fillRect(8,17,9,7);
  c.fillStyle=s.belly;c.fillRect(15,21,9,4);
  c.fillStyle='#fff';c.fillRect(19,11,6,6);
  c.fillStyle='#1a1033';c.fillRect(23,13,3,3);
  c.fillStyle='#ff9f1c';c.fillRect(26,18,5,3);
  if(large){
    // Pixel-perfect upscale of the identical friend-list avatar.
    const pixels=document.createElement('canvas');pixels.width=32;pixels.height=32;
    pixels.getContext('2d').drawImage(canvas,0,0);
    c.imageSmoothingEnabled=false;c.clearRect(0,0,96,96);c.drawImage(pixels,0,0,32,32,0,0,96,96);
  }
  return canvas;
}
function pair(d,uid){return d.fromUid===uid?d.toUid:d.toUid===uid?d.fromUid:null}
function pendingFor(peer){return known.filter(d=>pair(d,ownUid())===peer&&['pending','accepted'].includes(d.status))}
function cardLines(container,uid,playerId,withProfile=true){
  const row=el('div',null,'fbfIdentity');
  const name=el('div',null,'fbfIdentityText');
  name.append(el('strong',cardTitle(uid)),el('small',cards.get(uid)?.playerId||playerId||'—'));
  row.append(avatar(uid),name);container.appendChild(row);
  if(!cards.has(uid)){
    const problem=cardProblems.get(uid);
    const hint=problem?.kind==='error' ? T('cardErrorHelp')+' ('+problem.code+')' : T('cardMissingHelp');
    container.appendChild(el('div',hint,'fbfMuted'));
  }
  if(withProfile&&!blocks.has(uid))row.append(action(T('viewProfile'),()=>openPlayerProfile(uid,playerId),'fbfSmall fbfSecondary'));
}
async function fetchPublic(uid){
  if(cards.has(uid))return cards.get(uid);
  try{
    const s=await getDocFromServer(doc(db,'publicProfiles',uid));
    cardProblems.delete(uid);
    if(s.exists()) {cards.set(uid,s.data());return s.data()}
    cardProblems.set(uid,{kind:'missing'});
  }catch(e){
    cardProblems.set(uid,{kind:'error',code:err(e)});
    console.warn('[Flying Bird] publicProfiles read failed for friend',e);
  }
  return null;
}

let profileViewSeq=0;
function profileStat(label,value){
  const box=el('div',null,'fbfStat');box.append(el('strong',String(value??0)),el('small',label));return box;
}
async function openPlayerProfile(uid,fallbackId){
  if(!registered()||blocks.has(uid))return;
  const seq=++profileViewSeq,overlay=$('fbfProfile');
  overlay.hidden=false;
  $('fbfProfileTitle').textContent=cardTitle(uid);
  if(!cards.has(uid) && !cardProblems.has(uid))await fetchPublic(uid);
  if(seq!==profileViewSeq || overlay.hidden)return;
  $('fbfProfileTitle').textContent=cardTitle(uid);
  $('fbfProfileId').textContent=cards.get(uid)?.playerId||fallbackId||'—';
  const a=cards.get(uid)?.avatar||{},skins=window.flyingBirdFriendSkinPalette||[];
  $('fbfProfileSkin').textContent=T('profileSkin')+': '+(skins[Math.max(0,Number(a.skin)||0)]?.name||'CLASSIC');
  $('fbfProfileAvatarSlot').replaceChildren(avatar(uid,true));
  $('fbfProfileStats').replaceChildren();
  const visibility=validPrivacy(cards.get(uid)?.visibility);
  $('fbfProfileSkin').hidden=visibility==='hidden'||(visibility==='friends'&&!friends.has(uid));
  if(visibility==='hidden'){$('fbfProfileMessage').textContent=privacyText('locked');return}
  if(visibility==='friends'&&!friends.has(uid)){$('fbfProfileMessage').textContent=privacyText('onlyFriends');return}
  $('fbfProfileMessage').textContent=T('loadingProfile');
  try{
    const snap=await getDocFromServer(doc(db,'publicStats',uid));
    if(seq!==profileViewSeq||overlay.hidden||ownUid()===null)return;
    if(!snap.exists()){$('fbfProfileMessage').textContent=privacyText('noStats');return;}
    const st=snap.data(),best=st.best||{};
    const fields=[
      [T('stEasy'),best.EASY],[T('stNormal'),best.NORMAL],
      [T('stHard'),best.HARD],[T('stExtreme'),best.EXTREME],
      [T('stGames'),st.games],[T('stPipes'),st.pipes],
      [T('stFlaps'),st.flaps],[T('stEarned'),st.earnedCoins],
      [T('stAchievements'),st.achievements]
    ];
    $('fbfProfileStats').replaceChildren(...fields.map(([l,v])=>profileStat(l,v)));
    // v2.9: online match statistics. Visibility is enforced by Firestore rules (same model as solo stats).
    const mp=window.flyingBirdMpStats;
    if(mp){
      try{
        const mpSnap=await getDocFromServer(doc(db,'multiplayerStats',uid));
        if(seq!==profileViewSeq||overlay.hidden)return;
        const box=$('fbfProfileStats');
        box.append(el('div',mp.title(),'fbfStatHead'));
        if(mpSnap.exists())for(const [l,v] of mp.statFields(mpSnap.data()))box.append(profileStat(l,v));
        else box.append(el('div',mp.none(),'fbfStatNone'));
      }catch(e){if(e?.code!=='permission-denied')console.warn('[Flying Bird] online stats unavailable',e?.code||e)}
    }
    $('fbfProfileMessage').textContent='';
  }catch(e){if(seq===profileViewSeq)$('fbfProfileMessage').textContent=T('statsDenied')+' ('+err(e)+')';}
}
function closePlayerProfile(){++profileViewSeq;$('fbfProfile').hidden=true}
$('fbfProfileClose').addEventListener('click',closePlayerProfile);

function shortDate(v){return typeof v==='number'?new Date(v).toLocaleString(lang==='RU'?'ru-RU':lang==='ZH'?'zh-CN':lang==='ES'?'es-ES':lang==='PT'?'pt-BR':'en-US'):''}
function getPresenceStatus(uid){const b=modal.querySelector(`[data-fbf-presence="${uid}"]`);if(!b)return;return b}
let presenceConnected=false;
const inviteInFlight=new Set();
function friendOnline(uid){const p=friendPresenceCache.get(uid);return presenceConnected&&friends.has(uid)&&!blocks.has(uid)&&!p?.bad&&Object.values(p?.data?.connections||{}).some(v=>v===true)}
window.flyingBirdFriendOnline=friendOnline;
function updateFriendInvite(uid){
 for(const b of modal.querySelectorAll('[data-fbf-invite]'))if(b.dataset.fbfInvite===uid){b.disabled=!friendOnline(uid)||inviteInFlight.has(uid);b.title=friendOnline(uid)?'':T('offline');}
 window.dispatchEvent(new CustomEvent('flyingbird:friend-presence',{detail:{uid,online:friendOnline(uid)}}));
}
let openFriendMenu=null;
function closeFriendMenu(focus=false){if(!openFriendMenu)return;const {button,menu}=openFriendMenu;menu.hidden=true;button.setAttribute('aria-expanded','false');openFriendMenu=null;if(focus)button.focus()}
function addFriendMenu(item,uid,playerId){
 const wrap=el('div',null,'fbfActions'),button=el('button','⋯','fbfActionsToggle'),menu=el('div',null,'fbfActionsMenu');
 button.type='button';button.setAttribute('aria-label',({EN:'Friend actions',RU:'Действия с другом',ZH:'好友操作',ES:'Acciones de amigo',PT:'Ações do amigo'})[lang]||'Friend actions');button.setAttribute('aria-expanded','false');
 menu.hidden=true;
 for(const [label,fn,cls] of [[T('viewProfile'),()=>openPlayerProfile(uid,playerId),'fbfSecondary'],[T('unfriend'),()=>unfriend(uid),'fbfSecondary'],[T('block'),()=>blockUser(uid),'fbfDanger']]){
  menu.append(action(label,()=>{closeFriendMenu();return fn()},cls));
 }
 button.onclick=()=>{const opening=menu.hidden;closeFriendMenu();if(opening){menu.hidden=false;button.setAttribute('aria-expanded','true');openFriendMenu={button,menu};}};
 wrap.append(button,menu);item.append(wrap);
}
document.addEventListener('pointerdown',e=>{if(openFriendMenu&&!e.target.closest?.('.fbfActions'))closeFriendMenu()});
// Run before the panel's Escape handler so Escape closes only the mini menu first.
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openFriendMenu){e.preventDefault();e.stopImmediatePropagation();closeFriendMenu(true)}},true);
function renderPresence(uid,data,unavailable=false){updateFriendInvite(uid);const status=getPresenceStatus(uid);if(!status)return;const cnt=presenceConnected&&data?.connections?Object.values(data.connections).filter(v=>v===true).length:0;status.className='fbfChip '+(unavailable?'unavailable':cnt?'online':'offline');status.replaceChildren(el('span',null,'fbfDot'));let msg=unavailable?T('unknown'):cnt?T('online'):T('offline');if(!cnt&&!unavailable&&Number.isFinite(data?.lastOnline))msg+=' · '+T('lastSeen')+': '+shortDate(data.lastOnline);status.appendChild(el('span',msg));}
function subscribeFriendPresence(){for(const [id,unsub] of friendUnwatch){if(!friends.has(id)){unsub();friendUnwatch.delete(id);friendPresenceCache.delete(id)}}if(!dbRealtime)return;for(const id of friends.keys()){if(friendUnwatch.has(id))continue;const unsub=onValue(ref(dbRealtime,'presence/'+id),snap=>{friendPresenceCache.set(id,{data:snap.val(),bad:false});renderPresence(id,snap.val())},()=>{friendUnwatch.delete(id);friendPresenceCache.set(id,{data:null,bad:true});renderPresence(id,null,true)});friendUnwatch.set(id,unsub)}}
function render(){closeFriendMenu();const me=ownUid();const f=$('fbfFriends'),inc=$('fbfIncoming'),out=$('fbfOutgoing'),bl=$('fbfBlocked');for(const box of [f,inc,out,bl])box.replaceChildren();$('fbfCount').textContent=friends.size+' '+T('count');if(!friends.size)empty(f,T('emptyFriends'));for(const [uid,d] of friends){const item=el('div',null,'fbfItem');cardLines(item,uid,d.playerId,false);addFriendMenu(item,uid,d.playerId);const status=el('div',null,'fbfChip unavailable');status.dataset.fbfPresence=uid;status.append(el('span',null,'fbfDot'),el('span',dbRealtime?T('connecting'):T('unknown')));item.appendChild(status);const buttons=el('div',null,'fbfRow');const inviteLabels={EN:'INVITE TO ROOM',RU:'ПРИГЛАСИТЬ В КОМНАТУ',ZH:'邀请加入房间',ES:'INVITAR A LA SALA',PT:'CONVIDAR PARA A SALA'};
const inviteButton=action(inviteLabels[lang]||inviteLabels.EN,async()=>{
 if(!friendOnline(uid))return;
 if(!window.flyingBirdInviteFriend){note(T('error'),true);return;}
 inviteInFlight.add(uid);inviteButton.disabled=true;
 try{const sent=await window.flyingBirdInviteFriend(uid);if(sent===true)note(({EN:'Invitation sent.',RU:'Приглашение отправлено.',ZH:'邀请已发送。',ES:'Invitación enviada.',PT:'Convite enviado.'})[lang]||'Invitation sent.');else if(sent===false)note(({EN:'Open the room and check connection / match status.',RU:'Открой комнату и проверь подключение и статус матча.',ZH:'请检查房间连接和比赛状态。',ES:'Comprueba la conexión y el estado de la sala.',PT:'Confira a conexão e o estado da sala.'})[lang]||'Check room status.',true);}
 finally{inviteInFlight.delete(uid);updateFriendInvite(uid);}
},'fbfSmall');inviteButton.dataset.fbfInvite=uid;inviteButton.disabled=!friendOnline(uid);buttons.append(inviteButton);
item.appendChild(buttons);f.appendChild(item);if(friendPresenceCache.has(uid)){const st=friendPresenceCache.get(uid);renderPresence(uid,st.data,st.bad)}}
// Requests lists show actionable invitations only. Accepted friends belong in Friends,
// not Requests; suppress reciprocal pending requests once a friendship exists.
const ins=known.filter(d=>d.toUid===me&&d.status==='pending'&&!friends.has(d.fromUid)&&!blocks.has(d.fromUid)),outs=known.filter(d=>d.fromUid===me&&d.status==='pending'&&!friends.has(d.toUid)&&!blocks.has(d.toUid));for(const [box,list,dir] of [[inc,ins,'in'],[out,outs,'out']]){if(!list.length)empty(box,T('emptyRequests'));for(const r of list){const peer=dir==='in'?r.fromUid:r.toUid;const item=el('div',null,'fbfItem');cardLines(item,peer,dir==='out'?r.toPlayerId:null);item.appendChild(el('div',T(r.status)||r.status,'fbfMuted'));const buttons=el('div',null,'fbfRow');if(r.status==='pending'&&dir==='in'){buttons.append(action(T('accept'),()=>respond(r.id,'accepted'),'fbfSmall'),action(T('reject'),()=>respond(r.id,'rejected'),'fbfSmall fbfSecondary'))}else if(r.status==='pending'&&dir==='out'){buttons.append(action(T('cancel'),()=>deleteRequest(r.id),'fbfSmall fbfSecondary'))}else if(r.status==='rejected'){buttons.append(action(T('cancel'),()=>deleteRequest(r.id),'fbfSmall fbfSecondary'))}if(['pending','accepted'].includes(r.status)&&peer!==me&&!blocks.has(peer))buttons.append(action(T('block'),()=>blockUser(peer),'fbfSmall fbfDanger'));item.appendChild(buttons);box.appendChild(item)}}
if(!blocks.size)empty(bl,T('emptyBlocked'));for(const id of blocks){const item=el('div',null,'fbfItem');cardLines(item,id,null);item.appendChild(action(T('unblock'),()=>unblock(id),'fbfSmall fbfSecondary'));bl.appendChild(item)}subscribeFriendPresence();}
async function refresh(){if(!checkLogin()||busy)return;const me=ownUid(),seq=authSeq;setBusy(true);note(T('wait'));try{const base=collection(db,'friendRequests');const [inS,outS,blockedS]=await Promise.all([getDocsFromServer(query(base,where('toUid','==',me),limit(50))),getDocsFromServer(query(base,where('fromUid','==',me),limit(50))),getDocsFromServer(query(collection(db,'blocks',me,'users'),limit(100)))]);if(seq!==authSeq||ownUid()!==me)return;known=[...new Map([...inS.docs,...outS.docs].map(s=>[s.id,{...s.data(),id:s.id}])).values()];blocks=new Set(blockedS.docs.map(d=>d.id));friends.clear();for(const d of known){const peer=pair(d,me);if(d.status==='accepted'&&peer&&!blocks.has(peer))friends.set(peer,{playerId:d.fromUid===me?d.toPlayerId:null})}cards.clear();cardProblems.clear();await Promise.all([...new Set([...friends.keys(),...blocks,...known.map(d=>pair(d,me)).filter(Boolean)])].map(fetchPublic));if(seq!==authSeq||ownUid()!==me)return;render();let trunc=inS.size>=50||outS.size>=50;if(dbRealtime)await syncPresenceAccess(me,new Set(friends.keys()),trunc);if(trunc)note(T('truncated'));else note('');}catch(e){note(T('cannotRefresh')+' '+err(e),true)}finally{if(seq===authSeq)setBusy(false)}}
async function search(){if(!checkLogin()||busy)return;const id=$('fbfSearchId').value.trim().toUpperCase(),b=$('fbfSearchResult');b.replaceChildren();if(!validId(id)){note(T('invalid'),true);return}setBusy(true);try{const s=await getDocFromServer(doc(db,'playerIds',id));if(!s.exists()){note(T('notFound'),true);return}const uid=s.data().uid;if(!uid||uid===ownUid()){note(T('self'),true);return}cards.delete(uid);cardProblems.delete(uid);await fetchPublic(uid);const item=el('div',null,'fbfItem');cardLines(item,uid,id);item.appendChild(el('div',T('searchResult'),'fbfMuted'));const buttons=el('div',null,'fbfRow');if(blocks.has(uid))buttons.append(action(T('unblock'),()=>unblock(uid),'fbfSmall'));else{if(!known.some(d=>pair(d,ownUid())===uid&&['pending','accepted'].includes(d.status)))buttons.append(action(T('send'),()=>sendRequest(uid,id),'fbfSmall'));buttons.append(action(T('block'),()=>blockUser(uid),'fbfSmall fbfDanger'));}item.appendChild(buttons);b.appendChild(item);note('');}catch(e){note(T('error')+': '+err(e),true)}finally{setBusy(false)}}
async function sendRequest(uid,id){if(!checkLogin())return;setBusy(true);try{const me=ownUid();await setDoc(doc(db,'friendRequests',me+'_'+uid),{fromUid:me,toUid:uid,toPlayerId:id,status:'pending',createdAt:serverTimestamp()});note(T('requestChanged'));await refreshSafe()}catch(e){note(T('error')+': '+err(e),true)}finally{setBusy(false)}}
async function respond(id,status){if(!checkLogin())return;setBusy(true);try{await updateDoc(doc(db,'friendRequests',id),{status,respondedAt:serverTimestamp()});
  // Only update the UI after Firestore confirms the write. This makes an accepted
  // invitation disappear immediately even if the subsequent reload is offline.
  const request=known.find(d=>d.id===id);
  if(request){request.status=status;const peer=pair(request,ownUid());if(status==='accepted'&&peer&&!blocks.has(peer))friends.set(peer,{playerId:request.fromUid===ownUid()?request.toPlayerId:null});render()}
  note(T('requestChanged'));await refreshSafe()}catch(e){note(T('error')+': '+err(e),true)}finally{setBusy(false)}}
async function deleteRequest(id){setBusy(true);try{await deleteDoc(doc(db,'friendRequests',id));await refreshSafe();note(T('requestChanged'))}catch(e){note(T('error')+': '+err(e),true)}finally{setBusy(false)}}
async function unfriend(uid){if(!confirm(T('confirmUnfriend')))return;setBusy(true);try{const docs=known.filter(d=>pair(d,ownUid())===uid&&d.status==='accepted');if(!docs.length)throw Error('Friendship not loaded');const batch=writeBatch(db);for(const d of docs)batch.delete(doc(db,'friendRequests',d.id));await batch.commit();if(dbRealtime)await revokePresenceAccess(uid);await refreshSafe();note(T('yes'));}catch(e){note(T('error')+': '+err(e),true)}finally{setBusy(false)}}
async function blockUser(uid){if(!checkLogin()||uid===ownUid()||!confirm(T('confirmBlock')))return;setBusy(true);try{const batch=writeBatch(db);batch.set(doc(db,'blocks',ownUid(),'users',uid),{createdAt:serverTimestamp()});for(const d of pendingFor(uid))batch.delete(doc(db,'friendRequests',d.id));await batch.commit();if(dbRealtime)await revokePresenceAccess(uid);await refreshSafe();note(T('blockChanged'));}catch(e){note(T('error')+': '+err(e),true)}finally{setBusy(false)}}
async function unblock(uid){if(!confirm(T('confirmUnblock')))return;setBusy(true);try{await deleteDoc(doc(db,'blocks',ownUid(),'users',uid));await refreshSafe();note(T('blockChanged'));}catch(e){note(T('error')+': '+err(e),true)}finally{setBusy(false)}}
// Internal helper avoids reentrant busy gate when actions refresh after a write.
async function refreshSafe(){setBusy(false);try{await refresh()}finally{setBusy(true)}}
let readyUid=null,autoPublishTimer=null,publicPublishing=false,repeatPublish=false;
let lastPublication={card:'—',stats:'—'};
function publicationHealth(){
  const box=$('fbfPublishHealth');
  if(!registered()){box.hidden=true;return;}
  box.hidden=false;
  const isRu=lang==='RU';
  const card=isRu?'Карточка':'Public card';
  const stats=isRu?'Статистика':'Public statistics';
  box.textContent=card+': '+lastPublication.card+'\n'+stats+': '+lastPublication.stats;
  const bad=[lastPublication.card,lastPublication.stats].some(x=>x.startsWith('ERROR:')||x.startsWith('ОШИБКА:'));
  box.classList.toggle('err',bad);
}
function setPublishState(part,value){lastPublication[part]=value;publicationHealth();}
function publicStatsPayload(){
  let progress={};try{progress=JSON.parse(localStorage.getItem('flyingBirdSave')||'{}')}catch{}
  const safeNumber=x=>Math.min(100000000,Math.max(0,Math.floor(Number(x)||0)));
  const best={};for(const mode of ['EASY','NORMAL','HARD','EXTREME'])best[mode]=safeNumber(progress.best?.[mode]);
  let wallet={};try{wallet=JSON.parse(localStorage.getItem('flyingBirdWallet')||'{}')}catch{}
  return {best,games:safeNumber(progress.games),pipes:safeNumber(progress.pipes),
    flaps:safeNumber(progress.flaps),earnedCoins:safeNumber(progress.earnedCoins),
    coins:safeNumber(wallet.coins),
    achievements:Object.values(progress.ach||{}).filter(Boolean).length,
    updatedAt:serverTimestamp()};
}
async function publishOwnData(){
  const uid=ownUid();
  if(!registered()||!uid||readyUid!==uid||privacyReadyUid!==uid)return;
  if(publicPublishing){repeatPublish=true;return}
  publicPublishing=true;
  let failed=false;
  try{
    setPublishState('card','…');
    const s=await getDocFromServer(doc(db,'players',uid));
    if(ownUid()!==uid||readyUid!==uid)return;
    if(!s.exists())throw Error('players/'+uid+' is missing');
    const p=s.data();if(!validId(p.id))throw Error('Invalid Player ID in players/'+uid);
    const indexRef=doc(db,'playerIds',p.id);
    const ix=await getDocFromServer(indexRef);
    if(!ix.exists()){
      // Secure create-only operation under the supplied Firestore rules.
      await setDoc(indexRef,{uid});
    }else if(ix.data().uid!==uid){
      throw Error('PLAYER ID CONFLICT: '+p.id+' belongs to another account. Contact admin; do not overwrite.');
    }
    if(typeof p.nick!=='string'||!p.avatar||typeof p.avatar!=='object')throw Error('Missing nickname or avatar in players');
    if(ownUid()!==uid||readyUid!==uid)return;
    const uploadingVisibility=currentPrivacy;
    const payload={playerId:p.id,nick:p.nick,avatar:p.avatar,visibility:uploadingVisibility};
    await setDoc(doc(db,'publicProfiles',uid),payload);
    if(ownUid()!==uid)return;
    cards.set(uid,payload);
    if(currentPrivacy===uploadingVisibility){
      writePrivacyLocal(uid,currentPrivacy,false);
      privacyStatus=privacyText('saved');
    } else {
      writePrivacyLocal(uid,currentPrivacy,true);
      privacyStatus=privacyText('saving');
      repeatPublish=true;
    }
    renderPrivacy();
    setPublishState('card','✓ '+(lang==='RU'?'синхронизирована':'synced'));
  }catch(e){
    failed=true;
    console.warn('[Flying Bird] Automatic public card sync failed',e);
    if(ownUid()===uid){
      privacyStatus=privacyText('pending')+' ('+err(e)+')';renderPrivacy();
      setPublishState('card',(lang==='RU'?'ОШИБКА: ':'ERROR: ')+err(e));
    }
  }
  try{
    if(ownUid()===uid&&readyUid===uid&&window.flyingBirdPublicReadyUid===uid){
      setPublishState('stats','…');
      await setDoc(doc(db,'publicStats',uid),publicStatsPayload());
      if(ownUid()===uid){
        setPublishState('stats','✓ '+(lang==='RU'?'синхронизирована':'synced'));
        window.dispatchEvent(new CustomEvent('flyingbird:public-stats-synced',{detail:{uid}}));
      }
    }else if(ownUid()===uid){setPublishState('stats',lang==='RU'?'ожидание загрузки прогресса':'waiting for progress')}
  }catch(e){
    failed=true;
    console.warn('[Flying Bird] Automatic public stats sync failed',e);
    if(ownUid()===uid)setPublishState('stats',(lang==='RU'?'ОШИБКА: ':'ERROR: ')+err(e));
  }finally{
    publicPublishing=false;
    if(repeatPublish){repeatPublish=false;schedulePublicUpdate(650)}
  }
  if(!modal.hidden&&activeTab==='friends'&&!busy)void refresh();
}
function schedulePublicUpdate(delay=2400){
  if(!registered()||readyUid!==ownUid()||privacyReadyUid!==ownUid())return;
  clearTimeout(autoPublishTimer);
  autoPublishTimer=setTimeout(()=>void publishOwnData(),delay);
}
// Profile publication starts as soon as the player's private profile is ready,
// independent from cloud progress selection and its conflict dialog.
window.addEventListener('flyingbird:identity-ready',e=>{
  if(e.detail?.uid===ownUid())void preparePrivacy(e.detail.uid);
});
window.addEventListener('flyingbird:account-ready',e=>{
  if(e.detail?.uid===ownUid()){
    if(privacyReadyUid===ownUid())schedulePublicUpdate(150);
    else void preparePrivacy(e.detail.uid);
  }
});
window.addEventListener('flyingbird:profile-saved',e=>{if(e.detail?.uid===ownUid())schedulePublicUpdate(350)});
window.addEventListener('flyingbird:progress-changed',()=>schedulePublicUpdate(2800));
window.addEventListener('online',()=>schedulePublicUpdate(300));
window.addEventListener('visibilitychange',()=>{if(!document.hidden)schedulePublicUpdate(400)});

function validUrl(str){try{const url=new URL(str);return url.protocol==='https:'&&/^(flying-bird-d6832)([.-][a-z0-9-]+)*\.(firebasedatabase\.app|firebaseio\.com)$/.test(url.hostname)&&url.pathname==='/'&&!url.search&&!url.hash&&!url.username&&!url.password?url.origin:null}catch{return null}}
// Presence starts automatically on sign-in; there is no public database editor.
// Friends-only visibility at RTDB level is based on an owner-maintained access list.
// During this Spark/client prototype it mirrors accepted Firestore requests when online.
// A trusted backend must reconcile stale shares for production/revocations.
async function syncPresenceAccess(me,allowed,partial=false){if(!dbRealtime||ownUid()!==me)return;try{const acl=ref(dbRealtime,'presenceAccess/'+me),s=await getRTDB(acl);if(ownUid()!==me)return;const prev=s.val()||{},delta={};for(const uid of allowed)if(uid!==me&&prev[uid]!==true)delta[uid]=true;if(!partial)for(const uid of Object.keys(prev))if(!allowed.has(uid))delta[uid]=null;if(Object.keys(delta).length)await update(acl,delta)}catch(e){$('fbfPresenceInfo').textContent=T('error')+': '+err(e)}}
async function revokePresenceAccess(uid){if(dbRealtime&&ownUid())await remove(ref(dbRealtime,'presenceAccess/'+ownUid()+'/'+uid))}
async function logoutPresence(){presenceConnected=false;for(const uid of friends.keys())updateFriendInvite(uid);presenceVersion++;unwatchConnected?.();unwatchConnected=null;for(const u of friendUnwatch.values())u();friendUnwatch.clear();const c=onlineConn,l=onlineLast;onlineConn=null;onlineLast=null;if(c){try{await remove(c)}catch{}try{await onDisconnect(c).cancel()}catch{}}if(l){try{await set(l,rtdbTimestamp())}catch{}try{await onDisconnect(l).cancel()}catch{}}}
window.flyingBirdBeforeSignOut=logoutPresence;
function startPresence(uid){if(!dbRealtime||!uid)return;presenceVersion++;const run=presenceVersion;unwatchConnected?.();unwatchConnected=onValue(ref(dbRealtime,'.info/connected'),snap=>{if(run!==presenceVersion||ownUid()!==uid)return;presenceConnected=snap.val()===true;for(const id of friends.keys()){const p=friendPresenceCache.get(id);renderPresence(id,p?.data,p?.bad)}if(!presenceConnected)return;void (async()=>{const c=push(ref(dbRealtime,'presence/'+uid+'/connections')),l=ref(dbRealtime,'presence/'+uid+'/lastOnline');try{await onDisconnect(c).remove();await onDisconnect(l).set(rtdbTimestamp());if(run!==presenceVersion||ownUid()!==uid){await onDisconnect(c).cancel();return}await set(c,true);onlineConn=c;onlineLast=l;$('fbfPresenceInfo').textContent=T('dbReady')}catch(e){$('fbfPresenceInfo').textContent=T('error')+': '+err(e)}})()},e=>{$('fbfPresenceInfo').textContent=T('error')+': '+err(e)})}
function openFriends(){closePlayerProfile();applyLang();if(!registered()){document.getElementById('accountBtn')?.click();return}document.getElementById('authPanel').hidden=true;modal.hidden=false;setActiveTab('friends');publicationHealth();schedulePublicUpdate(600);void refresh()}
function closeFriends(){closeFriendMenu();closePlayerProfile();modal.hidden=true}
function setActiveTab(name){closeFriendMenu();closePlayerProfile();activeTab=name;for(const n of ['friends','requests','blocked']){$('fbf'+n[0].toUpperCase()+n.slice(1)+'Pane').hidden=n!==name;modal.querySelector('[data-fbf-tab="'+n+'"]').setAttribute('aria-selected',String(n===name))}}
window.flyingBirdOpenFriends=openFriends;
window.flyingBirdOpenRankedProfile=(uid)=>{
  if(!registered()||!uid)return;
  modal.hidden=false;
  applyLang();
  setActiveTab('friends');
  void fetchPublic(uid).then(()=>openPlayerProfile(uid));
};
$('fbfClose').onclick=closeFriends;modal.addEventListener('click',e=>{if(e.target===modal)closeFriends()});
modal.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();if(!$('fbfProfile').hidden)closePlayerProfile();else closeFriends()}});
document.addEventListener('keydown',e=>{if(!modal.hidden){e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();if(!$('fbfProfile').hidden)closePlayerProfile();else closeFriends()}}},true);
for(const b of modal.querySelectorAll('[data-fbf-tab]'))b.addEventListener('click',()=>setActiveTab(b.dataset.fbfTab));
$('fbfRefresh').onclick=refresh;$('fbfSearchBtn').onclick=search;
$('fbfSearchId').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void search()}});
$('accountFriends').onclick=openFriends;
window.addEventListener('flyingbird:progress-changed',applyLang);
let previousUid=null;
onAuthStateChanged(auth,async user=>{const seq=++authSeq,uid=user&&!user.isAnonymous?user.uid:null;if(previousUid&&previousUid!==uid){void logoutPresence();resetFriends();lastPublication={card:'—',stats:'—'}}previousUid=uid;setBusy(false);if(!uid){resetFriends();if(!modal.hidden)closeFriends();return}
if(window.flyingBirdIdentityReadyUid===uid||window.flyingBirdPublicReadyUid===uid)void preparePrivacy(uid)
if(setupUrl){const url=validUrl(setupUrl);if(url){try{dbRealtime=dbRealtime||getDatabase(app,url);startPresence(uid);$('fbfPresenceInfo').textContent=T('dbReady')}catch(e){$('fbfPresenceInfo').textContent=err(e)}}}else $('fbfPresenceInfo').textContent=T('dbMissing');await refresh();if(seq!==authSeq)return;});
applyLang();

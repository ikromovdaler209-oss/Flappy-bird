// Flying Bird Multiplayer Update 1: room creation, seats, ready states, host handoff, bans and invitations.
// v2.6: adaptive snapshots, bounded interpolation, server clock warm-up and network diagnostics.
import {getApps,getApp,initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,collection,doc,query,where,limit,getDocsFromServer,getDocFromServer} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {getDatabase,ref,get,onValue,set,update,remove,runTransaction,onDisconnect,serverTimestamp as rtStamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js';
import {assessReadyRoom,isFreshPlayerState,newGhostTrack,acceptGhostPacket,ghostPosition,newNetworkStats,noteWriteAck,publishInterval,networkQuality,rankRacePlayers} from './netcode.js';
import {roundPath,roundFinished,spectatorTarget,nextRoundMeta} from './experience.js';
import {submitRound,resultLine,onChange as onMpStats} from '../firebase/mp-stats.js';
const FB_CONFIG={apiKey:'AIzaSyBXhPjfPGPjD6SX6ISyd9UIGcwIGDir2IE',authDomain:'flying-bird-d6832.firebaseapp.com',projectId:'flying-bird-d6832',storageBucket:'flying-bird-d6832.firebasestorage.app',messagingSenderId:'824302202629',appId:'1:824302202629:web:885e30d34fb1ddaa56516c'};
const app=getApps().length?getApp():initializeApp(FB_CONFIG),auth=getAuth(app),fsdb=getFirestore(app);
const $=id=>document.getElementById(id), modal=$('fbMpPanel'), alpha='23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const mapIds=['CITY','MOUNTAINS','VOLCANO','SAKURA','NEON','OCEAN','VOLCANO_PLUS','COSMIC','FOREST','CRYSTAL','DESERT'];
const lang=()=>{try{return JSON.parse(localStorage.getItem('flyingBirdCfg')||'{}').lang||'EN'}catch{return 'EN'}};
const words={
 EN:{title:'🐤 MULTIPLAYER',subtitle:'ROOMS & LOBBY · v2.6',create:'CREATE ROOM',join:'JOIN ROOM',joinBy:'JOIN BY CODE',invites:'INVITATIONS',db:'Realtime Database connection',dbHint:'Use the same exact Database URL as Friends → Online status settings. Your existing value is reused automatically.',saveDb:'SAVE DATABASE URL',players:'PLAYERS',map:'Map',capacity:'Players',layout:'Orientation',diff:'Difficulty',ready:"I'M READY",unready:'CANCEL READY',start:'START MATCH',save:'SAVE ROOM SETTINGS',invite:'INVITE FRIENDS',load:'LOAD FRIENDS',share:'SHARE LINK',leave:'LEAVE ROOM',copy:'COPY CODE',copyLink:'INVITE LINK',back:'BACK',kick:'KICK',host:'HOST',readyState:'READY',notReady:'NOT READY',createAction:'CREATE',noAuth:'Sign in to your Firebase account to use multiplayer.',needUrl:'Database URL is not configured. The project owner should set it once in the HTML; invitation links can configure it automatically.',notFound:'Room not found or not available.',banned:'You were kicked and permanently blocked from this room.',full:'This room is full.',layoutMismatch:'This room uses the other screen orientation. Rotate the device to join.',mustReady:'All players, including the host, must press Ready. At least 2 players are required.',engine:'All participants are ready! Multiplayer gameplay will be implemented in Update 2; the match is not started yet.',onlyHost:'Only the host can change room settings or kick players.',settingsChanged:'Settings updated. Everyone must press Ready again.',inviteSent:'Invitation sent.',inviteFail:'In-app invitation requires friend presence permission. You can share the invitation link instead.',inviteEmpty:'No incoming invitations.',noFriends:'No friends loaded. Open Friends once to sync the friend online permissions if invitations fail.',kickConfirm:'Kick this player? They will never be allowed to rejoin this room.',kicked:'Removed from the room. You cannot rejoin it.',left:'You left the room.',joined:'Joined room.',roomClosed:'Room was closed.',roomChanged:'Room changed. Return to the lobby.',error:'Operation failed',pending:'Connecting…',limit:'Invite only friends who have granted you presence access.',pendingLink:'Invite link detected. Sign in and join the room.',online:'Ready for lobby',startTip:'Match launch requires all current players to be ready (minimum 2).',matchPending:'Update 1 builds rooms and lobbies only.',inviteJoin:'JOIN',inviteDecline:'DISMISS',roomLink:'Room link copied.',codeCopied:'Room code copied.',orientation:'Orientation',inviteNone:'Share the room link with friends if in-app invitations are unavailable.'},
 RU:{title:'🐤 МУЛЬТИПЛЕЕР',subtitle:'КОМНАТЫ И ЛОББИ · v2.6',create:'СОЗДАТЬ КОМНАТУ',join:'ПРИСОЕДИНИТЬСЯ',joinBy:'ВОЙТИ ПО КОДУ',invites:'ПРИГЛАШЕНИЯ',db:'Подключение Realtime Database',dbHint:'Используй тот же URL базы, что в Friends → Online status settings. Сохранённый адрес подставится автоматически.',saveDb:'СОХРАНИТЬ URL',players:'ИГРОКИ',map:'Карта',capacity:'Игроки',layout:'Ориентация',diff:'Сложность',ready:'ГОТОВ',unready:'ОТМЕНИТЬ ГОТОВНОСТЬ',start:'НАЧАТЬ МАТЧ',save:'СОХРАНИТЬ НАСТРОЙКИ',invite:'ПРИГЛАСИТЬ ДРУЗЕЙ',load:'ЗАГРУЗИТЬ ДРУЗЕЙ',share:'ПОДЕЛИТЬСЯ ССЫЛКОЙ',leave:'ПОКИНУТЬ КОМНАТУ',copy:'КОПИРОВАТЬ КОД',copyLink:'ССЫЛКА',back:'НАЗАД',kick:'ИСКЛЮЧИТЬ',host:'ХОЗЯИН',readyState:'ГОТОВ',notReady:'НЕ ГОТОВ',createAction:'СОЗДАТЬ',noAuth:'Войди в аккаунт Firebase, чтобы пользоваться мультиплеером.',needUrl:'Адрес базы не настроен. Владелец проекта должен указать его один раз в HTML; приглашение по ссылке также настроит адрес автоматически.',notFound:'Комната не найдена или недоступна.',banned:'Хозяин исключил тебя; повторный вход в эту комнату запрещён.',full:'Комната заполнена.',layoutMismatch:'Для этой комнаты нужна другая ориентация экрана. Поверни устройство.',mustReady:'Все игроки, включая хозяина, должны нажать «Готов». Минимум 2 игрока.',engine:'Все готовы! Сам игровой матч появится в Multiplayer Update 2; сейчас комната только подготовлена.',onlyHost:'Только хозяин может изменять настройки комнаты и исключать игроков.',settingsChanged:'Настройки обновлены. Всем нужно снова нажать «Готов».',inviteSent:'Приглашение отправлено.',inviteFail:'Для приглашения в игре нужно разрешение статуса друга. Можешь отправить ссылку.',inviteEmpty:'Нет новых приглашений.',noFriends:'Друзья не загрузились. Если приглашения не проходят, открой Friends для синхронизации разрешений.',kickConfirm:'Исключить игрока? Он больше никогда не войдёт в эту комнату.',kicked:'Тебя исключили. Повторно войти в эту комнату нельзя.',left:'Ты вышел из комнаты.',joined:'Подключено к комнате.',roomClosed:'Комната закрыта.',roomChanged:'Комната изменилась. Вернись в лобби.',error:'Ошибка',pending:'Подключение…',limit:'Приглашения доступны друзьям, разрешившим показ онлайна.',pendingLink:'Найдена ссылка на комнату. Войди в аккаунт и присоединяйся.',online:'Лобби подключено',startTip:'Для запуска должны быть готовы все участники. Минимум 2.',matchPending:'Обновление 1 — только комнаты и лобби.',inviteJoin:'ВОЙТИ',inviteDecline:'СКРЫТЬ',roomLink:'Ссылка скопирована.',codeCopied:'Код скопирован.',orientation:'Ориентация',inviteNone:'Если приглашение в игре не работает, отправь другу ссылку на комнату.'},
 ZH:{title:'🐤 多人游戏',subtitle:'房间与大厅 · v2.5',create:'创建房间',join:'加入房间',joinBy:'使用代码加入',invites:'邀请',db:'实时数据库连接',dbHint:'使用好友在线状态设置中的相同数据库 URL。',saveDb:'保存地址',players:'玩家',map:'地图',capacity:'人数',layout:'方向',diff:'难度',ready:'准备就绪',unready:'取消准备',start:'开始比赛',save:'保存房间设置',invite:'邀请好友',load:'加载好友',share:'分享链接',leave:'离开房间',copy:'复制代码',copyLink:'邀请链接',back:'返回',kick:'踢出',host:'房主',readyState:'已准备',notReady:'未准备',createAction:'创建',noAuth:'请先登录账户。',needUrl:'请设置数据库 URL。',notFound:'找不到房间。',banned:'你已被踢出，无法重新加入该房间。',full:'房间已满。',layoutMismatch:'房间屏幕方向不同，请旋转设备。',mustReady:'所有玩家必须准备，至少两人。',engine:'全员准备！实际比赛将在更新2中推出。',onlyHost:'只有房主可以管理房间。',settingsChanged:'设置已更改，请重新准备。',inviteSent:'邀请已发送。',inviteFail:'无法发送游戏内邀请，请分享链接。',inviteEmpty:'没有邀请。',noFriends:'暂无好友。',kickConfirm:'踢出玩家并永久禁止返回此房间？',kicked:'你已被踢出该房间。',left:'已离开房间。',joined:'已加入房间。',roomClosed:'房间已关闭。',roomChanged:'房间变化。',error:'操作失败',pending:'连接中…',limit:'好友需允许在线状态访问。',pendingLink:'发现房间邀请链接。',online:'已连接',startTip:'至少两名玩家且所有人准备。',matchPending:'更新1仅包含大厅。',inviteJoin:'加入',inviteDecline:'忽略',roomLink:'已复制链接。',codeCopied:'已复制代码。',orientation:'方向',inviteNone:'可分享链接邀请好友。'},
 ES:{title:'🐤 MULTIJUGADOR',subtitle:'SALAS Y LOBBY · v2.5',create:'CREAR SALA',join:'ENTRAR',joinBy:'ENTRAR POR CÓDIGO',invites:'INVITACIONES',db:'Conexión Realtime Database',dbHint:'Usa la misma URL de Friends.',saveDb:'GUARDAR URL',players:'JUGADORES',map:'Mapa',capacity:'Jugadores',layout:'Orientación',diff:'Dificultad',ready:'LISTO',unready:'CANCELAR LISTO',start:'EMPEZAR',save:'GUARDAR AJUSTES',invite:'INVITAR AMIGOS',load:'CARGAR AMIGOS',share:'COMPARTIR ENLACE',leave:'SALIR DE SALA',copy:'COPIAR CÓDIGO',copyLink:'ENLACE',back:'VOLVER',kick:'EXPULSAR',host:'ANFITRIÓN',readyState:'LISTO',notReady:'NO LISTO',createAction:'CREAR',noAuth:'Inicia sesión para jugar.',needUrl:'Configura la URL de Realtime Database.',notFound:'Sala no encontrada.',banned:'Has sido expulsado y no puedes volver.',full:'Sala llena.',layoutMismatch:'Gira el dispositivo para unirte.',mustReady:'Todos deben estar listos; mínimo dos.',engine:'¡Todos listos! El juego llegará en la actualización 2.',onlyHost:'Solo el anfitrión puede administrar.',settingsChanged:'Ajustes cambiados. Todos deben volver a estar listos.',inviteSent:'Invitación enviada.',inviteFail:'No se pudo invitar; comparte el enlace.',inviteEmpty:'Sin invitaciones.',noFriends:'No se encontraron amigos.',kickConfirm:'¿Expulsar y bloquear permanentemente en esta sala?',kicked:'Has sido expulsado.',left:'Has salido.',joined:'Conectado.',roomClosed:'Sala cerrada.',roomChanged:'Sala cambiada.',error:'Error',pending:'Conectando…',limit:'Solo amigos con permiso de presencia.',pendingLink:'Enlace de invitación detectado.',online:'Lobby activo',startTip:'Todos deben estar listos.',matchPending:'Actualización 1: solo lobby.',inviteJoin:'ENTRAR',inviteDecline:'DESCARTAR',roomLink:'Enlace copiado.',codeCopied:'Código copiado.',orientation:'Orientación',inviteNone:'También puedes compartir el enlace.'},
 PT:{title:'🐤 MULTIJOGADOR',subtitle:'SALAS E LOBBY · v2.5',create:'CRIAR SALA',join:'ENTRAR',joinBy:'ENTRAR COM CÓDIGO',invites:'CONVITES',db:'Conexão Realtime Database',dbHint:'Use a mesma URL da configuração de Friends.',saveDb:'SALVAR URL',players:'JOGADORES',map:'Mapa',capacity:'Jogadores',layout:'Orientação',diff:'Dificuldade',ready:'PRONTO',unready:'CANCELAR',start:'INICIAR',save:'SALVAR CONFIGURAÇÕES',invite:'CONVIDAR AMIGOS',load:'CARREGAR AMIGOS',share:'COMPARTILHAR LINK',leave:'SAIR DA SALA',copy:'COPIAR CÓDIGO',copyLink:'LINK',back:'VOLTAR',kick:'EXPULSAR',host:'ANFITRIÃO',readyState:'PRONTO',notReady:'NÃO PRONTO',createAction:'CRIAR',noAuth:'Entre na conta para jogar.',needUrl:'Informe a URL do banco de dados.',notFound:'Sala não encontrada.',banned:'Você foi expulso e não pode retornar.',full:'Sala cheia.',layoutMismatch:'Gire o dispositivo para entrar.',mustReady:'Todos devem estar prontos, mínimo dois.',engine:'Todos prontos! A partida virá na atualização 2.',onlyHost:'Só o anfitrião pode gerenciar.',settingsChanged:'Configurações alteradas. Todos devem ficar prontos novamente.',inviteSent:'Convite enviado.',inviteFail:'Não foi possível convidar; compartilhe o link.',inviteEmpty:'Sem convites.',noFriends:'Sem amigos carregados.',kickConfirm:'Expulsar e bloquear nesta sala permanentemente?',kicked:'Você foi expulso.',left:'Você saiu.',joined:'Conectado.',roomClosed:'Sala encerrada.',roomChanged:'Sala alterada.',error:'Erro',pending:'Conectando…',limit:'Amigos com permissão de presença.',pendingLink:'Link de sala detectado.',online:'Lobby conectado',startTip:'Todos prontos, mínimo dois.',matchPending:'Atualização 1: apenas lobby.',inviteJoin:'ENTRAR',inviteDecline:'DISPENSAR',roomLink:'Link copiado.',codeCopied:'Código copiado.',orientation:'Orientação',inviteNone:'Compartilhe o link para convidar amigos.'}}
;
const experienceWords={
 EN:{subtitle:'ROOMS & MATCHES · v2.8',rematch:'REMATCH',waitHost:'WAITING FOR HOST',roundInfo:'The host opens the next round. Everyone presses Ready again.',spectating:'SPECTATING',previous:'PREVIOUS',next:'NEXT',waitingResults:'Waiting for final results…',readyCount:'READY',connected:'CONNECTED',connecting:'CONNECTING',offline:'OFFLINE',preparing:'PREPARING RACE',lobby:'RETURN TO ROOM',createInvite:'Create a room to invite this friend.',inviteSent:'INVITATION SENT',inviteBusy:'SENDING…',inviteFail:'Could not invite. Check friendship and online-status permissions.',noFriends:'No available friends.',inviteNone:'Invite friends below or directly from your friends list.',personalResult:'YOUR RESULT',place:'PLACE',survival:'SURVIVAL TIME',roundChanged:'New round. Press Ready when you are ready.',invite:'INVITE',inRoom:'IN ROOM',locked:'MATCH IN PROGRESS'},
 RU:{subtitle:'КОМНАТЫ И МАТЧИ · v2.8',rematch:'РЕВАНШ',waitHost:'ОЖИДАЕМ ХОЗЯИНА',roundInfo:'Хозяин открывает следующий раунд. Всем нужно снова нажать «Готов».',spectating:'НАБЛЮДЕНИЕ',previous:'НАЗАД',next:'ДАЛЕЕ',waitingResults:'Ожидаем итоговые результаты…',readyCount:'ГОТОВЫ',connected:'ПОДКЛЮЧЕНО',connecting:'ПОДКЛЮЧЕНИЕ',offline:'НЕТ СВЯЗИ',preparing:'ПОДГОТОВКА ГОНКИ',lobby:'ВЕРНУТЬСЯ В КОМНАТУ',createInvite:'Создай комнату, чтобы пригласить этого друга.',inviteSent:'ПРИГЛАШЕНИЕ ОТПРАВЛЕНО',inviteBusy:'ОТПРАВКА…',inviteFail:'Не удалось пригласить. Проверь дружбу и разрешения показа онлайна.',noFriends:'Нет доступных друзей.',inviteNone:'Приглашай друзей здесь или прямо из списка друзей.',personalResult:'ТВОЙ РЕЗУЛЬТАТ',place:'МЕСТО',survival:'ВРЕМЯ ВЫЖИВАНИЯ',roundChanged:'Новый раунд. Нажми «Готов», когда будешь готов.',invite:'ПРИГЛАСИТЬ',inRoom:'В КОМНАТЕ',locked:'МАТЧ ИДЁТ'},
 ZH:{subtitle:'房间与比赛 · v2.8',rematch:'再来一局',waitHost:'等待房主',roundInfo:'房主开启下一轮后，所有人需要重新准备。',spectating:'观战',previous:'上一位',next:'下一位',waitingResults:'等待最终结果…',readyCount:'已准备',connected:'已连接',connecting:'连接中',offline:'离线',preparing:'比赛准备中',lobby:'返回房间',createInvite:'创建房间后邀请这位好友。',inviteSent:'邀请已发送',inviteBusy:'发送中…',inviteFail:'邀请失败，请检查好友和在线状态权限。',noFriends:'暂无可邀请好友。',inviteNone:'在此或好友列表中邀请。',personalResult:'你的成绩',place:'名次',survival:'生存时间',roundChanged:'新一轮，请重新准备。',invite:'邀请',inRoom:'已在房间',locked:'比赛进行中'},
 ES:{subtitle:'SALAS Y PARTIDAS · v2.8',rematch:'REVANCHA',waitHost:'ESPERANDO AL ANFITRIÓN',roundInfo:'El anfitrión abre la siguiente ronda. Todos deben prepararse de nuevo.',spectating:'OBSERVANDO',previous:'ANTERIOR',next:'SIGUIENTE',waitingResults:'Esperando resultados…',readyCount:'LISTOS',connected:'CONECTADO',connecting:'CONECTANDO',offline:'SIN CONEXIÓN',preparing:'PREPARANDO CARRERA',lobby:'VOLVER A LA SALA',createInvite:'Crea una sala para invitar a este amigo.',inviteSent:'INVITACIÓN ENVIADA',inviteBusy:'ENVIANDO…',inviteFail:'Comprueba la amistad y los permisos de presencia.',noFriends:'No hay amigos disponibles.',inviteNone:'Invita aquí o desde tu lista de amigos.',personalResult:'TU RESULTADO',place:'PUESTO',survival:'TIEMPO DE SUPERVIVENCIA',roundChanged:'Nueva ronda. Confirma que estás listo.',invite:'INVITAR',inRoom:'EN LA SALA',locked:'PARTIDA EN CURSO'},
 PT:{subtitle:'SALAS E PARTIDAS · v2.8',rematch:'REVANCHE',waitHost:'AGUARDANDO O ANFITRIÃO',roundInfo:'O anfitrião abre a próxima rodada. Todos devem ficar prontos novamente.',spectating:'ASSISTINDO',previous:'ANTERIOR',next:'PRÓXIMO',waitingResults:'Aguardando resultados…',readyCount:'PRONTOS',connected:'CONECTADO',connecting:'CONECTANDO',offline:'SEM CONEXÃO',preparing:'PREPARANDO CORRIDA',lobby:'VOLTAR À SALA',createInvite:'Crie uma sala para convidar este amigo.',inviteSent:'CONVITE ENVIADO',inviteBusy:'ENVIANDO…',inviteFail:'Confira a amizade e as permissões de presença.',noFriends:'Nenhum amigo disponível.',inviteNone:'Convide aqui ou pela lista de amigos.',personalResult:'SEU RESULTADO',place:'POSIÇÃO',survival:'TEMPO DE SOBREVIVÊNCIA',roundChanged:'Nova rodada. Confirme que está pronto.',invite:'CONVIDAR',inRoom:'NA SALA',locked:'PARTIDA EM ANDAMENTO'}
};
for(const [language,values] of Object.entries(experienceWords))Object.assign(words[language],values);
const T=k=>(words[lang()]||words.EN)[k]||words.EN[k]||k;
const ownUid=()=>auth.currentUser&&!auth.currentUser.isAnonymous?auth.currentUser.uid:null;
const roomPath=code=>'multiplayerRooms/'+code;
const codeValid=c=>/^FBM-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c)&&[...c.slice(4).replace('-','')].every(x=>alpha.includes(x));
const randCode=()=>{const a=crypto.getRandomValues(new Uint8Array(8));const v=Array.from(a,x=>alpha[x%alpha.length]).join('');return 'FBM-'+v.slice(0,4)+'-'+v.slice(4)};
const currentLayout=()=>innerWidth>=innerHeight?'LANDSCAPE':'PORTRAIT';
function parseCode(input){const v=String(input||'').trim();try{const u=new URL(v,location.href);const q=u.searchParams.get('fbRoom');if(q)return q.toUpperCase()}catch{}return v.toUpperCase()}
function dbUrl(v){try{const x=new URL(v);return x.protocol==='https:'&&/^(flying-bird-d6832)([.-][a-z0-9-]+)*\.(firebasedatabase\.app|firebaseio\.com)$/.test(x.hostname)&&x.pathname==='/'&&!x.search&&!x.hash&&!x.username&&!x.password?x.origin:null}catch{return null}}
let db=null,roomCode=null,roomData=null,mySeat=null,unRoom=null,unKicked=null,unInvites=null,authSeq=0,busy=false,roomToken=0,knownNames=new Map(),invites={},inviteCache=new Set(),matchLaunchPending=false;
let raceCosmeticsUnsub=null, roomConnectionUnsub=null, roomConnected=false, watchedVersion=null, pendingFriendInvite=null, friendLoadToken=0;
const pendingInvites=new Map();
const friendCache=new Map(), lastCodes=()=>{try{return JSON.parse(localStorage.getItem('flyingBirdMpKickedV1')||'[]')}catch{return []}};
// Each invite is checked against the live room. A recipient can delete their own stale invite.
const inviteRoomUnsubs=new Map(),inviteRoomStates=new Map(),inviteCleanupPending=new Set();
let inviteExpiryTimer=null;
const setDb=()=>{const url=dbUrl(window.flyingBirdGetRTDBURL?.()||localStorage.getItem('flyingBirdRTDBUrlV1')||'');if(!url)return false;try{db=db||getDatabase(app,url);warmRaceClock();return true}catch{return false}};
function say(msg,bad=false){const e=$('fbMpNotice');e.hidden=!msg;e.textContent=msg||'';e.classList.toggle('error',bad)}
function show(view){queueMicrotask(renderInvites);for(const v of ['Home','Create','Lobby'])$('fbMp'+v).hidden=v!==view}
function setBusy(value){busy=value;queueMicrotask(renderInvites);for(const id of ['fbMpJoin','fbMpCreateRoom','fbMpReady','fbMpApplyConfig','fbMpLeave','fbMpStart'])$(id).disabled=value;if(!value&&roomData)renderLobby();}
function localCodeLink(c=roomCode){const u=new URL(location.href);u.searchParams.set('fbRoom',c);const endpoint=window.flyingBirdGetRTDBURL?.();if(endpoint)u.searchParams.set('fbDb',endpoint);u.hash='';return u.href}
async function copy(s){try{await navigator.clipboard.writeText(s)}catch{const t=document.createElement('textarea');t.value=s;document.body.append(t);t.select();document.execCommand('copy');t.remove()}}
function fillMaps(){for(const id of ['fbMpMap','fbMpLobbyMap']){const e=$(id);e.replaceChildren();for(const m of mapIds){const o=document.createElement('option');o.value=m;o.textContent=m.replaceAll('_',' ');e.append(o)}}}
fillMaps();
function renderLabels(){for(const [id,key] of Object.entries({fbMpTitle:'title',fbMpSubtitle:'subtitle',fbMpGoCreate:'create',fbMpGoJoin:'join',fbMpJoin:'joinBy',fbMpPlayersTitle:'players',fbMpReady:'ready',fbMpStart:'start',fbMpApplyConfig:'save',fbMpInviteTitle:'invite',fbMpLeave:'leave',fbMpCopy:'copy',fbMpCopyLink:'copyLink',fbMpCreateRoom:'createAction',fbMpCreateBack:'back'}))$(id).textContent=T(key);if(roomData)renderLobby()}
async function getCard(uid){if(knownNames.has(uid))return knownNames.get(uid);let c={nick:'PLAYER '+uid.slice(0,5),playerId:'',avatar:{skin:0,bg:0}};try{const s=await getDocFromServer(doc(fsdb,'publicProfiles',uid));if(s.exists())c={...c,...s.data()}}catch{}knownNames.set(uid,c);return c}
function pic(c){const cv=document.createElement('canvas');cv.width=cv.height=32;cv.className='mpAvatar';const g=cv.getContext('2d');const bgs=window.flyingBirdFriendAvatarBackgrounds||['#ff6b9d'];const pal=window.flyingBirdFriendSkinPalette||[];const a=c?.avatar||{},p=pal[Math.max(0,Number(a.skin)||0)]||pal[0]||{body:'#ffd23f',hi:'#ffe98a',wing:'#ff9f1c',belly:'#fff4d6'},bg=bgs[Math.abs(Number(a.bg)||0)%bgs.length];g.fillStyle=bg;g.fillRect(0,0,32,32);g.fillStyle='#2b1b00';g.fillRect(6,8,22,18);g.fillStyle=p.body;g.fillRect(7,9,19,16);g.fillRect(10,6,13,4);g.fillStyle=p.hi;g.fillRect(11,7,10,3);g.fillStyle=p.wing;g.fillRect(8,17,9,7);g.fillStyle=p.belly;g.fillRect(15,21,9,4);g.fillStyle='#fff';g.fillRect(19,11,6,6);g.fillStyle='#1a1033';g.fillRect(23,13,3,3);g.fillStyle='#ff9f1c';g.fillRect(26,18,5,3);return cv}
const el=(tag,text,cls)=>{const x=document.createElement(tag);if(text!=null)x.textContent=text;if(cls)x.className=cls;return x};
function memberSeats(){return Object.entries(roomData?.slots||{}).filter(([,v])=>v?.uid).sort((a,b)=>Number(a[0])-Number(b[0]))}
function seatFor(uid){return memberSeats().find(([,p])=>p.uid===uid)?.[0]??null}
function activeReady(p){return p.ready===true&&p.rev===roomData?.meta?.version}
function readyForMatch(){const v=memberSeats();return uniqueRoomSkins(roomData)&&v.length>=2&&v.every(([,x])=>activeReady(x))}
function readinessExplanation(){
 if(!uniqueRoomSkins(roomData))return skinText(2);
 const seats=memberSeats();
 if(seats.length<2)return lang()==='RU'?'Нужно хотя бы два участника.':'At least two players required.';
 const waiting=seats.filter(([,p])=>!activeReady(p)).map(([,p])=>knownNames.get(p.uid)?.nick||('PLAYER '+p.uid.slice(0,5)));
 if(waiting.length)return (lang()==='RU'?'Ожидаем готовность: ':'Waiting for Ready: ')+waiting.join(', ');
 return lang()==='RU'?'Все готовы. Хозяин может начать матч.':'Everyone is ready. Host can start.';
}
async function refreshPlayers(){const token=roomToken;const ids=memberSeats().map(([,v])=>v.uid);await Promise.all(ids.map(getCard));if(roomToken===token)renderLobby()}
function renderLobby(){if(!roomData||!roomCode)return;const host=roomData.hostUid===ownUid(),seats=memberSeats(),mine=seats.find(([,v])=>v.uid===ownUid()),vers=roomData.meta?.version??0;
 $('fbMpRoomCode').textContent=roomCode;$('fbMpRoomInfo').textContent=seats.length+'/'+roomData.meta.capacity+' · '+roomData.meta.layout+' · '+roomData.meta.diff;
 $('fbMpLayoutInfo').textContent=T('orientation')+': '+roomData.meta.layout;
 $('fbMpLobbyCapacity').value=String(roomData.meta.capacity);$('fbMpLobbyDifficulty').value=roomData.meta.diff;$('fbMpLobbyMap').value=roomData.meta.map;
 for(const id of ['fbMpLobbyCapacity','fbMpLobbyDifficulty','fbMpLobbyMap','fbMpApplyConfig'])$(id).disabled=!host||busy||!roomConnected||!!raceSnapshot||matchLaunchPending;
 $('fbMpReady').textContent=mine&&activeReady(mine[1])?T('unready'):T('ready');$('fbMpReady').disabled=busy||!mine||!roomConnected||!!raceSnapshot;
 $('fbMpReady').setAttribute('aria-pressed',String(!!mine&&activeReady(mine[1])));
 const count=seats.filter(([,p])=>activeReady(p)).length;
 $('fbMpReadySummary').textContent=T('readyCount')+' '+count+' / '+seats.length;
 $('fbMpConnection').textContent=T(roomConnected?'connected':'offline');
 $('fbMpConnection').dataset.state=roomConnected?'online':'offline';
 $('fbMpStart').disabled=busy||!host||!roomConnected||!readyForMatch()||!!raceSnapshot||matchLaunchPending;$('fbMpStartInfo').textContent=raceSnapshot?T('locked'):matchLaunchPending?T('preparing'):readinessExplanation();
 const list=$('fbMpPlayers');list.replaceChildren();for(const [seat,p] of seats){const c=knownNames.get(p.uid)||{nick:'PLAYER '+p.uid.slice(0,5),avatar:{skin:0,bg:0}},entry=el('div',null,'mpCard mpPlayer'),text=el('div',null,'mpIdentity');text.append(el('strong',c.nick+(p.uid===roomData.hostUid?' · '+T('host'):'')),el('small',(c.playerId||p.uid.slice(0,9))+' · #'+(Number(seat)+1)));
 const flag=el('span',activeReady(p)?T('readyState'):T('notReady'),'mpFlag'+(activeReady(p)?' ready':''));entry.append(pic(c),text,flag);
 if(host&&p.uid!==ownUid()&&!raceSnapshot){const b=el('button',T('kick'),'danger');b.type='button';b.onclick=()=>void kick(p.uid);entry.append(b)}list.append(entry)}
 updateInviteButtons();
 if(pendingFriendInvite&&roomConnected&&!busy&&!raceSnapshot){const friend=pendingFriendInvite;pendingFriendInvite=null;void invite(friend);}
}
// Lobby equipment is reserved by the server, independently of profile avatars.
const skinWords={EN:['Change your skin','TAKEN','Players must choose different skins.'],RU:['Смени скин','ЗАНЯТ','Игроки должны выбрать разные скины.'],ZH:['请更换外观','已占用','玩家必须选择不同外观。'],ES:['Cambia tu aspecto','OCUPADO','Los jugadores deben elegir aspectos distintos.'],PT:['Troque sua aparência','OCUPADO','Os jogadores devem escolher aparências diferentes.']};
const skinText=i=>(skinWords[lang()]||skinWords.EN)[i];
let skinChoosing=false,skinClaimBusy=false;
function takenSkins(data=roomData){return Object.values(data?.slots||{}).filter(p=>p?.uid!==ownUid()&&Number.isInteger(p?.skin)).map(p=>p.skin)}
function uniqueRoomSkins(data){const seats=Object.values(data?.slots||{}).filter(p=>p?.uid);const ids=seats.map(p=>p.skin);return seats.length>0&&ids.every(n=>Number.isInteger(n)&&n>=0&&n<=31)&&new Set(ids).size===ids.length}
async function claimLobbySkin(skin){
 const code=roomCode,seat=mySeat,uid=ownUid();
 if(!code||seat===null||!roomConnected||raceSnapshot||takenSkins().includes(skin))return false;
 try{
  await update(ref(db,roomPath(code)+'/slots/'+seat),{skin,ready:false});
  return code===roomCode&&uid===ownUid()&&seat===mySeat;
 }catch(e){if(code===roomCode)say(skinText(0)+' · '+(e.code||e.message),true);return false}
}
function chooseLobbySkin(){
 if(skinChoosing||!roomCode||raceSnapshot)return;
 skinChoosing=true;modal.hidden=true;
 window.flyingBirdOpenSkinInventory?.({
  message:skinText(0),taken:skinText(1),blocked:()=>takenSkins(),
  choose:skin=>claimLobbySkin(skin),
  done:()=>{skinChoosing=false;modal.hidden=false;show('Lobby');say('');renderLobby();},
  cancel:()=>{skinChoosing=false;modal.hidden=false;void leaveRoom();}
 });
}
async function ensureLobbySkin(){
 if(skinClaimBusy||skinChoosing||!roomConnected||raceSnapshot||!roomCode||mySeat===null)return;
 const mine=roomData?.slots?.[mySeat];if(!mine||mine.uid!==ownUid())return;
 const wanted=equippedRaceCosmetics().skin;
 if(mine.skin===wanted&&!takenSkins().includes(wanted))return;
 if(takenSkins().includes(wanted)){chooseLobbySkin();return}
 skinClaimBusy=true;const code=roomCode;
 try{if(!await claimLobbySkin(wanted)&&roomCode===code)chooseLobbySkin();}finally{skinClaimBusy=false;}
}

function clearListeners(){skinChoosing=false;window.flyingBirdCloseSkinInventory?.();matchLaunchPending=false;pendingInvites.clear();watchedVersion=null;friendLoadToken++;roomConnectionUnsub?.();roomConnectionUnsub=null;roomConnected=false;roomToken++;unRoom?.();unKicked?.();unMatch?.();unMatch=null;unRoom=null;unKicked=null;roomCode=null;roomData=null;mySeat=null;raceCleanup();knownNames.clear()}
async function leaveRoom({silent=false,kicked=false,closeRoom=true}={}){const activeRace=race;if(activeRace?.me.alive)void raceFinish('DNF');if(activeRace?.finalWritePromise)await waitRaceWrite(activeRace.finalWritePromise);const code=roomCode,seat=mySeat,data=roomData;clearListeners();show('Home');if(!code||!db)return;const r=ref(db,roomPath(code));try{
 if(!kicked&&seat!==null){const host=data?.hostUid===ownUid(),seats=Object.entries(data?.slots||{}).filter(([,x])=>x?.uid&&x.uid!==ownUid()).sort((a,b)=>Number(a[0])-Number(b[0]));
 if(host&&seats.length){try{await set(ref(db,roomPath(code)+'/hostUid'),seats[0][1].uid)}catch(e){if(!silent)say(T('error')+': '+e.message,true);return}}
 const me=ref(db,roomPath(code)+'/slots/'+seat);try{await remove(me)}catch{}
 try{await onDisconnect(me).cancel()}catch{}
 try{await remove(ref(db,roomPath(code)+'/seatOf/'+ownUid()))}catch{}
 if(host&&!seats.length&&closeRoom){try{await remove(r)}catch{}}
 }
 if(!silent)say(kicked?T('kicked'):T('left'));
}catch(e){if(!silent)say(T('error')+': '+e.message,true)}}
function attach(code,slot){clearListeners();roomCode=code;mySeat=slot;const token=roomToken,r=ref(db,roomPath(code));show('Lobby');
 roomConnectionUnsub=onValue(ref(db,'.info/connected'),snap=>{if(token!==roomToken)return;roomConnected=snap.val()===true;renderLobby();if(race?.finished)updateRematchButton();void ensureLobbySkin();});unRoom=onValue(r,s=>{if(token!==roomToken)return;if(!s.exists()){if(race&&!race.finished)return;void leaveRoom({silent:true,kicked:true});say(T('roomClosed'),true);return}roomData=s.val();if(roomData.bans?.[ownUid()]===true){void leaveRoom({silent:true,kicked:true});say(T('kicked'),true);return}const seatNow=seatFor(ownUid());if(seatNow===null){if(race||raceStarting)return;void leaveRoom({silent:true,kicked:true});say(T('kicked'),true);return}mySeat=seatNow;
 // The old host might have disconnected without transferring privileges; elect one remaining member.
 if(!memberSeats().some(([,p])=>p.uid===roomData.hostUid)&&seatNow===memberSeats()[0]?.[0])void set(ref(db,roomPath(code)+'/hostUid'),ownUid()).catch(()=>{});
 if(watchedVersion!==roomData.meta.version){
  const wasRound=watchedVersion!==null;
  if((document.fullscreenElement||document.webkitFullscreenElement)===raceUI){try{Promise.resolve((document.exitFullscreen||document.webkitExitFullscreen).call(document)).catch(()=>{})}catch{}}
  watchedVersion=roomData.meta.version;raceCleanup();matchLaunchPending=false;
  modal.hidden=false;show('Lobby');watchRace(code,watchedVersion);void loadFriends();
  if(wasRound)say(T('roundChanged'));
 }
 renderLobby();void refreshPlayers();void ensureLobbySkin();
 if(race?.finished)updateRematchButton();
 },err=>{if(token!==roomToken)return;void leaveRoom({silent:true,kicked:true});say(T('kicked')+' ('+err.code+')',true)});
 unKicked=onValue(ref(db,roomPath(code)+'/bans/'+ownUid()),snap=>{if(token!==roomToken)return;if(snap.val()===true){try{const x=new Set(lastCodes());x.add(code);localStorage.setItem('flyingBirdMpKickedV1',JSON.stringify([...x].slice(-50)))}catch{}void leaveRoom({silent:true,kicked:true});say(T('kicked'),true)}});
}

function validRoom(r){return r&&r.meta&&[3,5,10].includes(r.meta.capacity)&&['PORTRAIT','LANDSCAPE'].includes(r.meta.layout)}
async function createRoom(){
 if(busy||roomCode)return;
 if(!ownUid()){say(T('noAuth'),true);return}
 if(!setDb()){say(T('needUrl'),true);return}
 setBusy(true);say(T('pending'));
 let stage='CHECK_CODE',code='',roomSaved=false;
 try{
  for(let i=0;i<6;i++){
   const candidate=randCode();
   const snap=await get(ref(db,roomPath(candidate)));
   if(!snap.exists()){code=candidate;break}
  }
  if(!code)throw Error('Cannot allocate room code');
  stage='WRITE_ROOM';
  const uid=ownUid(),data={hostUid:uid,meta:{capacity:Number($('fbMpCapacity').value),layout:$('fbMpLayout').value,map:$('fbMpMap').value,diff:$('fbMpDifficulty').value,version:0,createdAt:rtStamp()},seatOf:{[uid]:'0'},slots:{'0':{uid,skin:equippedRaceCosmetics().skin,ready:false,rev:0,joinedAt:rtStamp()}}};
  await set(ref(db,roomPath(code)),data);
  roomSaved=true;
  stage='REGISTER_ONDISCONNECT';
  const seatRef=ref(db,roomPath(code)+'/slots/0');
  await onDisconnect(seatRef).remove();
  say('');attach(code,'0');

 }catch(e){
  const codeText=(typeof e?.code==='string'?e.code:'')||'';
  const detail=stage+' · '+(codeText||e?.message||String(e));
  console.error('[Flying Bird Multiplayer] Create room failed:',{stage,roomSaved,roomCode:code,error:e});
  say(T('error')+': '+detail+(roomSaved?' · Room was written but disconnect cleanup failed. Check multiplayerRooms in RTDB.':'') ,true);
 }finally{setBusy(false)}
}
async function joinRoom(input){if(busy)return;if(roomCode){show('Lobby');return;}const code=parseCode(input);if(!codeValid(code)){say(T('notFound'),true);return}if(!ownUid()){say(T('noAuth'),true);return}if(!setDb()){say(T('needUrl'),true);return}if(lastCodes().includes(code)){say(T('banned'),true);return}setBusy(true);say(T('pending'));try{const s=await get(ref(db,roomPath(code)));if(!s.exists())throw Error(T('notFound'));const room=s.val();if(room.bans?.[ownUid()])throw Error(T('banned'));if(!validRoom(room))throw Error(T('notFound'));if(room.meta.layout!==currentLayout())throw Error(T('layoutMismatch'));
 const activeRound=await get(ref(db,raceRoot(code,room.meta.version)+'/meta'));if(activeRound.exists())throw Error(RT('noRestart'));
 const existing=Object.entries(room.slots||{}).find(([,v])=>v?.uid===ownUid());if(existing){attach(code,existing[0]);void dismissInvite(code);say('');return}
 const indexRef=ref(db,roomPath(code)+'/seatOf/'+ownUid());let seat=null;const claimed=room.seatOf?.[ownUid()];if(typeof claimed==='string'&&!room.slots?.[claimed]){seat=claimed} else {for(let i=0;i<room.meta.capacity;i++){if(!room.slots?.[String(i)]){seat=String(i);break}}}
 if(seat===null)throw Error(T('full'));await set(indexRef,seat);
 let joined=false;for(let i=0;i<room.meta.capacity;i++){const n=String((Number(seat)+i)%room.meta.capacity),slotRef=ref(db,roomPath(code)+'/slots/'+n);
 // Seat index must point at the selected free seat. Only an inactive claim can move.
 if(n!==seat)await set(indexRef,n);
 const r=await runTransaction(slotRef,old=>old===null?{uid:ownUid(),ready:false,rev:room.meta.version,joinedAt:rtStamp()}:undefined,{applyLocally:false});
 if(r.committed&&r.snapshot.val()?.uid===ownUid()){seat=n;joined=true;break}
 }
 if(!joined){try{await remove(indexRef)}catch{}throw Error(T('full'))}
 await onDisconnect(ref(db,roomPath(code)+'/slots/'+seat)).remove();
 // Keep room visible; invite code is removed to prevent recurring autojoin.
 try{const url=new URL(location.href);url.searchParams.delete('fbRoom');history.replaceState(null,'',url.href)}catch{}
 attach(code,seat);void dismissInvite(code);say(T('joined'));
 }catch(e){const msg=(e?.code==='PERMISSION_DENIED'||e?.code==='permission-denied')?T('banned')+' / '+T('full'):e.message;say(T('error')+': '+msg,true)}finally{setBusy(false)}}
async function kick(uid){if(raceSnapshot)return;if(!roomCode||!roomData||roomData.hostUid!==ownUid()||uid===ownUid())return;if(!confirm(T('kickConfirm')))return;const code=roomCode,slot=seatFor(uid);if(slot===null)return;try{
 // Bans are irreversible for the room and protected by RTDB rules. Ban FIRST, then remove seat.
 await set(ref(db,roomPath(code)+'/bans/'+uid),true);
 await remove(ref(db,roomPath(code)+'/slots/'+slot));
 // The banned user's stale seatOf index is not usable again (the join rule checks bans).
 say('');
 }catch(e){say(T('error')+': '+e.message,true)}}
async function changeReady(){
 if(raceSnapshot||!roomConnected||!roomCode||!roomData||mySeat===null||busy)return;
 const me=roomData.slots?.[mySeat],code=roomCode,seat=mySeat,uid=ownUid();
 if(me?.uid!==uid)return;
 setBusy(true);say('');
 try{
  // The lobby may still be receiving a new settings version; do not write stale rev.
  const newest=await get(ref(db,roomPath(code)));
  const data=newest.val();
  if(!data||data.slots?.[seat]?.uid!==uid)throw Error('Seat has changed. Rejoin the lobby.');
  const version=Number(data.meta?.version);
  if(!Number.isInteger(version))throw Error('Room version is missing.');
  if(!uniqueRoomSkins(data)||data.slots[seat].skin!==equippedRaceCosmetics().skin){roomData=data;void ensureLobbySkin();throw Error(skinText(2));}
  const active=data.slots[seat].ready===true&&data.slots[seat].rev===version;
  await update(ref(db,roomPath(code)+'/slots/'+seat),{ready:!active,rev:version});
 }catch(e){say(T('error')+': READY · '+(e?.code||e?.message||String(e)),true)}
 finally{setBusy(false)}
}
async function saveConfig(){if(raceSnapshot)return;if(!roomData||!roomCode||roomData.hostUid!==ownUid()){say(T('onlyHost'),true);return}const m=roomData.meta,capacity=Number($('fbMpLobbyCapacity').value);if(memberSeats().some(([seat])=>Number(seat)>=capacity)){say(T('full'),true);return}const nm={...m,capacity,map:$('fbMpLobbyMap').value,diff:$('fbMpLobbyDifficulty').value,version:m.version+1};try{await set(ref(db,roomPath(roomCode)+'/meta'),nm);say(T('settingsChanged'))}catch(e){say(T('error')+': '+e.message,true)}}
async function loadFriends(){
 if(!ownUid()||!roomCode)return;
 const token=++friendLoadToken,code=roomCode,uid=ownUid(),target=$('fbMpFriends');
 target.textContent=T('pending');friendCache.clear();
 try{
  const base=collection(fsdb,'friendRequests');
  const [a,b,blocked]=await Promise.all([getDocsFromServer(query(base,where('fromUid','==',uid),limit(50))),getDocsFromServer(query(base,where('toUid','==',uid),limit(50))),getDocsFromServer(query(collection(fsdb,'blocks',uid,'users'),limit(100)))]);
  const blocks=new Set(blocked.docs.map(x=>x.id)),ids=new Set();
  for(const x of [...a.docs,...b.docs]){const p=x.data(),peer=p.fromUid===uid?p.toUid:p.fromUid;if(p.status==='accepted'&&!blocks.has(peer))ids.add(peer);}
  const cards=await Promise.all([...ids].map(async id=>[id,await getCard(id)]));
  if(token!==friendLoadToken||code!==roomCode||uid!==ownUid())return;
  target.replaceChildren();if(!cards.length){target.textContent=T('noFriends');return;}
  for(const [id,c] of cards){friendCache.set(id,c);const row=el('div',null,'mpCard mpPlayer'),name=el('div',null,'mpIdentity');name.append(el('strong',c.nick),el('small',c.playerId||''));
   const button=el('button',T('invite'));button.type='button';button.dataset.inviteUid=id;
   button.onclick=async()=>{button.disabled=true;button.textContent=T('inviteBusy');const sent=await invite(id);if(button.isConnected){button.textContent=T(sent?'inviteSent':'invite');updateInviteButtons();}};
   row.append(pic(c),name,button);target.append(row);
  }
  updateInviteButtons();
 }catch(e){if(token===friendLoadToken)target.textContent=T('error')+': '+e.message;}
}
function updateInviteButtons(){
 for(const button of $('fbMpFriends').querySelectorAll('[data-invite-uid]')){
  const uid=button.dataset.inviteUid,inRoom=seatFor(uid)!==null;
  button.disabled=!window.flyingBirdFriendOnline?.(uid)||inRoom||!!raceSnapshot||!roomConnected||(Date.now()-(pendingInvites.get(roomCode+'/'+uid)||0)<11000);
  button.textContent=T(inRoom?'inRoom':raceSnapshot?'locked':(Date.now()-(pendingInvites.get(roomCode+'/'+uid)||0)<11000)?'inviteSent':'invite');
 }
}
async function invite(toUid){
 if(!db||!roomCode||!roomConnected||raceSnapshot||toUid===ownUid()||!window.flyingBirdFriendOnline?.(toUid))return false;
 const code=roomCode,key=code+'/'+toUid,uid=ownUid();
 if(Date.now()-(pendingInvites.get(key)||0)<11000)return true;
 pendingInvites.set(key,Date.now());
 setTimeout(()=>{if(Date.now()-(pendingInvites.get(key)||0)>=11000){pendingInvites.delete(key);updateInviteButtons();}},11100);
 try{
  const online=await get(ref(db,'presence/'+toUid+'/connections'));
  if(!Object.values(online.val()||{}).some(v=>v===true)||uid!==ownUid()||code!==roomCode||!roomConnected||raceSnapshot)throw Error(T('offline'));
  await set(ref(db,'multiplayerInvites/'+toUid+'/'+code),{fromUid:uid,createdAt:rtStamp(),expiresAt:Date.now()+15*60*1000});
  if(code===roomCode)say(T('inviteSent'));return true;
 }catch(e){pendingInvites.delete(key);if(code===roomCode)say(T('inviteFail')+' ('+(e.code||e.message)+')',true);return false;}
 finally{updateInviteButtons();}
}
window.flyingBirdInviteFriend=async uid=>{
 if(!ownUid()||!window.flyingBirdFriendOnline?.(uid))return false;
 if(roomCode){if(raceSnapshot){say(T('locked'),true);return false;}return invite(uid);}
 pendingFriendInvite=uid;document.getElementById('fbfPanel').hidden=true;
 open();show('Create');$('fbMpLayout').value=currentLayout();say(T('createInvite'));return null;
};
function stopInviteRoomChecks(){
 for(const off of inviteRoomUnsubs.values())off();
 inviteRoomUnsubs.clear();inviteRoomStates.clear();
 if(inviteExpiryTimer!==null){clearTimeout(inviteExpiryTimer);inviteExpiryTimer=null;}
}
async function dismissInvite(code){
 const uid=ownUid();if(!db||!uid||!codeValid(code)||inviteCleanupPending.has(uid+'/'+code))return;
 const key=uid+'/'+code;inviteCleanupPending.add(key);
 try{
  const inviteRef=ref(db,'multiplayerInvites/'+uid+'/'+code);
  // A deletion of a non-existent invitation is rejected by our strict RTDB rules.
  const snap=await get(inviteRef);
  if(snap.exists())await remove(inviteRef);
 }catch(e){console.warn('[Flying Bird] Invitation cleanup:',code,e?.code||e?.message||e)}
 finally{inviteCleanupPending.delete(key)}
}
function syncInviteRoomChecks(){
 const uid=ownUid();if(!uid||!db)return;
 const entries=Object.entries(invites||{});
 const live=new Set(entries.filter(([code,inv])=>codeValid(code)&&inv?.expiresAt>Date.now()).map(([code])=>code));
 for(const [code,off] of inviteRoomUnsubs){if(!live.has(code)){off();inviteRoomUnsubs.delete(code);inviteRoomStates.delete(code)}}
 for(const [code,inv] of entries){
  if(!codeValid(code))continue;
  if(!live.has(code)){void dismissInvite(code);continue;}
  if(inviteRoomUnsubs.has(code))continue;
  inviteRoomStates.set(code,'checking');
  const off=onValue(ref(db,roomPath(code)),snapshot=>{
   if(!invites[code]||uid!==ownUid())return;
   const room=snapshot.val();
   const obsolete=!validRoom(room)||room.bans?.[uid]===true||Object.values(room.slots||{}).some(s=>s?.uid===uid);
   if(obsolete){inviteRoomStates.set(code,'stale');renderInvites();void dismissInvite(code)}
   else{inviteRoomStates.set(code,'valid');renderInvites()}
  },error=>{
   if(uid!==ownUid())return;
   inviteRoomStates.set(code,'stale');renderInvites();
   // The room may now be inaccessible because the recipient was banned.
   if(error?.code==='PERMISSION_DENIED'||error?.code==='permission-denied')void dismissInvite(code);
  });
  inviteRoomUnsubs.set(code,off);
 }
 if(inviteExpiryTimer!==null)clearTimeout(inviteExpiryTimer);
 const nextExpiry=entries.map(([,x])=>Number(x?.expiresAt)||0).filter(t=>t>Date.now()).sort((a,b)=>a-b)[0];
 inviteExpiryTimer=nextExpiry?setTimeout(()=>{inviteExpiryTimer=null;syncInviteRoomChecks();renderInvites()},Math.max(100,nextExpiry-Date.now()+100)):null;
 renderInvites();
}
function watchInvites(){
 unInvites?.();unInvites=null;stopInviteRoomChecks();invites={};
 const uid=ownUid();if(!uid||!setDb())return;
 unInvites=onValue(ref(db,'multiplayerInvites/'+uid),snap=>{
  if(uid!==ownUid())return;
  invites=snap.val()||{};syncInviteRoomChecks();
 },e=>{invites={};stopInviteRoomChecks();renderInvites();console.warn('[Flying Bird] Invitations:',e?.code||e.message)});
}
const toastWords={
 EN:{title:'ROOM INVITATION',accept:'Accept',decline:'Decline',busy:'Leave your current room to accept.',failed:'Could not complete the action. Try again.'},
 RU:{title:'ПРИГЛАШЕНИЕ В КОМНАТУ',accept:'Принять',decline:'Отклонить',busy:'Для входа покинь текущую комнату.',failed:'Не удалось выполнить действие. Попробуй ещё раз.'},
 ZH:{title:'房间邀请',accept:'接受',decline:'拒绝',busy:'请先离开当前房间。',failed:'操作失败，请重试。'},
 ES:{title:'INVITACIÓN A LA SALA',accept:'Aceptar',decline:'Rechazar',busy:'Sal de la sala actual para aceptar.',failed:'No se pudo completar. Reintenta.'},
 PT:{title:'CONVITE PARA SALA',accept:'Aceitar',decline:'Recusar',busy:'Saia da sala atual para aceitar.',failed:'Não foi possível concluir. Tente novamente.'}
};
const toastText=k=>(toastWords[lang()]||toastWords.EN)[k];
const inviteActions=new Set();
function positionInviteToast(){
 const box=$('fbMpInviteToasts'),canvas=$('c'),rect=canvas.getBoundingClientRect();
 const scale=rect.width/(Number(canvas.dataset.logicalWidth)||320);
 const vp=window.visualViewport,left=vp?.offsetLeft||0,top=vp?.offsetTop||0,width=vp?.width||innerWidth,height=vp?.height||innerHeight;
 const fs=document.fullscreenElement||document.webkitFullscreenElement;
 const parent=fs&&fs!==canvas?fs:document.body;if(box.parentElement!==parent)parent.append(box);
 box.style.left=Math.max(left+8,Math.min(rect.left+8*scale,left+width-260))+'px';
 box.style.top=Math.max(top+8,Math.min(rect.top+38*scale,top+height-150))+'px';
 box.style.maxWidth=Math.max(180,width-16)+'px';
}
function renderInvites(){
 const box=$('fbMpInviteToasts');box.replaceChildren();
 const entries=Object.entries(invites||{}).filter(([c,x])=>codeValid(c)&&x?.expiresAt>Date.now()&&inviteRoomStates.get(c)==='valid').sort((a,b)=>a[1].createdAt-b[1].createdAt);
 box.hidden=!entries.length;if(!entries.length)return;
 // One compact card at a time; other invitations remain queued until acted on or expired.
 const [code,inv]=entries[0],uid=ownUid(),key=uid+'/'+code;
 const card=el('section',null,'mpInviteToast'),title=el('strong',toastText('title')),label=el('p',(knownNames.get(inv.fromUid)?.nick||'PLAYER')+' → '+code),row=el('div',null,'mpInviteActions'),join=el('button',toastText('accept')),deny=el('button',toastText('decline'));
 card.setAttribute('role','status');join.type=deny.type='button';join.disabled=!!roomCode||busy||inviteActions.has(key);deny.disabled=inviteActions.has(key);join.title=roomCode?toastText('busy'):'';
 join.onclick=async()=>{if(roomCode||busy||inviteActions.has(key)||uid!==ownUid())return;inviteActions.add(key);renderInvites();window.flyingBirdPauseForOverlay?.();open();try{await joinRoom(code)}finally{inviteActions.delete(key);renderInvites()}};
 deny.onclick=async()=>{if(inviteActions.has(key)||uid!==ownUid())return;inviteActions.add(key);renderInvites();try{await dismissInvite(code)}finally{inviteActions.delete(key);renderInvites()}};
 row.append(join,deny);card.append(title,label,row);if(entries.length>1)card.append(el('small','+'+(entries.length-1)));box.append(card);positionInviteToast();
 void getCard(inv.fromUid).then(c=>{if(label.isConnected&&uid===ownUid())label.textContent=c.nick+' → '+code});
}
window.addEventListener('flyingbird:layout',positionInviteToast);
window.addEventListener('resize',positionInviteToast);
window.visualViewport?.addEventListener('resize',positionInviteToast);
window.visualViewport?.addEventListener('scroll',positionInviteToast);
document.addEventListener('fullscreenchange',positionInviteToast);
document.addEventListener('webkitfullscreenchange',positionInviteToast);
window.addEventListener('flyingbird:friend-presence',updateInviteButtons);
window.addEventListener('flyingbird:progress-changed',renderInvites);
// Multiplayer Update 2 — one-shot deterministic survival match. This module lives inside
// the existing Multiplayer scope; it never calls the solo game score/wallet/save logic.
let unMatch=null, race=null, raceSnapshot=null, raceOnDisconnect=null, raceRaf=0;
let raceServerOffset=0, raceClockReady=false, raceClockUnsub=null, raceStarting=false, raceConnectionUnsub=null;
let raceFeedSubs=[],raceFeedToken=0,raceFeedLoading=false,racePendingStart=null;
const raceRoot=(code,version=roomData?.meta?.version)=>roundPath(code,version);
// Use the RTDB client clock offset before creating or entering a room. Every client
// must agree on the same startAt; local wall-clock skew cannot be trusted.
function warmRaceClock(){
 if(!db||raceClockUnsub)return;
 raceClockUnsub=onValue(ref(db,'.info/serverTimeOffset'),snap=>{
  const offset=snap.val();
  if(typeof offset==='number'&&Number.isFinite(offset)){
   raceServerOffset=offset;raceClockReady=true;
  }
 },err=>console.warn('[Flying Bird MP] Clock offset:',err));
}
function readRaceServerOffset(){
 warmRaceClock();
 if(raceClockReady)return Promise.resolve(raceServerOffset);
 return new Promise((resolve,reject)=>{
  let done=false,off=()=>{};
  const finish=(ok,val)=>{if(done)return;done=true;clearTimeout(timeout);queueMicrotask(()=>off());ok?resolve(val):reject(Error('CLOCK_SYNC · Firebase server clock unavailable'));};
  const timeout=setTimeout(()=>finish(false),2800);
  try{
   off=onValue(ref(db,'.info/serverTimeOffset'),snap=>{
    const n=snap.val();if(typeof n==='number'&&Number.isFinite(n)){
     raceServerOffset=n;raceClockReady=true;finish(true,n);
    }
   },()=>finish(false));
  }catch{finish(false)}
 });
}
const RACE_FPS=60, RACE_STEP=1000/RACE_FPS, RACE_PHASE=1800;
const RACE_GRAVITY=.26, RACE_FLAP=-4.4, RACE_PIPE_WIDTH=52;
const RACE_WORDS={
 EN:{title:'LAST BIRD STANDING',loading:'Preparing the shared course…',countdown:'READY',go:'GO!',time:'SURVIVAL',alive:'ALIVE',dead:'ELIMINATED',dnf:'DISCONNECTED',survived:'WINNER',winner:'LAST BIRD STANDING!',tie:'SHARED PLACE',finished:'MATCH RESULTS',exit:'EXIT MATCH',exitConfirm:'Leave this match? You will be eliminated and cannot return.',instructions:'TAP / SPACE TO FLAP · Last survivor wins',stage:'SPEED',wait:'WAITING FOR THE START',startError:'Cannot start match',onlineError:'Lost connection: eliminated',noRestart:'This match has already begun; joining late is disabled.'},
 RU:{title:'ПОСЛЕДНЯЯ ПТИЦА',loading:'Подготовка общей трассы…',countdown:'ПРИГОТОВЬСЯ',go:'ВПЕРЁД!',time:'ВРЕМЯ',alive:'В ИГРЕ',dead:'ВЫБЫЛ',dnf:'ОТКЛЮЧИЛСЯ',survived:'ПОБЕДИТЕЛЬ',winner:'ПОСЛЕДНЯЯ ВЫЖИВШАЯ ПТИЦА!',tie:'ОБЩЕЕ МЕСТО',finished:'РЕЗУЛЬТАТЫ МАТЧА',exit:'ВЫЙТИ ИЗ МАТЧА',exitConfirm:'Покинуть матч? Ты выбываешь и не сможешь вернуться.',instructions:'НАЖМИ / ПРОБЕЛ — ВЗМАХ · ПОБЕЖДАЕТ ПОСЛЕДНИЙ',stage:'СКОРОСТЬ',wait:'ОЖИДАНИЕ СТАРТА',startError:'Не удалось запустить матч',onlineError:'Соединение потеряно: поражение',noRestart:'Матч уже начался, позднее подключение запрещено.'},
 ZH:{title:'最后生存的小鸟',loading:'正在准备共同赛道…',countdown:'准备',go:'开始!',time:'生存时间',alive:'存活',dead:'淘汰',dnf:'掉线',survived:'获胜',winner:'最后生存者获胜!',tie:'并列',finished:'比赛结果',exit:'退出比赛',exitConfirm:'退出将被淘汰且无法重新加入。',instructions:'点击 / 空格 挥翅 · 最后幸存者获胜',stage:'速度',wait:'等待开始',startError:'开始失败',onlineError:'连接中断',noRestart:'比赛已经开始。'},
 ES:{title:'ÚLTIMO PÁJARO EN PIE',loading:'Preparando circuito común…',countdown:'PREPARADOS',go:'¡YA!',time:'SUPERVIVENCIA',alive:'VIVO',dead:'ELIMINADO',dnf:'DESCONECTADO',survived:'GANADOR',winner:'¡ÚLTIMO SUPERVIVIENTE!',tie:'EMPATE',finished:'RESULTADOS',exit:'SALIR',exitConfirm:'¿Salir? Quedarás eliminado sin poder volver.',instructions:'TOCAR / ESPACIO PARA VOLAR',stage:'VELOCIDAD',wait:'ESPERANDO',startError:'No se pudo iniciar',onlineError:'Conexión perdida',noRestart:'La carrera ya comenzó.'},
 PT:{title:'ÚLTIMO PÁSSARO VIVO',loading:'Preparando percurso…',countdown:'PREPARE-SE',go:'VAI!',time:'SOBREVIVÊNCIA',alive:'VIVO',dead:'ELIMINADO',dnf:'DESCONECTADO',survived:'VENCEDOR',winner:'ÚLTIMO SOBREVIVENTE!',tie:'EMPATE',finished:'RESULTADOS',exit:'SAIR',exitConfirm:'Sair elimina você definitivamente desta partida.',instructions:'TOQUE / ESPAÇO PARA VOAR',stage:'VELOCIDADE',wait:'AGUARDANDO INÍCIO',startError:'Falha ao iniciar',onlineError:'Conexão perdida',noRestart:'A partida já começou.'}
};
const RT=k=>(RACE_WORDS[lang()]||RACE_WORDS.EN)[k]||RACE_WORDS.EN[k]||k;
const raceUI=$('fbMpRace'),raceCanvas=$('fbMpRaceCanvas'),raceCtx=raceCanvas.getContext('2d');
const RC={ink:'#120e2f',yellow:'#ffd23f',cream:'#fff9e9'};
function raceWorld(layout){return layout==='LANDSCAPE'?{layout,w:640,h:360,ground:312,bx:140,spawnX:725,spacing:205}:{layout,w:320,h:480,ground:428,bx:76,spawnX:405,spacing:180}}
function serverClock(){return Date.now()+raceServerOffset}
function hash01(seed,index){let n=(seed ^ Math.imul(index+1,0x9e3779b1))>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296}
function courseSpeed(diff){return ({EASY:2.55,NORMAL:2.85,HARD:3.12,EXTREME:3.35})[diff]||2.85}
function distanceAt(t,base,world=null,diff=null){
 if(diff==='HARD'&&world){
  // Integrate piecewise-constant speed by shared passed-pipe distance, not client FPS.
  let remaining=Math.max(0,t),travel=0;
  for(let tier=0;tier<10;tier++){
   const end=world.spawnX-world.bx+52+(16*(tier+1)-1)*world.spacing;
   const speed=base*(1+tier*.052),duration=(end-travel)/speed;
   if(remaining<=duration)return travel+remaining*speed;
   remaining-=duration;travel=end;
  }
  return travel+remaining*base*1.52;
 }
 const stage=Math.floor(t/RACE_PHASE),part=t-stage*RACE_PHASE,accelerating=Math.min(stage,16);
 const cumulative=stage+.036*(accelerating*(accelerating-1)/2+(stage-accelerating)*16);
 return base*(RACE_PHASE*cumulative+part*(1+accelerating*.036))}
function pipeSpec(index,session){const cached=session.course[index];if(cached)return cached;
 const {world,meta}=session,baseGap=({EASY:156,NORMAL:146,HARD:136,EXTREME:130})[meta.diff]||146;
 let c=session.course.length?session.course[session.course.length-1].center:world.ground*.45;
 for(let i=session.course.length;i<=index;i++){
   const baseSpeed=courseSpeed(meta.diff),distance=i*world.spacing;
   // Approximate the difficulty stage when this obstacle reaches the playfield.
   let left=0,right=180000;for(let b=0;b<18;b++){const mid=(left+right)/2;if(distanceAt(mid,baseSpeed,world,meta.diff)<distance)left=mid;else right=mid}
   const stage=meta.diff==='HARD'?Math.min(10,Math.floor(i/16)):Math.min(16,Math.floor(right/RACE_PHASE));
   const gap=Math.max(meta.diff==='EASY'?118:105,baseGap-Math.min(26,stage*2));
   const mobile=meta.layout==='PORTRAIT';
   const amp=hash01(meta.seed,i+800)> (meta.diff==='EASY'?.86:meta.diff==='NORMAL'?.70:.58)? (meta.diff==='EXTREME'?17:13):0;
   const min=35+gap/2+amp,max=world.ground-35-gap/2-amp;
   const jitter=(hash01(meta.seed,i+191)*2-1)*(mobile?54:58);
   c=Math.max(min,Math.min(max,c+jitter+(world.ground*.45-c)*.10));
   session.course.push({center:c,gap,amp,phase:hash01(meta.seed,i+390)*6.283,stage,index:i});
 }
 return session.course[index];
}
function pipesNear(tick,session){const {world}=session,speed=courseSpeed(session.meta.diff),travel=distanceAt(tick,speed,world,session.meta.diff);
 // spawnX is the SAME for every device in the same room. A wider screen changes
 // what is visible, never when a pipe reaches the bird or the collision tick.
 const first=Math.max(0,Math.floor((travel-world.spawnX-110)/world.spacing)-1);
 const last=Math.max(first+1,Math.ceil((travel+world.w-world.spawnX+100)/world.spacing)+1);
 const result=[];
 for(let i=first;i<=last&&i<4000;i++){const p=pipeSpec(i,session),x=world.spawnX+i*world.spacing-travel;const top=p.center-p.gap/2+Math.sin(tick*.042+p.phase)*p.amp;result.push({...p,x,top})}return result}
function raceRecord(uid){return raceSnapshot?.players?.[uid]||null}
function aliveRace(r){return r?.status==='ALIVE'}
function raceMe(){return raceRecord(ownUid())}
function formatTime(ms){const value=Math.max(0,Math.floor(Number(ms)||0)),secs=Math.floor(value/1000);return String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0')+'.'+String(value%1000).padStart(3,'0')}
function raceStatusText(s){return s==='DEAD'?RT('dead'):s==='DNF'?RT('dnf'):s==='SURVIVED'?RT('survived'):RT('alive')}
function raceFit(){
 if(!race || raceUI.hidden)return;
 const field=$('fbMpRaceField'),rect=field.getBoundingClientRect();
 if(rect.width<1||rect.height<1)return;
 const world=race.world;
 // Keep all physics Y coordinates, bird X and spawn X fixed for the whole room.
 // Only the camera's horizontal field of view changes with screen aspect ratio.
 const logicalWidth=Math.max(160,Math.round(world.h*rect.width/rect.height));
 world.w=logicalWidth;
 const cssScale=rect.height/world.h;
 // Render at actual CSS-pixel resolution on large monitors when possible.
 // Previous 2.5x cap upscaled a 1600x900 buffer on a 2560x1440 screen.
 // High-density mobile displays are capped to avoid excessive GPU work.
 let density=Math.max(1,cssScale*Math.min(window.devicePixelRatio||1,2));
 const MAX_RENDER_PIXELS=4200000;
 density=Math.min(density,Math.sqrt(MAX_RENDER_PIXELS/(world.w*world.h)));
 const backingW=Math.max(1,Math.round(world.w*density));
 const backingH=Math.max(1,Math.round(world.h*density));
 if(raceCanvas.width!==backingW||raceCanvas.height!==backingH){
  raceCanvas.width=backingW;raceCanvas.height=backingH;
 }
 raceCanvas.style.width=Math.round(rect.width)+'px';
 raceCanvas.style.height=Math.round(rect.height)+'px';
}
function racePalette(map){const palette={CITY:['#241849','#5f4c9a','#4cd964'],MOUNTAINS:['#12294a','#5f88bb','#9edafb'],VOLCANO:['#35102c','#a74131','#ff9447'],SAKURA:['#3c184f','#b654a4','#f7a0c5'],NEON:['#07172c','#303f71','#35c9ea'],OCEAN:['#081e47','#195b85','#35c8c7'],VOLCANO_PLUS:['#2c0d22','#8d2534','#fa6d3d'],COSMIC:['#0c0e31','#4c3488','#9474f4'],FOREST:['#133329','#2a7151','#76c77c'],CRYSTAL:['#12264a','#487eaa','#a28df7'],DESERT:['#503322','#c38a55','#e7c28b']};return palette[map]||palette.CITY}
function rememberGhostSamples(data){
 if(!race)return;
 const arrival=performance.now();
 for(const [uid,p] of Object.entries(data.players||{})){
  if(uid===ownUid())continue;
  let track=race.ghostTracks.get(uid);
  if(!track){track=newGhostTrack();race.ghostTracks.set(uid,track)}
  if(acceptGhostPacket(track,p,arrival))race.net.remotes++;
 }
}
function ghostY(uid,p){
 const track=race?.ghostTracks.get(uid);
 if(!track)return Number(p.y)||0;
 const pos=ghostPosition(track,race.simTick,RACE_GRAVITY,0,race.world.ground-18);
 return pos===null?(Number(p.y)||0):pos;
}

// Equipment is deliberately a small, one-time RTDB write per round. The player
// controls their own cosmetics; other participants only read the immutable record.
// Never use the account avatar as the authoritative equipped bird skin.
const MP_TRAIL_IDS=new Set(['NONE','FIRE','WATER','LIGHTNING','RAINBOW','NATURE','GOLDEN','FROST','STARDUST','SHADOW','AURORA','HEART']);
function sanitizeRaceCosmetics(value){
 const max=window.flyingBirdFriendSkinPalette?.length||24;
 const n=Number(value?.skin);
 const skin=Number.isInteger(n)&&n>=0&&n<max?n:0;
 const trail=String(value?.trail||'NONE').toUpperCase();
 return {skin,trail:MP_TRAIL_IDS.has(trail)?trail:'NONE'};
}
function equippedRaceCosmetics(){
 try{
  const cfg=JSON.parse(localStorage.getItem('flyingBirdCfg')||'{}');
  const wallet=JSON.parse(localStorage.getItem('flyingBirdWallet')||'{}');
  const cosmetics=sanitizeRaceCosmetics(cfg);
  // Only purchased trails can be equipped (the solo game uses the same rule).
  if(cosmetics.trail!=='NONE'&&(!Array.isArray(wallet.trails)||!wallet.trails.includes(cosmetics.trail)))cosmetics.trail='NONE';
  return cosmetics;
 }catch{return {skin:0,trail:'NONE'}}
}
function watchRaceCosmetics(code,session){
 raceCosmeticsUnsub?.();raceCosmeticsUnsub=null;
 const uid=ownUid();
 raceCosmeticsUnsub=onValue(ref(db,session.path+'/cosmetics'),snap=>{
  if(race!==session||session.code!==code)return;
  const raw=snap.val()||{};const appearances=Object.create(null);
  for(const [id,choice] of Object.entries(raw)){
   if(!session.meta.roster?.[id])continue;
   appearances[id]=sanitizeRaceCosmetics(choice);
  }
  // Own appearance is fixed locally at the moment the match is joined, while
  // Firebase is still delivering the snapshot. The accepted server copy wins.
  session.cosmetics={...appearances,[uid]:appearances[uid]||session.myCosmetics};
 },err=>{if(race===session)console.warn('[Flying Bird MP] Cosmetics read:',err)});
 // This happens during the 10.5-second pre-start countdown; the RTDB rule
 // accepts exactly one immutable record from each roster member until start.
 void set(ref(db,session.path+'/cosmetics/'+uid),session.myCosmetics).catch(err=>{
  if(race===session){
   console.warn('[Flying Bird MP] Cosmetics publish (install v2.5 RTDB rules):',err);
   raceSetStatus('COSMETICS_SYNC · '+(err?.code||err?.message||String(err)),true);
  }
 });
}
function raceBird(x,y,skin,alpha=1,flap=false,rotation=0){const sk=window.flyingBirdFriendSkinPalette?.[skin]||window.flyingBirdFriendSkinPalette?.[0]||{body:'#ffd23f',hi:'#ffe98a',wing:'#ffa31e',belly:'#fff9df'};const g=raceCtx;g.save();g.globalAlpha=alpha;g.translate(Math.round(x+12),Math.round(y+9));g.rotate(Math.max(-.65,Math.min(1.2,rotation)));g.fillStyle='#2b1b00';g.fillRect(-11,-7,22,15);g.fillStyle=sk.body;g.fillRect(-10,-6,20,13);g.fillStyle=sk.belly;g.fillRect(-4,2,12,4);g.fillStyle=sk.wing;g.fillRect(-10,flap?-6:-1,10,7);g.fillStyle=sk.hi;g.fillRect(-9,flap?-5:0,7,2);g.fillStyle='#fff';g.fillRect(4,-5,6,6);g.fillStyle='#151128';g.fillRect(7,-3,3,3);g.fillStyle='#ff8a22';g.fillRect(10,0,7,4);g.restore()}
function raceDraw(){
 if(!race)return;
 const r=race,w=r.world.w,h=r.world.h,g=raceCtx;
 const now=serverClock(),remaining=(r.meta.startAt-now)/1000,elapsed=Math.max(0,now-r.meta.startAt),tick=Math.max(0,r.simTick);
 g.setTransform(raceCanvas.width/w,0,0,raceCanvas.height/h,0,0);
 g.clearRect(0,0,w,h);
 const birds=[];
 for(const [uid,p] of Object.entries(raceSnapshot?.players||{})){
  if(uid===ownUid()||(!r.me.alive&&p.status!=='ALIVE'))continue;
  const card=r.cards.get(uid)||{},y=ghostY(uid,p);
  const equipped=r.cosmetics?.[uid];
  birds.push({x:r.world.bx,y:Math.min(r.world.ground-18,Math.max(0,y)),skin:equipped?.skin??(Number(card?.avatar?.skin)||0),alpha:uid===r.spectatorUid?1:p.status==='ALIVE'?.48:.16,rotation:(Number(p.vy)||0)*.09,trail:equipped?.trail||'NONE',id:uid,active:p.status==='ALIVE'});
 }
 if(r.me.alive)birds.push({x:r.world.bx,y:r.me.y,skin:r.myCosmetics.skin,alpha:r.me.alive?1:.55,rotation:r.me.vy*.09,trail:r.myCosmetics.trail,id:ownUid(),active:r.me.alive});
 const scene={map:r.meta.map,matchId:r.path,world:r.world,tick,distance:distanceAt(tick,courseSpeed(r.meta.diff),r.world,r.meta.diff),pipes:pipesNear(tick,r).map(p=>({x:p.x,top:p.top,gap:p.gap,amp:p.amp})),birds};
 const myself=r.me;
 const art=window.flyingBirdMultiplayerArt?.(scene,g);
 if(!art){
  const pal=racePalette(r.meta.map);const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,pal[0]);sky.addColorStop(1,pal[1]);g.fillStyle=sky;g.fillRect(0,0,w,h);
  for(const p of scene.pipes){g.fillStyle=p.amp?'#ff7eb6':pal[2];g.fillRect(p.x,0,RACE_PIPE_WIDTH,p.top-16);g.fillRect(p.x,p.top+p.gap+16,RACE_PIPE_WIDTH,r.world.ground-p.top-p.gap-16)}
  g.fillStyle='#162c3c';g.fillRect(0,r.world.ground,w,h-r.world.ground);
  for(const b of birds)raceBird(b.x,b.y,b.skin,b.alpha,tick%10<4,b.rotation);
 }
 g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';g.strokeStyle='#19102e';g.lineWidth=4;g.font='bold '+(r.meta.layout==='PORTRAIT'?18:23)+'px Courier New';g.fillStyle='#fffbe8';const msg=!raceClockReady?RT('loading'):remaining>0?(remaining>3.3?RT('countdown'):String(Math.max(1,Math.ceil(remaining)))):r.finished?'':(!myself.alive?'':'');if(msg){g.strokeText(msg,w*(r.meta.layout==='PORTRAIT'?.36:.5),h*.26);g.fillText(msg,w*(r.meta.layout==='PORTRAIT'?.36:.5),h*.26)}
 const traveled=distanceAt(tick,courseSpeed(r.meta.diff),r.world,r.meta.diff);const passed=Math.max(0,Math.floor((traveled-(r.world.spawnX-r.world.bx+52))/r.world.spacing)+1);const currentStage=r.meta.diff==='HARD'?Math.min(10,Math.floor(passed/16)):Math.min(16,Math.floor(tick/RACE_PHASE));g.font='bold 12px Courier New';g.textAlign='left';g.fillText(RT('time')+' '+formatTime(elapsed),10,r.meta.layout==='LANDSCAPE'?74:80);g.textAlign='right';g.fillText('⚡ ×'+(1+currentStage*(r.meta.diff==='HARD'?.052:.036)).toFixed(2),w-(r.meta.layout==='LANDSCAPE'?62:10),22);
 if(!r.finished&&remaining<=0&&r.startFlash>0){g.font='bold 35px Courier New';g.textAlign='center';g.strokeText(RT('go'),w/2,h*.31);g.fillText(RT('go'),w/2,h*.31);r.startFlash--}

}
function raceSetStatus(text,error=false){const e=$('fbMpRaceStatus');e.textContent=text||'';e.classList.toggle('error',!!error)}
const networkBadge=el('span','','mpRaceNetwork');
networkBadge.id='fbMpRaceNetwork';
networkBadge.title='RTDB write acknowledgement and remote snapshot interval (not peer-to-peer ping)';
$('fbMpRaceTop').append(networkBadge);
function updateNetworkBadge(){
 if(!race)return;
 const stats=race.net,quality=networkQuality(stats,performance.now());
 networkBadge.dataset.quality=quality;
 const ack=stats.ackMs===null?'—':String(Math.round(stats.ackMs))+'ms';
 const tracks=[...race.ghostTracks.values()].filter(t=>t.intervalMs!==null);
 const avg=tracks.length?Math.round(tracks.reduce((sum,t)=>sum+t.intervalMs,0)/tracks.length):null;
 const gap=avg===null?'—':String(avg)+'ms';
 networkBadge.textContent=(lang()==='RU'?'СЕТЬ ':'NET ')+
   (quality==='offline'?'OFFLINE · ':quality==='stale'?'STALE · ':'')+
   'ACK '+ack+' · '+(lang()==='RU'?'ПАКЕТ ':'SNAP ')+gap;
}

function raceScoreboard(){if(!race||!raceSnapshot)return;const box=$('fbMpRaceScoreboard');box.replaceChildren();box.classList.toggle('mpRaceDense',Object.keys(raceSnapshot.players||{}).length>5);const sorted=Object.entries(raceSnapshot.players||{}).sort(([a,x],[b,y])=>Number(y.elapsedMs||0)-Number(x.elapsedMs||0));for(const [uid,p] of sorted){const entry=el('div',null,'mpRacePlayer'),name=el('span',(race.cards.get(uid)?.nick||'BIRD '+uid.slice(0,4))+(uid===ownUid()?' ★':'')),st=el('span',raceStatusText(p.status)),clock=el('strong',formatTime(p.elapsedMs));entry.classList.toggle('mpRaceOut',p.status!=='ALIVE');entry.append(name,st,clock);box.append(entry)}}
// v2.9: the finished round is verified (all players terminal, ticks match times) and queued for
// Firestore. Totals live in the account; this line only displays them. Solo data is never touched.
function showMpStats(){
 const box=$('fbMpRaceMyStats');if(!box)return;
 const line=resultLine();box.textContent=line.text;box.classList.toggle('mpStatsBad',line.error);
}
function recordVerifiedRound(){
 if(!race||!ownUid())return;
 submitRound({path:race.path,snapshot:raceSnapshot});
 showMpStats();
}
onMpStats(()=>{if(race?.finished)showMpStats()});
function updateRematchButton(){
 const host=roomData?.hostUid===ownUid(),button=$('fbMpRematch');
 button.textContent=T(host?'rematch':'waitHost');
 button.disabled=!host||busy||!roomConnected||!race?.finished||!roundFinished(raceSnapshot)||roomData?.meta?.version!==race?.meta.version;
}
async function rematch(){
 const session=race,code=roomCode,uid=ownUid();
 if(busy||!roomConnected||!session?.finished||!roundFinished(raceSnapshot)||roomData?.hostUid!==uid)return;
 setBusy(true);$('fbMpRematch').disabled=true;
 try{
  // Server rules independently verify all terminal states and preserve every ban.
  const result=await runTransaction(ref(db,roomPath(code)+'/meta'),meta=>nextRoundMeta(meta,session.meta.version),{applyLocally:false});
  if(!result.committed)throw Error(T('roomChanged'));
  // The room listener switches all clients together; never overwrite the old round.
 }catch(e){if(race===session){$('fbMpRaceFinalSub').textContent=T('error')+': '+(e.code||e.message);}}
 finally{setBusy(false);if(race===session)updateRematchButton();}
}
function updateSpectator(direction=0){
 const r=race,bar=$('fbMpSpectator');
 if(!r||r.me.alive||r.finished){bar.hidden=true;return;}
 r.spectatorUid=spectatorTarget(raceSnapshot?.players,ownUid(),r.spectatorUid,direction);
 bar.hidden=false;
 $('fbMpSpectatorLabel').textContent=r.spectatorUid?T('spectating')+' · '+(r.cards.get(r.spectatorUid)?.nick||'BIRD'):T('waitingResults');
 const count=Object.entries(raceSnapshot?.players||{}).filter(([uid,p])=>uid!==ownUid()&&p.status==='ALIVE').length;
 for(const id of ['fbMpSpectatorPrev','fbMpSpectatorNext'])$(id).disabled=count<2;
 $('fbMpSpectatorPrev').textContent='◀ '+T('previous');$('fbMpSpectatorNext').textContent=T('next')+' ▶';
}
function raceResults(){
 if(!race)return;
 const r=race,list=$('fbMpRaceResults');
 const players=rankRacePlayers(Object.entries(raceSnapshot?.players||{}).map(([uid,p])=>({uid,...p})));
 const groups=new Map();for(const p of players)groups.set(p.rank,(groups.get(p.rank)||0)+1);
 list.replaceChildren();
 for(const p of players){
  const card=r.cards.get(p.uid)||{},item=el('div',null,'mpRaceResult'),identity=el('div',null,'mpResultIdentity'),info=el('div',null,'mpResultName');
  const tied=groups.get(p.rank)>1;
  info.append(el('strong',(card.nick||'BIRD '+p.uid.slice(0,5))+(p.uid===ownUid()?' ★':'')),el('small',raceStatusText(p.status)+(tied?' · '+RT('tie'):'')));
  identity.append(pic(card),info);
  item.append(el('span','#'+p.rank,'mpResultRank'),identity,el('strong',formatTime(p.elapsedMs),'mpResultTime'));
  item.classList.toggle('mpRaceTop',p.rank===1&&p.status!=='DNF');item.classList.toggle('mpResultMe',p.uid===ownUid());list.append(item);
 }
 const me=players.find(p=>p.uid===ownUid());
 $('fbMpPersonalResult').textContent=me?T('personalResult')+' · '+T('place')+' #'+me.rank+' · '+formatTime(me.elapsedMs)+(groups.get(me.rank)>1?' · '+RT('tie'):''):'';
 $('fbMpResultsTimeLabel').textContent=T('survival');
 recordVerifiedRound();$('fbMpRaceFinal').hidden=false;$('fbMpSpectator').hidden=true;
 $('fbMpRaceFinalTitle').textContent=RT('finished');$('fbMpRaceFinalSub').textContent=T('roundInfo');$('fbMpRaceExitFinal').textContent=T('leave');updateRematchButton();
}
function raceUpdateFromServer(snap){raceSnapshot=snap;if(!race)return;rememberGhostSamples(snap);const me=raceMe();if(me&&me.status!=='ALIVE'&&race.me.alive){race.me.alive=false;race.me.status=me.status;race.me.tick=me.tick;race.me.elapsedMs=me.elapsedMs;racesStopOwnLoop()}
 const entries=Object.entries(snap.players||{});if(entries.length!==Object.keys(race.meta.roster||{}).length)return;const living=entries.filter(([,p])=>aliveRace(p));
 if(serverClock()>=race.meta.startAt&&living.length<=1&&!race.finished){
   if(living.length===1&&living[0][0]===ownUid()&&race.me.alive)void raceFinish('SURVIVED');
   else if(roundFinished(snap))raceShowEnd();
 }
 raceScoreboard();
 if(roundFinished(snap)&&!race.finished)raceShowEnd();
 updateSpectator();
}
function racesStopOwnLoop(){if(race)race.flapQueued=false}
function raceShowEnd(){if(!race||race.finished)return;race.finished=true;raceResults()}
// Never cancel the disconnect guard before Firebase confirms a terminal state.
// A stuck ALIVE acknowledgment must not trap the interface in the match screen.
const RACE_EXIT_GRACE_MS=1500;
function waitRaceWrite(promise,ms=RACE_EXIT_GRACE_MS){
 return new Promise(resolve=>{
  const timeout=setTimeout(()=>resolve(false),ms);
  Promise.resolve(promise).then(value=>{clearTimeout(timeout);resolve(value)},()=>{clearTimeout(timeout);resolve(false)});
 });
}
function raceFinish(status){
 if(!race||!race.me.alive)return race?.finalWritePromise||Promise.resolve(false);
 const r=race;r.me.alive=false;r.me.status=status;updateSpectator();r.me.elapsedMs=Math.round(Math.max(0,r.simTick*RACE_STEP));
 if(status==='SURVIVED')raceSetStatus(RT('winner'));
 if(status==='DNF')raceSetStatus(RT('onlineError'),true);
 r.finalWritePromise=(async()=>{
  for(let attempt=0;attempt<3;attempt++){
   try{
    await racePublish(true,r);
    r.finalConfirmed=true;
    // Guard could have been registered after the first terminal write.
    if(r.disconnectGuard&&r.guardReady){try{await r.disconnectGuard.cancel()}catch(e){console.warn('[Flying Bird MP] onDisconnect cancel:',e)}}
    return true;
   }catch(e){
    console.warn('[Flying Bird MP] Terminal update attempt '+(attempt+1),e);
    if(race===r)raceSetStatus('FINAL_WRITE · '+(e?.code||e?.message||String(e)),true);
    if(attempt<2)await new Promise(resolve=>setTimeout(resolve,350*(attempt+1)));
   }
  }
  // Keep onDisconnect armed. The server-side stale-peer fallback is still needed
  // if a terminal write cannot be acknowledged or the account goes offline.
  return false;
 })();
 return r.finalWritePromise;
}
function raceFlap(){if(!race||race.finished||!race.me.alive||serverClock()<race.meta.startAt)return;race.flapQueued=true}
function raceStep(tick){if(!race||!race.me.alive)return;const r=race,m=r.me,w=r.world;m.tick=tick;
 if(r.flapQueued){m.vy=RACE_FLAP;r.flapQueued=false}m.vy=Math.min(m.vy+RACE_GRAVITY,7.5);m.y+=m.vy;if(m.y<0){m.y=0;m.vy=0}
 for(const p of pipesNear(tick,r)){const x=p.x;if(x+RACE_PIPE_WIDTH+4<w.bx||x-4>w.bx+24)continue;if(m.y+2<p.top||m.y+16>p.top+p.gap){void raceFinish('DEAD');return}}
 if(m.y+18>=w.ground){m.y=w.ground-18;void raceFinish('DEAD');return}
 m.score=0;const base=courseSpeed(r.meta.diff),travel=distanceAt(tick,base,w,r.meta.diff);m.score=Math.max(0,Math.floor((travel-(w.spawnX-w.bx+RACE_PIPE_WIDTH))/w.spacing)+1);
 m.elapsedMs=Math.round(tick*RACE_STEP);m.tick=tick;
}
async function racePublish(final=false,r=race){
 if(!r||!db)return;
 if(r.publishBusy&&!final)return;
 r.publishBusy=true;
 const state=r.me,uid=ownUid(),code=r.code;
 const data={status:state.status,tick:Math.max(0,Math.floor(state.tick)),y:Math.round(state.y*10)/10,
  vy:Math.round(state.vy*100)/100,score:Math.max(0,Math.floor(state.score)),
  elapsedMs:Math.max(0,Math.round(state.elapsedMs)),lastSeen:rtStamp()};
 const send=async()=>{
  const started=performance.now();
  try{
   await update(ref(db,r.path+'/players/'+uid),data);
   noteWriteAck(r.net,performance.now()-started,true,performance.now());
  }catch(e){
   noteWriteAck(r.net,performance.now()-started,false,performance.now());throw e;
  }
 };
 // A final terminal update must queue behind the prior acknowledged ALIVE frame.
 const pending=r.publishChain.then(send,send);
 r.publishChain=pending.catch(()=>{});
 try{await pending}finally{r.publishBusy=false}
}
function raceFrame(){
 if(!race)return;
 raceRaf=requestAnimationFrame(raceFrame);
 const r=race,now=serverClock();
 // No simulation on a guessed device clock: wait for the RTDB clock snapshot.
 if(!r.finished&&raceClockReady&&now>=r.meta.startAt){
  const target=Math.floor((now-r.meta.startAt)/RACE_STEP);
  let steps=0;
  while(r.simTick<target&&steps++<90){r.simTick++;if(r.me.alive)raceStep(r.simTick)}
  const interval=publishInterval(Object.keys(r.meta.roster||{}).length,r.net.ackMs);
  if(r.me.alive&&now-r.lastPublishAt>=interval&&!r.publishBusy){
   r.lastPublishAt=now;
   void racePublish().catch(e=>raceSetStatus('STATE_WRITE · '+(e?.code||e.message),true));
  }
 }
 if(now-r.lastScoreboardAt>750){
  raceScoreboard();updateSpectator();r.lastScoreboardAt=now;updateNetworkBadge();
  if(now>=r.meta.startAt+5000){
   for(const [uid,p] of Object.entries(raceSnapshot?.players||{})){
    if(uid!==ownUid()&&p.status==='ALIVE'&&Number.isFinite(p.lastSeen)&&now-p.lastSeen>7500){
     const seen=r.staleFlags||(r.staleFlags=new Set());
     if(!seen.has(uid)){
      seen.add(uid);
      void set(ref(db,r.path+'/players/'+uid+'/status'),'DNF').catch(()=>seen.delete(uid));
     }
    }
   }
  }
 }
 if(!document.hidden){
  const fps=Number(window.flyingBirdRenderFps?.());
  const interval=Number.isFinite(fps)&&fps>=30?1000/fps:0;
  const renderNow=performance.now();
  if(!interval||!r.nextDrawAt||renderNow>=r.nextDrawAt-.5){
   raceDraw();
   r.nextDrawAt=interval?Math.max((r.nextDrawAt||renderNow)+interval,renderNow):renderNow;
  }
 }
}
function raceExitPrompt(){if(!race)return;if(!race.finished&&!confirm(RT('exitConfirm')))return;void raceExit()}
async function raceExit(){const r=race;if(r?.me.alive)void raceFinish('DNF');
 if(r?.finalWritePromise)await waitRaceWrite(r.finalWritePromise);
 if((document.fullscreenElement||document.webkitFullscreenElement)===raceUI){try{await (document.exitFullscreen||document.webkitExitFullscreen).call(document)}catch{}}
 try{screen.orientation?.unlock?.()}catch{}
 raceCleanup();modal.hidden=true;await leaveRoom({silent:true});}
function raceCleanup(){raceCosmeticsUnsub?.();raceCosmeticsUnsub=null;networkBadge.textContent='';window.flyingBirdMpRaceActive=false;raceFeedToken++;racePendingStart=null;raceFeedLoading=false;for(const off of raceFeedSubs)off();raceFeedSubs=[];raceConnectionUnsub?.();raceConnectionUnsub=null;cancelAnimationFrame(raceRaf);raceRaf=0;race=null;raceSnapshot=null;raceOnDisconnect=null;raceCanvas.width=320;raceCanvas.height=480;raceUI.hidden=true;$('fbMpSpectator').hidden=true;}
async function beginRace(payload,code){
 if(!payload||race||raceStarting||!payload.roster?.[ownUid()]||!payload.meta||roomCode!==code)return;
 raceStarting=true;
 const meta={...payload.meta,roster:payload.roster},w=raceWorld(meta.layout);
 // Do not reject a participant after rotating a phone; the room chooses course layout.
 const local={y:w.ground*.42,vy:0,tick:0,score:0,elapsedMs:0,alive:true,status:'ALIVE'};
 try{
  race={code,path:raceRoot(code,meta.version),meta,world:w,course:[],ghostTracks:new Map(),cards:new Map(),me:local,simTick:0,flapQueued:false,finished:false,startFlash:22,lastScoreboardAt:0,net:newNetworkStats(),publishBusy:false,publishChain:Promise.resolve(),lastPublishAt:0,finalWritePromise:null,finalConfirmed:false,disconnectGuard:null,guardReady:false,
   myCosmetics:{...equippedRaceCosmetics(),skin:roomData?.slots?.[mySeat]?.skin??equippedRaceCosmetics().skin},cosmetics:Object.create(null)};
  const session=race;
  race.cosmetics[ownUid()]=race.myCosmetics;
  raceSnapshot=payload;
  raceUI.hidden=false;modal.hidden=true;window.flyingBirdMpRaceActive=true;
  $('fbMpRaceFinal').hidden=true;$('fbMpRaceTitle').textContent=RT('title');$('fbMpRaceSub').textContent=RT('instructions');$('fbMpRaceExit').textContent=RT('exit');
  raceSetStatus(RT('loading'));raceFit();
  for(const uid of Object.keys(payload.roster)){void getCard(uid).then(card=>{if(race===session)race.cards.set(uid,card)}).catch(()=>{})}
  rememberGhostSamples(payload);
  // Initial paint and loop MUST NOT wait for Firebase round trips; this used to
  // leave guest clients frozen in the lobby if onDisconnect/clock were slow.
  raceRaf=requestAnimationFrame(raceFrame);raceUpdateFromServer(payload);updateNetworkBadge();
  watchRaceCosmetics(code,race);
  void readRaceServerOffset().catch(err=>{
   if(race===session)raceSetStatus('CLOCK_SYNC · '+err.message,true);
  }); // clock pre-warmed from lobby; do not block race UI
  const statusRef=ref(db,session.path+'/players/'+ownUid()+'/status');
  raceOnDisconnect=onDisconnect(statusRef);
  const raceGuardOwner=race;
  raceGuardOwner.disconnectGuard=raceOnDisconnect;
  void (async()=>{
  try{
   await raceGuardOwner.disconnectGuard.set('DNF');raceGuardOwner.guardReady=true;
   if(raceGuardOwner.finalConfirmed)await raceGuardOwner.disconnectGuard.cancel();
  }catch(e){if(race!==session)return;raceSetStatus('DISCONNECT_GUARD: '+(e?.code||e?.message),true)}
  if(race!==session)return;
  let sawConnection=false;
  raceConnectionUnsub=onValue(ref(db,'.info/connected'),snap=>{
   if(race!==session)return;
   race.net.connected=snap.val()===true;
   if(snap.val()===true){sawConnection=true;updateNetworkBadge();return}
   updateNetworkBadge();
   if(sawConnection&&race?.me.alive&&raceClockReady&&serverClock()>=race.meta.startAt){void raceFinish('DNF');raceSetStatus(RT('onlineError'),true)}
  });
  if(!$('fbMpRaceStatus').classList.contains('error'))raceSetStatus('');
  })().catch(e=>{if(race===session)raceSetStatus(e.message,true)});
 }catch(e){
  console.error('[Flying Bird MP] Begin race failed:',e);
  if(race){raceSetStatus('JOIN_MATCH: '+(e?.code||e?.message||String(e)),true);if(race.me.alive)void raceFinish('DNF')}
  else{modal.hidden=false;say('JOIN_MATCH · '+(e?.code||e?.message||String(e)),true)}
 }finally{raceStarting=false}
}
function watchRace(code,version){
 const path=raceRoot(code,version);
 unMatch?.();unMatch=null;
 for(const off of raceFeedSubs)off();raceFeedSubs=[];
 const token=++raceFeedToken;
 // Unlike meta -> get(root), one live subscription receives the entire small
 // initial match in one step. It is immediately unsubscribed after bootstrap.
 unMatch=onValue(ref(db,path),snap=>{
  if(token!==raceFeedToken||roomCode!==code||!snap.exists()||raceFeedLoading||race)return;
  const payload=snap.val();
  if(!payload?.meta||!payload?.roster?.[ownUid()]||!payload?.players)return;
  raceFeedLoading=true;
  Promise.resolve().then(()=>{if(token===raceFeedToken){unMatch?.();unMatch=null;}});
  raceSnapshot=payload;
  matchLaunchPending=true;
  for(const uid of Object.keys(payload.roster)){
   const off=onValue(ref(db,path+'/players/'+uid),ps=>{
    if(token!==raceFeedToken||roomCode!==code||!ps.exists())return;
    if(!raceSnapshot||raceSnapshot.meta?.startAt!==payload.meta.startAt)return;
    const incoming=ps.val();
    if(!isFreshPlayerState(raceSnapshot.players[uid],incoming))return;
    raceSnapshot.players[uid]=incoming;
    if(race?.code===code)raceUpdateFromServer(raceSnapshot);
   },e=>{if(race?.me.alive)raceSetStatus('PLAYER_STREAM · '+(e?.code||e.message),true)});
   raceFeedSubs.push(off);
  }
  try{
   // Critical: begin the countdown synchronously, not after another network read.
   void beginRace(payload,code).catch(e=>{
    console.error('[Flying Bird MP] race bootstrap',e);
    say('JOIN_MATCH · '+(e?.code||e?.message||String(e)),true);
   });
  }finally{raceFeedLoading=false}
 },e=>{
  say(T('error')+': MATCH_WATCH · '+(e?.code||e.message),true);
 });
}

async function startSurvivalMatch(){
 if(!db||!roomConnected||!roomData||!roomCode||busy||matchLaunchPending)return;
 const code=roomCode;
 if(roomData.hostUid!==ownUid()){say(T('onlyHost'),true);return}
 setBusy(true);$('fbMpStartInfo').textContent=T('preparing');let stage='READ_ROOM';
 try{
  const snapshot=await get(ref(db,roomPath(code)));
  if(roomCode!==code)throw Error('Room changed during preparation.');
  if(!snapshot.exists())throw Error(T('roomClosed'));
  let current=snapshot.val();roomData=current;renderLobby();
  let readiness=assessReadyRoom(current,ownUid());
  if(!uniqueRoomSkins(current))throw Error(skinText(2));
  if(!readiness.host)throw Error(T('onlyHost'));
  if(!readiness.valid){await refreshPlayers();throw Error(readinessExplanation())}
  stage='CLOCK_OFFSET';
  const offset=await readRaceServerOffset();
  // Clock warm-up may take seconds. Recheck occupancy and Ready immediately
  // before creating the match, avoiding stale client-side start decisions.
  stage='RECHECK_ROOM';
  const latest=await get(ref(db,roomPath(code)));
  if(!latest.exists()||roomCode!==code)throw Error(T('roomClosed'));
  current=latest.val();roomData=current;
  readiness=assessReadyRoom(current,ownUid());
  if(!uniqueRoomSkins(current))throw Error(skinText(2));
  if(!readiness.host)throw Error(T('onlyHost'));
  if(!readiness.valid){renderLobby();await refreshPlayers();throw Error(readinessExplanation())}
  const players=readiness.participants;
  // Start the full countdown only after all readiness rechecks finished.
  const now=Date.now()+offset;
  const roster={},live={},seats={},world=raceWorld(current.meta.layout);
  for(const [seat,p] of players){seats[seat]=p.uid;roster[p.uid]=true;live[p.uid]={status:'ALIVE',tick:0,y:Math.round(world.ground*.42),vy:0,score:0,elapsedMs:0,lastSeen:rtStamp()}}
  const seed=new Uint32Array(1);crypto.getRandomValues(seed);
  const meta={hostUid:ownUid(),seed:seed[0]%2147483647,startAt:now+10500,createdAt:rtStamp(),map:current.meta.map,diff:current.meta.diff,layout:current.meta.layout,version:current.meta.version};
  stage='WRITE_MATCH';
  await set(ref(db,raceRoot(code,meta.version)),{meta,roster,seats,players:live});
  matchLaunchPending=true;say('');renderLobby();
 }catch(e){
  console.error('[Flying Bird MP] Start failed',{stage,code,error:e});
  say(RT('startError')+': '+stage+' · '+(e?.code||e?.message||String(e)),true);
 }finally{setBusy(false)}
}

let raceResizeScheduled=false;function queueRaceFit(){if(raceResizeScheduled)return;raceResizeScheduled=true;requestAnimationFrame(()=>{raceResizeScheduled=false;raceFit()})}window.addEventListener('resize',queueRaceFit);window.addEventListener('orientationchange',queueRaceFit);window.visualViewport?.addEventListener('resize',queueRaceFit);
raceCanvas.addEventListener('pointerdown',e=>{if(!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();raceFlap()});
window.addEventListener('keydown',e=>{if(race&&!raceUI.hidden){if(e.target.closest?.('button,input,select,textarea'))return;if(['Space','ArrowUp','KeyW','Enter','Escape'].includes(e.code)){e.preventDefault();e.stopImmediatePropagation()}if(['Space','ArrowUp','KeyW','Enter'].includes(e.code))raceFlap();else if(e.code==='Escape')raceExitPrompt()}},true);
async function raceToggleFullscreen(){
 try{
  if(document.fullscreenElement || document.webkitFullscreenElement){
   const exit=document.exitFullscreen||document.webkitExitFullscreen;
   if(exit)await exit.call(document);return;
  }
  if(raceUI.requestFullscreen){await raceUI.requestFullscreen({navigationUI:'hide'});}
  else if(raceUI.webkitRequestFullscreen){raceUI.webkitRequestFullscreen();}
  else{raceSetStatus(lang()==='RU'?'Игра уже занимает весь экран браузера. На iPhone Safari системный fullscreen может быть недоступен.':'The game fills the browser viewport. System fullscreen may not be supported here.');return;}
  // Orientation locking is optional. Safari may reject it; keep running regardless.
  if(race?.meta.layout==='LANDSCAPE'&&screen.orientation?.lock){try{await screen.orientation.lock('landscape')}catch{}}
 }catch(e){
  raceSetStatus(lang()==='RU'?'Полный экран недоступен в этом браузере. Игра продолжится на весь экран страницы.':'Fullscreen is unavailable in this browser; gameplay still fills the page.');
 }finally{requestAnimationFrame(raceFit)}
}
$('fbMpRaceFullscreen').onclick=()=>void raceToggleFullscreen();
const raceUpdateFsLabel=()=>{$('fbMpRaceFullscreen').textContent=(document.fullscreenElement||document.webkitFullscreenElement)?'⤢ EXIT FULLSCREEN':'⛶ FULLSCREEN';requestAnimationFrame(raceFit)};
document.addEventListener('fullscreenchange',raceUpdateFsLabel);
document.addEventListener('webkitfullscreenchange',raceUpdateFsLabel);
$('fbMpRematch').onclick=()=>void rematch();
$('fbMpSpectatorPrev').onclick=()=>updateSpectator(-1);
$('fbMpSpectatorNext').onclick=()=>updateSpectator(1);
$('fbMpRaceExit').onclick=raceExitPrompt;$('fbMpRaceExitFinal').onclick=()=>void raceExit();
document.addEventListener('visibilitychange',()=>{if(race?.me.alive&&document.hidden&&serverClock()>=race.meta.startAt)void raceFinish('DNF')});
window.addEventListener('pagehide',()=>{if(race?.me.alive){/* Registered server onDisconnect sets DNF even if JS is stopped. */}});

function open(){renderLabels();if(!ownUid()){document.getElementById('accountBtn')?.click();say(T('noAuth'),true);return}document.getElementById('authPanel').hidden=true;modal.hidden=false;if(!roomCode)show('Home');if(!unInvites)watchInvites();if(!setDb())say(T('needUrl'),true);else say('');const url=new URL(location.href);const requested=url.searchParams.get('fbRoom');if(requested&&!roomCode){$('fbMpCode').value=requested;say(T('pendingLink'))}}
function close(){pendingFriendInvite=null;modal.hidden=true;}
window.flyingBirdOpenMultiplayer=open;
// The account module already invokes flyingBirdBeforeSignOut before signing out.
// Chain instead of replacing the Friends Presence cleanup.
const beforeSignOut=window.flyingBirdBeforeSignOut;
window.flyingBirdBeforeSignOut=async()=>{if(roomCode)await leaveRoom({silent:true});await beforeSignOut?.()};
$('fbMpClose').onclick=close;
modal.addEventListener('click',e=>{if(e.target===modal)close()});
modal.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close()}});
// Avoid passing gameplay keyboard shortcuts through the open multiplayer dialog.
document.addEventListener('keydown',e=>{if(!modal.hidden){e.stopImmediatePropagation();if(e.key==='Escape'){e.preventDefault();close()}}},true);
$('fbMpGoCreate').onclick=()=>{if(!ownUid()){say(T('noAuth'),true);return}show('Create');$('fbMpLayout').value=currentLayout();say('')};
$('fbMpGoJoin').onclick=()=>{$('fbMpCode').focus()};
$('fbMpCreateBack').onclick=()=>{pendingFriendInvite=null;show('Home')};
$('fbMpCreateRoom').onclick=()=>void createRoom();
$('fbMpJoin').onclick=()=>void joinRoom($('fbMpCode').value);
$('fbMpCode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void joinRoom(e.target.value)}});
// Database configuration is managed by the project owner, never by visitors.
$('fbMpReady').onclick=()=>void changeReady();
$('fbMpStart').onclick=()=>void startSurvivalMatch();
$('fbMpApplyConfig').onclick=()=>void saveConfig();
$('fbMpLeave').onclick=()=>void leaveRoom();
$('fbMpCopy').onclick=async()=>{await copy(roomCode);say(T('codeCopied'))};
$('fbMpCopyLink').onclick=async()=>{await copy(localCodeLink());say(T('roomLink'))};

window.addEventListener('flyingbird:progress-changed',()=>{if(!modal.hidden)renderLabels()});
window.addEventListener('flyingbird:screen-change',()=>{});
let prevUid=null;
onAuthStateChanged(auth,user=>{const uid=user&&!user.isAnonymous?user.uid:null;const changed=prevUid!==uid;prevUid=uid;if(changed&&roomCode)void leaveRoom({silent:true});if(changed){unInvites?.();unInvites=null;stopInviteRoomChecks();invites={};renderInvites();}if(uid&&!unInvites)watchInvites();else if(!uid)close();if(uid&&new URL(location.href).searchParams.has('fbRoom')&&!window.__fbMpLinkSeen){window.__fbMpLinkSeen=true;open()}});
// Leave the room on account sign-out, independent of the presence-module sign-out hook.
window.addEventListener('pagehide',()=>{if(roomCode&&db&&mySeat!==null){/* onDisconnect handles abrupt closing */}});

window.addEventListener('flyingbird:progress-changed',()=>{if(roomCode&&!raceSnapshot)void ensureLobbySkin();});

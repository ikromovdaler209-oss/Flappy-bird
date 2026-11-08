  import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
  import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup,
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    sendPasswordResetEmail, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
  import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

  const firebaseConfig = {
    apiKey: 'AIzaSyBXhPjfPGPjD6SX6ISyd9UIGcwIGDir2IE',
    authDomain: 'flying-bird-d6832.firebaseapp.com',
    projectId: 'flying-bird-d6832',
    storageBucket: 'flying-bird-d6832.firebasestorage.app',
    messagingSenderId: '824302202629',
    appId: '1:824302202629:web:885e30d34fb1ddaa56516c',
    measurementId: 'G-SQPGSFFX1R'
  };
  const el = id => document.getElementById(id);
  const t = key => window.flyingBirdAuthText?.(key) || key;
  const panel = el('authPanel');
  const error = el('authError');
  const status = el('authStatus');
  const fields = el('authFields');
  const choices = el('authChoices');
  let authMode = 'choice';
  let signedIn = false;
  const setAuthMode = mode => {
    authMode = mode;
    choices.hidden = signedIn || mode !== 'choice';
    fields.hidden = signedIn || mode === 'choice';
    el('authLogin').hidden = mode !== 'login';
    el('authRegister').hidden = mode !== 'register';
    el('authReset').hidden = mode !== 'login';
    el('authModeTitle').textContent = mode === 'register' ? t('MODE_REGISTER') : t('MODE_LOGIN');
    el('authPassword').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    error.textContent = '';
    window.flyingBirdApplyAuthLocale?.();
  };
  el('authChooseLogin').onclick = () => setAuthMode('login');
  el('authChooseRegister').onclick = () => setAuthMode('register');
  el('authBack').onclick = () => setAuthMode('choice');
  const logout = el('authLogout');
  const show = () => { panel.hidden = false; setAuthMode('choice'); updateAccountDetails(); };
  // The game's avatar sits at (8,8) and nickname starts at (36,19).
  // Place the account button and save badge in a compact LEFT stack directly
  // under the avatar. The coin HUD stays in its own top-right lane.
  const placeAccountButton = () => {
    const canvas = el('c');
    const rect = canvas.getBoundingClientRect();
    const logicalWidth = Number(canvas.dataset.logicalWidth) ||
      (window.innerWidth > window.innerHeight ? 640 : 320);
    const scale = rect.width / logicalWidth;
    if (!Number.isFinite(scale) || scale <= 0) return;
    const button = el('accountBtn');
    const indicator = el('syncIndicator');
    const left = rect.left + 8 * scale;
    const top = rect.top + 35 * scale;
    const buttonWidth = Math.min(135 * scale, rect.width * 0.43);
    // Everything (width, height, font, border, shadow) scales by the same factor,
    // so the buttons keep their proportions on any screen size.
    const btnH = 21 * scale, btnBorder = Math.max(1.5, 1.5 * scale);
    button.style.boxSizing = 'border-box';
    button.style.width = buttonWidth + 'px';
    button.style.maxWidth = buttonWidth + 'px';
    button.style.height = btnH + 'px';
    button.style.left = left + 'px';
    button.style.right = 'auto';
    button.style.top = top + 'px';
    button.style.fontSize = Math.max(8, 10 * scale) + 'px';
    button.style.borderWidth = btnBorder + 'px';
    button.style.borderRadius = 6 * scale + 'px';
    button.style.boxShadow = (2 * scale) + 'px ' + (2 * scale) + 'px 0 #2b1b00';
    button.style.lineHeight = Math.max(1, btnH - 2 * btnBorder) + 'px';
    button.style.padding = '0 ' + 5 * scale + 'px';
    const indH = 14 * scale, indBorder = Math.max(1.5, 1.5 * scale);
    indicator.style.boxSizing = 'border-box';
    indicator.style.width = buttonWidth + 'px';
    indicator.style.maxWidth = buttonWidth + 'px';
    indicator.style.height = indH + 'px';
    indicator.style.left = left + 'px';
    indicator.style.right = 'auto';
    indicator.style.top = (top + btnH + 3 * scale) + 'px';
    indicator.style.padding = '0 ' + 4 * scale + 'px';
    indicator.style.borderWidth = indBorder + 'px';
    indicator.style.borderRadius = 6 * scale + 'px';
    indicator.style.fontSize = Math.max(8, 8.5 * scale) + 'px';
    indicator.style.lineHeight = Math.max(1, indH - 2 * indBorder) + 'px';
    indicator.style.textAlign = 'center';
    indicator.style.whiteSpace = 'nowrap';
    indicator.style.overflow = 'hidden';
    indicator.style.textOverflow = 'ellipsis';
  };
  placeAccountButton();
  window.addEventListener('resize', placeAccountButton);
  window.addEventListener('orientationchange', () => requestAnimationFrame(placeAccountButton));
  window.visualViewport?.addEventListener('resize', placeAccountButton);
  document.addEventListener('fullscreenchange', () => requestAnimationFrame(placeAccountButton));
  document.addEventListener('webkitfullscreenchange', () => requestAnimationFrame(placeAccountButton));
  const accountButton = el('accountBtn');
  const updateAccountVisibility = screen => {
    accountButton.hidden = screen !== 'MENU';
    el('syncIndicator').hidden = screen !== 'MENU';
  };
  window.addEventListener('flyingbird:screen-change', e => updateAccountVisibility(e.detail.screen));
  updateAccountVisibility(window.__flyingBirdAccountScreen ?? 'MENU');
  accountButton.onclick = show;
  el('authClose').onclick = () => { panel.hidden = true; };
  panel.addEventListener('click', e => { if (e.target === panel) panel.hidden = true; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) { e.stopImmediatePropagation(); panel.hidden = true; }
  }, true);
  if (firebaseConfig.apiKey.startsWith('PASTE_')) {
    status.textContent = 'Firebase is not configured.';
    fields.hidden = true; choices.hidden = true;
  } else {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    let profileOwner = null;
    let loadingProfile = false;
    let pendingProfileSave = Promise.resolve();
    const localProfileKey = 'flyingBirdProfile';
    const safeNick = v => Array.from(String(v || '').replace(/[^\p{L}\p{N} _.-]/gu, '').replace(/\s+/g, ' ').trim()).slice(0, 12).join('');
    const jsonRead = (key, fallback = null) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch (_) { return fallback; } };
    const originalProfile = jsonRead(localProfileKey, {});
    const ownerKey = 'flyingBirdProgressOwner';
    const guestProfileKey = 'flyingBirdGuestProfileV2';
    const guestProgressKey = 'flyingBirdGuestProgressV2';
    const userProfileKey = uid => 'flyingBirdProfileV2:' + uid;
    const userProgressKey = uid => 'flyingBirdProgressV2:' + uid;
    const migrationKey = 'flyingBirdMigrationV2';
    const originalOwner = localStorage.getItem(ownerKey);
    const originalProgress = ['flyingBirdCfg','flyingBirdSave','flyingBirdWallet'].reduce((obj,key,i) => { obj[['cfg','save','wallet'][i]] = jsonRead(key,{}); return obj; },{});
    // One-time, non-destructive migration of the previous version's localStorage.
    if (!localStorage.getItem(migrationKey)) {
      if (originalOwner) {
        if (!localStorage.getItem(userProgressKey(originalOwner))) localStorage.setItem(userProgressKey(originalOwner), JSON.stringify(originalProgress));
        if (!localStorage.getItem(userProfileKey(originalOwner))) localStorage.setItem(userProfileKey(originalOwner), JSON.stringify(originalProfile));
        if (!localStorage.getItem(guestProgressKey)) localStorage.setItem(guestProgressKey, localStorage.getItem('flyingBirdGuestBackup') || JSON.stringify({cfg:{},save:{},wallet:{}}));
        if (!localStorage.getItem(guestProfileKey)) localStorage.setItem(guestProfileKey, localStorage.getItem('flyingBirdGuestProfileBackup') || JSON.stringify({}));
      } else {
        if (!localStorage.getItem(guestProgressKey)) localStorage.setItem(guestProgressKey, JSON.stringify(originalProgress));
        if (!localStorage.getItem(guestProfileKey)) localStorage.setItem(guestProfileKey, JSON.stringify(originalProfile));
      }
      localStorage.setItem(migrationKey,'1');
    }
    const applyCloudProfile = data => {
      const local = jsonRead(localProfileKey, {});
      if (typeof data.id === 'string' && data.id) local.id = data.id;
      local.nick = safeNick(data.nick) || local.nick || 'BIRD';
      const av = data.avatar || data.av;
      if (av) local.av = { skin: Math.max(0,Math.floor(Number(av.skin)||0)), bg: Math.max(0,Math.floor(Number(av.bg)||0)) % 8 };
      localStorage.setItem(localProfileKey, JSON.stringify(local));
      window.dispatchEvent(new CustomEvent('flyingbird:cloud-profile', { detail: local }));
    };
    const syncProfile = async user => {
      loadingProfile = true; profileOwner = null;
      try {
        const ref = doc(db, 'players', user.uid);
        const snapshot = await getDoc(ref);
        if (auth.currentUser?.uid !== user.uid) return;
        if (snapshot.exists()) applyCloudProfile(snapshot.data());
        else {
          const local = jsonRead(localProfileKey, {});
          await setDoc(ref, { id:local.id || '', nick:safeNick(local.nick)||'BIRD', avatar:local.av || {skin:0,bg:0}, createdAt:serverTimestamp() });
        }
        profileOwner = user.uid;
        localStorage.setItem(userProfileKey(user.uid),localStorage.getItem(localProfileKey));
      } catch(e) { error.textContent = 'Firestore: ' + (e.code || e.message); }
      finally { loadingProfile = false; updateAccountDetails(); }
    };
    window.addEventListener('flyingbird:profile-changed', () => {
      if (loadingProfile || switchingIdentity) return;
      const local = jsonRead(localProfileKey, {});
      const uid = auth.currentUser?.uid;
      if (uid) localStorage.setItem(userProfileKey(uid),JSON.stringify(local));
      else localStorage.setItem(guestProfileKey,JSON.stringify(local));
      updateAccountDetails();
      if (!profileOwner || uid !== profileOwner) return;
      const nick = safeNick(local.nick)||'BIRD';
      const avatar = {skin:Math.max(0,Math.floor(Number(local.av?.skin)||0)),bg:Math.max(0,Math.floor(Number(local.av?.bg)||0))%8};
      pendingProfileSave = pendingProfileSave.catch(()=>{}).then(async()=>{
        if (auth.currentUser?.uid !== uid) return;
        await updateDoc(doc(db,'players',uid),{nick,avatar});
        window.dispatchEvent(new CustomEvent('flyingbird:profile-saved',{detail:{uid}}));
      }).catch(e => { error.textContent = t('SAVE_PROFILE_ERROR') + (e.code || e.message); });
    });
    // Validate inputs before sending them to Firebase, and show useful errors.
    const emailInput = el('authEmail');
    const passwordInput = el('authPassword');
    const actionButtons = ['authLogin', 'authRegister', 'authChooseGoogle', 'authReset', 'authChooseLogin', 'authChooseRegister', 'authBack'].map(el);
    let authBusy = false;
    const getEmail = () => emailInput.value.trim();
    const getPassword = () => passwordInput.value;
    const requireEmail = () => {
      const value = getEmail();
      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || !emailInput.checkValidity()) {
        emailInput.focus();
        throw new Error(t('ERR_EMAIL'));
      }
      return value;
    };
    const requirePassword = () => {
      const value = getPassword();
      if (!value) { passwordInput.focus(); throw new Error(t('ERR_PASSWORD')); }
      return value;
    };
    const explainAuthError = e => {
      const code = e?.code || '';
      const messages = {
        'auth/invalid-email': t('ERR_INVALID_EMAIL'),
        'auth/email-already-in-use': t('ERR_USED_EMAIL'),
        'auth/weak-password': t('ERR_WEAK'),
        'auth/invalid-credential': t('ERR_BAD_CREDENTIAL'),
        'auth/wrong-password': t('ERR_BAD_CREDENTIAL'),
        'auth/user-not-found': t('ERR_MISSING_USER'),
        'auth/operation-not-allowed': t('ERR_NOT_ALLOWED'),
        'auth/unauthorized-domain': t('ERR_DOMAIN'),
        'auth/popup-blocked': t('ERR_POPUP_BLOCKED'),
        'auth/popup-closed-by-user': t('ERR_POPUP_CLOSED'),
        'auth/network-request-failed': t('ERR_NETWORK')
      };
      return messages[code] || e?.message || t('ERR_AUTH_GENERIC');
    };
    const report = async action => {
      if (authBusy) return;
      error.textContent = '';
      authBusy = true;
      actionButtons.forEach(button => button.disabled = true);
      try { await action(); }
      catch (e) { error.textContent = explainAuthError(e); }
      finally { authBusy = false; actionButtons.forEach(button => button.disabled = false); }
    };
    el('authLogin').onclick = () => report(() => {
      const mail = requireEmail();
      const pass = requirePassword();
      return signInWithEmailAndPassword(auth, mail, pass);
    });
    el('authRegister').onclick = () => report(() => {
      const mail = requireEmail();
      const pass = requirePassword();
      if (pass.length < 6) { passwordInput.focus(); throw new Error(t('ERR_WEAK')); }
      return createUserWithEmailAndPassword(auth, mail, pass);
    });
    el('authChooseGoogle').onclick = () => report(() => signInWithPopup(auth, new GoogleAuthProvider()));
    el('authReset').onclick = () => report(async () => {
      const mail = requireEmail();
      await sendPasswordResetEmail(auth, mail);
      status.dataset.dynamic = '1';
      status.textContent = t('RESET_SENT');
    });
    // Sign-out is confirmed below; never switch identities while a save is in flight.
    logout.onclick = () => {
      el('logoutMessage').textContent = t('LOGOUT_MESSAGE');
      el('logoutForce').hidden = true;
      el('logoutConfirm').disabled = false;
      el('logoutPanel').hidden = false;
    };
    el('logoutCancel').onclick = () => { el('logoutPanel').hidden = true; };
    el('statsClose').onclick = () => { el('statsPanel').hidden = true; };
    el('accountStats').onclick = () => {
      const p = readProgress(); const v = p.save || {}, w = p.wallet || {};
      const rows = [
        [t('ST_EASY'),v.best?.EASY||0],[t('ST_NORMAL'),v.best?.NORMAL||0],
        [t('ST_HARD'),v.best?.HARD||0],[t('ST_EXTREME'),v.best?.EXTREME||0],[t('ST_GAMES'),v.games||0],
        [t('ST_PIPES'),v.pipes||0],[t('ST_FLAPS'),v.flaps||0],
        [t('ST_EARNED'),v.earnedCoins ?? '—'],[t('ST_BALANCE'),w.coins||0],
        [t('ST_ACH'),Object.values(v.ach||{}).filter(Boolean).length+'/10']
      ];
      el('statsGrid').replaceChildren(...rows.map(([label,value]) => {
        const item=document.createElement('div');item.className='fbStat';
        const strong=document.createElement('strong');strong.textContent=String(value);
        const small=document.createElement('small');small.textContent=label;
        item.append(strong,small);return item;
      }));
      el('statsPanel').hidden = false;
    };
    // Each Firebase UID has a distinct local cache. Guest data is never implicitly merged.
    const progressKeys = ['flyingBirdCfg','flyingBirdSave','flyingBirdWallet'];
    const readProgress = () => Object.fromEntries(progressKeys.map((key,i)=>[['cfg','save','wallet'][i],jsonRead(key,{})]));
    const normalize = value => JSON.stringify(value,(key,v)=>v && typeof v==='object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])) : v);
    const applyProgress = data => window.dispatchEvent(new CustomEvent('flyingbird:apply-progress',{detail:data}));
    const syncPanel = el('syncPanel');
    let activeProgressUser = null, syncGeneration = 0, syncTimer = null, progressBusy = false;
    let pendingSave = false, switchingIdentity = false, currentIdentity = null, progressReady = false;
    let lastSyncStatus = t('SYNC_LOCAL_STATE');
    const setSyncStatus = (message,kind='local') => {
      lastSyncStatus=message;
      el('syncIndicator').textContent = (kind==='saved'?'✓ ':kind==='pending'?'! ':kind==='syncing'?'↻ ':'● ')+message;
      el('accountSync').textContent=message;
    };
    const updateAccountDetails = () => {
      window.flyingBirdApplyAuthLocale?.();
      const user=auth.currentUser;
      el('accountDetails').hidden = !user;
      el('authLogout').hidden = !user;
      const p=jsonRead(localProfileKey,{});
      el('accountNick').textContent=p.nick||'—';
      el('accountId').textContent=p.id||'—';
      el('accountEmail').textContent=user?.email||'—';
      el('accountProvider').textContent=user?.providerData?.some(x=>x.providerId==='google.com')?'Google':t('PASS_PROVIDER');
      el('accountSync').textContent=lastSyncStatus;
      el('accountBtn').textContent=user?'✓ '+(p.nick||t('ACCOUNT')):t('ACCOUNT_GUEST');
    };
    const cacheCurrent = identity => {
      if (!identity) return;
      const progress=readProgress(), profile=jsonRead(localProfileKey,{});
      localStorage.setItem(identity==='guest'?guestProgressKey:userProgressKey(identity),JSON.stringify(progress));
      localStorage.setItem(identity==='guest'?guestProfileKey:userProfileKey(identity),JSON.stringify(profile));
    };
    const swapIdentity = (identity,progress,profile) => {
      switchingIdentity=true;
      try {
        applyProgress(progress||{cfg:{},save:{},wallet:{}});
        // Preserve generated guest ID if the migration's guest profile was empty.
        if (profile && profile.id) applyCloudProfile(profile);
        else {
          const fresh = {id:'',nick:'',av:{skin:0,bg:0}};
          // Canvas profile ID is generated by the game on initial load; request a fresh one.
          window.dispatchEvent(new CustomEvent('flyingbird:new-guest-profile',{detail:fresh}));
        }
        currentIdentity=identity;
        cacheCurrent(identity);
      } finally { switchingIdentity=false; }
      updateAccountDetails();
    };
    const flushProgress = async () => {
      if (!activeProgressUser || progressBusy || !pendingSave) return !pendingSave;
      const uid=activeProgressUser, gen=syncGeneration;
      if (auth.currentUser?.uid!==uid) return false;
      progressBusy=true; pendingSave=false;
      const payload=readProgress();
      setSyncStatus(t('SYNC_SAVING'),'syncing');
      try {
        await setDoc(doc(db,'progress',uid),{...payload,updatedAt:serverTimestamp(),version:2});
        if (gen===syncGeneration) {
          localStorage.setItem(userProgressKey(uid),JSON.stringify(payload));
          setSyncStatus(t('SYNC_SAVED'),'saved');
        }
        return true;
      } catch(e) {
        if (gen===syncGeneration) { pendingSave=true;cacheCurrent(uid);setSyncStatus(t('SYNC_PENDING_NETWORK'),'pending'); }
        return false;
      } finally {
        progressBusy=false;
        if (pendingSave && gen===syncGeneration && navigator.onLine && auth.currentUser?.uid===uid) {
          clearTimeout(syncTimer);syncTimer=setTimeout(flushProgress,12000);
        }
      }
    };
    const scheduleProgressSave = () => {
      if (switchingIdentity) return;
      if (currentIdentity) cacheCurrent(currentIdentity);
      if (!activeProgressUser || !progressReady) { setSyncStatus(t('SYNC_LOCAL_STATE'),'local');return; }
      pendingSave=true;
      setSyncStatus(navigator.onLine?t('SYNC_PENDING'):t('SYNC_PENDING_NETWORK'),'pending');
      clearTimeout(syncTimer);syncTimer=setTimeout(flushProgress,1500);
    };
    window.addEventListener('flyingbird:progress-changed',scheduleProgressSave);
    window.addEventListener('flyingbird:progress-changed',()=>{updateAccountDetails();});
    window.addEventListener('online',()=>{if(pendingSave) scheduleProgressSave();});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden' && pendingSave){clearTimeout(syncTimer);flushProgress();}});
    const chooseProgress = (local,cloud) => new Promise(resolve=>{
      const best=p=>Math.max(0,Number(p?.save?.best?.EASY)||0,Number(p?.save?.best?.NORMAL)||0,Number(p?.save?.best?.HARD)||0,Number(p?.save?.best?.EXTREME)||0);
      el('syncDetails').textContent=t('SYNC_COMPARE').replace('{a}',best(local)).replace('{b}',local.wallet?.coins||0).replace('{c}',best(cloud)).replace('{d}',cloud.wallet?.coins||0);
      el('syncError').textContent='';syncPanel.hidden=false;panel.hidden=true;
      el('syncUseCloud').onclick=()=>{syncPanel.hidden=true;resolve('cloud');};
      el('syncUseLocal').onclick=()=>{syncPanel.hidden=true;resolve('local');};
    });
    const startProgressSync = async user => {
      const gen=++syncGeneration;
      clearTimeout(syncTimer);activeProgressUser=null;pendingSave=false;progressReady=false;
      const uid=user.uid;
      const cached=jsonRead(userProgressKey(uid));
      // Only use the old unpartitioned save when it was already owned by this UID.
      const migrated=(originalOwner===uid)?originalProgress:null;
      const local=cached||migrated;
      setSyncStatus(t('SYNC_CHECK'),'syncing');
      try {
        const snapshot=await getDoc(doc(db,'progress',uid));
        if(gen!==syncGeneration||auth.currentUser?.uid!==uid)return;
        const cloud=snapshot.exists()?snapshot.data():null;
        const cloudProgress=cloud?{cfg:cloud.cfg||{},save:cloud.save||{},wallet:cloud.wallet||{}}:null;
        let selected=local||cloudProgress||{cfg:{},save:{},wallet:{}};
        let upload=false;
        if(local && cloudProgress && normalize(local)!==normalize(cloudProgress)) {
          const choice=await chooseProgress(local,cloudProgress);
          if(gen!==syncGeneration||auth.currentUser?.uid!==uid)return;
          selected=choice==='cloud'?cloudProgress:local;
          upload=choice==='local';
        } else if(!cloudProgress) upload=true;
        swapIdentity(uid,selected,jsonRead(userProfileKey(uid))||jsonRead(localProfileKey,{}));
        activeProgressUser=uid;progressReady=true;
        localStorage.setItem(ownerKey,uid);
        if(upload) scheduleProgressSave();
        else setSyncStatus(t('SYNC_SAVED'),'saved');
      } catch(e) {
        if(gen!==syncGeneration)return;
        // Offline: use only this user's own cached data, never the previous account's data.
        if(local) {
          swapIdentity(uid,local,jsonRead(userProfileKey(uid)));
          activeProgressUser=uid;progressReady=true;pendingSave=true;
          localStorage.setItem(ownerKey,uid);
          setSyncStatus(t('SYNC_PENDING_NETWORK'),'pending');
        } else {
          setSyncStatus(t('SYNC_UNAVAILABLE'),'pending');
          error.textContent=t('OFFLINE_EMPTY');
        }
      }
    };
    const stopProgressSync = () => {
      ++syncGeneration;clearTimeout(syncTimer);
      activeProgressUser=null;pendingSave=false;progressReady=false;
      syncPanel.hidden=true;
      swapIdentity('guest',jsonRead(guestProgressKey,{cfg:{},save:{},wallet:{}}),jsonRead(guestProfileKey,{}));
      localStorage.removeItem(ownerKey);
      setSyncStatus(t('SYNC_LOCAL_STATE'),'local');
    };
    el('logoutConfirm').onclick=async()=>{
      el('logoutConfirm').disabled=true;
      clearTimeout(syncTimer);
      // Await an already-running upload; do not claim it completed prematurely.
      if(progressBusy) {
        el('logoutMessage').textContent=t('LOGOUT_BUSY');
        for(let i=0;i<60 && progressBusy;i++) await new Promise(r=>setTimeout(r,150));
      }
      if(progressBusy) {
        el('logoutMessage').textContent=t('LOGOUT_TIMEOUT');
        el('logoutConfirm').disabled=false;return;
      }
      if(pendingSave) {
        const ok=await flushProgress();
        if(!ok) {
          el('logoutMessage').textContent=t('LOGOUT_OFFLINE');
          el('logoutForce').hidden=false;
          el('logoutConfirm').disabled=false;return;
        }
      }
      await completeLogout();
    };
    const completeLogout=async()=>{
      if(auth.currentUser) cacheCurrent(auth.currentUser.uid);
      try { await Promise.race([Promise.resolve(window.flyingBirdBeforeSignOut?.()).catch(()=>{}),new Promise(r=>setTimeout(r,1300))]);await signOut(auth);el('logoutPanel').hidden=true;panel.hidden=false;setAuthMode('choice'); }
      catch(e){el('logoutMessage').textContent=t('LOGOUT_ERROR')+(e.code||e.message);el('logoutConfirm').disabled=false;}
    };
    el('logoutForce').onclick=completeLogout;
    let authInitialized=false;
    onAuthStateChanged(auth,async user=>{
      const initial=!authInitialized;authInitialized=true;
      signedIn=!!user;setAuthMode('choice');
      window.flyingBirdAuth={auth,user,db};
      if(user) {
        // Save the guest state only if it was actually the active identity.
        if(!currentIdentity && !originalOwner && initial) cacheCurrent('guest');
        else if(currentIdentity && currentIdentity!==user.uid) cacheCurrent(currentIdentity);
        const cachedProfile=jsonRead(userProfileKey(user.uid)) || (originalOwner===user.uid ? originalProfile : null);
        switchingIdentity=true;
        try {
          if(cachedProfile?.id) applyCloudProfile(cachedProfile);
          else window.dispatchEvent(new CustomEvent('flyingbird:new-guest-profile'));
        } finally { switchingIdentity=false; }
        await syncProfile(user);
        if(auth.currentUser?.uid!==user.uid)return;
        // Cosmetic public card publishing must not wait for cloud save conflict resolution.
        window.flyingBirdIdentityReadyUid = profileOwner===user.uid ? user.uid : null;
        if(window.flyingBirdIdentityReadyUid) window.dispatchEvent(new CustomEvent('flyingbird:identity-ready',{detail:{uid:user.uid}}));
        await startProgressSync(user);
        window.flyingBirdPublicReadyUid=user.uid;
        window.dispatchEvent(new CustomEvent('flyingbird:account-ready',{detail:{uid:user.uid}}));
        panel.hidden=true;
      } else {
        window.flyingBirdPublicReadyUid=null;
        window.flyingBirdIdentityReadyUid=null;
        profileOwner=null;
        if(currentIdentity && currentIdentity!=='guest') cacheCurrent(currentIdentity);
        stopProgressSync();
        if(!initial) {panel.hidden=false;setAuthMode('choice');}
      }
      status.dataset.dynamic = '1';
      status.textContent=user?t('CONNECTED'):t('GUEST_PROMPT');
      updateAccountDetails();
    });

  } catch (e) {
    error.textContent = t('GENERIC_ACTION') + e.message;
  }
  }

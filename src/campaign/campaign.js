/* Read-only campaign map and per-identity local chapter selection.
   This release deliberately has no match launcher or completion/reward writer. */
(() => {
  'use strict';
  const model=window.HighFlyCampaignModel;
  const panel=document.createElement('section');
  panel.id='hfCampaign';panel.hidden=true;panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','hfCampaignTitle');
  document.body.append(panel);
  let onClose=null,previousFocus=null,mode='solo',saveFailed=false,selectedAct=null;
  const volatileSelection=new Map();
  const canvas=document.getElementById('c');let previousInert=false;
  const lang=()=>{try{return JSON.parse(localStorage.getItem('flyingBirdCfg')||'{}').lang||'EN';}catch{return 'EN';}};
  const t=(key,params)=>window.HighFlyCampaignText(lang(),key,params);
  const uid=()=>window.flyingBirdAuth?.auth?.currentUser?.uid||null;
  const getProgress=()=>{let progress;try{progress=model.read(localStorage,uid());}catch{progress=model.empty();}const selected=volatileSelection.get(uid());if(selected)progress.selectedChapter=selected;return progress;};
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const actName=a=>a.id==='act-2'?t('elements'):t('act')+' '+a.number;
  const positions=[[12,25],[24,17],[36,28],[54,20],[65,30],[76,19],[88,32],[84,63],[72,76],[59,62],[37,68],[25,80],[12,65]];
  const routePath=positions.map((p,i)=>(i?'L':'M')+p[0]*10+' '+p[1]*6).join(' ');
  const world=`<svg class="hfWorld" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
    <defs><pattern id="hfGrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#91afc5" stroke-opacity=".07"/></pattern><linearGradient id="hfLand" x2="1" y2="1"><stop stop-color="#304b4d"/><stop offset="1" stop-color="#1d303e"/></linearGradient></defs>
    <rect width="1000" height="600" fill="url(#hfGrid)"/>
    <g fill="none" stroke="#7d9cab" stroke-opacity=".13"><ellipse cx="500" cy="300" rx="465" ry="245"/><ellipse cx="500" cy="300" rx="420" ry="210"/><path d="M0 300H1000M500 0V600"/></g>
    <g fill="url(#hfLand)" stroke="#6d9898" stroke-opacity=".35" stroke-width="2">
    <path class="hfActLand" data-act-region="act-1" d="M65 121L110 70 213 65 248 98 325 76 396 116 418 200 376 252 297 247 245 281 164 249 94 267 53 205Z"/>
    <path class="hfActLand" data-act-region="act-2" d="M478 89L550 57 620 85 692 63 740 88 815 65 921 105 950 185 914 259 813 268 771 245 707 279 640 253 569 276 505 230 470 165Z"/>
    <path class="hfActLand" data-act-region="act-3" d="M541 351L589 311 648 330 700 300 756 326 844 308 926 359 945 414 895 481 811 504 745 487 690 523 607 494 563 456Z"/>
    <path class="hfActLand" data-act-region="act-4" d="M54 359L114 319 191 334 240 306 316 335 394 317 432 378 418 442 375 492 293 525 205 511 136 526 73 476 39 415Z"/>
    </g>
    <g fill="none" stroke="#8cb5a5" stroke-opacity=".18" stroke-width="1.5"><path d="M86 151L130 100 210 100 256 123 324 107 367 139 386 195 349 220 281 214 236 243 174 219 106 228Z"/><path d="M505 122L558 91 620 117 699 94 747 121 813 100 889 135 917 188 885 229 811 232 768 212 710 245 638 220 570 240 531 208Z"/><path d="M568 377L599 342 653 362 703 333 758 358 839 343 894 378 908 413 870 453 809 472 743 455 688 491 625 467 593 432Z"/><path d="M80 384L121 351 192 365 244 338 317 368 382 350 400 393 385 431 352 465 290 490 205 479 147 492 100 455 68 416Z"/></g>
    <g fill="#4b6867" opacity=".6"><path d="M164 173l22-40 23 40h-45m36 0l18-31 17 31m90 29l25-47 28 47M581 158l22-42 25 42m42-5l20-35 21 35M775 432l24-42 24 42m-101-39l17-29 18 29M147 436l19-35 19 35m131-34l25-42 24 42"/></g>
    <path d="${routePath}" fill="none" stroke="#091722" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${routePath}" fill="none" stroke="#c5b986" stroke-opacity=".65" stroke-width="2.5" stroke-dasharray="5 8" stroke-linecap="round"/>
    <g stroke="#9fb8be" fill="none" opacity=".45"><circle cx="476" cy="500" r="19"/><path d="M476 472v56m-28-28h56m-28-17l5 17-5 17-5-17Z"/></g>
  </svg>`;
  function render() {
    const progress=getProgress(),chapter=model.chapters.find(c=>c.id===progress.selectedChapter)||model.chapters[0];
    const act=model.acts.find(a=>a.id===chapter.act),access=model.access(chapter,progress);
    panel.innerHTML=`<div class="hfCampaignShell">
      <header class="hfCampaignHeader"><div><p class="hfEyebrow">HIGH FLY / ${escape(t('foundation'))}</p><h1 id="hfCampaignTitle">${escape(t('title'))}</h1><p class="hfCampaignSubtitle">${escape(t('subtitle'))}</p></div><button class="hfBack" type="button" data-campaign-close>← ${escape(t('back'))}</button></header>
      <div class="hfRotate"><div aria-hidden="true">↻</div><h2>${escape(t('rotate'))}</h2><p>${escape(t('rotateHint'))}</p><button type="button" data-campaign-close>${escape(t('back'))}</button></div>
      <div class="hfCampaignLandscape"><div class="hfCampaignToolbar"><div class="hfMode" role="group" aria-label="${escape(t('selection'))}"><button type="button" data-mode="solo" aria-pressed="${mode==='solo'}">${escape(t('solo'))}</button><button type="button" data-mode="coop" aria-pressed="${mode==='coop'}">${escape(t('coop'))}</button></div><span class="hfCampaignCount">${escape(t('progress',{n:progress.completed.length}))}</span><span class="hfIdentity">${escape(t(uid()?'account':'guest'))} · ${escape(t('local'))}</span></div>
      <div class="hfCampaignBody"><div class="hfAtlas"><div class="hfActTabs" role="group" aria-label="${escape(t('routeLabel'))}">${model.acts.map(a=>`<button type="button" data-act="${a.id}" aria-pressed="${a.id===(selectedAct||act.id)}"><span>${a.number}</span> ${escape(actName(a))}</button>`).join('')}</div>
      <div class="hfWorldMap" role="group" aria-label="${escape(t('routeLabel'))}">${world}
      ${model.acts.map((a,i)=>`<div class="hfRegion hfRegion${i}"><span>${a.number}</span> ${escape(actName(a))}</div>`).join('')}
      ${model.chapters.map((c,i)=>`<button type="button" class="hfChapter ${c.finale?'hfFinale':''}" data-chapter="${c.id}" style="left:${positions[i][0]}%;top:${positions[i][1]}%" aria-current="${!selectedAct&&c.id===chapter.id?'step':'false'}" aria-label="${escape(t('chapter'))} ${c.number} · ${escape(t('development'))} · ${escape(t(model.access(c,progress)))}${c.finale?' · '+escape(t('finalBoss')):''}"><span class="hfChapterNumber">${String(c.number).padStart(2,'0')}</span><span class="hfChapterCaption">${escape(t('chapter'))} ${c.number}</span>${c.finale?'<span class="hfBossMark" aria-hidden="true">◆</span>':''}</button>`).join('')}
      <div class="hfMapFoot"><span>01 — 13</span><span>${escape(t('development'))}</span></div></div>
      <p class="hfMapNote">${escape(t('noPlay'))}</p></div>
      <article class="hfChapterDetails" aria-label="${escape(t('details'))}"><p class="hfEyebrow">${escape(actName(act))} / ${String(chapter.number).padStart(2,'0')}</p><h2>${escape(t('chapter'))} ${String(chapter.number).padStart(2,'0')}</h2><div class="hfBadges"><span>${escape(t('development'))}</span><span class="hfAccess">${escape(t(access))}</span></div>
      <dl><div><dt>${escape(t('map'))}</dt><dd>${escape(t('unassigned'))}</dd></div><div><dt>${escape(t('boss'))}</dt><dd>${escape(t(chapter.finale?'finalBoss':'bossPending'))}</dd></div><div><dt>${escape(t('difficulty'))}</dt><dd>${escape(t('difficultyPending'))}</dd></div></dl>
      <div class="hfUnlock"><h3>${escape(t('unlock'))}</h3><p>${escape(chapter.previous?t('previousUnlock',{n:chapter.number-1}):t('firstUnlock'))}</p></div><div class="hfRewards"><h3>${escape(t('rewards'))}</h3><p>${escape(t('chapterReward'))}</p>${chapter.finale?`<p class="hfActReward">${escape(t('actReward'))}</p>`:''}<small>${escape(t('repeatReward'))}</small></div><p class="hfOneAttempt">${escape(t('rule'))}</p><button type="button" class="hfLaunch" disabled>${escape(t('start'))}</button>
      <p class="hfCoopNote">${mode==='coop'?escape(t('coopNote'))+(uid()?'':' '+escape(t('guestCoop'))):escape(t('noCloud'))}</p></article></div></div>
      <footer class="hfCampaignFooter"><span>${escape(t('foundation'))} · 0.1</span><span role="status">${escape(t(saveFailed?'storageError':'local'))}</span></footer></div>`;
    panel.querySelectorAll('[data-act-region]').forEach(region=>region.classList.toggle('hfActSelected',region.dataset.actRegion===selectedAct));
    orientation();
  }
  function orientation(){
    const portrait=(window.visualViewport?.width||innerWidth)<=(window.visualViewport?.height||innerHeight);
    panel.classList.toggle('hfPortrait',portrait);
    // CSS handles rotation before this listener; this also keeps focus out of hidden content.
    if(portrait&&panel.contains(document.activeElement)&&document.activeElement.closest('.hfCampaignLandscape'))panel.querySelector('[data-campaign-close]')?.focus();
  }
  function select(id){
    selectedAct=null;
    try{saveFailed=!model.selectChapter(localStorage,uid(),id).saved;}catch{saveFailed=true;}
    if(saveFailed)volatileSelection.set(uid(),id);else volatileSelection.delete(uid());
    render();panel.querySelector(`[data-chapter="${id}"]`)?.focus({preventScroll:true});
  }
  function close(restoreFocus=true){
    if(panel.hidden)return;
    panel.hidden=true;window.flyingBirdCampaignActive=false;
    if(canvas)canvas.inert=previousInert;
    const done=onClose;onClose=null;done?.();
    if(restoreFocus&&previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  function open(callback){
    if(!panel.hidden||window.flyingBirdMpRaceActive||document.querySelector('[role="dialog"]:not([hidden])'))return false;
    onClose=callback;previousFocus=document.activeElement;mode='solo';saveFailed=false;selectedAct=null;
    previousInert=!!canvas?.inert;if(canvas)canvas.inert=true;
    panel.hidden=false;window.flyingBirdCampaignActive=true;render();
    panel.querySelector('[data-campaign-close]').focus({preventScroll:true});return true;
  }
  panel.addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button||button.disabled)return;
    if(button.hasAttribute('data-campaign-close')){close();return;}
    if(button.dataset.chapter){select(button.dataset.chapter);return;}
    if(button.dataset.act){
      selectedAct=button.dataset.act;render();
      panel.querySelector(`[data-act="${selectedAct}"]`).focus({preventScroll:true});return;
    }
    if(button.dataset.mode){mode=button.dataset.mode;render();panel.querySelector(`[data-mode="${mode}"]`).focus();}
  });
  panel.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
    if(e.key==='Tab'){
      const all=[...panel.querySelectorAll('button:not(:disabled)')].filter(el=>el.getClientRects().length);
      const first=all[0],last=all[all.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
    if(e.target.dataset.chapter&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
      e.preventDefault();const i=model.chapters.findIndex(c=>c.id===e.target.dataset.chapter);
      const next=e.key==='Home'?0:e.key==='End'?12:Math.max(0,Math.min(12,i+(e.key==='ArrowLeft'?-1:1)));select(model.chapters[next].id);
    }
  });
  // Existing invitations/auth dialogs retain ownership of their lifecycle.
  new MutationObserver(()=>{if(!panel.hidden&&document.querySelector('[role="dialog"]:not([hidden]):not(#hfCampaign)'))close(false);}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});
  const refresh=()=>{if(!panel.hidden){render();panel.querySelector('[data-campaign-close]').focus({preventScroll:true});}};
  for(const event of ['flyingbird:account-ready','flyingbird:identity-ready','flyingbird:apply-progress','flyingbird:new-guest-profile'])window.addEventListener(event,()=>queueMicrotask(refresh));
  window.addEventListener('storage',e=>{if(e.key===model.storageKey(uid())||e.key==='flyingBirdCfg')refresh();});
  window.addEventListener('resize',orientation);window.visualViewport?.addEventListener('resize',orientation);
  window.HighFlyCampaign=Object.freeze({open,close});
})();

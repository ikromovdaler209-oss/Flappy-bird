/* Campaign foundation. No wallet writes, cloud writes, or playable chapters yet. */
(() => {
  'use strict';
  const acts = Object.freeze([
    {id:'act-1',number:'I',start:1,count:3},
    {id:'act-2',number:'II',start:4,count:4},
    {id:'act-3',number:'III',start:8,count:3},
    {id:'act-4',number:'IV',start:11,count:3}
  ].map(Object.freeze));
  const chapters = Object.freeze(acts.flatMap(act => Array.from({length:act.count}, (_,i) => Object.freeze({
    id:`chapter-${String(act.start+i).padStart(2,'0')}`, number:act.start+i, act:act.id,
    previous:act.start+i===1?null:`chapter-${String(act.start+i-1).padStart(2,'0')}`,
    finale:i===act.count-1, release:'development', mapId:null, bossId:null,
    obstacles:Object.freeze([]), quests:Object.freeze([]), difficulty:null,
    rewards:Object.freeze({mapId:null,coins:null,repeatCoins:null,skinId:null,trailId:null,achievementId:null})
  }))));
  const empty = () => ({schema:1,selectedChapter:chapters[0].id,completed:[],claimedActs:[]});
  function normalize(raw, catalog=chapters) {
    const result=empty();
    if(!raw || raw.schema!==1)return result;
    if(catalog.some(c=>c.id===raw.selectedChapter))result.selectedChapter=raw.selectedChapter;
    // Accept only a contiguous prefix of released chapters; placeholders never unlock rewards.
    const done=new Set(Array.isArray(raw.completed)?raw.completed.filter(x=>typeof x==='string'):[]);
    for(const c of catalog){if(c.release!=='released'||!done.has(c.id))break;result.completed.push(c.id);}
    result.claimedActs=acts.filter(a=>Array.isArray(raw.claimedActs)&&raw.claimedActs.includes(a.id)&&catalog.filter(c=>c.act===a.id).length===a.count&&catalog.filter(c=>c.act===a.id).every(c=>result.completed.includes(c.id))).map(a=>a.id);
    return result;
  }
  function access(chapter,progress,catalog=chapters) {
    const p=normalize(progress,catalog);
    if(p.completed.includes(chapter.id))return 'completed';
    return !chapter.previous||p.completed.includes(chapter.previous)?'available':'locked';
  }
  function canStart(chapter,progress,{landscape=false,mode='solo',uid=null,peer=null,catalog=chapters}={}) {
    if(!chapter||chapter.release!=='released'||!chapter.mapId||!chapter.bossId)return false;
    if(!landscape||!['solo','coop'].includes(mode)||access(chapter,progress,catalog)==='locked')return false;
    if(mode==='coop'&&(!uid||!peer||access(chapter,peer,catalog)==='locked'))return false;
    return true;
  }
  const storageKey=uid=>'highFlyCampaignV1:'+ (uid?'uid:'+encodeURIComponent(uid):'guest');
  function read(storage,uid){try{return normalize(JSON.parse(storage.getItem(storageKey(uid))));}catch{return empty();}}
  function selectChapter(storage,uid,id){const progress=read(storage,uid);if(!chapters.some(c=>c.id===id))return {progress,saved:false};progress.selectedChapter=id;try{storage.setItem(storageKey(uid),JSON.stringify(progress));return {progress,saved:true};}catch{return {progress,saved:false};}}
  window.HighFlyCampaignModel=Object.freeze({acts,chapters,empty,normalize,access,canStart,storageKey,read,selectChapter});
})();

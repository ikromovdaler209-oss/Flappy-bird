/** High Fly multiplayer networking helpers.
 * All calculations are deterministic, free of Firebase/DOM dependencies and
 * reusable by the standalone multi-client network simulation.
 */
export const MP_TICK_MS = 1000 / 60;
const TERMINAL = new Set(['DEAD', 'DNF', 'SURVIVED']);
const finite = x => typeof x === 'number' && Number.isFinite(x);
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));

/** Validates the last confirmed room snapshot, before asking Firebase to start. */
export function assessReadyRoom(room, hostUid) {
  const participants = Object.entries(room?.slots || {})
    .filter(([,slot]) => slot && typeof slot.uid === 'string' && slot.uid)
    .sort((a,b) => Number(a[0])-Number(b[0]));
  const ids = participants.map(([,slot]) => slot.uid);
  const capacity = Number(room?.meta?.capacity);
  const version = room?.meta?.version;
  const notReady = participants.filter(([,slot]) => slot.ready !== true || slot.rev !== version);
  const valid = room?.hostUid === hostUid && ids.length >= 2 && ids.length <= capacity
    && ids.length === new Set(ids).size && notReady.length === 0;
  return { valid, participants, notReady, host: room?.hostUid === hostUid, count: ids.length };
}

/** Ignore regressions from a delayed state listener, even before interpolation. */
export function isFreshPlayerState(previous, next) {
  if(!next || !Number.isSafeInteger(next.tick) || next.tick<0)return false;
  if(next.status !== 'ALIVE' && !TERMINAL.has(next.status))return false;
  for(const key of ['y','vy','score','elapsedMs']) {
    if(next[key] !== undefined && !finite(next[key]))return false;
  }
  if(!previous)return true;
  if(!finite(previous.tick) || next.tick<previous.tick)return false;
  if(TERMINAL.has(previous.status) && next.status!==previous.status)return false;
  return true;
}

export function newGhostTrack() {
  return {samples: [],lastStatus: 'ALIVE',lastReceiveMs: null,intervalMs: null,renderY: null,received: 0};
}

/** Ignores stale / replayed packets and NEVER lets a terminal bird revive. */
export function acceptGhostPacket(track, packet, receiveMs) {
  if (!packet || !Number.isSafeInteger(packet.tick) || packet.tick < 0 || !finite(packet.y) || !finite(packet.vy)) return false;
  const status = String(packet.status || 'ALIVE');
  if (!['ALIVE',...TERMINAL].includes(status)) return false;
  const samples=track.samples,previous=samples[samples.length-1];
  if (TERMINAL.has(track.lastStatus) && status !== track.lastStatus) return false;
  if (previous && (packet.tick < previous.tick ||
      (packet.tick === previous.tick && !(status !== 'ALIVE' && track.lastStatus === 'ALIVE')))) return false;
  const previousReceive=track.lastReceiveMs;
  if (finite(receiveMs) && finite(previousReceive)) {
    const gap = receiveMs - previousReceive;
    if (gap >= 0 && gap < 15000) track.intervalMs = track.intervalMs === null ? gap : track.intervalMs * .8 + gap * .2;
  }
  if (finite(receiveMs)) track.lastReceiveMs=receiveMs;
  if (previous && packet.tick === previous.tick) samples.pop();
  samples.push({tick:packet.tick,y:packet.y,vy:packet.vy,status});
  if(samples.length>5)samples.shift();
  track.lastStatus = status;
  track.received++;
  return true;
}

/** Interpolation plus short bounded physics extrapolation; never guess a flap. */
export function ghostPosition(track, localTick, gravity, minY, maxY) {
  const samples=track.samples;
  if(!samples.length)return null;
  const targetTick=Math.max(0,localTick-2); // ~33ms rendering buffer
  let estimate=samples[samples.length-1].y;
  if(targetTick<=samples[0].tick)estimate=samples[0].y;
  else {
    let found=false;
    for(let i=1;i<samples.length;i++){
      const a=samples[i-1],b=samples[i];
      if(targetTick<=b.tick){
        const t=clamp((targetTick-a.tick)/Math.max(1,b.tick-a.tick),0,1);
        estimate=a.y+(b.y-a.y)*t;
        found=true;break;
      }
    }
    if(!found){
      const latest=samples[samples.length-1];
      const dt=clamp(targetTick-latest.tick,0,5); // <=83ms prediction; avoids phantom flaps
      estimate=latest.y+latest.vy*dt+gravity*dt*(dt+1)/2;
    }
  }
  estimate=clamp(estimate,minY,maxY);
  const prev=track.renderY;
  const diff=prev===null?0:Math.abs(estimate-prev);
  // Minimize the extra display delay caused by overly conservative smoothing.
  const gain=diff>55?.82:diff>22?.70:.53;
  const display=prev===null?estimate:prev+(estimate-prev)*gain;
  track.renderY=clamp(display,minY,maxY);
  return track.renderY;
}

export function newNetworkStats() {
  return {ackMs:null,jitterMs:0,acked:0,failed:0,lastAckAt:0,lastError:null,
    connected:true,sendCount:0,remotes:0};
}

/** Measures RTDB write acknowledgment, NOT peer-to-peer ping. */
export function noteWriteAck(stats, ms, success, now) {
  if(success && finite(ms) && ms>=0 && ms<30000){
    const prior=stats.ackMs;
    stats.ackMs=prior===null?ms:prior*.82+ms*.18;
    stats.jitterMs=prior===null?0:stats.jitterMs*.84+Math.abs(ms-prior)*.16;
    stats.acked++;
    stats.lastAckAt=now;
    stats.lastError=null;
  } else if(!success){stats.failed++;stats.lastError=now;}
}

/** Small rooms can send more often; busy/slow links self-throttle. */
export function publishInterval(playerCount, ackMs) {
  const base=playerCount>=6?125:playerCount>=3?105:85;
  const congestion=ackMs===null?0:ackMs>500?65:ackMs>270?35:ackMs>155?15:0;
  return base+congestion;
}

export function networkQuality(stats, now) {
  if(!stats.connected)return 'offline';
  if(stats.ackMs===null)return 'pending';
  if(stats.lastAckAt && now-stats.lastAckAt>5000)return 'stale';
  if(stats.ackMs>350 || stats.jitterMs>170)return 'slow';
  if(stats.ackMs>155 || stats.jitterMs>65)return 'fair';
  return 'good';
}

/** Official ranking: shared place ONLY at identical 60 Hz simulation ticks.
 * SURVIVED is the last living bird (even if a death occurred at that same tick),
 * disconnected participants are ranked after players who actually finished.
 * Returns new objects; source Firebase data is not mutated.
 */
export function rankRacePlayers(players){
 const rows=players.map(p=>({...p}));
 const isDnf=p=>p.status==='DNF';
 const isSurvivor=p=>p.status==='SURVIVED';
 const at=p=>Number.isFinite(p.tick)?Math.max(0,Math.floor(p.tick)):Math.max(0,Math.round((Number(p.elapsedMs)||0)/MP_TICK_MS));
 rows.sort((a,b)=>Number(isDnf(a))-Number(isDnf(b))||Number(isSurvivor(b))-Number(isSurvivor(a))||at(b)-at(a)||String(a.uid).localeCompare(String(b.uid)));
 let last=null,rank=0;
 for(let i=0;i<rows.length;i++){
  const p=rows[i],group=String(isDnf(p))+'|'+String(isSurvivor(p))+'|'+at(p);
  if(group!==last)rank=i+1;
  p.rank=rank;last=group;
 }
 return rows;
}

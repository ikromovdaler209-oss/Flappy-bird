/** v2.9 multiplayer statistics core. Pure functions: no Firebase, no DOM.
 *
 * A finished online round becomes ONE immutable "round record". The totals document is the sum
 * of its records. Firestore rules re-check every delta, so a record can be counted only once.
 */
import {MP_TICK_MS, rankRacePlayers} from './netcode.js';
import {roundFinished} from './experience.js';

export const STATS_VERSION = 1;
export const MIN_RATING_MATCHES = 5;      // matches needed to enter the Last Bird Standing ranking
export const MIN_ROUND_GAP_MS = 10000;    // two rounds of one player can never start closer than this
export const MAX_SURVIVAL_MS = 3600000;   // 1 hour hard cap on a single survival time
export const ROOM_CODE = /^FBM-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
const TERMINAL = ['DEAD', 'DNF', 'SURVIVED'];
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

export function emptyStats() {
  return {v: STATS_VERSION, matches: 0, wins: 0, totalMs: 0, bestMs: 0, lastStartAt: 0, lastRound: ''};
}

/** Clamp untrusted/cached data into a safe totals object. */
export function normalizeStats(raw) {
  const s = emptyStats();
  if (!raw || typeof raw !== 'object') return s;
  const n = (v, max) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));
  s.matches = n(raw.matches, 100000000);
  s.wins = Math.min(s.matches, n(raw.wins, 100000000));
  s.totalMs = n(raw.totalMs, 9e15);
  s.bestMs = Math.min(s.totalMs, n(raw.bestMs, MAX_SURVIVAL_MS));
  s.lastStartAt = n(raw.lastStartAt, 9e15);
  s.lastRound = typeof raw.lastRound === 'string' ? raw.lastRound.slice(0, 40) : '';
  return s;
}

/** Display numbers derived from totals. */
export function derive(stats) {
  const s = normalizeStats(stats), m = s.matches;
  return {
    matches: m, wins: s.wins, losses: m - s.wins,
    winRate: m ? Math.round(s.wins / m * 1000) / 10 : 0,
    avgMs: m ? Math.round(s.totalMs / m) : 0,
    bestMs: s.bestMs
  };
}

/** "multiplayerRounds/FBM-ABCD-EFGH/r7" -> {code, roundKey, id} */
export function parseRoundPath(path) {
  const m = /^multiplayerRounds\/([^/]+)\/(r[0-9]{1,7})$/.exec(String(path || ''));
  if (!m || !ROOM_CODE.test(m[1])) return null;
  return {code: m[1], roundKey: m[2], id: m[1] + '_' + m[2]};
}

/**
 * Verify a finished round from the realtime snapshot and build the record for `uid`.
 * Every check is deterministic; the record is rejected (never "fixed") when something is off.
 */
export function verifyRound({path, snapshot, uid}) {
  const id = parseRoundPath(path);
  if (!id) return fail('path');
  if (!snapshot || typeof snapshot !== 'object' || !uid) return fail('snapshot');
  if (!roundFinished(snapshot)) return fail('incomplete');
  const roster = Object.keys(snapshot.roster || {});
  if (!isInt(roster.length, 2, 10) || !roster.includes(uid)) return fail('roster');
  const startAt = Number(snapshot.meta?.startAt);
  if (!Number.isSafeInteger(startAt) || startAt <= 0) return fail('startAt');

  const rows = [];
  for (const rosterUid of roster) {
    const p = snapshot.players?.[rosterUid];
    if (!p || !TERMINAL.includes(p.status)) return fail('incomplete');
    if (!isInt(p.tick, 0, 10000000) || !isInt(p.elapsedMs, 0, MAX_SURVIVAL_MS) || !isInt(Number(p.score), 0, 1000000)) return fail('values');
    // elapsedMs is derived from the 60 Hz simulation tick; wide tolerance, but a mismatch is a red flag.
    if (Math.abs(p.elapsedMs - p.tick * MP_TICK_MS) > Math.max(1500, p.elapsedMs * 0.08)) return fail('consistency');
    rows.push({uid: rosterUid, status: p.status, tick: p.tick, elapsedMs: p.elapsedMs, score: Number(p.score)});
  }
  const survivors = rows.filter(p => p.status === 'SURVIVED');
  if (survivors.length > 1) return fail('survivors');

  const ranked = rankRacePlayers(rows);
  const me = ranked.find(p => p.uid === uid);
  if (!me) return fail('roster');
  const place = me.rank, tie = ranked.filter(p => p.rank === place).length > 1;
  const win = me.status === 'SURVIVED' && place === 1;
  return {
    ok: true,
    record: {
      id: id.id, code: id.code, roundKey: id.roundKey, startAt,
      players: roster.length, status: me.status, place, tie,
      elapsedMs: me.elapsedMs, score: me.score, win
    }
  };
}
const fail = reason => ({ok: false, reason});

/** Add one verified record to totals. Mirrors the Firestore rule delta-by-delta. */
export function applyRecord(stats, record) {
  const s = normalizeStats(stats);
  if (!record || !ROOM_CODE.test(record.code) || record.id !== record.code + '_' + record.roundKey) return fail('record');
  if (!isInt(record.elapsedMs, 0, MAX_SURVIVAL_MS) || !isInt(record.players, 2, 10) || !isInt(record.place, 1, record.players)) return fail('record');
  if (record.win !== (record.status === 'SURVIVED') || (record.win && record.place !== 1)) return fail('record');
  if (record.id === s.lastRound) return fail('duplicate');
  if (s.lastStartAt && record.startAt < s.lastStartAt + MIN_ROUND_GAP_MS) return fail('order');
  return {
    ok: true,
    stats: {
      ...s, matches: s.matches + 1, wins: s.wins + (record.win ? 1 : 0),
      totalMs: s.totalMs + record.elapsedMs, bestMs: Math.max(s.bestMs, record.elapsedMs),
      lastStartAt: record.startAt, lastRound: record.id
    }
  };
}

/** Ranking order for Last Bird Standing: wins, then win rate, then best time. */
export function compareRating(a, b) {
  const x = derive(a), y = derive(b);
  return y.wins - x.wins || y.winRate - x.winRate || y.bestMs - x.bestMs || String(a.nick || '').localeCompare(String(b.nick || ''));
}

export function formatDuration(ms) {
  const total = Math.max(0, Math.round(Number(ms) || 0) / 100) | 0, tenths = total % 10, sec = Math.floor(total / 10);
  return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0') + '.' + tenths;
}

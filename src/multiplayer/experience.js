/** Round identity and spectator/results helpers; no Firebase or DOM side effects. */
export function roundPath(code, version) {
  if (!Number.isInteger(version) || version < 0 || version > 1000000) throw Error('Invalid room revision');
  return 'multiplayerRounds/' + code + '/r' + version;
}
export function roundFinished(snapshot) {
  const roster = Object.keys(snapshot?.roster || {});
  return roster.length >= 2 && roster.every(uid =>
    ['DEAD', 'DNF', 'SURVIVED'].includes(snapshot.players?.[uid]?.status));
}
export function spectatorTarget(players, ownUid, current, direction = 0) {
  const ids = Object.keys(players || {}).filter(uid => uid !== ownUid && players[uid]?.status === 'ALIVE').sort();
  if (!ids.length) return null;
  const i = ids.indexOf(current);
  return ids[i < 0 ? 0 : (i + direction + ids.length) % ids.length];
}
export function nextRoundMeta(meta, expectedVersion) {
  if (!meta || meta.version !== expectedVersion || meta.version >= 1000000) return undefined;
  return {...meta, version: meta.version + 1};
}

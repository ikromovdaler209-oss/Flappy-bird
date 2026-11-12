// Multiplayer's deterministic equivalents of Solo's DIFF, speed(), hardGap()
// and extremeGap().  Only shared pipe counts and room layout are used: no
// client clock, frame rate or random state can change another player's course.
export const DIFFICULTY = Object.freeze({
  EASY: {gap: 15, spd: .9, mv: 15},
  NORMAL: {gap: 0, spd: 1, mv: 10},
  HARD: {gap: -10, spd: 1.12, mv: 5},
  EXTREME: {gap: -5, spd: 1.12, mv: 3}
});
const stage = (score, step) => Math.min(10, Math.floor(Math.max(0, score) / step));
export const tierForScore = (mode, score) => mode === 'EXTREME' ? stage(score, 8) : mode === 'HARD' ? stage(score, 16) : 0;
export function speedForScore(mode, score) {
  const n = Math.max(0, score), diff = DIFFICULTY[mode] || DIFFICULTY.NORMAL;
  return (2 + Math.min(n * .04, 1.4)) * diff.spd * (1 + tierForScore(mode, n) * .052);
}
export function gapForScore(mode, score, layout) {
  const n = Math.max(0, score), landscape = layout === 'LANDSCAPE';
  const max = landscape ? 128 : 150, min = landscape ? 95 : 105;
  if (mode === 'HARD') return Math.max(min - 12, max - 10 - n * 1.2 - tierForScore(mode, n) * 1.7);
  if (mode === 'EXTREME') return Math.max(min - 12, max - 5 - n * 1.05 - tierForScore(mode, n) * 1.7);
  const d = DIFFICULTY[mode] || DIFFICULTY.NORMAL;
  return Math.max(min + d.gap, max + d.gap - n * 1.2);
}
export function movingSpec(mode, score, roll) {
  const diff = DIFFICULTY[mode] || DIFFICULTY.NORMAL;
  const tier = tierForScore(mode, score);
  const chance = mode === 'EXTREME' ? Math.min(.72, .40 + tier * .032) : Math.min(.72, .45 + tier * .032);
  if (score < diff.mv || roll >= chance) return 0;
  return mode === 'EXTREME' ? Math.min(28, 18 + tier) : Math.min(28, 22 + tier);
}
// Integrate the *pipe-count* speed curve exactly (not a time-based imitation).
// Distance 0 starts at game start; crossing each pipe's trailing edge advances
// the score and therefore the next segment's speed, just as in Solo.
export function distanceForTick(tick, mode, world) {
  let frames = Math.max(0, tick), distance = 0;
  const first = world.spawnX - world.bx + 52;
  const terminalScore = mode === 'HARD' ? 160 : mode === 'EXTREME' ? 80 : 35;
  for (let scored = 0; scored <= terminalScore; scored++) {
    const next = first + scored * world.spacing;
    const speed = speedForScore(mode, scored);
    const duration = (next - distance) / speed;
    if (frames <= duration) return distance + frames * speed;
    frames -= duration;
    distance = next;
  }
  return distance + frames * speedForScore(mode, terminalScore + 1);
}
export function scoreForDistance(distance, world) {
  const first = world.spawnX - world.bx + 52;
  return Math.max(0, Math.floor((distance - first) / world.spacing) + 1);
}

import type { BoardState, Player } from '../game/types';
import { diceValuesFor, scoredSequences } from './computerPlayer';

/**
 * A slightly "lucky" dice roll used only for the computer at Expert difficulty, at the user's
 * explicit request to make Expert tougher to beat. Rolls twice and keeps whichever roll lets the
 * computer reach the better position on *this specific board* — i.e. biased toward whatever dice
 * it actually needs right now (a number that hits a blot, escapes a trapped checker, enters from
 * the bar, makes a point), not just toward bigger numbers or doubles in the abstract. Still
 * genuinely random — either roll is an equally fair pair of dice, just the more useful of the two
 * is kept.
 */

function rollPair(): [number, number] {
  return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
}

/** Best static-eval score the player can reach with this roll on this board, or -Infinity if no legal move. */
function bestReachableScore(board: BoardState, player: Player, dice: [number, number]): number {
  const scored = scoredSequences(board, player, diceValuesFor(dice));
  return scored.reduce((best, s) => Math.max(best, s.score), -Infinity);
}

export function rollFavorableDice(board: BoardState, player: Player): [number, number] {
  const a = rollPair();
  const b = rollPair();
  return bestReachableScore(board, player, b) > bestReachableScore(board, player, a) ? b : a;
}

/**
 * The mirror image: rolls twice and keeps whichever roll gives the *worse* reachable position for
 * `player` — used for the human's own dice at Expert difficulty, at the user's explicit request,
 * so the difficulty bump comes from both sides at once rather than only a stronger opponent. Same
 * fairness caveat as above: each individual roll is a perfectly ordinary pair of dice.
 */
export function rollUnfavorableDice(board: BoardState, player: Player): [number, number] {
  const a = rollPair();
  const b = rollPair();
  return bestReachableScore(board, player, b) < bestReachableScore(board, player, a) ? b : a;
}

import { applySequence, generateLegalSequences } from '../game/moveGenerator';
import { getPoint, homeBoardRange, opponent } from '../game/board';
import { evaluate } from './evaluator';
import type { BoardState, Player } from '../game/types';

/**
 * Monte Carlo rollouts: instead of judging a candidate move by a single static-evaluator snapshot,
 * play the position out to completion (or a ply cutoff) many times with random dice and a cheap
 * playing policy on both sides, and average the actual game outcome. Much more accurate than a
 * 1-ply static score, at real computational cost — used sparingly, on a short-list of candidates
 * already narrowed down by the cheaper search.
 */

function diceValuesFor(dice: [number, number]): number[] {
  return dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [dice[0], dice[1]];
}

function rollDicePair(): [number, number] {
  return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
}

/** Cheap, no-lookahead policy purely to advance a rollout playout quickly — not a real difficulty level. */
function greedyPly(board: BoardState, player: Player, dice: [number, number]): BoardState {
  const sequences = generateLegalSequences(board, player, diceValuesFor(dice));
  if (sequences.length === 0) return board;
  let best = sequences[0];
  let bestScore = -Infinity;
  for (const sequence of sequences) {
    const score = evaluate(applySequence(board, player, sequence), player).score;
    if (score > bestScore) {
      bestScore = score;
      best = sequence;
    }
  }
  return applySequence(board, player, best);
}

function equityForWin(board: BoardState, winner: Player, mover: Player): number {
  const loser = opponent(winner);
  let type: 1 | 2 | 3 = 1;
  if (board.bar[loser] === 0) {
    const [homeStart, homeEnd] = homeBoardRange(winner);
    let hasCheckerInWinnersHome = false;
    for (let p = homeStart; p <= homeEnd; p++) {
      if (getPoint(board, p).owner === loser) {
        hasCheckerInWinnersHome = true;
        break;
      }
    }
    type = hasCheckerInWinnersHome ? 3 : 2;
  } else {
    type = 3;
  }
  if (board.borneOff[loser] > 0) type = 1;
  return winner === mover ? type : -type;
}

/**
 * Plays one random game out from `board` (with `mover` to move next) to completion or a ply
 * cutoff, and returns `mover`'s equity: +1/-1 win/loss, +2/-2 gammon, +3/-3 backgammon. If neither
 * side finishes within `maxPlies`, falls back to a scaled static-eval estimate of the unresolved
 * position instead of an outcome (the standard rollout-with-cutoff hybrid).
 */
export function playRollout(board: BoardState, mover: Player, maxPlies = 60): number {
  let current = board;
  let turn: Player = mover;
  for (let ply = 0; ply < maxPlies; ply++) {
    current = greedyPly(current, turn, rollDicePair());
    if (current.borneOff[turn] === 15) return equityForWin(current, turn, mover);
    turn = opponent(turn);
  }
  // Cutoff reached — estimate via static eval, scaled down into the same rough -3..+3 range as a
  // real outcome so it blends sensibly into an average with completed rollouts.
  return Math.max(-3, Math.min(3, evaluate(current, mover).score / 15));
}

/** Average equity of `samples` independent rollouts from `board` with `mover` to move next. */
export function rolloutEquity(board: BoardState, mover: Player, samples: number, maxPlies = 60): number {
  let total = 0;
  for (let i = 0; i < samples; i++) total += playRollout(board, mover, maxPlies);
  return total / samples;
}

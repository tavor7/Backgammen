import { generateLegalSequences } from '../game/moveGenerator';
import { legalSingleMoves } from '../game/rules';
import type { BoardState, Player } from '../game/types';

export interface DiceRoll {
  dice: [number, number];
  weight: number; // number of ways out of 36 this unordered roll occurs
}

/** The 21 distinct unordered dice rolls with correct weights (doubles weight 1, others weight 2). */
export const ALL_ROLLS: DiceRoll[] = (() => {
  const rolls: DiceRoll[] = [];
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = d1; d2 <= 6; d2++) {
      rolls.push({ dice: [d1, d2], weight: d1 === d2 ? 1 : 2 });
    }
  }
  return rolls;
})();

export const TOTAL_ROLL_COMBINATIONS = 36;

function diceValuesFor(roll: DiceRoll): number[] {
  return roll.dice[0] === roll.dice[1] ? [roll.dice[0], roll.dice[0], roll.dice[0], roll.dice[0]] : [roll.dice[0], roll.dice[1]];
}

/** Probability (0-1) that `opponent` can hit the checker sitting at `point` on their next roll. */
export function probabilityBlotIsHit(board: BoardState, point: number, opponent: Player): number {
  let hittingWeight = 0;
  for (const roll of ALL_ROLLS) {
    const sequences = generateLegalSequences(board, opponent, diceValuesFor(roll));
    const canHit = sequences.some((seq) => seq.some((m) => m.to === point && m.hit));
    if (canHit) hittingWeight += roll.weight;
  }
  return hittingWeight / TOTAL_ROLL_COMBINATIONS;
}

/** Probability that `player` enters at least one checker from the bar on their next roll. */
export function probabilityOfEntering(board: BoardState, player: Player): number {
  let weight = 0;
  for (const roll of ALL_ROLLS) {
    const canEnter = diceValuesFor(roll).some((die) => legalSingleMoves(board, player, die).some((m) => m.from === 'bar'));
    if (canEnter) weight += roll.weight;
  }
  return weight / TOTAL_ROLL_COMBINATIONS;
}

/** Probability that `player` can move at least one checker currently at `point` to an open point ahead (rough escape metric). */
export function probabilityOfEscaping(board: BoardState, player: Player, point: number): number {
  let weight = 0;
  for (const roll of ALL_ROLLS) {
    const canMove = diceValuesFor(roll).some((die) => legalSingleMoves(board, player, die).some((m) => m.from === point));
    if (canMove) weight += roll.weight;
  }
  return weight / TOTAL_ROLL_COMBINATIONS;
}

/** Probability `player` can make (or reinforce to 2+) the given point on their next roll. */
export function probabilityOfCompletingPoint(board: BoardState, player: Player, point: number): number {
  let weight = 0;
  for (const roll of ALL_ROLLS) {
    const sequences = generateLegalSequences(board, player, diceValuesFor(roll));
    const completes = sequences.some((seq) => seq.filter((m) => m.to === point).length >= 1);
    if (completes) weight += roll.weight;
  }
  return weight / TOTAL_ROLL_COMBINATIONS;
}

const SHOT_PROBABILITY_CACHE = new Map<number, number>();

/**
 * Fast, board-independent approximation of the chance a checker `distance` pips away can be hit,
 * ignoring intermediate blocking (direct + combination shots, and doubles reaching via 2/3/4 dice).
 * Used inside the hot evaluation path where full move-generation-based probabilities would be too
 * expensive to compute for every candidate position; probabilityBlotIsHit above remains the precise,
 * board-aware version for one-off advisor/explanation displays.
 */
export function approximateShotProbability(distance: number): number {
  if (distance <= 0 || distance > 24) return 0;
  const cached = SHOT_PROBABILITY_CACHE.get(distance);
  if (cached !== undefined) return cached;

  let hits = 0;
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      const sums = new Set<number>([d1, d2, d1 + d2]);
      if (d1 === d2) {
        sums.add(d1 * 2);
        sums.add(d1 * 3);
        sums.add(d1 * 4);
      }
      if (sums.has(distance)) hits++;
    }
  }
  const probability = hits / 36;
  SHOT_PROBABILITY_CACHE.set(distance, probability);
  return probability;
}

/** How many of the opponent's 21 distinct rolls are entirely blocked (no legal move at all). */
export function blockingNumberCount(board: BoardState, opponent: Player): number {
  let count = 0;
  for (const roll of ALL_ROLLS) {
    const sequences = generateLegalSequences(board, opponent, diceValuesFor(roll));
    const blocked = sequences.length === 1 && sequences[0].length === 0;
    if (blocked) count += roll.weight;
  }
  return count;
}

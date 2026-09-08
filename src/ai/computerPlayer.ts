import { applySequence, generateLegalSequences } from '../game/moveGenerator';
import { opponent } from '../game/board';
import type { MoveSequence, BoardState, Player } from '../game/types';
import { evaluate } from './evaluator';
import { ALL_ROLLS } from './probabilities';
import type { Difficulty } from './difficulty';

function diceValuesFor(dice: [number, number]): number[] {
  return dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [dice[0], dice[1]];
}

function scoredSequences(board: BoardState, player: Player, dice: number[]) {
  const sequences = generateLegalSequences(board, player, dice);
  return sequences.map((sequence) => {
    const resultingBoard = applySequence(board, player, sequence);
    return { sequence, resultingBoard, score: evaluate(resultingBoard, player).score };
  });
}

/** Opponent's best 1-ply reply score (from their own perspective) after a hypothetical roll. */
function opponentBestReplyScore(board: BoardState, forPlayer: Player): number {
  const opp = opponent(forPlayer);
  let expected = 0;
  for (const roll of ALL_ROLLS) {
    const sequences = generateLegalSequences(board, opp, diceValuesFor(roll.dice));
    let best = -Infinity;
    for (const sequence of sequences) {
      const resultingBoard = applySequence(board, opp, sequence);
      const score = evaluate(resultingBoard, opp).score;
      if (score > best) best = score;
    }
    expected += (best === -Infinity ? 0 : best) * roll.weight;
  }
  return expected / 36;
}

/**
 * Chooses the computer's move for a rolled `dice`. Always routes through generateLegalSequences —
 * never bypasses the rules engine. Difficulty gates *which* legal sequence is picked.
 */
export function chooseComputerMove(board: BoardState, player: Player, dice: [number, number], difficulty: Difficulty): MoveSequence {
  const values = diceValuesFor(dice);
  const scored = scoredSequences(board, player, values);
  if (scored.length === 0) return [];
  scored.sort((a, b) => b.score - a.score);

  if (difficulty === 'medium') {
    return scored[0].sequence;
  }

  if (difficulty === 'easy') {
    const poolSize = Math.max(1, Math.ceil(scored.length * 0.4));
    const pool = scored.slice(0, poolSize);
    return pool[Math.floor(Math.random() * pool.length)].sequence;
  }

  // hard: shallow 1-ply lookahead over the top few evaluator-ranked candidates
  const topCandidates = scored.slice(0, Math.min(3, scored.length));
  let best = topCandidates[0];
  let bestNet = -Infinity;
  for (const candidate of topCandidates) {
    const opponentReply = opponentBestReplyScore(candidate.resultingBoard, player);
    const net = candidate.score - opponentReply;
    if (net > bestNet) {
      bestNet = net;
      best = candidate;
    }
  }
  return best.sequence;
}

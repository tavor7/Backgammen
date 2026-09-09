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

/**
 * Expected value (across all 21 distinct rolls, correctly weighted) of `mover`'s best reply on
 * `board`, purely by the static evaluator (no further recursion) — a plain 1-ply lookahead
 * averaged over the dice.
 */
function expectedBestReplyScore(board: BoardState, mover: Player): number {
  let expected = 0;
  for (const roll of ALL_ROLLS) {
    const sequences = generateLegalSequences(board, mover, diceValuesFor(roll.dice));
    let best = evaluate(board, mover).score;
    for (const sequence of sequences) {
      const score = evaluate(applySequence(board, mover, sequence), mover).score;
      if (score > best) best = score;
    }
    expected += best * roll.weight;
  }
  return expected / 36;
}

/**
 * Same idea, but the opponent's own "best reply" is itself net-scored against a bounded lookahead
 * at our best follow-up (net = their score − our expected best reply), instead of taking their
 * plain static-eval best — i.e. a real 3-ply search. Only the top `pool` of the opponent's
 * evaluator-ranked candidates get this extra ply, since it's the expensive part.
 */
function expectedBestReplyScoreDeep(board: BoardState, mover: Player, pool: number): number {
  let expected = 0;
  for (const roll of ALL_ROLLS) {
    const sequences = generateLegalSequences(board, mover, diceValuesFor(roll.dice));
    let best = evaluate(board, mover).score;
    if (sequences.length > 0) {
      const scored = sequences
        .map((sequence) => {
          const resultingBoard = applySequence(board, mover, sequence);
          return { resultingBoard, score: evaluate(resultingBoard, mover).score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, pool);
      for (const candidate of scored) {
        const net = candidate.score - expectedBestReplyScore(candidate.resultingBoard, opponent(mover));
        if (net > best) best = net;
      }
    }
    expected += best * roll.weight;
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

  if (difficulty === 'hard') {
    // 2-ply: our move, then the opponent's expected best reply across all 21 rolls — over the
    // top few evaluator-ranked candidates.
    const topCandidates = scored.slice(0, Math.min(3, scored.length));
    let best = topCandidates[0];
    let bestNet = -Infinity;
    for (const candidate of topCandidates) {
      const net = candidate.score - expectedBestReplyScore(candidate.resultingBoard, opponent(player));
      if (net > bestNet) {
        bestNet = net;
        best = candidate;
      }
    }
    return best.sequence;
  }

  // expert, stage 1: score EVERY legal sequence for this roll (not just a top few) against the
  // opponent's expected best reply across all 21 of their rolls — the top-N pre-filter used by
  // the other difficulties can throw away a move the static evaluator underrates before it ever
  // gets a real look, which is the main way "hard" misses things a strong player wouldn't.
  const twoPlyNet = scored.map((candidate) => ({ candidate, net: candidate.score - expectedBestReplyScore(candidate.resultingBoard, opponent(player)) }));
  twoPlyNet.sort((a, b) => b.net - a.net);

  // expert, stage 2: for just the resulting shortlist, go one ply deeper — the opponent's reply
  // is chosen with THEIR best case accounted for our follow-up too, rather than a purely greedy
  // static-eval pick, so the computer won't walk into a position that looks fine one ply out but
  // hands the opponent an easy follow-up.
  const shortlist = twoPlyNet.slice(0, Math.min(12, twoPlyNet.length));
  let best = shortlist[0].candidate;
  let bestNet = -Infinity;
  for (const { candidate } of shortlist) {
    const net = candidate.score - expectedBestReplyScoreDeep(candidate.resultingBoard, opponent(player), 3);
    if (net > bestNet) {
      bestNet = net;
      best = candidate;
    }
  }
  return best.sequence;
}

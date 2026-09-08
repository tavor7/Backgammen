import { hashBoard } from './board';
import { applyCheckerMove, legalSingleMoves } from './rules';
import type { BoardState, CheckerMove, MoveSequence, Player } from './types';

function removeOneOccurrence(values: number[], value: number): number[] {
  const idx = values.indexOf(value);
  const copy = values.slice();
  copy.splice(idx, 1);
  return copy;
}

/**
 * Recursively enumerates every way to play the remaining dice from `board`, exploring
 * all move orderings (since order can affect legality — the central Backgammon subtlety).
 * Returns continuations *not including* the current board's already-applied moves.
 * An empty remainingDice, or a position with no legal single move, yields [[]]
 * (one continuation: "stop here") so callers can concatenate uniformly.
 */
function search(board: BoardState, player: Player, remainingDice: number[]): MoveSequence[] {
  if (remainingDice.length === 0) return [[]];

  const uniqueValues = Array.from(new Set(remainingDice));
  const continuations: MoveSequence[] = [];
  let anyLegalMove = false;

  for (const die of uniqueValues) {
    const moves = legalSingleMoves(board, player, die);
    for (const move of moves) {
      anyLegalMove = true;
      const nextBoard = applyCheckerMove(board, player, move);
      const nextRemaining = removeOneOccurrence(remainingDice, die);
      for (const rest of search(nextBoard, player, nextRemaining)) {
        continuations.push([move, ...rest]);
      }
    }
  }

  return anyLegalMove ? continuations : [[]];
}

/**
 * All legal complete move sequences for `player` given `dice` (2 values, or [d,d,d,d] for doubles),
 * with the official maximal-play rule enforced: play both dice whenever any legal order allows it;
 * when only one die can ever be played, and both individual dice are independently playable but not
 * together, the larger die must be played. Every legal *order* is preserved (not deduplicated) — this
 * is the version to use for validating a specific move/prefix a player is in the middle of making,
 * since a legal order must not be rejected just because some other order reaches the same board.
 */
export function generateLegalSequencesAllOrders(board: BoardState, player: Player, dice: number[]): MoveSequence[] {
  const all = search(board, player, dice).filter((seq) => seq.length > 0);

  if (all.length === 0) return [[]];

  const maxLength = Math.max(...all.map((seq) => seq.length));
  let candidates = all.filter((seq) => seq.length === maxLength);

  const isDouble = new Set(dice).size === 1;
  if (!isDouble && maxLength === 1) {
    const [d1, d2] = dice;
    const largerDie = Math.max(d1, d2);
    const usesLargerDie = candidates.filter((seq) => seq[0].die === largerDie);
    if (usesLargerDie.length > 0) {
      candidates = usesLargerDie;
    }
  }

  return candidates;
}

/**
 * Same legal sequences as generateLegalSequencesAllOrders, but deduplicated to one representative
 * order per distinct resulting board position. Use this for display/AI purposes (the advisor, the
 * computer player) where showing/scoring the same outcome multiple times would be redundant.
 */
export function generateLegalSequences(board: BoardState, player: Player, dice: number[]): MoveSequence[] {
  return dedupeByResultingBoard(board, player, generateLegalSequencesAllOrders(board, player, dice));
}

/** Keep one representative sequence per distinct resulting board position. */
function dedupeByResultingBoard(board: BoardState, player: Player, sequences: MoveSequence[]): MoveSequence[] {
  const seen = new Map<string, MoveSequence>();
  for (const seq of sequences) {
    const resultBoard = applySequence(board, player, seq);
    const key = hashBoard(resultBoard);
    if (!seen.has(key)) seen.set(key, seq);
  }
  return Array.from(seen.values());
}

export function applySequence(board: BoardState, player: Player, sequence: CheckerMove[]): BoardState {
  return sequence.reduce((b, move) => applyCheckerMove(b, player, move), board);
}

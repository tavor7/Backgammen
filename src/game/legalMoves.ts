import { legalSingleMoves } from './rules';
import type { BoardState, CheckerMove, Player } from './types';

export { legalSingleMoves };

/** Legal single moves across every remaining die value, deduped by (from,to,die). Used for UI highlighting. */
export function legalMovesForDice(board: BoardState, player: Player, dice: number[]): CheckerMove[] {
  const uniqueDice = Array.from(new Set(dice));
  const seen = new Set<string>();
  const moves: CheckerMove[] = [];
  for (const die of uniqueDice) {
    for (const move of legalSingleMoves(board, player, die)) {
      const key = `${move.from}->${move.to}:${move.die}`;
      if (!seen.has(key)) {
        seen.add(key);
        moves.push(move);
      }
    }
  }
  return moves;
}

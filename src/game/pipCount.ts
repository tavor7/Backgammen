import { getPoint, pipDistance } from './board';
import type { BoardState, Player } from './types';

const BAR_PIP_DISTANCE = 25;

export function pipCount(board: BoardState, player: Player): number {
  let total = board.bar[player] * BAR_PIP_DISTANCE;
  for (let p = 1; p <= 24; p++) {
    const point = getPoint(board, p);
    if (point.owner === player) {
      total += point.count * pipDistance(player, p);
    }
  }
  return total;
}

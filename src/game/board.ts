import type { BoardState, Player, PointNumber, PointState } from './types';

export const OTHER_PLAYER: Record<Player, Player> = { white: 'black', black: 'white' };
export function opponent(player: Player): Player {
  return OTHER_PLAYER[player];
}

/** +1 for White (travels 1->24), -1 for Black (travels 24->1). */
export function direction(player: Player): 1 | -1 {
  return player === 'white' ? 1 : -1;
}

/** Absolute point range [start, end] (inclusive) of a player's home board. */
export function homeBoardRange(player: Player): [PointNumber, PointNumber] {
  return player === 'white' ? [19, 24] : [1, 6];
}

export function isInHomeBoard(player: Player, point: PointNumber): boolean {
  const [start, end] = homeBoardRange(player);
  return point >= start && point <= end;
}

/** Point a checker enters on from the bar for a given die value (1-6). */
export function entryPoint(player: Player, die: number): PointNumber {
  return player === 'white' ? die : 25 - die;
}

/** Distance (in pips) from a point to bearing off, for the given player. */
export function pipDistance(player: Player, point: PointNumber): number {
  return player === 'white' ? 25 - point : point;
}

function emptyPoints(): PointState[] {
  return Array.from({ length: 24 }, () => ({ owner: null, count: 0 }));
}

export function createEmptyBoard(): BoardState {
  return {
    points: emptyPoints(),
    bar: { white: 0, black: 0 },
    borneOff: { white: 0, black: 0 },
  };
}

/** Standard Backgammon starting position, in absolute (White-fixed) numbering. */
export function createInitialBoard(): BoardState {
  const points = emptyPoints();
  const set = (point: PointNumber, owner: Player, count: number) => {
    points[point - 1] = { owner, count };
  };
  set(1, 'white', 2);
  set(12, 'white', 5);
  set(17, 'white', 3);
  set(19, 'white', 5);
  set(24, 'black', 2);
  set(13, 'black', 5);
  set(8, 'black', 3);
  set(6, 'black', 5);
  return { points, bar: { white: 0, black: 0 }, borneOff: { white: 0, black: 0 } };
}

export function getPoint(board: BoardState, point: PointNumber): PointState {
  return board.points[point - 1];
}

/** Returns a new BoardState with the given point replaced. */
export function withPoint(board: BoardState, point: PointNumber, state: PointState): BoardState {
  const points = board.points.slice();
  points[point - 1] = state;
  return { ...board, points };
}

export function withBar(board: BoardState, player: Player, count: number): BoardState {
  return { ...board, bar: { ...board.bar, [player]: count } };
}

export function withBorneOff(board: BoardState, player: Player, count: number): BoardState {
  return { ...board, borneOff: { ...board.borneOff, [player]: count } };
}

/** Add (or remove, with negative delta) a checker owned by `player` at a point. Pure. */
export function addCheckerAt(board: BoardState, point: PointNumber, player: Player, delta = 1): BoardState {
  const current = getPoint(board, point);
  const newCount = current.count + delta;
  if (newCount <= 0) {
    return withPoint(board, point, { owner: null, count: 0 });
  }
  return withPoint(board, point, { owner: player, count: newCount });
}

export function totalCheckers(board: BoardState, player: Player): number {
  const onPoints = board.points.reduce((sum, p) => (p.owner === player ? sum + p.count : sum), 0);
  return onPoints + board.bar[player] + board.borneOff[player];
}

/** Deterministic string key for a board position, used for de-duplicating move sequences. */
export function hashBoard(board: BoardState): string {
  const pts = board.points.map((p) => (p.owner ? `${p.owner[0]}${p.count}` : '_')).join(',');
  return `${pts}|bar:${board.bar.white},${board.bar.black}|off:${board.borneOff.white},${board.borneOff.black}`;
}

export function boardsEqual(a: BoardState, b: BoardState): boolean {
  return hashBoard(a) === hashBoard(b);
}

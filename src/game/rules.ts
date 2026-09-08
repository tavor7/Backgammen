import { addCheckerAt, entryPoint, getPoint, homeBoardRange, isInHomeBoard, opponent, pipDistance, withBar, withBorneOff } from './board';
import type { BoardState, CheckerMove, Player, PointNumber } from './types';

export function mustEnterFromBar(board: BoardState, player: Player): boolean {
  return board.bar[player] > 0;
}

/** A point is open to `player` if empty, owned by them, or a single opposing blot. */
export function isOpenPoint(board: BoardState, point: PointNumber, player: Player): boolean {
  const p = getPoint(board, point);
  if (p.owner === null) return true;
  if (p.owner === player) return true;
  return p.count === 1;
}

export function isBlot(board: BoardState, point: PointNumber): boolean {
  const p = getPoint(board, point);
  return p.owner !== null && p.count === 1;
}

/** All 15 of `player`'s checkers are in their home board or already off. */
export function canBearOff(board: BoardState, player: Player): boolean {
  if (board.bar[player] > 0) return false;
  const [start, end] = homeBoardRange(player);
  for (let p = 1; p <= 24; p++) {
    if (p >= start && p <= end) continue;
    const point = getPoint(board, p);
    if (point.owner === player && point.count > 0) return false;
  }
  return true;
}

/** True if `player` has no checker farther from home than `point` (used for the bear-off overage rule). */
function noCheckerFurtherFromHome(board: BoardState, player: Player, point: PointNumber): boolean {
  const [start, end] = homeBoardRange(player);
  const distance = pipDistance(player, point);
  for (let p = start; p <= end; p++) {
    if (p === point) continue;
    const other = getPoint(board, p);
    if (other.owner === player && other.count > 0 && pipDistance(player, p) > distance) {
      return false;
    }
  }
  return true;
}

/**
 * Legal single-checker moves for `player` playing die `die` from a given board.
 * Returns candidate {from, to} moves with hit flag; does not mutate the board.
 * This is the single source of truth for legality — reused by move generation and UI.
 */
export function legalSingleMoves(board: BoardState, player: Player, die: number): CheckerMove[] {
  const moves: CheckerMove[] = [];

  if (mustEnterFromBar(board, player)) {
    const entry = entryPoint(player, die);
    if (isOpenPoint(board, entry, player)) {
      moves.push({ from: 'bar', to: entry, die, hit: isBlot(board, entry) && getPoint(board, entry).owner === opponent(player) });
    }
    return moves;
  }

  const dir = player === 'white' ? 1 : -1;
  const bearOffEligible = canBearOff(board, player);

  for (let from = 1; from <= 24; from++) {
    const point = getPoint(board, from);
    if (point.owner !== player || point.count === 0) continue;

    const to = from + die * dir;
    if (to >= 1 && to <= 24) {
      if (isOpenPoint(board, to, player)) {
        moves.push({ from, to, die, hit: isBlot(board, to) && getPoint(board, to).owner === opponent(player) });
      }
      continue;
    }

    // Overshoots the board: only legal as a bear-off move.
    if (!bearOffEligible) continue;
    if (!isInHomeBoard(player, from)) continue;

    const exactDistance = pipDistance(player, from) === die;
    const overage = pipDistance(player, from) < die && noCheckerFurtherFromHome(board, player, from);
    if (exactDistance || overage) {
      moves.push({ from, to: 'off', die, hit: false });
    }
  }

  return moves;
}

/** Apply a single legal CheckerMove to a board, returning a new BoardState. Does not validate legality. */
export function applyCheckerMove(board: BoardState, player: Player, move: CheckerMove): BoardState {
  let next = board;

  if (move.from === 'bar') {
    next = withBar(next, player, next.bar[player] - 1);
  } else {
    next = addCheckerAt(next, move.from, player, -1);
  }

  if (move.to === 'off') {
    next = withBorneOff(next, player, next.borneOff[player] + 1);
    return next;
  }

  if (move.hit) {
    const opp = opponent(player);
    next = addCheckerAt(next, move.to, opp, -1);
    next = withBar(next, opp, next.bar[opp] + 1);
  }
  next = addCheckerAt(next, move.to, player, 1);
  return next;
}

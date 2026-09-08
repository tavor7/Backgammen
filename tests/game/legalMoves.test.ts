import { describe, expect, it } from 'vitest';
import { createEmptyBoard, createInitialBoard, withBar } from '../../src/game/board';
import { legalSingleMoves } from '../../src/game/rules';
import type { BoardState } from '../../src/game/types';

function board(overrides: Partial<BoardState> = {}): BoardState {
  return { ...createEmptyBoard(), ...overrides };
}

function place(b: BoardState, point: number, owner: 'white' | 'black', count: number): BoardState {
  const points = b.points.slice();
  points[point - 1] = { owner, count };
  return { ...b, points };
}

describe('legalSingleMoves: basic movement', () => {
  it('allows moving to an open point', () => {
    let b = place(board(), 1, 'white', 1);
    const moves = legalSingleMoves(b, 'white', 3);
    expect(moves).toEqual([{ from: 1, to: 4, die: 3, hit: false }]);
  });

  it('allows moving onto own point (stacking)', () => {
    let b = place(board(), 1, 'white', 1);
    b = place(b, 4, 'white', 2);
    const moves = legalSingleMoves(b, 'white', 3);
    expect(moves).toContainEqual({ from: 1, to: 4, die: 3, hit: false });
  });

  it('blocks moving onto a point with 2+ opponent checkers', () => {
    let b = place(board(), 1, 'white', 1);
    b = place(b, 4, 'black', 2);
    const moves = legalSingleMoves(b, 'white', 3);
    expect(moves).toEqual([]);
  });

  it('allows hitting a single opposing blot', () => {
    let b = place(board(), 1, 'white', 1);
    b = place(b, 4, 'black', 1);
    const moves = legalSingleMoves(b, 'white', 3);
    expect(moves).toEqual([{ from: 1, to: 4, die: 3, hit: true }]);
  });

  it('moves in opposite directions for black', () => {
    let b = place(board(), 24, 'black', 1);
    const moves = legalSingleMoves(b, 'black', 3);
    expect(moves).toEqual([{ from: 24, to: 21, die: 3, hit: false }]);
  });
});

describe('legalSingleMoves: bar', () => {
  it('forces entry from the bar before any other move', () => {
    let b = place(board(), 1, 'white', 1);
    b = withBar(b, 'white', 1);
    const moves = legalSingleMoves(b, 'white', 3);
    expect(moves).toEqual([{ from: 'bar', to: 3, die: 3, hit: false }]);
  });

  it('blocks entry when the entry point is made by the opponent', () => {
    let b = place(board(), 3, 'black', 2);
    b = withBar(b, 'white', 1);
    const moves = legalSingleMoves(b, 'white', 3);
    expect(moves).toEqual([]);
  });

  it('allows entry that hits a blot', () => {
    let b = place(board(), 3, 'black', 1);
    b = withBar(b, 'white', 1);
    const moves = legalSingleMoves(b, 'white', 3);
    expect(moves).toEqual([{ from: 'bar', to: 3, die: 3, hit: true }]);
  });

  it('entry point mirrors correctly for black', () => {
    let b = withBar(board(), 'black', 1);
    const moves = legalSingleMoves(b, 'black', 4);
    expect(moves).toEqual([{ from: 'bar', to: 21, die: 4, hit: false }]);
  });
});

describe('legalSingleMoves: bearing off', () => {
  function homeOnly(player: 'white' | 'black', placements: [number, number][]): BoardState {
    let b = board();
    for (const [point, count] of placements) b = place(b, point, player, count);
    return b;
  }

  it('rejects bear-off when checkers remain outside the home board', () => {
    let b = place(board(), 19, 'white', 1);
    b = place(b, 10, 'white', 1);
    const moves = legalSingleMoves(b, 'white', 6);
    expect(moves.filter((m) => m.to === 'off')).toEqual([]);
  });

  it('allows exact bear-off', () => {
    const b = homeOnly('white', [[19, 1]]);
    const moves = legalSingleMoves(b, 'white', 6);
    expect(moves).toContainEqual({ from: 19, to: 'off', die: 6, hit: false });
  });

  it('allows overage bear-off when no checker is further from home', () => {
    const b = homeOnly('white', [[20, 1]]);
    const moves = legalSingleMoves(b, 'white', 6);
    expect(moves).toContainEqual({ from: 20, to: 'off', die: 6, hit: false });
  });

  it('rejects overage bear-off when a checker further from home exists', () => {
    const b = homeOnly('white', [
      [19, 1],
      [20, 1],
    ]);
    const moves = legalSingleMoves(b, 'white', 6);
    expect(moves.find((m) => m.from === 20 && m.to === 'off')).toBeUndefined();
    expect(moves).toContainEqual({ from: 19, to: 'off', die: 6, hit: false });
  });

  it('bears off correctly for black (mirrored home board)', () => {
    const b = homeOnly('black', [[6, 1]]);
    const moves = legalSingleMoves(b, 'black', 6);
    expect(moves).toContainEqual({ from: 6, to: 'off', die: 6, hit: false });
  });
});

describe('legalSingleMoves: initial position sanity', () => {
  it('white has legal opening moves for a 3', () => {
    const b = createInitialBoard();
    const moves = legalSingleMoves(b, 'white', 3);
    expect(moves.length).toBeGreaterThan(0);
  });
});

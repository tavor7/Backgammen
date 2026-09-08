import { describe, expect, it } from 'vitest';
import { createEmptyBoard } from '../../src/game/board';
import { applyBoardEdit, applySequence, createNewGame, redo, rollDice, truncateHistoryAt, undo, validateBoardState } from '../../src/game/gameEngine';
import type { BoardState, GameState } from '../../src/game/types';

function place(b: BoardState, point: number, owner: 'white' | 'black', count: number): BoardState {
  const points = b.points.slice();
  points[point - 1] = { owner, count };
  return { ...b, points };
}

function withBoard(state: GameState, board: BoardState): GameState {
  return { ...state, board };
}

describe('createNewGame', () => {
  it('starts white to move, awaiting roll, in progress', () => {
    const g = createNewGame('vsComputer');
    expect(g.currentPlayer).toBe('white');
    expect(g.turnPhase).toBe('awaitingRoll');
    expect(g.status).toBe('inProgress');
  });
});

describe('win detection', () => {
  it('detects a single win (loser has borne off at least one)', () => {
    let b = createEmptyBoard();
    b = place(b, 19, 'white', 1);
    b.borneOff.white = 14;
    b.borneOff.black = 3;
    let g = withBoard(createNewGame('vsComputer'), b);
    g = rollDice(g, [6, 6]);
    g = applySequence(g, [{ from: 19, to: 'off', die: 6, hit: false }]);
    expect(g.status).toBe('won');
    expect(g.winner).toBe('white');
    expect(g.winType).toBe('single');
  });

  it('detects a gammon (loser has borne off zero, no checker on bar/winner home)', () => {
    let b = createEmptyBoard();
    b = place(b, 19, 'white', 1);
    b.borneOff.white = 14;
    b = place(b, 13, 'black', 15); // all outside white's home board, none borne off
    let g = withBoard(createNewGame('vsComputer'), b);
    g = rollDice(g, [6, 6]);
    g = applySequence(g, [{ from: 19, to: 'off', die: 6, hit: false }]);
    expect(g.winType).toBe('gammon');
  });

  it('detects a backgammon (loser has a checker on the bar at the moment of the win)', () => {
    let b = createEmptyBoard();
    b = place(b, 19, 'white', 1);
    b.borneOff.white = 14;
    b = place(b, 13, 'black', 14);
    b.bar.black = 1;
    let g = withBoard(createNewGame('vsComputer'), b);
    g = rollDice(g, [6, 6]);
    g = applySequence(g, [{ from: 19, to: 'off', die: 6, hit: false }]);
    expect(g.winType).toBe('backgammon');
  });

  it('detects a backgammon (loser has a checker in the winner home board)', () => {
    let b = createEmptyBoard();
    b = place(b, 19, 'white', 1);
    b.borneOff.white = 14;
    b = place(b, 13, 'black', 14);
    b = place(b, 22, 'black', 1); // inside white's home board (19-24)
    let g = withBoard(createNewGame('vsComputer'), b);
    g = rollDice(g, [6, 6]);
    g = applySequence(g, [{ from: 19, to: 'off', die: 6, hit: false }]);
    expect(g.winType).toBe('backgammon');
  });
});

describe('undo/redo', () => {
  it('undo restores the exact prior board and redo replays it', () => {
    let g = createNewGame('vsComputer');
    const before = g.board;
    g = rollDice(g, [3, 5]);
    g = applySequence(g, [
      { from: 1, to: 4, die: 3, hit: false },
      { from: 12, to: 17, die: 5, hit: false },
    ]);
    const afterMove = g.board;
    g = undo(g);
    expect(g.board).toEqual(before);
    expect(g.currentPlayer).toBe('white');
    g = redo(g);
    expect(g.board).toEqual(afterMove);
    expect(g.currentPlayer).toBe('black');
  });

  it('undo is a no-op on an empty history', () => {
    const g = createNewGame('vsComputer');
    expect(undo(g)).toEqual(g);
  });
});

describe('manual-mode turn correction', () => {
  it('truncates history and restores the board to before the corrected turn', () => {
    let g = createNewGame('liveAssistant');
    g = rollDice(g, [3, 5]);
    g = applySequence(g, [
      { from: 1, to: 4, die: 3, hit: false },
      { from: 12, to: 17, die: 5, hit: false },
    ]);
    const boardAfterFirstTurn = g.board;
    g = rollDice(g, [2, 2]);
    g = applySequence(g, [
      { from: 24, to: 22, die: 2, hit: false },
      { from: 24, to: 22, die: 2, hit: false },
      { from: 13, to: 11, die: 2, hit: false },
      { from: 13, to: 11, die: 2, hit: false },
    ]);
    expect(g.moveHistory.length).toBe(2);
    g = truncateHistoryAt(g, 1);
    expect(g.moveHistory.length).toBe(1);
    expect(g.board).toEqual(boardAfterFirstTurn);
    expect(g.currentPlayer).toBe('black');
  });
});

describe('manual board editing', () => {
  it('edits do not require legality and are tracked as edit-type history entries', () => {
    let g = createNewGame('liveAssistant');
    g = applyBoardEdit(g, { type: 'clearBoard' });
    g = applyBoardEdit(g, { type: 'addChecker', point: 5, player: 'white' });
    expect(g.board.points[4]).toEqual({ owner: 'white', count: 1 });
    expect(g.moveHistory[g.moveHistory.length - 1].type).toBe('edit');
  });

  it('validateBoardState warns without blocking on impossible checker counts', () => {
    let b = createEmptyBoard();
    b = place(b, 1, 'white', 16);
    const warnings = validateBoardState(b);
    expect(warnings.some((w) => w.message.includes('White'))).toBe(true);
  });

  it('validateBoardState reports no warnings for the standard initial position', () => {
    const g = createNewGame('vsComputer');
    expect(validateBoardState(g.board)).toEqual([]);
  });
});

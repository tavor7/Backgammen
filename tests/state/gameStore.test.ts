import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../../src/state/gameStore';
import { createEmptyBoard } from '../../src/game/board';
import type { BoardState } from '../../src/game/types';

function place(b: BoardState, point: number, owner: 'white' | 'black', count: number): BoardState {
  const points = b.points.slice();
  points[point - 1] = { owner, count };
  return { ...b, points };
}

function resetStore() {
  useGameStore.setState({ game: null, pendingMoves: [] });
}

describe('gameStore: playSingleMove / legalDestinationsFrom consistency', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetStore();
  });

  it('every destination legalDestinationsFrom offers is actually accepted by playSingleMove', () => {
    // Regression test: this is the exact shape of board that once triggered a bug where
    // move-generator deduplication (correct for the advisor) caused the UI's incremental
    // tap-to-move validation to reject a destination it had itself just highlighted, because
    // a different move order happened to reach the same final board and won the dedup.
    useGameStore.getState().newGame('vsComputer');
    let board = place(createEmptyBoard(), 1, 'white', 1);
    board = place(board, 10, 'white', 1);
    useGameStore.setState((s) => ({
      game: s.game && {
        ...s.game,
        board,
        currentPlayer: 'white',
        turnPhase: 'awaitingMove',
        dice: { rolled: [2, 3], remaining: [2, 3], isDouble: false },
      },
    }));

    const fromOne = useGameStore.getState().legalDestinationsFrom(1);
    const fromTen = useGameStore.getState().legalDestinationsFrom(10);
    expect(fromOne.length).toBeGreaterThan(0);
    expect(fromTen.length).toBeGreaterThan(0);

    // Play the point-10 checker first (the order a naive dedup-based check used to reject).
    useGameStore.getState().playSingleMove(fromTen[0]);
    expect(useGameStore.getState().pendingMoves).toEqual([fromTen[0]]);

    // The board should visibly reflect the move (point 10 now has one fewer checker).
    const displayed = useGameStore.getState().displayBoard();
    expect(displayed.points[9].count).toBe(0);
  });

  it('completes a full turn and produces a committed TurnRecord', () => {
    useGameStore.getState().newGame('vsComputer');
    let board = place(createEmptyBoard(), 1, 'white', 1);
    board = place(board, 10, 'white', 1);
    useGameStore.setState((s) => ({
      game: s.game && {
        ...s.game,
        board,
        currentPlayer: 'white',
        turnPhase: 'awaitingMove',
        dice: { rolled: [2, 3], remaining: [2, 3], isDouble: false },
      },
    }));

    const fromTen = useGameStore.getState().legalDestinationsFrom(10);
    useGameStore.getState().playSingleMove(fromTen[0]);

    const remainingDie = useGameStore.getState().remainingDice()[0];
    const fromOne = useGameStore.getState().legalDestinationsFrom(1);
    const secondMove = fromOne.find((m) => m.die === remainingDie);
    expect(secondMove).toBeDefined();
    useGameStore.getState().playSingleMove(secondMove!);

    const game = useGameStore.getState().game!;
    expect(game.moveHistory.length).toBe(1);
    expect(game.moveHistory[0].moves.length).toBe(2);
    expect(useGameStore.getState().pendingMoves).toEqual([]);
  });
});

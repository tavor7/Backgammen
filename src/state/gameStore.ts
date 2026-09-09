import { create } from 'zustand';
import {
  applyBoardEdit,
  applySequence,
  createNewGame,
  legalSequencesForState,
  legalSequencesForStateAllOrders,
  redo as engineRedo,
  rollDice as engineRollDice,
  switchTurn as engineSwitchTurn,
  truncateHistoryAt as engineTruncateHistoryAt,
  undo as engineUndo,
  validateBoardState,
  type BoardValidationWarning,
} from '../game/gameEngine';
import { applySequence as applySequenceToBoard, generateLegalSequences, generateLegalSequencesAllOrders } from '../game/moveGenerator';
import type { BoardEdit, BoardState, CheckerMove, GameMode, GameState, MoveSequence } from '../game/types';
import { LocalStorageGameRepository } from '../persistence/localStorageAdapter';

const repository = new LocalStorageGameRepository();

function rollTwoDice(): [number, number] {
  return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
}

function sameMove(a: CheckerMove, b: CheckerMove): boolean {
  return a.from === b.from && a.to === b.to && a.die === b.die;
}

export interface LandingSpot {
  to: number | 'off';
  moves: CheckerMove[];
}

interface GameStore {
  game: GameState | null;
  /** Moves played so far this turn via tap-to-move, not yet committed to a TurnRecord. */
  pendingMoves: CheckerMove[];

  newGame: (mode: GameMode) => void;
  loadLastActive: () => Promise<GameState | null>;
  loadGame: (state: GameState) => void;

  rollDice: (dice?: [number, number]) => void;
  displayBoard: () => BoardState;
  remainingDice: () => number[];
  playSingleMove: (move: CheckerMove) => void;
  /** Plays 2+ moves for the same checker at once (a tapped combined-dice landing spot). */
  playMoves: (moves: CheckerMove[]) => void;
  playSequence: (sequence: MoveSequence) => void;
  /** Reverts the most recent not-yet-committed move this turn (before the turn finalizes). */
  undoPendingMove: () => void;

  undo: () => void;
  redo: () => void;
  switchTurn: () => void;
  truncateHistoryAt: (index: number) => void;

  setEditMode: (on: boolean) => void;
  applyEdit: (edit: BoardEdit) => void;

  legalDestinationsFrom: (point: number | 'bar') => CheckerMove[];
  /** Every way to land the checker at `point` right now, including combined-both-dice landings. */
  landingSpotsFrom: (point: number | 'bar') => LandingSpot[];
  currentWarnings: () => BoardValidationWarning[];
  /** If exactly one full legal sequence exists for this roll (from the current committed board), return it. */
  onlyLegalSequence: () => MoveSequence | null;
}

function persist(game: GameState) {
  void repository.save(game);
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  pendingMoves: [],

  newGame: (mode) => {
    const game = createNewGame(mode);
    set({ game, pendingMoves: [] });
    persist(game);
  },

  loadLastActive: async () => {
    const game = await repository.loadLastActive();
    if (game) set({ game, pendingMoves: [] });
    return game;
  },

  loadGame: (state) => {
    set({ game: state, pendingMoves: [] });
    persist(state);
  },

  rollDice: (dice) => {
    const { game } = get();
    if (!game) return;
    const next = engineRollDice(game, dice ?? rollTwoDice());
    set({ game: next, pendingMoves: [] });
    persist(next);

    // Auto-finalize a roll that has no legal move at all (e.g. closed board on entry).
    const sequences = legalSequencesForState(next);
    if (sequences.length === 1 && sequences[0].length === 0) {
      const finalized = applySequence(next, []);
      set({ game: finalized, pendingMoves: [] });
      persist(finalized);
    }
  },

  displayBoard: () => {
    const { game, pendingMoves } = get();
    if (!game) return { points: [], bar: { white: 0, black: 0 }, borneOff: { white: 0, black: 0 } };
    if (pendingMoves.length === 0) return game.board;
    return applySequenceToBoard(game.board, game.currentPlayer, pendingMoves);
  },

  remainingDice: () => {
    const { game, pendingMoves } = get();
    if (!game) return [];
    const remaining = game.dice.remaining.slice();
    for (const move of pendingMoves) {
      const idx = remaining.indexOf(move.die);
      if (idx >= 0) remaining.splice(idx, 1);
    }
    return remaining;
  },

  playSingleMove: (move) => {
    get().playMoves([move]);
  },

  playMoves: (moves) => {
    const { game, pendingMoves } = get();
    if (!game || !game.dice.rolled || moves.length === 0) return;

    const candidateSequence = [...pendingMoves, ...moves];
    const legalFull = legalSequencesForStateAllOrders(game).filter((seq) => seq.length >= candidateSequence.length);
    const isValidPrefix = legalFull.some((seq) => seq.slice(0, candidateSequence.length).every((m, i) => sameMove(m, candidateSequence[i])));
    if (!isValidPrefix) return;

    const remainingAfter = game.dice.remaining.slice();
    for (const m of candidateSequence) {
      const idx = remainingAfter.indexOf(m.die);
      if (idx >= 0) remainingAfter.splice(idx, 1);
    }

    const boardAfter = applySequenceToBoard(game.board, game.currentPlayer, candidateSequence);
    const noDiceLeft = remainingAfter.length === 0;
    const noContinuation = !noDiceLeft && generateLegalSequences(boardAfter, game.currentPlayer, remainingAfter).every((s) => s.length === 0);

    if (noDiceLeft || noContinuation) {
      const finalized = applySequence(game, candidateSequence);
      set({ game: finalized, pendingMoves: [] });
      persist(finalized);
    } else {
      set({ pendingMoves: candidateSequence });
    }
  },

  undoPendingMove: () => {
    const { pendingMoves } = get();
    if (pendingMoves.length === 0) return;
    set({ pendingMoves: pendingMoves.slice(0, -1) });
  },

  playSequence: (sequence) => {
    const { game } = get();
    if (!game) return;
    const finalized = applySequence(game, sequence);
    set({ game: finalized, pendingMoves: [] });
    persist(finalized);
  },

  undo: () => {
    const { game } = get();
    if (!game) return;
    const next = engineUndo(game);
    set({ game: next, pendingMoves: [] });
    persist(next);
  },

  redo: () => {
    const { game } = get();
    if (!game) return;
    const next = engineRedo(game);
    set({ game: next, pendingMoves: [] });
    persist(next);
  },

  switchTurn: () => {
    const { game } = get();
    if (!game) return;
    const next = engineSwitchTurn(game);
    set({ game: next, pendingMoves: [] });
    persist(next);
  },

  truncateHistoryAt: (index) => {
    const { game } = get();
    if (!game) return;
    const next = engineTruncateHistoryAt(game, index);
    set({ game: next, pendingMoves: [] });
    persist(next);
  },

  setEditMode: (on) => {
    const { game } = get();
    if (!game) return;
    const next = { ...game, editMode: on };
    set({ game: next });
    persist(next);
  },

  applyEdit: (edit) => {
    const { game } = get();
    if (!game) return;
    const next = applyBoardEdit(game, edit);
    set({ game: next });
    persist(next);
  },

  /**
   * Legal next moves from `point`, given moves already played this turn (pendingMoves). Derived from
   * the actual set of legal full sequences (not raw per-die legality) so the UI never highlights a
   * destination that the official must-use-both-dice / larger-die rule would ultimately reject.
   */
  legalDestinationsFrom: (point) => {
    const { game, pendingMoves } = get();
    if (!game || !game.dice.rolled) return [];
    const sequences = generateLegalSequencesAllOrders(game.board, game.currentPlayer, game.dice.remaining);
    const matchingPrefix = sequences.filter((seq) => seq.length > pendingMoves.length && pendingMoves.every((m, i) => sameMove(m, seq[i])));
    const seen = new Set<string>();
    const moves: CheckerMove[] = [];
    for (const seq of matchingPrefix) {
      const next = seq[pendingMoves.length];
      if (next.from !== point) continue;
      const key = `${next.from}->${next.to}:${next.die}`;
      if (!seen.has(key)) {
        seen.add(key);
        moves.push(next);
      }
    }
    return moves;
  },

  /**
   * Every landing spot reachable from `point` right now: each immediate single-die destination,
   * plus — when the same checker can keep playing consecutive remaining dice in one hop — every
   * further combined-dice destination along that chain (up to all 4 dice on a double), so a player
   * can tap straight through to any of them without an intermediate tap.
   */
  landingSpotsFrom: (point) => {
    const { game, pendingMoves } = get();
    if (!game || !game.dice.rolled) return [];
    const sequences = generateLegalSequencesAllOrders(game.board, game.currentPlayer, game.dice.remaining);
    const matchingPrefix = sequences.filter((seq) => seq.length > pendingMoves.length && pendingMoves.every((m, i) => sameMove(m, seq[i])));

    const seen = new Map<string, LandingSpot>();
    for (const seq of matchingPrefix) {
      const startIdx = pendingMoves.length;
      if (seq[startIdx].from !== point) continue;

      const chain: CheckerMove[] = [];
      for (let i = startIdx; i < seq.length; i++) {
        const move = seq[i];
        if (chain.length > 0 && move.from !== chain[chain.length - 1].to) break; // a different checker took over
        chain.push(move);
        const key = `${move.to}`;
        if (!seen.has(key)) seen.set(key, { to: move.to, moves: [...chain] });
      }
    }
    return Array.from(seen.values());
  },

  currentWarnings: () => {
    const { game } = get();
    if (!game) return [];
    return validateBoardState(game.board);
  },

  onlyLegalSequence: () => {
    const { game, pendingMoves } = get();
    if (!game || !game.dice.rolled || pendingMoves.length > 0) return null;
    const sequences = legalSequencesForState(game).filter((s) => s.length > 0);
    return sequences.length === 1 ? sequences[0] : null;
  },
}));

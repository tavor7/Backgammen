import { addCheckerAt, createEmptyBoard, createInitialBoard, getPoint, homeBoardRange, opponent, withBar, withBorneOff } from './board';
import { generateLegalSequences } from './moveGenerator';
import type { BoardEdit, BoardState, CheckerMove, GameMode, GameState, MoveSequence, Player, TurnRecord } from './types';

function now(): number {
  return Date.now();
}

function makeId(): string {
  return `game_${now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createNewGame(mode: GameMode): GameState {
  const t = now();
  return {
    id: makeId(),
    mode,
    board: createInitialBoard(),
    currentPlayer: 'white',
    dice: { rolled: null, remaining: [], isDouble: false },
    turnPhase: 'awaitingRoll',
    status: 'inProgress',
    winner: null,
    winType: null,
    moveHistory: [],
    redoStack: [],
    editMode: false,
    version: 1,
    createdAt: t,
    updatedAt: t,
  };
}

export function rollDice(state: GameState, dice: [number, number]): GameState {
  const isDouble = dice[0] === dice[1];
  const remaining = isDouble ? [dice[0], dice[0], dice[0], dice[0]] : [dice[0], dice[1]];
  return {
    ...state,
    dice: { rolled: dice, remaining, isDouble },
    turnPhase: 'awaitingMove',
    updatedAt: now(),
  };
}

/** All legal complete sequences for the current player's rolled dice. */
export function legalSequencesForState(state: GameState): MoveSequence[] {
  if (!state.dice.rolled) return [];
  return generateLegalSequences(state.board, state.currentPlayer, state.dice.remaining);
}

/** Determine gammon/backgammon/single result for `winner` given the board at the moment of the win. */
function classifyWin(board: BoardState, winner: Player): 'single' | 'gammon' | 'backgammon' {
  const loser = opponent(winner);
  if (board.borneOff[loser] > 0) return 'single';
  if (board.bar[loser] > 0) return 'backgammon';
  const [homeStart, homeEnd] = homeBoardRange(winner);
  for (let p = homeStart; p <= homeEnd; p++) {
    const point = getPoint(board, p);
    if (point.owner === loser && point.count > 0) return 'backgammon';
  }
  return 'gammon';
}

/**
 * Apply a full move sequence for the current player, completing the turn.
 * Caller is responsible for ensuring `sequence` is one of `legalSequencesForState(state)`
 * (or a prefix thereof for partial/in-progress interactive play — see applyPartialMove).
 */
export function applySequence(state: GameState, sequence: MoveSequence): GameState {
  const player = state.currentPlayer;
  let board = state.board;
  for (const move of sequence) {
    board = applySingleCheckerMoveInternal(board, player, move);
  }

  const record: TurnRecord = {
    type: 'move',
    player,
    dice: state.dice.rolled,
    moves: sequence,
    boardBefore: state.board,
    boardAfter: board,
  };

  const won = board.borneOff[player] === 15;

  return {
    ...state,
    board,
    moveHistory: [...state.moveHistory, record],
    redoStack: [],
    currentPlayer: won ? player : opponent(player),
    dice: { rolled: null, remaining: [], isDouble: false },
    turnPhase: won ? 'turnComplete' : 'awaitingRoll',
    status: won ? 'won' : 'inProgress',
    winner: won ? player : null,
    winType: won ? classifyWin(board, player) : null,
    updatedAt: now(),
  };
}

function applySingleCheckerMoveInternal(board: BoardState, player: Player, move: CheckerMove): BoardState {
  let next = board;
  if (move.from === 'bar') {
    next = withBar(next, player, next.bar[player] - 1);
  } else {
    next = addCheckerAt(next, move.from, player, -1);
  }
  if (move.to === 'off') {
    return withBorneOff(next, player, next.borneOff[player] + 1);
  }
  if (move.hit) {
    const opp = opponent(player);
    next = addCheckerAt(next, move.to, opp, -1);
    next = withBar(next, opp, next.bar[opp] + 1);
  }
  return addCheckerAt(next, move.to, player, 1);
}

export function undo(state: GameState): GameState {
  if (state.moveHistory.length === 0) return state;
  const last = state.moveHistory[state.moveHistory.length - 1];
  return {
    ...state,
    board: last.boardBefore,
    currentPlayer: last.player,
    moveHistory: state.moveHistory.slice(0, -1),
    redoStack: [...state.redoStack, last],
    dice: { rolled: null, remaining: [], isDouble: false },
    turnPhase: 'awaitingRoll',
    status: 'inProgress',
    winner: null,
    winType: null,
    updatedAt: now(),
  };
}

export function redo(state: GameState): GameState {
  if (state.redoStack.length === 0) return state;
  const record = state.redoStack[state.redoStack.length - 1];
  const won = record.boardAfter.borneOff[record.player] === 15;
  return {
    ...state,
    board: record.boardAfter,
    currentPlayer: won ? record.player : opponent(record.player),
    moveHistory: [...state.moveHistory, record],
    redoStack: state.redoStack.slice(0, -1),
    dice: { rolled: null, remaining: [], isDouble: false },
    turnPhase: won ? 'turnComplete' : 'awaitingRoll',
    status: won ? 'won' : 'inProgress',
    winner: won ? record.player : null,
    winType: won ? classifyWin(record.boardAfter, record.player) : null,
    updatedAt: now(),
  };
}

/** Truncate history back to (and including removing) the turn at `index`, restoring the board to before it. Manual-mode correction. */
export function truncateHistoryAt(state: GameState, index: number): GameState {
  const record = state.moveHistory[index];
  if (!record) return state;
  return {
    ...state,
    board: record.boardBefore,
    currentPlayer: record.player,
    moveHistory: state.moveHistory.slice(0, index),
    redoStack: [],
    dice: { rolled: null, remaining: [], isDouble: false },
    turnPhase: 'awaitingRoll',
    status: 'inProgress',
    winner: null,
    winType: null,
    updatedAt: now(),
  };
}

export function switchTurn(state: GameState): GameState {
  return { ...state, currentPlayer: opponent(state.currentPlayer), dice: { rolled: null, remaining: [], isDouble: false }, turnPhase: 'awaitingRoll', updatedAt: now() };
}

export function applyBoardEdit(state: GameState, edit: BoardEdit): GameState {
  const before = state.board;
  const board = applyBoardEditToBoard(before, edit);
  const record: TurnRecord = {
    type: 'edit',
    player: state.currentPlayer,
    dice: null,
    moves: [],
    boardBefore: before,
    boardAfter: board,
    label: edit.type,
  };
  return { ...state, board, moveHistory: [...state.moveHistory, record], redoStack: [], updatedAt: now() };
}

function applyBoardEditToBoard(board: BoardState, edit: BoardEdit): BoardState {
  switch (edit.type) {
    case 'addChecker':
      return addCheckerAt(board, edit.point, edit.player, 1);
    case 'removeChecker': {
      const point = getPoint(board, edit.point);
      if (!point.owner) return board;
      return addCheckerAt(board, edit.point, point.owner, -1);
    }
    case 'moveChecker': {
      let next = board;
      let player: Player | null = null;
      if (edit.from === 'bar') {
        player = next.bar.white > 0 ? 'white' : next.bar.black > 0 ? 'black' : null;
        if (!player) return board;
        next = withBar(next, player, next.bar[player] - 1);
      } else {
        const point = getPoint(next, edit.from);
        if (!point.owner) return board;
        player = point.owner;
        next = addCheckerAt(next, edit.from, player, -1);
      }
      if (edit.to === 'off') {
        return withBorneOff(next, player, next.borneOff[player] + 1);
      }
      return addCheckerAt(next, edit.to, player, 1);
    }
    case 'toBar': {
      const point = getPoint(board, edit.point);
      if (!point.owner) return board;
      let next = addCheckerAt(board, edit.point, point.owner, -1);
      next = withBar(next, point.owner, next.bar[point.owner] + 1);
      return next;
    }
    case 'toBorneOff': {
      const point = getPoint(board, edit.point);
      if (!point.owner) return board;
      let next = addCheckerAt(board, edit.point, point.owner, -1);
      next = withBorneOff(next, point.owner, next.borneOff[point.owner] + 1);
      return next;
    }
    case 'setOwnership': {
      const point = getPoint(board, edit.point);
      if (!point.owner) return board;
      return { ...board, points: board.points.map((p, i) => (i === edit.point - 1 ? { owner: edit.player, count: point.count } : p)) };
    }
    case 'clearBoard':
      return createEmptyBoard();
    case 'resetStartingPosition':
      return createInitialBoard();
    default:
      return board;
  }
}

export interface BoardValidationWarning {
  message: string;
}

/** Non-blocking sanity checks for manually edited positions. Never prevents editing. */
export function validateBoardState(board: BoardState): BoardValidationWarning[] {
  const warnings: BoardValidationWarning[] = [];
  (['white', 'black'] as Player[]).forEach((player) => {
    const onPoints = board.points.reduce((sum, p) => (p.owner === player ? sum + p.count : sum), 0);
    const total = onPoints + board.bar[player] + board.borneOff[player];
    if (total !== 15) {
      warnings.push({ message: `${player === 'white' ? 'White' : 'Black'} currently has ${total} checkers.` });
    }
  });
  for (let p = 1; p <= 24; p++) {
    const point = getPoint(board, p);
    if (point.owner === null && point.count !== 0) {
      warnings.push({ message: `Point ${p} has a checker count but no owner.` });
    }
  }
  return warnings;
}

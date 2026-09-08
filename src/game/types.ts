// Core Backgammon domain types. Pure data — no behavior, no React, no browser APIs.

export type Player = 'white' | 'black';

/** Absolute point numbering 1-24, fixed from White's perspective (White travels 1->24, Black 24->1). */
export type PointNumber = number; // 1-24

export interface PointState {
  owner: Player | null;
  count: number;
}

export interface BoardState {
  /** length 24, index i = point i+1 */
  points: PointState[];
  bar: Record<Player, number>;
  borneOff: Record<Player, number>;
}

export interface CheckerMove {
  from: PointNumber | 'bar';
  to: PointNumber | 'off';
  die: number;
  hit: boolean;
}

export type MoveSequence = CheckerMove[];

export interface DiceState {
  rolled: [number, number] | null;
  /** dice values not yet consumed by an applied move; length 2 (or 4 for doubles) while awaiting move */
  remaining: number[];
  isDouble: boolean;
}

export type GameMode = 'vsComputer' | 'liveAssistant';
export type GameStatus = 'inProgress' | 'won' | 'notStarted';
export type WinType = 'single' | 'gammon' | 'backgammon';
export type TurnPhase = 'awaitingRoll' | 'awaitingMove' | 'turnComplete';

export interface TurnRecord {
  type: 'move' | 'edit';
  player: Player;
  dice: [number, number] | null;
  moves: CheckerMove[];
  boardBefore: BoardState;
  boardAfter: BoardState;
  label?: string;
}

export interface GameState {
  id: string;
  mode: GameMode;
  board: BoardState;
  currentPlayer: Player;
  dice: DiceState;
  turnPhase: TurnPhase;
  status: GameStatus;
  winner: Player | null;
  winType: WinType | null;
  moveHistory: TurnRecord[];
  redoStack: TurnRecord[];
  editMode: boolean;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export type BoardEdit =
  | { type: 'addChecker'; point: PointNumber; player: Player }
  | { type: 'removeChecker'; point: PointNumber }
  | { type: 'moveChecker'; from: PointNumber | 'bar'; to: PointNumber | 'off' }
  | { type: 'toBar'; point: PointNumber }
  | { type: 'toBorneOff'; point: PointNumber }
  | { type: 'setOwnership'; point: PointNumber; player: Player }
  | { type: 'clearBoard' }
  | { type: 'resetStartingPosition' };

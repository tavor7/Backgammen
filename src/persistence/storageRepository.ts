import type { GameState } from '../game/types';

export interface GameSummary {
  id: string;
  mode: GameState['mode'];
  status: GameState['status'];
  updatedAt: number;
}

export interface GameRepository {
  save(state: GameState): Promise<void>;
  load(id: string): Promise<GameState | null>;
  loadLastActive(): Promise<GameState | null>;
  listSaved(): Promise<GameSummary[]>;
  clear(id: string): Promise<void>;
}

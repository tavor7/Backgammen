import type { GameState } from '../game/types';

export const CURRENT_SCHEMA_VERSION = 1;

export interface PersistedGameV1 extends GameState {
  version: 1;
}

export type PersistedGame = PersistedGameV1;

/** Migrates a raw stored blob (any prior version) up to the current GameState shape. Fails soft. */
export function migrate(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.version !== 'number') return null;

  // Only version 1 exists today; future migrations chain here (v1 -> v2 -> ...).
  if (obj.version === 1) {
    return obj as unknown as GameState;
  }
  return null;
}

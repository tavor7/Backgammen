import type { GameState } from '../game/types';
import { CURRENT_SCHEMA_VERSION, migrate } from './schema';
import type { GameRepository, GameSummary } from './storageRepository';

const GAME_KEY_PREFIX = 'backgammon:game:';
const LAST_ACTIVE_KEY = 'backgammon:lastActiveGameId';
const INDEX_KEY = 'backgammon:gameIndex';

function store(): Storage {
  return window.localStorage;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readIndex(): string[] {
  return safeParse<string[]>(store().getItem(INDEX_KEY)) ?? [];
}

function writeIndex(ids: string[]): void {
  store().setItem(INDEX_KEY, JSON.stringify(ids));
}

/**
 * localStorage-backed implementation of GameRepository. This is the only module that
 * touches browser storage — swap this file (or add a sibling adapter) to move to a
 * backend later without changing gameStore, game/, or ai/.
 */
export class LocalStorageGameRepository implements GameRepository {
  async save(state: GameState): Promise<void> {
    const versioned = { ...state, version: CURRENT_SCHEMA_VERSION };
    store().setItem(GAME_KEY_PREFIX + state.id, JSON.stringify(versioned));
    store().setItem(LAST_ACTIVE_KEY, state.id);
    const ids = readIndex();
    if (!ids.includes(state.id)) writeIndex([...ids, state.id]);
  }

  async load(id: string): Promise<GameState | null> {
    const raw = safeParse<unknown>(store().getItem(GAME_KEY_PREFIX + id));
    return migrate(raw);
  }

  async loadLastActive(): Promise<GameState | null> {
    const id = store().getItem(LAST_ACTIVE_KEY);
    if (!id) return null;
    return this.load(id);
  }

  async listSaved(): Promise<GameSummary[]> {
    const ids = readIndex();
    const summaries: GameSummary[] = [];
    for (const id of ids) {
      const game = await this.load(id);
      if (game) summaries.push({ id: game.id, mode: game.mode, status: game.status, updatedAt: game.updatedAt });
    }
    return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async clear(id: string): Promise<void> {
    store().removeItem(GAME_KEY_PREFIX + id);
    writeIndex(readIndex().filter((existing) => existing !== id));
    if (store().getItem(LAST_ACTIVE_KEY) === id) {
      store().removeItem(LAST_ACTIVE_KEY);
    }
  }
}

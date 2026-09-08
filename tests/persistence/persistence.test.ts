import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialBoard } from '../../src/game/board';
import { createNewGame } from '../../src/game/gameEngine';
import { LocalStorageGameRepository } from '../../src/persistence/localStorageAdapter';
import { decodeBoard, encodeBoard } from '../../src/persistence/serialization';

describe('compact board serialization', () => {
  it('round-trips the initial position', () => {
    const board = createInitialBoard();
    const encoded = encodeBoard(board);
    const decoded = decodeBoard(encoded);
    expect(decoded).toEqual(board);
  });
});

describe('LocalStorageGameRepository', () => {
  beforeEach(() => window.localStorage.clear());

  it('saves and loads a game round-trip', async () => {
    const repo = new LocalStorageGameRepository();
    const game = createNewGame('vsComputer');
    await repo.save(game);
    const loaded = await repo.load(game.id);
    expect(loaded).toEqual(game);
  });

  it('loadLastActive returns the most recently saved game', async () => {
    const repo = new LocalStorageGameRepository();
    const g1 = createNewGame('vsComputer');
    const g2 = createNewGame('liveAssistant');
    await repo.save(g1);
    await repo.save(g2);
    const loaded = await repo.loadLastActive();
    expect(loaded?.id).toBe(g2.id);
  });

  it('fails soft (returns null) for a corrupt blob instead of throwing', async () => {
    window.localStorage.setItem('backgammon:game:bad', '{not json');
    const repo = new LocalStorageGameRepository();
    const loaded = await repo.load('bad');
    expect(loaded).toBeNull();
  });

  it('clear removes a saved game', async () => {
    const repo = new LocalStorageGameRepository();
    const game = createNewGame('vsComputer');
    await repo.save(game);
    await repo.clear(game.id);
    expect(await repo.load(game.id)).toBeNull();
  });
});

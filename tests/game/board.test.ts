import { describe, expect, it } from 'vitest';
import {
  createInitialBoard,
  direction,
  entryPoint,
  getPoint,
  homeBoardRange,
  pipDistance,
  totalCheckers,
} from '../../src/game/board';

describe('createInitialBoard', () => {
  const board = createInitialBoard();

  it('gives each player 15 checkers', () => {
    expect(totalCheckers(board, 'white')).toBe(15);
    expect(totalCheckers(board, 'black')).toBe(15);
  });

  it('places White checkers on 1, 12, 17, 19', () => {
    expect(getPoint(board, 1)).toEqual({ owner: 'white', count: 2 });
    expect(getPoint(board, 12)).toEqual({ owner: 'white', count: 5 });
    expect(getPoint(board, 17)).toEqual({ owner: 'white', count: 3 });
    expect(getPoint(board, 19)).toEqual({ owner: 'white', count: 5 });
  });

  it('places Black checkers on 24, 13, 8, 6 (mirror of White)', () => {
    expect(getPoint(board, 24)).toEqual({ owner: 'black', count: 2 });
    expect(getPoint(board, 13)).toEqual({ owner: 'black', count: 5 });
    expect(getPoint(board, 8)).toEqual({ owner: 'black', count: 3 });
    expect(getPoint(board, 6)).toEqual({ owner: 'black', count: 5 });
  });

  it('leaves all other points empty', () => {
    const occupied = new Set([1, 12, 17, 19, 24, 13, 8, 6]);
    for (let p = 1; p <= 24; p++) {
      if (!occupied.has(p)) {
        expect(getPoint(board, p)).toEqual({ owner: null, count: 0 });
      }
    }
  });

  it('starts with nobody on the bar or borne off', () => {
    expect(board.bar).toEqual({ white: 0, black: 0 });
    expect(board.borneOff).toEqual({ white: 0, black: 0 });
  });
});

describe('direction / homeBoardRange / entryPoint / pipDistance', () => {
  it('White travels 1->24, Black travels 24->1', () => {
    expect(direction('white')).toBe(1);
    expect(direction('black')).toBe(-1);
  });

  it('home boards are fixed: White 19-24, Black 1-6', () => {
    expect(homeBoardRange('white')).toEqual([19, 24]);
    expect(homeBoardRange('black')).toEqual([1, 6]);
  });

  it('bar entry lands in the opponent home board', () => {
    expect(entryPoint('white', 1)).toBe(1);
    expect(entryPoint('white', 6)).toBe(6);
    expect(entryPoint('black', 1)).toBe(24);
    expect(entryPoint('black', 6)).toBe(19);
  });

  it('pip distance counts down to bear-off for both players symmetrically', () => {
    expect(pipDistance('white', 24)).toBe(1);
    expect(pipDistance('white', 1)).toBe(24);
    expect(pipDistance('black', 1)).toBe(1);
    expect(pipDistance('black', 24)).toBe(24);
  });
});

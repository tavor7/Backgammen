import { describe, expect, it } from 'vitest';
import { createEmptyBoard, createInitialBoard } from '../../src/game/board';
import { pipCount } from '../../src/game/pipCount';
import { evaluate } from '../../src/ai/evaluator';
import { probabilityBlotIsHit } from '../../src/ai/probabilities';
import { getTopCandidates } from '../../src/ai/moveAdvisor';
import { chooseComputerMove } from '../../src/ai/computerPlayer';
import { generateLegalSequences } from '../../src/game/moveGenerator';
import type { BoardState } from '../../src/game/types';

function place(b: BoardState, point: number, owner: 'white' | 'black', count: number): BoardState {
  const points = b.points.slice();
  points[point - 1] = { owner, count };
  return { ...b, points };
}

describe('pipCount', () => {
  it('is 167 for each side in the standard starting position', () => {
    const b = createInitialBoard();
    expect(pipCount(b, 'white')).toBe(167);
    expect(pipCount(b, 'black')).toBe(167);
  });
});

describe('probabilityBlotIsHit', () => {
  it('gives 17/36 for a single unblocked 6-away shot (direct + combinations)', () => {
    let b = createEmptyBoard();
    b = place(b, 10, 'white', 1); // the blot
    b = place(b, 16, 'black', 1); // black at 16 moving toward 1: 16-6=10, a direct 6 shot, path clear
    const prob = probabilityBlotIsHit(b, 10, 'black');
    expect(prob).toBeCloseTo(17 / 36, 5);
  });
});

describe('evaluate', () => {
  it('rates a position with a strong home board higher than a scattered one for the same pip count', () => {
    const strong = (() => {
      let b = createEmptyBoard();
      b = place(b, 19, 'white', 2);
      b = place(b, 20, 'white', 2);
      b = place(b, 21, 'white', 2);
      b = place(b, 1, 'white', 9);
      b = place(b, 13, 'black', 15);
      return b;
    })();
    const weak = (() => {
      let b = createEmptyBoard();
      b = place(b, 19, 'white', 1);
      b = place(b, 20, 'white', 1);
      b = place(b, 21, 'white', 1);
      b = place(b, 22, 'white', 1);
      b = place(b, 23, 'white', 1);
      b = place(b, 24, 'white', 1);
      b = place(b, 1, 'white', 9);
      b = place(b, 13, 'black', 15);
      return b;
    })();
    expect(evaluate(strong, 'white').score).toBeGreaterThan(evaluate(weak, 'white').score);
  });
});

describe('getTopCandidates', () => {
  it('returns ranked candidates with explanations for the opening roll', () => {
    const b = createInitialBoard();
    const candidates = getTopCandidates(b, 'white', [3, 5], 3);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThanOrEqual(3);
    expect(candidates[0].rank).toBe(1);
    expect(candidates[0].summary.length).toBeGreaterThan(0);
    // scores should be sorted descending
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].score).toBeGreaterThanOrEqual(candidates[i].score);
    }
  });
});

describe('chooseComputerMove', () => {
  it('always selects a sequence that is among the legally generated sequences', () => {
    const b = createInitialBoard();
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const chosen = chooseComputerMove(b, 'white', [3, 5], difficulty);
      const legal = generateLegalSequences(b, 'white', [3, 5]);
      const match = legal.some((seq) => JSON.stringify(seq) === JSON.stringify(chosen));
      expect(match).toBe(true);
    }
  });
});

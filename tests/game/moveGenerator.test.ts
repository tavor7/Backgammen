import { describe, expect, it } from 'vitest';
import { createEmptyBoard, createInitialBoard, withBar } from '../../src/game/board';
import { applySequence, generateLegalSequences, generateLegalSequencesAllOrders } from '../../src/game/moveGenerator';
import type { BoardState } from '../../src/game/types';

function place(b: BoardState, point: number, owner: 'white' | 'black', count: number): BoardState {
  const points = b.points.slice();
  points[point - 1] = { owner, count };
  return { ...b, points };
}

describe('generateLegalSequences: doubles', () => {
  it('generates up to 4 moves for a double', () => {
    const b = createInitialBoard();
    const sequences = generateLegalSequences(b, 'white', [3, 3, 3, 3]);
    const maxLen = Math.max(...sequences.map((s) => s.length));
    expect(maxLen).toBe(4);
    for (const seq of sequences) expect(seq.length).toBe(maxLen);
  });

  it('generates fewer than 4 moves when blocked partway through a double', () => {
    // White has one checker that can play 6 exactly once before being boxed in by black.
    let b = place(createEmptyBoard(), 1, 'white', 1);
    b = place(b, 7, 'black', 2); // blocks the second 6
    const sequences = generateLegalSequences(b, 'white', [6, 6, 6, 6]);
    expect(sequences.length).toBeGreaterThan(0);
    for (const seq of sequences) expect(seq.length).toBeLessThanOrEqual(1);
  });
});

describe('generateLegalSequences: must use both dice when possible', () => {
  it('discards sequences that use only one die when a two-die sequence exists', () => {
    let b = place(createEmptyBoard(), 1, 'white', 1);
    b = place(b, 10, 'white', 1);
    const sequences = generateLegalSequences(b, 'white', [3, 5]);
    expect(sequences.every((s) => s.length === 2)).toBe(true);
  });

  it('picks the order that makes both dice playable when only one order works', () => {
    // Single white checker at 1. Playing die 5 first (1->6) is blocked outright by black.
    // Playing die 3 first (1->4) then die 5 (4->9) is fully legal.
    let b = place(createEmptyBoard(), 1, 'white', 1);
    b = place(b, 6, 'black', 2); // blocks 1+5 -> 6, so 5-first is illegal
    const sequences = generateLegalSequences(b, 'white', [3, 5]);
    expect(sequences.length).toBeGreaterThan(0);
    for (const seq of sequences) {
      expect(seq.length).toBe(2);
      expect(seq[0]).toEqual({ from: 1, to: 4, die: 3, hit: false });
      expect(seq[1]).toEqual({ from: 4, to: 9, die: 5, hit: false });
    }
  });
});

describe('generateLegalSequences: larger-die tie-break', () => {
  it('requires the larger die when either die is playable alone but never both', () => {
    // Single checker at point 1. Die 6 -> point 7 open. Die 2 -> point 3 blocked by black.
    // But if 2 is played first (1->3 blocked, so 2 alone is illegal too)... construct so both are
    // individually legal from the start but never combinable.
    let b = place(createEmptyBoard(), 1, 'white', 1);
    b = place(b, 3, 'black', 1); // die 2 from 1 -> 3 is a legal hit
    b = place(b, 7, 'black', 1); // die 6 from 1 -> 7 is a legal hit
    // After hitting at 3 (die 2), moving on from 3 with die 6 -> 9, open, so both-dice sequence would exist!
    // Block 9 to prevent continuing after playing the 2 first.
    b = place(b, 9, 'black', 2);
    // After hitting at 7 (die 6), moving on from 7 with die 2 -> 9, also blocked (same point).
    const sequences = generateLegalSequences(b, 'white', [2, 6]);
    const maxLen = Math.max(...sequences.map((s) => s.length));
    expect(maxLen).toBe(1);
    expect(sequences.every((s) => s[0].die === 6)).toBe(true);
  });
});

describe('generateLegalSequences: bar', () => {
  it('produces no move when bar entry is fully blocked (closed board)', () => {
    let b = createEmptyBoard();
    for (let p = 1; p <= 6; p++) b = place(b, p, 'black', 2);
    b = withBar(b, 'white', 1);
    const sequences = generateLegalSequences(b, 'white', [3, 5]);
    expect(sequences).toEqual([[]]);
  });

  it('requires both bar checkers to enter before any other move', () => {
    let b = withBar(createEmptyBoard(), 'white', 2);
    b = place(b, 20, 'white', 1);
    const sequences = generateLegalSequences(b, 'white', [3, 5]);
    for (const seq of sequences) {
      expect(seq.every((m) => m.from === 'bar')).toBe(true);
    }
  });
});

describe('generateLegalSequences: deduplication', () => {
  it('deduplicates sequences that reach the same resulting board via different orders', () => {
    let b = place(createEmptyBoard(), 1, 'white', 2);
    const sequences = generateLegalSequences(b, 'white', [3, 5]);
    // moving die3-then-die5 on different checkers vs die5-then-die3 reach the same final board
    const boards = sequences.map((s) => JSON.stringify(applySequence(b, 'white', s)));
    const uniqueBoards = new Set(boards);
    expect(uniqueBoards.size).toBe(boards.length);
  });
});

describe('generateLegalSequencesAllOrders vs generateLegalSequences (dedup)', () => {
  it('preserves every legal move order, even ones the deduplicated list collapses away', () => {
    // Two independent white checkers, each capable of playing either die with no interaction.
    // Two distinct outcomes exist (which checker gets which die), each reachable via 2 orders.
    let b = place(createEmptyBoard(), 1, 'white', 1);
    b = place(b, 10, 'white', 1);
    const allOrders = generateLegalSequencesAllOrders(b, 'white', [2, 3]);
    const deduped = generateLegalSequences(b, 'white', [2, 3]);

    // Deduplication by resulting board strictly collapses some legal orders away.
    expect(allOrders.length).toBeGreaterThan(deduped.length);

    // A UI validating "the player chose to move the point-10 checker first" must find that
    // order among allOrders, even though the deduped list may only keep the point-1-first version.
    const startsAtTen = allOrders.filter((seq) => seq[0].from === 10);
    expect(startsAtTen.length).toBeGreaterThan(0);
  });

  it('never rejects a legal in-progress prefix just because another order reaches the same board', () => {
    let b = place(createEmptyBoard(), 1, 'white', 1);
    b = place(b, 10, 'white', 1);
    const allOrders = generateLegalSequencesAllOrders(b, 'white', [2, 3]);

    // Simulate a player who taps the point-10 checker first, playing die 3 (10 -> 13).
    const firstMove = { from: 10, to: 13, die: 3, hit: false };
    const validPrefixExists = allOrders.some((seq) => seq[0].from === firstMove.from && seq[0].to === firstMove.to && seq[0].die === firstMove.die);
    expect(validPrefixExists).toBe(true);
  });
});

describe('generateLegalSequences: initial position', () => {
  it('produces multiple legal opening sequences for a non-double roll', () => {
    const b = createInitialBoard();
    const sequences = generateLegalSequences(b, 'white', [3, 5]);
    expect(sequences.length).toBeGreaterThan(1);
    for (const seq of sequences) expect(seq.length).toBe(2);
  });
});

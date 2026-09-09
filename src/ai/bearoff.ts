import { applySequence, generateLegalSequences } from '../game/moveGenerator';
import { createEmptyBoard, getPoint, homeBoardRange, pipDistance, withPoint } from '../game/board';
import { ALL_ROLLS } from './probabilities';
import type { BoardState, Player } from '../game/types';

/**
 * Exact one-sided bearoff database. A "config" is the number of checkers at each pip-distance
 * (1 = one pip from bearing off, ... 6 = the far edge of the home board), independent of color or
 * board side — bearing off is symmetric once no contact with the opponent is possible, so this is
 * computed once, generically, and reused for both players.
 *
 * For each config, `pmf[k]` is the exact probability that a player bearing off *alone* (no
 * opponent interaction, no contact) needs exactly `k` more rolls to bear off every checker,
 * assuming optimal play (every roll, of the reachable resulting configs, the one minimizing
 * expected remaining rolls is chosen). Combining two independent players' distributions this way
 * gives the exact win probability of a pure race — the standard "one-sided bearoff database"
 * technique used by strong backgammon engines, rather than a hand-tuned heuristic.
 */
export type BearoffConfig = number[]; // length 6, index i = count of checkers at distance i+1

function diceValuesFor(dice: [number, number]): number[] {
  return dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [dice[0], dice[1]];
}

function configKey(config: BearoffConfig): string {
  return config.join(',');
}

function totalPips(config: BearoffConfig): number {
  let sum = 0;
  for (let i = 0; i < 6; i++) sum += config[i] * (i + 1);
  return sum;
}

function totalCheckers(config: BearoffConfig): number {
  let sum = 0;
  for (let i = 0; i < 6; i++) sum += config[i];
  return sum;
}

/** Every distinct config with 0..maxCheckers total checkers across the 6 distance slots. */
function* enumerateConfigs(maxCheckers: number): Generator<BearoffConfig> {
  const current = [0, 0, 0, 0, 0, 0];
  function* rec(slot: number, remaining: number): Generator<BearoffConfig> {
    if (slot === 6) {
      yield current.slice();
      return;
    }
    for (let c = 0; c <= remaining; c++) {
      current[slot] = c;
      yield* rec(slot + 1, remaining - c);
    }
    current[slot] = 0;
  }
  yield* rec(0, maxCheckers);
}

/** Builds a synthetic all-white, opponent-empty board so the real rules engine can enumerate legal bearoff plays for us. */
function configToBoard(config: BearoffConfig): BoardState {
  let board = createEmptyBoard();
  for (let d = 1; d <= 6; d++) {
    const count = config[d - 1];
    if (count > 0) {
      const point = 25 - d; // white's home is 19-24; distance d -> point 25-d
      board = withPoint(board, point, { owner: 'white', count });
    }
  }
  return board;
}

export function configFromBoard(board: BoardState, player: Player): BearoffConfig {
  const [start, end] = homeBoardRange(player);
  const config: BearoffConfig = [0, 0, 0, 0, 0, 0];
  for (let p = start; p <= end; p++) {
    const point = getPoint(board, p);
    if (point.owner === player && point.count > 0) {
      config[pipDistance(player, p) - 1] += point.count;
    }
  }
  return config;
}

export interface BearoffTable {
  maxCheckers: number;
  get(config: BearoffConfig): number[] | undefined;
}

function buildBearoffTable(maxCheckers: number): BearoffTable {
  const pmfByKey = new Map<string, number[]>();
  const configs = Array.from(enumerateConfigs(maxCheckers)).sort((a, b) => totalPips(a) - totalPips(b));

  for (const config of configs) {
    const key = configKey(config);
    if (totalPips(config) === 0) {
      pmfByKey.set(key, [1]);
      continue;
    }

    const board = configToBoard(config);
    // Index 0 ("0 more rolls needed") is always impossible once pips > 0 — must stay explicitly 0,
    // not a sparse hole, or every consumer that reads pmf[0] downstream gets NaN.
    const resultPmf: number[] = [0];
    for (const roll of ALL_ROLLS) {
      const sequences = generateLegalSequences(board, 'white', diceValuesFor(roll.dice));
      let bestPmf: number[] | null = null;
      let bestExpectation = Infinity;
      for (const seq of sequences) {
        const afterBoard = applySequence(board, 'white', seq);
        const afterPmf = pmfByKey.get(configKey(configFromBoard(afterBoard, 'white')));
        if (!afterPmf) continue;
        let expectation = 0;
        for (let i = 0; i < afterPmf.length; i++) expectation += afterPmf[i] * i;
        if (expectation < bestExpectation) {
          bestExpectation = expectation;
          bestPmf = afterPmf;
        }
      }
      const pmf = bestPmf ?? [1];
      const weight = roll.weight / 36;
      for (let i = 0; i < pmf.length; i++) {
        resultPmf[i + 1] = (resultPmf[i + 1] ?? 0) + weight * pmf[i];
      }
    }
    pmfByKey.set(key, resultPmf);
  }

  return {
    maxCheckers,
    get: (config) => pmfByKey.get(configKey(config)),
  };
}

let cachedTable: BearoffTable | null = null;
let cachedMax = 0;

/** Lazily built and memoized for the process lifetime — safe to call repeatedly. */
export function getBearoffTable(maxCheckers = 8): BearoffTable {
  if (cachedTable && cachedMax >= maxCheckers) return cachedTable;
  cachedTable = buildBearoffTable(maxCheckers);
  cachedMax = maxCheckers;
  return cachedTable;
}

/**
 * Exact probability that the player on roll (with `myConfig` to bear off) wins a pure race against
 * `oppConfig`, using the one-sided distributions above. Returns null if either side has more
 * checkers than the table covers, so callers can fall back to a heuristic.
 */
export function raceWinProbability(myConfig: BearoffConfig, oppConfig: BearoffConfig, table: BearoffTable): number | null {
  if (totalCheckers(myConfig) > table.maxCheckers || totalCheckers(oppConfig) > table.maxCheckers) return null;
  const myPmf = table.get(myConfig);
  const oppPmf = table.get(oppConfig);
  if (!myPmf || !oppPmf) return null;

  const oppCdf: number[] = [];
  let cum = 0;
  for (let k = 0; k < oppPmf.length; k++) {
    cum += oppPmf[k];
    oppCdf[k] = cum;
  }

  let winProb = 0;
  for (let m = 0; m < myPmf.length; m++) {
    const oppBeforeM = m === 0 ? 0 : Math.min(1, oppCdf[Math.min(m - 1, oppCdf.length - 1)] ?? 1);
    winProb += myPmf[m] * (1 - oppBeforeM);
  }
  return Math.min(1, Math.max(0, winProb));
}

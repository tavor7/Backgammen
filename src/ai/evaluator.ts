import { extractFeatures, isRacingPosition, type FeatureSet } from './features';
import { configFromBoard, getBearoffTable, raceWinProbability } from './bearoff';
import { opponent } from '../game/board';
import { canBearOff } from '../game/rules';
import type { BoardState, Player } from '../game/types';

/** Scaled to roughly the same order of magnitude as the heuristic weight tables' typical extremes,
 * so a bearoff-phase score stays comparable in searches that mix it with other phases (e.g. the
 * mover reaching bearoff while comparing against an opponent reply that doesn't). */
const BEAROFF_SCORE_SCALE = 40;

export type GamePhase = 'race' | 'contact' | 'bearoff';

export function classifyPhase(board: BoardState, features: FeatureSet): GamePhase {
  if (features.bearingOffReady) return 'bearoff';
  return isRacingPosition(board) ? 'race' : 'contact';
}

type Weights = Record<keyof Omit<FeatureSet, 'bearingOffReady'>, number>;

const CONTACT_WEIGHTS: Weights = {
  pipCount: 0,
  pipCountDiff: 0.9,
  blotCount: -3.5,
  blotExposure: -9,
  madePoints: 3.2,
  homeBoardPoints: 4.5,
  opponentHomeBoardPoints: -3.5,
  primeLength: 2.8,
  anchors: 3.5,
  advancedAnchors: 2.5,
  trappedCheckers: -4.5,
  stacking: -1.5,
  backCheckerProgress: 4,
  checkersOnBar: -6,
  checkersBorneOff: 1.5,
};

const RACE_WEIGHTS: Weights = {
  pipCount: 0,
  pipCountDiff: 2.2,
  blotCount: -0.5,
  blotExposure: -1,
  madePoints: 0.5,
  homeBoardPoints: 0.5,
  opponentHomeBoardPoints: -0.2,
  primeLength: 0.3,
  anchors: 0.2,
  advancedAnchors: 0.1,
  trappedCheckers: -1,
  stacking: -0.3,
  backCheckerProgress: 1,
  checkersOnBar: -8,
  checkersBorneOff: 1.8,
};

const BEAROFF_WEIGHTS: Weights = {
  pipCount: 0,
  pipCountDiff: 1.6,
  blotCount: -0.8,
  blotExposure: -2,
  madePoints: 0.2,
  homeBoardPoints: 0.4,
  opponentHomeBoardPoints: -0.1,
  primeLength: 0.1,
  anchors: 0.1,
  advancedAnchors: 0.1,
  trappedCheckers: -0.5,
  stacking: -1.2,
  backCheckerProgress: 0.5,
  checkersOnBar: -10,
  checkersBorneOff: 2.5,
};

const WEIGHTS_BY_PHASE: Record<GamePhase, Weights> = {
  contact: CONTACT_WEIGHTS,
  race: RACE_WEIGHTS,
  bearoff: BEAROFF_WEIGHTS,
};

export interface Evaluation {
  score: number;
  phase: GamePhase;
  features: FeatureSet;
}

/** Pure static position evaluator. Higher score = better for `forPlayer`. Swappable evaluation core. */
export function evaluate(board: BoardState, forPlayer: Player): Evaluation {
  const features = extractFeatures(board, forPlayer);
  const phase = classifyPhase(board, features);

  // Once both sides are fully home with no contact possible, this is a pure bearoff race — exact
  // win probability (from the one-sided bearoff database) replaces the heuristic weights entirely,
  // rather than approximating something that's actually computable precisely.
  if (phase === 'bearoff' && canBearOff(board, opponent(forPlayer))) {
    const table = getBearoffTable();
    const winProb = raceWinProbability(configFromBoard(board, forPlayer), configFromBoard(board, opponent(forPlayer)), table);
    if (winProb !== null) {
      return { score: winProb * BEAROFF_SCORE_SCALE, phase, features };
    }
  }

  const weights = WEIGHTS_BY_PHASE[phase];

  let score = 0;
  for (const key of Object.keys(weights) as (keyof Weights)[]) {
    const value = features[key];
    score += (typeof value === 'number' ? value : 0) * weights[key];
  }

  return { score, phase, features };
}

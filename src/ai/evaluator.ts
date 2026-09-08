import { extractFeatures, isRacingPosition, type FeatureSet } from './features';
import type { BoardState, Player } from '../game/types';

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
  const weights = WEIGHTS_BY_PHASE[phase];

  let score = 0;
  for (const key of Object.keys(weights) as (keyof Weights)[]) {
    const value = features[key];
    score += (typeof value === 'number' ? value : 0) * weights[key];
  }

  return { score, phase, features };
}

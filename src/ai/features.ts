import { direction, getPoint, homeBoardRange, isInHomeBoard, opponent, pipDistance } from '../game/board';
import { pipCount } from '../game/pipCount';
import { approximateShotProbability } from './probabilities';
import type { BoardState, Player } from '../game/types';

export interface FeatureSet {
  pipCount: number;
  pipCountDiff: number;
  blotCount: number;
  blotExposure: number; // sum of hit probabilities for own blots
  madePoints: number;
  homeBoardPoints: number;
  opponentHomeBoardPoints: number;
  primeLength: number;
  anchors: number;
  advancedAnchors: number;
  trappedCheckers: number;
  stacking: number; // count of points with 4+ checkers (over-concentration)
  backCheckerProgress: number; // 0-1, average progress of the two most-backward checkers
  bearingOffReady: boolean;
  checkersOnBar: number;
  checkersBorneOff: number;
}

function ownedPoints(board: BoardState, player: Player): { point: number; count: number }[] {
  const result: { point: number; count: number }[] = [];
  for (let p = 1; p <= 24; p++) {
    const point = getPoint(board, p);
    if (point.owner === player && point.count > 0) result.push({ point: p, count: point.count });
  }
  return result;
}

function longestPrime(board: BoardState, player: Player): number {
  const dir = direction(player);
  const made = new Set(ownedPoints(board, player).filter((p) => p.count >= 2).map((p) => p.point));
  let best = 0;
  for (let start = 1; start <= 24; start++) {
    if (!made.has(start)) continue;
    let len = 0;
    let p = start;
    while (made.has(p)) {
      len++;
      p += dir;
    }
    best = Math.max(best, len);
  }
  return best;
}

/** Points in the opponent's home board where `player` holds an anchor (2+ checkers). */
function countAnchors(board: BoardState, player: Player): { anchors: number; advanced: number } {
  const oppHome = homeBoardRange(opponent(player));
  let anchors = 0;
  let advanced = 0;
  for (let p = oppHome[0]; p <= oppHome[1]; p++) {
    const point = getPoint(board, p);
    if (point.owner === player && point.count >= 2) {
      anchors++;
      // "Advanced" anchor = deep in opponent's home (closer to their bar-entry side), a stronger anchor.
      const distanceIntoHome = player === 'white' ? oppHome[1] - p : p - oppHome[0];
      if (distanceIntoHome <= 1) advanced++;
    }
  }
  return { anchors, advanced };
}

/** Checkers of `player` trapped behind a made prime of 4+ consecutive opponent points ahead of them. */
function countTrappedCheckers(board: BoardState, player: Player): number {
  const dir = direction(player);
  const opp = opponent(player);
  const oppMade = new Set(ownedPoints(board, opp).filter((p) => p.count >= 2).map((p) => p.point));
  let trapped = 0;
  for (const { point, count } of ownedPoints(board, player)) {
    let runLength = 0;
    let p = point + dir;
    while (p >= 1 && p <= 24 && oppMade.has(p)) {
      runLength++;
      p += dir;
    }
    if (runLength >= 4) trapped += count;
  }
  return trapped;
}

function averageBackCheckerProgress(board: BoardState, player: Player): number {
  const points = ownedPoints(board, player).flatMap((p) => Array(p.count).fill(p.point) as number[]);
  const barCount = board.bar[player];
  for (let i = 0; i < barCount; i++) points.push(player === 'white' ? 0 : 25);
  if (points.length === 0) return 1;
  points.sort((a, b) => (player === 'white' ? a - b : b - a));
  const backTwo = points.slice(0, Math.min(2, points.length));
  const progress = backTwo.map((p) => 1 - pipDistance(player, Math.max(1, Math.min(24, p))) / 24);
  return progress.reduce((s, v) => s + v, 0) / progress.length;
}

/** Combined probability (approx, ignoring exact blocking) that any of `shooter`'s checkers hits the blot at `point`. */
function estimateBlotExposure(board: BoardState, shooter: Player, point: number): number {
  const shooterPoints = ownedPoints(board, shooter);
  const dir = direction(shooter);
  let missProbability = 1;
  for (const { point: from } of shooterPoints) {
    const distance = (point - from) * dir;
    if (distance <= 0 || distance > 24) continue;
    missProbability *= 1 - approximateShotProbability(distance);
  }
  if (board.bar[shooter] > 0) {
    // A checker on the bar threatens via its entry point plus onward movement; approximate with entry distance.
    missProbability *= 1 - approximateShotProbability(shooter === 'white' ? point : 25 - point);
  }
  return 1 - missProbability;
}

export function extractFeatures(board: BoardState, player: Player): FeatureSet {
  const opp = opponent(player);
  const myPip = pipCount(board, player);
  const oppPip = pipCount(board, opp);
  const owned = ownedPoints(board, player);
  const blots = owned.filter((p) => p.count === 1);
  const { anchors, advanced } = countAnchors(board, player);
  const homePoints = owned.filter((p) => isInHomeBoard(player, p.point) && p.count >= 2).length;
  const oppOwned = ownedPoints(board, opp);
  const oppHomePoints = oppOwned.filter((p) => isInHomeBoard(opp, p.point) && p.count >= 2).length;

  return {
    pipCount: myPip,
    pipCountDiff: oppPip - myPip,
    blotCount: blots.length,
    blotExposure: blots.reduce((sum, b) => sum + estimateBlotExposure(board, opp, b.point), 0),
    madePoints: owned.filter((p) => p.count >= 2).length,
    homeBoardPoints: homePoints,
    opponentHomeBoardPoints: oppHomePoints,
    primeLength: longestPrime(board, player),
    anchors,
    advancedAnchors: advanced,
    trappedCheckers: countTrappedCheckers(board, player),
    stacking: owned.filter((p) => p.count >= 4).length,
    backCheckerProgress: averageBackCheckerProgress(board, player),
    bearingOffReady: owned.every((p) => isInHomeBoard(player, p.point)) && board.bar[player] === 0,
    checkersOnBar: board.bar[player],
    checkersBorneOff: board.borneOff[player],
  };
}

/** Contact positions still have checkers that could plausibly collide; pure races have none. */
export function isRacingPosition(board: BoardState): boolean {
  const whiteMax = Math.max(0, ...ownedPointNumbers(board, 'white'));
  const blackMin = Math.min(25, ...ownedPointNumbers(board, 'black'));
  const hasContact = whiteMax >= blackMin || board.bar.white > 0 || board.bar.black > 0;
  return !hasContact;
}

function ownedPointNumbers(board: BoardState, player: Player): number[] {
  return ownedPoints(board, player).map((p) => p.point);
}

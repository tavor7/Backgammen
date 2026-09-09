import { translate, type Language } from '../i18n/translations';
import { direction, getPoint, homeBoardRange, opponent } from '../game/board';
import type { BoardState, MoveSequence, Player } from '../game/types';
import type { FeatureSet } from './features';

type Described = { key: string; params?: Record<string, number | string> } | null;

interface FeatureTemplate {
  key: keyof FeatureSet;
  /** Rough typical range for this feature, used to normalize magnitude of change across features. */
  typicalRange: number;
  /** Returns an i18n key (+ params) describing the change, or null if this change isn't worth mentioning. */
  describe(before: number, after: number, delta: number): Described;
  category: 'offense' | 'defense' | 'race' | 'structure';
}

const TEMPLATES: FeatureTemplate[] = [
  {
    key: 'blotExposure',
    typicalRange: 1.5,
    category: 'defense',
    describe: (_b, _a, delta) => (delta < -0.15 ? { key: 'explain.blotExposure.lowered' } : delta > 0.15 ? { key: 'explain.blotExposure.increased' } : null),
  },
  {
    key: 'trappedCheckers',
    typicalRange: 2,
    category: 'offense',
    describe: (before, after) => (after > before ? { key: 'explain.trapped.increased' } : before > after ? { key: 'explain.trapped.freed' } : null),
  },
  {
    key: 'pipCountDiff',
    typicalRange: 8,
    category: 'race',
    describe: (_b, _a, delta) => (delta > 4 ? { key: 'explain.race.improved' } : delta < -4 ? { key: 'explain.race.gaveUp' } : null),
  },
  {
    key: 'stacking',
    typicalRange: 2,
    category: 'structure',
    describe: (before, after) => (after < before ? { key: 'explain.stacking.improved' } : after > before ? { key: 'explain.stacking.worsened' } : null),
  },
  {
    key: 'backCheckerProgress',
    typicalRange: 0.3,
    category: 'race',
    describe: (_b, _a, delta) => (delta > 0.1 ? { key: 'explain.backChecker.advanced' } : null),
  },
  {
    key: 'checkersOnBar',
    typicalRange: 1,
    category: 'defense',
    describe: (before, after) => (after > before ? { key: 'explain.bar.putChecker' } : null),
  },
];

export interface ExplanationResult {
  summary: string;
  pros: string[];
  cons: string[];
}

interface ConcreteFact {
  described: NonNullable<Described>;
  magnitude: number;
  category: FeatureTemplate['category'];
  positive: boolean;
}

function ownedPointsMap(board: BoardState, player: Player): Map<number, number> {
  const m = new Map<number, number>();
  for (let p = 1; p <= 24; p++) {
    const point = getPoint(board, p);
    if (point.owner === player && point.count > 0) m.set(p, point.count);
  }
  return m;
}

function joinPoints(points: number[]): string {
  return points.slice().sort((a, b) => a - b).join(', ');
}

function longestPrimeRange(board: BoardState, player: Player): { start: number; end: number; length: number } | null {
  const dir = direction(player);
  const made = new Set<number>();
  for (let p = 1; p <= 24; p++) {
    const point = getPoint(board, p);
    if (point.owner === player && point.count >= 2) made.add(p);
  }
  let best: { start: number; end: number; length: number } | null = null;
  for (let start = 1; start <= 24; start++) {
    if (!made.has(start)) continue;
    let len = 0;
    let p = start;
    while (made.has(p)) {
      len++;
      p += dir;
    }
    if (!best || len > best.length) best = { start, end: p - dir, length: len };
  }
  return best;
}

/**
 * Diffs the actual board positions (not just aggregate feature counts) to surface concrete,
 * point-numbered facts — "hits on your 8-point", "makes your 20-point" — instead of only the
 * generic "improves your structure" style summaries the aggregate feature templates produce.
 */
function concreteFacts(boardBefore: BoardState, boardAfter: BoardState, player: Player, sequence: MoveSequence): ConcreteFact[] {
  const facts: ConcreteFact[] = [];
  const before = ownedPointsMap(boardBefore, player);
  const after = ownedPointsMap(boardAfter, player);

  const hitPoints = sequence.filter((m) => m.hit && typeof m.to === 'number').map((m) => m.to as number);
  if (hitPoints.length === 1) {
    facts.push({ described: { key: 'explain.hit.one', params: { point: hitPoints[0] } }, magnitude: 1, category: 'offense', positive: true });
  } else if (hitPoints.length > 1) {
    facts.push({ described: { key: 'explain.hit.many', params: { points: joinPoints(hitPoints) } }, magnitude: 1, category: 'offense', positive: true });
  }

  const madePoints: number[] = [];
  for (const [p, count] of after) {
    if (count >= 2 && (before.get(p) ?? 0) < 2) madePoints.push(p);
  }
  if (madePoints.length === 1) {
    facts.push({ described: { key: 'explain.pointMade.one', params: { point: madePoints[0] } }, magnitude: 0.7, category: 'structure', positive: true });
  } else if (madePoints.length > 1) {
    facts.push({ described: { key: 'explain.pointMade.many', params: { points: joinPoints(madePoints) } }, magnitude: 0.7, category: 'structure', positive: true });
  }

  const newBlots: number[] = [];
  for (const [p, count] of after) {
    if (count === 1 && (before.get(p) ?? 0) !== 1) newBlots.push(p);
  }
  if (newBlots.length === 1) {
    facts.push({ described: { key: 'explain.blotNew.one', params: { point: newBlots[0] } }, magnitude: 0.6, category: 'defense', positive: false });
  } else if (newBlots.length > 1) {
    facts.push({ described: { key: 'explain.blotNew.many', params: { points: joinPoints(newBlots) } }, magnitude: 0.6, category: 'defense', positive: false });
  }

  const covered: number[] = [];
  for (const [p, count] of before) {
    if (count === 1 && (after.get(p) ?? 0) >= 2) covered.push(p);
  }
  if (covered.length === 1) {
    facts.push({ described: { key: 'explain.blotCovered.one', params: { point: covered[0] } }, magnitude: 0.6, category: 'defense', positive: true });
  } else if (covered.length > 1) {
    facts.push({ described: { key: 'explain.blotCovered.many', params: { points: joinPoints(covered) } }, magnitude: 0.6, category: 'defense', positive: true });
  }

  const oppHome = homeBoardRange(opponent(player));
  for (let p = oppHome[0]; p <= oppHome[1]; p++) {
    const b = before.get(p) ?? 0;
    const a = after.get(p) ?? 0;
    if (b < 2 && a >= 2) facts.push({ described: { key: 'explain.anchorPoint.secured', params: { point: p } }, magnitude: 0.5, category: 'defense', positive: true });
    if (b >= 2 && a < 2) facts.push({ described: { key: 'explain.anchorPoint.givenUp', params: { point: p } }, magnitude: 0.5, category: 'defense', positive: false });
  }

  const beforeRun = longestPrimeRange(boardBefore, player);
  const afterRun = longestPrimeRange(boardAfter, player);
  if (afterRun && afterRun.length >= 3 && (!beforeRun || afterRun.length > beforeRun.length)) {
    facts.push({
      described: { key: 'explain.primeRange.extended', params: { range: `${afterRun.start}-${afterRun.end}`, count: afterRun.length } },
      magnitude: 0.5,
      category: 'offense',
      positive: true,
    });
  }

  // Boosted so a concrete, point-numbered fact always outranks a same-signal aggregate summary
  // (e.g. "hits your 8-point" leads ahead of a generic "improves your racing position") when both
  // apply to the same move — the whole point of computing these is to make them the headline.
  return facts.map((f) => ({ ...f, magnitude: f.magnitude * 3 }));
}

/**
 * Diffs before/after boards and feature sets and composes a natural-language explanation in the
 * given language. Never surfaces raw scores. Concrete, point-numbered facts (hits, points made,
 * blots left/covered, anchors, prime extensions) take priority over generic aggregate summaries.
 */
export function explain(boardBefore: BoardState, boardAfter: BoardState, player: Player, sequence: MoveSequence, before: FeatureSet, after: FeatureSet, language: Language = 'en'): ExplanationResult {
  const changes: { text: string; magnitude: number; category: FeatureTemplate['category']; positive: boolean }[] = [];

  for (const fact of concreteFacts(boardBefore, boardAfter, player, sequence)) {
    const text = translate(language, fact.described.key, fact.described.params);
    changes.push({ text, magnitude: fact.magnitude, category: fact.category, positive: fact.positive });
  }

  for (const template of TEMPLATES) {
    const b = before[template.key] as number;
    const a = after[template.key] as number;
    const delta = a - b;
    if (delta === 0) continue;
    const described = template.describe(b, a, delta);
    if (!described) continue;
    const text = translate(language, described.key, described.params);
    const goodDirectionIsUp = !['blotExposure', 'trappedCheckers', 'checkersOnBar', 'stacking'].includes(template.key);
    const positive = goodDirectionIsUp ? delta > 0 : delta < 0;
    changes.push({ text, magnitude: Math.abs(delta) / template.typicalRange, category: template.category, positive });
  }

  changes.sort((x, y) => y.magnitude - x.magnitude);
  const pros = changes.filter((c) => c.positive).map((c) => c.text);
  const cons = changes.filter((c) => !c.positive).map((c) => c.text);

  const top = changes.slice(0, 3);
  const summary = top.length > 0 ? capitalize(joinNaturally(top.map((c) => c.text), language)) + '.' : translate(language, 'explain.fallback');

  return { summary, pros: pros.slice(0, 3), cons: cons.slice(0, 3) };
}

function joinNaturally(parts: string[], language: Language): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return translate(language, 'explain.join.two', { a: parts[0], b: parts[1] });
  const last = translate(language, 'explain.join.last', { a: parts[parts.length - 1] });
  return `${parts.slice(0, -1).join(', ')}, ${last}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

import type { FeatureSet } from './features';

interface FeatureTemplate {
  key: keyof FeatureSet;
  /** Rough typical range for this feature, used to normalize magnitude of change across features. */
  typicalRange: number;
  describe(before: number, after: number, delta: number): string | null;
  category: 'offense' | 'defense' | 'race' | 'structure';
}

const TEMPLATES: FeatureTemplate[] = [
  {
    key: 'blotCount',
    typicalRange: 3,
    category: 'defense',
    describe: (before, after, delta) =>
      delta < 0 ? `reduces your exposed checkers from ${before} to ${after}` : delta > 0 ? `leaves ${after} checkers exposed as blots` : null,
  },
  {
    key: 'blotExposure',
    typicalRange: 1.5,
    category: 'defense',
    describe: (_b, _a, delta) => (delta < -0.15 ? 'significantly lowers your chance of being hit' : delta > 0.15 ? 'increases your risk of being hit next turn' : null),
  },
  {
    key: 'homeBoardPoints',
    typicalRange: 3,
    category: 'structure',
    describe: (before, after) => (after > before ? `strengthens your home board (${after} point${after === 1 ? '' : 's'} made)` : null),
  },
  {
    key: 'primeLength',
    typicalRange: 3,
    category: 'offense',
    describe: (before, after) => (after > before ? `extends your blocking prime to ${after} points, restricting the opponent` : null),
  },
  {
    key: 'anchors',
    typicalRange: 1,
    category: 'defense',
    describe: (before, after) => (after > before ? 'secures an anchor in the opponent\'s home board' : before > after ? 'gives up your anchor' : null),
  },
  {
    key: 'trappedCheckers',
    typicalRange: 2,
    category: 'offense',
    describe: (before, after) => (after > before ? 'traps opposing checkers behind your blocking points' : before > after ? 'frees up checkers that were trapped' : null),
  },
  {
    key: 'pipCountDiff',
    typicalRange: 8,
    category: 'race',
    describe: (_b, _a, delta) => (delta > 4 ? 'improves your racing position' : delta < -4 ? 'gives up racing ground' : null),
  },
  {
    key: 'stacking',
    typicalRange: 2,
    category: 'structure',
    describe: (before, after) => (after < before ? 'improves your checker distribution, reducing wasted stacks' : after > before ? 'over-stacks a point, reducing flexibility' : null),
  },
  {
    key: 'backCheckerProgress',
    typicalRange: 0.3,
    category: 'race',
    describe: (_b, _a, delta) => (delta > 0.1 ? 'advances your back checkers toward safety' : null),
  },
  {
    key: 'checkersOnBar',
    typicalRange: 1,
    category: 'defense',
    describe: (before, after) => (after > before ? 'puts a checker on the bar' : null),
  },
];

export interface ExplanationResult {
  summary: string;
  pros: string[];
  cons: string[];
}

/** Diffs before/after feature sets and composes a natural-language explanation. Never surfaces raw scores. */
export function explain(before: FeatureSet, after: FeatureSet): ExplanationResult {
  const changes: { text: string; magnitude: number; category: FeatureTemplate['category']; positive: boolean }[] = [];

  for (const template of TEMPLATES) {
    const b = before[template.key] as number;
    const a = after[template.key] as number;
    const delta = a - b;
    if (delta === 0) continue;
    const text = template.describe(b, a, delta);
    if (!text) continue;
    const goodDirectionIsUp = !['blotCount', 'blotExposure', 'trappedCheckers', 'checkersOnBar', 'stacking'].includes(template.key);
    const positive = goodDirectionIsUp ? delta > 0 : delta < 0;
    changes.push({ text, magnitude: Math.abs(delta) / template.typicalRange, category: template.category, positive });
  }

  changes.sort((x, y) => y.magnitude - x.magnitude);
  const pros = changes.filter((c) => c.positive).map((c) => c.text);
  const cons = changes.filter((c) => !c.positive).map((c) => c.text);

  const top = changes.slice(0, 3);
  const summary = top.length > 0 ? capitalize(joinNaturally(top.map((c) => c.text))) + '.' : 'A safe, quiet developing move.';

  return { summary, pros: pros.slice(0, 3), cons: cons.slice(0, 3) };
}

function joinNaturally(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

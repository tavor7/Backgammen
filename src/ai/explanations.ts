import { translate, type Language } from '../i18n/translations';
import type { FeatureSet } from './features';

type Described = { key: string; params?: Record<string, number> } | null;

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
    key: 'blotCount',
    typicalRange: 3,
    category: 'defense',
    describe: (before, after, delta): Described => {
      if (delta < 0) return { key: 'explain.blotCount.reduced', params: { before, after } };
      if (delta > 0) return { key: after === 1 ? 'explain.blotCount.increased.one' : 'explain.blotCount.increased.many', params: { after } };
      return null;
    },
  },
  {
    key: 'blotExposure',
    typicalRange: 1.5,
    category: 'defense',
    describe: (_b, _a, delta) => (delta < -0.15 ? { key: 'explain.blotExposure.lowered' } : delta > 0.15 ? { key: 'explain.blotExposure.increased' } : null),
  },
  {
    key: 'homeBoardPoints',
    typicalRange: 3,
    category: 'structure',
    describe: (before, after) => (after > before ? { key: after === 1 ? 'explain.homeBoard.strengthened.one' : 'explain.homeBoard.strengthened.many', params: { after } } : null),
  },
  {
    key: 'primeLength',
    typicalRange: 3,
    category: 'offense',
    describe: (before, after) => (after > before ? { key: 'explain.prime.extended', params: { after } } : null),
  },
  {
    key: 'anchors',
    typicalRange: 1,
    category: 'defense',
    describe: (before, after) => (after > before ? { key: 'explain.anchor.secured' } : before > after ? { key: 'explain.anchor.givenUp' } : null),
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

/** Diffs before/after feature sets and composes a natural-language explanation in the given language. Never surfaces raw scores. */
export function explain(before: FeatureSet, after: FeatureSet, language: Language = 'en'): ExplanationResult {
  const changes: { text: string; magnitude: number; category: FeatureTemplate['category']; positive: boolean }[] = [];

  for (const template of TEMPLATES) {
    const b = before[template.key] as number;
    const a = after[template.key] as number;
    const delta = a - b;
    if (delta === 0) continue;
    const described = template.describe(b, a, delta);
    if (!described) continue;
    const text = translate(language, described.key, described.params);
    const goodDirectionIsUp = !['blotCount', 'blotExposure', 'trappedCheckers', 'checkersOnBar', 'stacking'].includes(template.key);
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

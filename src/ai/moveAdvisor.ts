import { applySequence, generateLegalSequences } from '../game/moveGenerator';
import { opponent } from '../game/board';
import type { BoardState, MoveSequence, Player } from '../game/types';
import type { Language } from '../i18n/translations';
import { evaluate } from './evaluator';
import { explain } from './explanations';
import { rolloutEquity } from './rollout';

export type Rating = 'Excellent' | 'Strong' | 'Playable' | 'Risky';

export interface RankedCandidate {
  rank: number;
  sequence: MoveSequence;
  resultingBoard: BoardState;
  score: number;
  rating: Rating;
  summary: string;
  pros: string[];
  cons: string[];
}

function ratingFor(scoreGapFromBest: number, spread: number): Rating {
  if (spread <= 0) return 'Strong';
  const relative = scoreGapFromBest / spread;
  if (relative <= 0.05) return 'Excellent';
  if (relative <= 0.25) return 'Strong';
  if (relative <= 0.6) return 'Playable';
  return 'Risky';
}

/**
 * Ranks all legal move sequences for the given roll and returns the top `topN` candidates
 * with score, normalized rating, and a natural-language explanation of why each move is good.
 *
 * `useRollouts` swaps the ranking score from a single static-eval snapshot to the average outcome
 * of actually playing each shortlisted candidate out to completion several times — much more
 * accurate, at real computational cost, so it's reserved for the interactive Advisor panel (a
 * user-initiated, latency-tolerant action). Callers that run per-turn or over a whole game's
 * history (the best-move toast, the post-game report) leave it off to stay fast.
 */
export function getTopCandidates(board: BoardState, player: Player, dice: number[], topN = 3, language: Language = 'en', useRollouts = false): RankedCandidate[] {
  const before = evaluate(board, player);
  const sequences = generateLegalSequences(board, player, dice).filter((s) => s.length > 0);

  if (sequences.length === 0) return [];

  const scored = sequences.map((sequence) => {
    const resultingBoard = applySequence(board, player, sequence);
    const after = evaluate(resultingBoard, player);
    return { sequence, resultingBoard, score: after.score, afterFeatures: after.features };
  });

  scored.sort((a, b) => b.score - a.score);

  let ranked = scored;
  if (useRollouts) {
    // Interactive (the user is looking at a loading spinner), so kept to a shorter shortlist than
    // the computer's own move search to stay snappy.
    const shortlistSize = Math.max(topN, Math.min(6, scored.length));
    const shortlist = scored.slice(0, shortlistSize);
    const rolloutScored = shortlist.map((candidate) => ({
      ...candidate,
      // Rollout equity is naturally a small -3..+3 range; scale up so it dominates the ranking
      // (that's the point) while staying in a comparable order of magnitude to the static score
      // for the rating-spread math below.
      score: -rolloutEquity(candidate.resultingBoard, opponent(player), 4, 20) * 10,
    }));
    rolloutScored.sort((a, b) => b.score - a.score);
    ranked = rolloutScored;
  }

  const bestScore = ranked[0].score;
  const worstScore = ranked[ranked.length - 1].score;
  const spread = Math.max(bestScore - worstScore, 1e-6);

  return ranked.slice(0, topN).map((candidate, index) => {
    const { summary, pros, cons } = explain(board, candidate.resultingBoard, player, candidate.sequence, before.features, candidate.afterFeatures, language);
    return {
      rank: index + 1,
      sequence: candidate.sequence,
      resultingBoard: candidate.resultingBoard,
      score: candidate.score,
      rating: ratingFor(bestScore - candidate.score, spread),
      summary,
      pros,
      cons,
    };
  });
}

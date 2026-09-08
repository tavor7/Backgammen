import { applySequence, generateLegalSequences } from '../game/moveGenerator';
import type { BoardState, MoveSequence, Player } from '../game/types';
import { evaluate } from './evaluator';
import { explain } from './explanations';

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
 */
export function getTopCandidates(board: BoardState, player: Player, dice: number[], topN = 3): RankedCandidate[] {
  const before = evaluate(board, player);
  const sequences = generateLegalSequences(board, player, dice).filter((s) => s.length > 0);

  if (sequences.length === 0) return [];

  const scored = sequences.map((sequence) => {
    const resultingBoard = applySequence(board, player, sequence);
    const after = evaluate(resultingBoard, player);
    return { sequence, resultingBoard, score: after.score, afterFeatures: after.features };
  });

  scored.sort((a, b) => b.score - a.score);

  const bestScore = scored[0].score;
  const worstScore = scored[scored.length - 1].score;
  const spread = Math.max(bestScore - worstScore, 1e-6);

  return scored.slice(0, topN).map((candidate, index) => {
    const { summary, pros, cons } = explain(before.features, candidate.afterFeatures);
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

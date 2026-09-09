import { hashBoard } from '../game/board';
import type { GameState, Player } from '../game/types';
import { translate, type Language } from '../i18n/translations';
import { requestAdvice } from './advisorClient';

export interface PlayerReport {
  player: Player;
  turnsWithChoice: number;
  accuracy: number; // 0-1, share of turns that matched the advisor's top-ranked move
  hits: number;
  blotsLeftTurns: number;
  ratingLabel: string;
  sentence: string;
}

type RatingTier = 'grandmaster' | 'strong' | 'solid' | 'shaky' | 'beginner';

function ratingTier(accuracy: number, turnsWithChoice: number): RatingTier {
  if (turnsWithChoice === 0) return 'solid';
  if (accuracy >= 0.85) return 'grandmaster';
  if (accuracy >= 0.65) return 'strong';
  if (accuracy >= 0.45) return 'solid';
  if (accuracy >= 0.25) return 'shaky';
  return 'beginner';
}

type StyleTier = 'aggressive' | 'cautious' | 'balanced';

function styleTier(hits: number, blotsLeftTurns: number, turnsWithChoice: number): StyleTier {
  if (turnsWithChoice === 0) return 'balanced';
  if (hits / turnsWithChoice > 0.3) return 'aggressive';
  if (blotsLeftTurns / turnsWithChoice < 0.15) return 'cautious';
  return 'balanced';
}

/**
 * Retrospectively grades a finished game's move history for both players — how often each one's
 * actual move matched the advisor's top-ranked pick, how often they hit, how often they left a
 * blot behind — and turns that into a short human-readable rating and one-sentence style summary.
 * Runs once, after the game ends, off the already-existing advisor Web Worker (no live per-turn
 * tracking needed since the full history is already sitting in game.moveHistory).
 */
export async function buildGameReport(game: GameState, language: Language): Promise<Record<Player, PlayerReport>> {
  const raw: Record<Player, { turnsWithChoice: number; bestMatches: number; hits: number; blotsLeftTurns: number }> = {
    white: { turnsWithChoice: 0, bestMatches: 0, hits: 0, blotsLeftTurns: 0 },
    black: { turnsWithChoice: 0, bestMatches: 0, hits: 0, blotsLeftTurns: 0 },
  };

  for (const turn of game.moveHistory) {
    if (turn.type !== 'move' || !turn.dice) continue;
    const s = raw[turn.player];
    s.hits += turn.moves.filter((m) => m.hit).length;
    if (turn.boardAfter.points.some((pt) => pt.owner === turn.player && pt.count === 1)) s.blotsLeftTurns++;

    const candidates = await requestAdvice(turn.boardBefore, turn.player, turn.dice, 2, language);
    if (candidates.length <= 1) continue; // only one legal sequence existed — not a real choice
    s.turnsWithChoice++;
    if (hashBoard(candidates[0].resultingBoard) === hashBoard(turn.boardAfter)) s.bestMatches++;
  }

  const result = {} as Record<Player, PlayerReport>;
  for (const player of ['white', 'black'] as Player[]) {
    const s = raw[player];
    const accuracy = s.turnsWithChoice === 0 ? 1 : s.bestMatches / s.turnsWithChoice;
    const rating = ratingTier(accuracy, s.turnsWithChoice);
    const style = styleTier(s.hits, s.blotsLeftTurns, s.turnsWithChoice);
    result[player] = {
      player,
      turnsWithChoice: s.turnsWithChoice,
      accuracy,
      hits: s.hits,
      blotsLeftTurns: s.blotsLeftTurns,
      ratingLabel: translate(language, `report.rating.${rating}`),
      sentence: translate(language, 'report.sentence', {
        rating: translate(language, `report.rating.${rating}`),
        style: translate(language, `report.style.${style}`),
      }),
    };
  }
  return result;
}

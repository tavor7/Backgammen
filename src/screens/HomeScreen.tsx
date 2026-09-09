import { useEffect, useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { useUiStore } from '../state/uiStore';
import type { GameMode } from '../game/types';
import type { Difficulty } from '../ai/difficulty';
import { DIFFICULTY_LABELS } from '../ai/difficulty';

export function HomeScreen() {
  const newGame = useGameStore((s) => s.newGame);
  const loadLastActive = useGameStore((s) => s.loadLastActive);
  const goToGame = useUiStore((s) => s.goToGame);
  const difficulty = useUiStore((s) => s.difficulty);
  const setDifficulty = useUiStore((s) => s.setDifficulty);

  const [continuable, setContinuable] = useState<{ mode: GameMode } | null>(null);

  useEffect(() => {
    loadLastActive().then((game) => {
      if (game && game.status === 'inProgress' && game.moveHistory.length > 0) {
        setContinuable({ mode: game.mode });
      }
    });
  }, [loadLastActive]);

  function start(mode: GameMode) {
    newGame(mode);
    goToGame();
  }

  return (
    <div className="home-screen">
      <h1 className="home-screen__title">BACKGAMMON</h1>
      <p className="home-screen__subtitle">Choose Mode</p>

      {continuable && (
        <button type="button" className="home-screen__continue" onClick={goToGame}>
          Continue Game ({continuable.mode === 'vsComputer' ? 'vs Computer' : 'Live Assistant'})
        </button>
      )}

      <div className="home-screen__modes">
        <div className="mode-card">
          <h2>Play vs Computer</h2>
          <p>Play a full game of Backgammon against an AI opponent.</p>
          <div className="mode-card__difficulty">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                className={`btn btn--small${difficulty === d ? ' btn--active' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--primary btn--wide" onClick={() => start('vsComputer')}>
            Play vs Computer
          </button>
        </div>

        <div className="mode-card">
          <h2>Live Game Assistant</h2>
          <p>Reproduce a physical board and get move advice while playing in person.</p>
          <button type="button" className="btn btn--primary btn--wide" onClick={() => start('liveAssistant')}>
            Live Game Assistant
          </button>
        </div>
      </div>

      <p className="home-screen__credit">Built by Amit</p>
    </div>
  );
}

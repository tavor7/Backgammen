import { useEffect, useState } from 'react';
import { useGameStore } from '../state/gameStore';
import { useUiStore } from '../state/uiStore';
import type { GameMode } from '../game/types';
import type { Difficulty } from '../ai/difficulty';
import { useT, useLanguageStore } from '../i18n/useT';
import type { Language } from '../i18n/translations';
import { LANGUAGE_LABEL } from '../i18n/translations';
import { OrientationDialog } from '../components/OrientationDialog/OrientationDialog';

export function HomeScreen() {
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const newGame = useGameStore((s) => s.newGame);
  const loadLastActive = useGameStore((s) => s.loadLastActive);
  const goToGame = useUiStore((s) => s.goToGame);
  const difficulty = useUiStore((s) => s.difficulty);
  const setDifficulty = useUiStore((s) => s.setDifficulty);
  const askOrientation = useUiStore((s) => s.askOrientation);
  const resolveOrientationPrompt = useUiStore((s) => s.resolveOrientationPrompt);
  const orientationPromptCallback = useUiStore((s) => s.orientationPromptCallback);

  const [continuable, setContinuable] = useState<{ mode: GameMode } | null>(null);

  useEffect(() => {
    loadLastActive().then((game) => {
      if (game && game.status === 'inProgress' && game.moveHistory.length > 0) {
        setContinuable({ mode: game.mode });
      }
    });
  }, [loadLastActive]);

  function start(mode: GameMode) {
    askOrientation(() => {
      newGame(mode);
      goToGame();
    });
  }

  return (
    <div className="home-screen">
      <div className="home-screen__lang-switch">
        {(['en', 'he'] as Language[]).map((l) => (
          <button
            key={l}
            type="button"
            className={`btn btn--small${language === l ? ' btn--active' : ''}`}
            onClick={() => setLanguage(l)}
          >
            {LANGUAGE_LABEL[l]}
          </button>
        ))}
      </div>

      <h1 className="home-screen__title">{t('home.title')}</h1>
      <p className="home-screen__subtitle">{t('home.subtitle')}</p>

      {continuable && (
        <button type="button" className="home-screen__continue" onClick={goToGame}>
          {t('home.continue', { mode: continuable.mode === 'vsComputer' ? t('mode.vsComputer') : t('mode.liveAssistant') })}
        </button>
      )}

      <div className="home-screen__modes">
        <div className="mode-card">
          <h2>{t('home.vsComputer.title')}</h2>
          <p>{t('home.vsComputer.desc')}</p>
          <div className="mode-card__difficulty">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
              <button
                key={d}
                type="button"
                className={`btn btn--small${difficulty === d ? ' btn--active' : ''}`}
                onClick={() => setDifficulty(d)}
              >
                {t(`difficulty.${d}`)}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--primary btn--wide" onClick={() => start('vsComputer')}>
            {t('home.vsComputer.btn')}
          </button>
        </div>

        <div className="mode-card">
          <h2>{t('home.liveAssistant.title')}</h2>
          <p>{t('home.liveAssistant.desc')}</p>
          <button type="button" className="btn btn--primary btn--wide" onClick={() => start('liveAssistant')}>
            {t('home.liveAssistant.btn')}
          </button>
        </div>
      </div>

      <p className="home-screen__credit">{t('home.credit')}</p>

      {orientationPromptCallback && <OrientationDialog onChoose={resolveOrientationPrompt} />}
    </div>
  );
}

import { useEffect } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';
import { useUiStore } from './state/uiStore';
import { useLanguageStore } from './i18n/useT';
import { LANGUAGE_DIR } from './i18n/translations';
import './App.css';

export default function App() {
  const screen = useUiStore((s) => s.screen);
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = LANGUAGE_DIR[language];
  }, [language]);

  return <div className="app">{screen === 'home' ? <HomeScreen /> : <GameScreen />}</div>;
}

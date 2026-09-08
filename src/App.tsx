import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';
import { useUiStore } from './state/uiStore';
import './App.css';

export default function App() {
  const screen = useUiStore((s) => s.screen);
  return <div className="app">{screen === 'home' ? <HomeScreen /> : <GameScreen />}</div>;
}

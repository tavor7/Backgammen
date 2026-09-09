import type { TurnRecord } from '../../game/types';
import { useT } from '../../i18n/useT';

function formatMove(m: { from: number | 'bar'; to: number | 'off' }): string {
  return `${m.from}/${m.to}`;
}

interface MoveHistoryProps {
  history: TurnRecord[];
  onCorrect?: (index: number) => void;
  correctable: boolean;
}

export function MoveHistory({ history, onCorrect, correctable }: MoveHistoryProps) {
  const t = useT();

  if (history.length === 0) {
    return <div className="move-history move-history--empty">{t('moveHistory.empty')}</div>;
  }

  return (
    <div className="move-history">
      {history.map((turn, i) => (
        <div key={i} className="move-history__entry">
          <div className="move-history__meta">
            <span className={`move-history__player move-history__player--${turn.player}`}>{t(`player.${turn.player}`)}</span>
            {turn.type === 'move' && turn.dice && <span className="move-history__dice">{turn.dice[0]}-{turn.dice[1]}</span>}
            {turn.type === 'edit' && <span className="move-history__dice">{t('moveHistory.boardEdited')}</span>}
          </div>
          <div className="move-history__moves">
            {turn.type === 'move' ? turn.moves.map(formatMove).join(' ') : turn.label}
          </div>
          {correctable && onCorrect && (
            <button type="button" className="move-history__correct" onClick={() => onCorrect(i)}>
              {t('moveHistory.correctFromHere')}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

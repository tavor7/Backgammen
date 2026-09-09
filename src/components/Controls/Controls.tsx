import type { GameMode, Player } from '../../game/types';
import { useT } from '../../i18n/useT';

interface ControlsProps {
  mode: GameMode;
  currentPlayer: Player;
  editMode: boolean;
  onToggleEdit: () => void;
  onSwitchTurn: () => void;
  onOpenMenu: () => void;
}

export function Controls({ mode, currentPlayer, editMode, onToggleEdit, onSwitchTurn, onOpenMenu }: ControlsProps) {
  const t = useT();
  return (
    <div className="controls">
      <div className="controls__status">
        <span key={currentPlayer} className={`turn-indicator turn-indicator--${currentPlayer}`}>
          {t('turn.toPlay', { player: t(`player.${currentPlayer}`) })}
        </span>
        <div className="controls__status-right">
          <span className="mode-indicator">{mode === 'vsComputer' ? t('mode.vsComputer') : t('mode.liveAssistant')}</span>
          <button type="button" className="controls__menu-btn" onClick={onOpenMenu} aria-label={t('controls.menu')}>
            ☰
          </button>
        </div>
      </div>
      {mode === 'liveAssistant' && (
        <div className="controls__actions">
          <button type="button" className={`btn${editMode ? ' btn--active' : ''}`} onClick={onToggleEdit}>
            {editMode ? t('controls.doneEditing') : t('controls.editBoard')}
          </button>
          <button type="button" className="btn" onClick={onSwitchTurn}>
            {t('controls.switchTurn')}
          </button>
        </div>
      )}
    </div>
  );
}

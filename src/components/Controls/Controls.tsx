import type { GameMode, Player } from '../../game/types';

interface ControlsProps {
  mode: GameMode;
  currentPlayer: Player;
  editMode: boolean;
  onToggleEdit: () => void;
  onSwitchTurn: () => void;
  onOpenMenu: () => void;
}

export function Controls({ mode, currentPlayer, editMode, onToggleEdit, onSwitchTurn, onOpenMenu }: ControlsProps) {
  return (
    <div className="controls">
      <div className="controls__status">
        <span key={currentPlayer} className={`turn-indicator turn-indicator--${currentPlayer}`}>{currentPlayer === 'white' ? 'White' : 'Black'} to play</span>
        <div className="controls__status-right">
          <span className="mode-indicator">{mode === 'vsComputer' ? 'vs Computer' : 'Live Assistant'}</span>
          <button type="button" className="controls__menu-btn" onClick={onOpenMenu} aria-label="Menu">
            ☰
          </button>
        </div>
      </div>
      {mode === 'liveAssistant' && (
        <div className="controls__actions">
          <button type="button" className={`btn${editMode ? ' btn--active' : ''}`} onClick={onToggleEdit}>
            {editMode ? 'Done Editing' : 'Edit Board'}
          </button>
          <button type="button" className="btn" onClick={onSwitchTurn}>
            Switch Turn
          </button>
        </div>
      )}
    </div>
  );
}

import type { GameMode, Player } from '../../game/types';

interface ControlsProps {
  mode: GameMode;
  currentPlayer: Player;
  canUndo: boolean;
  canRedo: boolean;
  canRoll: boolean;
  editMode: boolean;
  onRoll: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onNewGame: () => void;
  onAdvisor: () => void;
  onToggleEdit: () => void;
  onHome: () => void;
  onSwitchTurn: () => void;
  advisorDisabled: boolean;
}

export function Controls({ mode, currentPlayer, canUndo, canRedo, canRoll, editMode, onRoll, onUndo, onRedo, onNewGame, onAdvisor, onToggleEdit, onHome, onSwitchTurn, advisorDisabled }: ControlsProps) {
  return (
    <div className="controls">
      <div className="controls__status">
        <span className={`turn-indicator turn-indicator--${currentPlayer}`}>{currentPlayer === 'white' ? 'White' : 'Black'} to play</span>
        <span className="mode-indicator">{mode === 'vsComputer' ? 'vs Computer' : 'Live Assistant'}</span>
      </div>
      <div className="controls__actions">
        {canRoll && (
          <button type="button" className="btn btn--primary" onClick={onRoll}>
            Roll Dice
          </button>
        )}
        <button type="button" className="btn" onClick={onAdvisor} disabled={advisorDisabled}>
          Advisor
        </button>
        <button type="button" className="btn" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="btn" onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
        {mode === 'liveAssistant' && (
          <>
            <button type="button" className={`btn${editMode ? ' btn--active' : ''}`} onClick={onToggleEdit}>
              {editMode ? 'Done Editing' : 'Edit Board'}
            </button>
            <button type="button" className="btn" onClick={onSwitchTurn}>
              Switch Turn
            </button>
          </>
        )}
        <button type="button" className="btn" onClick={onNewGame}>
          New Game
        </button>
        <button type="button" className="btn btn--ghost" onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  );
}

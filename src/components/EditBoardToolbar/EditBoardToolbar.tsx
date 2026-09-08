import type { Player } from '../../game/types';
import type { EditTool } from './useEditBoardTool';

interface EditBoardToolbarProps {
  activePlayer: Player;
  setActivePlayer: (p: Player) => void;
  tool: EditTool;
  setTool: (t: EditTool) => void;
  onClear: () => void;
  onReset: () => void;
  onSwitchTurn: () => void;
  warnings: { message: string }[];
}

const TOOL_LABELS: Record<EditTool, string> = { add: 'Add', remove: 'Remove', toBar: 'To Bar', toOff: 'To Off' };
const TOOL_HINTS: Record<EditTool, string> = {
  add: 'add a checker',
  remove: 'remove a checker',
  toBar: 'send a checker to the bar',
  toOff: 'bear off a checker',
};

export function EditBoardToolbar({ activePlayer, setActivePlayer, tool, setTool, onClear, onReset, onSwitchTurn, warnings }: EditBoardToolbarProps) {
  return (
    <div className="edit-toolbar">
      <div className="edit-toolbar__row">
        <span className="edit-toolbar__label">Player</span>
        <button type="button" className={`btn btn--small${activePlayer === 'white' ? ' btn--active' : ''}`} onClick={() => setActivePlayer('white')}>
          White
        </button>
        <button type="button" className={`btn btn--small${activePlayer === 'black' ? ' btn--active' : ''}`} onClick={() => setActivePlayer('black')}>
          Black
        </button>
      </div>
      <div className="edit-toolbar__row">
        <span className="edit-toolbar__label">Tool</span>
        {(Object.keys(TOOL_LABELS) as EditTool[]).map((t) => (
          <button key={t} type="button" className={`btn btn--small${tool === t ? ' btn--active' : ''}`} onClick={() => setTool(t)}>
            {TOOL_LABELS[t]}
          </button>
        ))}
      </div>
      <div className="edit-toolbar__row">
        <button type="button" className="btn btn--small" onClick={onClear}>
          Clear Board
        </button>
        <button type="button" className="btn btn--small" onClick={onReset}>
          Reset to Start
        </button>
        <button type="button" className="btn btn--small" onClick={onSwitchTurn}>
          Switch Turn
        </button>
      </div>
      <p className="edit-toolbar__hint">Tap a point on the board to {TOOL_HINTS[tool]} ({activePlayer}).</p>
      {warnings.length > 0 && (
        <div className="edit-toolbar__warnings">
          {warnings.map((w, i) => (
            <div key={i} className="warning">{w.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}

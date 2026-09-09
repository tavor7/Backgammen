import type { BoardValidationWarning } from '../../game/gameEngine';
import type { Player } from '../../game/types';
import { useT } from '../../i18n/useT';
import type { EditTool } from './useEditBoardTool';

interface EditBoardToolbarProps {
  activePlayer: Player;
  setActivePlayer: (p: Player) => void;
  tool: EditTool;
  setTool: (t: EditTool) => void;
  onClear: () => void;
  onReset: () => void;
  onSwitchTurn: () => void;
  warnings: BoardValidationWarning[];
}

const TOOL_KEYS: Record<EditTool, string> = { add: 'editToolbar.add', remove: 'editToolbar.remove', toBar: 'editToolbar.toBar', toOff: 'editToolbar.toOff' };
const TOOL_HINT_KEYS: Record<EditTool, string> = {
  add: 'editToolbar.hintAdd',
  remove: 'editToolbar.hintRemove',
  toBar: 'editToolbar.hintToBar',
  toOff: 'editToolbar.hintToOff',
};

export function EditBoardToolbar({ activePlayer, setActivePlayer, tool, setTool, onClear, onReset, onSwitchTurn, warnings }: EditBoardToolbarProps) {
  const t = useT();

  return (
    <div className="edit-toolbar">
      <div className="edit-toolbar__row">
        <span className="edit-toolbar__label">{t('editToolbar.player')}</span>
        <button type="button" className={`btn btn--small${activePlayer === 'white' ? ' btn--active' : ''}`} onClick={() => setActivePlayer('white')}>
          {t('player.white')}
        </button>
        <button type="button" className={`btn btn--small${activePlayer === 'black' ? ' btn--active' : ''}`} onClick={() => setActivePlayer('black')}>
          {t('player.black')}
        </button>
      </div>
      <div className="edit-toolbar__row">
        <span className="edit-toolbar__label">{t('editToolbar.tool')}</span>
        {(Object.keys(TOOL_KEYS) as EditTool[]).map((tool_) => (
          <button key={tool_} type="button" className={`btn btn--small${tool === tool_ ? ' btn--active' : ''}`} onClick={() => setTool(tool_)}>
            {t(TOOL_KEYS[tool_])}
          </button>
        ))}
      </div>
      <div className="edit-toolbar__row">
        <button type="button" className="btn btn--small" onClick={onClear}>
          {t('editToolbar.clearBoard')}
        </button>
        <button type="button" className="btn btn--small" onClick={onReset}>
          {t('editToolbar.resetToStart')}
        </button>
        <button type="button" className="btn btn--small" onClick={onSwitchTurn}>
          {t('controls.switchTurn')}
        </button>
      </div>
      <p className="edit-toolbar__hint">{t('editToolbar.hint', { action: t(TOOL_HINT_KEYS[tool]), player: t(`player.${activePlayer}`) })}</p>
      {warnings.length > 0 && (
        <div className="edit-toolbar__warnings">
          {warnings.map((w, i) => (
            <div key={i} className="warning">
              {w.code === 'checkerCount'
                ? t('editToolbar.warningCheckerCount', { player: t(`player.${w.player}`), count: w.count })
                : t('editToolbar.warningOrphan', { point: w.point })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

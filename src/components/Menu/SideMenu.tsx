import { useUiStore } from '../../state/uiStore';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  onNewGame: () => void;
  onHome: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function SideMenu({ open, onClose, onNewGame, onHome, onUndo, onRedo, canUndo, canRedo }: SideMenuProps) {
  const askConfirm = useUiStore((s) => s.askConfirm);

  if (!open) return null;

  function confirmAndClose(message: string, confirmLabel: string, action: () => void) {
    onClose();
    askConfirm(message, confirmLabel, action);
  }

  return (
    <div className="side-menu-overlay" onClick={onClose}>
      <div className="side-menu" onClick={(e) => e.stopPropagation()}>
        <div className="side-menu__header">
          <span>Menu</span>
          <button type="button" className="btn btn--small" onClick={onClose}>
            Close
          </button>
        </div>
        <button
          type="button"
          className="side-menu__item"
          onClick={() => {
            onClose();
            onUndo();
          }}
          disabled={!canUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className="side-menu__item"
          onClick={() => {
            onClose();
            onRedo();
          }}
          disabled={!canRedo}
        >
          Redo
        </button>
        <button
          type="button"
          className="side-menu__item side-menu__item--danger"
          onClick={() => confirmAndClose('Discard the current game and start a new one?', 'New Game', onNewGame)}
        >
          New Game
        </button>
        <button
          type="button"
          className="side-menu__item side-menu__item--danger"
          onClick={() => confirmAndClose('Leave this game and return home?', 'Go Home', onHome)}
        >
          Home
        </button>
      </div>
    </div>
  );
}

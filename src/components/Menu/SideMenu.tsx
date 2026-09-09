import { useUiStore } from '../../state/uiStore';
import { useT, useLanguageStore } from '../../i18n/useT';
import { LANGUAGE_LABEL, type Language } from '../../i18n/translations';
import type { BoardOrientation } from '../Board/Board';

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  onNewGame: () => void;
  onHome: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  boardOrientation: BoardOrientation;
  onFlipBoard: () => void;
}

export function SideMenu({ open, onClose, onNewGame, onHome, onUndo, onRedo, canUndo, canRedo, boardOrientation, onFlipBoard }: SideMenuProps) {
  const t = useT();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  if (!open) return null;

  function confirmAndClose(message: string, confirmLabel: string, action: () => void) {
    onClose();
    askConfirm(message, confirmLabel, action);
  }

  return (
    <div className="side-menu-overlay" onClick={onClose}>
      <div className="side-menu" onClick={(e) => e.stopPropagation()}>
        <div className="side-menu__header">
          <span>{t('menu.title')}</span>
          <button type="button" className="btn btn--small" onClick={onClose}>
            {t('menu.close')}
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
          {t('menu.undo')}
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
          {t('menu.redo')}
        </button>
        <button
          type="button"
          className="side-menu__item"
          onClick={() => {
            onClose();
            onFlipBoard();
          }}
        >
          {t('menu.flipBoard')} ({t(`orientation.${boardOrientation === 'bottomLeft' ? 'bottomRight' : 'bottomLeft'}`)})
        </button>
        <button
          type="button"
          className="side-menu__item side-menu__item--danger"
          onClick={() => confirmAndClose(t('menu.confirmNewGame'), t('menu.newGame'), onNewGame)}
        >
          {t('menu.newGame')}
        </button>
        <button
          type="button"
          className="side-menu__item side-menu__item--danger"
          onClick={() => confirmAndClose(t('menu.confirmHome'), t('menu.home'), onHome)}
        >
          {t('menu.home')}
        </button>
        <div className="side-menu__lang">
          <span className="side-menu__lang-label">{t('home.language')}</span>
          <div className="side-menu__lang-options">
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
        </div>
      </div>
    </div>
  );
}

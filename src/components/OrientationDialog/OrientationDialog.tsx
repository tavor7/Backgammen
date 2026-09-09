import type { BoardOrientation } from '../Board/Board';
import { useT } from '../../i18n/useT';

interface OrientationDialogProps {
  onChoose: (o: BoardOrientation) => void;
}

export function OrientationDialog({ onChoose }: OrientationDialogProps) {
  const t = useT();
  return (
    <div className="confirm-overlay">
      <div className="confirm-dialog">
        <p className="confirm-dialog__message">{t('orientation.question')}</p>
        <div className="orientation-dialog__options">
          <button type="button" className="orientation-dialog__option" onClick={() => onChoose('bottomLeft')}>
            <span className="orientation-dialog__arrow">↙</span>
            {t('orientation.bottomLeft')}
          </button>
          <button type="button" className="orientation-dialog__option" onClick={() => onChoose('bottomRight')}>
            <span className="orientation-dialog__arrow">↘</span>
            {t('orientation.bottomRight')}
          </button>
        </div>
      </div>
    </div>
  );
}

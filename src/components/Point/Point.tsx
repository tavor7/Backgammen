import { Checker } from '../Checker/Checker';
import type { Player } from '../../game/types';

interface PointProps {
  pointNumber: number;
  owner: Player | null;
  count: number;
  orientation: 'up' | 'down';
  shade: 'light' | 'dark';
  selected: boolean;
  highlighted: boolean;
  editable?: boolean;
  onSelect: () => void;
}

const MAX_VISIBLE = 5;

export function Point({ pointNumber, owner, count, orientation, shade, selected, highlighted, editable = false, onSelect }: PointProps) {
  const visible = Math.min(count, MAX_VISIBLE);
  const overflow = count - visible;

  return (
    <button
      type="button"
      className={`point point--${orientation} point--${shade}${selected ? ' point--selected' : ''}${highlighted ? ' point--highlighted' : ''}${editable ? ' point--editable' : ''}`}
      onClick={onSelect}
      aria-label={`Point ${pointNumber}${owner ? `, ${count} ${owner}` : ', empty'}`}
    >
      <div className="point__triangle" />
      <div className={`point__checkers point__checkers--${orientation}`}>
        {Array.from({ length: visible }).map((_, i) => (
          <Checker key={i} player={owner as Player} />
        ))}
        {overflow > 0 && <div className="point__overflow">+{overflow}</div>}
      </div>
      {highlighted && <div className="point__dot" />}
      <span className="point__number">{pointNumber}</span>
    </button>
  );
}

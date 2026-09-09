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
  wasLastMove?: boolean;
  hitProbability?: number | null;
  onSelect: () => void;
}

const MAX_VISIBLE = 5;

export function Point({ pointNumber, owner, count, orientation, shade, selected, highlighted, editable = false, wasLastMove = false, hitProbability = null, onSelect }: PointProps) {
  const visible = Math.min(count, MAX_VISIBLE);
  const overflow = count - visible;
  const isBlot = count === 1 && owner !== null;

  return (
    <button
      type="button"
      className={`point point--${orientation} point--${shade}${selected ? ' point--selected' : ''}${highlighted ? ' point--highlighted' : ''}${editable ? ' point--editable' : ''}${wasLastMove ? ' point--last-move' : ''}`}
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
      {isBlot && hitProbability !== null && hitProbability > 0 && (
        <div className={`point__hit-chance point__hit-chance--${owner}`} title="Chance this checker is hit next roll">
          {Math.round(hitProbability * 100)}%
        </div>
      )}
      {highlighted && <div className="point__dot" />}
    </button>
  );
}

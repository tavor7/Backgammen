import { Checker } from '../Checker/Checker';
import type { Player } from '../../game/types';

interface BarProps {
  whiteCount: number;
  blackCount: number;
  selectable: Player | null;
  selected: boolean;
  onSelect: () => void;
}

export function Bar({ whiteCount, blackCount, selectable, selected, onSelect }: BarProps) {
  return (
    <div className="bar">
      <div className="bar__section">
        {Array.from({ length: whiteCount }).map((_, i) => (
          <Checker key={i} player="white" size={18} />
        ))}
      </div>
      {(selectable || whiteCount > 0 || blackCount > 0) && (
        <button
          type="button"
          className={`bar__hit-target${selected ? ' bar__hit-target--selected' : ''}${selectable ? ' bar__hit-target--active' : ''}`}
          onClick={onSelect}
          disabled={!selectable}
          aria-label="Bar"
        />
      )}
      <div className="bar__section">
        {Array.from({ length: blackCount }).map((_, i) => (
          <Checker key={i} player="black" size={18} />
        ))}
      </div>
    </div>
  );
}

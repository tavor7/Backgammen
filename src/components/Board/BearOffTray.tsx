import type { Player } from '../../game/types';

interface BearOffTrayProps {
  player: Player;
  count: number;
  active: boolean;
  onSelect: () => void;
}

export function BearOffTray({ player, count, active, onSelect }: BearOffTrayProps) {
  // Stay out of the way until it's either actually holding checkers or is a live bear-off target.
  if (!active && count === 0) return null;

  return (
    <button
      type="button"
      className={`bear-off-tray bear-off-tray--${player}${active ? ' bear-off-tray--active' : ''}`}
      onClick={onSelect}
      disabled={!active}
      aria-label={`${player} borne off: ${count}`}
    >
      <div key={count} className="bear-off-tray__count">{count}</div>
      <div className="bear-off-tray__label">off</div>
    </button>
  );
}

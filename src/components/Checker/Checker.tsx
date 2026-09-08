import type { Player } from '../../game/types';

interface CheckerProps {
  player: Player;
  size?: number;
  ghost?: boolean;
}

export function Checker({ player, size = 34, ghost = false }: CheckerProps) {
  return (
    <div
      className={`checker checker--${player}${ghost ? ' checker--ghost' : ''}`}
      style={{ width: size, height: size }}
    />
  );
}

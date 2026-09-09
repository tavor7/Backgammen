import type { Player } from '../../game/types';

interface CheckerProps {
  player: Player;
  size?: number;
  ghost?: boolean;
  wasLastMove?: boolean;
}

export function Checker({ player, size = 34, ghost = false, wasLastMove = false }: CheckerProps) {
  return (
    <div
      className={`checker checker--${player}${ghost ? ' checker--ghost' : ''}${wasLastMove ? ' checker--last-move' : ''}`}
      style={{ width: size, height: size }}
    />
  );
}

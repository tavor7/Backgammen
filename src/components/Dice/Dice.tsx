import { useEffect, useState } from 'react';
import { useT } from '../../i18n/useT';
import type { Player } from '../../game/types';

interface DiceProps {
  rolled: [number, number] | null;
  remaining: number[];
  canRoll?: boolean;
  onRoll?: () => void;
  /** When false, renders the roll statically with no tumble animation and no used/checkmark state —
   * for showing a player's last roll after their turn has ended. */
  interactive?: boolean;
  /** Colors the die faces like that player's checkers, so whose dice they are reads from the dice
   * themselves without a text label. */
  player?: Player;
}

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

function randomFace(): number {
  return 1 + Math.floor(Math.random() * 6);
}

function DieFace({ value }: { value: number }) {
  return (
    <div className="die__grid">
      {PIPS[value]?.map(([r, c], i) => <span key={i} className="die__pip" style={{ gridRow: r + 1, gridColumn: c + 1 }} />)}
    </div>
  );
}

/**
 * Mounts fresh on every new roll (the parent keys <Dice> by the roll), so "on mount" is exactly
 * "a new roll just happened" — tumbles through random faces at a slowing cadence before landing on
 * the real value, each die starting after a small stagger for a natural, non-synchronized feel.
 */
function Die({ finalValue, used, startDelay, animate, player }: { finalValue: number; used: boolean; startDelay: number; animate: boolean; player?: Player }) {
  const [displayValue, setDisplayValue] = useState(finalValue);
  const [rolling, setRolling] = useState(animate);

  useEffect(() => {
    if (!animate) return;
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const tickCount = 7 + Math.floor(Math.random() * 3);

    function scheduleTick(tick: number) {
      const interval = 55 + tick * 14; // gradually slows down, like real dice settling
      const timeout = setTimeout(() => {
        if (cancelled) return;
        if (tick >= tickCount) {
          setDisplayValue(finalValue);
          setRolling(false);
          return;
        }
        setDisplayValue(randomFace());
        scheduleTick(tick + 1);
      }, interval);
      timeouts.push(timeout);
    }

    const startTimeout = setTimeout(() => scheduleTick(0), startDelay);
    timeouts.push(startTimeout);

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`die${player ? ` die--${player}` : ''}${used && !rolling ? ' die--used' : ''}${rolling ? ' die--rolling' : ''}`}>
      <DieFace value={displayValue} />
      {used && !rolling && <div className="die__check">✓</div>}
    </div>
  );
}

export function Dice({ rolled, remaining, canRoll = false, onRoll, interactive = true, player }: DiceProps) {
  const t = useT();

  if (!rolled) {
    if (!interactive) return null;
    return (
      <button
        type="button"
        className={`dice dice--empty${canRoll ? ' dice--tappable' : ''}`}
        onClick={onRoll}
        disabled={!canRoll}
      >
        <div className={`dice__placeholder-die${player ? ` dice__placeholder-die--${player}` : ''}`} />
        <div className={`dice__placeholder-die${player ? ` dice__placeholder-die--${player}` : ''}`} />
        <span className="dice__empty-label">{canRoll ? t('dice.tapToRoll') : t('dice.rollToBegin')}</span>
      </button>
    );
  }

  const isDouble = rolled[0] === rolled[1];

  if (isDouble) {
    // Always exactly 2 die faces, even for a double — a small multiplier badge conveys the extra uses
    // instead of rendering 4 separate dice.
    const usesLeft = interactive ? remaining.length : 0;
    const allUsed = interactive && usesLeft === 0;
    return (
      <div className="dice">
        <Die finalValue={rolled[0]} used={allUsed} startDelay={0} animate={interactive} player={player} />
        <Die finalValue={rolled[0]} used={allUsed} startDelay={90} animate={interactive} player={player} />
        {interactive && usesLeft > 0 && <div className="dice__multiplier">×{usesLeft}</div>}
      </div>
    );
  }

  const remainingCopy = remaining.slice();
  return (
    <div className="dice">
      {rolled.map((value, i) => {
        const idx = remainingCopy.indexOf(value);
        const used = interactive && idx === -1;
        if (idx >= 0) remainingCopy.splice(idx, 1);
        return <Die key={i} finalValue={value} used={used} startDelay={i * 90} animate={interactive} player={player} />;
      })}
    </div>
  );
}

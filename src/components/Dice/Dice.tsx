import { useEffect, useState } from 'react';

interface DiceProps {
  rolled: [number, number] | null;
  remaining: number[];
  canRoll?: boolean;
  onRoll?: () => void;
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

/**
 * Mounts fresh on every new roll (the parent keys <Dice> by the roll), so "on mount" is exactly
 * "a new roll just happened" — tumbles through random faces at a slowing cadence before landing on
 * the real value, each die starting after a small stagger for a natural, non-synchronized feel.
 */
function Die({ finalValue, used, startDelay }: { finalValue: number; used: boolean; startDelay: number }) {
  const [displayValue, setDisplayValue] = useState(finalValue);
  const [rolling, setRolling] = useState(true);

  useEffect(() => {
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
    <div className={`die${used && !rolling ? ' die--used' : ''}${rolling ? ' die--rolling' : ''}`}>
      <div className="die__grid">
        {PIPS[displayValue]?.map(([r, c], i) => <span key={i} className="die__pip" style={{ gridRow: r + 1, gridColumn: c + 1 }} />)}
      </div>
      {used && !rolling && <div className="die__check">✓</div>}
    </div>
  );
}

export function Dice({ rolled, remaining, canRoll = false, onRoll }: DiceProps) {
  if (!rolled) {
    return (
      <button
        type="button"
        className={`dice dice--empty${canRoll ? ' dice--tappable' : ''}`}
        onClick={onRoll}
        disabled={!canRoll}
      >
        <div className="dice__placeholder-die" />
        <div className="dice__placeholder-die" />
        <span className="dice__empty-label">{canRoll ? 'Tap to roll' : 'Roll to begin'}</span>
      </button>
    );
  }

  const remainingCopy = remaining.slice();
  const dieValues = rolled[0] === rolled[1] ? [rolled[0], rolled[0], rolled[0], rolled[0]] : [rolled[0], rolled[1]];

  return (
    <div className="dice">
      {dieValues.map((value, i) => {
        const idx = remainingCopy.indexOf(value);
        const used = idx === -1;
        if (idx >= 0) remainingCopy.splice(idx, 1);
        return <Die key={i} finalValue={value} used={used} startDelay={i * 90} />;
      })}
    </div>
  );
}

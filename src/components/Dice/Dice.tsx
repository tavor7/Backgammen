interface DiceProps {
  rolled: [number, number] | null;
  remaining: number[];
}

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

function Die({ value, used }: { value: number; used: boolean }) {
  return (
    <div className={`die${used ? ' die--used' : ''}`}>
      <div className="die__grid">
        {PIPS[value]?.map(([r, c], i) => <span key={i} className="die__pip" style={{ gridRow: r + 1, gridColumn: c + 1 }} />)}
      </div>
      {used && <div className="die__check">✓</div>}
    </div>
  );
}

export function Dice({ rolled, remaining }: DiceProps) {
  if (!rolled) return <div className="dice dice--empty">Roll to begin</div>;

  const remainingCopy = remaining.slice();
  const dieValues = rolled[0] === rolled[1] ? [rolled[0], rolled[0], rolled[0], rolled[0]] : [rolled[0], rolled[1]];

  return (
    <div className="dice">
      {dieValues.map((value, i) => {
        const idx = remainingCopy.indexOf(value);
        const used = idx === -1;
        if (idx >= 0) remainingCopy.splice(idx, 1);
        return <Die key={i} value={value} used={used} />;
      })}
    </div>
  );
}

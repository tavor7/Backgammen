import { useState } from 'react';

interface ManualDiceEntryProps {
  onEnter: (dice: [number, number]) => void;
  onRollForMe: () => void;
}

export function ManualDiceEntry({ onEnter, onRollForMe }: ManualDiceEntryProps) {
  const [d1, setD1] = useState(1);
  const [d2, setD2] = useState(1);

  return (
    <div className="manual-dice-entry">
      <p className="manual-dice-entry__label">Enter the dice that were rolled:</p>
      <div className="manual-dice-entry__inputs">
        <select value={d1} onChange={(e) => setD1(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={d2} onChange={(e) => setD2(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button type="button" className="btn btn--primary" onClick={() => onEnter([d1, d2])}>Set Dice</button>
      </div>
      <button type="button" className="btn btn--ghost" onClick={onRollForMe}>Roll for me instead</button>
    </div>
  );
}

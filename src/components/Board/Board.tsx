import { Bar } from './Bar';
import { BearOffTray } from './BearOffTray';
import { Point } from '../Point/Point';
import { getPoint } from '../../game/board';
import type { BoardState, Player } from '../../game/types';

// Display layout only — the engine's absolute point numbering (White 1->24, home 19-24) is
// untouched. Arranged so White's home board (19-24) sits in the bottom-left quadrant: White's path
// runs top-left(1) -> top-right(12) -> bottom-right(13) -> bottom-left(24), a single continuous
// non-crossing loop (Black's path is the mirror: bottom-left(24) -> ... -> top-left(1)).
const TOP_ROW = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const BOTTOM_ROW = [24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13];

interface BoardProps {
  board: BoardState;
  currentPlayer: Player;
  interactive: boolean;
  editMode?: boolean;
  selected: number | 'bar' | null;
  /** Points reachable from the current selection, including multi-die combined landing spots. */
  destinationPoints: (number | 'off')[];
  onPointClick: (point: number) => void;
  onBarClick: () => void;
  onBearOffClick: (player: Player) => void;
  mustEnterFromBar: boolean;
  lastMovePoints?: (number | 'bar' | 'off')[];
  hitProbabilities?: Map<number, number>;
}

function NumberStrip({ points }: { points: number[] }) {
  return (
    <div className="board__numbers">
      {points.slice(0, 6).map((p) => (
        <span key={p} className="board__number">{p}</span>
      ))}
      <span className="board__number board__number--bar" />
      {points.slice(6).map((p) => (
        <span key={p} className="board__number">{p}</span>
      ))}
    </div>
  );
}

export function Board({
  board,
  currentPlayer,
  interactive,
  editMode = false,
  selected,
  destinationPoints,
  onPointClick,
  onBarClick,
  onBearOffClick,
  mustEnterFromBar,
  lastMovePoints = [],
  hitProbabilities,
}: BoardProps) {
  const destinationSet = new Set(destinationPoints);
  const hasOffDestination = destinationSet.has('off');
  const lastMoveSet = new Set(lastMovePoints);

  function renderPoint(pointNumber: number, orientation: 'up' | 'down') {
    const point = getPoint(board, pointNumber);
    const shade = pointNumber % 2 === 0 ? 'light' : 'dark';
    const clickable = editMode || (interactive && (point.owner === currentPlayer || destinationSet.has(pointNumber)));
    return (
      <Point
        key={pointNumber}
        pointNumber={pointNumber}
        owner={point.owner}
        count={point.count}
        orientation={orientation}
        shade={shade}
        selected={selected === pointNumber}
        highlighted={destinationSet.has(pointNumber)}
        editable={editMode}
        wasLastMove={lastMoveSet.has(pointNumber)}
        hitProbability={hitProbabilities?.get(pointNumber) ?? null}
        onSelect={() => {
          if (clickable) onPointClick(pointNumber);
        }}
      />
    );
  }

  return (
    <div className="board">
      <NumberStrip points={TOP_ROW} />
      <div className="board__row board__row--top">
        {TOP_ROW.slice(0, 6).map((p) => renderPoint(p, 'down'))}
        <div className="board__bar-slot">
          <Bar
            whiteCount={board.bar.white}
            blackCount={board.bar.black}
            selectable={mustEnterFromBar ? currentPlayer : null}
            selected={selected === 'bar'}
            onSelect={onBarClick}
          />
        </div>
        {TOP_ROW.slice(6).map((p) => renderPoint(p, 'down'))}
      </div>
      <div className="board__row board__row--bottom">
        {BOTTOM_ROW.slice(0, 6).map((p) => renderPoint(p, 'up'))}
        <div className="board__bar-slot" />
        {BOTTOM_ROW.slice(6).map((p) => renderPoint(p, 'up'))}
      </div>
      <NumberStrip points={BOTTOM_ROW} />
      <div className="board__off-trays">
        <BearOffTray
          player="white"
          count={board.borneOff.white}
          active={interactive && currentPlayer === 'white' && hasOffDestination}
          onSelect={() => onBearOffClick('white')}
        />
        <BearOffTray
          player="black"
          count={board.borneOff.black}
          active={interactive && currentPlayer === 'black' && hasOffDestination}
          onSelect={() => onBearOffClick('black')}
        />
      </div>
    </div>
  );
}

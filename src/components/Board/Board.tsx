import type { ReactNode } from 'react';
import { Bar } from './Bar';
import { BearOffTray } from './BearOffTray';
import { Point } from '../Point/Point';
import { getPoint } from '../../game/board';
import type { BoardState, Player } from '../../game/types';

// Display layout only — the engine's absolute point numbering (White 1->24, home 19-24) is
// untouched. "bottomLeft" (default) puts White's home board (19-24) in the bottom-left quadrant:
// White's path runs top-left(1) -> top-right(12) -> bottom-right(13) -> bottom-left(24), a single
// continuous non-crossing loop (Black's path is the mirror). "bottomRight" is the horizontal mirror
// of that, putting White's home bottom-right instead — purely a display choice the player picks.
export type BoardOrientation = 'bottomLeft' | 'bottomRight';

const BASE_TOP_ROW = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const BASE_BOTTOM_ROW = [24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13];

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
  /** Point -> how many checkers landed there on the last completed turn. */
  lastMoveCounts?: Map<number | 'off', number>;
  hitProbabilities?: Map<number, number>;
  animationTick?: number;
  hitPoints?: Set<number>;
  orientation?: BoardOrientation;
  /** Rendered inside the board's own DOM/stacking context (e.g. the dice) — the board's entrance
   * animation makes it an isolated stacking context, so anything meant to sit "on" the board but
   * still stay under important overlays like the move-destination dot has to live in here rather
   * than as a sibling, or z-index between them becomes uncontrollable from outside. */
  children?: ReactNode;
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
  lastMoveCounts = new Map(),
  hitProbabilities,
  animationTick = 0,
  hitPoints = new Set(),
  orientation = 'bottomLeft',
  children,
}: BoardProps) {
  const mirrored = orientation === 'bottomRight';
  const TOP_ROW = mirrored ? [...BASE_TOP_ROW].reverse() : BASE_TOP_ROW;
  const BOTTOM_ROW = mirrored ? [...BASE_BOTTOM_ROW].reverse() : BASE_BOTTOM_ROW;
  const cornerSide = mirrored ? 'right' : 'left';

  const destinationSet = new Set(destinationPoints);
  const hasOffDestination = destinationSet.has('off');

  function renderPoint(pointNumber: number, orientation_: 'up' | 'down') {
    const point = getPoint(board, pointNumber);
    const shade = pointNumber % 2 === 0 ? 'light' : 'dark';
    const clickable = editMode || (interactive && (point.owner === currentPlayer || destinationSet.has(pointNumber)));
    return (
      <Point
        key={pointNumber}
        pointNumber={pointNumber}
        owner={point.owner}
        count={point.count}
        orientation={orientation_}
        shade={shade}
        selected={selected === pointNumber}
        highlighted={destinationSet.has(pointNumber)}
        editable={editMode}
        lastMoveCount={lastMoveCounts.get(pointNumber) ?? 0}
        animationTick={animationTick}
        hitProbability={hitProbabilities?.get(pointNumber) ?? null}
        wasHit={hitPoints.has(pointNumber)}
        onSelect={() => {
          if (clickable) onPointClick(pointNumber);
        }}
      />
    );
  }

  return (
    <div className="board">
      <div className="board__hinge-line" />
      {children}
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
      <div className={`board__off-corner board__off-corner--bottom board__off-corner--${cornerSide}`}>
        <BearOffTray
          player="white"
          count={board.borneOff.white}
          active={interactive && currentPlayer === 'white' && hasOffDestination}
          onSelect={() => onBearOffClick('white')}
        />
      </div>
      <div className={`board__off-corner board__off-corner--top board__off-corner--${cornerSide}`}>
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

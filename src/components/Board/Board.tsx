import { Bar } from './Bar';
import { BearOffTray } from './BearOffTray';
import { Point } from '../Point/Point';
import { getPoint } from '../../game/board';
import type { BoardState, CheckerMove, Player } from '../../game/types';

const TOP_ROW = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
const BOTTOM_ROW = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

interface BoardProps {
  board: BoardState;
  currentPlayer: Player;
  interactive: boolean;
  editMode?: boolean;
  selected: number | 'bar' | null;
  legalDestinations: CheckerMove[];
  onPointClick: (point: number) => void;
  onBarClick: () => void;
  onBearOffClick: (player: Player) => void;
  mustEnterFromBar: boolean;
}

export function Board({ board, currentPlayer, interactive, editMode = false, selected, legalDestinations, onPointClick, onBarClick, onBearOffClick, mustEnterFromBar }: BoardProps) {
  const destinationPoints = new Set(legalDestinations.map((m) => m.to));
  const hasOffDestination = legalDestinations.some((m) => m.to === 'off');

  function renderPoint(pointNumber: number, orientation: 'up' | 'down') {
    const point = getPoint(board, pointNumber);
    const shade = pointNumber % 2 === 0 ? 'light' : 'dark';
    const clickable = editMode || (interactive && (point.owner === currentPlayer || destinationPoints.has(pointNumber)));
    return (
      <Point
        key={pointNumber}
        pointNumber={pointNumber}
        owner={point.owner}
        count={point.count}
        orientation={orientation}
        shade={shade}
        selected={selected === pointNumber}
        highlighted={destinationPoints.has(pointNumber)}
        editable={editMode}
        onSelect={() => {
          if (clickable) onPointClick(pointNumber);
        }}
      />
    );
  }

  return (
    <div className="board">
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

import { useState } from 'react';
import type { BoardEdit, Player } from '../../game/types';

export type EditTool = 'add' | 'remove' | 'toBar' | 'toOff';

/** Local UI state (active player + tool) for manual board editing, plus the point-click -> edit mapping. */
export function useEditBoardTool(applyEdit: (edit: BoardEdit) => void) {
  const [activePlayer, setActivePlayer] = useState<Player>('white');
  const [tool, setTool] = useState<EditTool>('add');

  function handlePointClick(point: number) {
    if (tool === 'add') applyEdit({ type: 'addChecker', point, player: activePlayer });
    if (tool === 'remove') applyEdit({ type: 'removeChecker', point });
    if (tool === 'toBar') applyEdit({ type: 'toBar', point });
    if (tool === 'toOff') applyEdit({ type: 'toBorneOff', point });
  }

  return { activePlayer, setActivePlayer, tool, setTool, handlePointClick };
}

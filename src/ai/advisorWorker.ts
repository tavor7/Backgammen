import { chooseComputerMove } from './computerPlayer';
import type { Difficulty } from './difficulty';
import { getTopCandidates } from './moveAdvisor';
import type { BoardState, Player } from '../game/types';

export type WorkerRequest =
  | { id: number; type: 'advise'; board: BoardState; player: Player; dice: number[]; topN: number }
  | { id: number; type: 'computerMove'; board: BoardState; player: Player; dice: [number, number]; difficulty: Difficulty };

export type WorkerResponse =
  | { id: number; type: 'advise'; candidates: ReturnType<typeof getTopCandidates> }
  | { id: number; type: 'computerMove'; sequence: ReturnType<typeof chooseComputerMove> };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type === 'advise') {
    const candidates = getTopCandidates(msg.board, msg.player, msg.dice, msg.topN);
    const response: WorkerResponse = { id: msg.id, type: 'advise', candidates };
    (self as unknown as Worker).postMessage(response);
  } else if (msg.type === 'computerMove') {
    const sequence = chooseComputerMove(msg.board, msg.player, msg.dice, msg.difficulty);
    const response: WorkerResponse = { id: msg.id, type: 'computerMove', sequence };
    (self as unknown as Worker).postMessage(response);
  }
};

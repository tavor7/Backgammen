import { chooseComputerMove } from './computerPlayer';
import type { Difficulty } from './difficulty';
import { getTopCandidates } from './moveAdvisor';
import { getBearoffTable } from './bearoff';
import type { BoardState, Player } from '../game/types';
import type { Language } from '../i18n/translations';

// Build the bearoff database as soon as this worker spins up, off the main thread and (ideally)
// well before any real request needs it — building it lazily on first use instead would otherwise
// stall whichever request happens to hit a bearoff position first (rollouts routinely simulate
// their way into one even from early-game positions).
getBearoffTable();

export type WorkerRequest =
  | { id: number; type: 'advise'; board: BoardState; player: Player; dice: number[]; topN: number; language: Language; useRollouts?: boolean }
  | { id: number; type: 'computerMove'; board: BoardState; player: Player; dice: [number, number]; difficulty: Difficulty };

export type WorkerResponse =
  | { id: number; type: 'advise'; candidates: ReturnType<typeof getTopCandidates> }
  | { id: number; type: 'computerMove'; sequence: ReturnType<typeof chooseComputerMove> };

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type === 'advise') {
    const candidates = getTopCandidates(msg.board, msg.player, msg.dice, msg.topN, msg.language, msg.useRollouts ?? false);
    const response: WorkerResponse = { id: msg.id, type: 'advise', candidates };
    (self as unknown as Worker).postMessage(response);
  } else if (msg.type === 'computerMove') {
    const sequence = chooseComputerMove(msg.board, msg.player, msg.dice, msg.difficulty);
    const response: WorkerResponse = { id: msg.id, type: 'computerMove', sequence };
    (self as unknown as Worker).postMessage(response);
  }
};

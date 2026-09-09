import type { Difficulty } from './difficulty';
import type { RankedCandidate } from './moveAdvisor';
import type { BoardState, Player } from '../game/types';
import type { Language } from '../i18n/translations';
import type { WorkerRequest, WorkerResponse } from './advisorWorker';

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (response: WorkerResponse) => void>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./advisorWorker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const resolver = pending.get(event.data.id);
      if (resolver) {
        resolver(event.data);
        pending.delete(event.data.id);
      }
    };
  }
  return worker;
}

function send(request: WorkerRequest): Promise<WorkerResponse> {
  return new Promise((resolve) => {
    pending.set(request.id, resolve);
    getWorker().postMessage(request);
  });
}

export async function requestAdvice(board: BoardState, player: Player, dice: number[], topN: number, language: Language = 'en'): Promise<RankedCandidate[]> {
  const id = nextId++;
  const response = await send({ id, type: 'advise', board, player, dice, topN, language });
  return response.type === 'advise' ? response.candidates : [];
}

export async function requestComputerMove(board: BoardState, player: Player, dice: [number, number], difficulty: Difficulty) {
  const id = nextId++;
  const response = await send({ id, type: 'computerMove', board, player, dice, difficulty });
  return response.type === 'computerMove' ? response.sequence : [];
}

import { create } from 'zustand';
import type { Difficulty } from '../ai/difficulty';
import type { RankedCandidate } from '../ai/moveAdvisor';
import type { CheckerMove, Player } from '../game/types';
import type { BoardOrientation } from '../components/Board/Board';

export type Screen = 'home' | 'game';

const ORIENTATION_KEY = 'backgammon:boardOrientation';

/** Guards recordWin against double-counting the same game's win on a re-render (module-level,
 * not store state, since it's bookkeeping rather than UI state). */
let lastRecordedWinGameId: string | null = null;

function loadInitialOrientation(): BoardOrientation {
  try {
    const stored = window.localStorage.getItem(ORIENTATION_KEY);
    if (stored === 'bottomLeft' || stored === 'bottomRight') return stored;
  } catch {
    // ignore
  }
  return 'bottomLeft';
}

interface UiStore {
  screen: Screen;
  goHome: () => void;
  goToGame: () => void;

  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  topN: number;

  selectedPoint: number | 'bar' | null;
  select: (point: number | 'bar' | null) => void;
  legalDestinations: CheckerMove[];
  setLegalDestinations: (moves: CheckerMove[]) => void;

  advisorOpen: boolean;
  advisorLoading: boolean;
  candidates: RankedCandidate[];
  previewCandidate: RankedCandidate | null;
  openAdvisor: () => void;
  closeAdvisor: () => void;
  setAdvisorLoading: (loading: boolean) => void;
  setCandidates: (c: RankedCandidate[]) => void;
  setPreview: (c: RankedCandidate | null) => void;

  editToolOpen: boolean;
  toggleEditTool: () => void;

  toast: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;

  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;

  confirmDialog: { message: string; confirmLabel: string; onConfirm: () => void } | null;
  askConfirm: (message: string, confirmLabel: string, onConfirm: () => void) => void;
  dismissConfirm: () => void;

  boardOrientation: BoardOrientation;
  setBoardOrientation: (o: BoardOrientation) => void;
  flipBoard: () => void;

  /** Tally across consecutive games in the current match (not persisted — resets on a fresh start). */
  matchScore: { white: number; black: number };
  recordWin: (winner: Player, gameId: string) => void;
  resetMatchScore: () => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  screen: 'home',
  goHome: () => set({ screen: 'home' }),
  goToGame: () => set({ screen: 'game' }),

  difficulty: 'medium',
  setDifficulty: (d) => set({ difficulty: d }),
  topN: 3,

  selectedPoint: null,
  select: (point) => set({ selectedPoint: point }),
  legalDestinations: [],
  setLegalDestinations: (moves) => set({ legalDestinations: moves }),

  advisorOpen: false,
  advisorLoading: false,
  candidates: [],
  previewCandidate: null,
  openAdvisor: () => set({ advisorOpen: true }),
  closeAdvisor: () => set({ advisorOpen: false, previewCandidate: null }),
  setAdvisorLoading: (loading) => set({ advisorLoading: loading }),
  setCandidates: (c) => set({ candidates: c }),
  setPreview: (c) => set({ previewCandidate: c }),

  editToolOpen: false,
  toggleEditTool: () => set((s) => ({ editToolOpen: !s.editToolOpen })),

  toast: null,
  showToast: (msg) => set({ toast: msg }),
  clearToast: () => set({ toast: null }),

  menuOpen: false,
  openMenu: () => set({ menuOpen: true }),
  closeMenu: () => set({ menuOpen: false }),

  confirmDialog: null,
  askConfirm: (message, confirmLabel, onConfirm) => set({ confirmDialog: { message, confirmLabel, onConfirm } }),
  dismissConfirm: () => set({ confirmDialog: null }),

  boardOrientation: loadInitialOrientation(),
  setBoardOrientation: (o) => {
    try {
      window.localStorage.setItem(ORIENTATION_KEY, o);
    } catch {
      // ignore
    }
    set({ boardOrientation: o });
  },
  flipBoard: () => get().setBoardOrientation(get().boardOrientation === 'bottomLeft' ? 'bottomRight' : 'bottomLeft'),

  matchScore: { white: 0, black: 0 },
  recordWin: (winner, gameId) => {
    if (lastRecordedWinGameId === gameId) return;
    lastRecordedWinGameId = gameId;
    set((s) => ({ matchScore: { ...s.matchScore, [winner]: s.matchScore[winner] + 1 } }));
  },
  resetMatchScore: () => {
    lastRecordedWinGameId = null;
    set({ matchScore: { white: 0, black: 0 } });
  },
}));

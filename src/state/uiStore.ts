import { create } from 'zustand';
import type { Difficulty } from '../ai/difficulty';
import type { RankedCandidate } from '../ai/moveAdvisor';
import type { CheckerMove } from '../game/types';

export type Screen = 'home' | 'game';

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
}

export const useUiStore = create<UiStore>((set) => ({
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
}));

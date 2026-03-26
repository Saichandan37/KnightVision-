import { create } from 'zustand'
import type { GameMeta, MoveResult } from '../types/analysis'

export type AnalysisStatus =
  | 'idle'
  | 'uploading'
  | 'analysing'
  | 'complete'
  | 'error'
  | 'stalled'

export type LLMProvider = 'ollama' | 'groq' | 'huggingface'

interface AnalysisState {
  // State
  gameId: string | null
  moves: MoveResult[]
  meta: GameMeta | null
  analysisStatus: AnalysisStatus
  whiteAccuracy: number | null
  blackAccuracy: number | null
  activeProvider: LLMProvider
  providerHealth: Record<string, boolean>

  // Actions — no logic, only setters
  setGameId: (id: string | null) => void
  appendMove: (move: MoveResult) => void
  setMeta: (meta: GameMeta | null) => void
  setStatus: (status: AnalysisStatus) => void
  setAccuracy: (white: number | null, black: number | null) => void
  setActiveProvider: (provider: LLMProvider) => void
  setProviderHealth: (health: Record<string, boolean>) => void
  reset: () => void
}

const initialState = {
  gameId: null,
  moves: [],
  meta: null,
  analysisStatus: 'idle' as AnalysisStatus,
  whiteAccuracy: null,
  blackAccuracy: null,
  activeProvider: 'ollama' as LLMProvider,
  providerHealth: {},
}

export const useAnalysisStore = create<AnalysisState>()((set) => ({
  ...initialState,

  setGameId: (id) => set({ gameId: id }),
  appendMove: (move) => set((state) => ({ moves: [...state.moves, move] })),
  setMeta: (meta) => set({ meta }),
  setStatus: (status) => set({ analysisStatus: status }),
  setAccuracy: (white, black) => set({ whiteAccuracy: white, blackAccuracy: black }),
  setActiveProvider: (provider) => set({ activeProvider: provider }),
  setProviderHealth: (health) => set({ providerHealth: health }),
  reset: () => set(initialState),
}))

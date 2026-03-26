/**
 * Zustand store supporting tests — all actions, initial state, immutability.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useAnalysisStore } from '../analysisStore'
import type { GameMeta, MoveResult } from '../../types/analysis'

const MOCK_MOVE: MoveResult = {
  move_index: 0,
  move_number: 1,
  san: 'e4',
  uci: 'e2e4',
  category: 'best',
  cp_loss: 0,
  eval_before_cp: 0,
  eval_after_cp: 30,
  best_move_uci: 'e2e4',
  best_move_san: 'e4',
  top_candidates: [],
  comment: '',
  comment_source: 'fallback',
}

const MOCK_META: GameMeta = {
  white: 'Kasparov',
  black: 'Karpov',
  white_elo: 2851,
  black_elo: 2780,
  result: '1-0',
  date: '2024.01.01',
  opening_eco: 'B90',
  opening_name: 'Sicilian Defense',
}

beforeEach(() => {
  useAnalysisStore.getState().reset()
})

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('gameId is null', () => {
    expect(useAnalysisStore.getState().gameId).toBeNull()
  })

  it('moves is empty array', () => {
    expect(useAnalysisStore.getState().moves).toEqual([])
  })

  it('meta is null', () => {
    expect(useAnalysisStore.getState().meta).toBeNull()
  })

  it('analysisStatus is idle', () => {
    expect(useAnalysisStore.getState().analysisStatus).toBe('idle')
  })

  it('whiteAccuracy is null', () => {
    expect(useAnalysisStore.getState().whiteAccuracy).toBeNull()
  })

  it('blackAccuracy is null', () => {
    expect(useAnalysisStore.getState().blackAccuracy).toBeNull()
  })

  it('activeProvider is ollama', () => {
    expect(useAnalysisStore.getState().activeProvider).toBe('ollama')
  })

  it('providerHealth is empty object', () => {
    expect(useAnalysisStore.getState().providerHealth).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// setGameId
// ---------------------------------------------------------------------------

describe('setGameId', () => {
  it('sets the game id', () => {
    useAnalysisStore.getState().setGameId('abc-123')
    expect(useAnalysisStore.getState().gameId).toBe('abc-123')
  })

  it('can set game id to null', () => {
    useAnalysisStore.getState().setGameId('abc-123')
    useAnalysisStore.getState().setGameId(null)
    expect(useAnalysisStore.getState().gameId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// appendMove
// ---------------------------------------------------------------------------

describe('appendMove', () => {
  it('appends to existing moves', () => {
    useAnalysisStore.getState().appendMove(MOCK_MOVE)
    useAnalysisStore.getState().appendMove({ ...MOCK_MOVE, move_index: 1, san: 'e5' })
    expect(useAnalysisStore.getState().moves).toHaveLength(2)
  })

  it('preserves move data', () => {
    useAnalysisStore.getState().appendMove(MOCK_MOVE)
    expect(useAnalysisStore.getState().moves[0].san).toBe('e4')
    expect(useAnalysisStore.getState().moves[0].category).toBe('best')
  })

  it('does not mutate previous moves array', () => {
    useAnalysisStore.getState().appendMove(MOCK_MOVE)
    const before = useAnalysisStore.getState().moves
    useAnalysisStore.getState().appendMove({ ...MOCK_MOVE, move_index: 1 })
    const after = useAnalysisStore.getState().moves
    expect(before).not.toBe(after)
  })
})

// ---------------------------------------------------------------------------
// setMeta
// ---------------------------------------------------------------------------

describe('setMeta', () => {
  it('sets metadata', () => {
    useAnalysisStore.getState().setMeta(MOCK_META)
    expect(useAnalysisStore.getState().meta?.white).toBe('Kasparov')
  })

  it('can clear metadata to null', () => {
    useAnalysisStore.getState().setMeta(MOCK_META)
    useAnalysisStore.getState().setMeta(null)
    expect(useAnalysisStore.getState().meta).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// setStatus
// ---------------------------------------------------------------------------

describe('setStatus', () => {
  it('sets analysisStatus', () => {
    useAnalysisStore.getState().setStatus('analysing')
    expect(useAnalysisStore.getState().analysisStatus).toBe('analysing')
  })

  it('transitions through all valid statuses', () => {
    const statuses = ['uploading', 'analysing', 'complete', 'error', 'stalled', 'idle'] as const
    for (const s of statuses) {
      useAnalysisStore.getState().setStatus(s)
      expect(useAnalysisStore.getState().analysisStatus).toBe(s)
    }
  })
})

// ---------------------------------------------------------------------------
// setAccuracy
// ---------------------------------------------------------------------------

describe('setAccuracy', () => {
  it('sets white and black accuracy', () => {
    useAnalysisStore.getState().setAccuracy(92.5, 88.3)
    expect(useAnalysisStore.getState().whiteAccuracy).toBe(92.5)
    expect(useAnalysisStore.getState().blackAccuracy).toBe(88.3)
  })

  it('can set accuracy to null', () => {
    useAnalysisStore.getState().setAccuracy(90.0, 85.0)
    useAnalysisStore.getState().setAccuracy(null, null)
    expect(useAnalysisStore.getState().whiteAccuracy).toBeNull()
    expect(useAnalysisStore.getState().blackAccuracy).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// setActiveProvider
// ---------------------------------------------------------------------------

describe('setActiveProvider', () => {
  it('sets active provider to groq', () => {
    useAnalysisStore.getState().setActiveProvider('groq')
    expect(useAnalysisStore.getState().activeProvider).toBe('groq')
  })

  it('sets active provider to huggingface', () => {
    useAnalysisStore.getState().setActiveProvider('huggingface')
    expect(useAnalysisStore.getState().activeProvider).toBe('huggingface')
  })
})

// ---------------------------------------------------------------------------
// setProviderHealth
// ---------------------------------------------------------------------------

describe('setProviderHealth', () => {
  it('sets provider health map', () => {
    useAnalysisStore.getState().setProviderHealth({ ollama: true, groq: false, huggingface: true })
    expect(useAnalysisStore.getState().providerHealth).toEqual({
      ollama: true,
      groq: false,
      huggingface: true,
    })
  })
})

// ---------------------------------------------------------------------------
// reset
// ---------------------------------------------------------------------------

describe('reset', () => {
  it('resets all state fields to initial values', () => {
    useAnalysisStore.getState().setGameId('xyz')
    useAnalysisStore.getState().appendMove(MOCK_MOVE)
    useAnalysisStore.getState().setMeta(MOCK_META)
    useAnalysisStore.getState().setStatus('complete')
    useAnalysisStore.getState().setAccuracy(90.0, 85.0)
    useAnalysisStore.getState().setActiveProvider('groq')
    useAnalysisStore.getState().setProviderHealth({ ollama: true })

    useAnalysisStore.getState().reset()

    const s = useAnalysisStore.getState()
    expect(s.gameId).toBeNull()
    expect(s.moves).toEqual([])
    expect(s.meta).toBeNull()
    expect(s.analysisStatus).toBe('idle')
    expect(s.whiteAccuracy).toBeNull()
    expect(s.blackAccuracy).toBeNull()
    expect(s.activeProvider).toBe('ollama')
    expect(s.providerHealth).toEqual({})
  })
})

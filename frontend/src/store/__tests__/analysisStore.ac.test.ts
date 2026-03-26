/**
 * Zustand store AC gate tests.
 *
 * AC: useAnalysisStore.getState().appendMove(mockMove) adds one entry to moves;
 *     calling reset() sets moves back to [] and analysisStatus back to "idle".
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useAnalysisStore } from '../analysisStore'
import type { MoveResult } from '../../types/analysis'

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

beforeEach(() => {
  useAnalysisStore.getState().reset()
})

describe('AC: appendMove and reset', () => {
  it('appendMove adds one entry to moves', () => {
    useAnalysisStore.getState().appendMove(MOCK_MOVE)
    expect(useAnalysisStore.getState().moves).toHaveLength(1)
  })

  it('reset sets moves back to []', () => {
    useAnalysisStore.getState().appendMove(MOCK_MOVE)
    useAnalysisStore.getState().reset()
    expect(useAnalysisStore.getState().moves).toEqual([])
  })

  it('reset sets analysisStatus back to "idle"', () => {
    useAnalysisStore.getState().setStatus('analysing')
    useAnalysisStore.getState().reset()
    expect(useAnalysisStore.getState().analysisStatus).toBe('idle')
  })
})

/**
 * AC gate tests — PlaybackControls component (Story 5.8).
 *
 * AC: With analysisStatus="complete" and 10 moves in store, clicking go-to-end
 *     sets currentMoveIndex to 9; clicking go-to-start sets it back to -1;
 *     the "Move X / Y" counter updates correctly after each click.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PlaybackControls } from '../PlaybackControls'
import { useAnalysisStore } from '../../store/analysisStore'
import type { MoveResult } from '../../types/analysis'

function makeMove(index: number): MoveResult {
  return {
    move_index: index,
    move_number: Math.floor(index / 2) + 1,
    san: 'e4',
    uci: 'e2e4',
    category: 'best',
    cp_loss: 0,
    eval_before_cp: 0,
    eval_after_cp: 10,
    best_move_uci: 'e2e4',
    best_move_san: 'e4',
    top_candidates: [],
    comment: 'Good.',
    comment_source: 'fallback',
  }
}

beforeEach(() => {
  useAnalysisStore.getState().reset()
  for (let i = 0; i < 10; i++) {
    useAnalysisStore.getState().appendMove(makeMove(i))
  }
  useAnalysisStore.getState().setStatus('complete')
})

describe('AC: PlaybackControls navigation with 10 moves', () => {
  it('clicking go-to-end sets move counter to "Move 10 / 10"', () => {
    render(<PlaybackControls />)
    fireEvent.click(screen.getByTestId('btn-go-to-end'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Move 10 / 10')
  })

  it('clicking go-to-start after go-to-end resets counter to "Start / 10"', () => {
    render(<PlaybackControls />)
    fireEvent.click(screen.getByTestId('btn-go-to-end'))
    fireEvent.click(screen.getByTestId('btn-go-to-start'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 10')
  })

  it('counter updates correctly after each click (go-to-end then go-to-start)', () => {
    render(<PlaybackControls />)
    // Initial state
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 10')
    // After go-to-end
    fireEvent.click(screen.getByTestId('btn-go-to-end'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Move 10 / 10')
    // After go-to-start
    fireEvent.click(screen.getByTestId('btn-go-to-start'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 10')
  })
})

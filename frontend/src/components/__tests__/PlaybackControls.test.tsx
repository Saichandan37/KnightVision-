/**
 * PlaybackControls supporting tests — buttons, counter display, play/pause toggle.
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
})

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe('structure', () => {
  it('renders the playback-controls container', () => {
    render(<PlaybackControls />)
    expect(screen.getByTestId('playback-controls')).toBeInTheDocument()
  })

  it('renders all 5 buttons', () => {
    render(<PlaybackControls />)
    expect(screen.getByTestId('btn-go-to-start')).toBeInTheDocument()
    expect(screen.getByTestId('btn-prev')).toBeInTheDocument()
    expect(screen.getByTestId('btn-play-pause')).toBeInTheDocument()
    expect(screen.getByTestId('btn-next')).toBeInTheDocument()
    expect(screen.getByTestId('btn-go-to-end')).toBeInTheDocument()
  })

  it('renders move-counter', () => {
    render(<PlaybackControls />)
    expect(screen.getByTestId('move-counter')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Counter display
// ---------------------------------------------------------------------------

describe('move counter', () => {
  it('shows "Start / 0" when no moves in store', () => {
    render(<PlaybackControls />)
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 0')
  })

  it('shows "Start / 5" when 5 moves loaded', () => {
    for (let i = 0; i < 5; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<PlaybackControls />)
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 5')
  })

  it('shows "Move 1 / 3" after clicking next once with 3 moves', () => {
    for (let i = 0; i < 3; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<PlaybackControls />)
    fireEvent.click(screen.getByTestId('btn-next'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Move 1 / 3')
  })

  it('shows "Move 2 / 3" after clicking next twice', () => {
    for (let i = 0; i < 3; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<PlaybackControls />)
    fireEvent.click(screen.getByTestId('btn-next'))
    fireEvent.click(screen.getByTestId('btn-next'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Move 2 / 3')
  })

  it('counter resets to "Start / 3" after prev from move 1', () => {
    for (let i = 0; i < 3; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<PlaybackControls />)
    fireEvent.click(screen.getByTestId('btn-next'))
    fireEvent.click(screen.getByTestId('btn-prev'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 3')
  })
})

// ---------------------------------------------------------------------------
// Navigation buttons
// ---------------------------------------------------------------------------

describe('navigation buttons', () => {
  it('go-to-end sets counter to last move', () => {
    for (let i = 0; i < 4; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<PlaybackControls />)
    fireEvent.click(screen.getByTestId('btn-go-to-end'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Move 4 / 4')
  })

  it('go-to-start after go-to-end resets counter', () => {
    for (let i = 0; i < 4; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<PlaybackControls />)
    fireEvent.click(screen.getByTestId('btn-go-to-end'))
    fireEvent.click(screen.getByTestId('btn-go-to-start'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 4')
  })

  it('prev does nothing when at start', () => {
    for (let i = 0; i < 3; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<PlaybackControls />)
    fireEvent.click(screen.getByTestId('btn-prev'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 3')
  })

  it('next does nothing when at end', () => {
    for (let i = 0; i < 2; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<PlaybackControls />)
    fireEvent.click(screen.getByTestId('btn-go-to-end'))
    fireEvent.click(screen.getByTestId('btn-next'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Move 2 / 2')
  })
})

// ---------------------------------------------------------------------------
// Play/Pause toggle
// ---------------------------------------------------------------------------

describe('play/pause button', () => {
  it('shows ▶ initially', () => {
    render(<PlaybackControls />)
    expect(screen.getByTestId('btn-play-pause')).toHaveTextContent('▶')
  })

  it('has aria-label "Play" initially', () => {
    render(<PlaybackControls />)
    expect(screen.getByTestId('btn-play-pause')).toHaveAttribute('aria-label', 'Play')
  })

  it('switches to ⏸ after clicking play with moves loaded', () => {
    for (let i = 0; i < 3; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<PlaybackControls />)
    fireEvent.click(screen.getByTestId('btn-play-pause'))
    expect(screen.getByTestId('btn-play-pause')).toHaveTextContent('⏸')
  })

  it('switches back to ▶ after clicking pause', () => {
    for (let i = 0; i < 3; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<PlaybackControls />)
    fireEvent.click(screen.getByTestId('btn-play-pause'))
    fireEvent.click(screen.getByTestId('btn-play-pause'))
    expect(screen.getByTestId('btn-play-pause')).toHaveTextContent('▶')
  })
})

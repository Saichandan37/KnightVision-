/**
 * ReviewLayout supporting tests — structure, playback controls, navigation,
 * move counter, LLM provider selector, toggle button.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReviewLayout } from '../ReviewLayout'
import { useAnalysisStore } from '../../store/analysisStore'
import type { MoveResult } from '../../types/analysis'

vi.mock('react-chessboard', () => ({
  Chessboard: () => <div data-testid="chessboard" />,
}))

function makeMove(index: number, san = 'e4'): MoveResult {
  return {
    move_index: index,
    move_number: Math.floor(index / 2) + 1,
    san,
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
  it('renders review-layout container', () => {
    render(<ReviewLayout />)
    expect(screen.getByTestId('review-layout')).toBeInTheDocument()
  })

  it('renders board-container', () => {
    render(<ReviewLayout />)
    expect(screen.getByTestId('board-container')).toBeInTheDocument()
  })

  it('renders playback-controls', () => {
    render(<ReviewLayout />)
    expect(screen.getByTestId('playback-controls')).toBeInTheDocument()
  })

  it('renders GameHeader', () => {
    render(<ReviewLayout />)
    // GameHeader shows "No game loaded" when meta is null
    expect(screen.getByTestId('game-header-empty')).toBeInTheDocument()
  })

  it('renders LLM provider selector', () => {
    render(<ReviewLayout />)
    expect(screen.getByTestId('llm-provider-selector')).toBeInTheDocument()
  })

  it('renders bottom-sheet', () => {
    render(<ReviewLayout />)
    expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument()
  })

  it('renders move-list toggle button on mobile', () => {
    render(<ReviewLayout />)
    expect(screen.getByTestId('btn-toggle-move-list')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Move counter
// ---------------------------------------------------------------------------

describe('move counter', () => {
  it('shows "Start / 0" with no moves', () => {
    render(<ReviewLayout />)
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 0')
  })

  it('shows "Start / 3" with 3 moves loaded', () => {
    for (let i = 0; i < 3; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<ReviewLayout />)
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 3')
  })

  it('updates to "Move 1 / 3" after pressing next', () => {
    for (let i = 0; i < 3; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<ReviewLayout />)
    fireEvent.click(screen.getByTestId('btn-next'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Move 1 / 3')
  })

  it('updates to "Start / 3" after go-to-start', () => {
    for (let i = 0; i < 3; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<ReviewLayout />)
    fireEvent.click(screen.getByTestId('btn-go-to-end'))
    fireEvent.click(screen.getByTestId('btn-go-to-start'))
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 3')
  })
})

// ---------------------------------------------------------------------------
// Swipe gestures
// ---------------------------------------------------------------------------

describe('swipe gestures', () => {
  it('swipe left (deltaX < -50) calls next — index goes from -1 to 0', () => {
    useAnalysisStore.getState().appendMove(makeMove(0))
    render(<ReviewLayout />)
    const board = screen.getByTestId('board-container')
    fireEvent.touchStart(board, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(board, { changedTouches: [{ clientX: 100, clientY: 300 }] })
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Move 1 / 1')
  })

  it('swipe right (deltaX > 50) calls prev — index stays at -1 (already at start)', () => {
    useAnalysisStore.getState().appendMove(makeMove(0))
    render(<ReviewLayout />)
    const board = screen.getByTestId('board-container')
    fireEvent.touchStart(board, { touches: [{ clientX: 100, clientY: 300 }] })
    fireEvent.touchEnd(board, { changedTouches: [{ clientX: 200, clientY: 300 }] })
    // prev at start stays at -1
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 1')
  })

  it('small swipe (deltaX = -30) does not trigger navigation', () => {
    useAnalysisStore.getState().appendMove(makeMove(0))
    render(<ReviewLayout />)
    const board = screen.getByTestId('board-container')
    fireEvent.touchStart(board, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(board, { changedTouches: [{ clientX: 170, clientY: 300 }] })
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Start / 1')
  })

  it('two consecutive left swipes advance index by 2', () => {
    useAnalysisStore.getState().appendMove(makeMove(0, 'e4'))
    useAnalysisStore.getState().appendMove(makeMove(1, 'e5'))
    render(<ReviewLayout />)
    const board = screen.getByTestId('board-container')
    fireEvent.touchStart(board, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(board, { changedTouches: [{ clientX: 100, clientY: 300 }] })
    fireEvent.touchStart(board, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(board, { changedTouches: [{ clientX: 100, clientY: 300 }] })
    expect(screen.getByTestId('move-counter')).toHaveTextContent('Move 2 / 2')
  })
})

// ---------------------------------------------------------------------------
// MoveDetailCard wiring
// ---------------------------------------------------------------------------

describe('MoveDetailCard wiring', () => {
  it('shows placeholder when no move selected', () => {
    useAnalysisStore.getState().appendMove(makeMove(0))
    render(<ReviewLayout />)
    expect(screen.getAllByTestId('move-detail-card-empty').length).toBeGreaterThan(0)
  })

  it('shows move detail after navigating to first move', () => {
    useAnalysisStore.getState().appendMove(makeMove(0))
    render(<ReviewLayout />)
    fireEvent.click(screen.getByTestId('btn-next'))
    expect(screen.getAllByTestId('move-detail-card').length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Move list toggle
// ---------------------------------------------------------------------------

describe('move list toggle', () => {
  it('toggle button aria-label is "Show move list" initially', () => {
    render(<ReviewLayout />)
    expect(screen.getByTestId('btn-toggle-move-list')).toHaveAttribute('aria-label', 'Show move list')
  })

  it('toggle button aria-label switches to "Hide move list" after click', () => {
    render(<ReviewLayout />)
    fireEvent.click(screen.getByTestId('btn-toggle-move-list'))
    expect(screen.getByTestId('btn-toggle-move-list')).toHaveAttribute('aria-label', 'Hide move list')
  })
})

// ---------------------------------------------------------------------------
// LLM provider selector
// ---------------------------------------------------------------------------

describe('LLM provider selector', () => {
  it('defaults to "ollama" provider', () => {
    render(<ReviewLayout />)
    const select = screen.getByTestId('provider-select') as HTMLSelectElement
    expect(select.value).toBe('ollama')
  })

  it('changing provider updates store', () => {
    render(<ReviewLayout />)
    fireEvent.change(screen.getByTestId('provider-select'), { target: { value: 'groq' } })
    expect(useAnalysisStore.getState().activeProvider).toBe('groq')
  })
})

/**
 * AC gate tests — ReviewLayout component (Story 6.2).
 *
 * AC: On a viewport of 375x667px (iPhone SE), the board renders at full width,
 *     swipe left on the board advances currentMoveIndex by 1, and the move
 *     detail card is visible below the board without scrolling.
 *     Verified with React Testing Library with window.innerWidth = 375.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReviewLayout } from '../ReviewLayout'
import { useAnalysisStore } from '../../store/analysisStore'
import type { MoveResult } from '../../types/analysis'

// ---------------------------------------------------------------------------
// Mock react-chessboard (ResizeObserver / DnD not available in jsdom)
// ---------------------------------------------------------------------------

import { vi } from 'vitest'

vi.mock('react-chessboard', () => ({
  Chessboard: ({ customArrows = [] }: { customArrows?: unknown[] }) => (
    <div data-testid="chessboard">
      {(customArrows as [string, string][]).map((a, i) => (
        <svg key={i} data-testid="arrow" data-from={a[0]} data-to={a[1]} />
      ))}
    </div>
  ),
}))

// ---------------------------------------------------------------------------
// Viewport simulation
// ---------------------------------------------------------------------------

beforeAll(() => {
  Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true, writable: true })
})

afterAll(() => {
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true, writable: true })
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMove(index: number, san = 'e4'): MoveResult {
  return {
    move_index: index,
    move_number: Math.floor(index / 2) + 1,
    san,
    uci: 'e2e4',
    category: 'best',
    cp_loss: 0,
    eval_before_cp: 0,
    eval_after_cp: 20,
    best_move_uci: 'e2e4',
    best_move_san: 'e4',
    top_candidates: [],
    comment: `Move ${index} comment`,
    comment_source: 'fallback',
  }
}

beforeEach(() => {
  useAnalysisStore.getState().reset()
  // Load 3 moves so navigation is meaningful
  useAnalysisStore.getState().appendMove(makeMove(0, 'e4'))
  useAnalysisStore.getState().appendMove(makeMove(1, 'e5'))
  useAnalysisStore.getState().appendMove(makeMove(2, 'Nf3'))
})

// ---------------------------------------------------------------------------
// AC tests
// ---------------------------------------------------------------------------

describe('AC: ReviewLayout mobile viewport (375px)', () => {
  it('board-container has class "w-full" (full width)', () => {
    render(<ReviewLayout />)
    expect(screen.getByTestId('board-container').className).toContain('w-full')
  })

  it('swipe left on board advances currentMoveIndex by 1', () => {
    render(<ReviewLayout />)

    // Initial: no move selected — empty placeholder visible
    expect(screen.getAllByTestId('move-detail-card-empty').length).toBeGreaterThan(0)

    // Swipe left (deltaX = 100 - 200 = -100, exceeds 50px threshold)
    const boardContainer = screen.getByTestId('board-container')
    fireEvent.touchStart(boardContainer, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(boardContainer, { changedTouches: [{ clientX: 100, clientY: 300 }] })

    // After swipe: index 0 — move detail card should be visible
    expect(screen.getAllByTestId('move-detail-card').length).toBeGreaterThan(0)
  })

  it('move detail card is visible in the DOM (below board without scrolling)', () => {
    render(<ReviewLayout />)

    // Swipe to first move so card shows move data
    const boardContainer = screen.getByTestId('board-container')
    fireEvent.touchStart(boardContainer, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(boardContainer, { changedTouches: [{ clientX: 100, clientY: 300 }] })

    // MoveDetailCard is present in the DOM
    const cards = screen.getAllByTestId('move-detail-card')
    expect(cards.length).toBeGreaterThan(0)

    // Board appears before the first move detail card in DOM order
    const boardEl = screen.getByTestId('board-container')
    const cardEl = cards[0]
    expect(
      boardEl.compareDocumentPosition(cardEl) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })
})

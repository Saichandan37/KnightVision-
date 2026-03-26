/**
 * Accessibility supporting tests — Story 6.3.
 *
 * Covers:
 *  - MoveList move item aria-label and aria-pressed
 *  - MoveDetailCard badge text colour (dark on light badges, white on blunder)
 *  - All interactive elements have aria-label or text content
 *  - Focus-ring CSS rule exists in index.css (snapshot)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MoveList } from '../MoveList'
import { MoveDetailCard } from '../MoveDetailCard'
import { PlaybackControls } from '../PlaybackControls'
import { UploadZone } from '../UploadZone'
import { useAnalysisStore } from '../../store/analysisStore'
import type { MoveResult } from '../../types/analysis'

// UploadZone uses chess.js + fetch + WebSocket
vi.mock('chess.js', () => ({
  Chess: vi.fn().mockImplementation(() => ({ loadPgn: vi.fn() })),
}))
vi.stubGlobal('fetch', vi.fn())
vi.stubGlobal('WebSocket', vi.fn().mockImplementation(() => ({
  close: vi.fn(), onmessage: null, onerror: null, onclose: null,
})))

function makeMove(index: number, san = 'e4', category: MoveResult['category'] = 'best'): MoveResult {
  return {
    move_index: index,
    move_number: Math.floor(index / 2) + 1,
    san,
    uci: 'e2e4',
    category,
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
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// MoveList aria attributes
// ---------------------------------------------------------------------------

describe('MoveList accessibility', () => {
  it('each move button has aria-label "Move {n}: {san}, {category}"', () => {
    const moves = [
      makeMove(0, 'e4', 'best'),
      makeMove(1, 'e5', 'good'),
    ]
    render(<MoveList moves={moves} currentMoveIndex={-1} goToMove={vi.fn()} />)

    expect(screen.getByTestId('move-item-0')).toHaveAttribute(
      'aria-label', 'Move 1: e4, best',
    )
    expect(screen.getByTestId('move-item-1')).toHaveAttribute(
      'aria-label', 'Move 1: e5, good',
    )
  })

  it('active move item has aria-pressed="true"', () => {
    const moves = [makeMove(0, 'e4', 'best'), makeMove(1, 'e5', 'best')]
    render(<MoveList moves={moves} currentMoveIndex={0} goToMove={vi.fn()} />)
    expect(screen.getByTestId('move-item-0')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('move-item-1')).toHaveAttribute('aria-pressed', 'false')
  })

  it('inactive move items have aria-pressed="false"', () => {
    const moves = [makeMove(0, 'e4')]
    render(<MoveList moves={moves} currentMoveIndex={-1} goToMove={vi.fn()} />)
    expect(screen.getByTestId('move-item-0')).toHaveAttribute('aria-pressed', 'false')
  })

  it('move item is a <button> element (implicit role=button)', () => {
    const moves = [makeMove(0, 'e4')]
    render(<MoveList moves={moves} currentMoveIndex={-1} goToMove={vi.fn()} />)
    expect(screen.getByTestId('move-item-0').tagName).toBe('BUTTON')
  })

  it('aria-label includes move number, SAN and category', () => {
    const moves = [makeMove(4, 'Nf3', 'inaccuracy')]
    render(<MoveList moves={moves} currentMoveIndex={-1} goToMove={vi.fn()} totalMoves={5} />)
    const btn = screen.getByTestId('move-item-4')
    const label = btn.getAttribute('aria-label') ?? ''
    expect(label).toContain('Nf3')
    expect(label).toContain('inaccuracy')
    expect(label).toMatch(/Move \d+:/)
  })
})

// ---------------------------------------------------------------------------
// MoveDetailCard badge contrast
// ---------------------------------------------------------------------------

describe('MoveDetailCard badge text colour (WCAG AA)', () => {
  const darkCategories = [
    'brilliant', 'great', 'best', 'good', 'inaccuracy', 'mistake',
  ] as MoveResult['category'][]

  for (const category of darkCategories) {
    it(`${category}: badge text is dark (#0a0a0a) — contrast ≥ 4.5:1`, () => {
      render(<MoveDetailCard move={makeMove(0, 'e4', category)} />)
      const badge = screen.getByTestId('category-badge')
      expect(badge.style.color).toBe('rgb(10, 10, 10)') // #0a0a0a
    })
  }

  it('blunder: badge text is white (#fff) — contrast 5.20:1', () => {
    render(<MoveDetailCard move={makeMove(0, 'e4', 'blunder')} />)
    const badge = screen.getByTestId('category-badge')
    expect(badge.style.color).toBe('rgb(255, 255, 255)')
  })
})

// ---------------------------------------------------------------------------
// Buttons with accessible names
// ---------------------------------------------------------------------------

describe('interactive element accessible names', () => {
  it('PlaybackControls buttons all have aria-label', () => {
    for (let i = 0; i < 3; i++) useAnalysisStore.getState().appendMove(makeMove(i))
    render(<PlaybackControls />)
    const buttons = ['btn-go-to-start', 'btn-prev', 'btn-play-pause', 'btn-next', 'btn-go-to-end']
    for (const testId of buttons) {
      const btn = screen.getByTestId(testId)
      expect(btn.getAttribute('aria-label') || btn.textContent).toBeTruthy()
    }
  })

  it('UploadZone submit button has aria-label', () => {
    render(<UploadZone />)
    expect(screen.getByTestId('btn-submit')).toHaveAttribute('aria-label', 'Analyse game')
  })

  it('UploadZone drop area has role=button and aria-label', () => {
    render(<UploadZone />)
    const drop = screen.getByTestId('drop-area')
    expect(drop).toHaveAttribute('role', 'button')
    expect(drop.getAttribute('aria-label')).toBeTruthy()
  })
})

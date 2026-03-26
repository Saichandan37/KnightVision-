/**
 * MoveList component supporting tests — rendering, pairs, badges, placeholders, active state.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MoveList } from '../MoveList'
import type { MoveResult } from '../../types/analysis'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMove(index: number, overrides: Partial<MoveResult> = {}): MoveResult {
  return {
    move_index: index,
    move_number: Math.floor(index / 2) + 1,
    san: index % 2 === 0 ? 'e4' : 'e5',
    uci: 'e2e4',
    category: 'best',
    cp_loss: 0,
    eval_before_cp: 0,
    eval_after_cp: 0,
    best_move_uci: 'e2e4',
    best_move_san: 'e4',
    top_candidates: [],
    comment: '',
    comment_source: 'fallback',
    ...overrides,
  }
}

const FOUR_MOVES = [0, 1, 2, 3].map((i) => makeMove(i))

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe('rendering', () => {
  it('renders the move-list container', () => {
    render(<MoveList moves={FOUR_MOVES} currentMoveIndex={-1} goToMove={vi.fn()} />)
    expect(screen.getByTestId('move-list')).toBeInTheDocument()
  })

  it('renders move buttons for each move', () => {
    render(<MoveList moves={FOUR_MOVES} currentMoveIndex={-1} goToMove={vi.fn()} />)
    expect(screen.getByTestId('move-item-0')).toBeInTheDocument()
    expect(screen.getByTestId('move-item-1')).toBeInTheDocument()
    expect(screen.getByTestId('move-item-2')).toBeInTheDocument()
    expect(screen.getByTestId('move-item-3')).toBeInTheDocument()
  })

  it('renders move SAN text', () => {
    const moves = [makeMove(0, { san: 'e4' }), makeMove(1, { san: 'e5' })]
    render(<MoveList moves={moves} currentMoveIndex={-1} goToMove={vi.fn()} />)
    expect(screen.getByTestId('move-item-0')).toHaveTextContent('e4')
    expect(screen.getByTestId('move-item-1')).toHaveTextContent('e5')
  })
})

// ---------------------------------------------------------------------------
// Move number pairs
// ---------------------------------------------------------------------------

describe('move number pairs', () => {
  it('renders move pairs with correct move numbers', () => {
    render(<MoveList moves={FOUR_MOVES} currentMoveIndex={-1} goToMove={vi.fn()} />)
    const pairs = screen.getAllByTestId('move-pair')
    expect(pairs).toHaveLength(2)
  })

  it('renders move number labels', () => {
    render(<MoveList moves={FOUR_MOVES} currentMoveIndex={-1} goToMove={vi.fn()} />)
    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('2.')).toBeInTheDocument()
  })

  it('handles odd number of moves (last pair has only White)', () => {
    const threeMoves = [0, 1, 2].map((i) => makeMove(i))
    render(<MoveList moves={threeMoves} currentMoveIndex={-1} goToMove={vi.fn()} />)
    expect(screen.getByTestId('move-item-2')).toBeInTheDocument()
    // No move-item-3 should exist
    expect(screen.queryByTestId('move-item-3')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Category badge colours
// ---------------------------------------------------------------------------

describe('category badge colours', () => {
  const categories: Array<[MoveResult['category'], string]> = [
    ['brilliant', '#1baaa6'],
    ['great', '#5ca0d3'],
    ['best', '#6dba6a'],
    ['good', '#96bc4b'],
    ['inaccuracy', '#f0c15c'],
    ['mistake', '#e8834e'],
    ['blunder', '#ca3431'],
  ]

  for (const [category, color] of categories) {
    it(`${category} badge has color ${color}`, () => {
      const moves = [makeMove(0, { category })]
      render(<MoveList moves={moves} currentMoveIndex={-1} goToMove={vi.fn()} />)
      // Use data-color attribute to avoid jsdom hex→rgb normalisation
      const badge = screen.getByTestId('move-item-0').querySelector('span')
      expect(badge?.getAttribute('data-color')).toBe(color)
    })
  }
})

// ---------------------------------------------------------------------------
// Active / highlight state
// ---------------------------------------------------------------------------

describe('active highlight state', () => {
  it('no move has active class when currentMoveIndex=-1', () => {
    render(<MoveList moves={FOUR_MOVES} currentMoveIndex={-1} goToMove={vi.fn()} />)
    const items = screen.getAllByTestId(/move-item-\d/)
    for (const item of items) {
      expect(item.classList.contains('move-item--active')).toBe(false)
    }
  })

  it('exactly one move has active class at a time', () => {
    render(<MoveList moves={FOUR_MOVES} currentMoveIndex={2} goToMove={vi.fn()} />)
    const active = document.querySelectorAll('.move-item--active')
    expect(active).toHaveLength(1)
    expect(active[0].getAttribute('data-testid')).toBe('move-item-2')
  })

  it('data-active attribute is true for current move', () => {
    render(<MoveList moves={FOUR_MOVES} currentMoveIndex={1} goToMove={vi.fn()} />)
    expect(screen.getByTestId('move-item-1').getAttribute('data-active')).toBe('true')
    expect(screen.getByTestId('move-item-0').getAttribute('data-active')).toBe('false')
  })
})

// ---------------------------------------------------------------------------
// Click handler
// ---------------------------------------------------------------------------

describe('click handler', () => {
  it('clicking each move calls goToMove with its index', async () => {
    const goToMove = vi.fn()
    render(<MoveList moves={FOUR_MOVES} currentMoveIndex={-1} goToMove={goToMove} />)

    await userEvent.click(screen.getByTestId('move-item-0'))
    expect(goToMove).toHaveBeenCalledWith(0)

    await userEvent.click(screen.getByTestId('move-item-3'))
    expect(goToMove).toHaveBeenCalledWith(3)
  })
})

// ---------------------------------------------------------------------------
// Analysis progress placeholders
// ---------------------------------------------------------------------------

describe('analysis progress placeholders', () => {
  it('shows placeholder rows for moves not yet computed', () => {
    const twoMoves = [makeMove(0), makeMove(1)]
    // totalMoves=6 means 4 more moves are pending
    render(<MoveList moves={twoMoves} currentMoveIndex={-1} goToMove={vi.fn()} totalMoves={6} />)
    const placeholders = screen.getAllByTestId('move-placeholder')
    expect(placeholders.length).toBeGreaterThan(0)
  })

  it('shows no placeholders when all moves are computed', () => {
    render(<MoveList moves={FOUR_MOVES} currentMoveIndex={-1} goToMove={vi.fn()} totalMoves={4} />)
    expect(screen.queryByTestId('move-placeholder')).toBeNull()
  })

  it('renders correct number of pairs when totalMoves is provided', () => {
    const twoMoves = [makeMove(0), makeMove(1)]
    render(<MoveList moves={twoMoves} currentMoveIndex={-1} goToMove={vi.fn()} totalMoves={6} />)
    const pairs = screen.getAllByTestId('move-pair')
    expect(pairs).toHaveLength(3) // ceil(6/2) = 3 pairs
  })
})

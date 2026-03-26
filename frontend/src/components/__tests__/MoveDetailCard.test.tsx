/**
 * MoveDetailCard supporting tests — placeholder, all categories, eval display,
 * cp_loss, comment source tag, top candidates.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MoveDetailCard } from '../MoveDetailCard'
import type { MoveResult } from '../../types/analysis'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMove(overrides: Partial<MoveResult> = {}): MoveResult {
  return {
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
    comment: 'The engine top choice.',
    comment_source: 'fallback',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Placeholder (no move selected)
// ---------------------------------------------------------------------------

describe('placeholder when no move selected', () => {
  it('shows placeholder text when move=null', () => {
    render(<MoveDetailCard move={null} />)
    expect(screen.getByTestId('move-detail-card-empty')).toHaveTextContent(
      'Select a move to see analysis',
    )
  })

  it('does not render move-detail-card when move=null', () => {
    render(<MoveDetailCard move={null} />)
    expect(screen.queryByTestId('move-detail-card')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Category badges
// ---------------------------------------------------------------------------

describe('category badge labels and colours', () => {
  const cases: Array<[MoveResult['category'], string, string]> = [
    ['brilliant', 'Brilliant', '#1baaa6'],
    ['great', 'Great', '#5ca0d3'],
    ['best', 'Best', '#6dba6a'],
    ['good', 'Good', '#96bc4b'],
    ['inaccuracy', 'Inaccuracy', '#f0c15c'],
    ['mistake', 'Mistake', '#e8834e'],
    ['blunder', 'Blunder', '#ca3431'],
  ]

  for (const [category, label, color] of cases) {
    it(`${category}: badge label is "${label}" and color is ${color}`, () => {
      render(<MoveDetailCard move={makeMove({ category })} />)
      expect(screen.getByTestId('badge-label')).toHaveTextContent(label)
      expect(screen.getByTestId('category-badge').getAttribute('data-color')).toBe(color)
    })
  }
})

// ---------------------------------------------------------------------------
// Eval display
// ---------------------------------------------------------------------------

describe('eval display', () => {
  it('shows eval before → after in pawns', () => {
    const move = makeMove({ eval_before_cp: 25, eval_after_cp: -95 })
    render(<MoveDetailCard move={move} />)
    const evalEl = screen.getByTestId('eval-display')
    expect(evalEl).toHaveTextContent('+0.3')
    expect(evalEl).toHaveTextContent('-0.9')
  })

  it('shows cp_loss when cp_loss > 0', () => {
    render(<MoveDetailCard move={makeMove({ cp_loss: 150 })} />)
    expect(screen.getByTestId('cp-loss')).toHaveTextContent('150')
  })

  it('does not render cp_loss element when cp_loss=0', () => {
    render(<MoveDetailCard move={makeMove({ cp_loss: 0 })} />)
    expect(screen.queryByTestId('cp-loss')).toBeNull()
  })

  it('formats negative eval with minus sign', () => {
    render(<MoveDetailCard move={makeMove({ eval_before_cp: -200 })} />)
    expect(screen.getByTestId('eval-display')).toHaveTextContent('-2.0')
  })
})

// ---------------------------------------------------------------------------
// Comment
// ---------------------------------------------------------------------------

describe('comment', () => {
  it('renders the comment text', () => {
    const comment = 'A brilliant sacrifice reveals a forced checkmate.'
    render(<MoveDetailCard move={makeMove({ comment })} />)
    expect(screen.getByTestId('comment')).toHaveTextContent(comment)
  })

  it('comment element is present in the rendered output', () => {
    render(<MoveDetailCard move={makeMove()} />)
    expect(screen.getByTestId('comment')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Comment source tag
// ---------------------------------------------------------------------------

describe('comment source tag', () => {
  it('shows "AI" tag when comment_source="llm"', () => {
    render(<MoveDetailCard move={makeMove({ comment_source: 'llm' })} />)
    expect(screen.getByTestId('comment-source')).toHaveTextContent('AI')
  })

  it('shows "Template" tag when comment_source="fallback"', () => {
    render(<MoveDetailCard move={makeMove({ comment_source: 'fallback' })} />)
    expect(screen.getByTestId('comment-source')).toHaveTextContent('Template')
  })
})

// ---------------------------------------------------------------------------
// Top candidate moves
// ---------------------------------------------------------------------------

describe('top candidate moves', () => {
  it('renders up to 3 candidates', () => {
    const move = makeMove({
      top_candidates: [
        { san: 'e4', uci: 'e2e4', centipawns: 30 },
        { san: 'Nf3', uci: 'g1f3', centipawns: 20 },
        { san: 'd4', uci: 'd2d4', centipawns: 15 },
        { san: 'c4', uci: 'c2c4', centipawns: 10 }, // 4th — should be truncated
      ],
    })
    render(<MoveDetailCard move={move} />)
    expect(screen.getAllByTestId(/candidate-\d/)).toHaveLength(3)
  })

  it('renders candidate SAN and centipawn value', () => {
    const move = makeMove({
      top_candidates: [{ san: 'Nf3', uci: 'g1f3', centipawns: 25 }],
    })
    render(<MoveDetailCard move={move} />)
    expect(screen.getByTestId('candidate-san-0')).toHaveTextContent('Nf3')
    expect(screen.getByTestId('candidate-cp-0')).toHaveTextContent('+0.3')
  })

  it('does not render top-candidates section when list is empty', () => {
    render(<MoveDetailCard move={makeMove({ top_candidates: [] })} />)
    expect(screen.queryByTestId('top-candidates')).toBeNull()
  })

  it('shows negative centipawn with minus sign', () => {
    const move = makeMove({
      top_candidates: [{ san: 'Ke2', uci: 'e1e2', centipawns: -50 }],
    })
    render(<MoveDetailCard move={move} />)
    expect(screen.getByTestId('candidate-cp-0')).toHaveTextContent('-0.5')
  })
})

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe('structure', () => {
  it('renders move-detail-card container when move is provided', () => {
    render(<MoveDetailCard move={makeMove()} />)
    expect(screen.getByTestId('move-detail-card')).toBeInTheDocument()
  })
})

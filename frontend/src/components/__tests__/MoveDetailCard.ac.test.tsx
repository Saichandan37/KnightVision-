/**
 * AC gate tests — MoveDetailCard component (Story 5.7).
 *
 * AC: Rendering <MoveDetailCard move={blunderMove} /> where blunderMove.category="blunder"
 *     displays a red badge with text "Blunder" and renders blunderMove.comment as
 *     visible text content.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MoveDetailCard } from '../MoveDetailCard'
import type { MoveResult } from '../../types/analysis'

const BLUNDER_MOVE: MoveResult = {
  move_index: 14,
  move_number: 8,
  san: 'Qxf7',
  uci: 'd1f7',
  category: 'blunder',
  cp_loss: 320,
  eval_before_cp: 25,
  eval_after_cp: -295,
  best_move_uci: 'e4e5',
  best_move_san: 'e5',
  top_candidates: [],
  comment: 'A serious blunder! Qxf7 drops the queen to the fork on e5.',
  comment_source: 'fallback',
}

describe('AC: MoveDetailCard blunder rendering', () => {
  it('displays a badge with text "Blunder"', () => {
    render(<MoveDetailCard move={BLUNDER_MOVE} />)
    expect(screen.getByTestId('badge-label')).toHaveTextContent('Blunder')
  })

  it('badge has red colour (#ca3431) via data-color attribute', () => {
    render(<MoveDetailCard move={BLUNDER_MOVE} />)
    expect(screen.getByTestId('category-badge').getAttribute('data-color')).toBe('#ca3431')
  })

  it('renders blunderMove.comment as visible text', () => {
    render(<MoveDetailCard move={BLUNDER_MOVE} />)
    expect(screen.getByTestId('comment')).toHaveTextContent(BLUNDER_MOVE.comment)
  })
})

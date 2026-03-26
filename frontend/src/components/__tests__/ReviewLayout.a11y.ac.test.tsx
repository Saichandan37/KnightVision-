/**
 * AC gate tests — WCAG AA Accessibility (Story 6.3).
 *
 * AC: Running axe(document.body) on the fully-rendered review layout returns
 *     zero violations with impact "critical" or "serious".
 *
 * Note: color-contrast is disabled in the axe config because jsdom does not
 * apply CSS files (Tailwind classes have no computed styles). Badge and text
 * contrast ratios are manually verified and documented in the story file.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import axe from 'axe-core'
import { ReviewLayout } from '../ReviewLayout'
import { useAnalysisStore } from '../../store/analysisStore'
import type { MoveResult } from '../../types/analysis'
import { vi } from 'vitest'

vi.mock('react-chessboard', () => ({
  // role="img" is required for aria-label to be valid on a non-semantic element
  Chessboard: () => <div data-testid="chessboard" role="img" aria-label="Chess board" />,
}))

function makeMove(index: number, san = 'e4'): MoveResult {
  return {
    move_index: index,
    move_number: Math.floor(index / 2) + 1,
    san,
    uci: 'e2e4',
    category: index % 7 === 0 ? 'blunder' : index % 3 === 0 ? 'inaccuracy' : 'best',
    cp_loss: index % 3 === 0 ? 80 : 0,
    eval_before_cp: 10,
    eval_after_cp: 30,
    best_move_uci: 'e2e4',
    best_move_san: 'e4',
    top_candidates: [],
    comment: `Analysis for move ${index}.`,
    comment_source: index % 2 === 0 ? 'llm' : 'fallback',
  }
}

beforeEach(() => {
  useAnalysisStore.getState().reset()
  const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']
  moves.forEach((san, i) => useAnalysisStore.getState().appendMove(makeMove(i, san)))
  useAnalysisStore.getState().setStatus('complete')
})

describe('AC: axe zero critical/serious violations', () => {
  it('fully-rendered ReviewLayout has no critical or serious axe violations', async () => {
    render(<ReviewLayout />)

    const results = await axe.run(document.body, {
      rules: {
        // jsdom does not apply CSS files; Tailwind-based colors are not computed.
        // Badge and text contrast ratios are manually verified in story notes.
        'color-contrast': { enabled: false },
      },
    })

    const criticalOrSerious = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )

    if (criticalOrSerious.length > 0) {
      const summary = criticalOrSerious
        .map((v) => `[${v.impact}] ${v.id}: ${v.description}`)
        .join('\n')
      throw new Error(`axe found ${criticalOrSerious.length} critical/serious violation(s):\n${summary}`)
    }

    expect(criticalOrSerious).toHaveLength(0)
  })
})

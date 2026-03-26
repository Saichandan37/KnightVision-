/**
 * AC gate tests — Board component (Story 5.4).
 *
 * AC: Rendering <Board fen={startFen} bestMoveUci="e2e4" showArrow={true} /> produces
 *     a <svg> arrow element; rendering with showArrow={false} produces no arrow element.
 *
 * react-chessboard is mocked to surface the customArrows prop as <svg> elements so the
 * test focuses on Board's arrow logic rather than the library's internal rendering.
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Board } from '../Board'

// ---------------------------------------------------------------------------
// Mock react-chessboard: renders one <svg data-testid="arrow"> per arrow entry
// ---------------------------------------------------------------------------

vi.mock('react-chessboard', () => ({
  Chessboard: ({ customArrows }: { customArrows?: [string, string, string?][] }) => (
    <div data-testid="chessboard">
      {customArrows?.map((arrow, i) => (
        <svg key={i} data-testid="arrow" aria-label={`arrow-${arrow[0]}-${arrow[1]}`}>
          <line x1={arrow[0]} x2={arrow[1]} stroke={arrow[2] ?? 'default'} />
        </svg>
      ))}
    </div>
  ),
}))

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

// ---------------------------------------------------------------------------
// AC gate
// ---------------------------------------------------------------------------

describe('AC: Board arrow rendering', () => {
  it('renders an <svg> arrow element when showArrow=true and bestMoveUci is set', () => {
    const { container } = render(
      <Board fen={START_FEN} bestMoveUci="e2e4" showArrow={true} />,
    )
    expect(container.querySelector('svg[data-testid="arrow"]')).not.toBeNull()
  })

  it('renders no arrow element when showArrow=false', () => {
    const { container } = render(
      <Board fen={START_FEN} bestMoveUci="e2e4" showArrow={false} />,
    )
    expect(container.querySelector('svg[data-testid="arrow"]')).toBeNull()
  })
})

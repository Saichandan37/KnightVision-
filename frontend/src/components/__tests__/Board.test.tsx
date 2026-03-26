/**
 * Board component supporting tests — arrow logic, prop forwarding, read-only constraints.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Board } from '../Board'

// ---------------------------------------------------------------------------
// Mock react-chessboard: captures all props for assertion
// ---------------------------------------------------------------------------

const chessboardProps: Record<string, unknown> = {}

vi.mock('react-chessboard', () => ({
  Chessboard: (props: Record<string, unknown>) => {
    Object.assign(chessboardProps, props)
    const arrows = (props.customArrows ?? []) as [string, string, string?][]
    return (
      <div data-testid="chessboard" data-fen={props.position as string}>
        {arrows.map((arrow, i) => (
          <svg
            key={i}
            data-testid="arrow"
            data-from={arrow[0]}
            data-to={arrow[1]}
            data-color={arrow[2]}
          >
            <line x1={arrow[0]} x2={arrow[1]} />
          </svg>
        ))}
      </div>
    )
  },
}))

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const AFTER_E4_FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'

// ---------------------------------------------------------------------------
// Arrow visibility
// ---------------------------------------------------------------------------

describe('arrow visibility', () => {
  it('shows arrow from e2 to e4 when showArrow=true and bestMoveUci="e2e4"', () => {
    const { container } = render(
      <Board fen={START_FEN} bestMoveUci="e2e4" showArrow={true} />,
    )
    const arrow = container.querySelector('svg[data-testid="arrow"]')
    expect(arrow).not.toBeNull()
    expect(arrow?.getAttribute('data-from')).toBe('e2')
    expect(arrow?.getAttribute('data-to')).toBe('e4')
  })

  it('arrow color is rgba(0, 128, 0, 0.65)', () => {
    const { container } = render(
      <Board fen={START_FEN} bestMoveUci="e2e4" showArrow={true} />,
    )
    const arrow = container.querySelector('svg[data-testid="arrow"]')
    expect(arrow?.getAttribute('data-color')).toBe('rgba(0, 128, 0, 0.65)')
  })

  it('hides arrow when showArrow=false even if bestMoveUci is set', () => {
    const { container } = render(
      <Board fen={START_FEN} bestMoveUci="e2e4" showArrow={false} />,
    )
    expect(container.querySelector('svg[data-testid="arrow"]')).toBeNull()
  })

  it('hides arrow when bestMoveUci is null', () => {
    const { container } = render(
      <Board fen={START_FEN} bestMoveUci={null} showArrow={true} />,
    )
    expect(container.querySelector('svg[data-testid="arrow"]')).toBeNull()
  })

  it('hides arrow when isPlaying=true (auto-play mode suppresses arrow)', () => {
    const { container } = render(
      <Board fen={START_FEN} bestMoveUci="e2e4" showArrow={true} isPlaying={true} />,
    )
    expect(container.querySelector('svg[data-testid="arrow"]')).toBeNull()
  })

  it('shows arrow when isPlaying=false (default)', () => {
    const { container } = render(
      <Board fen={START_FEN} bestMoveUci="d1h5" showArrow={true} isPlaying={false} />,
    )
    expect(container.querySelector('svg[data-testid="arrow"]')).not.toBeNull()
  })

  it('shows only one arrow at a time', () => {
    const { container } = render(
      <Board fen={START_FEN} bestMoveUci="e2e4" showArrow={true} />,
    )
    expect(container.querySelectorAll('svg[data-testid="arrow"]')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// FEN forwarding
// ---------------------------------------------------------------------------

describe('FEN forwarding', () => {
  it('passes fen to Chessboard as position prop', () => {
    render(<Board fen={AFTER_E4_FEN} bestMoveUci={null} showArrow={false} />)
    expect(screen.getByTestId('chessboard').getAttribute('data-fen')).toBe(AFTER_E4_FEN)
  })
})

// ---------------------------------------------------------------------------
// Read-only board
// ---------------------------------------------------------------------------

describe('read-only board', () => {
  it('passes arePiecesDraggable=false to Chessboard', () => {
    render(<Board fen={START_FEN} bestMoveUci={null} showArrow={false} />)
    expect(chessboardProps.arePiecesDraggable).toBe(false)
  })

  it('passes boardOrientation="white"', () => {
    render(<Board fen={START_FEN} bestMoveUci={null} showArrow={false} />)
    expect(chessboardProps.boardOrientation).toBe('white')
  })
})

// ---------------------------------------------------------------------------
// onSquareClick callback
// ---------------------------------------------------------------------------

describe('onSquareClick', () => {
  it('does not pass onSquareClick to Chessboard when prop is undefined', () => {
    render(<Board fen={START_FEN} bestMoveUci={null} showArrow={false} />)
    expect(chessboardProps.onSquareClick).toBeUndefined()
  })

  it('passes onSquareClick wrapper when prop is provided', () => {
    const handler = vi.fn()
    render(<Board fen={START_FEN} bestMoveUci={null} showArrow={false} onSquareClick={handler} />)
    expect(typeof chessboardProps.onSquareClick).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// Swipe gestures
// ---------------------------------------------------------------------------

describe('swipe gestures', () => {
  it('swipe left (deltaX < -50) calls onSwipeLeft', () => {
    const onSwipeLeft = vi.fn()
    render(<Board fen={START_FEN} bestMoveUci={null} showArrow={false} onSwipeLeft={onSwipeLeft} />)
    const container = screen.getByTestId('board-container')
    fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100, clientY: 300 }] })
    expect(onSwipeLeft).toHaveBeenCalledTimes(1)
  })

  it('swipe right (deltaX > 50) calls onSwipeRight', () => {
    const onSwipeRight = vi.fn()
    render(<Board fen={START_FEN} bestMoveUci={null} showArrow={false} onSwipeRight={onSwipeRight} />)
    const container = screen.getByTestId('board-container')
    fireEvent.touchStart(container, { touches: [{ clientX: 100, clientY: 300 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 200, clientY: 300 }] })
    expect(onSwipeRight).toHaveBeenCalledTimes(1)
  })

  it('swipe exactly at threshold (deltaX = -50) does NOT trigger (must exceed)', () => {
    const onSwipeLeft = vi.fn()
    render(<Board fen={START_FEN} bestMoveUci={null} showArrow={false} onSwipeLeft={onSwipeLeft} />)
    const container = screen.getByTestId('board-container')
    fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 150, clientY: 300 }] })
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('short swipe (deltaX = -30) does not trigger onSwipeLeft', () => {
    const onSwipeLeft = vi.fn()
    render(<Board fen={START_FEN} bestMoveUci={null} showArrow={false} onSwipeLeft={onSwipeLeft} />)
    const container = screen.getByTestId('board-container')
    fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 170, clientY: 300 }] })
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('does not call onSwipeRight when onSwipeLeft swipe occurs', () => {
    const onSwipeLeft = vi.fn()
    const onSwipeRight = vi.fn()
    render(<Board fen={START_FEN} bestMoveUci={null} showArrow={false} onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight} />)
    const container = screen.getByTestId('board-container')
    fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 300 }] })
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100, clientY: 300 }] })
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('board-container has class w-full', () => {
    render(<Board fen={START_FEN} bestMoveUci={null} showArrow={false} />)
    expect(screen.getByTestId('board-container').className).toContain('w-full')
  })

  it('touchEnd without prior touchStart does not throw', () => {
    render(<Board fen={START_FEN} bestMoveUci={null} showArrow={false} />)
    const container = screen.getByTestId('board-container')
    expect(() => {
      fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100, clientY: 300 }] })
    }).not.toThrow()
  })
})

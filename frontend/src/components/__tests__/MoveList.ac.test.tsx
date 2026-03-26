/**
 * AC gate tests — MoveList component (Story 5.6).
 *
 * AC: Clicking move at index 5 calls goToMove(5) and adds the highlight class;
 *     advancing currentMoveIndex to 10 triggers scrollIntoView on the index-10 element.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MoveList } from '../MoveList'
import type { MoveResult } from '../../types/analysis'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeMove(index: number): MoveResult {
  return {
    move_index: index,
    move_number: Math.floor(index / 2) + 1,
    san: index % 2 === 0 ? `e${(index + 2)}` : `e${(index + 1)}`,
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
  }
}

// Build 12 moves (indices 0–11)
const MOVES: MoveResult[] = Array.from({ length: 12 }, (_, i) => makeMove(i))

// ---------------------------------------------------------------------------
// AC gate
// ---------------------------------------------------------------------------

describe('AC: MoveList interaction and scroll', () => {
  it('clicking move at index 5 calls goToMove(5)', async () => {
    const goToMove = vi.fn()
    render(<MoveList moves={MOVES} currentMoveIndex={-1} goToMove={goToMove} />)

    await userEvent.click(screen.getByTestId('move-item-5'))

    expect(goToMove).toHaveBeenCalledTimes(1)
    expect(goToMove).toHaveBeenCalledWith(5)
  })

  it('move at index 5 has the highlight class when it is the current move', () => {
    render(<MoveList moves={MOVES} currentMoveIndex={5} goToMove={vi.fn()} />)

    const el = screen.getByTestId('move-item-5')
    expect(el.classList.contains('move-item--active')).toBe(true)
  })

  it('move at index 5 does not have the highlight class when it is not selected', () => {
    render(<MoveList moves={MOVES} currentMoveIndex={-1} goToMove={vi.fn()} />)

    const el = screen.getByTestId('move-item-5')
    expect(el.classList.contains('move-item--active')).toBe(false)
  })

  it('scrollIntoView is called on the index-10 element when currentMoveIndex advances to 10', () => {
    // jsdom does not implement scrollIntoView — define it so the component and spy can use it
    const scrollMock = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollMock,
    })

    const { rerender } = render(
      <MoveList moves={MOVES} currentMoveIndex={-1} goToMove={vi.fn()} />,
    )

    rerender(<MoveList moves={MOVES} currentMoveIndex={10} goToMove={vi.fn()} />)

    // scrollIntoView must have been called at least once
    expect(scrollMock).toHaveBeenCalled()

    // The call must have originated from the move-item-10 element (mock.instances captures `this`)
    const calledOnElement = scrollMock.mock.instances[0] as HTMLElement
    expect(calledOnElement.getAttribute('data-testid')).toBe('move-item-10')

    // Cleanup
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (HTMLElement.prototype as any).scrollIntoView
  })
})

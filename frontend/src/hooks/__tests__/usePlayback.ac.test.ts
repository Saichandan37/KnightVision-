/**
 * AC gate tests — usePlayback state machine (Story 5.3).
 *
 * AC: Calling play() advances currentMoveIndex from -1 to 0 after 1000ms;
 *     calling prev() while at index 0 keeps currentMoveIndex at -1 (no underflow);
 *     calling goToEnd() with 5 moves sets currentMoveIndex to 4.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePlayback } from '../usePlayback'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AC: usePlayback state machine', () => {
  it('play() advances currentMoveIndex from -1 to 0 after 1000ms', () => {
    const { result } = renderHook(() => usePlayback(5))
    expect(result.current.currentMoveIndex).toBe(-1)

    act(() => {
      result.current.play()
    })

    expect(result.current.isPlaying).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.currentMoveIndex).toBe(0)
  })

  it('prev() while at index 0 keeps currentMoveIndex at -1 (no underflow)', () => {
    const { result } = renderHook(() => usePlayback(5))

    act(() => {
      result.current.goToMove(0)
    })

    expect(result.current.currentMoveIndex).toBe(0)

    act(() => {
      result.current.prev()
    })

    expect(result.current.currentMoveIndex).toBe(-1)

    // Call prev() again — must stay at -1
    act(() => {
      result.current.prev()
    })

    expect(result.current.currentMoveIndex).toBe(-1)
  })

  it('goToEnd() with 5 moves sets currentMoveIndex to 4', () => {
    const { result } = renderHook(() => usePlayback(5))

    act(() => {
      result.current.goToEnd()
    })

    expect(result.current.currentMoveIndex).toBe(4)
  })
})

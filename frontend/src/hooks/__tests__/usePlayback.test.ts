/**
 * usePlayback hook supporting tests — state, navigation, auto-play, keyboard bindings.
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

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('currentMoveIndex starts at -1', () => {
    const { result } = renderHook(() => usePlayback(5))
    expect(result.current.currentMoveIndex).toBe(-1)
  })

  it('isPlaying starts false', () => {
    const { result } = renderHook(() => usePlayback(5))
    expect(result.current.isPlaying).toBe(false)
  })

  it('playbackSpeed defaults to 1000ms', () => {
    const { result } = renderHook(() => usePlayback(5))
    expect(result.current.playbackSpeed).toBe(1000)
  })
})

// ---------------------------------------------------------------------------
// play / pause
// ---------------------------------------------------------------------------

describe('play and pause', () => {
  it('play() sets isPlaying to true', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.play() })
    expect(result.current.isPlaying).toBe(true)
  })

  it('pause() sets isPlaying to false', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.play() })
    act(() => { result.current.pause() })
    expect(result.current.isPlaying).toBe(false)
  })

  it('play() does nothing when moveCount is 0', () => {
    const { result } = renderHook(() => usePlayback(0))
    act(() => { result.current.play() })
    expect(result.current.isPlaying).toBe(false)
  })

  it('auto-play advances index at each interval tick', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.play() })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current.currentMoveIndex).toBe(1)
  })

  it('auto-play stops automatically at last move', () => {
    const { result } = renderHook(() => usePlayback(3))
    act(() => { result.current.play() })
    // Advance past the last move: 3 ticks (0, 1, 2) + 1 more
    act(() => { vi.advanceTimersByTime(4000) })
    expect(result.current.currentMoveIndex).toBe(2)
    expect(result.current.isPlaying).toBe(false)
  })

  it('auto-play uses configured playbackSpeed', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.setPlaybackSpeed(500) })
    act(() => { result.current.play() })
    act(() => { vi.advanceTimersByTime(1000) })
    // 1000ms / 500ms = 2 advances: -1 → 0 → 1
    expect(result.current.currentMoveIndex).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// next / prev
// ---------------------------------------------------------------------------

describe('next', () => {
  it('next() increments currentMoveIndex', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.next() })
    expect(result.current.currentMoveIndex).toBe(0)
  })

  it('next() does not exceed last move index', () => {
    const { result } = renderHook(() => usePlayback(3))
    act(() => { result.current.goToEnd() })
    act(() => { result.current.next() })
    expect(result.current.currentMoveIndex).toBe(2)
  })

  it('next() pauses auto-play', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.play() })
    act(() => { result.current.next() })
    expect(result.current.isPlaying).toBe(false)
  })
})

describe('prev', () => {
  it('prev() decrements currentMoveIndex', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.next() }) // go to 0
    act(() => { result.current.next() }) // go to 1
    act(() => { result.current.prev() })
    expect(result.current.currentMoveIndex).toBe(0)
  })

  it('prev() does not go below -1', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.prev() })
    expect(result.current.currentMoveIndex).toBe(-1)
  })

  it('prev() pauses auto-play', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.play() })
    act(() => { result.current.prev() })
    expect(result.current.isPlaying).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// goToMove / goToStart / goToEnd
// ---------------------------------------------------------------------------

describe('goToMove', () => {
  it('jumps to specified index', () => {
    const { result } = renderHook(() => usePlayback(10))
    act(() => { result.current.goToMove(7) })
    expect(result.current.currentMoveIndex).toBe(7)
  })

  it('clamps to last valid index', () => {
    const { result } = renderHook(() => usePlayback(3))
    act(() => { result.current.goToMove(100) })
    expect(result.current.currentMoveIndex).toBe(2)
  })

  it('clamps to -1 for negative index', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.goToMove(-5) })
    expect(result.current.currentMoveIndex).toBe(-1)
  })

  it('pauses auto-play', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.play() })
    act(() => { result.current.goToMove(3) })
    expect(result.current.isPlaying).toBe(false)
  })
})

describe('goToStart', () => {
  it('sets currentMoveIndex to -1', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.goToMove(4) })
    act(() => { result.current.goToStart() })
    expect(result.current.currentMoveIndex).toBe(-1)
  })

  it('pauses auto-play', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.play() })
    act(() => { result.current.goToStart() })
    expect(result.current.isPlaying).toBe(false)
  })
})

describe('goToEnd', () => {
  it('sets currentMoveIndex to moveCount - 1', () => {
    const { result } = renderHook(() => usePlayback(7))
    act(() => { result.current.goToEnd() })
    expect(result.current.currentMoveIndex).toBe(6)
  })

  it('pauses auto-play', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.play() })
    act(() => { result.current.goToEnd() })
    expect(result.current.isPlaying).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Keyboard bindings
// ---------------------------------------------------------------------------

describe('keyboard bindings', () => {
  function pressKey(key: string) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  }

  it('ArrowRight calls next()', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { pressKey('ArrowRight') })
    expect(result.current.currentMoveIndex).toBe(0)
  })

  it('ArrowLeft calls prev() and stays at -1 when at start', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { pressKey('ArrowLeft') })
    expect(result.current.currentMoveIndex).toBe(-1)
  })

  it('Space toggles play/pause when not playing', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { pressKey(' ') })
    expect(result.current.isPlaying).toBe(true)
  })

  it('Space pauses when playing', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.play() })
    act(() => { pressKey(' ') })
    expect(result.current.isPlaying).toBe(false)
  })

  it('Home calls goToStart()', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.goToMove(3) })
    act(() => { pressKey('Home') })
    expect(result.current.currentMoveIndex).toBe(-1)
  })

  it('End calls goToEnd()', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { pressKey('End') })
    expect(result.current.currentMoveIndex).toBe(4)
  })

  it('keyboard listener is removed on unmount', () => {
    const { result, unmount } = renderHook(() => usePlayback(5))
    unmount()
    act(() => { pressKey('ArrowRight') })
    expect(result.current.currentMoveIndex).toBe(-1)
  })
})

// ---------------------------------------------------------------------------
// setPlaybackSpeed
// ---------------------------------------------------------------------------

describe('setPlaybackSpeed', () => {
  it('updates playbackSpeed', () => {
    const { result } = renderHook(() => usePlayback(5))
    act(() => { result.current.setPlaybackSpeed(500) })
    expect(result.current.playbackSpeed).toBe(500)
  })
})

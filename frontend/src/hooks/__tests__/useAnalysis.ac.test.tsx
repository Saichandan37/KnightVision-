/**
 * AC gate tests — useAnalysis hook (Story 5.2).
 *
 * AC: In a Vitest test with a mocked WebSocket server, calling uploadPgn(validPgn)
 *     results in analysisStore.moves.length > 0 after 5 simulated move_result
 *     messages are dispatched; a buffered: true message does not change a
 *     shouldAnimate flag.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnalysis } from '../useAnalysis'
import { useAnalysisStore } from '../../store/analysisStore'

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

class MockWebSocket {
  static instances: MockWebSocket[] = []

  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(_url: string) {
    MockWebSocket.instances.push(this)
  }

  close() {
    this.onclose?.()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(_data: string): void {}

  simulateMessage(msg: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(msg) })
  }

  static get last(): MockWebSocket {
    return MockWebSocket.instances[MockWebSocket.instances.length - 1]
  }

  static clear() {
    MockWebSocket.instances = []
  }
}

vi.stubGlobal('WebSocket', MockWebSocket)

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bb5'

function makeMoveMsg(index: number, buffered = false) {
  return {
    move_index: index,
    move_number: Math.floor(index / 2) + 1,
    san: index % 2 === 0 ? 'e4' : 'e5',
    uci: index % 2 === 0 ? 'e2e4' : 'e7e5',
    category: 'best',
    cp_loss: 0,
    eval_before_cp: 0,
    eval_after_cp: 0,
    best_move_uci: 'e2e4',
    best_move_san: 'e4',
    top_candidates: [],
    comment: '',
    comment_source: 'fallback',
    buffered,
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  MockWebSocket.clear()
  useAnalysisStore.getState().reset()
  vi.useFakeTimers({ now: 0 })
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ game_id: 'ac-game-52' }),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// AC gate
// ---------------------------------------------------------------------------

describe('AC: uploadPgn dispatches moves to store', () => {
  it('analysisStore.moves.length > 0 after 5 simulated move_result messages', async () => {
    const { result } = renderHook(() => useAnalysis())

    await act(async () => {
      await result.current.uploadPgn(VALID_PGN)
    })

    act(() => {
      for (let i = 0; i < 5; i++) {
        MockWebSocket.last.simulateMessage(makeMoveMsg(i, false))
      }
    })

    expect(useAnalysisStore.getState().moves.length).toBeGreaterThan(0)
    expect(useAnalysisStore.getState().moves).toHaveLength(5)
  })

  it('a buffered:true message does not change the shouldAnimate flag', async () => {
    const { result } = renderHook(() => useAnalysis())

    await act(async () => {
      await result.current.uploadPgn(VALID_PGN)
    })

    // shouldAnimate starts false
    expect(result.current.shouldAnimate).toBe(false)

    act(() => {
      MockWebSocket.last.simulateMessage(makeMoveMsg(0, true)) // buffered: true
    })

    // Still false — buffered moves must not trigger animation
    expect(result.current.shouldAnimate).toBe(false)
    // But the move IS added to the store
    expect(useAnalysisStore.getState().moves).toHaveLength(1)
  })
})

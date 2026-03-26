/**
 * AC gate tests — stall detection (updated for Epic 5 store-integrated API).
 *
 * AC (Story 4.3): When the WebSocket sends no messages for 30 s during analysis
 *   (simulated by dropping heartbeats), the frontend displays the stall warning
 *   banner within 35 s of the last message.  The banner does NOT appear during
 *   normal analysis with heartbeats arriving every 10 s.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import { useAnalysis, STALL_MESSAGE } from '../useAnalysis'
import { StallBanner } from '../../components/StallBanner'
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

const VALID_PGN = '1. e4 e5'

const MOVE_MSG = {
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
  comment: '',
  comment_source: 'fallback',
  buffered: false,
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
    json: () => Promise.resolve({ game_id: 'test-game' }),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// AC test 1 — stall detected when no messages arrive for > 30 s
// ---------------------------------------------------------------------------

describe('AC: stall detection', () => {
  it('status becomes stalled within 35 s of the last message when no messages arrive', async () => {
    const { result } = renderHook(() => useAnalysis())

    await act(async () => {
      await result.current.uploadPgn(VALID_PGN)
    })

    // Receive one move → enter analysing state
    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG)
    })

    expect(result.current.analysisStatus).toBe('analysing')

    // Advance 35 s with NO further messages (heartbeats dropped)
    act(() => {
      vi.advanceTimersByTime(35_000)
    })

    expect(result.current.analysisStatus).toBe('stalled')
  })

  it('stall banner is visible when status is stalled', () => {
    function Fixture() {
      const { analysisStatus } = useAnalysis()
      const [dismissed, setDismissed] = useState(false)
      return (
        <>
          {analysisStatus === 'stalled' && !dismissed && (
            <StallBanner onDismiss={() => setDismissed(true)} />
          )}
        </>
      )
    }

    render(<Fixture />)

    // Directly set stalled via store to isolate banner rendering from WS lifecycle
    act(() => {
      useAnalysisStore.getState().setStatus('stalled')
    })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(STALL_MESSAGE)
  })

  // ---------------------------------------------------------------------------
  // AC test 2 — no stall when heartbeats arrive every 10 s
  // ---------------------------------------------------------------------------

  it('status stays analysing when heartbeats arrive every 10 s for 60 s', async () => {
    const { result } = renderHook(() => useAnalysis())

    await act(async () => {
      await result.current.uploadPgn(VALID_PGN)
    })

    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG)
    })

    expect(result.current.analysisStatus).toBe('analysing')

    // 6 × (advance 10 s then send heartbeat) = 60 s with regular heartbeats
    for (let i = 0; i < 6; i++) {
      act(() => {
        vi.advanceTimersByTime(10_000)
        MockWebSocket.last.simulateMessage({
          type: 'heartbeat',
          timestamp: Date.now(),
        })
      })
    }

    expect(result.current.analysisStatus).toBe('analysing')
  })

  it('stall banner does NOT appear when heartbeats keep arriving', () => {
    function Fixture() {
      const { analysisStatus } = useAnalysis()
      const [dismissed, setDismissed] = useState(false)
      return (
        <>
          {analysisStatus === 'stalled' && !dismissed && (
            <StallBanner onDismiss={() => setDismissed(true)} />
          )}
        </>
      )
    }

    render(<Fixture />)

    // Status never reaches stalled — banner stays hidden
    for (let i = 0; i < 6; i++) {
      act(() => {
        vi.advanceTimersByTime(10_000)
        useAnalysisStore.getState().setStatus('analysing')
      })
    }

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

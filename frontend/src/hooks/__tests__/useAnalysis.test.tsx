/**
 * useAnalysis hook supporting tests — upload flow, WS lifecycle, message routing.
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
  readyState = 1 // OPEN

  constructor(_url: string) {
    MockWebSocket.instances.push(this)
  }

  close() {
    this.readyState = 3 // CLOSED
    this.onclose?.()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(_data: string): void {}

  simulateMessage(msg: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(msg) })
  }

  simulateError() {
    this.onerror?.(new Event('error'))
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
  comment: 'good move',
  comment_source: 'fallback',
  buffered: false,
}

const BUFFERED_MOVE_MSG = { ...MOVE_MSG, buffered: true }

const HEARTBEAT_MSG = { type: 'heartbeat', timestamp: 0 }

const COMPLETE_MSG = {
  type: 'analysis_complete',
  white_accuracy: 90.0,
  black_accuracy: 85.0,
  total_moves: 10,
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
    json: () => Promise.resolve({ game_id: 'game-1' }),
  })
})

afterEach(() => {
  vi.useRealTimers()
})

// Helper — call uploadPgn and await fetch + WS setup
async function startAnalysis(result: { current: ReturnType<typeof useAnalysis> }) {
  await act(async () => {
    await result.current.uploadPgn(VALID_PGN)
  })
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('analysisStatus starts idle', () => {
    const { result } = renderHook(() => useAnalysis())
    expect(result.current.analysisStatus).toBe('idle')
  })

  it('shouldAnimate starts false', () => {
    const { result } = renderHook(() => useAnalysis())
    expect(result.current.shouldAnimate).toBe(false)
  })

  it('no WebSocket is created before uploadPgn', () => {
    renderHook(() => useAnalysis())
    expect(MockWebSocket.instances).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// uploadPgn — upload flow
// ---------------------------------------------------------------------------

describe('uploadPgn', () => {
  it('sets status to uploading during the fetch phase', async () => {
    // uploadPgn sets 'uploading' then the WS opens; status stays 'uploading' until WS messages arrive
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    // After fetch succeeds and WS opens, no messages yet — status is still uploading
    expect(result.current.analysisStatus).toBe('uploading')
  })

  it('creates a WebSocket after successful upload', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('sets gameId in store after successful upload', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    expect(useAnalysisStore.getState().gameId).toBe('game-1')
  })

  it('sets status to error when fetch returns non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false })
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    expect(result.current.analysisStatus).toBe('error')
  })

  it('sets status to error when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'))
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    expect(result.current.analysisStatus).toBe('error')
  })

  it('closes existing WS before opening a new one', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    await startAnalysis(result)
    // First WS was closed (readyState=3) and second was opened
    expect(MockWebSocket.instances[0].readyState).toBe(3)
    expect(MockWebSocket.instances).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Move messages
// ---------------------------------------------------------------------------

describe('move_result messages', () => {
  it('sets status to analysing when first move arrives', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG)
    })
    expect(result.current.analysisStatus).toBe('analysing')
  })

  it('appends move to store', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG)
    })
    expect(useAnalysisStore.getState().moves).toHaveLength(1)
    expect(useAnalysisStore.getState().moves[0].san).toBe('e4')
  })

  it('accumulates multiple moves', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG)
      MockWebSocket.last.simulateMessage({ ...MOVE_MSG, move_index: 1, san: 'e5' })
    })
    expect(useAnalysisStore.getState().moves).toHaveLength(2)
  })

  it('sets shouldAnimate to true for live (buffered=false) move', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG) // buffered: false
    })
    expect(result.current.shouldAnimate).toBe(true)
  })

  it('does NOT set shouldAnimate to true for buffered move', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(BUFFERED_MOVE_MSG) // buffered: true
    })
    expect(result.current.shouldAnimate).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Heartbeat messages
// ---------------------------------------------------------------------------

describe('heartbeat messages', () => {
  it('does not add heartbeat to store moves', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(HEARTBEAT_MSG)
    })
    expect(useAnalysisStore.getState().moves).toHaveLength(0)
  })

  it('does not change analysisStatus on heartbeat alone', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG)
      MockWebSocket.last.simulateMessage(HEARTBEAT_MSG)
    })
    // Still analysing — heartbeat doesn't change it
    expect(result.current.analysisStatus).toBe('analysing')
  })

  it('updates lastMessageAt so stall timer does not fire after heartbeat', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)

    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG)
    })

    // Advance 25 s then send heartbeat — resets the 30 s clock
    act(() => {
      vi.advanceTimersByTime(25_000)
      MockWebSocket.last.simulateMessage(HEARTBEAT_MSG)
    })

    // Advance another 25 s — total 50 s, but only 25 s since last message
    act(() => {
      vi.advanceTimersByTime(25_000)
    })

    expect(result.current.analysisStatus).toBe('analysing')
  })
})

// ---------------------------------------------------------------------------
// analysis_complete message
// ---------------------------------------------------------------------------

describe('analysis_complete message', () => {
  it('sets status to complete', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG)
      MockWebSocket.last.simulateMessage(COMPLETE_MSG)
    })
    expect(result.current.analysisStatus).toBe('complete')
  })

  it('stores accuracy in the Zustand store', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(COMPLETE_MSG)
    })
    expect(useAnalysisStore.getState().whiteAccuracy).toBe(90.0)
    expect(useAnalysisStore.getState().blackAccuracy).toBe(85.0)
  })

  it('closes WS after analysis_complete', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(COMPLETE_MSG)
    })
    expect(MockWebSocket.last.readyState).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('error handling', () => {
  it('sets status to error on WS error event', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateError()
    })
    expect(result.current.analysisStatus).toBe('error')
  })

  it('sets status to error on error message type', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage({ type: 'error', message: 'Game not found' })
    })
    expect(result.current.analysisStatus).toBe('error')
  })
})

// ---------------------------------------------------------------------------
// Stall detection — edge cases
// ---------------------------------------------------------------------------

describe('stall detection edge cases', () => {
  it('does not stall at exactly 30 s (threshold is exclusive)', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG)
    })
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(result.current.analysisStatus).toBe('analysing')
  })

  it('stalls once stall check interval fires after 30 s threshold is crossed', async () => {
    // Stall check runs every 5 s; threshold is 30 s; first check after crossing is at t=35 s
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG)
    })
    act(() => {
      vi.advanceTimersByTime(35_001)
    })
    expect(result.current.analysisStatus).toBe('stalled')
  })

  it('clears stall timer when analysis completes and does not stall afterwards', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG)
      MockWebSocket.last.simulateMessage(COMPLETE_MSG)
    })
    // 60 s after completion — status stays complete, not stalled
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.analysisStatus).toBe('complete')
  })
})

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

describe('cleanup', () => {
  it('closes WS when cleanup is called', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      result.current.cleanup()
    })
    expect(MockWebSocket.last.readyState).toBe(3)
  })

  it('does not stall after unmount', async () => {
    const { result, unmount } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    act(() => {
      MockWebSocket.last.simulateMessage(MOVE_MSG)
    })
    unmount()
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    // Status was 'analysing' before unmount — not stalled by timer after cleanup
    expect(result.current.analysisStatus).toBe('analysing')
  })
})

// ---------------------------------------------------------------------------
// VITE_API_BASE_URL — hosted deployment (Story 7.2)
// ---------------------------------------------------------------------------

describe('VITE_API_BASE_URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses relative path when VITE_API_BASE_URL is not set', async () => {
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/analysis/upload',
      expect.any(Object),
    )
  })

  it('prepends VITE_API_BASE_URL to the upload path when set', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/analysis/upload',
      expect.any(Object),
    )
  })

  it('strips trailing slash from VITE_API_BASE_URL before joining', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')
    const { result } = renderHook(() => useAnalysis())
    await startAnalysis(result)
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/api/analysis/upload',
      expect.any(Object),
    )
  })
})

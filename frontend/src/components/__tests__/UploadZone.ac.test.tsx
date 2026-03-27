/**
 * AC gate tests — UploadZone component (Story 6.1).
 *
 * AC:
 *  - Pasting a valid PGN string and clicking submit calls uploadPgn and
 *    transitions analysisStatus from "idle" to "uploading".
 *  - Pasting an invalid PGN string and clicking submit shows the inline
 *    error message WITHOUT making a network request.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { UploadZone } from '../UploadZone'
import { useAnalysisStore } from '../../store/analysisStore'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// chess.js — control validation outcome per test
vi.mock('chess.js', () => ({
  Chess: vi.fn(),
}))

// fetch — spy to verify network request behaviour
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// WebSocket — prevent real connections opening
vi.stubGlobal('WebSocket', vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  onmessage: null,
  onerror: null,
  onclose: null,
})))

// ---------------------------------------------------------------------------

beforeEach(async () => {
  useAnalysisStore.getState().reset()
  mockFetch.mockReset()
  vi.clearAllMocks()

  // Default: chess.js loadPgn succeeds (valid PGN)
  const { Chess } = await import('chess.js')
  ;(Chess as ReturnType<typeof vi.fn>).mockImplementation(() => ({
    loadPgn: vi.fn(), // no throw = valid
  }))
})

// ---------------------------------------------------------------------------
// AC gate tests
// ---------------------------------------------------------------------------

describe('AC: UploadZone PGN submission', () => {
  it('valid PGN: calls uploadPgn and status transitions to "uploading"', async () => {
    // uploadPgn prop: sets status to uploading and simulates the fetch call
    const mockUploadPgn = vi.fn().mockImplementation(async () => {
      useAnalysisStore.getState().setStatus('uploading')
      mockFetch('http://localhost:8000/api/analysis/upload')
    })

    render(<UploadZone uploadPgn={mockUploadPgn} />)

    fireEvent.change(screen.getByTestId('pgn-textarea'), {
      target: { value: '1. e4 e5 *' },
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-submit'))
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(useAnalysisStore.getState().analysisStatus).toBe('uploading')
  })

  it('invalid PGN: shows inline error and makes NO network request', async () => {
    // Override chess.js to throw (invalid PGN)
    const { Chess } = await import('chess.js')
    ;(Chess as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      loadPgn: vi.fn().mockImplementation(() => {
        throw new Error('Invalid PGN')
      }),
    }))

    render(<UploadZone uploadPgn={vi.fn()} />)

    fireEvent.change(screen.getByTestId('pgn-textarea'), {
      target: { value: 'this is not pgn' },
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-submit'))
    })

    expect(screen.getByTestId('validation-error')).toHaveTextContent(
      'Invalid PGN — please check your file',
    )
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

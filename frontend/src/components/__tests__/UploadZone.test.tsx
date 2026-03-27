/**
 * UploadZone supporting tests — structure, drag-and-drop, textarea,
 * validation error display, loading state, backend error, file input.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { UploadZone } from '../UploadZone'
import { useAnalysisStore } from '../../store/analysisStore'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('chess.js', () => ({
  Chess: vi.fn(),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

vi.stubGlobal('WebSocket', vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  onmessage: null,
  onerror: null,
  onclose: null,
})))

// ---------------------------------------------------------------------------

async function setChessValid(valid: boolean) {
  const { Chess } = await import('chess.js')
  if (valid) {
    ;(Chess as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      loadPgn: vi.fn(),
    }))
  } else {
    ;(Chess as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      loadPgn: vi.fn().mockImplementation(() => {
        throw new Error('Invalid PGN')
      }),
    }))
  }
}

// Shared uploadPgn prop — tests that need custom behaviour override it inline
const mockUploadPgn = vi.fn()

beforeEach(async () => {
  useAnalysisStore.getState().reset()
  mockFetch.mockReset()
  mockUploadPgn.mockReset()
  vi.clearAllMocks()
  await setChessValid(true)
})

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe('structure', () => {
  it('renders upload-zone container', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    expect(screen.getByTestId('upload-zone')).toBeInTheDocument()
  })

  it('renders drop-area with placeholder text', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    expect(screen.getByTestId('drop-area')).toHaveTextContent(
      'Drop PGN file here or click to browse',
    )
  })

  it('renders textarea with placeholder "Or paste PGN text here"', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    expect(screen.getByTestId('pgn-textarea')).toHaveAttribute(
      'placeholder',
      'Or paste PGN text here',
    )
  })

  it('renders submit button with label "Analyse"', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    expect(screen.getByTestId('btn-submit')).toHaveTextContent('Analyse')
  })

  it('renders file input that accepts .pgn', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    expect(screen.getByTestId('file-input')).toHaveAttribute('accept', '.pgn')
  })

  it('submit button has min-height of 44px (mobile tap target)', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    const btn = screen.getByTestId('btn-submit')
    expect(btn.style.minHeight).toBe('44px')
  })
})

// ---------------------------------------------------------------------------
// Drag-and-drop visual state
// ---------------------------------------------------------------------------

describe('drag-and-drop', () => {
  it('data-drag-active is false initially', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    expect(screen.getByTestId('drop-area').getAttribute('data-drag-active')).toBe('false')
  })

  it('data-drag-active becomes true on dragover', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    fireEvent.dragOver(screen.getByTestId('drop-area'))
    expect(screen.getByTestId('drop-area').getAttribute('data-drag-active')).toBe('true')
  })

  it('data-drag-active returns to false on dragleave', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    fireEvent.dragOver(screen.getByTestId('drop-area'))
    fireEvent.dragLeave(screen.getByTestId('drop-area'))
    expect(screen.getByTestId('drop-area').getAttribute('data-drag-active')).toBe('false')
  })
})

// ---------------------------------------------------------------------------
// Textarea interaction
// ---------------------------------------------------------------------------

describe('textarea', () => {
  it('updates value when typed into', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: '1. e4' } })
    expect((screen.getByTestId('pgn-textarea') as HTMLTextAreaElement).value).toBe('1. e4')
  })

  it('clears validation error when textarea changes', async () => {
    await setChessValid(false)
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: 'bad' } })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-submit')) })
    expect(screen.getByTestId('validation-error')).toBeInTheDocument()

    // Changing textarea clears the error
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: 'new text' } })
    expect(screen.queryByTestId('validation-error')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Validation error
// ---------------------------------------------------------------------------

describe('validation error', () => {
  it('shows no error initially', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    expect(screen.queryByTestId('validation-error')).toBeNull()
  })

  it('shows error message on invalid PGN submit', async () => {
    await setChessValid(false)
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: 'bad' } })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-submit')) })
    expect(screen.getByTestId('validation-error')).toHaveTextContent(
      'Invalid PGN — please check your file',
    )
  })

  it('validation error has role="alert"', async () => {
    await setChessValid(false)
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: 'x' } })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-submit')) })
    expect(screen.getByTestId('validation-error')).toHaveAttribute('role', 'alert')
  })

  it('error is absent after valid submission', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    // First trigger an invalid error
    await setChessValid(false)
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: 'bad' } })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-submit')) })
    expect(screen.getByTestId('validation-error')).toBeInTheDocument()

    // Now switch to valid and resubmit
    await setChessValid(true)
    await act(async () => { fireEvent.click(screen.getByTestId('btn-submit')) })
    await waitFor(() => {
      expect(screen.queryByTestId('validation-error')).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('loading state', () => {
  it('shows loading spinner while uploading', async () => {
    // uploadPgn sets status to uploading then hangs (simulates in-flight request)
    const pendingUpload = vi.fn().mockImplementation(async () => {
      useAnalysisStore.getState().setStatus('uploading')
      return new Promise(() => {})
    })
    render(<UploadZone uploadPgn={pendingUpload} />)
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: '1. e4 *' } })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-submit')) })
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Analysing…')
  })

  it('submit button is disabled while uploading', async () => {
    const pendingUpload = vi.fn().mockImplementation(async () => {
      useAnalysisStore.getState().setStatus('uploading')
      return new Promise(() => {})
    })
    render(<UploadZone uploadPgn={pendingUpload} />)
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: '1. e4 *' } })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-submit')) })
    expect(screen.getByTestId('btn-submit')).toBeDisabled()
  })

  it('no loading spinner before submit', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    expect(screen.queryByTestId('loading-spinner')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Drop-area role and accessibility
// ---------------------------------------------------------------------------

describe('accessibility', () => {
  it('drop-area has role="button"', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    expect(screen.getByTestId('drop-area')).toHaveAttribute('role', 'button')
  })

  it('submit button has aria-label "Analyse game"', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    expect(screen.getByTestId('btn-submit')).toHaveAttribute('aria-label', 'Analyse game')
  })

  it('textarea has aria-label', () => {
    render(<UploadZone uploadPgn={mockUploadPgn} />)
    expect(screen.getByTestId('pgn-textarea')).toHaveAttribute('aria-label')
  })
})

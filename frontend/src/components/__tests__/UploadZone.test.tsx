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

beforeEach(async () => {
  useAnalysisStore.getState().reset()
  mockFetch.mockReset()
  vi.clearAllMocks()
  await setChessValid(true)
})

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe('structure', () => {
  it('renders upload-zone container', () => {
    render(<UploadZone />)
    expect(screen.getByTestId('upload-zone')).toBeInTheDocument()
  })

  it('renders drop-area with placeholder text', () => {
    render(<UploadZone />)
    expect(screen.getByTestId('drop-area')).toHaveTextContent(
      'Drop PGN file here or click to browse',
    )
  })

  it('renders textarea with placeholder "Or paste PGN text here"', () => {
    render(<UploadZone />)
    expect(screen.getByTestId('pgn-textarea')).toHaveAttribute(
      'placeholder',
      'Or paste PGN text here',
    )
  })

  it('renders submit button with label "Analyse"', () => {
    render(<UploadZone />)
    expect(screen.getByTestId('btn-submit')).toHaveTextContent('Analyse')
  })

  it('renders file input that accepts .pgn', () => {
    render(<UploadZone />)
    expect(screen.getByTestId('file-input')).toHaveAttribute('accept', '.pgn')
  })

  it('submit button has min-height of 44px (mobile tap target)', () => {
    render(<UploadZone />)
    const btn = screen.getByTestId('btn-submit')
    expect(btn.style.minHeight).toBe('44px')
  })
})

// ---------------------------------------------------------------------------
// Drag-and-drop visual state
// ---------------------------------------------------------------------------

describe('drag-and-drop', () => {
  it('data-drag-active is false initially', () => {
    render(<UploadZone />)
    expect(screen.getByTestId('drop-area').getAttribute('data-drag-active')).toBe('false')
  })

  it('data-drag-active becomes true on dragover', () => {
    render(<UploadZone />)
    fireEvent.dragOver(screen.getByTestId('drop-area'))
    expect(screen.getByTestId('drop-area').getAttribute('data-drag-active')).toBe('true')
  })

  it('data-drag-active returns to false on dragleave', () => {
    render(<UploadZone />)
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
    render(<UploadZone />)
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: '1. e4' } })
    expect((screen.getByTestId('pgn-textarea') as HTMLTextAreaElement).value).toBe('1. e4')
  })

  it('clears validation error when textarea changes', async () => {
    await setChessValid(false)
    render(<UploadZone />)
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
    render(<UploadZone />)
    expect(screen.queryByTestId('validation-error')).toBeNull()
  })

  it('shows error message on invalid PGN submit', async () => {
    await setChessValid(false)
    render(<UploadZone />)
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: 'bad' } })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-submit')) })
    expect(screen.getByTestId('validation-error')).toHaveTextContent(
      'Invalid PGN — please check your file',
    )
  })

  it('validation error has role="alert"', async () => {
    await setChessValid(false)
    render(<UploadZone />)
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: 'x' } })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-submit')) })
    expect(screen.getByTestId('validation-error')).toHaveAttribute('role', 'alert')
  })

  it('error is absent after valid submission', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<UploadZone />)
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
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<UploadZone />)
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: '1. e4 *' } })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-submit')) })
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toHaveTextContent('Analysing…')
  })

  it('submit button is disabled while uploading', async () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<UploadZone />)
    fireEvent.change(screen.getByTestId('pgn-textarea'), { target: { value: '1. e4 *' } })
    await act(async () => { fireEvent.click(screen.getByTestId('btn-submit')) })
    expect(screen.getByTestId('btn-submit')).toBeDisabled()
  })

  it('no loading spinner before submit', () => {
    render(<UploadZone />)
    expect(screen.queryByTestId('loading-spinner')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Drop-area role and accessibility
// ---------------------------------------------------------------------------

describe('accessibility', () => {
  it('drop-area has role="button"', () => {
    render(<UploadZone />)
    expect(screen.getByTestId('drop-area')).toHaveAttribute('role', 'button')
  })

  it('submit button has aria-label "Analyse game"', () => {
    render(<UploadZone />)
    expect(screen.getByTestId('btn-submit')).toHaveAttribute('aria-label', 'Analyse game')
  })

  it('textarea has aria-label', () => {
    render(<UploadZone />)
    expect(screen.getByTestId('pgn-textarea')).toHaveAttribute('aria-label')
  })
})

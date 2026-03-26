/**
 * GameHeader supporting tests — placeholder, players, date, opening badge,
 * accuracy colours, optional fields.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GameHeader } from '../GameHeader'
import { useAnalysisStore } from '../../store/analysisStore'
import type { GameMeta } from '../../types/analysis'

function makeMeta(overrides: Partial<GameMeta> = {}): GameMeta {
  return {
    white: 'Alice',
    black: 'Bob',
    white_elo: null,
    black_elo: null,
    result: '1/2-1/2',
    date: '2024.01.01',
    opening_eco: 'E97',
    opening_name: "King's Indian: Mar del Plata",
    ...overrides,
  }
}

beforeEach(() => {
  useAnalysisStore.getState().reset()
})

// ---------------------------------------------------------------------------
// Placeholder
// ---------------------------------------------------------------------------

describe('placeholder when no meta', () => {
  it('shows game-header-empty when meta is null', () => {
    render(<GameHeader />)
    expect(screen.getByTestId('game-header-empty')).toBeInTheDocument()
  })

  it('does not render game-header when meta is null', () => {
    render(<GameHeader />)
    expect(screen.queryByTestId('game-header')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

describe('player display', () => {
  it('shows white name without Elo when elo is null', () => {
    useAnalysisStore.getState().setMeta(makeMeta({ white: 'Alice', white_elo: null }))
    render(<GameHeader />)
    expect(screen.getByTestId('white-player')).toHaveTextContent('Alice')
    expect(screen.getByTestId('white-player').textContent).not.toContain('(')
  })

  it('shows white name with Elo when present', () => {
    useAnalysisStore.getState().setMeta(makeMeta({ white: 'Alice', white_elo: 2400 }))
    render(<GameHeader />)
    expect(screen.getByTestId('white-player')).toHaveTextContent('Alice (2400)')
  })

  it('shows black name with Elo when present', () => {
    useAnalysisStore.getState().setMeta(makeMeta({ black: 'Bob', black_elo: 2200 }))
    render(<GameHeader />)
    expect(screen.getByTestId('black-player')).toHaveTextContent('Bob (2200)')
  })

  it('shows result', () => {
    useAnalysisStore.getState().setMeta(makeMeta({ result: '0-1' }))
    render(<GameHeader />)
    expect(screen.getByTestId('result')).toHaveTextContent('0-1')
  })
})

// ---------------------------------------------------------------------------
// Date
// ---------------------------------------------------------------------------

describe('date', () => {
  it('shows date when present', () => {
    useAnalysisStore.getState().setMeta(makeMeta({ date: '2024.03.15' }))
    render(<GameHeader />)
    expect(screen.getByTestId('game-date')).toHaveTextContent('2024.03.15')
  })

  it('does not render date element when date is null', () => {
    useAnalysisStore.getState().setMeta(makeMeta({ date: null }))
    render(<GameHeader />)
    expect(screen.queryByTestId('game-date')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Opening badge
// ---------------------------------------------------------------------------

describe('opening badge', () => {
  it('shows combined ECO and name', () => {
    useAnalysisStore.getState().setMeta(makeMeta({ opening_eco: 'A00', opening_name: 'Grob Attack' }))
    render(<GameHeader />)
    expect(screen.getByTestId('opening-badge')).toHaveTextContent('A00 · Grob Attack')
  })

  it('shows only ECO when opening_name is null', () => {
    useAnalysisStore.getState().setMeta(makeMeta({ opening_eco: 'A00', opening_name: null }))
    render(<GameHeader />)
    expect(screen.getByTestId('opening-badge')).toHaveTextContent('A00')
  })

  it('shows only name when opening_eco is null', () => {
    useAnalysisStore.getState().setMeta(makeMeta({ opening_eco: null, opening_name: 'Grob Attack' }))
    render(<GameHeader />)
    expect(screen.getByTestId('opening-badge')).toHaveTextContent('Grob Attack')
  })

  it('does not render opening-badge when both eco and name are null', () => {
    useAnalysisStore.getState().setMeta(makeMeta({ opening_eco: null, opening_name: null }))
    render(<GameHeader />)
    expect(screen.queryByTestId('opening-badge')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Accuracy display
// ---------------------------------------------------------------------------

describe('accuracy colours', () => {
  it('accuracy < 60% shown in red', () => {
    useAnalysisStore.getState().setMeta(makeMeta())
    useAnalysisStore.getState().setAccuracy(55.0, 90.0)
    render(<GameHeader />)
    const whiteEl = screen.getByTestId('white-accuracy')
    expect(whiteEl.style.color).toBe('rgb(202, 52, 49)') // #ca3431
  })

  it('accuracy >= 80% shown in green', () => {
    useAnalysisStore.getState().setMeta(makeMeta())
    useAnalysisStore.getState().setAccuracy(90.0, 55.0)
    render(<GameHeader />)
    const whiteEl = screen.getByTestId('white-accuracy')
    expect(whiteEl.style.color).toBe('rgb(109, 186, 106)') // #6dba6a
  })

  it('accuracy 60-79% shown in amber', () => {
    useAnalysisStore.getState().setMeta(makeMeta())
    useAnalysisStore.getState().setAccuracy(70.0, 90.0)
    render(<GameHeader />)
    const whiteEl = screen.getByTestId('white-accuracy')
    expect(whiteEl.style.color).toBe('rgb(240, 193, 92)') // #f0c15c
  })

  it('boundary: exactly 80% is green', () => {
    useAnalysisStore.getState().setMeta(makeMeta())
    useAnalysisStore.getState().setAccuracy(80.0, null)
    render(<GameHeader />)
    expect(screen.getByTestId('white-accuracy').style.color).toBe('rgb(109, 186, 106)')
  })

  it('boundary: exactly 60% is amber', () => {
    useAnalysisStore.getState().setMeta(makeMeta())
    useAnalysisStore.getState().setAccuracy(60.0, null)
    render(<GameHeader />)
    expect(screen.getByTestId('white-accuracy').style.color).toBe('rgb(240, 193, 92)')
  })

  it('does not render accuracy-row when both are null', () => {
    useAnalysisStore.getState().setMeta(makeMeta())
    render(<GameHeader />)
    expect(screen.queryByTestId('accuracy-row')).toBeNull()
  })

  it('renders only white-accuracy when black is null', () => {
    useAnalysisStore.getState().setMeta(makeMeta())
    useAnalysisStore.getState().setAccuracy(75.0, null)
    render(<GameHeader />)
    expect(screen.getByTestId('white-accuracy')).toBeInTheDocument()
    expect(screen.queryByTestId('black-accuracy')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe('structure', () => {
  it('renders game-header container when meta is set', () => {
    useAnalysisStore.getState().setMeta(makeMeta())
    render(<GameHeader />)
    expect(screen.getByTestId('game-header')).toBeInTheDocument()
  })
})

/**
 * AC gate tests — GameHeader component (Story 5.8).
 *
 * AC: GameHeader displays the White vs Black players, result, opening badge,
 *     and accuracy percentages with correct colour coding from the store.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GameHeader } from '../GameHeader'
import { useAnalysisStore } from '../../store/analysisStore'
import type { GameMeta } from '../../types/analysis'

const SAMPLE_META: GameMeta = {
  white: 'Kasparov',
  black: 'Deep Blue',
  white_elo: 2851,
  black_elo: null,
  result: '1-0',
  date: '1997.05.11',
  opening_eco: 'B90',
  opening_name: 'Sicilian: Najdorf',
}

beforeEach(() => {
  useAnalysisStore.getState().reset()
})

describe('AC: GameHeader meta and accuracy display', () => {
  it('displays white player name with Elo', () => {
    useAnalysisStore.getState().setMeta(SAMPLE_META)
    render(<GameHeader />)
    expect(screen.getByTestId('white-player')).toHaveTextContent('Kasparov (2851)')
  })

  it('displays black player name without Elo when null', () => {
    useAnalysisStore.getState().setMeta(SAMPLE_META)
    render(<GameHeader />)
    expect(screen.getByTestId('black-player')).toHaveTextContent('Deep Blue')
  })

  it('displays opening badge with ECO and name', () => {
    useAnalysisStore.getState().setMeta(SAMPLE_META)
    render(<GameHeader />)
    expect(screen.getByTestId('opening-badge')).toHaveTextContent('B90 · Sicilian: Najdorf')
  })

  it('accuracy >= 80% shown in green', () => {
    useAnalysisStore.getState().setMeta(SAMPLE_META)
    useAnalysisStore.getState().setAccuracy(85.5, 62.0)
    render(<GameHeader />)
    const whiteEl = screen.getByTestId('white-accuracy')
    expect(whiteEl).toHaveTextContent('85.5%')
    expect(whiteEl.style.color).toBe('rgb(109, 186, 106)') // #6dba6a
  })

  it('accuracy 60–79% shown in amber', () => {
    useAnalysisStore.getState().setMeta(SAMPLE_META)
    useAnalysisStore.getState().setAccuracy(85.5, 62.0)
    render(<GameHeader />)
    const blackEl = screen.getByTestId('black-accuracy')
    expect(blackEl).toHaveTextContent('62.0%')
    expect(blackEl.style.color).toBe('rgb(240, 193, 92)') // #f0c15c
  })
})

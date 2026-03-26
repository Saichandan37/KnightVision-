/**
 * EvalBar component supporting tests — clamping, label display, CSS transitions.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EvalBar } from '../EvalBar'

function getHeightPercent(el: HTMLElement): number {
  return parseFloat(el.style.height)
}

// ---------------------------------------------------------------------------
// Height calculation
// ---------------------------------------------------------------------------

describe('height calculation', () => {
  it('evalCp=500 gives White 100% and Black 0%', () => {
    render(<EvalBar evalCp={500} />)
    expect(getHeightPercent(screen.getByTestId('eval-bar-white'))).toBe(100)
    expect(getHeightPercent(screen.getByTestId('eval-bar-black'))).toBe(0)
  })

  it('evalCp=-500 gives White 0% and Black 100%', () => {
    render(<EvalBar evalCp={-500} />)
    expect(getHeightPercent(screen.getByTestId('eval-bar-white'))).toBe(0)
    expect(getHeightPercent(screen.getByTestId('eval-bar-black'))).toBe(100)
  })

  it('evalCp=250 gives White 75%', () => {
    render(<EvalBar evalCp={250} />)
    expect(getHeightPercent(screen.getByTestId('eval-bar-white'))).toBe(75)
  })

  it('white + black heights always sum to 100%', () => {
    for (const cp of [-600, -300, 0, 300, 600]) {
      const { unmount } = render(<EvalBar evalCp={cp} />)
      const w = getHeightPercent(screen.getByTestId('eval-bar-white'))
      const b = getHeightPercent(screen.getByTestId('eval-bar-black'))
      expect(w + b).toBeCloseTo(100)
      unmount()
    }
  })
})

// ---------------------------------------------------------------------------
// Clamping beyond ±500 cp
// ---------------------------------------------------------------------------

describe('clamping beyond ±500 cp', () => {
  it('evalCp=1000 clamps to same height as evalCp=500', () => {
    const { unmount } = render(<EvalBar evalCp={1000} />)
    const w1000 = getHeightPercent(screen.getByTestId('eval-bar-white'))
    unmount()
    render(<EvalBar evalCp={500} />)
    const w500 = getHeightPercent(screen.getByTestId('eval-bar-white'))
    expect(w1000).toBe(w500)
  })

  it('evalCp=-1000 clamps to same height as evalCp=-500', () => {
    const { unmount } = render(<EvalBar evalCp={-1000} />)
    const w1000 = getHeightPercent(screen.getByTestId('eval-bar-white'))
    unmount()
    render(<EvalBar evalCp={-500} />)
    const w500 = getHeightPercent(screen.getByTestId('eval-bar-white'))
    expect(w1000).toBe(w500)
  })
})

// ---------------------------------------------------------------------------
// Numeric label
// ---------------------------------------------------------------------------

describe('numeric label', () => {
  it('evalCp=300 displays "+3.0"', () => {
    render(<EvalBar evalCp={300} />)
    expect(screen.getByTestId('eval-bar-label')).toHaveTextContent('+3.0')
  })

  it('evalCp=-150 displays "-1.5"', () => {
    render(<EvalBar evalCp={-150} />)
    expect(screen.getByTestId('eval-bar-label')).toHaveTextContent('-1.5')
  })

  it('evalCp=0 displays "+0.0" or "0.0" (no negative sign at equality)', () => {
    render(<EvalBar evalCp={0} />)
    const label = screen.getByTestId('eval-bar-label').textContent ?? ''
    expect(label).not.toContain('-')
    expect(label).toContain('0.0')
  })

  it('evalCp=25 displays "+0.3" (rounds to 1 decimal)', () => {
    render(<EvalBar evalCp={25} />)
    expect(screen.getByTestId('eval-bar-label')).toHaveTextContent('+0.3')
  })
})

// ---------------------------------------------------------------------------
// CSS transitions
// ---------------------------------------------------------------------------

describe('CSS transitions', () => {
  it('White section has transition: height 0.3s ease', () => {
    render(<EvalBar evalCp={0} />)
    expect(screen.getByTestId('eval-bar-white').style.transition).toBe('height 0.3s ease')
  })

  it('Black section has transition: height 0.3s ease', () => {
    render(<EvalBar evalCp={0} />)
    expect(screen.getByTestId('eval-bar-black').style.transition).toBe('height 0.3s ease')
  })
})

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe('structure', () => {
  it('renders outer eval-bar container', () => {
    render(<EvalBar evalCp={0} />)
    expect(screen.getByTestId('eval-bar')).toBeInTheDocument()
  })
})

/**
 * AC gate tests — EvalBar component (Story 5.5).
 *
 * AC: <EvalBar evalCp={300} /> renders White section height > 50% and Black < 50%;
 *     <EvalBar evalCp={-300} /> renders White section height < 50%;
 *     <EvalBar evalCp={0} /> renders both sections at 50%.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EvalBar } from '../EvalBar'

function getHeightPercent(el: HTMLElement): number {
  return parseFloat(el.style.height)
}

describe('AC: EvalBar height proportions', () => {
  it('evalCp=300: White section > 50% and Black section < 50%', () => {
    render(<EvalBar evalCp={300} />)
    const white = screen.getByTestId('eval-bar-white')
    const black = screen.getByTestId('eval-bar-black')
    expect(getHeightPercent(white)).toBeGreaterThan(50)
    expect(getHeightPercent(black)).toBeLessThan(50)
  })

  it('evalCp=-300: White section < 50%', () => {
    render(<EvalBar evalCp={-300} />)
    const white = screen.getByTestId('eval-bar-white')
    expect(getHeightPercent(white)).toBeLessThan(50)
  })

  it('evalCp=0: both sections at exactly 50%', () => {
    render(<EvalBar evalCp={0} />)
    const white = screen.getByTestId('eval-bar-white')
    const black = screen.getByTestId('eval-bar-black')
    expect(getHeightPercent(white)).toBe(50)
    expect(getHeightPercent(black)).toBe(50)
  })
})

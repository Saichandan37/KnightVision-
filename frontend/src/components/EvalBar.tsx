export interface EvalBarProps {
  /** Centipawn evaluation: positive = White advantage, negative = Black advantage. */
  evalCp: number
}

/**
 * Vertical evaluation bar — White at bottom (grows upward), Black at top.
 *
 * Display range: ±500 cp → 0%–100%.
 * Beyond ±500 cp: clamped to 5%/95% so neither side fully disappears.
 * Conversion: whitePercent = 50 + (clamp(evalCp, -500, 500) / 500) * 50
 */
export function EvalBar({ evalCp }: EvalBarProps) {
  const clamped = Math.max(-500, Math.min(500, evalCp))
  const whitePercent = 50 + (clamped / 500) * 50
  const blackPercent = 100 - whitePercent

  const sign = evalCp > 0 ? '+' : evalCp < 0 ? '-' : ''
  const displayPawns = `${sign}${(Math.abs(evalCp) / 100).toFixed(1)}`

  return (
    <div
      data-testid="eval-bar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '24px',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Black section — top */}
      <div
        data-testid="eval-bar-black"
        style={{
          backgroundColor: '#1a1a1a',
          height: `${blackPercent}%`,
          transition: 'height 0.3s ease',
        }}
      />
      {/* White section — bottom */}
      <div
        data-testid="eval-bar-white"
        style={{
          backgroundColor: '#f0f0f0',
          height: `${whitePercent}%`,
          transition: 'height 0.3s ease',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <span
          data-testid="eval-bar-label"
          style={{ fontSize: '10px', color: '#333', paddingBottom: '2px' }}
        >
          {displayPawns}
        </span>
      </div>
    </div>
  )
}

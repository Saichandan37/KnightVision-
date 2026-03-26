import { useAnalysisStore } from '../store/analysisStore'

function accuracyColor(accuracy: number): string {
  if (accuracy >= 80) return '#6dba6a'
  if (accuracy >= 60) return '#f0c15c'
  return '#ca3431'
}

/**
 * Game header showing White vs Black names, Elo, result, date, opening badge,
 * and accuracy percentages for both players.
 *
 * Reads meta, whiteAccuracy, blackAccuracy from useAnalysisStore.
 */
export function GameHeader() {
  const meta = useAnalysisStore((state) => state.meta)
  const whiteAccuracy = useAnalysisStore((state) => state.whiteAccuracy)
  const blackAccuracy = useAnalysisStore((state) => state.blackAccuracy)

  if (!meta) {
    return (
      <div
        data-testid="game-header-empty"
        style={{ padding: '12px', color: '#888', fontStyle: 'italic' }}
      >
        No game loaded
      </div>
    )
  }

  const whiteLabel =
    meta.white_elo != null ? `${meta.white} (${meta.white_elo})` : meta.white
  const blackLabel =
    meta.black_elo != null ? `${meta.black} (${meta.black_elo})` : meta.black

  const openingBadge =
    meta.opening_eco != null && meta.opening_name != null
      ? `${meta.opening_eco} · ${meta.opening_name}`
      : meta.opening_eco ?? meta.opening_name ?? null

  return (
    <div
      data-testid="game-header"
      style={{ padding: '12px', fontSize: '14px' }}
    >
      {/* Players row */}
      <div
        data-testid="players-row"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}
      >
        <span data-testid="white-player">{whiteLabel}</span>
        <span data-testid="result" style={{ color: '#aaa', fontWeight: 600 }}>
          {meta.result}
        </span>
        <span data-testid="black-player">{blackLabel}</span>
      </div>

      {/* Date */}
      {meta.date != null && (
        <div
          data-testid="game-date"
          style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}
        >
          {meta.date}
        </div>
      )}

      {/* Opening badge */}
      {openingBadge != null && (
        <div
          data-testid="opening-badge"
          style={{
            display: 'inline-block',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '3px',
            backgroundColor: '#333',
            color: '#ccc',
            marginBottom: '8px',
          }}
        >
          {openingBadge}
        </div>
      )}

      {/* Accuracy row */}
      {(whiteAccuracy != null || blackAccuracy != null) && (
        <div
          data-testid="accuracy-row"
          style={{ display: 'flex', gap: '16px', fontSize: '13px' }}
        >
          {whiteAccuracy != null && (
            <span
              data-testid="white-accuracy"
              style={{ color: accuracyColor(whiteAccuracy) }}
            >
              White {whiteAccuracy.toFixed(1)}%
            </span>
          )}
          {blackAccuracy != null && (
            <span
              data-testid="black-accuracy"
              style={{ color: accuracyColor(blackAccuracy) }}
            >
              Black {blackAccuracy.toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  )
}

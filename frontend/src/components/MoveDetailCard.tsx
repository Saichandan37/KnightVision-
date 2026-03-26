import type { MoveCategory, MoveResult } from '../types/analysis'

const CATEGORY_COLORS: Record<MoveCategory, string> = {
  brilliant: '#1baaa6',
  great: '#5ca0d3',
  best: '#6dba6a',
  good: '#96bc4b',
  inaccuracy: '#f0c15c',
  mistake: '#e8834e',
  blunder: '#ca3431',
}

/**
 * Foreground text colour that achieves ≥ 4.5:1 WCAG AA contrast on each
 * badge background. Computed ratios (against #0a0a0a or #fff):
 *
 * | Category   | Background | Text     | Contrast |
 * |------------|-----------|----------|----------|
 * | brilliant  | #1baaa6   | #0a0a0a  | 6.93:1 ✓ |
 * | great      | #5ca0d3   | #0a0a0a  | 7.00:1 ✓ |
 * | best       | #6dba6a   | #0a0a0a  | 8.37:1 ✓ |
 * | good       | #96bc4b   | #0a0a0a  | 9.04:1 ✓ |
 * | inaccuracy | #f0c15c   | #0a0a0a  |11.80:1 ✓ |
 * | mistake    | #e8834e   | #0a0a0a  | 7.34:1 ✓ |
 * | blunder    | #ca3431   | #fff     | 5.20:1 ✓ |
 */
const BADGE_TEXT_COLORS: Record<MoveCategory, string> = {
  brilliant: '#0a0a0a',
  great: '#0a0a0a',
  best: '#0a0a0a',
  good: '#0a0a0a',
  inaccuracy: '#0a0a0a',
  mistake: '#0a0a0a',
  blunder: '#fff',
}

const CATEGORY_LABELS: Record<MoveCategory, string> = {
  brilliant: 'Brilliant',
  great: 'Great',
  best: 'Best',
  good: 'Good',
  inaccuracy: 'Inaccuracy',
  mistake: 'Mistake',
  blunder: 'Blunder',
}

export interface MoveDetailCardProps {
  /** The currently selected move, or null when no move is selected (index === -1). */
  move: MoveResult | null
}

/**
 * Displays the full annotation for the selected move:
 * category badge, eval before→after, cp_loss, coaching comment, comment source tag,
 * and top 3 candidate moves.
 *
 * Shows a placeholder when no move is selected.
 */
export function MoveDetailCard({ move }: MoveDetailCardProps) {
  if (!move) {
    return (
      <div
        data-testid="move-detail-card-empty"
        style={{ padding: '16px', color: '#888', textAlign: 'center', fontStyle: 'italic' }}
      >
        Select a move to see analysis
      </div>
    )
  }

  const badgeColor = CATEGORY_COLORS[move.category]
  const badgeTextColor = BADGE_TEXT_COLORS[move.category]
  const badgeLabel = CATEGORY_LABELS[move.category]

  const fmtCp = (cp: number) => {
    const sign = cp >= 0 ? '+' : ''
    return `${sign}${(cp / 100).toFixed(1)}`
  }

  return (
    <div
      data-testid="move-detail-card"
      style={{ padding: '16px', animation: 'fadeIn 0.2s ease' }}
    >
      {/* Category badge */}
      <div
        data-testid="category-badge"
        data-color={badgeColor}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: badgeColor,
          color: badgeTextColor,
          borderRadius: '4px',
          padding: '3px 10px',
          marginBottom: '12px',
        }}
      >
        <span data-testid="badge-label" style={{ fontWeight: 600, fontSize: '14px' }}>
          {badgeLabel}
        </span>
      </div>

      {/* Eval before → after + cp_loss */}
      <div
        data-testid="eval-display"
        style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}
      >
        {fmtCp(move.eval_before_cp)} → {fmtCp(move.eval_after_cp)}
        {move.cp_loss > 0 && (
          <span
            data-testid="cp-loss"
            style={{ marginLeft: '8px', color: '#f0c15c' }}
          >
            (−{move.cp_loss} cp)
          </span>
        )}
      </div>

      {/* Coaching comment — primary visual element */}
      <p
        data-testid="comment"
        style={{ fontSize: '16px', lineHeight: 1.5, marginBottom: '12px', color: '#e0e0e0' }}
      >
        {move.comment}
      </p>

      {/* Comment source tag */}
      <div style={{ marginBottom: '12px' }}>
        <span
          data-testid="comment-source"
          style={{
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '3px',
            backgroundColor: move.comment_source === 'llm' ? '#4a90e2' : '#666',
            color: '#fff',
          }}
        >
          {move.comment_source === 'llm' ? 'AI' : 'Template'}
        </span>
      </div>

      {/* Top candidate moves (up to 3) */}
      {move.top_candidates.length > 0 && (
        <div data-testid="top-candidates">
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Top moves</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {move.top_candidates.slice(0, 3).map((candidate, i) => (
              <li
                key={i}
                data-testid={`candidate-${i}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  padding: '2px 0',
                }}
              >
                <span data-testid={`candidate-san-${i}`}>{candidate.san}</span>
                <span data-testid={`candidate-cp-${i}`} style={{ color: '#aaa' }}>
                  {fmtCp(candidate.centipawns)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

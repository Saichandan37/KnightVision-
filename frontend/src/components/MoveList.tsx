import { useEffect, useRef } from 'react'
import type { MoveCategory, MoveResult } from '../types/analysis'

/** Badge colours matching MoveCategory — from project-context.md §6. */
const CATEGORY_COLORS: Record<MoveCategory, string> = {
  brilliant: '#1baaa6',
  great: '#5ca0d3',
  best: '#6dba6a',
  good: '#96bc4b',
  inaccuracy: '#f0c15c',
  mistake: '#e8834e',
  blunder: '#ca3431',
}

export interface MoveListProps {
  moves: MoveResult[]
  /** -1 = starting position (no move selected). */
  currentMoveIndex: number
  goToMove: (index: number) => void
  /**
   * Total expected move count. When provided and moves.length < totalMoves,
   * placeholder "Analysing…" rows are rendered for moves not yet computed.
   */
  totalMoves?: number
}

interface MovePair {
  moveNumber: number
  white?: MoveResult
  black?: MoveResult
}

function buildPairs(moves: MoveResult[], totalMoves?: number): MovePair[] {
  const count = totalMoves ?? moves.length
  const pairCount = Math.ceil(count / 2)

  const pairs: MovePair[] = Array.from({ length: pairCount }, (_, i) => ({
    moveNumber: i + 1,
  }))

  for (const move of moves) {
    const pi = Math.floor(move.move_index / 2)
    if (pi < pairs.length) {
      if (move.move_index % 2 === 0) {
        pairs[pi].white = move
      } else {
        pairs[pi].black = move
      }
    }
  }

  return pairs
}

export function MoveList({ moves, currentMoveIndex, goToMove, totalMoves }: MoveListProps) {
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map())

  // Auto-scroll to keep the current move visible
  useEffect(() => {
    if (currentMoveIndex >= 0) {
      itemRefs.current.get(currentMoveIndex)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentMoveIndex])

  function setRef(el: HTMLElement | null, index: number) {
    if (el) {
      itemRefs.current.set(index, el)
    } else {
      itemRefs.current.delete(index)
    }
  }

  const pairs = buildPairs(moves, totalMoves)

  return (
    <div
      data-testid="move-list"
      style={{ overflowY: 'auto', height: '100%', padding: '4px', fontFamily: 'monospace' }}
    >
      {pairs.map((pair) => {
        const whiteActive = currentMoveIndex === pair.white?.move_index
        const blackActive = currentMoveIndex === pair.black?.move_index

        return (
          <div
            key={pair.moveNumber}
            data-testid="move-pair"
            style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '2px' }}
          >
            {/* Move number */}
            <span
              style={{ color: '#888', minWidth: '30px', fontSize: '13px', textAlign: 'right', paddingRight: '4px' }}
            >
              {pair.moveNumber}.
            </span>

            {/* White's move */}
            {pair.white ? (
              <button
                data-testid={`move-item-${pair.white.move_index}`}
                data-active={whiteActive}
                className={whiteActive ? 'move-item move-item--active' : 'move-item'}
                aria-label={`Move ${pair.white.move_number}: ${pair.white.san}, ${pair.white.category}`}
                aria-pressed={whiteActive}
                ref={(el) => setRef(el, pair.white!.move_index)}
                onClick={() => goToMove(pair.white!.move_index)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: whiteActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  borderRadius: '3px',
                  fontSize: '13px',
                  minWidth: '70px',
                  color: 'inherit',
                }}
              >
                <span
                  data-color={CATEGORY_COLORS[pair.white.category]}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: CATEGORY_COLORS[pair.white.category],
                    flexShrink: 0,
                  }}
                />
                {pair.white.san}
              </button>
            ) : (
              <span
                data-testid="move-placeholder"
                style={{ color: '#555', padding: '2px 8px', fontSize: '13px', minWidth: '70px' }}
              >
                Analysing…
              </span>
            )}

            {/* Black's move */}
            {pair.black ? (
              <button
                data-testid={`move-item-${pair.black.move_index}`}
                data-active={blackActive}
                className={blackActive ? 'move-item move-item--active' : 'move-item'}
                aria-label={`Move ${pair.black.move_number}: ${pair.black.san}, ${pair.black.category}`}
                aria-pressed={blackActive}
                ref={(el) => setRef(el, pair.black!.move_index)}
                onClick={() => goToMove(pair.black!.move_index)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: blackActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  borderRadius: '3px',
                  fontSize: '13px',
                  minWidth: '70px',
                  color: 'inherit',
                }}
              >
                <span
                  data-color={CATEGORY_COLORS[pair.black.category]}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: CATEGORY_COLORS[pair.black.category],
                    flexShrink: 0,
                  }}
                />
                {pair.black.san}
              </button>
            ) : totalMoves && pair.moveNumber * 2 <= totalMoves ? (
              <span
                data-testid="move-placeholder"
                style={{ color: '#555', padding: '2px 8px', fontSize: '13px', minWidth: '70px' }}
              >
                Analysing…
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

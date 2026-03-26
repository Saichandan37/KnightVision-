import { useRef } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Arrow, Square } from 'react-chessboard/dist/chessboard/types'

export interface BoardProps {
  /** FEN string for the current position. */
  fen: string
  /** UCI move string for the best-move arrow (e.g. "e2e4"). Null hides the arrow. */
  bestMoveUci: string | null
  /** Whether to show the best-move arrow. Arrow is also hidden during auto-play. */
  showArrow: boolean
  /** When true (auto-play mode), the best-move arrow is suppressed. */
  isPlaying?: boolean
  /** Optional callback when a square is clicked (read-only board — for analysis UI only). */
  onSquareClick?: (square: string) => void
  /** Swipe left (→ next move) callback. Minimum swipe distance: 50px. */
  onSwipeLeft?: () => void
  /** Swipe right (→ prev move) callback. Minimum swipe distance: 50px. */
  onSwipeRight?: () => void
}

/**
 * Animated chessboard component (Phase 1).
 *
 * - White always at bottom
 * - Read-only: pieces are not draggable
 * - Best-move arrow shown when showArrow=true, isPlaying=false, bestMoveUci is set
 * - Piece animations handled natively by react-chessboard v4
 */
const SWIPE_THRESHOLD = 50

export function Board({
  fen,
  bestMoveUci,
  showArrow,
  isPlaying = false,
  onSquareClick,
  onSwipeLeft,
  onSwipeRight,
}: BoardProps) {
  const touchStartXRef = useRef<number | null>(null)

  const arrows: Arrow[] = []

  if (showArrow && !isPlaying && bestMoveUci && bestMoveUci.length >= 4) {
    const from = bestMoveUci.slice(0, 2) as Square
    const to = bestMoveUci.slice(2, 4) as Square
    arrows.push([from, to, 'rgba(0, 128, 0, 0.65)'])
  }

  return (
    <div
      data-testid="board-container"
      className="w-full"
      onTouchStart={(e) => {
        touchStartXRef.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (touchStartXRef.current === null) return
        const delta = e.changedTouches[0].clientX - touchStartXRef.current
        touchStartXRef.current = null
        if (delta < -SWIPE_THRESHOLD) onSwipeLeft?.()
        else if (delta > SWIPE_THRESHOLD) onSwipeRight?.()
      }}
    >
      <Chessboard
        position={fen}
        customArrows={arrows}
        arePiecesDraggable={false}
        boardOrientation="white"
        onSquareClick={onSquareClick ? (sq) => onSquareClick(sq) : undefined}
      />
    </div>
  )
}

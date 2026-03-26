import { useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import { useAnalysisStore } from '../store/analysisStore'
import { usePlayback } from '../hooks/usePlayback'
import { Board } from './Board'
import { EvalBar } from './EvalBar'
import { MoveList } from './MoveList'
import { MoveDetailCard } from './MoveDetailCard'
import { GameHeader } from './GameHeader'
import { BottomSheet } from './BottomSheet'
import { LLMProviderSelector } from './LLMProviderSelector'
import type { MoveResult } from '../types/analysis'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function computeFen(moves: MoveResult[], upToIndex: number): string {
  if (upToIndex < 0 || moves.length === 0) return START_FEN
  try {
    const chess = new Chess()
    for (let i = 0; i <= upToIndex && i < moves.length; i++) {
      chess.move(moves[i].san)
    }
    return chess.fen()
  } catch {
    return START_FEN
  }
}

/**
 * Main game review layout.
 *
 * Desktop (≥768px): board + eval bar left, move list right, move detail
 * below board, game header + provider selector at top.
 *
 * Mobile (<768px): board full width at top, playback controls below,
 * move detail in a bottom sheet, move list hidden by default with a
 * floating toggle button.
 *
 * Tailwind `md:` prefix used exclusively — no custom media queries.
 */
export function ReviewLayout() {
  const moves = useAnalysisStore((state) => state.moves)
  const [showMoveList, setShowMoveList] = useState(false)

  const {
    currentMoveIndex,
    isPlaying,
    play,
    pause,
    next,
    prev,
    goToMove,
    goToStart,
    goToEnd,
  } = usePlayback(moves.length)

  const currentMove = currentMoveIndex >= 0 ? (moves[currentMoveIndex] ?? null) : null
  const fen = useMemo(
    () => computeFen(moves, currentMoveIndex),
    [moves, currentMoveIndex],
  )
  const evalCp = currentMove?.eval_after_cp ?? 0

  const position =
    currentMoveIndex === -1
      ? `Start / ${moves.length}`
      : `Move ${currentMoveIndex + 1} / ${moves.length}`

  return (
    <div
      data-testid="review-layout"
      className="min-h-screen bg-gray-950 text-white flex flex-col"
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 flex-shrink-0">
        <div className="flex-1 min-w-0">
          <GameHeader />
        </div>
        {/* Provider selector: top bar on desktop, hidden on mobile */}
        <div className="hidden md:block ml-4">
          <LLMProviderSelector />
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

        {/* Board column */}
        <div className="w-full md:w-1/2 flex flex-col flex-shrink-0">

          {/* Board + Eval bar row */}
          <div className="flex">
            <EvalBar evalCp={evalCp} />
            <div className="flex-1">
              <Board
                fen={fen}
                bestMoveUci={currentMove?.best_move_uci ?? null}
                showArrow={!isPlaying}
                isPlaying={isPlaying}
                onSwipeLeft={next}
                onSwipeRight={prev}
              />
            </div>
          </div>

          {/* Playback controls */}
          <div
            data-testid="playback-controls"
            className="flex items-center gap-2 px-2 py-2 flex-shrink-0"
          >
            <button
              data-testid="btn-go-to-start"
              onClick={goToStart}
              aria-label="Go to start"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#fff', minHeight: '44px', minWidth: '44px' }}
            >
              ⏮
            </button>
            <button
              data-testid="btn-prev"
              onClick={prev}
              aria-label="Previous move"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#fff', minHeight: '44px', minWidth: '44px' }}
            >
              ◀
            </button>
            <button
              data-testid="btn-play-pause"
              onClick={isPlaying ? pause : play}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#fff', minHeight: '44px', minWidth: '44px' }}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              data-testid="btn-next"
              onClick={next}
              aria-label="Next move"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#fff', minHeight: '44px', minWidth: '44px' }}
            >
              ▶
            </button>
            <button
              data-testid="btn-go-to-end"
              onClick={goToEnd}
              aria-label="Go to end"
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#fff', minHeight: '44px', minWidth: '44px' }}
            >
              ⏭
            </button>
            <span
              data-testid="move-counter"
              style={{ fontSize: '13px', color: '#aaa', marginLeft: '8px' }}
            >
              {position}
            </span>
          </div>

          {/* Move detail — desktop only (below board) */}
          <div className="hidden md:block flex-1 overflow-y-auto">
            <MoveDetailCard move={currentMove} />
          </div>
        </div>

        {/* Move list — desktop always visible, mobile toggleable */}
        <div
          data-testid="move-list-panel"
          className={`md:flex md:flex-col md:w-1/2 md:overflow-y-auto ${showMoveList ? 'flex flex-col' : 'hidden md:flex'}`}
        >
          <MoveList
            moves={moves}
            totalMoves={moves.length}
            currentMoveIndex={currentMoveIndex}
            goToMove={goToMove}
          />
        </div>
      </div>

      {/* ── Mobile bottom sheet (move detail) ── */}
      <div className="md:hidden">
        <BottomSheet>
          <MoveDetailCard move={currentMove} />
        </BottomSheet>
      </div>

      {/* ── Mobile: floating move-list toggle + provider selector ── */}
      <div className="md:hidden fixed bottom-16 right-3 z-20 flex flex-col gap-2 items-end">
        <button
          data-testid="btn-toggle-move-list"
          onClick={() => setShowMoveList((v) => !v)}
          aria-label={showMoveList ? 'Hide move list' : 'Show move list'}
          style={{
            minHeight: '44px',
            minWidth: '44px',
            borderRadius: '50%',
            backgroundColor: '#333',
            color: '#fff',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          {showMoveList ? '✕' : '≡'}
        </button>
      </div>
    </div>
  )
}

import { useAnalysisStore } from '../store/analysisStore'
import { usePlayback } from '../hooks/usePlayback'

/**
 * Playback control bar for chess game review.
 *
 * Wires ⏮ ◀ ⏸/▶ ▶ ⏭ buttons to usePlayback actions.
 * Displays "Move X / Y" counter (or "Start / Y" before any move is selected).
 * Reads total move count from useAnalysisStore.
 */
export function PlaybackControls() {
  const moves = useAnalysisStore((state) => state.moves)
  const total = moves.length

  const {
    currentMoveIndex,
    isPlaying,
    play,
    pause,
    next,
    prev,
    goToStart,
    goToEnd,
  } = usePlayback(total)

  const position =
    currentMoveIndex === -1
      ? `Start / ${total}`
      : `Move ${currentMoveIndex + 1} / ${total}`

  return (
    <div
      data-testid="playback-controls"
      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px' }}
    >
      <button
        data-testid="btn-go-to-start"
        onClick={goToStart}
        title="Go to start"
        aria-label="Go to start"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
      >
        ⏮
      </button>

      <button
        data-testid="btn-prev"
        onClick={prev}
        title="Previous move"
        aria-label="Previous move"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
      >
        ◀
      </button>

      <button
        data-testid="btn-play-pause"
        onClick={isPlaying ? pause : play}
        title={isPlaying ? 'Pause' : 'Play'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      <button
        data-testid="btn-next"
        onClick={next}
        title="Next move"
        aria-label="Next move"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
      >
        ▶
      </button>

      <button
        data-testid="btn-go-to-end"
        onClick={goToEnd}
        title="Go to end"
        aria-label="Go to end"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
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
  )
}

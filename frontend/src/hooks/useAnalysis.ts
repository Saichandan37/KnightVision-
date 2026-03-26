import { useState, useEffect, useRef, useCallback } from 'react'
import { useAnalysisStore } from '../store/analysisStore'
import type { MoveResult } from '../types/analysis'

/** How long without a message before the stall is declared (ms). */
export const STALL_THRESHOLD_MS = 30_000

/** How often to run the stall check (ms). */
export const STALL_CHECK_INTERVAL_MS = 5_000

/** Message shown in the stall banner. */
export const STALL_MESSAGE =
  'Analysis is taking longer than expected — check your Stockfish installation'

function buildWsUrl(gameId: string): string {
  const override = import.meta.env['VITE_WS_URL'] as string | undefined
  if (override) return `${override}/ws/analysis/${gameId}`
  const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${scheme}://${window.location.host}/ws/analysis/${gameId}`
}

/**
 * Manages the full upload → WebSocket → store flow.
 *
 * Usage:
 *   const { uploadPgn, analysisStatus, shouldAnimate, cleanup } = useAnalysis()
 *   await uploadPgn(pgnText)   // POSTs, then opens WS and streams into store
 *
 * Stall detection (from Story 4.3):
 *   Every STALL_CHECK_INTERVAL_MS ms the hook checks whether
 *   Date.now() - lastMessageAt > STALL_THRESHOLD_MS.  If so, and the
 *   current store status is "analysing", it transitions to "stalled".
 *   The stall timer is cleared when the WebSocket closes normally.
 *
 * Animation flag:
 *   shouldAnimate is set to true only for live (buffered=false) moves.
 *   Buffered replay messages do NOT change shouldAnimate.
 */
export function useAnalysis() {
  const { setGameId, appendMove, setStatus, setAccuracy } = useAnalysisStore()
  const analysisStatus = useAnalysisStore((state) => state.analysisStatus)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  const lastMessageAt = useRef<number>(0)
  const wsRef = useRef<WebSocket | null>(null)
  const stallTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (stallTimerRef.current !== null) {
      clearInterval(stallTimerRef.current)
      stallTimerRef.current = null
    }
  }, []) // refs are stable — empty deps is intentional

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup])

  const uploadPgn = useCallback(
    async (pgnText: string): Promise<void> => {
      cleanup() // close any existing connection first
      setStatus('uploading')

      let gameId: string
      try {
        const apiBase = ((import.meta.env['VITE_API_BASE_URL'] as string | undefined) ?? '').replace(/\/$/, '')
        const resp = await fetch(`${apiBase}/api/analysis/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pgn_text: pgnText }),
        })
        if (!resp.ok) {
          setStatus('error')
          return
        }
        const data = (await resp.json()) as { game_id: string }
        gameId = data.game_id
      } catch {
        setStatus('error')
        return
      }

      setGameId(gameId)
      lastMessageAt.current = Date.now()

      const ws = new WebSocket(buildWsUrl(gameId))
      wsRef.current = ws

      // Stall detector — fires every STALL_CHECK_INTERVAL_MS while the socket is open.
      stallTimerRef.current = setInterval(() => {
        const current = useAnalysisStore.getState().analysisStatus
        if (
          current === 'analysing' &&
          Date.now() - lastMessageAt.current > STALL_THRESHOLD_MS
        ) {
          setStatus('stalled')
        }
      }, STALL_CHECK_INTERVAL_MS)

      ws.onmessage = (event: MessageEvent<string>) => {
        lastMessageAt.current = Date.now()
        const msg = JSON.parse(event.data) as Record<string, unknown>

        if (msg['type'] === 'heartbeat') return

        if (msg['type'] === 'error') {
          setStatus('error')
          return
        }

        if (msg['type'] === 'analysis_complete') {
          setAccuracy(
            msg['white_accuracy'] as number,
            msg['black_accuracy'] as number,
          )
          setStatus('complete')
          cleanup()
          return
        }

        // move_result — buffered or live
        appendMove(msg as unknown as MoveResult)
        // Only live moves trigger board animation; buffered replay does not.
        if (!(msg['buffered'] as boolean)) {
          setShouldAnimate(true)
        }
        setStatus('analysing')
      }

      ws.onerror = () => setStatus('error')

      ws.onclose = () => {
        if (stallTimerRef.current !== null) {
          clearInterval(stallTimerRef.current)
          stallTimerRef.current = null
        }
      }
    },
    [cleanup, setGameId, appendMove, setStatus, setAccuracy],
  )

  return { uploadPgn, analysisStatus, shouldAnimate, cleanup }
}

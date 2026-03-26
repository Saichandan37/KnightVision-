import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Playback state machine for chess game review.
 *
 * - currentMoveIndex starts at -1 (starting board position, no moves played)
 * - Auto-play advances by 1 every playbackSpeed ms; stops automatically at last move
 * - Manual navigation (next/prev/goToMove/goToStart/goToEnd) pauses auto-play
 * - Keyboard bindings on document: ArrowRight, ArrowLeft, Space, Home, End
 */
export function usePlayback(moveCount: number = 0) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1000)

  // Keep ref in sync so interval callback always has latest moveCount
  const moveCountRef = useRef(moveCount)
  moveCountRef.current = moveCount

  // Keep ref for isPlaying so keydown handler doesn't go stale
  const isPlayingRef = useRef(isPlaying)
  isPlayingRef.current = isPlaying

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying) return

    const id = setInterval(() => {
      setCurrentMoveIndex((prev) => {
        if (prev >= moveCountRef.current - 1) return prev // already at end
        return prev + 1
      })
    }, playbackSpeed)

    return () => clearInterval(id)
  }, [isPlaying, playbackSpeed])

  // Stop auto-play when last move is reached
  useEffect(() => {
    if (isPlaying && moveCount > 0 && currentMoveIndex >= moveCount - 1) {
      setIsPlaying(false)
    }
  }, [currentMoveIndex, isPlaying, moveCount])

  const play = useCallback(() => {
    if (moveCountRef.current === 0) return
    setIsPlaying(true)
  }, [])

  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const next = useCallback(() => {
    setIsPlaying(false)
    setCurrentMoveIndex((prev) => Math.min(prev + 1, moveCountRef.current - 1))
  }, [])

  const prev = useCallback(() => {
    setIsPlaying(false)
    setCurrentMoveIndex((prev) => Math.max(prev - 1, -1))
  }, [])

  const goToMove = useCallback((index: number) => {
    setIsPlaying(false)
    setCurrentMoveIndex(Math.max(-1, Math.min(index, moveCountRef.current - 1)))
  }, [])

  const goToStart = useCallback(() => {
    setIsPlaying(false)
    setCurrentMoveIndex(-1)
  }, [])

  const goToEnd = useCallback(() => {
    setIsPlaying(false)
    setCurrentMoveIndex(moveCountRef.current - 1)
  }, [])

  // Keyboard bindings
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
          e.preventDefault()
          prev()
          break
        case ' ':
          e.preventDefault()
          if (isPlayingRef.current) pause()
          else play()
          break
        case 'Home':
          e.preventDefault()
          goToStart()
          break
        case 'End':
          e.preventDefault()
          goToEnd()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [play, pause, next, prev, goToStart, goToEnd])

  return {
    currentMoveIndex,
    isPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    play,
    pause,
    next,
    prev,
    goToMove,
    goToStart,
    goToEnd,
  }
}

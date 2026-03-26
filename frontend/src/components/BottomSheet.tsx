import { useState, useRef } from 'react'

interface BottomSheetProps {
  children: React.ReactNode
}

/**
 * Mobile-first bottom sheet panel.
 *
 * On mobile: fixed to the bottom of the viewport, slide-up / slide-down via
 * drag handle or touch drag. Default state shows ~40% of the viewport.
 *
 * On desktop (md+): renders as a regular in-flow block (no fixed positioning).
 *
 * Tailwind md: prefix used exclusively — no custom media queries.
 */
export function BottomSheet({ children }: BottomSheetProps) {
  const [expanded, setExpanded] = useState(false)
  const touchStartYRef = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return
    const delta = e.changedTouches[0].clientY - touchStartYRef.current
    touchStartYRef.current = null
    if (delta < -40) setExpanded(true)   // drag up → expand
    if (delta > 40) setExpanded(false)   // drag down → collapse
  }

  return (
    <div
      data-testid="bottom-sheet"
      data-expanded={expanded}
      className="
        fixed bottom-0 left-0 right-0 z-10
        bg-gray-900 rounded-t-2xl
        transition-[max-height] duration-300 ease-in-out overflow-y-auto
        md:relative md:rounded-none md:bg-transparent
      "
      style={{
        maxHeight: expanded ? '80vh' : '44vh',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle — mobile only */}
      <div
        data-testid="bottom-sheet-handle"
        className="flex justify-center py-2 cursor-pointer md:hidden"
        onClick={() => setExpanded(!expanded)}
        role="button"
        aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
      >
        <div className="w-10 h-1 bg-gray-600 rounded-full" />
      </div>

      <div className="pb-4">{children}</div>
    </div>
  )
}

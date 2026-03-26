import { STALL_MESSAGE } from '../hooks/useAnalysis'

interface StallBannerProps {
  /** Called when the user manually dismisses the banner. */
  onDismiss: () => void
}

/**
 * Non-auto-dismissing stall warning banner.
 *
 * Render this when `useAnalysis().status === 'stalled'`.
 * The banner MUST NOT auto-dismiss — users must close it manually.
 */
export function StallBanner({ onDismiss }: StallBannerProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center gap-4 rounded border border-yellow-500 bg-yellow-950 px-4 py-3 text-yellow-200"
    >
      <span className="flex-1">{STALL_MESSAGE}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss stall warning"
        className="shrink-0 text-yellow-400 hover:text-yellow-200"
      >
        ✕
      </button>
    </div>
  )
}

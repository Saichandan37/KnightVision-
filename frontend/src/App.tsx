import { useAnalysisStore } from './store/analysisStore'
import { useAnalysis } from './hooks/useAnalysis'
import { UploadZone } from './components/UploadZone'
import { ReviewLayout } from './components/ReviewLayout'

function App() {
  // useAnalysis is hoisted here so the WebSocket survives the
  // UploadZone → ReviewLayout transition (unmounting UploadZone
  // would otherwise close the socket mid-analysis).
  const { uploadPgn } = useAnalysis()
  const gameId = useAnalysisStore((state) => state.gameId)

  return gameId ? <ReviewLayout /> : (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-6">KnightVision</h1>
      <UploadZone uploadPgn={uploadPgn} />
    </div>
  )
}

export default App

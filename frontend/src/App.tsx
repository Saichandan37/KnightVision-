import { useAnalysisStore } from './store/analysisStore'
import { UploadZone } from './components/UploadZone'
import { ReviewLayout } from './components/ReviewLayout'

function App() {
  const gameId = useAnalysisStore((state) => state.gameId)

  return gameId ? <ReviewLayout /> : (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-6">KnightVision</h1>
      <UploadZone />
    </div>
  )
}

export default App

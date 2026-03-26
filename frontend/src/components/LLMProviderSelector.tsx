import { useAnalysisStore } from '../store/analysisStore'
import type { LLMProvider } from '../store/analysisStore'

const PROVIDERS: { value: LLMProvider; label: string }[] = [
  { value: 'ollama', label: 'Ollama (local)' },
  { value: 'groq', label: 'Groq' },
  { value: 'huggingface', label: 'HuggingFace' },
]

/**
 * Dropdown to switch the active LLM provider.
 * Shown in the top bar on desktop; collapsible in the mobile header.
 */
export function LLMProviderSelector() {
  const activeProvider = useAnalysisStore((state) => state.activeProvider)
  const setActiveProvider = useAnalysisStore((state) => state.setActiveProvider)
  const providerHealth = useAnalysisStore((state) => state.providerHealth)

  return (
    <div data-testid="llm-provider-selector" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <label
        htmlFor="provider-select"
        style={{ fontSize: '12px', color: '#aaa' }}
      >
        Provider
      </label>
      <select
        id="provider-select"
        data-testid="provider-select"
        value={activeProvider}
        onChange={(e) => setActiveProvider(e.target.value as LLMProvider)}
        style={{
          fontSize: '13px',
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: '#2a2a2a',
          color: '#e0e0e0',
          border: '1px solid #555',
          cursor: 'pointer',
        }}
      >
        {PROVIDERS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
            {providerHealth[value] === false ? ' ✗' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

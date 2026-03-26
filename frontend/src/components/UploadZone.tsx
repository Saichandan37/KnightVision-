import { useState, useRef, useCallback } from 'react'
import { Chess } from 'chess.js'
import { useAnalysis } from '../hooks/useAnalysis'

function isValidPgn(text: string): boolean {
  try {
    const chess = new Chess()
    chess.loadPgn(text)
    return true
  } catch {
    return false
  }
}

/**
 * PGN upload entry point.
 *
 * Provides a drag-and-drop zone (accepts .pgn files) and a paste textarea.
 * Validates the PGN client-side with chess.js before calling uploadPgn.
 * Shows an inline error on invalid input and a loading spinner while uploading.
 */
export function UploadZone() {
  const [pgnText, setPgnText] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [backendError, setBackendError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { uploadPgn, analysisStatus } = useAnalysis()
  const isLoading = analysisStatus === 'uploading' || analysisStatus === 'analysing'

  const handleSubmit = useCallback(async () => {
    setValidationError(null)
    setBackendError(null)

    if (!isValidPgn(pgnText.trim())) {
      setValidationError('Invalid PGN — please check your file')
      return
    }

    await uploadPgn(pgnText.trim())
  }, [pgnText, uploadPgn])

  // Surface backend error from store status transition
  const showBackendError = analysisStatus === 'error' && backendError === null && !validationError

  const readFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setPgnText(text)
      setValidationError(null)
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files[0]
      if (file) readFile(file)
    },
    [readFile],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) readFile(file)
    },
    [readFile],
  )

  return (
    <div data-testid="upload-zone" style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      {/* Drag-and-drop area */}
      <div
        data-testid="drop-area"
        data-drag-active={dragActive}
        role="button"
        tabIndex={0}
        aria-label="Drop PGN file here or click to browse"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        style={{
          border: '2px dashed',
          borderColor: dragActive ? '#5ca0d3' : '#555',
          borderRadius: '8px',
          padding: '32px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '16px',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#aaa',
          transition: 'border-color 0.15s ease',
        }}
      >
        Drop PGN file here or click to browse
        <input
          ref={fileInputRef}
          data-testid="file-input"
          type="file"
          accept=".pgn"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Paste textarea */}
      <textarea
        data-testid="pgn-textarea"
        value={pgnText}
        onChange={(e) => {
          setPgnText(e.target.value)
          setValidationError(null)
          setBackendError(null)
        }}
        placeholder="Or paste PGN text here"
        aria-label="Or paste PGN text here"
        style={{
          width: '100%',
          minHeight: '120px',
          marginBottom: '8px',
          boxSizing: 'border-box',
          padding: '10px',
          borderRadius: '6px',
          border: '1px solid #444',
          backgroundColor: '#1a1a1a',
          color: '#e0e0e0',
          fontSize: '13px',
          fontFamily: 'monospace',
          resize: 'vertical',
        }}
      />

      {/* Validation error */}
      {validationError && (
        <div
          data-testid="validation-error"
          role="alert"
          style={{ color: '#ca3431', marginBottom: '8px', fontSize: '13px' }}
        >
          {validationError}
        </div>
      )}

      {/* Backend error */}
      {showBackendError && (
        <div
          data-testid="backend-error"
          role="alert"
          style={{ color: '#ca3431', marginBottom: '8px', fontSize: '13px' }}
        >
          Upload failed — please try again
        </div>
      )}

      {/* Submit button */}
      <button
        data-testid="btn-submit"
        onClick={handleSubmit}
        disabled={isLoading}
        aria-label="Analyse game"
        style={{
          width: '100%',
          minHeight: '44px',
          padding: '10px 16px',
          borderRadius: '6px',
          border: 'none',
          backgroundColor: isLoading ? '#555' : '#5ca0d3',
          color: '#fff',
          fontSize: '15px',
          fontWeight: 600,
          cursor: isLoading ? 'default' : 'pointer',
        }}
      >
        {isLoading ? (
          <span data-testid="loading-spinner">Analysing…</span>
        ) : (
          'Analyse'
        )}
      </button>
    </div>
  )
}

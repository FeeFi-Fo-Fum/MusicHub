import { useRef, useState } from 'react'
import { recognizeSheetMusic, type OmrProgress } from '../../audio/omr/omrPipeline'
import { useStore } from '../../store'

type State = 'idle' | 'loading' | 'done' | 'error'

export default function ImportSheetMusic() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<State>('idle')
  const [progress, setProgress] = useState('')
  const [noteCount, setNoteCount] = useState(0)
  const [error, setError] = useState('')

  const { loadNotes, setOctaveOffset } = useStore()

  async function handleFile(file: File) {
    if (!file.name.endsWith('.pdf')) {
      setError('Please select a PDF file.')
      setState('error')
      return
    }

    setState('loading')
    setError('')
    setProgress('Starting…')

    try {
      const notes = await recognizeSheetMusic(file, (p: OmrProgress) => {
        if (p.totalPages) {
          setProgress(`${p.stage} (page ${p.pageNum}/${p.totalPages})`)
        } else {
          setProgress(p.stage)
        }
      })

      if (notes.length === 0) {
        setError('No notes detected. Try a cleaner printed score (not handwritten).')
        setState('error')
        return
      }

      // Load into piano roll, replacing any existing notes
      loadNotes(notes.map((n) => ({ ...n, id: crypto.randomUUID() })))

      // Auto-scroll octave view to centre on the most common pitch range
      const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
      const midiOf = (pitch: string) => {
        const letter = pitch.replace(/\d/g, '')
        const oct = parseInt(pitch.replace(/\D/g, ''))
        return NOTE_NAMES.indexOf(letter) + (oct + 1) * 12
      }
      const midis = notes.map((n) => midiOf(n.pitch)).filter((m) => !isNaN(m))
      if (midis.length > 0) {
        const avg = midis.reduce((a, b) => a + b, 0) / midis.length
        // octaveOffset 0 centres on C4–B5 (midi ~72). Shift to where notes are.
        const shift = Math.round((avg - 72) / 12)
        setOctaveOffset(Math.max(-3, Math.min(3, shift)))
      }

      setNoteCount(notes.length)
      setState('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unexpected error.')
      setState('error')
    }
  }

  return (
    <div className="import-sheet">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
      />

      {state === 'idle' && (
        <button className="import-pdf-btn" onClick={() => fileRef.current?.click()}>
          📄 Import Sheet Music
        </button>
      )}

      {state === 'loading' && (
        <div className="import-progress">
          <span className="import-spinner" />
          <span className="import-progress-text">{progress}</span>
        </div>
      )}

      {state === 'done' && (
        <div className="import-done">
          <span className="import-check">✓ {noteCount} notes imported</span>
          <button className="import-again-btn" onClick={() => { setState('idle'); setNoteCount(0) }}>
            Import another
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="import-error">
          <span>⚠ {error}</span>
          <button className="import-again-btn" onClick={() => setState('idle')}>Try again</button>
        </div>
      )}
    </div>
  )
}

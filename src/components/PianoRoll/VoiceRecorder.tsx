import { useRef, useState } from 'react'
import { PitchDetector, samplesToNotes, type PitchSample } from '../../audio/pitchDetector'
import { useStore } from '../../store'

type State = 'idle' | 'recording' | 'processing'

export default function VoiceRecorder() {
  const [recState, setRecState] = useState<State>('idle')
  const [overlay, setOverlay] = useState(false)
  const [detectedPitch, setDetectedPitch] = useState<string | null>(null)
  const [lastCount, setLastCount] = useState(0)

  const detector = useRef(new PitchDetector())
  const samples = useRef<PitchSample[]>([])

  const { bpm, addNote, loadNotes, notes, setOctaveOffset } = useStore()

  async function startRecording() {
    samples.current = []
    setDetectedPitch(null)
    try {
      await detector.current.start((sample) => {
        if (sample) {
          samples.current.push(sample)
          // Show live pitch label
          const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
          const oct = Math.floor(sample.midi / 12) - 1
          setDetectedPitch(NOTE_NAMES[sample.midi % 12] + oct)
        }
      }, 50)
      setRecState('recording')
    } catch (e) {
      alert('Microphone access denied. Please allow mic access and try again.')
    }
  }

  function stopRecording() {
    detector.current.stop()
    setRecState('processing')
    setDetectedPitch(null)

    // Small delay so the last interval fires
    setTimeout(() => {
      const newNotes = samplesToNotes(samples.current, bpm)
      if (!overlay) {
        loadNotes(newNotes.map((n) => ({ ...n, id: crypto.randomUUID() })))
      } else {
        const maxStep = notes.reduce((m, n) => Math.max(m, n.startStep + n.duration), 0)
        newNotes.forEach((n) =>
          addNote({ ...n, startStep: n.startStep + maxStep })
        )
      }

      // Auto-scroll piano roll to show where the notes landed
      if (newNotes.length > 0) {
        const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
        const midiOf = (pitch: string) => {
          const oct = parseInt(pitch.slice(-1))
          const name = pitch.slice(0, -1)
          return NOTE_NAMES.indexOf(name) + (oct + 1) * 12
        }
        const midis = newNotes.map((n) => midiOf(n.pitch))
        const avgMidi = midis.reduce((a, b) => a + b, 0) / midis.length
        // octaveOffset 0 shows C4–B5 (midi 60–83, center ~72). Shift so avg note is centred.
        const targetOct = Math.round((avgMidi - 72) / 12)
        setOctaveOffset(Math.max(-3, Math.min(3, targetOct)))
      }

      setLastCount(newNotes.length)
      setRecState('idle')
    }, 100)
  }

  return (
    <div className="voice-recorder">
      <div className="vr-controls">
        <button
          className={`vr-overlay-btn ${overlay ? 'active' : ''}`}
          onClick={() => setOverlay((v) => !v)}
          title="When active, recorded notes are layered after existing notes"
          disabled={recState === 'recording'}
        >
          Overlay {overlay ? 'ON' : 'OFF'}
        </button>

        {recState === 'idle' && (
          <button className="vr-record-btn" onClick={startRecording}>
            🎤 Record Voice
          </button>
        )}
        {recState === 'recording' && (
          <button className="vr-stop-btn" onClick={stopRecording}>
            ⏹ Stop
          </button>
        )}
        {recState === 'processing' && (
          <span className="vr-status">Converting…</span>
        )}
      </div>

      {recState === 'recording' && (
        <div className="vr-live">
          <span className="vr-dot" />
          <span className="vr-pitch-live">{detectedPitch ?? '—'}</span>
          <span className="vr-hint">Sing or hum clearly</span>
        </div>
      )}

      {recState === 'idle' && lastCount > 0 && (
        <span className="vr-result">✓ {lastCount} note{lastCount !== 1 ? 's' : ''} added</span>
      )}
    </div>
  )
}

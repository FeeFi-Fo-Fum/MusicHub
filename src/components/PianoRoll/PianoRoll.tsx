import { useState } from 'react'
import InstrumentBrowser from './InstrumentBrowser'
import NoteGrid from './NoteGrid'
import { useStore } from '../../store'
import { useArrangementStore } from '../../store/arrangementStore'
import { nanoid } from 'nanoid'

const CHORD_INTERVALS: Record<string, number[]> = {
  Major:  [0, 4, 7],
  Minor:  [0, 3, 7],
  Dom7:   [0, 4, 7, 10],
  Maj7:   [0, 4, 7, 11],
  Min7:   [0, 3, 7, 10],
  Sus2:   [0, 2, 7],
  Sus4:   [0, 5, 7],
}

interface Props { chordMode: boolean; chordType: string }

export default function PianoRoll({ chordMode, chordType }: Props) {
  const store = useStore()
  const arr = useArrangementStore()
  const [sentId, setSentId] = useState<string | null>(null)

  function sendToArrange() {
    if (store.notes.length === 0) return
    // Find or create a melody track
    let track = arr.tracks.find((t) => t.type === 'melody')
    if (!track) {
      arr.addTrack('melody', 'Piano', 'piano')
      track = arr.tracks.find((t) => t.type === 'melody')!
    }
    const lastStartStep = store.notes.reduce((m, n) => Math.max(m, n.startStep), 0)
    const lengthBars = Math.ceil((lastStartStep + 1) / 16) || 1
    const nextBar = arr.clips
      .filter((c) => c.trackId === track!.id)
      .reduce((m, c) => Math.max(m, c.startBar + c.lengthBars), 0)
    const id = arr.addClip({
      trackId: track.id,
      startBar: nextBar,
      lengthBars,
      name: 'Studio Clip',
      color: track.color,
      type: 'melody',
      data: { notes: store.notes.map((n) => ({ ...n, id: nanoid() })), bpm: store.bpm, instrument: track.instrument },
    })
    setSentId(id)
    setTimeout(() => setSentId(null), 1500)
  }

  return (
    <div className="piano-roll">
      <InstrumentBrowser />
      <div className="piano-roll-grid-area">
        <div className="piano-roll-header">
          <h3 className="panel-title">Melody / Piano Roll</h3>
          <button
            className="btn-secondary piano-to-arrange-btn"
            onClick={sendToArrange}
            disabled={store.notes.length === 0}
            title="Send current notes to Arrange as a clip"
          >
            {sentId ? '✓ Sent!' : '→ Arrange'}
          </button>
        </div>
        <NoteGrid chordIntervals={chordMode ? CHORD_INTERVALS[chordType] : null} />
      </div>
    </div>
  )
}

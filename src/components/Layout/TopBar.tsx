import { useStore } from '../../store'
import { useArrangementStore } from '../../store/arrangementStore'
import { useTransport } from '../../hooks/useTransport'

const CHORD_TYPES = ['Major','Minor','Dom7','Maj7','Min7','Sus2','Sus4']

interface Props {
  onShowPresets?: () => void
  chordMode: boolean
  chordType: string
  onToggleChord: () => void
  onChordType: (t: string) => void
}

export default function TopBar({ onShowPresets, chordMode, chordType, onToggleChord, onChordType }: Props) {
  const { bpm, isPlaying, isRecording, play, stop, toggleRecord, updateBpm, metronomeEnabled } = useTransport()
  const { tracks, notes, pads, clearTracks, clearNotes, toggleMetronome, undo, redo, _past, _future } = useStore()
  const arr = useArrangementStore()

  function savePattern() {
    const json = JSON.stringify({
      version: 2, bpm, tracks, notes, pads,
      arrangement: { tracks: arr.tracks, clips: arr.clips, totalBars: arr.totalBars },
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    a.download = 'musichub-project.json'
    a.click()
  }

  function loadPattern() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      if (input.files?.[0]) applyPattern(await input.files[0].text())
    }
    input.click()
  }

  function applyPattern(json: string) {
    const data = JSON.parse(json)
    const store = useStore.getState()
    if (data.bpm) store.setBpm(data.bpm)
    if (data.tracks) store.loadTracks(data.tracks)
    if (data.notes) store.loadNotes(data.notes)
    if (data.pads) store.loadPads(data.pads)
    if (data.arrangement) arr.loadProject(data.arrangement)
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className={`btn-transport ${isPlaying ? 'active' : ''}`} onClick={isPlaying ? stop : play}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button className={`btn-record ${isRecording ? 'recording' : ''}`} onClick={toggleRecord}>
          {isRecording ? '⏺ Stop Rec' : '⏺ Record'}
        </button>
        <button
          className={`btn-secondary ${metronomeEnabled ? 'active' : ''}`}
          onClick={toggleMetronome}
          title="Metronome (click to toggle, takes effect on next play or immediately while playing)"
        >
          🔔
        </button>
        <button className="btn-secondary" onClick={undo} disabled={_past.length === 0} title="Undo (Cmd+Z)">↩</button>
        <button className="btn-secondary" onClick={redo} disabled={_future.length === 0} title="Redo (Cmd+Shift+Z)">↪</button>
        <div className="bpm-control">
          <label>BPM</label>
          <input
            type="number" min={40} max={240} value={bpm}
            onChange={(e) => updateBpm(Number(e.target.value))}
          />
          <input
            type="range" min={40} max={240} value={bpm}
            onChange={(e) => updateBpm(Number(e.target.value))}
          />
        </div>
      </div>
      <div className="topbar-right">
        <button className="btn-danger" onClick={() => { if (confirm('Clear all drum steps?')) clearTracks() }}>🗑 Drums</button>
        <button className="btn-danger" onClick={() => { if (confirm('Clear all piano roll notes?')) clearNotes() }}>🗑 Notes</button>
        <button
          className={`btn-secondary ${chordMode ? 'active' : ''}`}
          onClick={onToggleChord}
          title="Chord Mode: one click adds a full chord in the Piano Roll"
        >
          🎵 Chord
        </button>
        {chordMode && (
          <select value={chordType} onChange={(e) => onChordType(e.target.value)} className="chord-type-select">
            {CHORD_TYPES.map((k) => <option key={k}>{k}</option>)}
          </select>
        )}
        <button className="btn-secondary" onClick={onShowPresets}>🎼 Presets</button>
        <button className="btn-secondary" onClick={savePattern}>💾 Save Project</button>
        <button className="btn-secondary" onClick={loadPattern}>📂 Load Project</button>
      </div>
    </header>
  )
}

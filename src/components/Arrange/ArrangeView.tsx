import { useState, useEffect, useRef } from 'react'
import { useArrangementStore, type Clip, type ArrTrack } from '../../store/arrangementStore'
import ArrangeCanvas from './ArrangeCanvas'
import ArrangeDrumSequencer from './ArrangeDrumSequencer'
import { audioEngine } from '../../audio/engine'
import { buildArrangement, disposeArrangement } from '../../audio/arrangementScheduler'
import { exportArrangement } from '../../audio/recorder'
import { useStore } from '../../store'
import * as Tone from 'tone'
import type { InstrumentType } from '../../audio/engine'
import type { Track } from '../../types/index'

const INSTRUMENTS: { id: InstrumentType | 'drums' | 'fx'; label: string; icon: string }[] = [
  // Drums
  { id: 'drums',         label: 'Drums',          icon: '🥁' },
  // Keys
  { id: 'piano',         label: 'Piano',           icon: '🎹' },
  { id: 'electricPiano', label: 'Electric Piano',  icon: '🎹' },
  { id: 'organ',         label: 'Organ',           icon: '🎹' },
  { id: 'harpsichord',   label: 'Harpsichord',     icon: '🎹' },
  { id: 'celesta',       label: 'Celesta',         icon: '🎹' },
  // Strings
  { id: 'strings',       label: 'String Ensemble', icon: '🎻' },
  { id: 'violin',        label: 'Violin',          icon: '🎻' },
  { id: 'cello',         label: 'Cello',           icon: '🎻' },
  { id: 'pizzicato',     label: 'Pizzicato',       icon: '🎻' },
  // Brass
  { id: 'trumpet',       label: 'Trumpet',         icon: '🎺' },
  { id: 'trombone',      label: 'Trombone',        icon: '🎺' },
  { id: 'frenchHorn',    label: 'French Horn',     icon: '🎺' },
  { id: 'brassSection',  label: 'Brass Section',   icon: '🎺' },
  // Woodwinds
  { id: 'flute',         label: 'Flute',           icon: '🎷' },
  { id: 'clarinet',      label: 'Clarinet',        icon: '🎷' },
  { id: 'saxophone',     label: 'Saxophone',       icon: '🎷' },
  { id: 'oboe',          label: 'Oboe',            icon: '🎷' },
  // Guitar
  { id: 'acousticGuitar',label: 'Acoustic Guitar', icon: '🎸' },
  { id: 'electricGuitar',label: 'Electric Guitar', icon: '🎸' },
  { id: 'bassGuitar',    label: 'Bass Guitar',     icon: '🎸' },
  // Synth
  { id: 'leadSynth',     label: 'Lead Synth',      icon: '🔊' },
  { id: 'padSynth',      label: 'Pad Synth',       icon: '🔊' },
  { id: 'bassSynth',     label: 'Bass Synth',      icon: '🔊' },
  { id: 'pluckSynth',    label: 'Pluck Synth',     icon: '🔊' },
  { id: 'arpSynth',      label: 'Arp Synth',       icon: '🔊' },
  // Mallet
  { id: 'marimba',       label: 'Marimba',         icon: '🪘' },
  { id: 'vibraphone',    label: 'Vibraphone',      icon: '🪘' },
  { id: 'bells',         label: 'Bells',           icon: '🪘' },
  // FX
  { id: 'fx',            label: 'FX / Sound Effects', icon: '✨' },
]

const TRACK_H = 72

export default function ArrangeView() {
  const arr = useArrangementStore()
  const mainStore = useStore()
  const isPlaying = arr.isPlaying
  const [editingClip, setEditingClip] = useState<Clip | null>(null)
  const [addInstrument, setAddInstrument] = useState<string>('piano')
  const [showInstrPicker, setShowInstrPicker] = useState(false)
  const [drumOpen, setDrumOpen] = useState(false)
  const [exportPct, setExportPct] = useState<number | null>(null)
  const rafRef = useRef<number | null>(null)

  // Animate playhead using rAF while playing
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      return
    }
    const bpm = mainStore.bpm
    function tick() {
      const seconds = Tone.getTransport().seconds
      const bar = (seconds * bpm) / 60 / 4
      arr.setPlayheadBar(bar)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [isPlaying, mainStore.bpm])

  // Rebuild scheduler live whenever clips change while playing
  useEffect(() => {
    if (!isPlaying) return
    buildArrangement(arr.clips, mainStore.bpm, arr.tracks, { enabled: arr.loopEnabled, start: arr.loopStart, end: arr.loopEnd })
  }, [arr.clips, isPlaying, mainStore.bpm])

  // Stop when unmounted
  useEffect(() => {
    return () => {
      Tone.getTransport().stop()
      disposeArrangement()
      arr.setIsPlaying(false)
    }
  }, [])

  function addTrack() {
    const inst = INSTRUMENTS.find((i) => i.id === addInstrument)
    arr.addTrack(
      addInstrument === 'drums' ? 'drums' : addInstrument === 'fx' ? 'fx' : 'melody',
      inst?.label ?? 'Track',
      addInstrument
    )
    setShowInstrPicker(false)
  }

  async function playArrangement() {
    await audioEngine.start()
    if (isPlaying) {
      // Pause — keep position, don't dispose
      Tone.getTransport().pause()
      arr.setIsPlaying(false)
      return
    }
    if (Tone.getTransport().state === 'paused') {
      // Resume from pause
      Tone.getTransport().start()
      arr.setIsPlaying(true)
      return
    }
    // Fresh start
    buildArrangement(arr.clips, mainStore.bpm, arr.tracks, { enabled: arr.loopEnabled, start: arr.loopStart, end: arr.loopEnd })
    Tone.getTransport().start()
    arr.setIsPlaying(true)
  }

  function stopArrangement() {
    Tone.getTransport().stop()
    disposeArrangement()
    arr.setPlayheadBar(0)
    arr.setIsPlaying(false)
  }

  function loadClipIntoEditor(clip: Clip) {
    if (clip.data.tracks) mainStore.loadTracks(clip.data.tracks)
    if (clip.data.notes) mainStore.loadNotes(clip.data.notes)
    if (clip.data.bpm) mainStore.setBpm(clip.data.bpm)
    setEditingClip(clip)
  }

  function addDrumAsClip(tracks: Track[], name: string) {
    const drumsTrack = arr.tracks.find((t) => t.type === 'drums')
    const trackId = drumsTrack?.id ?? arr.addTrack('drums', 'Drums', 'drums')
    const targetId = drumsTrack?.id ?? trackId
    const existingClips = arr.clips.filter((c) => c.trackId === targetId)
    const nextBar = existingClips.reduce((m, c) => Math.max(m, c.startBar + c.lengthBars), 0)
    arr.addClip({
      trackId: targetId,
      startBar: nextBar,
      lengthBars: 2,
      name,
      color: drumsTrack?.color ?? '#e74c3c',
      type: 'beat',
      data: { tracks },
    })
  }

  async function dropLickOnTrack(e: React.DragEvent, track: ArrTrack) {
    e.preventDefault()
    const file = e.dataTransfer.getData('lick-file')
    const name = e.dataTransfer.getData('lick-name')
    if (!file) return
    const data = await (await fetch('/presets/licks/' + file)).json()
    const notes = (data.notes as { pitch: string; startStep: number; duration: number }[])
    const lastStartStep = notes.reduce((m, n) => Math.max(m, n.startStep), 0)
    const lengthBars = Math.ceil((lastStartStep + 1) / 16) || 1
    const existingClips = arr.clips.filter((c) => c.trackId === track.id)
    const nextBar = existingClips.reduce((m, c) => Math.max(m, c.startBar + c.lengthBars), 0)
    arr.addClip({
      trackId: track.id,
      startBar: nextBar,
      lengthBars,
      name,
      color: track.color,
      type: 'melody',
      data: { notes: notes.map((n) => ({ ...n, id: crypto.randomUUID() })), bpm: data.bpm, instrument: track.instrument },
    })
  }

  async function handleExportWav() {
    if (isPlaying) stopArrangement()
    setExportPct(0)
    await exportArrangement(arr.clips, arr.tracks, arr.totalBars, mainStore.bpm, setExportPct)
    setExportPct(null)
  }

  function saveClipFromEditor(clip: Clip) {
    arr.updateClipData(clip.id, {
      ...clip.data,
      tracks: mainStore.tracks,
      notes: mainStore.notes,
      bpm: mainStore.bpm,
    })
    setEditingClip(null)
  }

  return (
    <div className="arrange-view">
      {/* Top toolbar */}
      <div className="arrange-toolbar">
        <button
          className={`btn-transport ${isPlaying ? 'active' : ''}`}
          onClick={playArrangement}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button className="btn-secondary" onClick={stopArrangement} title="Stop and return to start">
          ⏹
        </button>
        <div className="arrange-bpm">
          <label>BPM</label>
          <input
            type="number" min={40} max={240} value={mainStore.bpm}
            onChange={(e) => mainStore.setBpm(Number(e.target.value))}
          />
        </div>
        <button className="btn-secondary" onClick={() => setShowInstrPicker((v) => !v)}>
          + Add Track
        </button>
        <button
          className={`btn-secondary ${arr.loopEnabled ? 'active' : ''}`}
          onClick={arr.toggleLoop}
          title="Toggle loop region (Shift+drag ruler to set)"
        >
          🔁 Loop{arr.loopEnabled && arr.loopStart != null ? ` ${arr.loopStart+1}–${arr.loopEnd}` : ''}
        </button>
        {showInstrPicker && (
          <div className="instr-picker-popup">
            <select value={addInstrument} onChange={(e) => setAddInstrument(e.target.value)}>
              {INSTRUMENTS.map((i) => (
                <option key={i.id} value={i.id}>{i.icon} {i.label}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={addTrack}>Add</button>
          </div>
        )}
        <button
          className="btn-secondary"
          onClick={handleExportWav}
          disabled={exportPct !== null || isPlaying || arr.clips.length === 0}
          title="Export arrangement to WAV (real-time capture)"
        >
          {exportPct !== null ? `⏺ ${Math.round(exportPct * 100)}%` : '⬇ Export WAV'}
        </button>
        <span className="arrange-hint">Click lane = new clip · Drag = move · Alt+drag = duplicate · Shift+drag ruler = loop · Double-click = edit · Right-click = delete</span>
      </div>

      {editingClip && (
        <div className="clip-edit-banner">
          <span>Editing: <strong>{editingClip.name}</strong> — changes in Studio are saved to this clip</span>
          <button className="btn-primary" onClick={() => saveClipFromEditor(editingClip)}>✓ Save Clip</button>
          <button className="btn-secondary" onClick={() => setEditingClip(null)}>Cancel</button>
        </div>
      )}

      {/* Collapsible drum sequencer */}
      <div className="arr-drum-section">
        <div className="collapsible-panel-header" onClick={() => setDrumOpen((v) => !v)}>
          <span>🥁 Drum Pattern Builder</span>
          <span className="collapse-arrow">{drumOpen ? '▾' : '▸'}</span>
        </div>
        {drumOpen && <ArrangeDrumSequencer onAddAsClip={addDrumAsClip} />}
      </div>

      <div className="arrange-body">
        <div className="arrange-scroll">
          <div className="arrange-inner">
            {/* Headers: sticky to left edge, scrolls vertically with canvas */}
            <div className="arrange-headers">
              <div className="arrange-ruler-placeholder" />
              {arr.tracks.map((track) => (
                <TrackHeader
                  key={track.id}
                  track={track}
                  onRemove={() => arr.removeTrack(track.id)}
                  onMute={() => arr.updateTrack(track.id, { muted: !track.muted })}
                  onVolume={(v) => arr.updateTrack(track.id, { volume: v })}
                  onDrop={(e) => dropLickOnTrack(e, track)}
                />
              ))}
            </div>

            {/* Canvas: full width, scrolls in both directions via parent */}
            <ArrangeCanvas
              tracks={arr.tracks}
              onClipDoubleClick={loadClipIntoEditor}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function TrackHeader({ track, onRemove, onMute, onVolume, onDrop }: {
  track: ArrTrack
  onRemove: () => void
  onMute: () => void
  onVolume: (v: number) => void
  onDrop: (e: React.DragEvent) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const inst = INSTRUMENTS.find((i) => i.id === track.instrument)
  return (
    <div
      className={`arr-track-header ${dragOver ? 'drag-over' : ''}`}
      style={{ height: TRACK_H, borderLeft: `3px solid ${track.color}` }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { setDragOver(false); onDrop(e) }}
    >
      <div className="arr-track-top">
        <span className="arr-track-icon">{inst?.icon ?? '🎵'}</span>
        <span className="arr-track-name">{track.name}</span>
        <button className={`arr-mute-btn ${track.muted ? 'muted' : ''}`} onClick={onMute}>M</button>
        <button className="arr-del-btn" onClick={onRemove}>✕</button>
      </div>
      <div className="arr-track-sliders">
        <label className="arr-vol-label">V
          <input
            className="arr-volume"
            type="range" min={0} max={1} step={0.01} value={track.volume}
            title={`Volume: ${Math.round(track.volume * 100)}%`}
            onChange={(e) => onVolume(Number(e.target.value))}
          />
          <span className="arr-vol-pct">{Math.round(track.volume * 100)}%</span>
        </label>
      </div>
    </div>
  )
}

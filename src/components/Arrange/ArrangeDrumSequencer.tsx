import { useRef, useState } from 'react'
import { useArrangementStore } from '../../store/arrangementStore'
import { audioEngine } from '../../audio/engine'
import type { Track } from '../../types/index'

const DRUM_KEYS = ['kick','snare','hihat','clap','tomHigh','tomMid','tomFloor','ride','crash','cowbell'] as const

interface Props {
  onAddAsClip: (tracks: Track[], name: string) => void
}

export default function ArrangeDrumSequencer({ onAddAsClip }: Props) {
  const { arrangeDrumTracks, toggleArrangeStep, setArrangeTrackVolume, toggleArrangeMute, clearArrangeDrums } = useArrangementStore()
  const [clipName, setClipName] = useState('Drum Beat')
  // null = not dragging; true = painting ON; false = painting OFF
  const paintMode = useRef<boolean | null>(null)

  async function startPaint(trackId: string, step: number, drumIdx: number) {
    await audioEngine.start()
    const track = arrangeDrumTracks.find((t) => t.id === trackId)
    const wasOn = track?.steps[step] ?? false
    paintMode.current = !wasOn
    toggleArrangeStep(trackId, step)
    if (!wasOn) audioEngine.triggerDrum(DRUM_KEYS[drumIdx])
  }

  function continuePaint(trackId: string, step: number, drumIdx: number) {
    if (paintMode.current === null) return
    const track = arrangeDrumTracks.find((t) => t.id === trackId)
    const on = track?.steps[step] ?? false
    if (on !== paintMode.current) {
      toggleArrangeStep(trackId, step)
      if (paintMode.current) audioEngine.triggerDrum(DRUM_KEYS[drumIdx])
    }
  }

  function stopPaint() { paintMode.current = null }

  function addClip() {
    onAddAsClip(
      arrangeDrumTracks.map((t) => ({ ...t, steps: [...t.steps] })),
      clipName
    )
  }

  return (
    <div className="arr-drum-seq" onMouseUp={stopPaint} onMouseLeave={stopPaint}>
      <div className="arr-drum-toolbar">
        <span className="arr-drum-title">Draw the pattern, then add it as a clip</span>
        <button className="btn-secondary arr-drum-clear" onClick={clearArrangeDrums}>Clear</button>
        <div className="arr-drum-clip-row">
          <input
            className="arr-drum-clip-name"
            value={clipName}
            onChange={(e) => setClipName(e.target.value)}
            placeholder="Clip name…"
          />
          <button className="btn-primary" onClick={addClip}>Add as Clip →</button>
        </div>
      </div>

      <div className="arr-drum-grid">
        <div className="arr-drum-step-nums">
          <div className="arr-drum-label-spacer" />
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className={`arr-step-num ${i % 4 === 0 ? 'beat' : ''}`}>{i + 1}</div>
          ))}
          <div className="arr-drum-vol-spacer" />
        </div>

        {arrangeDrumTracks.map((track, idx) => (
          <div key={track.id} className={`arr-drum-row ${track.mute ? 'muted' : ''}`}>
            <div className="arr-drum-label" style={{ borderLeft: `3px solid ${track.color}` }}>
              <button
                className={`mute-btn ${track.mute ? 'muted' : ''}`}
                onClick={() => toggleArrangeMute(track.id)}
              >M</button>
              <span>{track.name}</span>
            </div>
            {track.steps.map((on, i) => (
              <button
                key={i}
                className={`step-btn ${on ? 'on' : ''} ${i % 4 === 0 ? 'beat-start' : ''}`}
                style={{ '--track-color': track.color } as React.CSSProperties}
                onMouseDown={() => startPaint(track.id, i, idx)}
                onMouseEnter={() => continuePaint(track.id, i, idx)}
              />
            ))}
            <div className="arr-drum-vol">
              <input
                type="range" min={0} max={1} step={0.01} value={track.volume}
                onChange={(e) => setArrangeTrackVolume(track.id, Number(e.target.value))}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

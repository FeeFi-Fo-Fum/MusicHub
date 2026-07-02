import { useRef } from 'react'
import { useStore } from '../../store'
import { audioEngine } from '../../audio/engine'
import type { Track } from '../../types'

const DRUM_NAMES = ['kick','snare','hihat','clap','tomHigh','tomMid','tomFloor','ride','crash','cowbell'] as const

interface Props { track: Track; currentStep: number; isPlaying: boolean }

export default function TrackRow({ track, currentStep, isPlaying }: Props) {
  const { toggleStep, setTrackVolume, toggleMute } = useStore()
  const idx = useStore((s) => s.tracks.findIndex((t) => t.id === track.id))
  const drumName = DRUM_NAMES[idx]
  // null = not dragging; true = painting ON; false = painting OFF
  const paintMode = useRef<boolean | null>(null)

  async function startPaint(i: number) {
    await audioEngine.start()
    const wasOn = track.steps[i]
    paintMode.current = !wasOn
    toggleStep(track.id, i)
    if (!wasOn && drumName) audioEngine.triggerDrum(drumName)
  }

  function continuePaint(i: number) {
    if (paintMode.current === null) return
    const on = track.steps[i]
    // Only flip if it doesn't already match the paint mode
    if (on !== paintMode.current) {
      toggleStep(track.id, i)
      if (paintMode.current && drumName) audioEngine.triggerDrum(drumName)
    }
  }

  function stopPaint() { paintMode.current = null }

  return (
    <div
      className={`track-row ${track.mute ? 'muted' : ''}`}
      onMouseLeave={stopPaint}
      onMouseUp={stopPaint}
    >
      <div className="track-label" style={{ borderLeft: `3px solid ${track.color}` }}>
        <button
          className={`mute-btn ${track.mute ? 'muted' : ''}`}
          onClick={() => toggleMute(track.id)}
        >M</button>
        <span>{track.name}</span>
      </div>
      <div className="track-steps">
        {track.steps.map((on, i) => (
          <button
            key={i}
            className={`step-btn ${on ? 'on' : ''} ${isPlaying && currentStep === i ? 'playing' : ''} ${i % 4 === 0 ? 'beat-start' : ''}`}
            style={{ '--track-color': track.color } as React.CSSProperties}
            onMouseDown={() => startPaint(i)}
            onMouseEnter={() => continuePaint(i)}
          />
        ))}
      </div>
      <div className="track-volume">
        <input
          type="range" min={0} max={1} step={0.01} value={track.volume}
          onChange={(e) => setTrackVolume(track.id, Number(e.target.value))}
        />
      </div>
    </div>
  )
}

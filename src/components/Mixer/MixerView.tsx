import { useState } from 'react'
import { useArrangementStore } from '../../store/arrangementStore'
import { setTrackSends } from '../../audio/arrangementScheduler'

export default function MixerView() {
  const arr = useArrangementStore()

  return (
    <div className="mixer-view">
      <h2 className="mixer-title">🎚 Mixer</h2>
      <div className="mixer-strips">
        {arr.tracks.map((track) => (
          <MixerStrip key={track.id} trackId={track.id} />
        ))}
      </div>
    </div>
  )
}

function MixerStrip({ trackId }: { trackId: string }) {
  const arr = useArrangementStore()
  const track = arr.tracks.find((t) => t.id === trackId)
  const [eq, setEqState] = useState({ low: 0, mid: 0, high: 0 })

  if (!track) return null

  const reverbSend = track.reverbSend ?? 0
  const delaySend = track.delaySend ?? 0

  const panLabel = (track.pan ?? 0) === 0 ? 'C' : (track.pan ?? 0) > 0
    ? `R${Math.round((track.pan ?? 0) * 100)}`
    : `L${Math.round(-(track.pan ?? 0) * 100)}`

  return (
    <div className="mixer-strip" style={{ borderTop: `3px solid ${track.color}` }}>
      <div className="mixer-strip-name">{track.name}</div>

      <div className="mixer-section-label">EQ (dB)</div>
      <div className="mixer-eq">
        {(['high', 'mid', 'low'] as const).map((band) => (
          <div key={band} className="mixer-eq-band">
            <span className="mixer-band-val">{eq[band] > 0 ? '+' : ''}{eq[band]}</span>
            <input
              type="range"
              min={-12} max={12} step={1} value={eq[band]}
              className="mixer-fader-vertical"
              onChange={(e) => setEqState((prev) => ({ ...prev, [band]: Number(e.target.value) }))}
              title={`${band.toUpperCase()}: ${eq[band]} dB`}
            />
            <span className="mixer-band-label">{band[0].toUpperCase()}</span>
          </div>
        ))}
      </div>

      <div className="mixer-section-label">Sends</div>
      <div className="mixer-sends">
        <div className="mixer-send-row">
          <span>Rev</span>
          <input type="range" min={0} max={1} step={0.01} value={reverbSend}
            onChange={(e) => {
              const v = Number(e.target.value)
              arr.updateTrack(track.id, { reverbSend: v })
              setTrackSends(track.id, v, track.delaySend ?? 0)
            }} />
          <span className="mixer-send-val">{Math.round(reverbSend * 100)}</span>
        </div>
        <div className="mixer-send-row">
          <span>Dly</span>
          <input type="range" min={0} max={1} step={0.01} value={delaySend}
            onChange={(e) => {
              const v = Number(e.target.value)
              arr.updateTrack(track.id, { delaySend: v })
              setTrackSends(track.id, track.reverbSend ?? 0, v)
            }} />
          <span className="mixer-send-val">{Math.round(delaySend * 100)}</span>
        </div>
      </div>

      <div className="mixer-section-label">Pan</div>
      <div className="mixer-pan-row">
        <input type="range" min={-1} max={1} step={0.01} value={track.pan ?? 0}
          className="mixer-pan-slider"
          onChange={(e) => arr.updateTrack(track.id, { pan: Number(e.target.value) })}
        />
        <span className="mixer-pan-val">{panLabel}</span>
      </div>

      <div className="mixer-section-label">Volume</div>
      <div className="mixer-vol-row">
        <input
          type="range"
          min={0} max={1} step={0.01} value={track.volume}
          className="mixer-fader-vertical"
          onChange={(e) => arr.updateTrack(track.id, { volume: Number(e.target.value) })}
          title={`Vol: ${Math.round(track.volume * 100)}%`}
        />
        <span className="mixer-vol-val">{Math.round(track.volume * 100)}%</span>
      </div>

      <button
        className={`arr-mute-btn ${track.muted ? 'muted' : ''}`}
        onClick={() => arr.updateTrack(track.id, { muted: !track.muted })}
        style={{ width: '100%', marginTop: 8 }}
      >
        {track.muted ? '🔇 MUTED' : 'M'}
      </button>
    </div>
  )
}

import { useStore } from '../../store'
import TrackRow from './TrackRow'

export default function StepSequencer() {
  const tracks = useStore((s) => s.tracks)
  const currentStep = useStore((s) => s.currentStep)
  const isPlaying = useStore((s) => s.isPlaying)

  return (
    <div className="step-sequencer">
      <div className="seq-header">
        <h3>Drum Sequencer</h3>
        <div className="step-numbers">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className={`step-num ${isPlaying && currentStep === i ? 'active' : ''}`}>
              {i + 1}
            </span>
          ))}
        </div>
      </div>
      <div className="tracks">
        {tracks.map((track) => (
          <TrackRow key={track.id} track={track} currentStep={currentStep} isPlaying={isPlaying} />
        ))}
      </div>
    </div>
  )
}

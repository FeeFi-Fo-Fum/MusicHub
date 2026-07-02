import { audioEngine } from '../../audio/engine'

const OCTAVES = [3, 4, 5]
const WHITE_NOTES = ['C','D','E','F','G','A','B']
const BLACK_NOTES: Record<string, string | null> = {
  C: 'C#', D: 'D#', E: null, F: 'F#', G: 'G#', A: 'A#', B: null
}

interface Props { activeNotes?: Set<string> }

export default function PianoKeyboard({ activeNotes = new Set() }: Props) {
  async function onDown(pitch: string) {
    await audioEngine.start()
    audioEngine.noteOn(pitch)
  }
  function onUp(pitch: string) {
    audioEngine.noteOff(pitch)
  }

  return (
    <div className="piano-keyboard">
      {OCTAVES.map((oct) => (
        <div key={oct} className="piano-octave">
          {WHITE_NOTES.map((note) => {
            const pitch = `${note}${oct}`
            const blackPitch = BLACK_NOTES[note] ? `${BLACK_NOTES[note]}${oct}` : null
            return (
              <div key={note} className="piano-key-group">
                <button
                  className={`piano-white ${activeNotes.has(pitch) ? 'active' : ''}`}
                  onMouseDown={() => onDown(pitch)}
                  onMouseUp={() => onUp(pitch)}
                  onMouseLeave={() => onUp(pitch)}
                >
                  <span className="key-label">{note}{oct}</span>
                </button>
                {blackPitch && (
                  <button
                    className={`piano-black ${activeNotes.has(blackPitch) ? 'active' : ''}`}
                    onMouseDown={(e) => { e.stopPropagation(); onDown(blackPitch) }}
                    onMouseUp={(e) => { e.stopPropagation(); onUp(blackPitch) }}
                    onMouseLeave={() => onUp(blackPitch)}
                  />
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

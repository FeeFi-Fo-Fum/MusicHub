import { useStore } from '../../store'
import Pad from './Pad'
import { useKeyboardPads } from '../../hooks/useKeyboardPads'

export default function Soundboard() {
  const pads = useStore((s) => s.pads)
  useKeyboardPads()

  return (
    <div className="soundboard">
      <h3 className="panel-title">Soundboard Pads <span className="hint">(click or press key)</span></h3>
      <div className="pads-grid">
        {pads.map((pad) => <Pad key={pad.id} pad={pad} />)}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { audioEngine } from '../../audio/engine'
import type { Pad as PadType } from '../../types'

interface Props { pad: PadType }

export default function Pad({ pad }: Props) {
  const [active, setActive] = useState(false)

  async function trigger() {
    await audioEngine.start()
    const synth = audioEngine.getPadSynth(pad.id)
    synth.triggerAttackRelease(pad.pitch, '8n')
    setActive(true)
    setTimeout(() => setActive(false), 120)
  }

  return (
    <button
      className={`pad ${active ? 'pad-active' : ''}`}
      style={{ '--pad-color': pad.color } as React.CSSProperties}
      onClick={trigger}
    >
      <span className="pad-label">{pad.label}</span>
      <span className="pad-key">[{pad.keyBinding.toUpperCase()}]</span>
    </button>
  )
}

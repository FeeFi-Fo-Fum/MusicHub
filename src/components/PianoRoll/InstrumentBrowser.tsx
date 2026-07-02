import { useState } from 'react'
import { useStore } from '../../store'
import { audioEngine, type InstrumentType } from '../../audio/engine'

const CATEGORIES = [
  {
    label: 'Keys', icon: '🎹',
    items: [
      { id: 'piano', label: 'Piano' },
      { id: 'electricPiano', label: 'Electric Piano' },
      { id: 'organ', label: 'Organ' },
      { id: 'harpsichord', label: 'Harpsichord' },
      { id: 'celesta', label: 'Celesta' },
    ],
  },
  {
    label: 'Strings', icon: '🎻',
    items: [
      { id: 'strings', label: 'String Ensemble' },
      { id: 'violin', label: 'Violin' },
      { id: 'cello', label: 'Cello' },
      { id: 'pizzicato', label: 'Pizzicato' },
    ],
  },
  {
    label: 'Brass', icon: '🎺',
    items: [
      { id: 'trumpet', label: 'Trumpet' },
      { id: 'trombone', label: 'Trombone' },
      { id: 'frenchHorn', label: 'French Horn' },
      { id: 'brassSection', label: 'Brass Section' },
    ],
  },
  {
    label: 'Woodwind', icon: '🎷',
    items: [
      { id: 'flute', label: 'Flute' },
      { id: 'clarinet', label: 'Clarinet' },
      { id: 'saxophone', label: 'Saxophone' },
      { id: 'oboe', label: 'Oboe' },
    ],
  },
  {
    label: 'Guitar', icon: '🎸',
    items: [
      { id: 'acousticGuitar', label: 'Acoustic Guitar' },
      { id: 'electricGuitar', label: 'Electric Guitar' },
      { id: 'bassGuitar', label: 'Bass Guitar' },
    ],
  },
  {
    label: 'Synth', icon: '🔊',
    items: [
      { id: 'leadSynth', label: 'Lead Synth' },
      { id: 'padSynth', label: 'Pad Synth' },
      { id: 'bassSynth', label: 'Bass Synth' },
      { id: 'pluckSynth', label: 'Pluck Synth' },
      { id: 'arpSynth', label: 'Arp Synth' },
    ],
  },
  {
    label: 'Mallet', icon: '🪘',
    items: [
      { id: 'marimba', label: 'Marimba' },
      { id: 'vibraphone', label: 'Vibraphone' },
      { id: 'bells', label: 'Bells' },
    ],
  },
] as const

export default function InstrumentBrowser() {
  const [open, setOpen] = useState<Set<string>>(new Set(['Keys']))
  const { instrument, setInstrument } = useStore()

  async function selectInstrument(type: InstrumentType) {
    await audioEngine.start()
    audioEngine.setInstrument(type)
    setInstrument(type)
  }

  function toggleCat(label: string) {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  return (
    <div className="instrument-browser">
      <div className="ib-header">Instruments</div>
      {CATEGORIES.map((cat) => (
        <div key={cat.label} className="ib-category">
          <button className={`ib-cat-header ${open.has(cat.label) ? 'open' : ''}`} onClick={() => toggleCat(cat.label)}>
            <span>{cat.icon} {cat.label}</span>
            <span className="ib-chevron">{open.has(cat.label) ? '▾' : '▸'}</span>
          </button>
          {open.has(cat.label) && (
            <div className="ib-items">
              {cat.items.map((item) => (
                <button
                  key={item.id}
                  className={`ib-item ${instrument === item.id ? 'active' : ''}`}
                  onClick={() => selectInstrument(item.id as InstrumentType)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

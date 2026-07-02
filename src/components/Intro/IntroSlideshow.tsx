import { useState, useEffect } from 'react'

const SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to MusicHub 🎹',
    subtitle: 'Your browser-based music production studio.',
    description: 'Make beats, compose melodies, arrange full songs, mix tracks, and export to WAV — all right here in your browser. Let\'s take a quick tour.',
    animation: <WelcomeAnim />,
  },
  {
    id: 'studio',
    title: 'Studio',
    subtitle: 'Compose & sequence in real time.',
    description: 'The Drum Sequencer builds beat patterns by clicking steps. The Piano Roll composes melodies — click to add notes, drag to move or resize. Hit ▶ Play or press Space to start.',
    animation: <StudioAnim />,
  },
  {
    id: 'arrange',
    title: 'Arrange',
    subtitle: 'Build your full song on a timeline.',
    description: 'Click a track lane to create a clip. Drag to move it. Alt+drag to duplicate it. Drag its right edge to resize. Double-click to edit inside. Right-click to delete. Click the ruler to seek.',
    animation: <ArrangeAnim />,
  },
  {
    id: 'mixer',
    title: 'Mixer & Volume',
    subtitle: 'Control how each track sounds.',
    description: 'Every track in Arrange has a V (Volume) slider. Open the 🎚 Mixer tab for per-track EQ, reverb sends, and delay sends. Export your finished song as a WAV file with the ⬇ Export button.',
    animation: <MixerAnim />,
  },
  {
    id: 'presets',
    title: 'Presets',
    subtitle: 'Browse beats, licks & sound effects.',
    description: 'Open the Preset Browser from any page. Preview beats and licks before adding them. Drag a lick onto any melody track in Arrange. The FX tab holds your full sound effects library.',
    animation: <PresetsAnim />,
  },
  {
    id: 'controls',
    title: 'Controls & Shortcuts',
    subtitle: 'A few things worth knowing.',
    description: '',
    animation: <ControlsAnim />,
  },
  {
    id: 'go',
    title: 'You\'re all set! 🎉',
    subtitle: 'Start making music.',
    description: 'Head to Studio to build your first beat, or open Presets to explore what\'s available. Press ? anytime to open the full Help guide.',
    animation: <GoAnim />,
  },
]

function WelcomeAnim() {
  return (
    <div className="intro-anim welcome-anim">
      <div className="intro-logo-ring">
        <span className="intro-logo-emoji">🎹</span>
      </div>
      <div className="intro-soundwave">
        {[3,5,8,6,10,7,4,9,5,3,7,6,8,4,6].map((h, i) => (
          <div key={i} className="intro-bar" style={{ height: h * 4, animationDelay: `${i * 0.07}s` }} />
        ))}
      </div>
    </div>
  )
}

function StudioAnim() {
  return (
    <div className="intro-anim studio-anim">
      <div className="intro-mock-panel">
        <div className="intro-mock-label">🥁 Drum Sequencer</div>
        <div className="intro-drum-row">
          {[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0].map((on, i) => (
            <div key={i} className={`intro-step ${on ? 'on' : ''}`} style={{ animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
        <div className="intro-drum-row">
          {[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,0].map((on, i) => (
            <div key={i} className={`intro-step ${on ? 'on snare' : ''}`} style={{ animationDelay: `${i * 0.05 + 0.2}s` }} />
          ))}
        </div>
      </div>
      <div className="intro-mock-panel">
        <div className="intro-mock-label">🎵 Piano Roll — 30+ instruments · Chord Mode</div>
        <div className="intro-roll">
          {[{l:10,w:30},{l:50,w:20},{l:80,w:40},{l:130,w:25},{l:165,w:35}].map((n,i) => (
            <div key={i} className="intro-note" style={{ left: n.l, width: n.w, top: [12,24,8,20,16][i], animationDelay: `${i*0.12}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ArrangeAnim() {
  return (
    <div className="intro-anim arrange-anim">
      {['🥁 Drums','🎵 Piano','🎸 Guitar','✨ FX'].map((name, ti) => (
        <div key={ti} className="intro-track-row">
          <div className="intro-track-label">{name}</div>
          <div className="intro-track-lane">
            {ti === 0 && <><div className="intro-clip beat" style={{ width: 60 }}>Beat</div><div className="intro-clip beat" style={{ width: 60, marginLeft: 4 }}>Beat</div></>}
            {ti === 1 && <><div className="intro-clip melody" style={{ width: 80 }}>Lick</div><div className="intro-clip melody" style={{ width: 40, marginLeft: 4 }}>Lick</div></>}
            {ti === 2 && <div className="intro-clip melody guitar" style={{ width: 100, marginLeft: 8 }}>Chord</div>}
            {ti === 3 && <div className="intro-clip fx" style={{ width: 50, marginLeft: 40 }}>Boom</div>}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 10, color: '#888', marginTop: 6, textAlign: 'center' }}>
        Alt+drag = duplicate · Shift+drag ruler = loop region
      </div>
    </div>
  )
}

function MixerAnim() {
  return (
    <div className="intro-anim" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: 'center', paddingTop: 10 }}>
      {['Drums','Piano','Bass','Guitar','FX'].map((name, i) => (
        <div key={i} className="intro-mixer-strip">
          <div className="intro-mixer-label">{name}</div>
          <div className="intro-mixer-bar" style={{ height: [55, 70, 45, 60, 30][i], animationDelay: `${i * 0.1}s` }} />
          <div className="intro-mixer-vol">V {[80,90,60,75,40][i]}%</div>
        </div>
      ))}
    </div>
  )
}

function PresetsAnim() {
  const items = ['Hip Hop Beat','Lo-Fi Groove','Trap Pattern','Jazz Lick','Funk Riff']
  return (
    <div className="intro-anim presets-anim">
      <div className="intro-tabs-row">
        {['🥁 Beats','🎵 Licks','✨ FX','📁 Import'].map((t,i) => (
          <div key={i} className={`intro-tab ${i===0?'active':''}`}>{t}</div>
        ))}
      </div>
      <div className="intro-preset-list">
        {items.map((name, i) => (
          <div key={i} className="intro-preset-row" style={{ animationDelay: `${i * 0.08}s` }}>
            <span>{name}</span>
            <div className="intro-preset-btns">
              <div className="intro-btn-sm">▶</div>
              <div className="intro-btn-sm arr">→</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const CONTROLS = [
  { icon: '⎵', action: 'Spacebar', result: 'Play / Pause (works everywhere)' },
  { icon: '⌘Z', action: 'Cmd+Z / ↩ button', result: 'Undo last note or step change' },
  { icon: '⌘Z', action: 'Cmd+Shift+Z / ↪ button', result: 'Redo' },
  { icon: '🔔', action: 'Bell button', result: 'Toggle metronome click — works live' },
  { icon: '↔️', action: 'Drag clip edge', result: 'Resize a clip to any length' },
  { icon: '⌥', action: 'Alt+drag a clip', result: 'Duplicate it to a new position' },
  { icon: '⇧', action: 'Shift+drag ruler', result: 'Set loop region (press 🔁 to enable)' },
  { icon: '▶', action: 'Click ruler', result: 'Seek playhead to any position' },
  { icon: '🎵', action: 'Chord Mode', result: 'Piano Roll: one click adds a full chord' },
  { icon: '🖱️', action: 'Right-click a clip', result: 'Delete it from the Arrange timeline' },
  { icon: '🎹', action: '→ Arrange button', result: 'Send Piano Roll notes to the timeline' },
]

function ControlsAnim() {
  return (
    <div className="intro-anim controls-anim">
      {CONTROLS.map((c, i) => (
        <div key={i} className="intro-control-row" style={{ animationDelay: `${i * 0.06}s` }}>
          <span className="intro-control-icon">{c.icon}</span>
          <span className="intro-control-action">{c.action}</span>
          <span className="intro-control-arrow">→</span>
          <span className="intro-control-result">{c.result}</span>
        </div>
      ))}
    </div>
  )
}

function GoAnim() {
  return (
    <div className="intro-anim go-anim">
      <div className="intro-confetti">
        {['🎵','🎶','🥁','🎸','🎹','✨','🎺','🎷'].map((e, i) => (
          <span key={i} className="intro-confetti-item" style={{ animationDelay: `${i * 0.15}s`, left: `${10 + i * 11}%` }}>
            {e}
          </span>
        ))}
      </div>
      <p className="intro-go-text">MusicHub is ready.</p>
      <p style={{ fontSize: 12, color: '#888', marginTop: 8 }}>Press <strong>?</strong> in the sidebar anytime for the full help guide.</p>
    </div>
  )
}

const STORAGE_KEY = 'musichub-intro-seen'

export default function IntroSlideshow() {
  const [visible, setVisible] = useState(false)
  const [slide, setSlide] = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    setVisible(true)
  }, [])

  function dismiss() {
    setExiting(true)
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1')
      setVisible(false)
    }, 400)
  }

  function next() {
    if (slide < SLIDES.length - 1) setSlide((s) => s + 1)
    else dismiss()
  }

  if (!visible) return null

  const current = SLIDES[slide]
  const isLast = slide === SLIDES.length - 1

  return (
    <div className={`intro-overlay ${exiting ? 'exiting' : ''}`}>
      <div className={`intro-card ${exiting ? 'exiting' : ''}`}>
        <button className="intro-skip" onClick={dismiss}>Skip Intro</button>

        <div className={`intro-anim-container ${current.id === 'controls' ? 'tall' : ''}`}>
          {current.animation}
        </div>

        <div className="intro-text">
          <h2 className="intro-title">{current.title}</h2>
          <p className="intro-subtitle">{current.subtitle}</p>
          {current.description && <p className="intro-desc">{current.description}</p>}
        </div>

        <div className="intro-footer">
          <div className="intro-dots">
            {SLIDES.map((_, i) => (
              <div key={i} className={`intro-dot ${i === slide ? 'active' : ''}`} onClick={() => setSlide(i)} />
            ))}
          </div>
          <button className="intro-continue" onClick={next}>
            {isLast ? 'Get Started 🎵' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}

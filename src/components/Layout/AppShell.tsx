import { useState, useEffect } from 'react'
import TopBar from './TopBar'
import StepSequencer from '../StepSequencer/StepSequencer'
import PianoRoll from '../PianoRoll/PianoRoll'
import Soundboard from '../Soundboard/Soundboard'
import PresetBrowser from '../PresetBrowser/PresetBrowser'
import ProfilePage from '../Profile/ProfilePage'
import AuthModal from '../Auth/AuthModal'
import ArrangeView from '../Arrange/ArrangeView'
import MixerView from '../Mixer/MixerView'
import IntroSlideshow from '../Intro/IntroSlideshow'
import HelpModal from '../Help/HelpModal'
import { useStore } from '../../store'
import { useAuth } from '../../hooks/useAuth'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

type Page = 'studio' | 'arrange' | 'mixer' | 'presets' | 'profile'

export default function AppShell() {
  const [page, setPage] = useState<Page>('studio')
  const [showPresets, setShowPresets] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [chordMode, setChordMode] = useState(false)
  const [chordType, setChordType] = useState('Major')
  const [sequencerOpen, setSequencerOpen] = useState(true)
  const { user, profile } = useStore()
  useAuth()
  useKeyboardShortcuts(page)

  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('musichub-theme') as 'dark' | 'light') ?? 'dark'
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'light' ? 'light' : ''
    localStorage.setItem('musichub-theme', theme)
  }, [theme])

  const initial = profile?.username?.[0]?.toUpperCase() ?? (user ? user.email[0].toUpperCase() : null)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">🎹</div>
        <nav>
          <button className={`nav-btn ${page === 'studio' ? 'active' : ''}`} onClick={() => setPage('studio')}>
            🎛<span>Studio</span>
          </button>
          <button className={`nav-btn ${page === 'arrange' ? 'active' : ''}`} onClick={() => setPage('arrange')}>
            🎞<span>Arrange</span>
          </button>
          <button className={`nav-btn ${page === 'mixer' ? 'active' : ''}`} onClick={() => setPage('mixer')}>
            🎚<span>Mixer</span>
          </button>
          <button className={`nav-btn ${page === 'presets' ? 'active' : ''}`} onClick={() => setPage('presets')}>
            🎼<span>Presets</span>
          </button>
          <button className={`nav-btn ${page === 'profile' ? 'active' : ''}`} onClick={() => setPage('profile')}>
            {initial
              ? <span className="nav-avatar">{initial}</span>
              : '👤'}
            <span>Profile</span>
          </button>
        </nav>
        <button className="help-btn" onClick={() => setShowHelp(true)} title="Help — everything about MusicHub">?</button>
        <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        {!user && (
          <button className="sidebar-signin-btn" onClick={() => setShowAuth(true)}>Sign In</button>
        )}
      </aside>

      <main className="main-content">
        {page === 'studio' && (
          <>
            <TopBar
              onShowPresets={() => setShowPresets(!showPresets)}
              chordMode={chordMode}
              chordType={chordType}
              onToggleChord={() => setChordMode(v => !v)}
              onChordType={setChordType}
            />
            <div className="studio-layout">
              <div className="studio-top">
                <div className={`sequencer-panel ${sequencerOpen ? '' : 'collapsed'}`}>
                  <div className="seq-collapse-tab" onClick={() => setSequencerOpen((v) => !v)}>
                    {sequencerOpen
                      ? <><span>🥁 Drum Sequencer</span><span className="collapse-arrow">◀</span></>
                      : <span className="seq-collapsed-label">◀ 🥁</span>
                    }
                  </div>
                  {sequencerOpen && <StepSequencer />}
                </div>
                <div className="piano-roll-panel">
                  <PianoRoll chordMode={chordMode} chordType={chordType} />
                </div>
              </div>
              <div className="pads-panel">
                <Soundboard />
              </div>
            </div>
            {showPresets && (
              <div className="preset-drawer">
                <PresetBrowser onClose={() => setShowPresets(false)} />
              </div>
            )}
          </>
        )}
        {page === 'arrange' && <ArrangeView />}
        {page === 'mixer' && <MixerView />}
        {page === 'presets' && <PresetBrowser />}
        {page === 'profile' && (
          user
            ? <ProfilePage />
            : (
              <div className="profile-page">
                <div className="profile-empty">
                  <p>Sign in to save patterns to the cloud and browse what others are making.</p>
                  <button className="btn-primary" onClick={() => setShowAuth(true)}>Sign In / Sign Up</button>
                </div>
              </div>
            )
        )}
      </main>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      <IntroSlideshow />
    </div>
  )
}

import { useState } from 'react'

const SECTIONS = [
  {
    id: 'overview',
    title: '🎹 Overview',
    content: [
      {
        heading: 'What is MusicHub?',
        body: 'MusicHub is a full browser-based music production studio. No downloads, no plugins — everything runs in your browser using the Web Audio API and Tone.js. You can build drum patterns, compose melodies, arrange a full song on a timeline, mix your tracks, and export the result as a WAV file.',
      },
      {
        heading: 'The Five Pages',
        body: '• Studio — Drum sequencer + Piano Roll + Soundboard pads\n• Arrange — Multi-track timeline for building a full song\n• Mixer — Per-track EQ, reverb, delay, volume and pan\n• Presets — Browse beats, licks and sound effects; import your own audio\n• Profile — Sign in to save and share projects',
      },
      {
        heading: 'Playback',
        body: 'Press Spacebar to play or pause from any page. In Studio it plays the drum+melody loop. In Arrange it plays the full timeline. Press Escape to stop everything and reset to the beginning.',
      },
    ],
  },
  {
    id: 'studio',
    title: '🎛 Studio',
    content: [
      {
        heading: 'Drum Sequencer',
        body: 'Each row is a drum sound. Each cell is a 16th-note step. Click to toggle a step on or off. The highlighted column follows playback. The BPM slider in the TopBar controls how fast it plays. You can have multiple rows and pick different drum sounds per row.',
      },
      {
        heading: 'Piano Roll',
        body: 'Click on the grid to add a note. Drag a note left/right to move it in time, drag it up/down to change pitch. Drag the right edge of a note to resize its duration. Right-click (or click the note again) to remove it. Notes play through the currently selected instrument.',
      },
      {
        heading: 'Instrument Selector',
        body: 'Dropdown at the top of the Piano Roll. Over 30 instruments across 8 categories: Keys, Strings, Brass, Woodwinds, Guitars, Synths, Mallets, and FX. Each plays through Tone.js synthesis — no samples required.',
      },
      {
        heading: 'Chord Mode',
        body: 'Toggle the 🎵 Chord button in the Piano Roll header. Pick a chord type from the dropdown (Major, Minor, Dom7, Maj7, Min7, Sus2, Sus4). Now when you click on the grid, a full chord is added instead of a single note — the root pitch plus the other notes of the chord, all at the same time.',
      },
      {
        heading: 'Soundboard Pads',
        body: 'The 16 pads at the bottom of Studio let you trigger sounds in real time. Click a pad to play. You can assign any of the 30+ instruments to a pad.',
      },
      {
        heading: 'Send to Arrange',
        body: 'Click the "→ Arrange" button in the Piano Roll toolbar to send the current melody notes as a new clip on the Arrange timeline. You can repeat this multiple times to build up different sections.',
      },
      {
        heading: 'Recording',
        body: 'Click ⏺ Record in the TopBar before pressing Play. The Studio will record everything you play into a clip that can then be placed in the Arrange view.',
      },
    ],
  },
  {
    id: 'arrange',
    title: '🎞 Arrange',
    content: [
      {
        heading: 'What is the Arrange view?',
        body: 'A multi-track timeline. Each horizontal row is a track (Drums, Piano, Guitar, etc.). Clips sit on the tracks and represent sections of music. The timeline is measured in bars. Click ▶ Play or press Spacebar to play the full arrangement from the playhead.',
      },
      {
        heading: 'Creating a clip',
        body: 'Click anywhere on an empty track lane to create a new 2-bar clip. The clip is filled with whatever is currently in the Studio for that track type.',
      },
      {
        heading: 'Moving a clip',
        body: 'Drag a clip left or right to reposition it in time. Drag it up or down to move it to a different track of the same type (beat clips stay on drum tracks; melody clips stay on melody tracks).',
      },
      {
        heading: 'Resizing a clip',
        body: 'Drag the right edge of a clip to make it longer or shorter.',
      },
      {
        heading: 'Duplicating a clip',
        body: 'Hold Alt (⌥) and drag a clip. Instead of moving the original, a copy is created and placed where you drag it.',
      },
      {
        heading: 'Editing a clip',
        body: 'Double-click a clip to load its contents into the Studio. Edit the drum steps or melody notes, then click "✓ Save Clip" to write the changes back.',
      },
      {
        heading: 'Deleting a clip',
        body: 'Right-click a clip to remove it from the timeline.',
      },
      {
        heading: 'Seeking (moving the playhead)',
        body: 'Click anywhere on the bar ruler at the top of the canvas. The playhead jumps to that position. If the arrangement is playing, it keeps playing from the new position.',
      },
      {
        heading: 'Loop Region',
        body: 'Shift+drag on the ruler to set a loop region (a colored overlay appears). Then click 🔁 Loop in the toolbar to enable looping. The arrangement will loop between those two bars. Click 🔁 again to disable.',
      },
      {
        heading: 'Track Volume (V slider)',
        body: 'Each track header has a V slider and a percentage readout. This controls the volume of that track in the final mix. 100% = full volume.',
      },
      {
        heading: 'Mute (M button)',
        body: 'Click the M button on a track header to silence that track during playback.',
      },
      {
        heading: 'Adding a track',
        body: 'Click "+ Add Track" in the toolbar. Pick the instrument type from the dropdown, then click Add. The new track appears at the bottom.',
      },
      {
        heading: 'Drag licks from Presets',
        body: 'In the Preset Browser (Presets page or the 🎼 Presets button in TopBar), drag a lick from the Licks tab directly onto a melody track in Arrange. It drops as a new clip at the end of that track.',
      },
      {
        heading: 'Export WAV',
        body: 'Click "⬇ Export WAV" in the Arrange toolbar. Playback captures everything in real time — you\'ll see a percentage counter. When it reaches 100%, a WAV file downloads to your computer. The file contains all tracks mixed together at their current volume/pan settings.',
      },
    ],
  },
  {
    id: 'mixer',
    title: '🎚 Mixer',
    content: [
      {
        heading: 'What is the Mixer?',
        body: 'The Mixer gives you a channel strip for every track in the Arrange timeline. Changes here affect live playback immediately.',
      },
      {
        heading: 'Volume Fader',
        body: 'The tall vertical fader on each strip controls the track\'s output level. This is linked to the V slider in the Arrange track header — they always stay in sync.',
      },
      {
        heading: 'Pan Slider',
        body: 'The horizontal slider below the fader controls stereo panning. Center = 0. Drag left for L, right for R.',
      },
      {
        heading: 'Mute Button',
        body: 'Click M on a strip to silence that track in the mix.',
      },
      {
        heading: 'EQ (H / M / L)',
        body: 'Three sliders per strip: High shelf, Mid band, Low shelf. These are displayed in the UI for future connection to audio processing (currently visual preview only — full DSP integration is coming).',
      },
      {
        heading: 'Reverb & Delay Sends',
        body: 'Knobs for Reverb and Delay send levels. These route a portion of the track\'s signal to a shared reverb/delay bus. Currently shown for UI completeness — full bus routing is coming.',
      },
    ],
  },
  {
    id: 'presets',
    title: '🎼 Presets',
    content: [
      {
        heading: 'Beats Tab',
        body: 'Pre-built drum patterns. Click ▶ to preview in the browser. Click "→ Arrange" to drop it as a clip on the Drums track in your Arrange timeline.',
      },
      {
        heading: 'Licks Tab',
        body: 'Melodic phrases. Click ▶ to preview. Drag a lick card and drop it onto any melody track in Arrange to insert it at the end of that track.',
      },
      {
        heading: 'FX Tab',
        body: 'Sound effects you have imported. Click ▶ to preview. Click "→ Arrange" to add it to the FX track on your timeline.',
      },
      {
        heading: 'Import Tab',
        body: 'Drag an audio file (.wav, .mp3, .ogg) onto the import zone, or click to browse. The file is decoded and stored in your browser session. It appears in the FX tab and can be placed anywhere on the timeline.',
      },
    ],
  },
  {
    id: 'metronome',
    title: '🔔 Metronome',
    content: [
      {
        heading: 'Enabling the metronome',
        body: 'Click the 🔔 bell button in the TopBar (next to the ↩↪ undo/redo buttons). It turns highlighted/active when enabled.',
      },
      {
        heading: 'How it sounds',
        body: 'Beat 1 of every bar plays a higher pitch (C5). Beats 2, 3, and 4 play a lower pitch (C3). It follows the current BPM exactly.',
      },
      {
        heading: 'Mid-session toggle',
        body: 'You can toggle the metronome on or off while the arrangement or Studio loop is actively playing — the click track starts or stops immediately without interrupting playback.',
      },
    ],
  },
  {
    id: 'undo',
    title: '↩ Undo / Redo',
    content: [
      {
        heading: 'What gets saved',
        body: 'Every time you add, move, or delete a note in the Piano Roll, or toggle a drum step, the previous state is saved to a history buffer (up to 50 steps back).',
      },
      {
        heading: 'Undo',
        body: 'Press Cmd+Z (Mac) / Ctrl+Z (Windows) or click the ↩ button in the TopBar. The ↩ button is greyed out when there is nothing to undo.',
      },
      {
        heading: 'Redo',
        body: 'Press Cmd+Shift+Z (Mac) / Ctrl+Shift+Z (Windows) or click the ↪ button in the TopBar. The ↪ button is greyed out when there is nothing to redo.',
      },
      {
        heading: 'Limits',
        body: 'Undo/redo applies to Studio state (notes and drum steps). Arrange clip operations (add/move/resize/delete clips) are not yet in the undo history.',
      },
    ],
  },
  {
    id: 'shortcuts',
    title: '⌨️ Keyboard Shortcuts',
    content: [
      {
        heading: 'All shortcuts',
        body: 'Space — Play / Pause\nEscape — Stop everything and reset playhead\nCmd+Z — Undo\nCmd+Shift+Z — Redo\n\nArrange-specific:\nAlt+drag clip — Duplicate clip\nShift+drag ruler — Set loop region\nClick ruler — Seek playhead\nRight-click clip — Delete clip\nDouble-click clip — Open in Studio editor\n\nNote: shortcuts are disabled when an input field is focused.',
      },
    ],
  },
  {
    id: 'saveload',
    title: '💾 Save & Load',
    content: [
      {
        heading: 'Save Project',
        body: 'Click "💾 Save Project" in the TopBar to download a .json file containing your entire project: BPM, drum steps, Piano Roll notes, pads, and the full Arrange timeline (tracks, clips, lengths).',
      },
      {
        heading: 'Load Project',
        body: 'Click "📂 Load Project" to load a previously saved .json file. Everything is restored — BPM, Studio state, and Arrange layout.',
      },
      {
        heading: 'Cloud save (Profile)',
        body: 'Sign in on the Profile page to save projects to the cloud and access them from any device.',
      },
    ],
  },
  {
    id: 'tips',
    title: '💡 Tips & Tricks',
    content: [
      {
        heading: 'Building a song from scratch',
        body: '1. Set your BPM\n2. Build a drum pattern in the Drum Sequencer\n3. Compose a melody in the Piano Roll\n4. Click "→ Arrange" to send both to the timeline\n5. Duplicate clips and vary the melody for different sections\n6. Add a Bass track and a Guitar track with their own clips\n7. Open the Mixer to balance levels\n8. Export WAV when you\'re happy with it',
      },
      {
        heading: 'Using Chord Mode for quick harmonies',
        body: 'Enable 🎵 Chord Mode in the Piano Roll and choose "Major" or "Minor". Click just the root notes — MusicHub fills in the rest of the chord automatically. Great for quick chord progressions.',
      },
      {
        heading: 'Looping a section while editing',
        body: 'In Arrange, Shift+drag the ruler to mark the 4 bars you\'re working on. Enable 🔁 Loop. Now press play — only those bars loop. You can double-click clips to edit them mid-loop and hear changes immediately.',
      },
      {
        heading: 'Auditioning presets live',
        body: 'Open the Preset Browser while Arrange is playing. Click ▶ on a beat or lick preset — it previews alongside your playing arrangement so you can hear if it fits.',
      },
      {
        heading: 'Light theme for day sessions',
        body: 'Click the ☀️/🌙 button at the bottom of the sidebar to switch between dark and light themes. The choice is remembered across sessions.',
      },
    ],
  },
]

interface Props {
  onClose: () => void
}

export default function HelpModal({ onClose }: Props) {
  const [activeId, setActiveId] = useState('overview')
  const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0]

  return (
    <div className="help-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="help-modal">
        <div className="help-header">
          <h2 className="help-title">MusicHub Help</h2>
          <button className="help-close" onClick={onClose}>✕</button>
        </div>
        <div className="help-body">
          <nav className="help-nav">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={`help-nav-btn ${s.id === activeId ? 'active' : ''}`}
                onClick={() => setActiveId(s.id)}
              >
                {s.title}
              </button>
            ))}
          </nav>
          <div className="help-content">
            <h3 className="help-section-title">{active.title}</h3>
            {active.content.map((item, i) => (
              <div key={i} className="help-item">
                <div className="help-item-heading">{item.heading}</div>
                <div className="help-item-body">
                  {item.body.split('\n').map((line, li) => (
                    <p key={li}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

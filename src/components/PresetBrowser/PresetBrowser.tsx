import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useStore } from '../../store'
import { useArrangementStore } from '../../store/arrangementStore'
import { audioEngine } from '../../audio/engine'
import { buildSequences } from '../../audio/scheduler'
import {
  initBuffers, importFile, renameFile, deleteFile,
  getBuffer, getDecodeContext,
} from '../../audio/importedBuffers'
import * as Tone from 'tone'
import beatsIndex from '../../presets/beats/index.json'
import licksIndex from '../../presets/licks/index.json'
import { nanoid } from 'nanoid'

const FX_URL_BASE = '/presets/fx/'

type Tab = 'beats' | 'licks' | 'fx' | 'import'
interface PresetMeta { file: string; name: string; genre: string; bpm: number }
interface ImportedFile { id: string; name: string; duration: number; source: 'fx' | 'import' }
interface BuiltinFx { file: string; name: string; icon: string; duration: number }
interface Props { onClose?: () => void }

export default function PresetBrowser({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('beats')
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('All')
  const [selectedLicks, setSelectedLicks] = useState<Set<string>>(new Set())
  const [addedId, setAddedId] = useState<string | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [builtinFx, setBuiltinFx] = useState<BuiltinFx[]>([])
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const fxBuffers = useState<Map<string, AudioBuffer>>(() => new Map())[0]
  const activeSrcRef = useRef<AudioBufferSourceNode | null>(null)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const store = useStore()
  const arr = useArrangementStore()

  // Load built-in FX index + persisted user files when FX/Import tabs first open
  useEffect(() => {
    if (initialized || (tab !== 'fx' && tab !== 'import')) return
    setInitialized(true)
    // Load built-in FX index
    fetch(FX_URL_BASE + 'index.json')
      .then((r) => r.json())
      .then((data: BuiltinFx[]) => setBuiltinFx(data))
      .catch(console.error)
    // Load user-imported files from IndexedDB
    initBuffers().then(setImportedFiles).catch(console.error)
  }, [tab, initialized])

  const beatGenres = useMemo(() => ['All', ...Array.from(new Set(beatsIndex.map((b) => b.genre)))], [])
  const lickGenres = useMemo(() => ['All', ...Array.from(new Set(licksIndex.map((l) => l.genre)))], [])
  const genres = tab === 'beats' ? beatGenres : lickGenres

  const items: PresetMeta[] = (tab === 'beats' ? beatsIndex : licksIndex).filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase())
    const matchGenre = genre === 'All' || item.genre === genre
    return matchSearch && matchGenre
  })

  async function loadPresetData(file: string) {
    const base = tab === 'beats' ? '/presets/beats/' : '/presets/licks/'
    return (await fetch(base + file)).json()
  }

  function stopAllPreviews() {
    Tone.getTransport().stop()
    if (activeSrcRef.current) { try { activeSrcRef.current.stop() } catch {} activeSrcRef.current = null }
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null }
    setPreviewingId(null)
  }

  async function preview(item: PresetMeta) {
    if (previewingId === item.file) { stopAllPreviews(); return }
    stopAllPreviews()
    await audioEngine.start()
    const data = await loadPresetData(item.file)
    const tracks = tab === 'beats' ? data.tracks : store.tracks
    const notes = tab === 'licks' ? data.notes : []
    buildSequences(tracks, notes)
    audioEngine.setBpm(data.bpm)
    Tone.getTransport().start()
    setPreviewingId(item.file)
    previewTimerRef.current = setTimeout(() => { Tone.getTransport().stop(); setPreviewingId(null) }, 4000)
  }

  async function loadIntoStudio(item: PresetMeta) {
    const data = await loadPresetData(item.file)
    store.setBpm(data.bpm)
    if (tab === 'beats') store.loadTracks(data.tracks)
    else store.loadNotes(data.notes)
    setLoadedId(item.file)
    setTimeout(() => { setLoadedId(null); onClose?.() }, 900)
  }

  function flashAdded(id: string) {
    setAddedId(id)
    setTimeout(() => setAddedId(null), 1500)
  }

  function nextFreeBar(trackId: string) {
    return arr.clips
      .filter((c) => c.trackId === trackId)
      .reduce((m, c) => Math.max(m, c.startBar + c.lengthBars), 0)
  }

  function getFxTrack() {
    let t = arr.tracks.find((t) => t.type === 'fx')
    if (!t) {
      arr.addTrack('fx', 'FX', 'fx')
      t = arr.tracks.find((t) => t.type === 'fx')!
    }
    return t
  }

  async function addBeatToArrange(item: PresetMeta) {
    const data = await (await fetch('/presets/beats/' + item.file)).json()
    let drumsTrack = arr.tracks.find((t) => t.type === 'drums')
    if (!drumsTrack) {
      arr.addTrack('drums', 'Drums', 'drums')
      drumsTrack = arr.tracks.find((t) => t.type === 'drums')!
    }
    arr.addClip({
      trackId: drumsTrack.id,
      startBar: nextFreeBar(drumsTrack.id),
      lengthBars: 2,
      name: item.name,
      color: drumsTrack.color,
      type: 'beat',
      data: { tracks: data.tracks, bpm: data.bpm },
    })
    flashAdded(item.file)
  }

  function resolveTargetTrack() {
    let t = arr.tracks.find((t) => t.type === 'melody')
    if (!t) {
      arr.addTrack('melody', 'Piano', 'piano')
      t = arr.tracks.find((t) => t.type === 'melody')!
    }
    return t
  }

  async function addLickToArrange(item: PresetMeta) {
    const data = await (await fetch('/presets/licks/' + item.file)).json()
    const notes = data.notes as { pitch: string; startStep: number; duration: number }[]
    const lastStartStep = notes.reduce((m, n) => Math.max(m, n.startStep), 0)
    const lengthBars = Math.ceil((lastStartStep + 1) / 16) || 1
    const track = resolveTargetTrack()
    arr.addClip({
      trackId: track.id,
      startBar: nextFreeBar(track.id),
      lengthBars,
      name: item.name,
      color: track.color,
      type: 'melody',
      data: { notes: notes.map((n) => ({ ...n, id: nanoid() })), bpm: data.bpm, instrument: track.instrument },
    })
    flashAdded(item.file)
  }

  function toggleLickSelect(file: string) {
    setSelectedLicks((prev) => {
      const next = new Set(prev)
      next.has(file) ? next.delete(file) : next.add(file)
      return next
    })
  }

  async function loadSelectedLicks() {
    if (selectedLicks.size === 0) return
    const allNotes: { id: string; pitch: string; startStep: number; duration: number }[] = []
    let stepOffset = 0
    for (const file of selectedLicks) {
      const data = await (await fetch('/presets/licks/' + file)).json()
      const notes = (data.notes as { pitch: string; startStep: number; duration: number }[])
      const maxStep = notes.reduce((m, n) => Math.max(m, n.startStep + n.duration), 0)
      notes.forEach((n) => allNotes.push({ ...n, id: nanoid(), startStep: n.startStep + stepOffset }))
      stepOffset += Math.ceil(maxStep / 16) * 16
    }
    store.loadNotes(allNotes)
    setLoadedId('multi')
    setTimeout(() => { setLoadedId(null); setSelectedLicks(new Set()); onClose?.() }, 900)
  }

  async function addSelectedLicksToArrange() {
    if (selectedLicks.size === 0) return
    const melodyTrack = resolveTargetTrack()
    let bar = nextFreeBar(melodyTrack.id)
    for (const file of selectedLicks) {
      const data = await (await fetch('/presets/licks/' + file)).json()
      const notes = (data.notes as { pitch: string; startStep: number; duration: number }[])
      const lastStartStep = notes.reduce((m, n) => Math.max(m, n.startStep), 0)
      const lengthBars = Math.ceil((lastStartStep + 1) / 16) || 1
      const lickMeta = licksIndex.find((l) => l.file === file)
      arr.addClip({
        trackId: melodyTrack.id,
        startBar: bar,
        lengthBars,
        name: lickMeta?.name ?? 'Lick',
        color: melodyTrack.color,
        type: 'melody',
        data: { notes: notes.map((n) => ({ ...n, id: nanoid() })), bpm: data.bpm, instrument: melodyTrack.instrument },
      })
      bar += lengthBars
    }
    setSelectedLicks(new Set())
  }

  const handleFileImport = useCallback(async (files: FileList | null, source: 'fx' | 'import') => {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const id = nanoid()
        const name = file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
        const { duration } = await importFile(id, name, arrayBuffer, source)
        setImportedFiles((prev) => [...prev, { id, name, duration, source }])
      } catch (err) {
        console.error('Import failed for', file.name, err)
        alert(`Could not import "${file.name}". Make sure it's a valid audio file.`)
      }
    }
  }, [])

  async function getBuiltinBuffer(fx: BuiltinFx): Promise<AudioBuffer> {
    if (fxBuffers.has(fx.file)) return fxBuffers.get(fx.file)!
    const ctx = getDecodeContext()
    if (ctx.state === 'suspended') ctx.resume()
    const ab = await (await fetch(FX_URL_BASE + fx.file)).arrayBuffer()
    const buffer = await ctx.decodeAudioData(ab)
    fxBuffers.set(fx.file, buffer)
    return buffer
  }

  async function previewBuiltin(fx: BuiltinFx) {
    if (previewingId === fx.file) { stopAllPreviews(); return }
    stopAllPreviews()
    const buf = await getBuiltinBuffer(fx)
    const ctx = getDecodeContext()
    if (ctx.state === 'suspended') ctx.resume()
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start()
    activeSrcRef.current = src
    setPreviewingId(fx.file)
    previewTimerRef.current = setTimeout(() => setPreviewingId(null), fx.duration * 1000 + 200)
    src.onended = () => setPreviewingId(null)
  }

  async function addBuiltinToArrange(fx: BuiltinFx) {
    const track = getFxTrack()
    const buf = await getBuiltinBuffer(fx)
    const secondsPerBar = (60 / store.bpm) * 4
    const lengthBars = Math.max(1, Math.ceil(buf.duration / secondsPerBar))
    // Store in importedBuffers so the scheduler can play it
    const id = nanoid()
    await importFile(id, fx.name, await (await fetch(FX_URL_BASE + fx.file)).arrayBuffer(), 'fx')
    arr.addClip({
      trackId: track.id,
      startBar: nextFreeBar(track.id),
      lengthBars,
      name: fx.name,
      color: track.color,
      type: 'audio',
      data: { bufferId: id, bufferName: fx.name },
    })
    flashAdded(fx.file)
  }

  function previewBuffer(id: string, duration?: number) {
    if (previewingId === id) { stopAllPreviews(); return }
    stopAllPreviews()
    const buf = getBuffer(id)
    if (!buf) return
    const ctx = getDecodeContext()
    if (ctx.state === 'suspended') ctx.resume()
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start()
    activeSrcRef.current = src
    setPreviewingId(id)
    const dur = duration ?? buf.duration
    previewTimerRef.current = setTimeout(() => setPreviewingId(null), dur * 1000 + 200)
    src.onended = () => setPreviewingId(null)
  }

  function addBufferToArrange(entry: ImportedFile) {
    const track = getFxTrack()
    const secondsPerBar = (60 / store.bpm) * 4
    const lengthBars = Math.max(1, Math.ceil(entry.duration / secondsPerBar))
    arr.addClip({
      trackId: track.id,
      startBar: nextFreeBar(track.id),
      lengthBars,
      name: entry.name,
      color: track.color,
      type: 'audio',
      data: { bufferId: entry.id, bufferName: entry.name },
    })
    flashAdded(entry.id)
  }

  async function deleteImported(id: string) {
    await deleteFile(id)
    setImportedFiles((prev) => prev.filter((f) => f.id !== id))
  }

  function startRename(id: string, currentName: string) {
    setEditingId(id)
    setEditingName(currentName)
  }

  async function commitRename(id: string) {
    const trimmed = editingName.trim()
    if (!trimmed) { setEditingId(null); return }
    await renameFile(id, trimmed)
    setImportedFiles((prev) => prev.map((f) => f.id === id ? { ...f, name: trimmed } : f))
    setEditingId(null)
  }

  const fxFiles = importedFiles.filter((f) => f.source === 'fx')
  const importFiles = importedFiles.filter((f) => f.source === 'import')

  function formatDuration(s: number) {
    return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`
  }

  function AudioFileCard({ f }: { f: ImportedFile }) {
    const isEditing = editingId === f.id
    return (
      <div className="imported-card">
        <div className="imported-info">
          {isEditing ? (
            <input
              className="imported-rename-input"
              value={editingName}
              autoFocus
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => commitRename(f.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(f.id)
                if (e.key === 'Escape') setEditingId(null)
              }}
            />
          ) : (
            <span
              className="imported-name"
              title="Click to rename"
              onClick={() => startRename(f.id, f.name)}
            >
              {f.source === 'fx' ? '✨' : '🎵'} {f.name}
            </span>
          )}
          <span className="imported-dur">{formatDuration(f.duration)}</span>
        </div>
        <div className="imported-actions">
          <button className={`btn-icon ${previewingId === f.id ? 'playing' : ''}`} onClick={() => previewBuffer(f.id, f.duration)} title="Preview">
            {previewingId === f.id ? '■' : '▶'}
          </button>
          <button className="btn-secondary"
            onClick={() => addBufferToArrange(f)}
            title="Add to FX track in Arrange"
          >
            {addedId === f.id ? '✓ Added' : '→ Arrange'}
          </button>
          <button className="btn-icon danger" onClick={() => deleteImported(f.id)} title="Remove">🗑</button>
        </div>
      </div>
    )
  }

  return (
    <div className="preset-browser">
      <div className="preset-header">
        <h3>Preset Library</h3>
        {onClose && <button className="close-btn" onClick={onClose}>✕</button>}
      </div>
      <div className="preset-tabs">
        <button className={tab === 'beats' ? 'active' : ''} onClick={() => { setTab('beats'); setSelectedLicks(new Set()) }}>
          🥁 Beats ({beatsIndex.length})
        </button>
        <button className={tab === 'licks' ? 'active' : ''} onClick={() => { setTab('licks'); setSelectedLicks(new Set()) }}>
          🎵 Licks ({licksIndex.length})
        </button>
        <button className={tab === 'fx' ? 'active' : ''} onClick={() => setTab('fx')}>
          ✨ FX ({builtinFx.length + fxFiles.length || '…'})
        </button>
        <button className={tab === 'import' ? 'active' : ''} onClick={() => setTab('import')}>
          📁 Import {importFiles.length > 0 ? `(${importFiles.length})` : ''}
        </button>
      </div>

      {(tab === 'beats' || tab === 'licks') && (
        <div className="preset-filters">
          <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={genre} onChange={(e) => setGenre(e.target.value)}>
            {genres.map((g) => <option key={g}>{g}</option>)}
          </select>
          {tab === 'licks' && (
            <span className="drag-hint">Drag a lick onto an Arrange track</span>
          )}
        </div>
      )}

      {tab === 'licks' && selectedLicks.size > 0 && (
        <div className="lick-multi-bar">
          <span>{selectedLicks.size} lick{selectedLicks.size > 1 ? 's' : ''} selected</span>
          <button className="btn-primary" onClick={loadSelectedLicks}>
            {loadedId === 'multi' ? '✓ Loaded!' : 'Load → Studio'}
          </button>
          <button className="btn-primary" onClick={addSelectedLicksToArrange}>Chain → Arrange</button>
          <button className="btn-secondary" onClick={() => setSelectedLicks(new Set())}>Clear</button>
        </div>
      )}

      {(tab === 'beats' || tab === 'licks') && (
        <div className="preset-list">
          {items.map((item) => {
            const isSelected = selectedLicks.has(item.file)
            const wasAdded = addedId === item.file
            return (
              <div
                key={item.file}
                className={`preset-card ${isSelected ? 'selected' : ''}`}
                draggable={tab === 'licks'}
                onDragStart={(e) => {
                  e.dataTransfer.setData('lick-file', item.file)
                  e.dataTransfer.setData('lick-name', item.name)
                  e.dataTransfer.setData('lick-bpm', String(item.bpm))
                }}
              >
                {tab === 'licks' && (
                  <input
                    type="checkbox"
                    className="lick-checkbox"
                    checked={isSelected}
                    onChange={() => toggleLickSelect(item.file)}
                  />
                )}
                <div className="preset-info">
                  <span className="preset-name">{item.name}</span>
                  <span className="preset-genre">{item.genre}</span>
                  <span className="preset-bpm">{item.bpm} BPM</span>
                </div>
                <div className="preset-actions">
                  <button className={`btn-icon ${previewingId === item.file ? 'playing' : ''}`} onClick={() => preview(item)} title="Preview">
                    {previewingId === item.file ? '■' : '▶'}
                  </button>
                  <button className="btn-secondary preset-arrange-btn"
                    onClick={() => tab === 'beats' ? addBeatToArrange(item) : addLickToArrange(item)}
                  >
                    {wasAdded ? '✓ Added' : '→ Arrange'}
                  </button>
                  <button className="btn-primary" onClick={() => loadIntoStudio(item)}>
                    {loadedId === item.file ? '✓ Loaded!' : 'Studio'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'fx' && (
        <div className="import-tab">
          {/* Built-in effects */}
          <div className="fx-builtin-list">
            {builtinFx.map((fx) => (
              <div key={fx.file} className="fx-builtin-card">
                <span className="fx-builtin-icon">{fx.icon}</span>
                <span className="fx-builtin-name">{fx.name}</span>
                <div className="fx-builtin-actions">
                  <button
                    className={`btn-icon ${previewingId === fx.file ? 'playing' : ''}`}
                    onClick={() => previewBuiltin(fx)}
                    title="Preview"
                  >
                    {previewingId === fx.file ? '■' : '▶'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => addBuiltinToArrange(fx)}
                    title="Add to Arrange"
                  >
                    {addedId === fx.file ? '✓' : '→'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* User-imported effects merged into the same grid */}
          {fxFiles.length > 0 && fxFiles.map((f) => (
            <div key={f.id} className="fx-builtin-card">
              <span className="fx-builtin-icon">✨</span>
              {editingId === f.id ? (
                <input
                  className="imported-rename-input"
                  value={editingName}
                  autoFocus
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => commitRename(f.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(f.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
              ) : (
                <span className="fx-builtin-name" title="Click to rename" onClick={() => startRename(f.id, f.name)} style={{ cursor: 'text' }}>
                  {f.name}
                </span>
              )}
              <div className="fx-builtin-actions">
                <button className={`btn-icon ${previewingId === f.id ? 'playing' : ''}`} onClick={() => previewBuffer(f.id, f.duration)} title="Preview">
                  {previewingId === f.id ? '■' : '▶'}
                </button>
                <button className="btn-secondary" onClick={() => addBufferToArrange(f)} title="Add to Arrange">
                  {addedId === f.id ? '✓' : '→'}
                </button>
                <button className="btn-icon danger" onClick={() => deleteImported(f.id)} title="Remove">🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'import' && (
        <div className="import-tab">
          <div
            className="import-drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFileImport(e.dataTransfer.files, 'import') }}
          >
            <input
              type="file"
              accept="audio/*,.wav,.mp3,.ogg,.m4a,.aac,.flac,.aiff"
              multiple
              className="import-file-input"
              onChange={(e) => { handleFileImport(e.target.files, 'import'); e.target.value = '' }}
            />
            <span className="import-drop-icon">📂</span>
            <span className="import-drop-label">Import Audio Files</span>
            <span className="import-drop-hint">Click or drag & drop · saved automatically</span>
          </div>
          {importFiles.length === 0 && (
            <p className="import-empty">No files imported yet. Upload samples or recordings.</p>
          )}
          <div className="imported-list">
            {importFiles.map((f) => <AudioFileCard key={f.id} f={f} />)}
          </div>
        </div>
      )}
    </div>
  )
}

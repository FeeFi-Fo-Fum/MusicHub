import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { Track, Note } from '../types/index'

const DRUM_NAMES = ['Kick', 'Snare', 'Hi-Hat', 'Clap', 'Hi Tom', 'Mid Tom', 'Floor Tom', 'Ride', 'Crash', 'Cowbell']
const DRUM_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#1abc9c', '#e91e63', '#f39c12', '#16a085', '#c0392b']

function makeArrangeDrumTracks(): Track[] {
  return DRUM_NAMES.map((name, i) => ({
    id: nanoid(), name, steps: Array(16).fill(false), volume: 0.8, mute: false, color: DRUM_COLORS[i],
  }))
}

export type ClipType = 'beat' | 'melody' | 'recording' | 'audio'

export interface Clip {
  id: string
  trackId: string
  startBar: number   // 0-based bar index
  lengthBars: number
  name: string
  color: string
  type: ClipType
  data: {
    tracks?: Track[]
    notes?: Note[]
    bpm?: number
    bufferId?: string
    bufferName?: string
    instrument?: string  // instrument to use for melody clips
  }
}

export interface ArrTrack {
  id: string
  name: string
  type: 'drums' | 'melody' | 'fx'
  instrument: string
  color: string
  muted: boolean
  volume: number
  pan: number        // -1 (L) to 1 (R), default 0
  reverbSend: number // 0–1, default 0
  delaySend: number  // 0–1, default 0
}

const DEFAULT_COLORS = [
  '#7c5cfc','#e74c3c','#2ecc71','#3498db',
  '#e67e22','#1abc9c','#e91e63','#f39c12',
]

type ArrSnapshot = { tracks: ArrTrack[]; clips: Clip[] }
function arrSnap(tracks: ArrTrack[], clips: Clip[]): ArrSnapshot {
  return { tracks: JSON.parse(JSON.stringify(tracks)), clips: JSON.parse(JSON.stringify(clips)) }
}

interface ArrangementStore {
  tracks: ArrTrack[]
  clips: Clip[]
  _past: ArrSnapshot[]
  _future: ArrSnapshot[]
  undo: () => void
  redo: () => void
  totalBars: number
  playheadBar: number
  isPlaying: boolean
  setIsPlaying: (v: boolean) => void

  // Separate drum pattern for the arrange view
  arrangeDrumTracks: Track[]
  toggleArrangeStep: (trackId: string, step: number) => void
  setArrangeTrackVolume: (trackId: string, vol: number) => void
  toggleArrangeMute: (trackId: string) => void
  clearArrangeDrums: () => void

  addTrack: (type: 'drums' | 'melody' | 'fx', name?: string, instrument?: string) => string
  removeTrack: (id: string) => void
  updateTrack: (id: string, patch: Partial<ArrTrack>) => void

  addClip: (clip: Omit<Clip, 'id'>) => string
  removeClip: (id: string) => void
  moveClip: (id: string, startBar: number, trackId?: string) => void
  resizeClip: (id: string, lengthBars: number) => void
  updateClipData: (id: string, data: Clip['data']) => void
  duplicateClip: (clipId: string) => string
  loadProject: (data: { tracks?: ArrTrack[]; clips?: Clip[]; totalBars?: number }) => void

  setTotalBars: (n: number) => void
  setPlayheadBar: (b: number) => void

  loopStart: number | null
  loopEnd: number | null
  loopEnabled: boolean
  setLoopRegion: (start: number, end: number) => void
  toggleLoop: () => void
}

function makeDefaultTracks(): ArrTrack[] {
  return [
    { id: nanoid(), name: 'Drums',  type: 'drums',  instrument: 'drums',          color: '#e74c3c', muted: false, volume: 0.8, pan: 0, reverbSend: 0, delaySend: 0 },
    { id: nanoid(), name: 'Piano',  type: 'melody', instrument: 'piano',          color: '#7c5cfc', muted: false, volume: 0.8, pan: 0, reverbSend: 0, delaySend: 0 },
    { id: nanoid(), name: 'Bass',   type: 'melody', instrument: 'bassSynth',      color: '#2ecc71', muted: false, volume: 0.8, pan: 0, reverbSend: 0, delaySend: 0 },
    { id: nanoid(), name: 'Guitar', type: 'melody', instrument: 'electricGuitar', color: '#e67e22', muted: false, volume: 0.8, pan: 0, reverbSend: 0, delaySend: 0 },
    { id: nanoid(), name: 'FX',     type: 'fx',     instrument: 'fx',             color: '#1abc9c', muted: false, volume: 0.8, pan: 0, reverbSend: 0, delaySend: 0 },
  ]
}

export const useArrangementStore = create<ArrangementStore>()(
  immer((set) => ({
    tracks: makeDefaultTracks(),
    clips: [],
    _past: [],
    _future: [],
    totalBars: 32,
    playheadBar: 0,
    isPlaying: false,
    setIsPlaying: (v) => set((s) => { s.isPlaying = v }),

    undo: () => set((s) => {
      if (s._past.length === 0) return
      const prev = s._past[s._past.length - 1]
      s._past.pop()
      s._future.push(arrSnap(s.tracks as ArrTrack[], s.clips as Clip[]))
      if (s._future.length > 50) s._future.shift()
      s.tracks.splice(0, s.tracks.length, ...prev.tracks)
      s.clips.splice(0, s.clips.length, ...prev.clips)
    }),
    redo: () => set((s) => {
      if (s._future.length === 0) return
      const next = s._future[s._future.length - 1]
      s._future.pop()
      s._past.push(arrSnap(s.tracks as ArrTrack[], s.clips as Clip[]))
      if (s._past.length > 50) s._past.shift()
      s.tracks.splice(0, s.tracks.length, ...next.tracks)
      s.clips.splice(0, s.clips.length, ...next.clips)
    }),
    loopStart: null,
    loopEnd: null,
    loopEnabled: false,

    arrangeDrumTracks: makeArrangeDrumTracks(),

    toggleArrangeStep: (trackId, step) => set((s) => {
      const t = s.arrangeDrumTracks.find((t) => t.id === trackId)
      if (t) t.steps[step] = !t.steps[step]
    }),
    setArrangeTrackVolume: (trackId, vol) => set((s) => {
      const t = s.arrangeDrumTracks.find((t) => t.id === trackId)
      if (t) t.volume = vol
    }),
    toggleArrangeMute: (trackId) => set((s) => {
      const t = s.arrangeDrumTracks.find((t) => t.id === trackId)
      if (t) t.mute = !t.mute
    }),
    clearArrangeDrums: () => set((s) => {
      s.arrangeDrumTracks.forEach((t) => { t.steps = Array(16).fill(false) })
    }),

    addTrack: (type, name, instrument) => {
      const id = nanoid()
      const colorIdx = Math.floor(Math.random() * DEFAULT_COLORS.length)
      const defaultName = type === 'drums' ? 'Drums' : type === 'fx' ? 'FX' : 'Melody'
      const defaultInstr = type === 'drums' ? 'drums' : type === 'fx' ? 'fx' : 'piano'
      set((s) => {
        s._past.push(arrSnap(s.tracks as ArrTrack[], s.clips as Clip[])); if (s._past.length > 50) s._past.shift(); s._future.splice(0)
        s.tracks.push({
          id, name: name ?? defaultName,
          type, instrument: instrument ?? defaultInstr,
          color: DEFAULT_COLORS[colorIdx], muted: false, volume: 0.8, pan: 0, reverbSend: 0, delaySend: 0,
        })
      })
      return id
    },

    removeTrack: (id) => set((s) => {
      s._past.push(arrSnap(s.tracks as ArrTrack[], s.clips as Clip[])); if (s._past.length > 50) s._past.shift(); s._future.splice(0)
      s.tracks = s.tracks.filter((t) => t.id !== id)
      s.clips = s.clips.filter((c) => c.trackId !== id)
    }),

    updateTrack: (id, patch) => set((s) => {
      const t = s.tracks.find((t) => t.id === id)
      if (t) Object.assign(t, patch)
    }),

    addClip: (clip) => {
      const id = nanoid()
      set((s) => {
        s._past.push(arrSnap(s.tracks as ArrTrack[], s.clips as Clip[])); if (s._past.length > 50) s._past.shift(); s._future.splice(0)
        s.clips.push({ ...clip, id })
      })
      return id
    },

    removeClip: (id) => set((s) => {
      s._past.push(arrSnap(s.tracks as ArrTrack[], s.clips as Clip[])); if (s._past.length > 50) s._past.shift(); s._future.splice(0)
      s.clips = s.clips.filter((c) => c.id !== id)
    }),

    moveClip: (id, startBar, trackId) => set((s) => {
      s._past.push(arrSnap(s.tracks as ArrTrack[], s.clips as Clip[])); if (s._past.length > 50) s._past.shift(); s._future.splice(0)
      const c = s.clips.find((c) => c.id === id)
      if (!c) return
      c.startBar = Math.max(0, startBar)
      if (trackId && trackId !== c.trackId) {
        c.trackId = trackId
        const newTrack = s.tracks.find((t) => t.id === trackId)
        if (newTrack && c.type === 'melody') {
          c.data = { ...c.data, instrument: newTrack.instrument }
        }
      }
    }),

    resizeClip: (id, lengthBars) => set((s) => {
      s._past.push(arrSnap(s.tracks as ArrTrack[], s.clips as Clip[])); if (s._past.length > 50) s._past.shift(); s._future.splice(0)
      const c = s.clips.find((c) => c.id === id)
      if (c) c.lengthBars = Math.max(1 / 16, lengthBars)
    }),

    updateClipData: (id, data) => set((s) => {
      const c = s.clips.find((c) => c.id === id)
      if (c) c.data = data
    }),

    duplicateClip: (clipId) => {
      const newId = nanoid()
      set((s) => {
        s._past.push(arrSnap(s.tracks as ArrTrack[], s.clips as Clip[])); if (s._past.length > 50) s._past.shift(); s._future.splice(0)
        const src = s.clips.find((c) => c.id === clipId)
        if (!src) return
        s.clips.push({ ...src, id: newId, startBar: src.startBar + src.lengthBars, data: { ...src.data } })
      })
      return newId
    },

    setTotalBars: (n) => set((s) => { s.totalBars = n }),
    setPlayheadBar: (b) => set((s) => { s.playheadBar = b }),
    setLoopRegion: (start, end) => set((s) => { s.loopStart = start; s.loopEnd = end }),
    toggleLoop: () => set((s) => { s.loopEnabled = !s.loopEnabled }),
    loadProject: (data) => set((s) => {
      if (data.tracks) s.tracks = data.tracks
      if (data.clips) s.clips = data.clips
      if (data.totalBars) s.totalBars = data.totalBars
    }),
  }))
)

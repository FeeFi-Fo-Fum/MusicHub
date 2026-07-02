import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import type { Track, Note, Pad, Profile } from '../types'
import type { InstrumentType } from '../audio/engine'

interface AuthUser { id: string; email: string }

const DRUM_NAMES = ['Kick', 'Snare', 'Hi-Hat', 'Clap', 'Hi Tom', 'Mid Tom', 'Floor Tom', 'Ride', 'Crash', 'Cowbell']
const DRUM_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#1abc9c', '#e91e63', '#f39c12', '#16a085', '#c0392b']

const PAD_PITCHES = [
  'C4','D4','E4','F4','G4','A4','B4','C5',
  'D5','E5','F5','G5','A5','B5','C3','D3',
]
const PAD_KEYS = ['q','w','e','r','t','y','u','i','a','s','d','f','g','h','j','k']
const PAD_COLORS = [
  '#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e91e63',
  '#c0392b','#d35400','#f39c12','#27ae60','#16a085','#2980b9','#8e44ad','#ad1457',
]

function makeDefaultTracks(): Track[] {
  return DRUM_NAMES.map((name, i) => ({
    id: nanoid(), name,
    steps: Array(16).fill(false),
    volume: 0.8, mute: false,
    color: DRUM_COLORS[i],
  }))
}

function makeDefaultPads(): Pad[] {
  return PAD_PITCHES.map((pitch, i) => ({
    id: nanoid(), label: pitch,
    keyBinding: PAD_KEYS[i],
    color: PAD_COLORS[i], pitch,
    octave: parseInt(pitch.slice(-1)),
  }))
}

type Snapshot = { tracks: Track[]; notes: Note[] }

interface StoreState {
  user: AuthUser | null
  profile: Profile | null
  setUser: (u: AuthUser | null) => void
  setProfile: (p: Profile | null) => void

  bpm: number
  isPlaying: boolean
  isRecording: boolean
  currentStep: number
  tracks: Track[]
  notes: Note[]
  pads: Pad[]
  instrument: InstrumentType
  octaveOffset: number
  metronomeEnabled: boolean

  // History stored inside Zustand so HMR never wipes it
  _past: Snapshot[]
  _future: Snapshot[]

  setBpm: (bpm: number) => void
  setPlaying: (v: boolean) => void
  setRecording: (v: boolean) => void
  setCurrentStep: (step: number) => void
  toggleStep: (trackId: string, stepIdx: number) => void
  setTrackVolume: (trackId: string, volume: number) => void
  toggleMute: (trackId: string) => void
  loadTracks: (tracks: Track[]) => void
  addNote: (note: Omit<Note, 'id'>) => void
  removeNote: (id: string) => void
  moveNote: (id: string, startStep: number, pitch: string) => void
  resizeNote: (id: string, duration: number) => void
  loadNotes: (notes: Note[]) => void
  loadPads: (pads: Pad[]) => void
  clearTracks: () => void
  clearNotes: () => void
  setInstrument: (type: InstrumentType) => void
  setOctaveOffset: (offset: number) => void
  toggleMetronome: () => void
  undo: () => void
  redo: () => void
}

function snap(tracks: Track[], notes: Note[]): Snapshot {
  return { tracks: JSON.parse(JSON.stringify(tracks)), notes: JSON.parse(JSON.stringify(notes)) }
}

export const useStore = create<StoreState>()(
  immer((set) => ({
    user: null,
    profile: null,
    setUser: (u) => set((s) => { s.user = u }),
    setProfile: (p) => set((s) => { s.profile = p }),

    bpm: 120,
    isPlaying: false,
    isRecording: false,
    currentStep: 0,
    tracks: makeDefaultTracks(),
    notes: [],
    pads: makeDefaultPads(),
    instrument: 'piano',
    octaveOffset: 0,
    metronomeEnabled: false,
    _past: [],
    _future: [],

    setBpm: (bpm) => set((s) => { s.bpm = bpm }),
    setPlaying: (v) => set((s) => { s.isPlaying = v }),
    setRecording: (v) => set((s) => { s.isRecording = v }),
    setCurrentStep: (step) => set((s) => { s.currentStep = step }),

    toggleStep: (trackId, stepIdx) => set((s) => {
      s._past.push(snap(s.tracks as Track[], s.notes as Note[]))
      if (s._past.length > 50) s._past.shift()
      s._future.splice(0)
      const t = s.tracks.find((t) => t.id === trackId)
      if (t) t.steps[stepIdx] = !t.steps[stepIdx]
    }),
    setTrackVolume: (trackId, volume) => set((s) => {
      const t = s.tracks.find((t) => t.id === trackId)
      if (t) t.volume = volume
    }),
    toggleMute: (trackId) => set((s) => {
      const t = s.tracks.find((t) => t.id === trackId)
      if (t) t.mute = !t.mute
    }),
    loadTracks: (tracks) => set((s) => { s.tracks = tracks }),
    addNote: (note) => set((s) => {
      s._past.push(snap(s.tracks as Track[], s.notes as Note[]))
      if (s._past.length > 50) s._past.shift()
      s._future.splice(0)
      s.notes.push({ ...note, id: nanoid() })
    }),
    removeNote: (id) => set((s) => {
      s._past.push(snap(s.tracks as Track[], s.notes as Note[]))
      if (s._past.length > 50) s._past.shift()
      s._future.splice(0)
      s.notes = s.notes.filter((n) => n.id !== id)
    }),
    moveNote: (id, startStep, pitch) => set((s) => {
      const n = s.notes.find((n) => n.id === id)
      if (n) { n.startStep = startStep; n.pitch = pitch }
    }),
    resizeNote: (id, duration) => set((s) => {
      const n = s.notes.find((n) => n.id === id)
      if (n) n.duration = Math.max(1, duration)
    }),
    loadNotes: (notes) => set((s) => { s.notes = notes }),
    loadPads: (pads) => set((s) => { s.pads = pads }),
    clearTracks: () => set((s) => {
      s._past.push(snap(s.tracks as Track[], s.notes as Note[]))
      if (s._past.length > 50) s._past.shift()
      s._future.splice(0)
      s.tracks.forEach((t) => { t.steps = Array(16).fill(false) })
    }),
    clearNotes: () => set((s) => {
      s._past.push(snap(s.tracks as Track[], s.notes as Note[]))
      if (s._past.length > 50) s._past.shift()
      s._future.splice(0)
      s.notes = []
    }),
    setInstrument: (type) => set((s) => { s.instrument = type }),
    setOctaveOffset: (offset) => set((s) => { s.octaveOffset = Math.max(-3, Math.min(3, offset)) }),
    toggleMetronome: () => set((s) => { s.metronomeEnabled = !s.metronomeEnabled }),

    undo: () => set((s) => {
      if (s._past.length === 0) return
      const previous = s._past[s._past.length - 1]
      s._past.pop()
      s._future.push(snap(s.tracks as Track[], s.notes as Note[]))
      if (s._future.length > 50) s._future.shift()
      s.tracks.splice(0, s.tracks.length, ...previous.tracks)
      s.notes.splice(0, s.notes.length, ...previous.notes)
    }),

    redo: () => set((s) => {
      if (s._future.length === 0) return
      const next = s._future[s._future.length - 1]
      s._future.pop()
      s._past.push(snap(s.tracks as Track[], s.notes as Note[]))
      if (s._past.length > 50) s._past.shift()
      s.tracks.splice(0, s.tracks.length, ...next.tracks)
      s.notes.splice(0, s.notes.length, ...next.notes)
    }),
  }))
)

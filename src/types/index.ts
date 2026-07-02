export interface Track {
  id: string
  name: string
  steps: boolean[]
  volume: number
  mute: boolean
  color: string
}

export interface Note {
  id: string
  pitch: string   // e.g. "C4", "D#3"
  startStep: number
  duration: number // in steps
}

export interface Pad {
  id: string
  label: string
  keyBinding: string
  color: string
  pitch: string
  octave: number
}

export interface BeatPreset {
  name: string
  genre: string
  bpm: number
  tracks: Track[]
}

export interface LickPreset {
  name: string
  genre: string
  bpm: number
  notes: Note[]
}

export interface Profile {
  id: string
  username: string
  bio: string
  avatar_url: string | null
}

export interface Project {
  id: string
  user_id: string
  title: string
  description: string
  pattern_json: string
  wav_url: string | null
  is_public: boolean
  created_at: string
  profiles?: Profile
  likes?: { count: number }[]
  comments?: Comment[]
}

export interface Comment {
  id: string
  user_id: string
  project_id: string
  body: string
  created_at: string
  profiles?: Profile
}

export interface SavedPattern {
  bpm: number
  tracks: Track[]
  notes: Note[]
  pads: Pad[]
}

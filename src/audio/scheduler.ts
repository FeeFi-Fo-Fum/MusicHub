import * as Tone from 'tone'
import { audioEngine } from './engine'
import { useStore } from '../store'
import type { Track, Note } from '../types'

type DrumName = 'kick' | 'snare' | 'hihat' | 'clap' | 'tomHigh' | 'tomMid' | 'tomFloor' | 'ride' | 'crash' | 'cowbell'

const DRUM_NAMES: DrumName[] = ['kick', 'snare', 'hihat', 'clap', 'tomHigh', 'tomMid', 'tomFloor', 'ride', 'crash', 'cowbell']

// Each "step" in both the drum sequencer and piano roll = one 16th note.
// Piano roll has 32 steps; drum sequencer uses 16. The transport loops 2 bars
// so the drum pattern repeats twice per loop, which feels natural.

const PIANO_ROLL_STEPS = 32
const DRUM_STEPS = 16

let sequences: Tone.Sequence[] = []
let melodyPart: Tone.Part | null = null
let clockSeq: Tone.Sequence | null = null

// Tone.js "B:Q:S" time string for a given 16th-note step index
function stepToTime(s: number): string {
  return `${Math.floor(s / 16)}:${Math.floor((s % 16) / 4)}:${s % 4}`
}

export function buildSequences(tracks: Track[], notes: Note[]) {
  disposeAll()

  // Drum sequences — each fires on its own 16-step loop (repeats every bar)
  sequences = tracks.map((_track, i) => {
    const drumName = DRUM_NAMES[i] as DrumName | undefined
    const seq = new Tone.Sequence(
      (time, stepIdx) => {
        const currentTrack = useStore.getState().tracks[i]
        if (!currentTrack || currentTrack.mute) return
        if (currentTrack.steps[stepIdx as number]) {
          if (drumName) audioEngine.triggerDrum(drumName, time)
        }
      },
      Array.from({ length: DRUM_STEPS }, (_, i) => i),
      '16n'
    )
    seq.start(0)
    return seq
  })

  // Loop length covers the 32-step piano roll window, but extends to fit
  // longer imported material (e.g. a full sheet-music piece) — rounded up
  // to whole bars (16 steps each).
  const maxNoteEnd = notes.reduce((m, n) => Math.max(m, n.startStep + n.duration), 0)
  const totalSteps = Math.max(PIANO_ROLL_STEPS, Math.ceil(maxNoteEnd / 16) * 16)
  const totalBars = totalSteps / 16

  // Dedicated playhead clock — cycles through the full loop length
  clockSeq = new Tone.Sequence(
    (time, stepIdx) => {
      Tone.getDraw().schedule(() => {
        useStore.getState().setCurrentStep((stepIdx as number) % PIANO_ROLL_STEPS)
      }, time)
    },
    Array.from({ length: totalSteps }, (_, i) => i),
    '16n'
  )
  clockSeq.start(0)

  // Melody notes — each step = one 16th note
  if (notes.length > 0) {
    const sixteenthSec = 60 / Tone.getTransport().bpm.value / 4
    const events = notes.map((note) => ({
      time: stepToTime(note.startStep),
      pitch: note.pitch,
      duration: sixteenthSec * note.duration,
    }))

    melodyPart = new Tone.Part((time, event) => {
      audioEngine.triggerNote(event.pitch, event.duration, time)
    }, events)
    melodyPart.loop = true
    melodyPart.loopEnd = `${totalBars}m`
    melodyPart.start(0)
  }

  const transport = Tone.getTransport()
  transport.loopStart = 0
  transport.loopEnd = `${totalBars}m`
  transport.loop = true
}

export function rebuildMelody(notes: Note[]) {
  if (melodyPart) { melodyPart.stop(); melodyPart.dispose(); melodyPart = null }

  const maxNoteEnd = notes.reduce((m, n) => Math.max(m, n.startStep + n.duration), 0)
  const totalSteps = Math.max(PIANO_ROLL_STEPS, Math.ceil(maxNoteEnd / 16) * 16)
  const totalBars = totalSteps / 16

  if (notes.length > 0) {
    const sixteenthSec = 60 / Tone.getTransport().bpm.value / 4
    const events = notes.map((note) => ({
      time: stepToTime(note.startStep),
      pitch: note.pitch,
      duration: sixteenthSec * note.duration,
    }))
    melodyPart = new Tone.Part((time, event) => {
      audioEngine.triggerNote(event.pitch, event.duration, time)
    }, events)
    melodyPart.loop = true
    melodyPart.loopEnd = `${totalBars}m`
    melodyPart.start(0)
  }

  const transport = Tone.getTransport()
  transport.loopEnd = `${totalBars}m`
}

export function disposeAll() {
  sequences.forEach((s) => { s.stop(); s.dispose() })
  sequences = []
  if (clockSeq) { clockSeq.stop(); clockSeq.dispose(); clockSeq = null }
  if (melodyPart) { melodyPart.stop(); melodyPart.dispose(); melodyPart = null }
}

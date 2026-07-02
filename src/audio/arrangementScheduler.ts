import * as Tone from 'tone'
import { audioEngine } from './engine'
import { getBuffer } from './importedBuffers'
import type { Clip, ArrTrack } from '../store/arrangementStore'
import type { InstrumentType } from './engine'

type DrumKey = 'kick' | 'snare' | 'hihat' | 'clap' | 'tomHigh' | 'tomMid' | 'tomFloor' | 'ride' | 'crash' | 'cowbell'
const DRUM_KEYS: DrumKey[] = ['kick','snare','hihat','clap','tomHigh','tomMid','tomFloor','ride','crash','cowbell']

let parts: Tone.Part[] = []
let clipSynths: ReturnType<typeof audioEngine.buildInstrumentForArrange>[] = []
let channels: Tone.Channel[] = []
let reverbBus: Tone.Reverb | null = null
let delayBus: Tone.FeedbackDelay | null = null
let sendGainMap = new Map<string, { rev: Tone.Gain; dly: Tone.Gain }>()

export function setTrackSends(trackId: string, rev: number, dly: number) {
  const s = sendGainMap.get(trackId)
  if (s) {
    s.rev.gain.value = rev
    s.dly.gain.value = dly
  }
}

// Convert an absolute 16th-note step index to Tone.js "B:Q:S" string
function stepToTime(s: number): string {
  return `${Math.floor(s / 16)}:${Math.floor((s % 16) / 4)}:${s % 4}`
}

export function buildArrangement(
  clips: Clip[],
  bpm: number,
  tracks: ArrTrack[] = [],
  loopRegion?: { enabled: boolean; start: number | null; end: number | null }
) {
  disposeArrangement()
  Tone.getTransport().bpm.value = bpm

  // Shared FX buses
  reverbBus = new Tone.Reverb({ decay: 2.5, wet: 1 }).toDestination()
  delayBus = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.35, wet: 1 }).toDestination()

  // Build a Channel per track for vol/pan/mute, with reverb+delay sends
  const channelMap = new Map<string, Tone.Channel>()
  for (const track of tracks) {
    const ch = new Tone.Channel({
      volume: Tone.gainToDb(track.muted ? 0 : track.volume),
      pan: track.pan ?? 0,
    }).toDestination()
    channelMap.set(track.id, ch)
    channels.push(ch)

    // Always create send gains (even at 0) so they can be updated live
    const revGain = new Tone.Gain(track.reverbSend ?? 0)
    const dlyGain = new Tone.Gain(track.delaySend ?? 0)
    if (reverbBus) revGain.connect(reverbBus)
    if (delayBus) dlyGain.connect(delayBus)
    ch.connect(revGain)
    ch.connect(dlyGain)
    sendGainMap.set(track.id, { rev: revGain, dly: dlyGain })
  }

  function getOutput(trackId: string): Tone.ToneAudioNode {
    return channelMap.get(trackId) ?? Tone.getDestination()
  }

  let totalBars = 4

  for (const clip of clips) {
    const clipEnd = clip.startBar + clip.lengthBars
    if (clipEnd > totalBars) totalBars = clipEnd

    if (clip.type === 'beat' && clip.data.tracks) {
      const events: { time: string; drumIdx: number }[] = []
      clip.data.tracks.forEach((track, drumIdx) => {
        if (track.mute) return
        for (let bar = 0; bar < clip.lengthBars; bar++) {
          track.steps.forEach((on, step) => {
            if (!on) return
            const absStep = (clip.startBar + bar) * 16 + step
            events.push({ time: stepToTime(absStep), drumIdx })
          })
        }
      })
      if (events.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const part = new Tone.Part<any>((time, ev: { drumIdx: number }) => {
          const key = DRUM_KEYS[ev.drumIdx]
          if (key) audioEngine.triggerDrum(key, time)
        }, events)
        part.start(0)
        parts.push(part)
      }
    }

    if (clip.type === 'audio' && clip.data.bufferId) {
      const bufferId = clip.data.bufferId
      const startBar = clip.startBar
      const out = getOutput(clip.trackId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const part = new Tone.Part<any>((time: number) => {
        const buf = getBuffer(bufferId)
        if (!buf) return
        const ctx = Tone.getContext().rawContext
        const src = ctx.createBufferSource()
        src.buffer = buf
        if (out instanceof Tone.Channel) {
          src.connect((out as Tone.Channel).input as AudioNode)
        } else {
          src.connect(ctx.destination)
        }
        src.start(time)
      }, [{ time: stepToTime(startBar * 16), t: 0 }])
      part.start(0)
      parts.push(part)
    }

    if ((clip.type === 'melody' || clip.type === 'recording') && clip.data.notes) {
      const sixteenthSec = 60 / bpm / 4
      const clipLengthSteps = clip.lengthBars * 16
      const instrumentType = (clip.data.instrument as InstrumentType | undefined) ?? 'piano'
      const synth = audioEngine.buildInstrumentForArrange(instrumentType)
      // Reconnect PolySynth/MetalSynth output through track channel (PluckPool has its own routing)
      const ch = channelMap.get(clip.trackId)
      if (ch && 'disconnect' in synth && typeof (synth as Tone.PolySynth).disconnect === 'function') {
        ;(synth as Tone.PolySynth).disconnect()
        ;(synth as Tone.PolySynth).connect(ch)
      }
      clipSynths.push(synth)

      const validNotes = clip.data.notes.filter((n) => n.startStep < clipLengthSteps)
      const events = validNotes.map((note) => {
        const maxDur = clipLengthSteps - note.startStep
        const dur = Math.min(note.duration, maxDur) * sixteenthSec
        return {
          time: stepToTime(clip.startBar * 16 + note.startStep),
          pitch: note.pitch,
          dur,
        }
      })
      if (events.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const part = new Tone.Part<any>((time, ev: { pitch: string; dur: number }) => {
          audioEngine.triggerNoteOn(synth, ev.pitch, ev.dur, time)
        }, events)
        part.start(0)
        parts.push(part)
      }
    }
  }

  const transport = Tone.getTransport()
  if (loopRegion?.enabled && loopRegion.start != null && loopRegion.end != null && loopRegion.end > loopRegion.start) {
    transport.loop = true
    transport.loopStart = `${loopRegion.start}m`
    transport.loopEnd = `${loopRegion.end}m`
  } else {
    transport.loop = true
    transport.loopStart = 0
    transport.loopEnd = `${totalBars}m`
  }
}

export function disposeArrangement() {
  parts.forEach((p) => { p.stop(); p.dispose() })
  parts = []
  clipSynths.forEach((s) => audioEngine.disposeInstrument(s))
  clipSynths = []
  sendGainMap.forEach(({ rev, dly }) => { rev.dispose(); dly.dispose() })
  sendGainMap.clear()
  channels.forEach((c) => c.dispose())
  channels = []
  reverbBus?.dispose(); reverbBus = null
  delayBus?.dispose(); delayBus = null
}

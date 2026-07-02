import * as Tone from 'tone'

export type InstrumentType =
  | 'piano' | 'electricPiano' | 'organ' | 'harpsichord' | 'celesta'
  | 'strings' | 'violin' | 'cello' | 'pizzicato'
  | 'trumpet' | 'trombone' | 'frenchHorn' | 'brassSection'
  | 'flute' | 'clarinet' | 'saxophone' | 'oboe'
  | 'acousticGuitar' | 'electricGuitar' | 'bassGuitar'
  | 'leadSynth' | 'padSynth' | 'bassSynth' | 'pluckSynth' | 'arpSynth'
  | 'marimba' | 'vibraphone' | 'bells'

export interface DrumSynths {
  kick: Tone.MembraneSynth
  snare: Tone.NoiseSynth
  hihat: Tone.MetalSynth
  clap: Tone.NoiseSynth
  tomHigh: Tone.MembraneSynth
  tomMid: Tone.MembraneSynth
  tomFloor: Tone.MembraneSynth
  ride: Tone.MetalSynth
  crash: Tone.MetalSynth
  cowbell: Tone.MetalSynth
}

// PluckSynth can't go inside PolySynth (doesn't implement Monophonic), so we manage polyphony manually
type PluckPool = { synths: Tone.PluckSynth[]; idx: number }
type AnyInstrumentSynth = Tone.PolySynth | PluckPool | Tone.MetalSynth

class AudioEngine {
  private _started = false
  masterGain: Tone.Gain
  streamDest: MediaStreamAudioDestinationNode | null = null
  drums: DrumSynths | null = null
  instrumentSynth: AnyInstrumentSynth | null = null
  padSynths: Map<string, Tone.Synth> = new Map()

  constructor() {
    this.masterGain = new Tone.Gain(0.8)
    this.masterGain.toDestination()
  }

  async start() {
    if (this._started) return
    await Tone.start()
    this._started = true

    const rawCtx = Tone.getContext().rawContext as AudioContext
    if (rawCtx.createMediaStreamDestination) {
      this.streamDest = rawCtx.createMediaStreamDestination()
      this.masterGain.disconnect()
      const dest = new Tone.Gain(1)
      dest.toDestination()
      this.masterGain.connect(dest)
      const gainNode = this.masterGain.input as unknown as AudioNode
      gainNode.connect(this.streamDest)
    }

    this.drums = this._buildDrums()
    this.instrumentSynth = this._buildInstrument('piano')
  }

  private _buildDrums(): DrumSynths {
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.07, octaves: 7,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 }
    }).connect(this.masterGain)

    const snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.05 }
    }).connect(this.masterGain)

    const hihat = new Tone.MetalSynth({
      harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
      envelope: { attack: 0.001, decay: 0.05, release: 0.01 }
    }).connect(this.masterGain)
    hihat.frequency.value = 600

    const clap = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.05 }
    }).connect(this.masterGain)

    const tomHigh = new Tone.MembraneSynth({
      pitchDecay: 0.06, octaves: 4,
      envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 }
    }).connect(this.masterGain)

    const tomMid = new Tone.MembraneSynth({
      pitchDecay: 0.07, octaves: 4,
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }
    }).connect(this.masterGain)

    const tomFloor = new Tone.MembraneSynth({
      pitchDecay: 0.09, octaves: 5,
      envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 }
    }).connect(this.masterGain)

    const ride = new Tone.MetalSynth({
      harmonicity: 12, modulationIndex: 64, resonance: 6000, octaves: 1.0,
      envelope: { attack: 0.001, decay: 0.6, release: 0.3 }
    }).connect(this.masterGain)
    ride.frequency.value = 900

    const crash = new Tone.MetalSynth({
      harmonicity: 5.1, modulationIndex: 48, resonance: 4000, octaves: 2,
      envelope: { attack: 0.001, decay: 0.8, release: 0.3 }
    }).connect(this.masterGain)
    crash.frequency.value = 280

    const cowbell = new Tone.MetalSynth({
      harmonicity: 5.1, modulationIndex: 16, resonance: 3000, octaves: 0.5,
      envelope: { attack: 0.001, decay: 0.3, release: 0.1 }
    }).connect(this.masterGain)
    cowbell.frequency.value = 562

    return { kick, snare, hihat, clap, tomHigh, tomMid, tomFloor, ride, crash, cowbell }
  }

  private _buildInstrument(type: InstrumentType): AnyInstrumentSynth {
    const connect = (s: Tone.PolySynth | Tone.MetalSynth) => { s.connect(this.masterGain); return s }
    const makePluckPool = (count: number, opts: Partial<Tone.PluckSynthOptions>): PluckPool => {
      const synths = Array.from({ length: count }, () =>
        new Tone.PluckSynth(opts).connect(this.masterGain)
      )
      return { synths, idx: 0 }
    }

    switch (type) {
      case 'piano':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 }
        }))
      case 'electricPiano':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.01, decay: 0.4, sustain: 0.3, release: 1.2 }
        }))
      case 'organ':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'square' },
          envelope: { attack: 0.01, decay: 0, sustain: 1, release: 0.05 }
        }))
      case 'harpsichord':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }
        }))
      case 'celesta':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.001, decay: 0.4, sustain: 0.1, release: 0.5 }
        }))
      case 'strings':
      case 'violin':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.4, decay: 0.1, sustain: 0.8, release: 1.2 }
        }))
      case 'cello':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.5, decay: 0.1, sustain: 0.9, release: 1.5 }
        }))
      case 'pizzicato':
        return makePluckPool(4, { attackNoise: 1, dampening: 4000, resonance: 0.9 })
      case 'trumpet':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'square' },
          envelope: { attack: 0.08, decay: 0.1, sustain: 0.7, release: 0.3 }
        }))
      case 'trombone':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.2, decay: 0.1, sustain: 0.8, release: 0.5 }
        }))
      case 'frenchHorn':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.3, decay: 0.1, sustain: 0.7, release: 0.8 }
        }))
      case 'brassSection':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'square' },
          envelope: { attack: 0.1, decay: 0.05, sustain: 0.9, release: 0.2 }
        }))
      case 'flute':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.15, decay: 0.1, sustain: 0.6, release: 0.4 }
        }))
      case 'clarinet':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'square' },
          envelope: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.3 }
        }))
      case 'saxophone':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.1, decay: 0.15, sustain: 0.6, release: 0.4 }
        }))
      case 'oboe':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'square' },
          envelope: { attack: 0.03, decay: 0.1, sustain: 0.8, release: 0.2 }
        }))
      case 'acousticGuitar':
        return makePluckPool(6, { attackNoise: 1, dampening: 3500, resonance: 0.95 })
      case 'electricGuitar':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.005, decay: 0.2, sustain: 0.6, release: 0.3 }
        }))
      case 'bassGuitar':
        return makePluckPool(4, { attackNoise: 2, dampening: 2000, resonance: 0.98 })
      case 'leadSynth':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.2 }
        }))
      case 'padSynth':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.8, decay: 0.2, sustain: 0.8, release: 2.0 }
        }))
      case 'bassSynth':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'square' },
          envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.1 }
        }))
      case 'pluckSynth':
        return makePluckPool(6, { attackNoise: 2, dampening: 5000, resonance: 0.97 })
      case 'arpSynth':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 }
        }))
      case 'marimba':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 0.5, sustain: 0.1, release: 0.3 }
        }))
      case 'vibraphone':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 1.0, sustain: 0.2, release: 0.8 }
        }))
      case 'bells':
        return connect(new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.001, decay: 1.5, sustain: 0, release: 0.5 }
        }))
    }
  }

  buildInstrumentForArrange(type: InstrumentType): AnyInstrumentSynth {
    return this._buildInstrument(type)
  }

  disposeInstrument(synth: AnyInstrumentSynth) {
    if ('synths' in synth) {
      synth.synths.forEach((p) => { p.disconnect(); p.dispose() })
    } else {
      synth.disconnect(); synth.dispose()
    }
  }

  triggerNoteOn(synth: AnyInstrumentSynth, pitch: string, duration: string | number, time: number) {
    if ('synths' in synth) {
      const p = synth.synths[synth.idx % synth.synths.length]; synth.idx++
      p.triggerAttackRelease(pitch, time)
    } else {
      (synth as Tone.PolySynth).triggerAttackRelease(pitch, duration, time)
    }
  }

  setInstrument(type: InstrumentType) {
    if (this.instrumentSynth) {
      const s = this.instrumentSynth
      if ('synths' in s) {
        s.synths.forEach((p) => { p.disconnect(); p.dispose() })
      } else {
        s.disconnect(); s.dispose()
      }
    }
    this.instrumentSynth = this._buildInstrument(type)
  }

  triggerDrum(name: keyof DrumSynths, time?: number) {
    if (!this.drums) return
    const t = time ?? Tone.now()
    const synth = this.drums[name]
    if (synth instanceof Tone.MembraneSynth) {
      const pitches: Record<string, string> = {
        kick: 'C1', tomHigh: 'A2', tomMid: 'E2', tomFloor: 'C2'
      }
      synth.triggerAttackRelease(pitches[name] ?? 'C2', '8n', t)
    } else {
      (synth as Tone.NoiseSynth | Tone.MetalSynth).triggerAttackRelease('8n', t)
    }
  }

  triggerNote(pitch: string, duration: string | number = '8n', time?: number) {
    if (!this.instrumentSynth) return
    const s = this.instrumentSynth
    if ('synths' in s) {
      const p = s.synths[s.idx % s.synths.length]; s.idx++
      p.triggerAttackRelease(pitch, time ?? Tone.now())
    } else {
      (s as Tone.PolySynth).triggerAttackRelease(pitch, duration, time ?? Tone.now())
    }
  }

  noteOn(pitch: string) {
    if (!this.instrumentSynth) return
    const s = this.instrumentSynth
    if ('synths' in s) {
      const p = s.synths[s.idx % s.synths.length]; s.idx++
      p.triggerAttackRelease(pitch, Tone.now())
    } else {
      (s as Tone.PolySynth).triggerAttack([pitch], Tone.now())
    }
  }

  noteOff(pitch: string) {
    if (!this.instrumentSynth) return
    if (!('synths' in this.instrumentSynth)) {
      (this.instrumentSynth as Tone.PolySynth).triggerRelease([pitch], Tone.now())
    }
    // PluckSynth sustains naturally, no explicit noteOff needed
  }

  getPadSynth(padId: string): Tone.Synth {
    if (!this.padSynths.has(padId)) {
      const s = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.3, release: 0.3 },
      }).connect(this.masterGain)
      this.padSynths.set(padId, s)
    }
    return this.padSynths.get(padId)!
  }

  setBpm(bpm: number) { Tone.getTransport().bpm.value = bpm }
  play() { Tone.getTransport().start() }
  stop() { Tone.getTransport().stop() }

  private _metronomeSynth: Tone.MembraneSynth | null = null
  private _metronomeSeq: Tone.Sequence | null = null

  startMetronome() {
    this.stopMetronome()
    const synth = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 4, volume: -6 }).toDestination()
    this._metronomeSynth = synth
    let beat = 0
    this._metronomeSeq = new Tone.Sequence((time) => {
      synth.triggerAttackRelease(beat === 0 ? 'C5' : 'C3', '16n', time)
      beat = (beat + 1) % 4
    }, [0, 1, 2, 3], '4n')
    this._metronomeSeq.start(0)
  }

  stopMetronome() {
    this._metronomeSeq?.stop()
    this._metronomeSeq?.dispose()
    this._metronomeSeq = null
    this._metronomeSynth?.dispose()
    this._metronomeSynth = null
  }

  get started() { return this._started }
}

export const audioEngine = new AudioEngine()

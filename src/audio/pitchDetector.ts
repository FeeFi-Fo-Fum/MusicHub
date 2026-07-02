const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function hzToMidi(hz: number): number {
  return Math.round(12 * Math.log2(hz / 440) + 69)
}

export function midiToPitch(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  return NOTE_NAMES[midi % 12] + octave
}

// YIN-inspired autocorrelation pitch detector
function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  // RMS check — ignore silence
  let rms = 0
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
  if (Math.sqrt(rms / buf.length) < 0.008) return -1

  // Trim to zero-crossing boundaries for cleaner correlation
  let r1 = 0, r2 = buf.length - 1
  const THRESH = 0.15
  for (let i = 0; i < buf.length / 2; i++) {
    if (Math.abs(buf[i]) < THRESH) { r1 = i; break }
  }
  for (let i = 1; i < buf.length / 2; i++) {
    if (Math.abs(buf[buf.length - i]) < THRESH) { r2 = buf.length - i; break }
  }
  const sliced = buf.slice(r1, r2)
  const n = sliced.length

  // Autocorrelation
  const c = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i; j++) c[i] += sliced[j] * sliced[j + i]
  }

  // Find first local minimum (dip after lag-0 peak)
  let d = 0
  while (d < n - 1 && c[d] > c[d + 1]) d++

  // Find highest peak after dip
  let maxVal = -1, maxPos = -1
  for (let i = d; i < n; i++) {
    if (c[i] > maxVal) { maxVal = c[i]; maxPos = i }
  }
  if (maxPos <= 0) return -1

  // Parabolic interpolation for sub-sample precision
  let T0 = maxPos
  if (T0 > 0 && T0 < n - 1) {
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1]
    const a = (x1 + x3 - 2 * x2) / 2
    const b = (x3 - x1) / 2
    if (a !== 0) T0 = T0 - b / (2 * a)
  }

  let freq = sampleRate / T0

  // Human singing fundamental: ~80 Hz (bass) to ~1100 Hz (soprano high note)
  // If we detect above 1100 Hz, it's likely an octave error — fold down
  while (freq > 1100 && freq / 2 >= 65) freq /= 2
  // If below 65 Hz it's noise/subharmonic — fold up once
  if (freq < 65) freq *= 2
  // Final reject outside safe vocal range C2–C6
  if (freq < 65 || freq > 1046) return -1
  return freq
}

export interface PitchSample {
  midi: number
  timeMs: number
}

export class PitchDetector {
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private stream: MediaStream | null = null
  private buf: Float32Array<ArrayBuffer> | null = null
  private timer: number | null = null
  private startMs = 0

  async start(onPitch: (sample: PitchSample | null) => void, intervalMs = 50) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    this.ctx = new AudioContext()
    this.analyser = this.ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.ctx.createMediaStreamSource(this.stream).connect(this.analyser)
    this.buf = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>
    this.startMs = performance.now()

    this.timer = window.setInterval(() => {
      if (!this.analyser || !this.buf || !this.ctx) return
      this.analyser.getFloatTimeDomainData(this.buf)
      const hz = autoCorrelate(this.buf, this.ctx.sampleRate)
      if (hz > 0) {
        onPitch({ midi: hzToMidi(hz), timeMs: performance.now() - this.startMs })
      } else {
        onPitch(null)
      }
    }, intervalMs)
  }

  stop() {
    if (this.timer !== null) clearInterval(this.timer)
    this.stream?.getTracks().forEach((t) => t.stop())
    this.ctx?.close()
    this.timer = null
    this.ctx = null
    this.analyser = null
    this.stream = null
    this.buf = null
  }
}

export function samplesToNotes(
  samples: PitchSample[],
  bpm: number
): Array<{ pitch: string; startStep: number; duration: number }> {
  if (samples.length === 0) return []

  const stepMs = (60_000 / bpm) / 4 // 16th note duration in ms

  // Group consecutive samples that are within 1 semitone — use median midi of group
  const groups: { midis: number[]; startMs: number; endMs: number }[] = []
  let cur: typeof groups[0] | null = null

  for (const s of samples) {
    if (!cur) {
      cur = { midis: [s.midi], startMs: s.timeMs, endMs: s.timeMs }
    } else {
      const refMidi = Math.round(cur.midis.reduce((a, b) => a + b, 0) / cur.midis.length)
      if (Math.abs(s.midi - refMidi) <= 1) {
        cur.midis.push(s.midi)
        cur.endMs = s.timeMs
      } else {
        groups.push(cur)
        cur = { midis: [s.midi], startMs: s.timeMs, endMs: s.timeMs }
      }
    }
  }
  if (cur) groups.push(cur)

  // Convert groups to notes, filtering short blips
  return groups
    .filter((g) => g.endMs - g.startMs > stepMs * 0.4)
    .map((g) => {
      // Median midi for robustness against occasional pitch wobbles
      const sorted = [...g.midis].sort((a: number, b: number) => a - b)
      const midi = sorted[Math.floor(sorted.length / 2)]
      const startStep = Math.max(0, Math.round(g.startMs / stepMs))
      const duration = Math.max(1, Math.round((g.endMs - g.startMs + stepMs * 0.5) / stepMs))
      return { pitch: midiToPitch(midi), startStep, duration }
    })
}

import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dir, 'public/presets/fx')
mkdirSync(OUT, { recursive: true })

const SR = 44100

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2)
  for (let i = 0; i < samples.length; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(SR, 24)
  header.writeUInt32LE(SR * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

function noise() { return Math.random() * 2 - 1 }
function sine(f, t) { return Math.sin(f * t * Math.PI * 2) }

// 1. Upbeat Music — cheerful 4-note ascending jingle
{
  const dur = 1.2, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
  const noteLen = dur / notes.length
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const ni = Math.min(Math.floor(t / noteLen), notes.length - 1)
    const nt = t - ni * noteLen
    const env = Math.exp(-nt * 4) * Math.min(1, nt * 30)
    const f = notes[ni]
    s[i] = (sine(f, t) * 0.6 + sine(f * 2, t) * 0.2 + sine(f * 3, t) * 0.1) * env * 0.8
  }
  writeFileSync(join(OUT, 'upbeat-music.wav'), wav(s))
  console.log('✓ upbeat-music.wav')
}

// 2. Food Music — warm cozy pluck melody (C G A F loop)
{
  const dur = 2.0, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  const notes = [261.63, 392.0, 440.0, 349.23] // C4 G4 A4 F4
  const noteLen = dur / notes.length
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const ni = Math.min(Math.floor(t / noteLen), notes.length - 1)
    const nt = t - ni * noteLen
    const env = Math.exp(-nt * 3) * Math.min(1, nt * 20)
    const f = notes[ni]
    // Plucky tone with warmth
    s[i] = (sine(f, t) * 0.5 + sine(f * 2, t) * 0.3 + sine(f * 0.5, t) * 0.2) * env * 0.75
  }
  writeFileSync(join(OUT, 'food-music.wav'), wav(s))
  console.log('✓ food-music.wav')
}

// 3. Boom Crash — huge explosion with metallic crash tail
{
  const dur = 2.5, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let lp1 = 0, lp2 = 0, hp = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const boom = sine(40 * Math.exp(-t * 3) + 20, t) * Math.exp(-t * 2) * 0.7
    const ns = noise()
    lp1 = lp1 * 0.97 + ns * 0.03
    lp2 = lp2 * 0.99 + lp1 * 0.01
    hp = ns - lp1  // metallic high end
    const crash = hp * Math.exp(-t * 4) * 0.5
    const punch = ns * Math.exp(-t * 25) * 0.6
    s[i] = (boom + crash + punch) * 0.85
  }
  writeFileSync(join(OUT, 'boom-crash.wav'), wav(s))
  console.log('✓ boom-crash.wav')
}

// 4. Car Crash — metal crunch + glass shatter noise
{
  const dur = 1.8, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const ns = noise()
    // Mid-freq crunch
    const alpha = 0.6
    lp = lp * alpha + ns * (1 - alpha)
    const crunch = (ns - lp) * Math.exp(-t * 3) * 0.7
    // Low thud
    const thud = sine(60, t) * Math.exp(-t * 15) * 0.5
    // Glass high shimmer
    const glass = ns * Math.exp(-t * 8) * 0.3 * (t < 0.1 ? t / 0.1 : 1)
    s[i] = (crunch + thud + glass) * 0.9
  }
  writeFileSync(join(OUT, 'car-crash.wav'), wav(s))
  console.log('✓ car-crash.wav')
}

// 5. Car Engine — low rumble rev up then idle
{
  const dur = 3.0, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let phase = 0, lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const pos = t / dur
    // Rev up: 30Hz → 120Hz → 70Hz idle
    const freq = pos < 0.4
      ? 30 + 90 * (pos / 0.4)
      : pos < 0.6
        ? 120 - 50 * ((pos - 0.4) / 0.2)
        : 70
    phase += freq / SR
    const motor = sine(1, phase) * 0.4
    const ns = noise()
    lp = lp * 0.95 + ns * 0.05
    const rumble = lp * 0.3
    const env = Math.min(1, t * 3)
    s[i] = (motor + rumble) * env * 0.8
  }
  writeFileSync(join(OUT, 'car-engine.wav'), wav(s))
  console.log('✓ car-engine.wav')
}

// 6. Correct! — bright ascending two-tone chime
{
  const dur = 0.6, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const f1 = 880  // A5
    const f2 = 1318.5  // E6
    const which = t < 0.25 ? f1 : f2
    const nt = t < 0.25 ? t : t - 0.25
    const env = Math.exp(-nt * 8) * Math.min(1, nt * 40)
    s[i] = (sine(which, t) * 0.6 + sine(which * 2, t) * 0.2) * env * 0.85
  }
  writeFileSync(join(OUT, 'correct.wav'), wav(s))
  console.log('✓ correct.wav')
}

// 7. Typing — rapid mechanical keyboard clicks
{
  const dur = 1.5, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  // ~8 clicks spread over duration
  const clickTimes = [0.0, 0.18, 0.31, 0.47, 0.6, 0.79, 0.93, 1.1, 1.25, 1.38]
  for (let i = 0; i < n; i++) {
    const t = i / SR
    let v = 0
    for (const ct of clickTimes) {
      const dt = t - ct
      if (dt >= 0 && dt < 0.04) {
        const env = Math.exp(-dt * 150)
        v += noise() * env * 0.5
        v += sine(3000, t) * env * 0.3
      }
    }
    s[i] = Math.max(-1, Math.min(1, v))
  }
  writeFileSync(join(OUT, 'typing.wav'), wav(s))
  console.log('✓ typing.wav')
}

// 8. Wind — breathy filtered noise sweep
{
  const dur = 3.0, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const pos = t / dur
    // Cutoff modulation — organic movement
    const mod = 0.5 + 0.5 * Math.sin(pos * Math.PI * 3 + 0.5)
    const fc = 200 + 1200 * mod
    const alpha = fc / (fc + SR / (2 * Math.PI))
    lp = lp + alpha * (noise() - lp)
    const env = Math.sin(pos * Math.PI)  // fade in/out
    s[i] = lp * env * 0.75
  }
  writeFileSync(join(OUT, 'wind.wav'), wav(s))
  console.log('✓ wind.wav')
}

// 9. Wrong — descending trombone wah (two-tone fail)
{
  const dur = 0.8, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  // Two notes descending: Bb4 → G4
  const notes2 = [466.16, 392.0]
  const nLen = dur / notes2.length
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const ni = Math.min(Math.floor(t / nLen), notes2.length - 1)
    const nt = t - ni * nLen
    const env = Math.exp(-nt * 2) * Math.min(1, nt * 20)
    const f = notes2[ni]
    // Buzzy brass tone
    s[i] = (sine(f, t) * 0.5 + sine(f * 2, t) * 0.25 + sine(f * 3, t) * 0.15 + sine(f * 4, t) * 0.1) * env * 0.85
  }
  writeFileSync(join(OUT, 'wrong.wav'), wav(s))
  console.log('✓ wrong.wav')
}

// 10. Wah Wah Wah — sad tuba 3-note descending
{
  const dur = 1.5, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  const notes3 = [311.13, 277.18, 233.08] // Eb4 Db4 Bb3
  const nLen = dur / notes3.length
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const ni = Math.min(Math.floor(t / nLen), notes3.length - 1)
    const nt = t - ni * nLen
    const env = Math.exp(-nt * 1.5) * Math.min(1, nt * 15)
    const f = notes3[ni]
    s[i] = (sine(f, t) * 0.5 + sine(f * 2, t) * 0.25 + sine(f * 3, t) * 0.1) * env * 0.85
  }
  writeFileSync(join(OUT, 'wah-wah-wah.wav'), wav(s))
  console.log('✓ wah-wah-wah.wav')
}

// 11. Ding! — bright bell single strike
{
  const dur = 1.0, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const env = Math.exp(-t * 5) * Math.min(1, t * 60)
    // Bell partials
    s[i] = (
      sine(1174.66, t) * 0.5 +   // D6
      sine(1174.66 * 2.76, t) * 0.25 +
      sine(1174.66 * 5.4, t) * 0.1
    ) * env * 0.85
  }
  writeFileSync(join(OUT, 'ding.wav'), wav(s))
  console.log('✓ ding.wav')
}

// Update index.json — append to existing built-ins
const existing = JSON.parse(readFileSync(join(OUT, 'index.json'), 'utf8'))
const userFx = [
  { file: 'upbeat-music.wav',  name: 'Upbeat Music',  icon: '🎵', duration: 1.2 },
  { file: 'food-music.wav',    name: 'Food Music',    icon: '🍕', duration: 2.0 },
  { file: 'boom-crash.wav',    name: 'Boom Crash',    icon: '💥', duration: 2.5 },
  { file: 'car-crash.wav',     name: 'Car Crash',     icon: '🚗', duration: 1.8 },
  { file: 'car-engine.wav',    name: 'Car Engine',    icon: '🔧', duration: 3.0 },
  { file: 'correct.wav',       name: 'Correct',       icon: '✅', duration: 0.6 },
  { file: 'typing.wav',        name: 'Typing',        icon: '⌨️', duration: 1.5 },
  { file: 'wind.wav',          name: 'Wind',          icon: '🌬️', duration: 3.0 },
  { file: 'wrong.wav',         name: 'Wrong',         icon: '❌', duration: 0.8 },
  { file: 'wah-wah-wah.wav',   name: 'Wah Wah Wah',  icon: '😢', duration: 1.5 },
  { file: 'ding.wav',          name: 'Ding',          icon: '🔔', duration: 1.0 },
]
const merged = [...existing, ...userFx]
writeFileSync(join(OUT, 'index.json'), JSON.stringify(merged, null, 2))
console.log(`\nDone — ${merged.length} total effects in index.json`)

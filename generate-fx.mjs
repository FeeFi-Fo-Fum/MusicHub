// Generates synthesized sound effect WAV files into public/presets/fx/
import { writeFileSync, mkdirSync } from 'fs'
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
  header.writeUInt16LE(1, 20)   // PCM
  header.writeUInt16LE(1, 22)   // mono
  header.writeUInt32LE(SR, 24)
  header.writeUInt32LE(SR * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

function noise() { return Math.random() * 2 - 1 }
function sine(phase) { return Math.sin(phase * Math.PI * 2) }

// ─── 1. Impact ─────────────────────────────────────────────────────────────
{
  const dur = 1.2, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const env = Math.exp(-t * 8)
    // Low boom: sine at 50Hz decaying
    const boom = sine(50 * t) * Math.exp(-t * 6)
    // Noise burst at start
    const ns = noise() * Math.exp(-t * 30)
    // Simple low-pass on noise
    lp = lp * 0.85 + ns * 0.15
    s[i] = (boom * 0.7 + lp * 0.3) * env * 0.9
  }
  writeFileSync(join(OUT, 'impact.wav'), wav(s))
  console.log('✓ impact.wav')
}

// ─── 2. Riser ──────────────────────────────────────────────────────────────
{
  const dur = 4, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let lp = 0, hp = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const pos = t / dur  // 0→1
    // Rising filter cutoff: 200Hz → 8000Hz
    const fc = 200 + 7800 * pos * pos
    const alpha = fc / (fc + SR / (2 * Math.PI))
    const ns = noise()
    lp = lp + alpha * (ns - lp)
    hp = hp + alpha * (lp - hp)
    // Also add rising pitched tone
    const pitch = 100 + 2000 * pos * pos
    const tone = sine(pitch * t) * 0.15
    const env = pos * pos  // build up
    s[i] = (lp * 0.8 + tone) * env * 0.85
  }
  writeFileSync(join(OUT, 'riser.wav'), wav(s))
  console.log('✓ riser.wav')
}

// ─── 3. Whoosh ─────────────────────────────────────────────────────────────
{
  const dur = 1.5, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const pos = t / dur
    // Band-pass: centre sweeps 200→4000→200
    const centre = 200 + 3800 * Math.sin(pos * Math.PI)
    const alpha = centre / (centre + SR / (2 * Math.PI))
    const ns = noise()
    lp = lp + alpha * (ns - lp)
    // Amplitude envelope: bell shape
    const env = Math.sin(pos * Math.PI) * 0.9
    s[i] = lp * env
  }
  writeFileSync(join(OUT, 'whoosh.wav'), wav(s))
  console.log('✓ whoosh.wav')
}

// ─── 4. Drop ───────────────────────────────────────────────────────────────
{
  const dur = 2.5, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let phase = 0
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const pos = t / dur
    // Frequency sweeps down: 800Hz → 30Hz
    const freq = 800 * Math.pow(30 / 800, pos)
    phase += freq / SR
    const tone = sine(phase) * 0.6
    // Add some noise
    const ns = noise() * 0.3
    lp = lp * 0.95 + ns * 0.05
    // Envelope: decay with small ramp
    const env = Math.min(1, t * 8) * Math.exp(-t * 1.5)
    s[i] = (tone + lp) * env * 0.9
  }
  writeFileSync(join(OUT, 'drop.wav'), wav(s))
  console.log('✓ drop.wav')
}

// ─── 5. Reverse Cymbal ─────────────────────────────────────────────────────
{
  const dur = 2, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const pos = t / dur
    // Build-up envelope (reverse decay)
    const env = pos * pos * pos
    // High-pass filtered noise (cymbal-like)
    const ns = noise()
    const alpha = 0.92
    lp = lp * alpha + ns * (1 - alpha)
    const hp = ns - lp  // approximate high-pass
    s[i] = hp * env * 0.85
  }
  writeFileSync(join(OUT, 'reverse-cymbal.wav'), wav(s))
  console.log('✓ reverse-cymbal.wav')
}

// ─── 6. Downlifter ─────────────────────────────────────────────────────────
// Like a riser but going down — eerie falling sweep
{
  const dur = 3, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const pos = t / dur  // 0→1
    // Falling filter: 8000Hz → 80Hz
    const fc = 8000 * Math.pow(80 / 8000, pos)
    const alpha = fc / (fc + SR / (2 * Math.PI))
    const ns = noise()
    lp = lp + alpha * (ns - lp)
    const pitch = 600 * Math.pow(40 / 600, pos)
    const tone = sine(pitch * t) * 0.12
    // Fade out
    const env = 1 - pos * pos
    s[i] = (lp * 0.8 + tone) * env * 0.85
  }
  writeFileSync(join(OUT, 'downlifter.wav'), wav(s))
  console.log('✓ downlifter.wav')
}

// ─── 7. Snare Crack ────────────────────────────────────────────────────────
{
  const dur = 0.5, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let lp = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    // Noise with fast decay
    const env = Math.exp(-t * 40)
    const ns = noise()
    // Bandpass around 2kHz
    const alpha = 0.7
    lp = lp * alpha + ns * (1 - alpha)
    const bp = ns - lp
    // Tone at ~180Hz (drum body)
    const body = sine(180 * t) * Math.exp(-t * 60)
    s[i] = (bp * 0.7 + body * 0.3) * env * 0.9
  }
  writeFileSync(join(OUT, 'snare-crack.wav'), wav(s))
  console.log('✓ snare-crack.wav')
}

// ─── 8. Laser ──────────────────────────────────────────────────────────────
{
  const dur = 0.4, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    // Frequency sweeps down fast: 3000→200
    const freq = 3000 * Math.pow(200 / 3000, t / dur)
    phase += freq / SR
    const env = Math.exp(-t * 5)
    s[i] = sine(phase) * env * 0.85
  }
  writeFileSync(join(OUT, 'laser.wav'), wav(s))
  console.log('✓ laser.wav')
}

// ─── 9. Stab ───────────────────────────────────────────────────────────────
// Short brass/synth stab chord (C major triad: C3 E3 G3)
{
  const dur = 0.6, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  const freqs = [130.81, 164.81, 196.00]  // C3 E3 G3
  for (let i = 0; i < n; i++) {
    const t = i / SR
    const env = Math.exp(-t * 6)
    let v = 0
    for (const f of freqs) {
      v += sine(f * t) * 0.3
      // add harmonics for brass-like tone
      v += sine(f * 2 * t) * 0.15
      v += sine(f * 3 * t) * 0.05
    }
    s[i] = v * env * 0.8
  }
  writeFileSync(join(OUT, 'stab.wav'), wav(s))
  console.log('✓ stab.wav')
}

// ─── 10. Boom ──────────────────────────────────────────────────────────────
{
  const dur = 2, n = Math.ceil(SR * dur)
  const s = new Float32Array(n)
  let lp1 = 0, lp2 = 0
  for (let i = 0; i < n; i++) {
    const t = i / SR
    // Sub-bass boom: sine around 45Hz with pitch drop
    const freq = 80 * Math.exp(-t * 2) + 30
    const boom = sine(freq * t) * 0.6
    // Noise punch at start
    const ns = noise()
    const alpha = 0.98
    lp1 = lp1 * alpha + ns * (1 - alpha)
    lp2 = lp2 * 0.99 + lp1 * 0.01
    const punch = ns * 0.3 * Math.exp(-t * 20)
    const env = Math.exp(-t * 2)
    s[i] = (boom + punch) * env * 0.9
  }
  writeFileSync(join(OUT, 'boom.wav'), wav(s))
  console.log('✓ boom.wav')
}

// ─── Write index.json ──────────────────────────────────────────────────────
const index = [
  { file: 'impact.wav',         name: 'Impact',          icon: '💥', duration: 1.2 },
  { file: 'boom.wav',           name: 'Boom',             icon: '💣', duration: 2.0 },
  { file: 'riser.wav',          name: 'Riser',            icon: '⬆️', duration: 4.0 },
  { file: 'downlifter.wav',     name: 'Downlifter',       icon: '⬇️', duration: 3.0 },
  { file: 'whoosh.wav',         name: 'Whoosh',           icon: '💨', duration: 1.5 },
  { file: 'drop.wav',           name: 'Drop',             icon: '🎯', duration: 2.5 },
  { file: 'reverse-cymbal.wav', name: 'Reverse Cymbal',   icon: '🥁', duration: 2.0 },
  { file: 'snare-crack.wav',    name: 'Snare Crack',      icon: '🔥', duration: 0.5 },
  { file: 'laser.wav',          name: 'Laser',            icon: '⚡', duration: 0.4 },
  { file: 'stab.wav',           name: 'Stab',             icon: '🎺', duration: 0.6 },
]

writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2))
console.log('✓ index.json')
console.log(`\nDone — ${index.length} effects written to public/presets/fx/`)

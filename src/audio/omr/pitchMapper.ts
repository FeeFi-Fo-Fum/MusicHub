import type { Staff } from './staffDetector'
import type { Accidental } from './noteheadDetector'

// Diatonic pitch names, ascending.
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

// Bottom staff line pitch for each clef.
//   Treble: E4 (EGBDF from bottom)
//   Bass:   G2 (GBDFA from bottom)
const CLEF_BASE: Record<'treble' | 'bass', { letter: string; octave: number }> = {
  treble: { letter: 'E', octave: 4 },
  bass:   { letter: 'G', octave: 2 },
}

function stepUp(letter: string, octave: number, steps: number): { letter: string; octave: number } {
  let idx = LETTERS.indexOf(letter as typeof LETTERS[number])
  let oct = octave
  idx += steps
  while (idx < 0) { idx += 7; oct-- }
  while (idx >= 7) { idx -= 7; oct++ }
  return { letter: LETTERS[idx], octave: oct }
}

// Build a precise y → pitch lookup table for a staff, including ledger lines.
// Each diatonic step = half the line spacing (alternating space/line).
function buildPitchTable(staff: Staff): Array<{ y: number; pitch: string }> {
  const base = CLEF_BASE[staff.clef]
  const halfSpacing = staff.spacing / 2
  // Cover from 6 ledger lines below to 6 ledger lines above (24 diatonic steps each way).
  const range = 28
  const table: Array<{ y: number; pitch: string }> = []
  const bottomY = staff.lineYs[4]

  for (let step = -range; step <= range; step++) {
    const y = bottomY - step * halfSpacing
    const { letter, octave } = stepUp(base.letter, base.octave, step)
    table.push({ y, pitch: `${letter}${octave}` })
  }
  return table
}

// Convert a notehead y-position to a pitch, snapping to the nearest diatonic position.
export function yToPitch(y: number, staff: Staff, accidental: Accidental = null): string {
  const table = buildPitchTable(staff)

  // Find the nearest entry by y distance.
  let best = table[0], bestDist = Math.abs(y - table[0].y)
  for (const entry of table) {
    const d = Math.abs(y - entry.y)
    if (d < bestDist) { bestDist = d; best = entry }
  }

  let { pitch } = best
  const letter = pitch[0]
  const octave = parseInt(pitch.slice(1))

  // Apply notated accidental.
  if (accidental === 'sharp') {
    return `${letter}#${octave}`
  } else if (accidental === 'flat') {
    // Flatten: B→Bb, E→Eb, A→Ab, D→Db, G→Gb
    return `${letter}b${octave}`
  }
  // 'natural' and null leave the pitch unchanged.
  return pitch
}

// Apply a key signature to a set of notes: pitches listed in `affectedPitches`
// (e.g. ['F', 'C'] for D major) get an accidental appended to their pitch name,
// unless that note already has an explicit accidental.
export function applyKeySignature(
  pitch: string,
  keyAccidentals: Map<string, 'sharp' | 'flat'>,
  hasExplicitAccidental: boolean
): string {
  if (hasExplicitAccidental) return pitch
  const letter = pitch[0]
  const acc = keyAccidentals.get(letter)
  if (!acc) return pitch
  // Already has an accidental from a previous chromatic addition? Skip.
  if (pitch.length > 2) return pitch
  const octave = pitch.slice(1)
  return acc === 'sharp' ? `${letter}#${octave}` : `${letter}b${octave}`
}

// Standard key signature tables (circle of fifths).
export const SHARP_KEYS: string[][] = [
  [],                                          // C major / A minor
  ['F'],                                       // G major / E minor
  ['F', 'C'],                                  // D major / B minor
  ['F', 'C', 'G'],                             // A major / F# minor
  ['F', 'C', 'G', 'D'],                        // E major / C# minor
  ['F', 'C', 'G', 'D', 'A'],                   // B major / G# minor
  ['F', 'C', 'G', 'D', 'A', 'E'],              // F# major / D# minor
  ['F', 'C', 'G', 'D', 'A', 'E', 'B'],         // C# major
]
export const FLAT_KEYS: string[][] = [
  [],                                          // C major
  ['B'],                                       // F major / D minor
  ['B', 'E'],                                  // Bb major / G minor
  ['B', 'E', 'A'],                             // Eb major / C minor
  ['B', 'E', 'A', 'D'],                        // Ab major / F minor
  ['B', 'E', 'A', 'D', 'G'],                   // Db major / Bb minor
  ['B', 'E', 'A', 'D', 'G', 'C'],              // Gb major / Eb minor
  ['B', 'E', 'A', 'D', 'G', 'C', 'F'],         // Cb major
]

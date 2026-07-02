import { renderPdfPages } from './pdfRender'
import { binarize, medianFilter, type Bitmap } from './imageProcessing'
import { detectStaves, type Staff } from './staffDetector'
import { detectBarlines } from './barlineDetector'
import { detectNoteheads, type DetectedNotehead } from './noteheadDetector'
import { yToPitch, applyKeySignature, SHARP_KEYS, FLAT_KEYS } from './pitchMapper'
import { findBlobs } from './imageProcessing'

export interface OmrNote {
  pitch: string
  startStep: number
  duration: number
}

export interface OmrProgress {
  stage: string
  pageNum?: number
  totalPages?: number
}

// One bar = 16 sixteenth-note steps (matches the app's internal representation).
const STEPS_PER_MEASURE = 16

// ── Duration estimation ───────────────────────────────────────────────────────
// We use the notehead type (filled/hollow/whole) as the primary cue, then
// sanity-check against the inter-note x-distance to catch beamed groups.
function estimateDuration(note: DetectedNotehead, _spacing: number): number {
  if (note.isWhole)   return 16  // whole note
  if (!note.filled)   return 8   // half note
  if (note.hasFlag)   return 2   // eighth note (flag or beam)
  return 4                       // quarter note (default for filled+stem, no flag)
}

// ── Key signature detection ───────────────────────────────────────────────────
// Scan the leftmost portion of the staff (after the clef) for accidental blobs.
// Sharps appear near the top; flats appear in the middle of the staff.
function detectKeySignature(
  bmp: Bitmap,
  staff: Staff
): Map<string, 'sharp' | 'flat'> {
  const spacing = staff.spacing
  const staffWidth = staff.x1 - staff.x0
  // Key signature lives roughly between 5% and 20% of staff width.
  const kx0 = Math.round(staff.x0 + staffWidth * 0.05)
  const kx1 = Math.round(staff.x0 + staffWidth * 0.22)
  const ky0 = Math.round(staff.lineYs[0] - spacing * 2)
  const ky1 = Math.round(staff.lineYs[4] + spacing * 2)

  const blobs = findBlobs(bmp, {
    x0: Math.max(0, kx0), y0: Math.max(0, ky0),
    x1: Math.min(bmp.width - 1, kx1), y1: Math.min(bmp.height - 1, ky1),
  })

  // Filter to tall, narrow blobs (accidentals are taller than they are wide).
  const accidentalBlobs = blobs.filter(b => {
    const h = b.maxY - b.minY + 1
    const w = b.maxX - b.minX + 1
    return h > spacing * 1.2 && w < spacing * 1.5 && b.pixelCount > spacing * spacing * 0.15
  })

  if (accidentalBlobs.length === 0) return new Map()

  // Sort left-to-right to process in order.
  accidentalBlobs.sort((a, b) => a.minX - b.minX)

  // Determine if the key uses sharps or flats by the y-position of the first accidental.
  // Treble clef: first sharp is on F5 (top staff line), first flat is on Bb4 (3rd space).
  const firstY = accidentalBlobs[0].centerY
  const topLine = staff.lineYs[0]
  const midLine = staff.lineYs[2]
  const isSharpKey = firstY < (topLine + midLine) / 2  // first accidental in upper half

  const count = Math.min(accidentalBlobs.length, 7)
  const table = isSharpKey ? SHARP_KEYS : FLAT_KEYS
  const affectedLetters = table[Math.min(count, table.length - 1)]

  const result = new Map<string, 'sharp' | 'flat'>()
  for (const letter of affectedLetters) {
    result.set(letter, isSharpKey ? 'sharp' : 'flat')
  }
  return result
}

// ── System grouping ───────────────────────────────────────────────────────────
function groupIntoSystems(staves: Staff[]): Staff[][] {
  if (staves.length === 0) return []
  const sorted = [...staves].sort((a, b) => a.lineYs[0] - b.lineYs[0])
  const systems: Staff[][] = []
  let current: Staff[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const cur = sorted[i]
    const gap = cur.lineYs[0] - prev.lineYs[4]
    const staffH = prev.lineYs[4] - prev.lineYs[0]
    // Within a grand staff system: gap < 3.5× staff height AND no more than 2 staves.
    if (gap < staffH * 3.5 && current.length < 2) {
      current.push(cur)
    } else {
      systems.push(current)
      current = [cur]
    }
  }
  systems.push(current)
  return systems
}

function assignClefs(system: Staff[]): Staff[] {
  if (system.length === 1) return [{ ...system[0], clef: 'treble' }]
  return system.map((s, i) => ({ ...s, clef: (i === 0 ? 'treble' : 'bass') as 'treble' | 'bass' }))
}

// ── Group noteheads into chord columns ───────────────────────────────────────
function groupColumns(heads: DetectedNotehead[], spacing: number): DetectedNotehead[][] {
  const sorted = [...heads].sort((a, b) => a.x - b.x)
  const cols: DetectedNotehead[][] = []
  for (const h of sorted) {
    const last = cols[cols.length - 1]
    // Two notes in the same chord if their x centres are within 0.65× spacing.
    if (last && Math.abs(h.x - last[0].x) < spacing * 0.65) {
      last.push(h)
    } else {
      cols.push([h])
    }
  }
  return cols
}

// ── Process one staff into OmrNotes ──────────────────────────────────────────
function processStaff(
  bmp: Bitmap,
  staff: Staff,
  measureBarlines: number[],
  stepOffset: number,
  keyAccidentals: Map<string, 'sharp' | 'flat'>
): OmrNote[] {
  const heads = detectNoteheads(bmp, staff)
  if (heads.length === 0) return []

  const spacing = staff.spacing
  const cols = groupColumns(heads, spacing)
  const notes: OmrNote[] = []

  // Build measure boundaries: barlines between staff start/end, plus staff edges.
  const barlines = measureBarlines.filter(x => x > staff.x0 && x < staff.x1)
  const bounds = [staff.x0, ...barlines, staff.x1]

  for (let m = 0; m < bounds.length - 1; m++) {
    const mStart = bounds[m]
    const mEnd   = bounds[m + 1]
    const mLen   = mEnd - mStart
    const mStep  = stepOffset + m * STEPS_PER_MEASURE

    const colsInMeasure = cols.filter(c => c[0].x >= mStart && c[0].x < mEnd)
    if (colsInMeasure.length === 0) continue

    for (let ci = 0; ci < colsInMeasure.length; ci++) {
      const col = colsInMeasure[ci]

      // x-fraction within the measure → step position.
      const frac = Math.max(0, Math.min(1, (col[0].x - mStart) / mLen))
      const startStep = mStep + Math.round(frac * (STEPS_PER_MEASURE - 1))

      // Duration: use notehead type, then clamp to remaining measure space.
      const dur = estimateDuration(col[0], spacing)
      const nextFrac = ci + 1 < colsInMeasure.length
        ? Math.max(0, Math.min(1, (colsInMeasure[ci + 1][0].x - mStart) / mLen))
        : 1
      const nextStep = mStep + Math.round(nextFrac * STEPS_PER_MEASURE)
      // Use the smaller of type-based duration and x-gap to next note.
      const duration = Math.max(1, Math.min(dur, nextStep - startStep))

      for (const head of col) {
        // Map y → pitch, then apply key signature.
        const rawPitch = yToPitch(head.y, staff, head.accidental)
        const hasExplicit = head.accidental !== null
        const pitch = applyKeySignature(rawPitch, keyAccidentals, hasExplicit)
        notes.push({ pitch, startStep, duration })
      }
    }
  }

  return notes
}

// ── Public entry point ────────────────────────────────────────────────────────
export async function recognizeSheetMusic(
  file: File,
  onProgress?: (p: OmrProgress) => void
): Promise<OmrNote[]> {
  onProgress?.({ stage: 'Rendering PDF…' })
  const pages = await renderPdfPages(file, 3.0) // render at 3× for better detail

  const allNotes: OmrNote[] = []
  let stepOffset = 0

  for (const page of pages) {
    onProgress?.({ stage: `Analyzing page ${page.pageNum}…`, pageNum: page.pageNum, totalPages: pages.length })

    // Binarize with Otsu's threshold, then denoise.
    const rawBmp = binarize(page.imageData)
    const bmp    = medianFilter(rawBmp)

    const staves  = detectStaves(bmp)
    const systems = groupIntoSystems(staves)

    for (const system of systems) {
      const clefStaves = assignClefs(system)
      const refStaff   = clefStaves[0]
      const barlines   = detectBarlines(bmp, refStaff)

      // Detect key signature once per system (from the treble/top staff).
      const keyAccidentals = detectKeySignature(bmp, refStaff)

      const numMeasures = Math.max(
        1,
        barlines.filter(x => x > refStaff.x0 && x < refStaff.x1).length + 1
      )

      for (const staff of clefStaves) {
        const notes = processStaff(bmp, staff, barlines, stepOffset, keyAccidentals)
        allNotes.push(...notes)
      }

      stepOffset += numMeasures * STEPS_PER_MEASURE
    }
  }

  // Sort all notes by startStep for cleaner ordering.
  allNotes.sort((a, b) => a.startStep - b.startStep || a.pitch.localeCompare(b.pitch))

  onProgress?.({ stage: 'Done' })
  return allNotes
}

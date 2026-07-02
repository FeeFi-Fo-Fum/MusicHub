import type { Bitmap, Blob } from './imageProcessing'
import { findBlobs, fillRatio, removeStaffLines, regionInk } from './imageProcessing'
import type { Staff } from './staffDetector'

export type Accidental = 'sharp' | 'flat' | 'natural' | null

export interface DetectedNotehead {
  x: number
  y: number
  filled: boolean    // filled = quarter/eighth; hollow = half/whole
  hasFlag: boolean   // eighth note flag or beam
  hasStem: boolean
  isWhole: boolean   // whole note (hollow, no stem)
  accidental: Accidental
}

export function detectNoteheads(bmp: Bitmap, staff: Staff): DetectedNotehead[] {
  const spacing = staff.spacing

  // Remove staff lines first so they don't create false blob connections.
  const clean = removeStaffLines(bmp, staff.lineYs, spacing)

  // Vertical scan region: 4 ledger lines above and below the staff.
  const top    = Math.max(0, Math.round(staff.lineYs[0] - spacing * 4.5))
  const bottom = Math.min(bmp.height - 1, Math.round(staff.lineYs[4] + spacing * 4.5))

  // Skip the left margin (clef + key signature occupy roughly 12% of staff width).
  const clefEnd = Math.round(staff.x0 + (staff.x1 - staff.x0) * 0.12)

  const blobs = findBlobs(clean, {
    x0: clefEnd,
    y0: top,
    x1: Math.round(staff.x1),
    y1: bottom,
  })

  // Notehead size constraints: about 0.65–1.8× the line spacing in both dimensions.
  const minSize = spacing * 0.55
  const maxSize = spacing * 1.85

  const noteheads: DetectedNotehead[] = []

  for (const blob of blobs) {
    const w = blob.maxX - blob.minX + 1
    const h = blob.maxY - blob.minY + 1
    if (w < minSize || w > maxSize) continue
    if (h < minSize || h > maxSize) continue

    // Noteheads are roughly elliptical (aspect ratio 0.6–1.7).
    const aspect = w / h
    if (aspect < 0.50 || aspect > 1.75) continue

    // Fill ratio distinguishes filled from hollow noteheads.
    const fr = fillRatio(clean, blob)

    // Reject blobs with extreme fill ratio — likely artefacts (thin lines, dots).
    if (fr < 0.18 || fr > 0.97) continue

    // Minimum pixel mass to reject tiny noise blobs.
    if (blob.pixelCount < spacing * spacing * 0.25) continue

    const filled = fr > 0.50
    const stem = detectStem(bmp, blob, spacing)
    const isWhole = !filled && !stem
    const hasFlag = filled && stem ? detectFlagOrBeam(bmp, blob, spacing) : false
    const accidental = detectAccidental(bmp, blob, staff, spacing)

    noteheads.push({
      x: blob.centerX,
      y: blob.centerY,
      filled,
      hasFlag,
      hasStem: stem,
      isWhole,
      accidental,
    })
  }

  return dedupe(noteheads, spacing)
}

// Look for a vertical stem extending from either side of the notehead.
function detectStem(bmp: Bitmap, blob: Blob, spacing: number): boolean {
  const stemLen = Math.round(spacing * 2.8)
  const checkXs = [blob.maxX + 1, blob.minX - 1]
  for (const x of checkXs) {
    if (x < 0 || x >= bmp.width) continue
    let count = 0
    for (let dy = -stemLen; dy <= stemLen; dy++) {
      const y = Math.round(blob.centerY) + dy
      if (y < 0 || y >= bmp.height) continue
      if (bmp.data[y * bmp.width + x]) count++
    }
    if (count > stemLen * 0.55) return true
  }
  return false
}

// Detect a flag (eighth-note flag) or beam attached to the stem tip.
// We look for horizontal ink beyond the stem endpoint.
function detectFlagOrBeam(bmp: Bitmap, blob: Blob, spacing: number): boolean {
  const stemLen = Math.round(spacing * 2.8)
  // Check above and below the notehead for beam/flag ink in a horizontal band.
  const stemTipY = [
    blob.centerY - stemLen,
    blob.centerY + stemLen,
  ]
  for (const tipY of stemTipY) {
    const y = Math.round(tipY)
    if (y < 0 || y >= bmp.height) continue
    // Look in a band ±2px around the stem tip for horizontal ink extending away from the stem.
    const checkX = blob.maxX + 1
    let horizInk = 0
    for (let dy = -2; dy <= 2; dy++) {
      const row = y + dy
      if (row < 0 || row >= bmp.height) continue
      for (let dx = 1; dx <= Math.round(spacing * 1.5); dx++) {
        if (checkX + dx < bmp.width && bmp.data[row * bmp.width + (checkX + dx)]) horizInk++
      }
    }
    if (horizInk > spacing * 0.4) return true
  }
  return false
}

// Detect an accidental (sharp, flat, natural) immediately to the left of the notehead.
function detectAccidental(bmp: Bitmap, blob: Blob, staff: Staff, spacing: number): Accidental {
  const spacing2 = spacing * 2
  // Accidentals live in the window just left of the notehead.
  const ax1 = blob.minX - Math.round(spacing * 0.3)
  const ax0 = ax1 - Math.round(spacing * 2.5)
  const ay0 = Math.round(blob.centerY - spacing2)
  const ay1 = Math.round(blob.centerY + spacing2)

  if (ax0 < staff.x0 || ax1 <= ax0) return null

  // Find the largest blob in the accidental search window.
  const accBlobs = findBlobs(bmp, {
    x0: Math.max(0, ax0), y0: Math.max(0, ay0),
    x1: Math.min(bmp.width - 1, ax1), y1: Math.min(bmp.height - 1, ay1),
  })
  if (accBlobs.length === 0) return null

  // Pick the tallest blob (accidentals are tall).
  const candidate = accBlobs.reduce((best, b) =>
    (b.maxY - b.minY) > (best.maxY - best.minY) ? b : best)

  const accH = candidate.maxY - candidate.minY + 1
  const accW = candidate.maxX - candidate.minX + 1

  // Must be taller than 1× spacing to be an accidental (not a dot or artefact).
  if (accH < spacing * 1.0) return null

  // Classify by shape:
  //   Sharp:   tall and wide (two vertical lines, two horizontal strokes) — high fill
  //   Flat:    tall and narrow, fill ratio moderate
  //   Natural: tall, moderate width, two horizontal 'wings'
  const fr = fillRatio(bmp, candidate)
  const aspect = accW / accH

  if (accH > spacing * 1.8 && aspect > 0.35 && fr > 0.25) {
    // Sharps have visible horizontal strokes — look for horizontal runs in the middle.
    const midY = Math.round(candidate.centerY)
    const horizInk = regionInk(bmp, candidate.minX, midY - 2, candidate.maxX, midY + 2)
    const horizDensity = horizInk / (accW * 5 || 1)
    if (horizDensity > 0.3) return 'sharp'
  }

  if (accH > spacing * 1.5 && aspect < 0.5) {
    // Flat: tall, narrow — check for a loop (high fill in lower half).
    const lowerInk = regionInk(bmp, candidate.minX, Math.round(candidate.centerY), candidate.maxX, candidate.maxY)
    const lowerRatio = lowerInk / (accW * (accH / 2) || 1)
    if (lowerRatio > 0.3) return 'flat'
  }

  if (accH > spacing * 1.4) return 'natural'

  return null
}

// Remove near-duplicate detections.
function dedupe(heads: DetectedNotehead[], spacing: number): DetectedNotehead[] {
  const out: DetectedNotehead[] = []
  for (const h of heads) {
    const dup = out.find(o => Math.abs(o.x - h.x) < spacing * 0.45 && Math.abs(o.y - h.y) < spacing * 0.45)
    if (!dup) out.push(h)
  }
  return out
}

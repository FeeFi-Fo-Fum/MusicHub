import type { Bitmap } from './imageProcessing'
import { rowDensity, regionInk } from './imageProcessing'

export interface Staff {
  lineYs: number[]   // 5 y-coordinates, top to bottom
  spacing: number    // average inter-line gap
  x0: number; x1: number
  clef: 'treble' | 'bass'
}

export function detectStaves(bmp: Bitmap): Staff[] {
  const density = rowDensity(bmp)

  // Dynamic threshold: use the 85th-percentile density value as the bar for "staff line".
  // This adapts to scan quality and zoom level.
  const sorted = Array.from(density).sort((a, b) => a - b)
  const p85 = sorted[Math.floor(sorted.length * 0.85)]
  const THRESH = Math.max(0.20, Math.min(0.55, p85 * 0.8))

  const candidateRows: number[] = []
  for (let y = 0; y < density.length; y++)
    if (density[y] > THRESH) candidateRows.push(y)
  if (candidateRows.length === 0) return []

  // Collapse consecutive pixel runs into single line centres.
  const lines: number[] = []
  let runStart = candidateRows[0], prev = candidateRows[0]
  for (let i = 1; i <= candidateRows.length; i++) {
    const y = candidateRows[i]
    if (y === prev + 1) { prev = y }
    else {
      lines.push(Math.round((runStart + prev) / 2))
      if (i < candidateRows.length) { runStart = y; prev = y }
    }
  }

  // Group into staves of 5 with consistent spacing.
  const staves: Staff[] = []
  let i = 0
  while (i + 4 < lines.length) {
    const group = lines.slice(i, i + 5)
    const gaps = group.slice(1).map((y, idx) => y - group[idx])
    const avgGap = gaps.reduce((a, b) => a + b, 0) / 4
    // Allow up to 40% deviation per gap (handles slight skew / zoomed PDFs).
    const consistent = gaps.every(g => Math.abs(g - avgGap) < avgGap * 0.40) && avgGap > 3

    if (consistent) {
      staves.push({ lineYs: group, spacing: avgGap, x0: 0, x1: bmp.width, clef: 'treble' })
      i += 5
    } else {
      i += 1
    }
  }

  // Refine horizontal extent for each staff.
  return staves.map(s => ({ ...s, ...staffExtent(bmp, s) }))
}

// Find the leftmost and rightmost ink columns in the staff's vertical band.
export function staffExtent(bmp: Bitmap, staff: Staff): { x0: number; x1: number } {
  const yMid = staff.lineYs[2]
  const band = Math.round(staff.spacing * 2.5)
  const y0 = Math.max(0, yMid - band)
  const y1 = Math.min(bmp.height - 1, yMid + band)

  let x0 = bmp.width, x1 = 0
  // Scan in vertical slices of width 4 to avoid single-pixel noise.
  for (let x = 0; x < bmp.width - 3; x += 1) {
    const ink = regionInk(bmp, x, y0, x + 3, y1)
    if (ink > 0) {
      if (x < x0) x0 = x
      if (x + 3 > x1) x1 = x + 3
    }
  }
  return { x0: Math.max(0, x0), x1: Math.min(bmp.width - 1, x1) }
}

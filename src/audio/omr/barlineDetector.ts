import type { Bitmap } from './imageProcessing'
import { columnDensity } from './imageProcessing'
import type { Staff } from './staffDetector'

// Detect barlines: vertical strokes spanning the full staff height.
// Uses column density with hysteresis to avoid splitting thick barlines.
export function detectBarlines(bmp: Bitmap, staff: Staff): number[] {
  const top    = staff.lineYs[0]
  const bottom = staff.lineYs[4]
  const density = columnDensity(bmp, top, bottom)

  // Barlines must cover > 80% of the staff height.
  const THRESH = 0.80
  const bars: number[] = []
  for (let x = Math.round(staff.x0); x <= Math.round(staff.x1); x++) {
    if (density[x] > THRESH) bars.push(x)
  }

  if (bars.length === 0) return []

  // Collapse consecutive columns into single centre positions.
  const collapsed: number[] = []
  let runStart = bars[0], prev = bars[0]
  for (let i = 1; i <= bars.length; i++) {
    const x = bars[i]
    if (x === prev + 1) { prev = x }
    else {
      collapsed.push(Math.round((runStart + prev) / 2))
      if (i < bars.length) { runStart = x; prev = x }
    }
  }

  // Filter out barlines that are too close together (< 2 staff spacings apart) —
  // these are likely double barlines or thick repeat signs; keep one representative.
  const minGap = staff.spacing * 2
  const filtered: number[] = [collapsed[0]]
  for (let i = 1; i < collapsed.length; i++) {
    if (collapsed[i] - filtered[filtered.length - 1] >= minGap) {
      filtered.push(collapsed[i])
    }
  }

  return filtered
}

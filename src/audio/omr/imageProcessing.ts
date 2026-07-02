export interface Bitmap {
  width: number
  height: number
  data: Uint8Array // 1 = ink, 0 = background
}

export interface Blob {
  minX: number; maxX: number; minY: number; maxY: number
  pixelCount: number
  centerX: number; centerY: number
}

// Otsu's method — finds the optimal global threshold by maximising between-class variance.
export function otsuThreshold(img: ImageData): number {
  const n = img.width * img.height
  const hist = new Int32Array(256)
  for (let i = 0; i < n; i++) {
    const r = img.data[i * 4], g = img.data[i * 4 + 1], b = img.data[i * 4 + 2]
    hist[Math.round(0.299 * r + 0.587 * g + 0.114 * b)]++
  }
  let totalSum = 0
  for (let i = 0; i < 256; i++) totalSum += i * hist[i]
  let sumB = 0, wB = 0, max = 0, threshold = 128
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (wB === 0) continue
    const wF = n - wB; if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (totalSum - sumB) / wF
    const between = wB * wF * (mB - mF) ** 2
    if (between > max) { max = between; threshold = t }
  }
  return threshold
}

// Binarize using Otsu's optimal threshold (much better than fixed 128 for scanned scores).
export function binarize(img: ImageData): Bitmap {
  const { width, height, data } = img
  const threshold = otsuThreshold(img)
  const out = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    out[i] = gray < threshold ? 1 : 0
  }
  return { width, height, data: out }
}

export function get(bmp: Bitmap, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= bmp.width || y >= bmp.height) return 0
  return bmp.data[y * bmp.width + x]
}

// Row ink-density histogram.
export function rowDensity(bmp: Bitmap): Float32Array {
  const out = new Float32Array(bmp.height)
  for (let y = 0; y < bmp.height; y++) {
    let count = 0
    for (let x = 0; x < bmp.width; x++) count += bmp.data[y * bmp.width + x]
    out[y] = count / bmp.width
  }
  return out
}

// Column ink-density between y0..y1.
export function columnDensity(bmp: Bitmap, y0: number, y1: number): Float32Array {
  const out = new Float32Array(bmp.width)
  const h = y1 - y0 + 1
  for (let x = 0; x < bmp.width; x++) {
    let count = 0
    for (let y = y0; y <= y1; y++) count += get(bmp, x, y)
    out[x] = count / h
  }
  return out
}

// Remove staff line pixels: for each staff line y, erase long horizontal runs
// but leave isolated ink (notehead pixels that cross the line).
export function removeStaffLines(bmp: Bitmap, lineYs: number[], spacing: number): Bitmap {
  const copy = new Uint8Array(bmp.data)
  const bandwidth = Math.max(1, Math.round(spacing * 0.25))
  const minRun = Math.round(spacing * 2) // must span at least 2 staff spacings to be a line

  for (const lineY of lineYs) {
    for (let dy = -bandwidth; dy <= bandwidth; dy++) {
      const y = lineY + dy
      if (y < 0 || y >= bmp.height) continue
      // Scan for horizontal runs
      let runStart = -1
      for (let x = 0; x <= bmp.width; x++) {
        const on = x < bmp.width && copy[y * bmp.width + x] === 1
        if (on && runStart < 0) { runStart = x }
        else if (!on && runStart >= 0) {
          const runLen = x - runStart
          if (runLen >= minRun) {
            for (let rx = runStart; rx < x; rx++) copy[y * bmp.width + rx] = 0
          }
          runStart = -1
        }
      }
    }
  }
  return { width: bmp.width, height: bmp.height, data: copy }
}

// 3×3 median filter — reduces salt-and-pepper noise in scanned images.
export function medianFilter(bmp: Bitmap): Bitmap {
  const out = new Uint8Array(bmp.width * bmp.height)
  for (let y = 1; y < bmp.height - 1; y++) {
    for (let x = 1; x < bmp.width - 1; x++) {
      let sum = 0
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          sum += bmp.data[(y + dy) * bmp.width + (x + dx)]
      out[y * bmp.width + x] = sum >= 5 ? 1 : 0
    }
  }
  return { width: bmp.width, height: bmp.height, data: out }
}

// Morphological dilation (square structuring element).
export function dilate(bmp: Bitmap, r: number): Bitmap {
  const out = new Uint8Array(bmp.width * bmp.height)
  for (let y = 0; y < bmp.height; y++) {
    for (let x = 0; x < bmp.width; x++) {
      let found = false
      outer: for (let dy = -r; dy <= r && !found; dy++)
        for (let dx = -r; dx <= r && !found; dx++)
          if (get(bmp, x + dx, y + dy)) found = true
      if (found) out[y * bmp.width + x] = 1
    }
  }
  return { width: bmp.width, height: bmp.height, data: out }
}

// Morphological erosion.
export function erode(bmp: Bitmap, r: number): Bitmap {
  const out = new Uint8Array(bmp.width * bmp.height)
  for (let y = 0; y < bmp.height; y++) {
    for (let x = 0; x < bmp.width; x++) {
      let all = true
      outer: for (let dy = -r; dy <= r && all; dy++)
        for (let dx = -r; dx <= r && all; dx++)
          if (!get(bmp, x + dx, y + dy)) all = false
      if (all) out[y * bmp.width + x] = 1
    }
  }
  return { width: bmp.width, height: bmp.height, data: out }
}

// 4-connected flood-fill blob labeling, optionally restricted to a region.
export function findBlobs(
  bmp: Bitmap,
  region?: { x0: number; y0: number; x1: number; y1: number }
): Blob[] {
  const { width, height, data } = bmp
  const x0 = region?.x0 ?? 0, y0 = region?.y0 ?? 0
  const x1 = Math.min(region?.x1 ?? width, width)
  const y1 = Math.min(region?.y1 ?? height, height)
  const visited = new Uint8Array(width * height)
  const blobs: Blob[] = []
  const stack: number[] = []

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = y * width + x
      if (data[idx] === 0 || visited[idx]) continue

      let minX = x, maxX = x, minY = y, maxY = y, count = 0, sumX = 0, sumY = 0
      stack.push(idx); visited[idx] = 1

      while (stack.length) {
        const cur = stack.pop()!
        const cy = Math.floor(cur / width), cx = cur % width
        count++; sumX += cx; sumY += cy
        if (cx < minX) minX = cx; if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy; if (cy > maxY) maxY = cy

        for (const n of [cur - 1, cur + 1, cur - width, cur + width]) {
          if (n < 0 || n >= width * height) continue
          if (Math.abs((n % width) - cx) > 1) continue // wrap guard
          if (data[n] === 1 && !visited[n]) { visited[n] = 1; stack.push(n) }
        }
      }
      blobs.push({ minX, maxX, minY, maxY, pixelCount: count, centerX: sumX / count, centerY: sumY / count })
    }
  }
  return blobs
}

// Fraction of bounding-box pixels that are ink.
export function fillRatio(_bmp: Bitmap, blob: Blob): number {
  const w = blob.maxX - blob.minX + 1
  const h = blob.maxY - blob.minY + 1
  return blob.pixelCount / (w * h)
}

// Count ink pixels in an arbitrary rectangular region.
export function regionInk(bmp: Bitmap, x0: number, y0: number, x1: number, y1: number): number {
  let count = 0
  for (let y = Math.max(0, y0); y <= Math.min(bmp.height - 1, y1); y++)
    for (let x = Math.max(0, x0); x <= Math.min(bmp.width - 1, x1); x++)
      count += bmp.data[y * bmp.width + x]
  return count
}

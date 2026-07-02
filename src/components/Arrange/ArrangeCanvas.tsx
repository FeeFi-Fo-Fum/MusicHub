import { useRef, useEffect, useCallback, useState, useSyncExternalStore } from 'react'
import { useArrangementStore, type Clip, type ArrTrack } from '../../store/arrangementStore'
import { useStore } from '../../store'
import * as Tone from 'tone'

// Watch data-theme changes so canvas redraws when theme switches
function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb)
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => obs.disconnect()
}
function getThemeSnap() { return document.documentElement.dataset.theme ?? '' }

const BAR_W = 80       // px per bar
const STEP_W = BAR_W / 16  // px per 16th note = 5
const TRACK_H = 72     // px per track row (must match arr-track-header height in CSS)
const RULER_H = 16     // px for top ruler — kept tiny so it doesn't look like a clip bar
const RESIZE_HIT = 14  // px from right edge = resize handle

// Snap a bar value to the nearest 16th note
function snapToStep(bars: number): number {
  return Math.max(1 / 16, Math.round(bars * 16) / 16)
}

type DragState =
  | { type: 'move'; clipId: string; startBar: number; mouseBar0: number; origTrackId: string; clipType: string }
  | { type: 'resize'; clipId: string; origLen: number; mouseBar0: number }
  | { type: 'create'; trackId: string; startBar: number; clipId: string }
  | { type: 'loop'; bar0: number }
  | { type: 'seek' }

interface Props {
  tracks: ArrTrack[]
  onClipDoubleClick: (clip: Clip) => void
}

export default function ArrangeCanvas({ tracks, onClipDoubleClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { clips, totalBars, playheadBar, addClip, moveClip, resizeClip, removeClip, duplicateClip, loopStart, loopEnd, loopEnabled, setLoopRegion, setPlayheadBar } = useArrangementStore()
  const bpm = useStore((s) => s.bpm)
  const drag = useRef<DragState | null>(null)
  const [cursor, setCursor] = useState('default')
  const _theme = useSyncExternalStore(subscribeTheme, getThemeSnap)

  const W = Math.max(totalBars, 32) * BAR_W
  const H = RULER_H + tracks.length * TRACK_H

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, W, H)

    const style = getComputedStyle(document.documentElement)
    const cBg   = style.getPropertyValue('--bg').trim()
    const cBg2  = style.getPropertyValue('--bg2').trim()
    const cBg3  = style.getPropertyValue('--bg3').trim()
    const cBorder = style.getPropertyValue('--border').trim()
    const cText2  = style.getPropertyValue('--text2').trim()

    // Background
    ctx.fillStyle = cBg
    ctx.fillRect(0, 0, W, H)

    // Track row backgrounds (alternating)
    tracks.forEach((_, i) => {
      const y = RULER_H + i * TRACK_H
      ctx.fillStyle = i % 2 === 0 ? cBg2 : cBg3
      ctx.fillRect(0, y, W, TRACK_H)
      ctx.strokeStyle = cBorder
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, y + TRACK_H)
      ctx.lineTo(W, y + TRACK_H)
      ctx.stroke()
    })

    // Ruler
    ctx.fillStyle = cBg
    ctx.fillRect(0, 0, W, RULER_H)
    ctx.strokeStyle = cBorder
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, RULER_H)
    ctx.lineTo(W, RULER_H)
    ctx.stroke()

    for (let b = 0; b <= Math.max(totalBars, 32); b++) {
      const x = b * BAR_W
      const isBeat4 = b % 4 === 0
      ctx.strokeStyle = cBorder
      ctx.lineWidth = isBeat4 ? 1 : 0.5
      ctx.globalAlpha = isBeat4 ? 0.8 : 0.4
      ctx.beginPath()
      ctx.moveTo(x, RULER_H)
      ctx.lineTo(x, H)
      ctx.stroke()
      ctx.globalAlpha = 1
      if (isBeat4) {
        ctx.strokeStyle = cBorder
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, RULER_H - 5)
        ctx.lineTo(x, RULER_H)
        ctx.stroke()
        ctx.fillStyle = cText2
        ctx.font = '8px system-ui'
        ctx.textAlign = 'left'
        ctx.fillText(`${b + 1}`, x + 2, RULER_H - 3)
      }
    }

    // Clips
    for (const clip of clips) {
      const ti = tracks.findIndex((t) => t.id === clip.trackId)
      if (ti < 0) continue
      const x = clip.startBar * BAR_W + 2
      const y = RULER_H + ti * TRACK_H + 4
      const w = clip.lengthBars * BAR_W - 4
      const h = TRACK_H - 8

      // Shadow
      ctx.shadowColor = clip.color + '44'
      ctx.shadowBlur = 8
      ctx.fillStyle = clip.color + 'cc'
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, 6)
      ctx.fill()
      ctx.shadowBlur = 0

      // Top shine
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.beginPath()
      ctx.roundRect(x + 2, y + 2, w - 4, h * 0.4, [4, 4, 0, 0])
      ctx.fill()

      // Waveform squiggle decoration
      ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      const midY = y + h / 2
      for (let px = x + 6; px < x + w - 6; px += 3) {
        const amp = 6 * Math.sin((px - x) * 0.3)
        px === x + 6 ? ctx.moveTo(px, midY + amp) : ctx.lineTo(px, midY + amp)
      }
      ctx.stroke()

      // Resize handle
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillRect(x + w - 8, y + 4, 4, h - 8)

      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.font = `bold 11px system-ui`
      ctx.textAlign = 'left'
      ctx.fillText(clip.name, x + 8, y + 16, w - 20)
    }

    // Loop region overlay
    if (loopEnabled && loopStart != null && loopEnd != null && loopEnd > loopStart) {
      const lx = loopStart * BAR_W
      const lw = (loopEnd - loopStart) * BAR_W
      ctx.fillStyle = 'rgba(124,92,252,0.12)'
      ctx.fillRect(lx, RULER_H, lw, H - RULER_H)
      ctx.fillStyle = 'rgba(124,92,252,0.5)'
      ctx.fillRect(lx, 0, lw, RULER_H)
      ctx.strokeStyle = '#7c5cfc'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(lx, 0); ctx.lineTo(lx, H); ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(lx + lw, 0); ctx.lineTo(lx + lw, H); ctx.stroke()
    }

    // Playhead — triangle sits in the thin ruler, line runs through tracks
    const px = playheadBar * BAR_W
    ctx.strokeStyle = '#ffdc3c'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(px, RULER_H)
    ctx.lineTo(px, H)
    ctx.stroke()
    // Small triangle marker in the ruler
    ctx.fillStyle = '#ffdc3c'
    ctx.beginPath()
    ctx.moveTo(px - 5, 0)
    ctx.lineTo(px + 5, 0)
    ctx.lineTo(px, RULER_H - 1)
    ctx.closePath()
    ctx.fill()
  }, [clips, tracks, totalBars, playheadBar, loopStart, loopEnd, loopEnabled, W, H, _theme])

  useEffect(() => { draw() }, [draw])

  function trackFromY(y: number) { return Math.floor((y - RULER_H) / TRACK_H) }

  function hitTest(x: number, y: number): { clip: Clip; isResize: boolean } | null {
    const ti = trackFromY(y)
    if (ti < 0 || ti >= tracks.length) return null
    const trackId = tracks[ti].id
    for (const clip of [...clips].reverse()) {
      if (clip.trackId !== trackId) continue
      const cx = clip.startBar * BAR_W
      const cw = clip.lengthBars * BAR_W
      if (x >= cx && x <= cx + cw) {
        return { clip, isResize: x >= cx + cw - RESIZE_HIT }
      }
    }
    return null
  }

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    if (y < RULER_H) {
      if (e.shiftKey) {
        // Shift+drag on ruler sets loop region
        drag.current = { type: 'loop', bar0: Math.floor(x / BAR_W) }
      } else {
        // Click/drag on ruler = seek playhead
        const bar = Math.max(0, x / BAR_W)
        setPlayheadBar(bar)
        // Seek transport
        const seconds = bar * 4 * (60 / bpm)
        Tone.getTransport().seconds = seconds
        drag.current = { type: 'seek' }
      }
      return
    }

    if (e.button === 2) {
      const hit = hitTest(x, y)
      if (hit) removeClip(hit.clip.id)
      return
    }

    const hit = hitTest(x, y)
    if (hit) {
      if (hit.isResize) {
        drag.current = { type: 'resize', clipId: hit.clip.id, origLen: hit.clip.lengthBars, mouseBar0: x / BAR_W }
      } else if (e.altKey) {
        // Alt+drag: duplicate the clip and drag the copy
        const newId = duplicateClip(hit.clip.id)
        drag.current = {
          type: 'move', clipId: newId, startBar: hit.clip.startBar + hit.clip.lengthBars,
          mouseBar0: x / BAR_W, origTrackId: hit.clip.trackId,
          clipType: hit.clip.type,
        }
      } else {
        drag.current = {
          type: 'move', clipId: hit.clip.id, startBar: hit.clip.startBar,
          mouseBar0: x / BAR_W, origTrackId: hit.clip.trackId,
          clipType: hit.clip.type,
        }
      }
    } else {
      const ti = trackFromY(y)
      if (ti < 0 || ti >= tracks.length) return
      const bar = snapToStep(x / BAR_W)
      const track = tracks[ti]
      const id = addClip({
        trackId: track.id,
        startBar: bar,
        lengthBars: 1,
        name: 'New Clip',
        color: track.color,
        type: track.type === 'drums' ? 'beat' : track.type === 'fx' ? 'audio' : 'melody',
        data: {},
      })
      drag.current = { type: 'create', trackId: track.id, startBar: bar, clipId: id }
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const d = drag.current

    if (!d) {
      const hit = hitTest(x, y)
      if (hit?.isResize) setCursor('ew-resize')
      else if (hit) setCursor('grab')
      else if (y < RULER_H) setCursor('col-resize')
      else setCursor('crosshair')
      return
    }

    const curBar = x / BAR_W
    if (d.type === 'seek') {
      const bar = Math.max(0, curBar)
      setPlayheadBar(bar)
      Tone.getTransport().seconds = bar * 4 * (60 / bpm)
      return
    }
    if (d.type === 'loop') {
      const start = Math.min(d.bar0, Math.floor(curBar))
      const end = Math.max(d.bar0 + 1, Math.ceil(curBar))
      setLoopRegion(start, end)
      return
    }
    if (d.type === 'move') {
      const rawDelta = curBar - d.mouseBar0
      const deltaBar = snapToStep(d.startBar + rawDelta) - d.startBar
      const curRow = trackFromY(y)
      const targetTrack = curRow >= 0 && curRow < tracks.length ? tracks[curRow] : null
      const compatible = targetTrack
        ? (d.clipType === 'beat'
            ? targetTrack.type === 'drums'
            : d.clipType === 'audio'
              ? targetTrack.type === 'fx'
              : targetTrack.type === 'melody')
        : false
      const newTrackId = compatible && targetTrack ? targetTrack.id : d.origTrackId
      moveClip(d.clipId, Math.max(0, d.startBar + deltaBar), newTrackId)
    } else if (d.type === 'resize') {
      const newLen = snapToStep(d.origLen + (curBar - d.mouseBar0))
      resizeClip(d.clipId, Math.max(1 / 16, newLen))
    } else if (d.type === 'create') {
      const newLen = snapToStep(curBar - d.startBar + STEP_W / BAR_W)
      resizeClip(d.clipId, Math.max(1 / 16, newLen))
    }
  }

  function onMouseUp() { drag.current = null }

  function onDblClick(e: React.MouseEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hit = hitTest(x, y)
    if (hit) onClipDoubleClick(hit.clip)
  }

  return (
    <canvas
      ref={canvasRef}
      width={W} height={H}
      style={{ cursor, display: 'block', minWidth: W }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDoubleClick={onDblClick}
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}

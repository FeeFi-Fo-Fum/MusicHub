import { useRef, useEffect, useCallback, useState, useSyncExternalStore } from 'react'
import { useStore } from '../../store'
import { audioEngine } from '../../audio/engine'
import VoiceRecorder from './VoiceRecorder'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const STEPS = 32
const STEP_W = 38
const ROW_H = 22
const LABEL_W = 44

// All pitches from C8 down to C1
function getAllPitches(): string[] {
  const pitches: string[] = []
  for (let oct = 8; oct >= 1; oct--) {
    for (let n = 11; n >= 0; n--) {
      pitches.push(`${NOTE_NAMES[n]}${oct}`)
    }
  }
  return pitches
}

const ALL_PITCHES = getAllPitches()
const ROWS = ALL_PITCHES.length // 96

type DragState =
  | { type: 'create'; startStep: number; pitch: string; noteId: string }
  | { type: 'move'; noteId: string; startX: number; startY: number; origStep: number; origPitch: string; origDuration: number }
  | { type: 'resize'; noteId: string; startX: number; origDuration: number; origStep: number }

const NOTE_LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function pitchToMidi(pitch: string): number {
  const match = pitch.match(/^([A-G]#?)(\d+)$/)
  if (!match) return 60
  const note = NOTE_LETTERS.indexOf(match[1])
  const oct = parseInt(match[2])
  return (oct + 1) * 12 + note
}

function midiToPitch(midi: number): string {
  const note = NOTE_LETTERS[((midi % 12) + 12) % 12]
  const oct = Math.floor(midi / 12) - 1
  return `${note}${oct}`
}

interface NoteGridProps { chordIntervals?: number[] | null }

export default function NoteGrid({ chordIntervals }: NoteGridProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { notes, addNote, removeNote, moveNote, resizeNote } = useStore()
  const isPlaying = useStore((s) => s.isPlaying)
  const currentStep = useStore((s) => s.currentStep)
  const dragging = useRef<DragState | null>(null)
  const [cursor, setCursor] = useState('crosshair')
  // Re-draw when theme changes (data-theme attribute on <html>)
  const _theme = useSyncExternalStore(
    (cb) => { const obs = new MutationObserver(cb); obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); return () => obs.disconnect() },
    () => document.documentElement.dataset.theme ?? 'dark'
  )

  const W = LABEL_W + STEPS * STEP_W
  const H = ROWS * ROW_H

  // Scroll to C4 area on first mount
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const c4row = ALL_PITCHES.indexOf('C5') // top of C4 octave visible
    el.scrollTop = c4row * ROW_H - el.clientHeight / 2
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, W, H)

    // Read theme colors from CSS variables
    const style = getComputedStyle(document.documentElement)
    const cBg = style.getPropertyValue('--bg').trim() || '#0f0f13'
    const cBg3 = style.getPropertyValue('--bg3').trim() || '#1e1e2e'
    const cBg4 = style.getPropertyValue('--bg4').trim() || '#252535'
    const cBorder = style.getPropertyValue('--border').trim() || '#2a2a3e'
    const cText2 = style.getPropertyValue('--text2').trim() || '#8888aa'
    const cText = style.getPropertyValue('--text').trim() || '#e0e0f0'
    const cAccent = style.getPropertyValue('--accent').trim() || '#7c5cfc'

    // Row backgrounds
    ALL_PITCHES.forEach((pitch, row) => {
      const isBlack = pitch.includes('#')
      ctx.fillStyle = isBlack ? cBg : cBg3
      ctx.fillRect(0, row * ROW_H, W, ROW_H)
    })

    // Pitch labels
    ALL_PITCHES.forEach((pitch, row) => {
      const isBlack = pitch.includes('#')
      ctx.fillStyle = isBlack ? cBg : cBg4
      ctx.fillRect(0, row * ROW_H, LABEL_W, ROW_H)
      const isC = pitch.startsWith('C') && !pitch.includes('#')
      if (isC || !isBlack) {
        ctx.fillStyle = isC ? cText : cText2
        ctx.font = isC ? 'bold 10px system-ui' : '9px system-ui'
        ctx.textAlign = 'right'
        ctx.fillText(pitch, LABEL_W - 4, row * ROW_H + ROW_H / 2 + 3)
      }
    })

    // Separator
    ctx.fillStyle = cBorder
    ctx.fillRect(LABEL_W, 0, 1, H)

    // Octave separator lines
    ALL_PITCHES.forEach((pitch, row) => {
      const isC = pitch.startsWith('C') && !pitch.includes('#')
      ctx.strokeStyle = isC ? cBorder : cBg3
      ctx.lineWidth = isC ? 1.5 : 0.5
      ctx.beginPath()
      ctx.moveTo(LABEL_W, row * ROW_H)
      ctx.lineTo(W, row * ROW_H)
      ctx.stroke()
    })

    // Beat grid lines
    for (let s = 0; s <= STEPS; s++) {
      const x = LABEL_W + s * STEP_W
      ctx.strokeStyle = s % 4 === 0 ? cBorder : cBg3
      ctx.lineWidth = s % 4 === 0 ? 1.5 : 0.5
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
      ctx.stroke()
    }

    // Playhead
    if (isPlaying) {
      ctx.fillStyle = 'rgba(255,220,60,0.18)'
      ctx.fillRect(LABEL_W + currentStep * STEP_W, 0, STEP_W, H)
    }

    // Notes
    notes.forEach((note) => {
      const row = ALL_PITCHES.indexOf(note.pitch)
      if (row < 0) return
      const x = LABEL_W + note.startStep * STEP_W + 2
      const y = row * ROW_H + 2
      const w = note.duration * STEP_W - 4
      const h = ROW_H - 4
      ctx.fillStyle = cAccent
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, 4)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(x + 2, y + 2, w - 4, 2)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.fillRect(x + w - 10, y + 2, 8, h - 4)
    })
  }, [notes, isPlaying, currentStep, W, H, _theme])

  useEffect(() => { draw() }, [draw])

  function gridCoords(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const gridX = x - LABEL_W
    return {
      x, y, gridX,
      step: Math.floor(gridX / STEP_W),
      row: Math.floor(y / ROW_H),
      pitch: ALL_PITCHES[Math.floor(y / ROW_H)] ?? ALL_PITCHES[0],
    }
  }

  function hitTestNote(x: number, y: number) {
    for (const note of [...notes].reverse()) {
      const row = ALL_PITCHES.indexOf(note.pitch)
      if (row < 0) continue
      const nx = LABEL_W + note.startStep * STEP_W
      const ny = row * ROW_H
      const nw = note.duration * STEP_W
      if (x >= nx && x <= nx + nw && y >= ny && y <= ny + ROW_H) {
        return { note, isResize: x >= nx + nw - 12 }
      }
    }
    return null
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault()
    const { x, y, step, pitch, gridX } = gridCoords(e)
    if (gridX < 0) return
    const hit = hitTestNote(x, y)
    if (e.button === 2) { if (hit) removeNote(hit.note.id); return }
    if (hit) {
      if (hit.isResize) {
        dragging.current = { type: 'resize', noteId: hit.note.id, startX: x, origDuration: hit.note.duration, origStep: hit.note.startStep }
      } else {
        dragging.current = { type: 'move', noteId: hit.note.id, startX: x, startY: y, origStep: hit.note.startStep, origPitch: hit.note.pitch, origDuration: hit.note.duration }
      }
    } else if (step >= 0 && step < STEPS) {
      audioEngine.noteOn(pitch)
      setTimeout(() => audioEngine.noteOff(pitch), 200)
      if (chordIntervals && chordIntervals.length > 1) {
        const rootMidi = pitchToMidi(pitch)
        for (const semitones of chordIntervals) {
          const chordPitch = midiToPitch(rootMidi + semitones)
          if (ALL_PITCHES.includes(chordPitch)) addNote({ pitch: chordPitch, startStep: step, duration: 1 })
        }
      } else {
        addNote({ pitch, startStep: step, duration: 1 })
        setTimeout(() => {
          const latest = useStore.getState().notes.find(n => n.pitch === pitch && n.startStep === step)
          if (latest) dragging.current = { type: 'create', startStep: step, pitch, noteId: latest.id }
        }, 0)
      }
    }
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const { x, y, gridX } = gridCoords(e)
    const drag = dragging.current
    if (!drag) {
      const hit = hitTestNote(x, y)
      if (hit?.isResize) setCursor('ew-resize')
      else if (hit) setCursor('grab')
      else setCursor('crosshair')
      return
    }
    if (drag.type === 'create') {
      const newDuration = Math.max(1, Math.floor(gridX / STEP_W) - drag.startStep + 1)
      resizeNote(drag.noteId, newDuration)
    } else if (drag.type === 'move') {
      const dx = Math.round((x - drag.startX) / STEP_W)
      const dy = Math.floor((y - drag.startY) / ROW_H)
      const newStep = Math.max(0, Math.min(STEPS - 1, drag.origStep + dx))
      const newPitchIdx = Math.max(0, Math.min(ALL_PITCHES.length - 1, ALL_PITCHES.indexOf(drag.origPitch) + dy))
      moveNote(drag.noteId, newStep, ALL_PITCHES[newPitchIdx])
    } else if (drag.type === 'resize') {
      const dx = Math.round((x - drag.startX) / STEP_W)
      resizeNote(drag.noteId, Math.max(1, drag.origDuration + dx))
    }
  }

  function onMouseUp() { dragging.current = null }

  return (
    <div className="note-grid-wrapper">
      <div className="note-grid-toolbar">
        <span className="grid-hint">Click = add · Drag right = extend · Drag note = move · Right-click = delete · Scroll = navigate</span>
        <div className="vr-toolbar-slot">
          <VoiceRecorder />
        </div>
      </div>
      <div className="note-grid-scroll" ref={scrollRef}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ cursor, display: 'block' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onContextMenu={(e) => e.preventDefault()}
        />
      </div>
    </div>
  )
}

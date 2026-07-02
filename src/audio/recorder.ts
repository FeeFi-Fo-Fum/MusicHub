import * as Tone from 'tone'
import { audioEngine } from './engine'
import { buildArrangement, disposeArrangement } from './arrangementScheduler'
import type { Clip, ArrTrack } from '../store/arrangementStore'

let mediaRecorder: MediaRecorder | null = null
let chunks: Blob[] = []

export function startRecording() {
  if (!audioEngine.streamDest) return
  chunks = []
  mediaRecorder = new MediaRecorder(audioEngine.streamDest.stream, {
    mimeType: 'audio/webm;codecs=opus',
  })
  mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  mediaRecorder.start(100)
}

export async function stopRecording(): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) return reject(new Error('Not recording'))
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const arrayBuffer = await blob.arrayBuffer()
      const audioCtx = new AudioContext()
      const decoded = await audioCtx.decodeAudioData(arrayBuffer)
      resolve(encodeWav(decoded))
    }
    mediaRecorder.stop()
  })
}

function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const length = buffer.length * numChannels * 2
  const out = new ArrayBuffer(44 + length)
  const view = new DataView(out)

  writeStr(view, 0, 'RIFF')
  view.setUint32(4, 36 + length, true)
  writeStr(view, 8, 'WAVE')
  writeStr(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  writeStr(view, 36, 'data')
  view.setUint32(40, length, true)

  let offset = 44
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]))
      view.setInt16(offset, sample * 0x7fff, true)
      offset += 2
    }
  }
  return out
}

function writeStr(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
}

export async function exportArrangement(
  clips: Clip[],
  tracks: ArrTrack[],
  totalBars: number,
  bpm: number,
  onProgress?: (pct: number) => void
): Promise<void> {
  await audioEngine.start()
  if (!audioEngine.streamDest) return

  const durationSec = totalBars * (60 / bpm) * 4
  Tone.getTransport().stop()
  disposeArrangement()
  buildArrangement(clips, bpm, tracks)
  Tone.getTransport().seconds = 0

  const recChunks: Blob[] = []
  const rec = new MediaRecorder(audioEngine.streamDest.stream, { mimeType: 'audio/webm;codecs=opus' })
  rec.ondataavailable = (e) => { if (e.data.size > 0) recChunks.push(e.data) }
  rec.start(100)
  Tone.getTransport().start()

  const startTime = Date.now()
  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      onProgress?.(Math.min(1, elapsed / durationSec))
      if (elapsed >= durationSec) {
        clearInterval(interval)
        resolve()
      }
    }, 200)
  })

  Tone.getTransport().stop()
  disposeArrangement()
  rec.stop()

  await new Promise<void>((resolve) => {
    rec.onstop = async () => {
      const blob = new Blob(recChunks, { type: 'audio/webm' })
      const arrayBuffer = await blob.arrayBuffer()
      const audioCtx = new AudioContext()
      const decoded = await audioCtx.decodeAudioData(arrayBuffer)
      const wav = encodeWav(decoded)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
      a.download = 'arrangement.wav'
      a.click()
      resolve()
    }
  })
}

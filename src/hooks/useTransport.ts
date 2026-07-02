import { useCallback, useEffect } from 'react'
import { useStore } from '../store'
import { audioEngine } from '../audio/engine'
import { buildSequences, disposeAll, rebuildMelody } from '../audio/scheduler'
import { startRecording, stopRecording } from '../audio/recorder'

export function useTransport() {
  const { bpm, isPlaying, isRecording, setBpm, setPlaying, setRecording, tracks, notes, metronomeEnabled } = useStore()

  const play = useCallback(async () => {
    await audioEngine.start()
    buildSequences(tracks, notes)
    audioEngine.setBpm(bpm)
    if (metronomeEnabled) audioEngine.startMetronome()
    audioEngine.play()
    setPlaying(true)
  }, [bpm, tracks, notes, setPlaying, metronomeEnabled])

  const stop = useCallback(() => {
    audioEngine.stop()
    audioEngine.stopMetronome()
    disposeAll()
    setPlaying(false)
    useStore.getState().setCurrentStep(0)
  }, [setPlaying])

  const toggleRecord = useCallback(async () => {
    await audioEngine.start()
    if (!isRecording) {
      startRecording()
      setRecording(true)
      if (!isPlaying) play()
    } else {
      setRecording(false)
      const wav = await stopRecording()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
      a.download = 'recording.wav'
      a.click()
    }
  }, [isRecording, isPlaying, play, setRecording])

  const updateBpm = useCallback((newBpm: number) => {
    setBpm(newBpm)
    audioEngine.setBpm(newBpm)
  }, [setBpm])

  // Rebuild melody live when notes change while playing
  useEffect(() => {
    if (!isPlaying) return
    rebuildMelody(notes)
  }, [notes, isPlaying])

  // Start/stop metronome immediately when toggled (even mid-playback)
  useEffect(() => {
    if (!isPlaying) return
    if (metronomeEnabled) audioEngine.startMetronome()
    else audioEngine.stopMetronome()
  }, [metronomeEnabled, isPlaying])

  return { bpm, isPlaying, isRecording, play, stop, toggleRecord, updateBpm, metronomeEnabled }
}

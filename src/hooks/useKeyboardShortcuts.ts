import { useEffect } from 'react'
import { useStore } from '../store'
import { useArrangementStore } from '../store/arrangementStore'
import { audioEngine } from '../audio/engine'
import { buildSequences, disposeAll } from '../audio/scheduler'
import { disposeArrangement } from '../audio/arrangementScheduler'
import * as Tone from 'tone'

export function useKeyboardShortcuts(page: string) {
  useEffect(() => {
    async function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const meta = e.metaKey || e.ctrlKey

      if (e.code === 'Space') {
        e.preventDefault()
        const studio = useStore.getState()
        const arr = useArrangementStore.getState()

        if (page === 'arrange') {
          if (arr.isPlaying) {
            Tone.getTransport().pause()
            arr.setIsPlaying(false)
          } else if (Tone.getTransport().state === 'paused') {
            Tone.getTransport().start()
            arr.setIsPlaying(true)
          } else {
            // Fresh start arrange
            const { buildArrangement } = await import('../audio/arrangementScheduler')
            buildArrangement(arr.clips, useStore.getState().bpm, arr.tracks, { enabled: arr.loopEnabled, start: arr.loopStart, end: arr.loopEnd })
            Tone.getTransport().start()
            arr.setIsPlaying(true)
          }
          return
        }

        // Studio page (or any other page)
        if (studio.isPlaying) {
          audioEngine.stop()
          audioEngine.stopMetronome()
          disposeAll()
          studio.setPlaying(false)
          studio.setCurrentStep(0)
          return
        }

        await audioEngine.start()
        const st = useStore.getState()
        buildSequences(st.tracks, st.notes)
        audioEngine.setBpm(st.bpm)
        if (st.metronomeEnabled) audioEngine.startMetronome()
        audioEngine.play()
        st.setPlaying(true)
        return
      }

      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const arrState = useArrangementStore.getState()
        if (arrState._past.length > 0) arrState.undo()
        else useStore.getState().undo()
        return
      }

      if (meta && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        const arrState = useArrangementStore.getState()
        if (arrState._future.length > 0) arrState.redo()
        else useStore.getState().redo()
        return
      }

      if (e.key === 'Escape') {
        // Stop everything
        if (useArrangementStore.getState().isPlaying) {
          Tone.getTransport().stop()
          disposeArrangement()
          useArrangementStore.getState().setPlayheadBar(0)
          useArrangementStore.getState().setIsPlaying(false)
        }
        if (useStore.getState().isPlaying) {
          audioEngine.stop()
          disposeAll()
          useStore.getState().setPlaying(false)
          useStore.getState().setCurrentStep(0)
        }
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [page])
}

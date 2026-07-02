import { useEffect } from 'react'
import { useStore } from '../store'
import { audioEngine } from '../audio/engine'

export function useKeyboardPads(onTrigger?: (padId: string) => void) {
  const pads = useStore((s) => s.pads)

  useEffect(() => {
    const down = async (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const pad = pads.find((p) => p.keyBinding === e.key.toLowerCase())
      if (!pad) return
      await audioEngine.start()
      const synth = audioEngine.getPadSynth(pad.id)
      synth.triggerAttackRelease(pad.pitch, '8n')
      onTrigger?.(pad.id)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [pads, onTrigger])
}

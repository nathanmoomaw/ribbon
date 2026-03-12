import { useEffect, useRef } from 'react'
import { positionToFrequency } from '../utils/pitchMap'

const KEYS = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL']

export function useKeyboardPlay(getEngine, inputMode, mode, octaves, stepped, scale, onPositionChange, arpStart, arpStop) {
  const activeKeyRef = useRef(null)

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.repeat) return

      const index = KEYS.indexOf(e.code)
      if (index === -1) return

      e.preventDefault()
      const position = index / (KEYS.length - 1)
      const hz = positionToFrequency(position, { octaves, stepped, scale })
      const engine = getEngine()

      engine.setFrequency(hz)
      onPositionChange?.(position)

      if (mode === 'play') {
        engine.noteOn()
        activeKeyRef.current = e.code
      } else if (mode === 'latch') {
        if (!engine.getIsPlaying()) {
          engine.noteOn()
        }
      } else if (mode === 'arp') {
        arpStart()
        activeKeyRef.current = e.code
      }
    }

    function onKeyUp(e) {
      const index = KEYS.indexOf(e.code)
      if (index === -1) return

      if (activeKeyRef.current === e.code) {
        if (mode === 'play') {
          getEngine().noteOff()
        } else if (mode === 'arp') {
          arpStop()
        }
        activeKeyRef.current = null
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [getEngine, inputMode, mode, octaves, stepped, scale, onPositionChange, arpStart, arpStop])
}

export { KEYS }

import { useEffect, useRef } from 'react'
import { positionToFrequency } from '../utils/pitchMap'

const KEYS = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL']

export function useKeyboardPlay(getEngine, inputMode, mode, octaves, stepped, scale, onPositionsChange, arpStart, arpStop, hold, onArpNoteToggle) {
  const activeKeysRef = useRef(new Set())

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
      const voiceId = `key_${e.code}`

      // In hold mode, start voice if needed but don't restart
      if (hold) {
        engine.voiceOn(voiceId, hz, 1)
        activeKeysRef.current.add(e.code)
        updatePositions()
        return
      }

      if (mode === 'play') {
        engine.voiceOn(voiceId, hz, 1)
        activeKeysRef.current.add(e.code)
      } else if (mode === 'latch') {
        if (engine.voiceIsPlaying(voiceId)) {
          engine.voiceOff(voiceId)
          activeKeysRef.current.delete(e.code)
        } else {
          engine.voiceOn(voiceId, hz, 1)
          activeKeysRef.current.add(e.code)
        }
      } else if (mode === 'arp') {
        // Arp stays mono
        engine.setFrequency(hz)
        arpStart()
        activeKeysRef.current.add(e.code)
      } else if (mode === 'latch+arp') {
        // Add/remove note from arp sequence
        onArpNoteToggle?.(hz)
        activeKeysRef.current.add(e.code)
      }

      updatePositions()
    }

    function onKeyUp(e) {
      const index = KEYS.indexOf(e.code)
      if (index === -1) return

      if (activeKeysRef.current.has(e.code)) {
        if (!hold) {
          const voiceId = `key_${e.code}`
          if (mode === 'play') {
            getEngine().voiceOff(voiceId)
          } else if (mode === 'arp') {
            arpStop()
          }
          // latch+arp: don't stop on key release — notes stay latched
        }
        activeKeysRef.current.delete(e.code)
        updatePositions()
      }
    }

    function updatePositions() {
      const posMap = new Map()
      for (const code of activeKeysRef.current) {
        const index = KEYS.indexOf(code)
        if (index !== -1) {
          posMap.set(`key_${code}`, index / (KEYS.length - 1))
        }
      }
      onPositionsChange?.(posMap)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [getEngine, inputMode, mode, octaves, stepped, scale, onPositionsChange, arpStart, arpStop, hold, onArpNoteToggle])
}

export { KEYS }

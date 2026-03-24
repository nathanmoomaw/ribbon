import { useEffect, useRef } from 'react'
import { positionToFrequency } from '../utils/pitchMap'

const KEYS = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL']

export function useKeyboardPlay(getEngine, inputMode, mode, octaves, stepped, scale, onPositionsChange, arpStart, arpStop, hold, poly, onArpNoteToggle, onArpNoteAdd, onArpNoteRemove) {
  const activeKeysRef = useRef(new Set())
  const keyFreqRef = useRef(new Map()) // track hz per key for arp+poly removal

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.repeat) return
      // Ignore modifier combos so browser shortcuts (Cmd+L, Ctrl+C, etc.) work normally
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const index = KEYS.indexOf(e.code)
      if (index === -1) return

      e.preventDefault()
      const position = index / (KEYS.length - 1)
      const hz = positionToFrequency(position, { octaves, stepped, scale })
      const engine = getEngine()
      const voiceId = `key_${e.code}`

      // In hold mode (non-arp), start voice if needed but don't restart
      if (hold && mode !== 'arp') {
        if (!poly) engine.allNotesOff() // mono: one voice at a time
        engine.voiceOn(voiceId, hz, 1)
        activeKeysRef.current.add(e.code)
        updatePositions()
        return
      }

      if (mode === 'play') {
        if (!poly) engine.allNotesOff() // mono: one voice at a time
        engine.voiceOn(voiceId, hz, 1)
        activeKeysRef.current.add(e.code)
      } else if (mode === 'arp') {
        if (hold && poly) {
          // Multi-note arp building (arp+hold+poly) — latched toggle
          onArpNoteToggle?.(hz)
        } else if (poly) {
          // Live multi-key arp (arp+poly) — cycle held keys
          keyFreqRef.current.set(e.code, hz)
          onArpNoteAdd?.(hz)
        } else {
          // Normal arp or arp+hold(mono)
          engine.setFrequency(hz)
          arpStart()
        }
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
            if (poly) {
              // Remove this key's note from arp cycle
              const hz = keyFreqRef.current.get(e.code)
              if (hz) onArpNoteRemove?.(hz)
              keyFreqRef.current.delete(e.code)
            } else {
              arpStop()
            }
          }
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
  }, [getEngine, inputMode, mode, octaves, stepped, scale, onPositionsChange, arpStart, arpStop, hold, poly, onArpNoteToggle, onArpNoteAdd, onArpNoteRemove])
}

export { KEYS }
